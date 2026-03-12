## 1. Wire Types (joyful-wire)

- [x] 1.1 Add `effortLevel: z.enum(['low', 'medium', 'high', 'max']).nullable().optional()` to `MessageMetaSchema` in `packages/joyful-wire/src/messageMeta.ts`
- [x] 1.2 Add `claudeDefaultModel: z.string().optional()` and `claudeDefaultEffortLevel: z.string().optional()` to `MachineMetadataSchema` in `packages/joyful-wire/src/` (find the correct file)

## 2. CLI — Settings & Metadata

- [x] 2.1 Expand `ClaudeSettings` interface in `packages/joyful-cli/src/claude/utils/claudeSettings.ts` to expose typed `model?: string` and `effortLevel?: string` fields (currently only `includeCoAuthoredBy` is used)
- [x] 2.2 At daemon startup (machine metadata registration), read `claudeSettings` and populate `claudeDefaultModel` / `claudeDefaultEffortLevel` in `MachineMetadata`

## 3. CLI — Session Config Flow

- [x] 3.1 Add `effortLevel?: string` to `EnhancedMode` interface in `packages/joyful-cli/src/claude/loop.ts`
- [x] 3.2 Pass `effortLevel` through `MessageMeta` → `EnhancedMode` in the message queue / mode resolution code
- [x] 3.3 Add `effortLevel?: string` to `QueryOptions` in `packages/joyful-cli/src/claude/sdk/query.ts` and pass as `--effort <level>` arg when non-null
- [x] 3.4 In `claudeRemote.ts`, pass `effortLevel` from `EnhancedMode` into `sdkOptions` / query options
- [x] 3.5 In `claudeRemote.ts`, populate `Metadata.models[]` with the canonical Claude model list (e.g., `['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5']`) at session init
- [x] 3.6 In `claudeRemote.ts`, populate `Metadata.thoughtLevels[]` with `['low', 'medium', 'high', 'max']` at session init
- [x] 3.7 In `claudeRemote.ts`, set `Metadata.currentThoughtLevelCode` from the active `effortLevel` at session init

## 4. CLI — Model Feedback

- [x] 4.1 In `claudeRemoteLauncher.ts`, detect the `SDKSystemMessage` (type `system`, subtype `init`) in `onMessage()` and extract `.model`
- [x] 4.2 Call `session.client.updateMetadata({ currentModelCode: <model> })` when the SDK init message arrives

## 5. App — Drop adaptiveUsage

- [x] 5.1 Remove `adaptiveUsage` entry from `getClaudeModelModes()` in `packages/joyful-app/sources/components/modelModeOptions.ts`
- [x] 5.2 Remove any `adaptiveUsage` handling from `NewSessionWizard.tsx` or related components

## 6. App — Dynamic Model List

- [x] 6.1 In `packages/joyful-app/sources/sync/messageMeta.ts` (or equivalent), update `resolveMessageModeMeta()` to also return `effortLevel` from session/wizard state
- [x] 6.2 Update the model picker in `NewSessionWizard.tsx` to use `metadata.models[]` from the session's machine metadata instead of the hardcoded list; fall back to a minimal hardcoded list if metadata is unavailable
- [x] 6.3 Pre-populate model picker default from `machineMetadata.claudeDefaultModel` when present

## 7. App — Effort Level UI

- [x] 7.1 Add effort level picker to `AgentInput.tsx` overlay (using `availableEffortLevels` prop); default to `null` (use CC default)
- [x] 7.2 Pre-populate effort picker from `machineMetadata.claudeDefaultEffortLevel` when present; wire up in new/index.tsx
- [x] 7.3 Add effort level display/control to the session view (show current effort level, allow changing it for next invocation)
- [x] 7.4 Add i18n strings for effort level labels and UI copy in all 10 language files

## 8. Typecheck

- [x] 8.1 Run `yarn workspace joyful-app typecheck` and fix any errors
- [x] 8.2 Run `yarn workspace joyful build` to verify CLI compiles cleanly
