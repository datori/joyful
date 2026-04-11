#!/usr/bin/env bash
# codex-sessions — list and resume Codex sessions that don't appear in the
# normal `codex resume` picker (MCP-sourced, subagent, cross-directory, etc.)
#
# Usage:
#   codex-sessions                  # list recent sessions (all sources)
#   codex-sessions --mcp            # only MCP-sourced (joyful-launched)
#   codex-sessions --cli            # only direct CLI sessions
#   codex-sessions --cwd .          # filter to current directory
#   codex-sessions --cwd /path      # filter to specific directory
#   codex-sessions --search TEXT    # search titles and first messages
#   codex-sessions --limit 50       # show more (default: 20)
#   codex-sessions --all            # show everything, no limit
#   codex-sessions resume <ID>      # resume a session by ID (or partial ID)
#   codex-sessions fork <ID>        # fork a session by ID (or partial ID)
#   codex-sessions show <ID>        # show session details + last messages

set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
DB="$CODEX_HOME/state_5.sqlite"

if [[ ! -f "$DB" ]]; then
    echo "Error: Codex database not found at $DB" >&2
    echo "Set CODEX_HOME if your Codex data is elsewhere." >&2
    exit 1
fi

# Defaults
COMMAND="list"
SOURCE_FILTER=""
CWD_FILTER=""
SEARCH=""
LIMIT=20
SESSION_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        resume|fork|show)
            COMMAND="$1"
            SESSION_ID="${2:-}"
            shift
            ;;
        --mcp)       SOURCE_FILTER="mcp" ;;
        --cli)       SOURCE_FILTER="cli" ;;
        --cwd)       CWD_FILTER="${2:-.}"; shift ;;
        --search|-s) SEARCH="${2:-}"; shift ;;
        --limit|-n)  LIMIT="${2:-20}"; shift ;;
        --all)       LIMIT=0 ;;
        --help|-h)
            sed -n '2,14s/^# //p' "$0"
            exit 0
            ;;
        *)
            # If it looks like a UUID, treat as resume
            if [[ "$1" =~ ^[0-9a-f]{4,} ]]; then
                COMMAND="resume"
                SESSION_ID="$1"
            else
                echo "Unknown option: $1" >&2
                exit 1
            fi
            ;;
    esac
    shift
done

# Resolve "." in --cwd to absolute path
if [[ -n "$CWD_FILTER" && "$CWD_FILTER" == "." ]]; then
    CWD_FILTER="$(pwd)"
fi

# Helper: resolve a partial ID to a full session ID
resolve_id() {
    local partial="$1"
    local matches
    matches=$(sqlite3 "$DB" "SELECT id FROM threads WHERE id LIKE '${partial}%' ORDER BY created_at DESC;")
    local count
    count=$(echo "$matches" | grep -c . || true)

    if [[ "$count" -eq 0 ]]; then
        echo "No session found matching '$partial'" >&2
        return 1
    elif [[ "$count" -eq 1 ]]; then
        echo "$matches"
    else
        echo "Multiple sessions match '$partial':" >&2
        echo "$matches" | while read -r id; do
            sqlite3 "$DB" "SELECT id || '  ' || substr(title,1,60) FROM threads WHERE id='$id';" >&2
        done
        return 1
    fi
}

case "$COMMAND" in
    list)
        # Build WHERE clause
        WHERE="1=1"
        [[ -n "$SOURCE_FILTER" ]] && WHERE="$WHERE AND source='$SOURCE_FILTER'"
        [[ -n "$CWD_FILTER" ]] && WHERE="$WHERE AND cwd LIKE '%${CWD_FILTER}%'"
        if [[ -n "$SEARCH" ]]; then
            SAFE_SEARCH="${SEARCH//\'/\'\'}"
            WHERE="$WHERE AND (title LIKE '%${SAFE_SEARCH}%' OR first_user_message LIKE '%${SAFE_SEARCH}%')"
        fi

        LIMIT_CLAUSE=""
        [[ "$LIMIT" -gt 0 ]] && LIMIT_CLAUSE="LIMIT $LIMIT"

        python3 - "$DB" "$WHERE" "$LIMIT_CLAUSE" <<'PYEOF'
import sqlite3, sys, os
from datetime import datetime

db_path, where, limit_clause = sys.argv[1], sys.argv[2], sys.argv[3]
conn = sqlite3.connect(db_path)

query = f"""
    SELECT id, source, tokens_used, updated_at, cwd, title, first_user_message
    FROM threads
    WHERE {where}
    ORDER BY updated_at DESC
    {limit_clause}
"""
rows = conn.execute(query).fetchall()
total = conn.execute(f"SELECT COUNT(*) FROM threads WHERE {where}").fetchone()[0]
conn.close()

PROMPT_MARKER = "\nBased on this message, call functions."
PROMPT_MARKER2 = "\n\nBased on this message, call functions."

def clean(text):
    """Strip the joyful system prompt injection from title/message."""
    for marker in [PROMPT_MARKER, PROMPT_MARKER2]:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]
    return text.strip()

def fmt_tokens(t):
    if t >= 1_000_000:
        return f"{t/1_000_000:.1f}M"
    if t >= 1_000:
        return f"{t/1_000:.0f}K"
    return str(t)

def fmt_ts(epoch):
    try:
        return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d %H:%M")
    except:
        return str(epoch)

B = "\033[1m"
R = "\033[0m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
DIM = "\033[90m"

print(f"{B}{'ID':38s} {'SRC':5s} {'TOKENS':>7s}  {'UPDATED':16s} {'DIR':12s} TITLE{R}")
print("─" * 120)

for id_, source, tokens, updated, cwd, title, first_msg in rows:
    dir_name = os.path.basename(cwd)
    if len(dir_name) > 12:
        dir_name = dir_name[:11] + "…"

    tok = fmt_tokens(tokens)
    ts = fmt_ts(updated)

    # Clean and truncate title to first meaningful line
    clean_title = clean(title)
    first_line = clean_title.split("\n")[0].strip()
    if len(first_line) > 55:
        first_line = first_line[:54] + "…"
    if not first_line:
        clean_msg = clean(first_msg)
        first_line = clean_msg.split("\n")[0].strip()
        if len(first_line) > 55:
            first_line = first_line[:54] + "…"

    # Color source
    if source == "mcp":
        src = f"{YELLOW}mcp{R}"
    elif source == "cli":
        src = f"{CYAN}cli{R}"
    else:
        src = f"{DIM}{source[:5]}{R}"

    # The ANSI codes mess up alignment, so pad manually
    print(f"{id_:38s} {src}   {tok:>7s}  {ts:16s} {dir_name:12s} {first_line}")

print()
print(f"Showing {min(len(rows), total)} of {total} sessions. Use --all to see everything.")
print(f"Resume: codex-sessions resume <ID>  |  Fork: codex-sessions fork <ID>  |  Details: codex-sessions show <ID>")
PYEOF
        ;;

    show)
        if [[ -z "$SESSION_ID" ]]; then
            echo "Usage: codex-sessions show <SESSION_ID>" >&2
            exit 1
        fi

        FULL_ID=$(resolve_id "$SESSION_ID") || exit 1

        python3 - "$DB" "$FULL_ID" <<'PYEOF'
import sqlite3, sys, json, os
from datetime import datetime

db_path, session_id = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path)

row = conn.execute("""
    SELECT id, source, model, tokens_used, created_at, updated_at, cwd,
           archived, rollout_path, title, first_user_message
    FROM threads WHERE id=?
""", (session_id,)).fetchone()
conn.close()

if not row:
    print(f"Session {session_id} not found", file=sys.stderr)
    sys.exit(1)

id_, source, model, tokens, created, updated, cwd, archived, rollout, title, first_msg = row

PROMPT_MARKER = "\nBased on this message, call functions."
PROMPT_MARKER2 = "\n\nBased on this message, call functions."

def clean(text):
    for marker in [PROMPT_MARKER, PROMPT_MARKER2]:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]
    return text.strip()

def fmt_tokens(t):
    if t >= 1_000_000:
        return f"{t/1_000_000:.1f}M"
    if t >= 1_000:
        return f"{t/1_000:.0f}K"
    return str(t)

def fmt_ts(epoch):
    try:
        return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return str(epoch)

B = "\033[1m"
R = "\033[0m"

print()
print(f"{B}Session:{R}  {id_}")
print(f"{B}Source:{R}   {source}")
print(f"{B}Model:{R}    {model}")
print(f"{B}Tokens:{R}   {fmt_tokens(tokens)}")
print(f"{B}Created:{R}  {fmt_ts(created)}")
print(f"{B}Updated:{R}  {fmt_ts(updated)}")
print(f"{B}CWD:{R}      {cwd}")
print(f"{B}Archived:{R} {'yes' if archived else 'no'}")
print(f"{B}File:{R}     {rollout}")

clean_title = clean(title)
print(f"\n{B}Title:{R}")
print(clean_title[:300])

clean_msg = clean(first_msg)
if clean_msg and clean_msg != clean_title:
    print(f"\n{B}First message:{R}")
    lines = clean_msg.split("\n")
    for line in lines[:15]:
        print(line)
    if len(lines) > 15:
        print(f"  ... ({len(lines) - 15} more lines)")

# Show last activity from JSONL
if rollout and os.path.isfile(rollout):
    print(f"\n{B}Last activity:{R}")
    with open(rollout) as f:
        lines = f.readlines()
    for line in lines[-5:]:
        try:
            obj = json.loads(line)
            ts = obj.get("timestamp", "")
            t = obj.get("type", "")
            if t == "event_msg":
                p = obj["payload"]
                pt = p.get("type", "")
                msg = ""
                if pt == "task_complete":
                    msg = str(p.get("last_agent_message", ""))[:200]
                    print(f"  {ts}  {pt}")
                    if msg:
                        print(f"    {msg}")
                elif pt in ("token_count",):
                    info = p.get("info", {}).get("total_token_usage", {})
                    total = info.get("total_tokens", 0)
                    print(f"  {ts}  {pt}  total={fmt_tokens(total)}")
                else:
                    print(f"  {ts}  {pt}")
            elif t == "response_item":
                p = obj["payload"]
                role = p.get("role", "")
                for c in p.get("content", []):
                    if c.get("type") == "output_text":
                        print(f"  {ts}  {role}: {c['text'][:200]}")
                    elif c.get("type") == "refusal":
                        print(f"  {ts}  {role}: [refusal] {c.get('refusal','')[:200]}")
                if p.get("type") == "function_call":
                    print(f"  {ts}  call: {p.get('name','')}({p.get('arguments','')[:100]})")
        except:
            pass
PYEOF
        ;;

    resume)
        if [[ -z "$SESSION_ID" ]]; then
            echo "Usage: codex-sessions resume <SESSION_ID>" >&2
            exit 1
        fi

        FULL_ID=$(resolve_id "$SESSION_ID") || exit 1

        echo "Resuming session $FULL_ID ..."
        exec codex resume "$FULL_ID"
        ;;

    fork)
        if [[ -z "$SESSION_ID" ]]; then
            echo "Usage: codex-sessions fork <SESSION_ID>" >&2
            exit 1
        fi

        FULL_ID=$(resolve_id "$SESSION_ID") || exit 1

        echo "Forking session $FULL_ID ..."
        exec codex fork "$FULL_ID"
        ;;
esac
