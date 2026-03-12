## 1. Fix doctor.ts process detection

- [x] 1.1 Remove `name.includes('happy')` from the `isJoyful` check in `packages/joyful-cli/src/daemon/doctor.ts`
- [x] 1.2 Replace `cmd.includes('dist/index.mjs')` with `cmd.includes('joyful.mjs')` (built binary path) to avoid matching happy-coder's `dist/index.mjs`
- [x] 1.3 Verify the tsx dev path still works: the existing `cmd.includes('joyful-cli')` check covers `tsx src/index.ts` in the joyful-cli package

## 2. Fix link-dev.cjs

- [x] 2.1 Update `binSource` in `packages/joyful-cli/scripts/link-dev.cjs` from `bin/happy-dev.mjs` to `bin/joyful-dev.mjs`
- [x] 2.2 Update `binTarget` (link name) from `happy-dev` to `joyful-dev`
- [x] 2.3 Update all log/error messages in the script that reference `happy-dev` or `happy` to use `joyful-dev` / `joyful`

## 3. Fix joyful-server package.json

- [x] 3.1 Update `build:standalone` script output from `--outfile dist/happy-server` to `--outfile dist/joyful-server`
- [x] 3.2 Update `repository` field from `https://github.com/slopus/happy-server.git` to `https://github.com/datori/joyful.git`

## 4. Verification

- [x] 4.1 Run `yarn workspace joyful-cli typecheck` to confirm no TypeScript errors in the modified files
