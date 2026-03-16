## Context

When creating a new session, users must type a working directory path or pick from recent/suggested paths. There is no way to explore the remote machine's filesystem interactively. The path picker screen (`new/pick/path.tsx`) is a simple text input + static list.

The daemon already registers a `listDirectory` RPC handler in `registerCommonHandlers.ts`, but it is scoped to the active session's working directory (via `validatePath`). It cannot be reused for pre-session browsing.

Machine-level RPC handlers (in `apiMachine.ts`) are registered once per daemon and have no path restriction — the right level for a general-purpose directory browser.

## Goals / Non-Goals

**Goals:**
- Let users browse the remote filesystem before spawning a session.
- Populate the path text input on confirmation (user can still edit before confirming).
- Work consistently when the machine is online; degrade gracefully when offline.
- Fit the existing push-navigation pattern without introducing new navigation primitives.

**Non-Goals:**
- File browsing (directories only; this is a working-directory picker, not a file picker).
- Creating new directories from the browser UI (out of scope for v1).
- Search/filter within the directory listing.
- Caching directory listings across browser sessions.
- Reuse outside of the new-session flow (no generic `DirectoryPicker` component for now).

## Decisions

### 1. New machine-level RPC, not reuse of session-level `listDirectory`

The session-level handler validates paths against `workingDirectory` (the session's cwd). Pre-session browsing must be unrestricted. A new `browse-directory` handler in `apiMachine.ts` avoids mutating the session handler and keeps the two concerns cleanly separated.

**Alternative considered**: Relax the session-level handler's validation. Rejected — it would widen the attack surface of an in-session tool, and it couples two different privilege levels.

### 2. Navigation stack in component state, not route params

The browser navigates through directories without pushing native stack frames. Maintaining a `string[]` path stack in React state means the device back button always returns to `path.tsx`, never steps through directory history. This matches the mental model: "browse, confirm, done" — not "navigate there step by step and back out".

**Alternative considered**: Push a new route per directory tap. Rejected — creates deep navigation history that feels wrong on mobile and complicates the "Use this directory" return flow.

### 3. Confirm populates `path.tsx` input, not direct session spawn

On confirm, the browser passes the selected path back to `path.tsx` via Expo Router `setParams`. The user sees the path in the text input and can edit it before the final checkmark confirm. This is safer (paths on remote machines can be surprising) and consistent with the existing flow where the text input is always the source of truth.

**Alternative considered**: Confirm from browser navigates directly to `new/index.tsx` and skips `path.tsx`. Rejected — it bypasses the editable confirmation step.

### 4. Dirs-only display, files filtered client-side

The RPC returns all entries (`file | directory | other`). The browser screen filters to `type === 'directory'` (including symlinks that resolve to directories). Keeping the RPC general means it could be reused in future contexts without changing the daemon.

### 5. Hidden directories off by default, toggle in header

`.` prefixed names are valid working directories (`.config`, `.local`, etc.) but add clutter for most workflows. A header toggle (`👁` icon) lets advanced users show them without imposing them on everyone.

## Risks / Trade-offs

**RPC latency per navigation tap** → Each directory tap is a round-trip over WebSocket (~20 ms LAN, ~100–300 ms internet). Mitigated by showing a loading indicator immediately on tap so the UI never appears frozen.

**Unreachable machine** → If the machine goes offline between page load and a browse action, the RPC fails. Mitigated by disabling the "Browse" entry when machine status is offline, and by surfacing an inline error in the browser if the RPC fails mid-session.

**Permission-denied directories** → The daemon may not be able to read all directories (e.g., `/root` if running as non-root). The RPC returns `{ success: false, error }` for unreadable dirs; the browser shows an inline error and lets the user navigate elsewhere.

**Large directories** → Directories with hundreds of entries (e.g., `/`) will return large payloads. The browser renders all entries but filters to dirs only, which reduces count significantly. No pagination for v1; acceptable given typical project directory sizes.

## Migration Plan

No migration required. The `browse-directory` RPC is purely additive. Old daemon versions simply won't have the handler — the `machineBrowseDirectory` call will fail, and the app can catch and fall back to manual path input. No database changes; no wire type changes; no server changes.

## Open Questions

- Should breadcrumb truncation happen on the left (showing the leaf end) or use an ellipsis in the middle? Left-truncation preferred on mobile since the leaf is the most meaningful part.
- Should symlinks that point to directories be shown with a distinct icon? Nice-to-have for v1, not required.
