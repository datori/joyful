## REMOVED Requirements

### Requirement: Settings popup uses horizontal chip rows
**Reason**: The floating overlay is replaced by inline controls directly in the input action row. Model is selected via binary toggles; effort and permission are compact tap-to-cycle selectors. The popup no longer exists for Claude sessions.
**Migration**: No migration needed — all settings are still accessible and persisted; they are now exposed inline rather than behind a gear tap.

## MODIFIED Requirements

### Requirement: Permission mode, model, and effort level persist across platforms
The app SHALL persist the user's permission mode, model, and effort level selections per session so that they survive app restarts, device changes, and platform switches. Model SHALL be stored as one of the four explicit keys: `claude-sonnet-4-6`, `claude-sonnet-4-6[1m]`, `claude-opus-4-6`, `claude-opus-4-6[1m]`. A stored value of `default` or `claude-haiku-4-5` SHALL be treated as `claude-sonnet-4-6` when read back.

#### Scenario: Settings restored after app restart on same device
- **WHEN** the user sets a permission mode, model, or effort level for a session
- **AND** the app is closed and reopened on the same device
- **THEN** the session restores the previously selected permission mode, model, and effort level

#### Scenario: Settings restored on a different platform
- **WHEN** the user sets a permission mode or model on one platform (e.g., iOS)
- **AND** the user opens the same session on a different platform (e.g., web)
- **THEN** the session shows the previously selected values (fetched from server-side KV store)

#### Scenario: Local change takes precedence over server value
- **WHEN** the in-memory selection on the current platform differs from the server-side saved value
- **THEN** the local in-memory selection is shown (most recent change wins)

#### Scenario: Legacy default model key falls back to Sonnet
- **WHEN** a session has a stored model key of `default` or `claude-haiku-4-5`
- **THEN** the UI resolves and displays `claude-sonnet-4-6` (Sonnet 4.6, standard context)

## ADDED Requirements

### Requirement: Model selection uses inline binary toggles
The input action row SHALL display two adjacent binary toggle controls for Claude model selection: one for model tier (`Sonnet` / `Opus`) and one for context window (`Std` / `1M`). Together they select one of the four supported model keys: `claude-sonnet-4-6`, `claude-sonnet-4-6[1m]`, `claude-opus-4-6`, `claude-opus-4-6[1m]`.

#### Scenario: Sonnet / Opus toggle reflects current tier
- **WHEN** the current model is `claude-sonnet-4-6` or `claude-sonnet-4-6[1m]`
- **THEN** the `Sonnet` segment is highlighted; `Opus` is not

#### Scenario: Toggling tier preserves context window selection
- **WHEN** the current model is `claude-sonnet-4-6[1m]` and the user taps `Opus`
- **THEN** the model becomes `claude-opus-4-6[1m]` (1M context preserved)

#### Scenario: Std / 1M toggle reflects current context window
- **WHEN** the current model is `claude-opus-4-6[1m]`
- **THEN** the `1M` segment is highlighted; `Std` is not

#### Scenario: Toggling context window preserves tier
- **WHEN** the current model is `claude-sonnet-4-6` and the user taps `1M`
- **THEN** the model becomes `claude-sonnet-4-6[1m]` (Sonnet tier preserved)

### Requirement: Effort and permission are compact tap-to-cycle selectors in the action row
The right side of the input action row SHALL show effort level and permission mode as small, dimmed pressable labels. Each tap advances the selection to the next option in its cycle (wrapping around). The labels SHALL use a secondary/muted color to signal lower visual priority than the model toggles.

#### Scenario: Effort label shows current effort
- **WHEN** effort level is `high`
- **THEN** the effort selector label reads `High` (or locale equivalent) in a muted/secondary color

#### Scenario: Tapping effort cycles to next option
- **WHEN** effort is `high` and user taps the effort selector
- **THEN** effort advances to `max` (next in cycle: default → low → medium → high → max → default)

#### Scenario: Permission label shows current mode
- **WHEN** permission mode is `bypassPermissions`
- **THEN** the permission selector shows the mode name in a muted color (or warning color for destructive modes, consistent with existing styling)

#### Scenario: Tapping permission cycles to next mode
- **WHEN** permission mode is `default` and user taps the permission selector
- **THEN** permission advances to `acceptEdits` (next in cycle order)

### Requirement: Claude agent selector is removed from the input action row
The input action row SHALL NOT render a "Claude" agent type button or label when the session flavor is `claude`. The agent is always Claude and the button conveys no useful information.

#### Scenario: No agent label in Claude session input
- **WHEN** the active session uses the `claude` agent
- **THEN** no agent type chip or label appears in the input action row

### Requirement: Status bar right column is removed
The status bar above the input field SHALL NOT show the right-column permission mode, model name, or effort badge for Claude sessions. These values are now visible directly in the action row.

#### Scenario: Status bar shows only left-side content for Claude
- **WHEN** viewing a Claude session's input area
- **THEN** the status bar shows only connection status and context warning (left side); no permission mode, model, or effort text appears on the right
