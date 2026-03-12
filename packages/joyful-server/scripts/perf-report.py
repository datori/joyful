#!/usr/bin/env python3
"""
Perf benchmark report — run against data/perf.ndjson to get consistent metrics.

Usage:
  python3 scripts/perf-report.py
  python3 scripts/perf-report.py data/perf.ndjson   # explicit path

Produces a snapshot suitable for A/B comparison before/after optimizations.
Tracked changes:
  - batch-seq-allocation      (targets: fast path %, empty fetch rate, Account.update ratio)
  - selective-reconnect-invalidation  (targets: reconnect latency, reconnect fetch count)
"""

import json, sys, os
from collections import defaultdict, Counter

NDJSON_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(__file__), '..', 'data', 'perf.ndjson'
)

events = []
with open(NDJSON_PATH) as f:
    for line in f:
        line = line.strip()
        if line:
            try:
                events.append(json.loads(line))
            except Exception:
                pass

app    = [e for e in events if e.get('src') == 'app']
server = [e for e in events if e.get('src') == 'server']
cli    = [e for e in events if e.get('src') == 'cli']

def pct(durs, p):
    if not durs: return 'n/a'
    idx = max(0, int(len(durs) * p / 100) - 1)
    return durs[min(idx, len(durs)-1)]

def stats(durs):
    if not durs: return 'n=0'
    s = sorted(durs)
    return f"p50={pct(s,50)}ms p95={pct(s,95)}ms p99={pct(s,99)}ms max={max(s)}ms n={len(s)}"

print("=" * 60)
print("PERF BENCHMARK REPORT")
print(f"Source: {NDJSON_PATH}")
print(f"Total events: {len(events)}  (server={len(server)} app={len(app)} cli={len(cli)})")
print("=" * 60)

# ── 1. WebSocket fast/slow path ratio ───────────────────────────
print("\n[1] WEBSOCKET STREAMING PATH")

fast      = [e for e in app if e.get('op') == 'ws.msg.fast']
slow_gap  = [e for e in app if e.get('op') == 'ws.msg.slow' and e.get('reason') == 'seq_gap']
total_ws  = len(fast) + len(slow_gap)

fast_pct  = 100 * len(fast)  // max(total_ws, 1)
slow_pct  = 100 * len(slow_gap) // max(total_ws, 1)

print(f"  ws.msg.fast          {len(fast):>4}  ({fast_pct}%)")
print(f"  ws.msg.slow seq_gap  {len(slow_gap):>4}  ({slow_pct}%)")
print(f"  total ws messages    {total_ws:>4}")
print(f"  TARGET (post batch-seq-allocation): fast ≥95%, seq_gap ≤5%")

# ── 2. Redundant REST fetches ────────────────────────────────────
print("\n[2] FETCH_MSGS (REST message fetches)")

fetch_msgs   = [e for e in app if e.get('op') == 'fetch_msgs']
empty        = [e for e in fetch_msgs if e.get('count', 0) == 0]
fetch_durs   = sorted(e['dur_ms'] for e in fetch_msgs if e.get('dur_ms') is not None)
empty_pct    = 100 * len(empty) // max(len(fetch_msgs), 1)

print(f"  total calls          {len(fetch_msgs):>4}")
print(f"  empty (count=0)      {len(empty):>4}  ({empty_pct}%)  ← wasted round-trips")
print(f"  latency              {stats(fetch_durs)}")
print(f"  TARGET (post batch-seq-allocation): empty ≤10%")

# ── 3. N+1 seq allocation (Account.update) ───────────────────────
print("\n[3] DB SEQ ALLOCATION N+1")

account_updates = [e for e in server if e.get('op') == 'db.query'
                   and e.get('model') == 'Account' and e.get('action') == 'update']
msg_creates     = [e for e in server if e.get('op') == 'db.query'
                   and e.get('model') == 'SessionMessage' and e.get('action') == 'create']
ratio = len(account_updates) / max(len(msg_creates), 1)

print(f"  Account.update calls       {len(account_updates):>4}")
print(f"  SessionMessage.create calls {len(msg_creates):>4}")
print(f"  ratio                       {ratio:.2f}x  (1.0x = batch, >1.0x = N+1)")
print(f"  TARGET (post batch-seq-allocation): ratio ≤1.0x")

# ── 4. POST /messages latency ────────────────────────────────────
print("\n[4] POST /v3/sessions/:id/messages LATENCY")

post_msg  = [e for e in server if e.get('op') == 'http.request'
             and e.get('method') == 'POST'
             and str(e.get('path','')).endswith('/messages')
             and e.get('dur_ms') is not None]
post_durs = sorted(e['dur_ms'] for e in post_msg)
print(f"  {stats(post_durs)}")
print(f"  TARGET: p50 improvement expected from fewer sequential DB writes")

# ── 5. Reconnect flood ───────────────────────────────────────────
print("\n[5] RECONNECT FLOOD")

reconnects = [e for e in app if e.get('op') == 'ws.connected']
for i, rc in enumerate(reconnects):
    ts    = rc['ts']
    flood = [e for e in app if e.get('op') == 'ws.msg.slow'
             and e.get('reason') == 'reconnect' and abs(e['ts'] - ts) < 200]
    fetches = [e for e in app if e.get('op') == 'fetch_msgs'
               and 0 <= e['ts'] - ts <= 600]
    if not flood:
        print(f"  Connect {i+1}: initial (no reconnect flood)")
        continue
    msgs      = sum(f.get('count', 0) for f in fetches)
    end_ts    = max((f['ts'] + f.get('dur_ms', 0) for f in fetches), default=ts)
    latency   = end_ts - ts
    print(f"  Reconnect {i+1}: {len(flood)} sessions invalidated  "
          f"→ {len(fetches)} fetches  {msgs} msgs  {latency}ms to last fetch")

slow_reconnect = [e for e in app if e.get('op') == 'ws.msg.slow' and e.get('reason') == 'reconnect']
print(f"  total reconnect slow events: {len(slow_reconnect)}")
print(f"  TARGET (post selective-reconnect-invalidation): only sessions with new msgs invalidated")

# ── 6. GET /messages latency (reconnect fetch cost) ─────────────
print("\n[6] GET /v3/sessions/:id/messages LATENCY")

get_msg  = [e for e in server if e.get('op') == 'http.request'
            and e.get('method') == 'GET'
            and '/messages' in str(e.get('path',''))
            and e.get('dur_ms') is not None]
get_durs = sorted(e['dur_ms'] for e in get_msg)
print(f"  {stats(get_durs)}")

# ── 7. Regression guards (should not worsen) ─────────────────────
print("\n[7] REGRESSION GUARDS (should not worsen)")

sf      = [e for e in server if e.get('op') == 'db.query'
           and e.get('model') == 'Session' and e.get('action') == 'findFirst'
           and e.get('dur_ms') is not None]
sf_durs = sorted(e['dur_ms'] for e in sf)
print(f"  Session.findFirst     {stats(sf_durs)}")

su      = [e for e in server if e.get('op') == 'db.query'
           and e.get('model') == 'Session' and e.get('action') == 'findUnique'
           and e.get('dur_ms') is not None]
su_durs = sorted(e['dur_ms'] for e in su)
print(f"  Session.findUnique    {stats(su_durs)}")

flush   = [e for e in cli if e.get('op') == 'outbox.flush' and e.get('dur_ms') is not None]
f_durs  = sorted(e['dur_ms'] for e in flush)
print(f"  outbox.flush          {stats(f_durs)}")

print()
