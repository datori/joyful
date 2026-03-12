## 1. joyful-app: Rename HappyError → JoyfulError

- [x] 1.1 In `packages/joyful-app/sources/utils/errors.ts`, rename class `HappyError` to `JoyfulError` (class declaration + `Object.setPrototypeOf` reference)
- [x] 1.2 In `packages/joyful-app/sources/hooks/useHappyAction.ts`, update import and usage of `HappyError` → `JoyfulError`
- [x] 1.3 Update `HappyError` → `JoyfulError` in `sources/app/(app)/session/[id]/info.tsx`
- [x] 1.4 Update `HappyError` → `JoyfulError` in `sources/app/(app)/settings/account.tsx`
- [x] 1.5 Update `HappyError` → `JoyfulError` in `sources/app/(app)/friends/index.tsx`
- [x] 1.6 Update `HappyError` → `JoyfulError` in `sources/app/(app)/user/[id].tsx`

## 2. joyful-app: Rename useHappyAction → useJoyfulAction

- [x] 2.1 In `packages/joyful-app/sources/hooks/useHappyAction.ts`, rename the exported hook from `useHappyAction` to `useJoyfulAction`
- [x] 2.2 Update import and usage of `useHappyAction` → `useJoyfulAction` in `sources/app/(app)/session/[id]/info.tsx`
- [x] 2.3 Update import and usage in `sources/app/(app)/settings/account.tsx`
- [x] 2.4 Update import and usage in `sources/app/(app)/friends/index.tsx`
- [x] 2.5 Update import and usage in `sources/app/(app)/user/[id].tsx`
- [x] 2.6 Update import and usage in `sources/components/usage/UsagePanel.tsx`
- [x] 2.7 Update import and usage in `sources/components/ActiveSessionsGroupCompact.tsx`
- [x] 2.8 Update import and usage in `sources/components/ActiveSessionsGroup.tsx`
- [x] 2.9 Update import and usage in `sources/components/SettingsView.tsx`
- [x] 2.10 Update import and usage in `sources/components/SessionsList.tsx`

## 3. joyful-cli: Rename spawnHappyCLI → spawnJoyfulCLI

- [x] 3.1 In `packages/joyful-cli/src/utils/spawnHappyCLI.ts`, rename the exported function from `spawnHappyCLI` to `spawnJoyfulCLI`
- [x] 3.2 Rename the file `src/utils/spawnHappyCLI.ts` → `src/utils/spawnJoyfulCLI.ts`
- [x] 3.3 Update import and usage in `src/daemon/run.ts`
- [x] 3.4 Update import and usage in `src/daemon/controlClient.ts`
- [x] 3.5 Update import and usage in `src/daemon/daemon.integration.test.ts`
- [x] 3.6 Update import and usage in `src/index.ts`

## 4. joyful-server: Deployment config and DB name

- [x] 4.1 Rename `packages/joyful-server/deploy/handy.yaml` → `deploy/joyful.yaml`
- [x] 4.2 Inside `deploy/joyful.yaml`, update K8s resource name (`handy-server` → `joyful-server`), image path (`handy-server` → `joyful-server`), and all `secretRef.name` and secret key paths (`handy-*` → `joyful-*`)
- [x] 4.3 In `packages/joyful-server/package.json`, update the `db` script: `POSTGRES_DB=handy` → `POSTGRES_DB=joyful`

## 5. Documentation

- [x] 5.1 In `packages/joyful-cli/README.md`, update `HAPPY_SERVER_URL`, `HAPPY_WEBAPP_URL`, `HAPPY_HOME_DIR` → `JOYFUL_*` in all env var references; fix install command and any `happy` CLI command examples
- [x] 5.2 In `packages/joyful-cli/CONTRIBUTING.md`, fix all `~/.happy`, `~/.happy-dev` path references → `~/.joyful`, `~/.joyful-dev`; fix clone URL and setup instructions
- [x] 5.3 In `packages/joyful-cli/CLAUDE.md`, fix title "Happy CLI Codebase Overview" → "Joyful CLI Codebase Overview"; fix `~/.handy/access.key` → `~/.joyful/access.key` and any other old name references
- [x] 5.4 In `packages/joyful-server/CLAUDE.md`, fix title "Handy Server - Development Guidelines" → "Joyful Server - Development Guidelines" and "Happy Server project" → "Joyful Server project"
- [x] 5.5 In `packages/joyful-cli/src/daemon/CLAUDE.md`, fix any `~/.happy` or `happyHomeDir` example references → `~/.joyful` / `joyfulHomeDir`
- [x] 5.6 In `packages/joyful-server/README.md`, fix remaining "Happy Server" / "happy-server" references in headings and prose

## 6. Verify

- [x] 6.1 Run `yarn workspace joyful-app typecheck` — must pass with no errors
- [x] 6.2 Run `yarn workspace joyful build` — must pass with no errors
