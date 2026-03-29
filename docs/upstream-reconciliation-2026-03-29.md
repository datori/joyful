# Upstream Reconciliation Analysis
**Date:** 2026-03-29
**Upstream:** `slopus/happy` (`upstream/main`)
**Fork:** `datori/joyful` (`main`)
**Fork divergence point:** `d343330c` ("fix(happy-app): hide internal Claude Code ToolSearch from UI")
**Commits upstream is ahead:** 121
**Commits our fork is ahead:** ~30

---

## 1. Executive Summary

Upstream pushed a large batch of 121 commits covering five major feature areas: session resume, a new session composer overhaul, a dev environments system, Codex v2 protocol migration, and a social/friendship layer. There are also critical bug fixes (MCP SDK 1.27 breakage), and OpenClaw was independently added upstream.

Our fork has significant unique work: a worktrees lifecycle (create/list/merge/cleanup), a heavily customized session list UI (project groups, compact density, quota bars, archive management), git history/branch screen, directory browser, Bedrock model support, plasma avatars, OpenSpec tooling, and structured performance instrumentation. Many of these touch the same files that upstream also modified, creating a real (but manageable) conflict surface.

This document is intended as the living reference for an eventual reconciliation effort.

---

## 2. Fork Baselines

### Our fork's unique work since divergence

| Area | Key commits |
|------|-------------|
| Worktrees | Full lifecycle: create, list, cleanup, merge, conflict resolution, squash; worktree sessions grouped under base repo in session list; worktree branch name in header/subtitle |
| Session list UI | Collapsible project groups, stable ordering + reorder UI, compact rows, inline quota bars, dividers, tighter headers, archived sessions section, status dot on right |
| Git tools | Git history + branch list screen; interactive directory browser for working dir |
| Native session browser | Import/resume Claude Code native sessions in-app (FAB split, history replay) |
| OpenSpec tooling | Full OpenSpec toolbar integration, explore/patch mode, status panel, submenu |
| Model/effort | Claude model/effort integration from CLI as source of truth; Bedrock model options |
| Quota | Authoritative API header approach; only poll machines with OAuth credentials |
| Avatars | Plasma avatar style as new default, AvatarBrutalist/AvatarPlasma components |
| Perf | Structured perf instrumentation across server/app/CLI; N+1 seq fix; batch reconnect |
| CLI | Strip CLAUDECODE env var before spawning claude; emoji session titles; slimmed IGNORED_COMMANDS |
| UX | Compact header, reduced web header height, inline model toggles, J logo |
| Auth | Slash command autocomplete on new session screen; machine memory stats in sidebar |

### Key files our fork uniquely owns (not in upstream)
- `packages/joyful-app/sources/app/(app)/session/[id]/merge.tsx` — worktree merge screen
- `packages/joyful-app/sources/app/(app)/session/[id]/git.tsx` — git history screen
- `packages/joyful-app/sources/utils/worktree.ts` — consolidated worktree utilities
- `packages/joyful-app/sources/utils/createWorktree.ts`, `generateWorktreeName.ts`
- `packages/joyful-app/sources/hooks/useWorktreeList.ts`
- `packages/joyful-cli/src/configuration.ts` — our custom config class (does not exist in upstream)
- OpenSpec files throughout `openspec/`

---

## 3. Upstream Changes — Detailed Breakdown

### 3.1 Session Resume (high value)

**Commits:** `db8c3c7a`, `64d96741`, `c4db0276`, `cc88fc83`, `430bd732`, `196ae54f`

- Full session resume flow for both Claude and Codex threads
- Resume command added to app (`feat(app): add session metadata copy and resume commands`)
- `happy-agent` RPC for remote-triggered resume (`Add happy-agent-gated session resume RPC`)
- Gated behind `expResumeSession` feature flag
- Polished archived session resume flow (separate commit `430bd732`)
- Codex thread resume after forced restart

**Impact on our fork:** High value. We have our own native session browser for resuming Claude Code sessions, but upstream's resume feature operates at the session protocol level (forking from existing session history). These are complementary, not duplicates. Pulling this in would add server-protocol-level resume that our native session approach doesn't cover.

**Conflict risk:** Medium. Touches `SessionsList`, `ChatHeaderView`, session protocol types. We've also modified these.

---

### 3.2 New Session Composer Overhaul (high value, high conflict)

**Commits:** `b7690ff5`, `d89231cf`, `064b7501`, `6c5e28de`, `8c565ea5`, `5027d1b1`, `ca72e4fa`, `9e0ff5c6`, `fe2c3959`, `40956daf`

- Experimental session composer screen at `/new` route wired to real data
- Draft state persistence, offline machine display
- Model/permission mode config wired to first message
- Custom project paths for new sessions
- Git worktree picker (list + create) in the new session screen
- Profiles and wizard removed from this flow (`refactor: move CLI detection to daemon, remove profiles and wizard files`)
- Enter-to-send keyboard shortcut on new session screen
- `NewSessionWizard`, `ProfileEditForm`, `ProfileEditForm` components significantly reworked or removed

**Impact on our fork:** High conflict zone. Files affected:
- `packages/joyful-app/sources/app/(app)/new/index.tsx` — **both sides changed**
- `packages/joyful-app/sources/app/(app)/new/pick/browse.tsx` — **both sides changed**
- `packages/joyful-app/sources/app/(app)/new/pick/machine.tsx` — **both sides changed**
- `packages/joyful-app/sources/app/(app)/new/pick/path.tsx` — **both sides changed**
- `packages/joyful-app/sources/app/(app)/new/pick/profile-edit.tsx` — **both sides changed**
- `packages/joyful-app/sources/components/NewSessionWizard.tsx` — **both sides changed**
- `packages/joyful-app/sources/components/ProfileEditForm.tsx` — **both sides changed**

The upstream also removed the entire wizard/profiles concept from the new session flow. We still have this screen. The upstream's worktree picker in this screen overlaps significantly with our own worktree work — conceptually they're doing the same thing (picking/creating a worktree for a new session) but likely with different implementations.

**Profile files note:** The upstream removed "wizard profiles" (model preset profiles for CLI detection) but added GitHub social profiles (`firstName`, `lastName`, `avatar` on Account). Our `profileSync.ts` / `profileUtils.ts` in joyful-app appear to be sync logic for the settings/profile screen (not the wizard). Need to audit whether these are the wizard profiles (to be removed) or the social profiles (to be kept).

---

### 3.3 Dev Environments System (medium value)

**Commits:** `6cf4f734`, `d645fa9d`, `0c37f9df`, `9f173568`, `4afac445`, `a8f51985`, `70b4c024`, `5837b82f`, `86ab98b7`, `25a65e98`, `3c1ef2e0`

- New top-level `environments/` directory with `environments.ts` manager
- `lab-rat-todo-project` fixture for integration testing
- `up/down` workflow scripts with auth seeding
- Tailscale port binding script for team dev
- Integration tests now boot real isolated environments per suite (`feat(test): boot real environment for integration tests`)
- CLI args forwarded through env scripts
- Expo browser auto-open disabled in env runs
- `happy-agent` exposed in sourced env

**Impact on our fork:** Medium. We have our own `dev-stack.sh` approach documented in CLAUDE.md. The upstream's system is more sophisticated (per-suite environment isolation for tests, lab-rat fixture). Worth considering adopting for better test isolation, but not blocking.

**Conflict risk:** Low — entirely new files/directory. The only overlap is in `environments/environments.ts` (which we haven't touched).

---

### 3.4 Codex Overhaul (high priority if using Codex)

**Commits:** `71dd0679`, `01bbc16a`, `a87be15f`, `ee4926ec`, `b611054b`, `12b45fb3`, `1286c884`, `834fc52a`

- **Codex migrated from stdin/stdout to app-server protocol** (`feat(happy-cli): migrate codex to app-server protocol`)
- V2 protocol compatibility: wire format, interrupt, event dedup
- Raw notification protocol support
- Abort/interrupt race hardening
- Permission handling fix — MCP SDK strips params, and response format was wrong (`a87be15f`)
- `gpt-5.4` fallback model added, default model set
- Resume Codex thread after forced restart

**Impact on our fork:** The Codex MCP client (`packages/joyful-cli/src/codex/codexMcpClient.ts`) is in the conflict zone. This is a significant rework. If we use Codex at all, these fixes are important, especially the permission handling fix which is a functional bug.

**Conflict risk:** High for `codexMcpClient.ts`, `codex/types.ts`. Both sides changed these files.

---

### 3.5 OpenClaw Integration (conflict — upstream added independently)

**Commits:** `6b90c8d3`, `672ca01e`, `16e3f60b`, `4ad05666`

Upstream independently added:
- `packages/happy-cli/src/openclaw/` — OpenClawBackend, OpenClawSocket, openclawAuth, openclawTypes, runOpenClaw, integration tests
- `packages/happy-app/...` — OpenClaw as selectable agent in frontend + icon assets
- Two follow-up fixes:
  - `fix(openclaw): respect OPENCLAW_STATE_DIR env var for config path resolution`
  - `refactor(openclaw): query gateway config from CLI binary instead of reading config file` — uses `openclaw status --json` and `openclaw config get gateway.port` instead of parsing the config file directly

**Impact on our fork:** **This is a key point.** Looking at our fork, we do NOT appear to have an openclaw directory or OpenClaw integration. There are no references to `openclaw` or `OpenClaw` in our `joyful-cli/src/` or `joyful-app/sources/`. This means:
1. Upstream has OpenClaw, we do not yet
2. We can pull in the upstream's OpenClaw implementation wholesale
3. The two follow-up fixes (OPENCLAW_STATE_DIR, gateway config from CLI binary) are important refinements to include

**Note on the fix commits:** The `OPENCLAW_STATE_DIR` fix means the OpenClaw auth resolver now respects `OPENCLAW_STATE_DIR` env var for config path override. The gateway config refactor queries `openclaw status --json` (or `openclaw config get gateway.port`) instead of reading the config file directly — this is more robust across OpenClaw versions.

**Conflict risk:** Low — we have no existing OpenClaw code to conflict with.

---

### 3.6 Social / Friendship Layer (low immediate priority)

**Commits:** Multiple, including friendship add/remove/list, usernames, user feed, GitHub connect/disconnect

- New DB tables: `UserRelationship`, `UserFeedItem`, `UserKVStore`
- Social friends: add, remove, list, notifications
- Username support (`@unique` on Account)
- GitHub OAuth connect/disconnect
- User profile fields: `firstName`, `lastName`, `username`, `avatar` on Account
- Artifacts system: new `Artifact` and `AccessKey` models
- Service account tokens
- Data encryption keys per session and machine

**Impact on our fork:** These are entirely new tables in `happy-server`. Our `joyful-server` is a thin overlay, so we need to pull all these schema additions in to stay current. However, the social features themselves (friends, feed, GitHub) are unlikely to be features we want to expose in joyful's UI immediately.

**Schema tables new in upstream (not in our joyful-server yet):**
- `UserRelationship` (friendship graph)
- `UserFeedItem` (social feed)
- `UserKVStore` (per-user KV store)
- `GithubUser` / `GithubOrganization` (GitHub OAuth)
- `Artifact` (shareable artifacts)
- `AccessKey` (API access keys)
- `ServiceAccountToken`
- New fields on `Account`: `firstName`, `lastName`, `username`, `avatar`, `githubUserId`, `feedSeq`
- New fields on `Session`: `dataEncryptionKey`
- New fields on `Machine`: `model`, `daemonState`
- New indexes: `updatedAt` on Session, `seq` on SessionMessage

**Conflict risk:** High for joyful-server source files (86 overlapping files). The server files are the `happy→joyful` rename of the same upstream files. The upstream has added substantial new functionality to these files. However, our joyful-server changes are primarily the rename pass + the PGlite/standalone standalone mode (port 3007, `JOYFUL_MASTER_SECRET`, standalone.ts). The upstream's changes are additive feature work. The merge will need care but the changes are conceptually separable.

---

### 3.7 Critical Bug Fixes

#### MCP SDK 1.27 transport reuse rejection (CRITICAL)
**Commit:** `0fd4112f`
**File:** `packages/happy-cli/src/claude/utils/startHappyServer.ts`
**Our equivalent:** `packages/joyful-cli/src/claude/utils/startHappyServer.ts`

SDK ≥1.27 added a guard that throws if you try to connect an already-connected transport. The fix creates a fresh `McpServer` + `StreamableHTTPServerTransport` per request (stateless pattern). Also pins `@modelcontextprotocol/sdk` to exact `1.25.3` (drop `^`) to prevent silent upgrades.

**Action:** Cherry-pick or manually apply to `packages/joyful-cli/src/claude/utils/startHappyServer.ts` **immediately** if we haven't already. This is a breaking regression on newer Claude Code installs.

#### Other notable fixes

| Commit | Description | Our file |
|--------|-------------|----------|
| `cc88fc83` | `stdio 'ignore'` for child sessions (prevents SIGPIPE deaths in daemon) | joyful-cli daemon |
| `f345bc14` + `ec75aaed` | iOS session list freeze + invisible sessions | joyful-app SessionsList |
| `Fix push notification duplication and token management` | Push token dedup | joyful-server pushRoutes |
| `d278de27` | Remote logging EXPO_PUBLIC_ prefix fix | joyful-app remoteLogger |
| `Fix Windows workspace TypeScript builds` | Windows CI | tsconfig |

---

### 3.8 Auto-switch to Plan Mode (easy win)

**Commit:** `cda0dfa4`
**File:** `packages/happy-app/sources/components/AgentInput.tsx` → our `AgentInput.tsx`

When the agent sends an `EnterPlanMode` tool call, the app auto-switches the composer input to plan mode. Clean UX improvement, likely low-conflict.

---

### 3.9 Package Rename: `happy-coder` → `happy`

**Commit:** `fbd99209`

The npm package was renamed. Doesn't affect us since we're `joyful` and not published to npm.

---

### 3.10 Push Notification & Session Routing Improvements

**Commit:** `ec75aaed`

- Push notification deduplication
- Token management improvements
- Session routing on notification tap

**Impact:** Medium. We haven't worked on push notifications specifically. These can be pulled in as part of a joyful-server sync.

---

### 3.11 Daemon: Explicit Environment Variables Pass-through

**Commit:** `3c1ef2e0`

Daemon now passes explicit environment variables through spawned sessions. Pairs with the dev environments system. Could be useful for our Bedrock/custom model env var support.

---

### 3.12 `happy-agent` Enhancements

**Commits:** `4944547e`, `31478628`, `cc88fc83`, `c4db0276`

- Machine spawn via happy-agent
- Session resume RPC
- Manager/engineer agent workflow definitions
- Integration test coverage for happy-agent

**Our `joyful-agent`** is an independent implementation (built from scratch as part of our fork — see `packages/joyful-agent/`). The upstream happy-agent and our joyful-agent serve similar purposes but are likely different codebases. The upstream's session resume RPC additions are relevant for our agent's feature set.

**Conflict file:** `packages/joyful-agent/src/config.ts` is in the overlap list.

---

## 4. Conflict Analysis

### 4.1 Conflict Heat Map

| Package | Overlapping files | Risk level | Primary conflict topics |
|---------|------------------|------------|------------------------|
| `joyful-app` | 51 | **HIGH** | New session screen, SessionsList, ChatHeaderView, FABWide, worktree utils, component reworks |
| `joyful-server` | ~80 | **HIGH** | Additive schema + routes, but upstream's changes are additive while ours are rename-based. Conceptually separable. |
| `joyful-wire` | All files | **MEDIUM** | Shared types. Upstream added new message types for session protocol v2, social, artifacts. |
| `joyful-cli` | 14 | **MEDIUM** | configuration.ts (we have, upstream doesn't), startHappyServer.ts (MCP fix needed), codexMcpClient.ts, sessionProtocol/types.ts |
| `joyful-agent` | 1 (`config.ts`) | **LOW** | Minor |
| `happy-app` (residual) | 11 | LOW | Upstream changed files we renamed but left copies of |

### 4.2 Highest-Risk Individual Files

These files were changed by both upstream and our fork and represent the most likely manual merge work:

1. **`packages/joyful-app/sources/app/(app)/session/[id].tsx`** — session screen; upstream added resume, plan mode, quick actions; we added worktree controls, merge button
2. **`packages/joyful-app/sources/components/SessionsList.tsx`** — we heavily reworked (project groups, compact rows, archive section); upstream fixed iOS freeze + invisible sessions
3. **`packages/joyful-app/sources/components/ChatHeaderView.tsx`** — we added worktree subtitle; upstream added session metadata/resume commands
4. **`packages/joyful-app/sources/components/FABWide.tsx`** — we added split FAB for native session resume; upstream changed FAB layout
5. **`packages/joyful-app/sources/app/(app)/new/index.tsx`** — we added slash command autocomplete; upstream rewrote to experimental composer
6. **`packages/joyful-app/sources/sync/settings.ts`** — both sides added new settings fields
7. **`packages/joyful-cli/src/codex/codexMcpClient.ts`** — upstream migrated to app-server protocol; we may have minor changes
8. **`packages/joyful-wire/src/sessionProtocol.ts`** — upstream adding v2 protocol types; we added types for worktrees

### 4.3 Files Unique to Our Fork (protect these)

These exist only in our fork and must be preserved through any rebase/merge:
- `packages/joyful-app/sources/app/(app)/session/[id]/merge.tsx`
- `packages/joyful-app/sources/app/(app)/session/[id]/git.tsx`
- `packages/joyful-app/sources/utils/worktree.ts`
- `packages/joyful-app/sources/utils/createWorktree.ts`
- `packages/joyful-app/sources/utils/generateWorktreeName.ts`
- `packages/joyful-app/sources/hooks/useWorktreeList.ts`
- `packages/joyful-cli/src/configuration.ts`
- All `openspec/` files
- `packages/joyful-app/.claude/agents/i18n-translator.md`
- `.github/workflows-disabled/` (our disabled CI)
- `scripts/dev-stack.sh`, `scripts/postinstall.cjs` (may have upstream changes too)

---

## 5. Recommended Reconciliation Strategy

### Phase 1: Cherry-picks (do immediately, no rebase needed)

These are isolated fixes that can be applied now without waiting for a full sync:

1. **MCP SDK 1.27 fix** (`0fd4112f`) → apply to `packages/joyful-cli/src/claude/utils/startHappyServer.ts`
2. **`stdio 'ignore'` for child sessions** → `joyful-cli` daemon spawn code
3. **Remote logging EXPO_PUBLIC_ fix** (`d278de27`) → `packages/joyful-app/sources/utils/remoteLogger.ts`

### Phase 2: Additive pulls (can be applied cleanly, low conflict)

These upstream additions don't touch files we've changed:

1. **OpenClaw integration** — upstream's `openclaw/` directory can be copied wholesale into `joyful-cli/src/`, along with the two follow-up fixes
2. **Push notification improvements** — primarily server-side, separable from our changes
3. **Dev environments system** — new `environments/` directory, no conflict
4. **happy-agent session resume RPC** — may need adaptation for joyful-agent
5. **Auto-switch to plan mode** (`cda0dfa4`) — small change to AgentInput.tsx

### Phase 3: Server schema sync (medium effort)

Apply all upstream `happy-server` schema migrations to `joyful-server`:

- `20250827044624_add_user_profile_fields`
- `20250827015520_add_github_entities`
- `20250911030241_add_version2_field`
- `20250917052000_add_artefacts`
- `20250917055002_add_access_key`
- `20250918045344_add_friendships`
- `20250919021354_fix_relationship_status`
- `20250920025406_add_username`
- `20250920213557_add_user_feed`
- `20250922000310_add_user_kv`
- `20250901205028_add_service_account_tokens`
- `20250908050408_add_data_encryption_key`
- `20250908052114_add_machine_data_encryption_key`
- `20250812092041_add_machine_model`
- `20250818044258_add_daemon_state_to_machine`
- `20250820051609_add_session_id_seq_index`
- `20250820052449_add_session_sort`
- `20250816171155_add_app_to_app_authentication`
- `20250827045037_add_reuse_key_to_file`
- `20250827051355_add_image_parameters`

All corresponding source file changes in `happy-server` routes, actions, and storage should follow.

**Note:** Our `joyful-server` standalone.ts and PGlite customizations must be preserved (port 3007, `JOYFUL_MASTER_SECRET` env var, `DATA_DIR` for PGlite data path).

### Phase 4: Full git reconciliation (large effort, plan carefully)

A full `git rebase upstream/main` or `git merge upstream/main` will surface all the conflicts above. The recommended approach is:

1. Create a reconciliation branch: `git checkout -b reconcile-upstream-2026-03-29`
2. Attempt `git merge upstream/main` (not rebase — we want to preserve our commit history)
3. Work through conflicts file by file, prioritizing:
   - Keep our worktree logic everywhere
   - Keep our session list UI customizations
   - Take upstream's new features (resume, plan mode, composer improvements)
   - Take upstream's Codex protocol changes wholesale
4. For `joyful-server`: take upstream's happy-server changes as the base, then re-apply our rename + standalone customizations on top

---

## 6. Open Questions

1. **Profile files audit needed:** Our fork has `profileSync.ts` / `profileUtils.ts` / `settings/profiles.tsx`. Upstream removed wizard profiles but added social/GitHub profiles. We need to determine which of our profile files are the "old wizard" type (to be removed) vs independent functionality we want to keep.

2. **configuration.ts vs upstream pattern:** Our fork added a custom `Configuration` class in `packages/joyful-cli/src/configuration.ts`. Upstream doesn't have this — they use `packages/happy-cli/src/configuration.ts` with a different structure. When syncing, we need to decide if we keep our class-based config or adopt upstream's pattern.

3. **Worktree overlap in new session screen:** Upstream added a worktree picker to the new session screen (`feat(new-session): list and select existing git worktrees in picker`, `feat(new-session): wire up client-side worktree creation`). We also have extensive worktree creation logic. These need to be reconciled carefully — we should take the best of both implementations.

4. **`happy-app` residual files:** We still have `packages/happy-app/` files (not renamed to `joyful-app`). Upstream changed 11 of them. We should decide if we want to pull those changes into the `happy-app` package or just let them diverge (since our primary concern is the `joyful-app` package).

5. **Session protocol v2:** Upstream has a draft plan for "session protocol unification v2" and added a `version2` field to `SessionMessage`. This is early-stage. We should track it but not block reconciliation on it.

6. **`happy-app-logs`:** Upstream added a standalone app log receiver (`f345bc14`). We have our own remote logging fix. These may or may not be related.

---

## 7. Reference: Upstream Commit List by Category

### Critical fixes
- `0fd4112f` fix: MCP server broken by SDK 1.27 transport reuse rejection
- `a87be15f` fix(codex): fix permission handling — params stripped by MCP SDK, wrong response format
- `cc88fc83` fix(daemon): use stdio 'ignore' for child sessions to prevent SIGPIPE deaths
- `f345bc14` Add standalone app log receiver (happy-app-logs)
- `Fix iOS session list freeze and invisible sessions`
- `Fix push notification duplication and token management`
- `d278de27` fix(remote-logging): use correct EXPO_PUBLIC_ env var prefix

### Session resume
- `db8c3c7a` Add Happy session resume command
- `64d96741` Add Codex thread resume support
- `c4db0276` Add happy-agent-gated session resume RPC
- `cc88fc83` Add happy-agent session resume and machine RPC
- `196ae54f` Gate session resume behind expResumeSession feature flag
- `430bd732` Polish archived session resume flow
- `b611054b` fix(codex): resume thread after forced restart

### New session composer
- `b7690ff5` feat(happy-app): experimental session composer screen
- `d89231cf` refactor: move CLI detection to daemon, remove profiles and wizard files
- `064b7501` refactor(happy-app): remove profile/wizard references from app code and translations
- `6c5e28de` feat(happy-app): wire session composer to real data at /new route
- `5027d1b1` feat(new-session): persist draft state and show offline machines
- `ca72e4fa` feat(new-session): wire up client-side worktree creation
- `9e0ff5c6` feat(new-session): list and select existing git worktrees in picker
- `787864d0` feat(new-session): propagate permission mode and model to first message
- `40956daf` feat(app): allow custom project paths for new sessions

### OpenClaw
- `6b90c8d3` feat(happy-cli): add OpenClaw agent backend integration
- `672ca01e` feat(happy-app): add OpenClaw as selectable agent in frontend
- `16e3f60b` refactor(openclaw): query gateway config from CLI binary instead of reading config file
- `4ad05666` fix(openclaw): respect OPENCLAW_STATE_DIR env var for config path resolution

### Codex
- `71dd0679` feat(happy-cli): migrate codex to app-server protocol
- `12b45fb3` fix(codex): v2 protocol compatibility — wire format, interrupt, event dedup
- `1286c884` fix(codex): wire markPendingTurnStarted in v2 lifecycle handler
- `834fc52a` feat(codex): add raw notification protocol support
- `ee4926ec` fix(happy-cli): harden codex abort and interrupt races
- `01bbc16a` fix(app): add codex default model and gpt-5.4 fallback

### Plan mode
- `cda0dfa4` feat(happy-app): auto-switch input to plan mode on EnterPlanMode tool call

### Dev environments
- `6cf4f734` devx: add local dev environment system
- `d645fa9d` feat(env): add up/down workflow and auth seeding helpers
- `0c37f9df` feat(env): forward CLI args through env scripts
- `9f173568` feat(env): move env manager under environments and provision lab-rat fixture
- `4afac445` feat(test): boot real environment for integration tests
- `a8f51985` test(integration): isolate suites with per-suite environments
- `3c1ef2e0` feat(daemon): pass explicit environment variables through spawned sessions

### Social / schema
- `Merge branch 'happy-star'` (social features integration)
- Multiple migration commits (see Phase 3 list above)

### Other UX improvements
- `251d4abc` Show explicit environment URLs
- `ec75aaed` Fix Codex patch approval rendering
- `a1d0a79d` feat(app): add session metadata copy and resume commands
- `feec5919` Fix composer send button alignment math
- `2b53307c` Remove SwiftUI Host wrappers from session list components
- `11a02fe8` Remove archive confirmation prompts
- `11c7e3b4` Add session quick actions and native dev auth
- `bcb2b347` feat(happy-app): always show delete session button in session info

---

*Last updated: 2026-03-29. Re-run `git log --oneline main..upstream/main` to check for additional upstream commits before starting reconciliation work.*
