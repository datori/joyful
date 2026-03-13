## 1. App Settings — Agent ID Storage

- [x] 1.1 Add `elevenLabsAgentId?: string` field to the settings Zustand store in `sources/sync/storage.ts` (alongside existing settings fields)
- [x] 1.2 Add `elevenLabsAgentId` to all 9 translation files (key: `settingsVoice.agentId`, `settingsVoice.agentIdPlaceholder`, `settingsVoice.agentIdFooter`, `settingsVoice.configuredStatus`, `settingsVoice.notConfiguredStatus`, `settingsVoice.setupGuide`) in `sources/text/translations/`

## 2. App Config — Priority Resolution

- [x] 2.1 Update `getEffectiveAgentId()` resolution in `sources/sync/appConfig.ts` (or inline in `RealtimeSession.ts`) to check local settings first, then `EXPO_PUBLIC_*` env var, then build-time baked value
- [x] 2.2 Export a `useIsVoiceConfigured()` hook (or selector) from storage that returns `true` if any agent ID source resolves to a non-empty value

## 3. App — Unconfigured Mic Button Error

- [x] 3.1 In `sources/realtime/RealtimeSession.ts`, replace the `console.error('Agent ID not configured'); return` with a `Modal.alert(t('common.error'), t('errors.voiceNotConfigured'))` that includes a navigation action to the voice settings screen
- [x] 3.2 Add translation keys `errors.voiceNotConfigured` and `errors.voiceNotConfiguredDetail` to all 9 language files

## 4. Voice Settings Screen — Configuration UI

- [x] 4.1 Add a "Configuration" `ItemGroup` section to `sources/app/(app)/settings/voice.tsx` containing: status indicator (configured/not configured), agent ID `TextInput` field, and setup guidance footer text
- [x] 4.2 Wire the agent ID input to read from and write to the `elevenLabsAgentId` settings field (use `useSettingMutable`)
- [x] 4.3 Show a visual status indicator (e.g., green checkmark or amber warning icon) based on `useIsVoiceConfigured()`
- [x] 4.4 Add setup guidance footer text to the Configuration group explaining the three prerequisites: ElevenLabs account + agent, required client tools (`messageClaudeCode`, `processPermissionRequest`) and dynamic variables (`sessionId`, `initialConversationContext`), and `ELEVENLABS_API_KEY` on the server

## 5. Server — Voice Token Error Response

- [x] 5.1 In `sources/app/api/routes/voiceRoutes.ts`, change the missing-API-key response from `reply.code(400)` to `reply.code(503)` with body `{ allowed: false, error: "Voice not available: set ELEVENLABS_API_KEY on the server" }`
- [x] 5.2 In `sources/sync/apiVoice.ts` on the app side, handle 503 responses explicitly: extract the `error` field and throw an `Error` with that message so it surfaces in the catch block of `startRealtimeSession`
- [x] 5.3 In `sources/realtime/RealtimeSession.ts` catch block, show the server error message via `Modal.alert` rather than a generic message

## 6. Documentation

- [x] 6.1 Add `ELEVENLABS_API_KEY` to the server env var table in `CLAUDE.md` under the dev stack section
- [x] 6.2 Add a "Voice Setup" subsection to `CLAUDE.md` documenting the three prerequisites for self-hosters and the app setting location
