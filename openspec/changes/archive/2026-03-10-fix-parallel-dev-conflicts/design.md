## Context

The joyful CLI daemon doctor (`doctor.ts`) detects "joyful" processes using a broad heuristic that includes `cmd.includes('dist/index.mjs')`. Since both joyful and happy-coder compile to `dist/index.mjs`, this false-positively matches the running happy daemon (`node .../happy-coder/dist/index.mjs daemon start-sync`). `joyful doctor clean` would kill it.

Two dev-tooling scripts also have stale references from the rename: `link-dev.cjs` targets `bin/happy-dev.mjs` (now `bin/joyful-dev.mjs`) and creates a `happy-dev` symlink, and the server's standalone build script outputs `dist/happy-server`.

## Goals / Non-Goals

**Goals:**
- Make `joyful doctor` / `joyful doctor clean` safe to run alongside a happy-coder daemon
- Make `yarn link:dev` work correctly for joyful-dev local development
- Align standalone build artifact name with the joyful identity

**Non-Goals:**
- Changing how the doctor detects joyful processes in any other way
- Modifying the running happy infrastructure

## Decisions

**Doctor detection narrowing**: Remove `name.includes('happy')` from the `isJoyful` check (happy processes are no longer joyful's concern), and replace the too-broad `cmd.includes('dist/index.mjs')` with `cmd.includes('joyful-cli')` or `cmd.includes('joyful.mjs')` which are joyful-specific path fragments. The `cmd.includes('happy-coder')` path fragment would also match the happy daemon — `name.includes('happy')` should simply be dropped since the binary is now named `joyful`.

**link-dev.cjs**: Update the two path constants — `binSource` from `bin/happy-dev.mjs` to `bin/joyful-dev.mjs`, and `binTarget` from `happy-dev` to `joyful-dev`. Update log messages accordingly.

**build:standalone output name**: Change `--outfile dist/happy-server` to `--outfile dist/joyful-server` in the npm script.

**repository URL**: Change `slopus/happy-server.git` to `datori/joyful.git`.

## Risks / Trade-offs

[Narrowing doctor detection] → Any future process that doesn't contain `joyful` in its path/name would be missed. This is acceptable — if joyful is running from source via tsx, the cmd will include `joyful-cli`; if running built, it includes `joyful.mjs`.

[link-dev.cjs messages] → Some commented strings about `happy` remain in context but don't affect functionality. Can update messages for clarity without risk.
