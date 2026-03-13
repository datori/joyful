#!/usr/bin/env bash
#
# dev-stack.sh — Manage the joyful dev stack (server + daemon + webapp).
#
# Usage:
#   ./scripts/dev-stack.sh start          Start server + daemon
#   ./scripts/dev-stack.sh stop           Gracefully stop daemon + server
#   ./scripts/dev-stack.sh restart        Stop then start
#   ./scripts/dev-stack.sh status         Show what's running
#   ./scripts/dev-stack.sh nuke           Full reset: wipe PGlite, re-bootstrap, restart
#   ./scripts/dev-stack.sh seed           Print the current bootstrap seed in both formats
#
# Environment:
#   SERVER_PORT  (default: 3007)
#   DATA_DIR     (default: packages/joyful-server/data)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_PORT="${SERVER_PORT:-3007}"
DATA_DIR="${DATA_DIR:-$REPO_ROOT/packages/joyful-server/data}"
MASTER_SECRET="a6821b8bdb38ec3c0f9b14e030054290341dadfe84f0af409e1473677117fae3"
JOYFUL_HOME="${JOYFUL_HOME_DIR:-$HOME/.joyful-dev}"

# ── Helpers ──────────────────────────────────────────────────────────────────

info()  { printf "\033[1;34m[info]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[ok]\033[0m    %s\n" "$*"; }
warn()  { printf "\033[1;33m[warn]\033[0m  %s\n" "$*"; }
err()   { printf "\033[1;31m[err]\033[0m   %s\n" "$*" >&2; }

server_pid() {
    lsof -iTCP:"$SERVER_PORT" -sTCP:LISTEN -t 2>/dev/null || true
}

daemon_running() {
    local state_file="$JOYFUL_HOME/daemon.state.json"
    if [ -f "$state_file" ]; then
        local pid
        pid=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$state_file','utf8')).pid||'')}catch{console.log('')}" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "$pid"
            return 0
        fi
    fi
    return 1
}

# ── Stop ─────────────────────────────────────────────────────────────────────

do_stop() {
    info "Stopping daemon..."
    if daemon_running >/dev/null 2>&1; then
        JOYFUL_HOME_DIR="$JOYFUL_HOME" npx yarn cli daemon stop 2>/dev/null || true
        ok "Daemon stopped"
    else
        ok "Daemon not running"
    fi

    info "Stopping server (port $SERVER_PORT)..."
    local pids
    pids=$(server_pid)
    if [ -n "$pids" ]; then
        # Graceful SIGTERM first — PGlite needs this to flush
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        # Wait up to 5 seconds for graceful shutdown
        for i in $(seq 1 10); do
            if [ -z "$(server_pid)" ]; then break; fi
            sleep 0.5
        done
        # Force kill if still running
        pids=$(server_pid)
        if [ -n "$pids" ]; then
            warn "Server didn't stop gracefully, sending SIGKILL"
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        ok "Server stopped"
    else
        ok "Server not running"
    fi
}

# ── Start ────────────────────────────────────────────────────────────────────

do_start() {
    if [ -n "$(server_pid)" ]; then
        warn "Server already running on port $SERVER_PORT (pid: $(server_pid))"
    else
        info "Running migrations..."
        (cd "$REPO_ROOT/packages/joyful-server" && \
            PORT="$SERVER_PORT" \
            JOYFUL_MASTER_SECRET="$MASTER_SECRET" \
            DATA_DIR="$DATA_DIR" \
            npx tsx sources/standalone.ts migrate 2>&1)

        info "Starting server on port $SERVER_PORT..."
        (cd "$REPO_ROOT/packages/joyful-server" && \
            PORT="$SERVER_PORT" \
            JOYFUL_MASTER_SECRET="$MASTER_SECRET" \
            DATA_DIR="$DATA_DIR" \
            DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=true \
            npx tsx sources/standalone.ts serve &)

        # Wait for server to be ready
        for i in $(seq 1 20); do
            if curl -sf "http://localhost:$SERVER_PORT/health" >/dev/null 2>&1; then
                ok "Server ready"
                break
            fi
            if [ "$i" -eq 20 ]; then
                err "Server failed to start within 10 seconds"
                return 1
            fi
            sleep 0.5
        done
    fi

    info "Starting daemon..."
    if daemon_running >/dev/null 2>&1; then
        warn "Daemon already running (pid: $(daemon_running))"
    else
        JOYFUL_SERVER_URL="http://localhost:$SERVER_PORT" \
        JOYFUL_HOME_DIR="$JOYFUL_HOME" \
        npx yarn cli daemon start 2>&1
        ok "Daemon started"
    fi
}

# ── Status ───────────────────────────────────────────────────────────────────

do_status() {
    local spid dpid

    spid=$(server_pid)
    if [ -n "$spid" ]; then
        ok "Server running on port $SERVER_PORT (pid: $spid)"
    else
        warn "Server not running"
    fi

    if dpid=$(daemon_running); then
        ok "Daemon running (pid: $dpid)"
    else
        warn "Daemon not running"
    fi

    if [ -d "$DATA_DIR/pglite" ]; then
        local size
        size=$(du -sh "$DATA_DIR/pglite" 2>/dev/null | cut -f1)
        info "PGlite data: $DATA_DIR/pglite ($size)"
    else
        warn "No PGlite data directory"
    fi
}

# ── Nuke (full reset) ───────────────────────────────────────────────────────

do_nuke() {
    warn "This will:"
    warn "  1. Stop all services"
    warn "  2. Delete PGlite database ($DATA_DIR/pglite/)"
    warn "  3. Re-bootstrap a fresh account"
    warn "  4. Restart server + daemon"
    echo ""
    read -p "Continue? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Aborted"
        return 0
    fi

    do_stop

    info "Deleting PGlite data..."
    rm -rf "$DATA_DIR/pglite"
    ok "PGlite data deleted"

    info "Starting server (fresh DB)..."
    (cd "$REPO_ROOT/packages/joyful-server" && \
        PORT="$SERVER_PORT" \
        JOYFUL_MASTER_SECRET="$MASTER_SECRET" \
        DATA_DIR="$DATA_DIR" \
        npx tsx sources/standalone.ts migrate 2>&1)

    (cd "$REPO_ROOT/packages/joyful-server" && \
        PORT="$SERVER_PORT" \
        JOYFUL_MASTER_SECRET="$MASTER_SECRET" \
        DATA_DIR="$DATA_DIR" \
        DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=true \
        npx tsx sources/standalone.ts serve &)

    for i in $(seq 1 20); do
        if curl -sf "http://localhost:$SERVER_PORT/health" >/dev/null 2>&1; then break; fi
        sleep 0.5
    done
    ok "Server ready (fresh DB)"

    info "Bootstrapping fresh account..."
    JOYFUL_SERVER_URL="http://localhost:$SERVER_PORT" \
    JOYFUL_HOME_DIR="$JOYFUL_HOME" \
    npx yarn cli dev bootstrap --force 2>&1
    ok "Account bootstrapped"

    info "Starting daemon..."
    JOYFUL_SERVER_URL="http://localhost:$SERVER_PORT" \
    JOYFUL_HOME_DIR="$JOYFUL_HOME" \
    npx yarn cli daemon start 2>&1
    ok "Daemon started"

    echo ""
    do_seed
    echo ""
    ok "Full reset complete. Restore the seed in the web app to link."
}

# ── Seed ─────────────────────────────────────────────────────────────────────

do_seed() {
    local key_file="$JOYFUL_HOME/access.key"
    if [ ! -f "$key_file" ]; then
        err "No access key found at $key_file"
        return 1
    fi

    local b64_secret
    b64_secret=$(node -e "
const key = JSON.parse(require('fs').readFileSync('$key_file', 'utf8'));
// Convert base64 standard to base64url
const b64url = key.secret.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+\$/, '');
console.log(b64url);
" 2>/dev/null)

    local b32_seed
    b32_seed=$(node -e "
const key = JSON.parse(require('fs').readFileSync('$key_file', 'utf8'));
const bytes = Buffer.from(key.secret, 'base64');
// RFC 4648 base32 encoding
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
let bits = 0, value = 0, output = '';
for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
    }
}
if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
// Format as 5-char groups with dashes
const groups = output.match(/.{1,5}/g) || [];
console.log(groups.join('-'));
" 2>/dev/null)

    info "Current bootstrap seed:"
    echo ""
    echo "  base64url (for CLI):   $b64_secret"
    echo "  base32 (for web app):  $b32_seed"
    echo ""
    info "Web app: http://localhost:8081 -> Settings -> Restore with Secret Key -> paste the base32 seed"
}

# ── Main ─────────────────────────────────────────────────────────────────────

case "${1:-help}" in
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_stop; do_start ;;
    status)  do_status ;;
    nuke)    do_nuke ;;
    seed)    do_seed ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|nuke|seed}"
        echo ""
        echo "  start    Start server + daemon"
        echo "  stop     Gracefully stop daemon + server"
        echo "  restart  Stop then start"
        echo "  status   Show what's running"
        echo "  nuke     Full reset: wipe DB, re-bootstrap, restart"
        echo "  seed     Print current bootstrap seed in both formats"
        exit 1
        ;;
esac
