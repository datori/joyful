## 1. Server Source

- [x] 1.1 In `packages/joyful-server/sources/app/auth/auth.ts`, change both `service: 'handy'` occurrences to `service: 'joyful'`
- [x] 1.2 In `packages/joyful-server/sources/app/auth/auth.ts`, change both `process.env.HANDY_MASTER_SECRET` references to `process.env.JOYFUL_MASTER_SECRET`
- [x] 1.3 In `packages/joyful-server/sources/modules/encrypt.ts`, change `process.env.HANDY_MASTER_SECRET` to `process.env.JOYFUL_MASTER_SECRET`
- [x] 1.4 In `packages/joyful-server/sources/standalone.ts`, update the startup check and help text from `HANDY_MASTER_SECRET` to `JOYFUL_MASTER_SECRET`

## 2. Configuration Files

- [x] 2.1 In `packages/joyful-server/.env.standalone.example`, rename `HANDY_MASTER_SECRET` to `JOYFUL_MASTER_SECRET` and remove the "NOTE: pending rename" comment
- [x] 2.2 In `packages/joyful-server/.env.dev`, rename `HANDY_MASTER_SECRET` to `JOYFUL_MASTER_SECRET`

## 3. Documentation

- [x] 3.1 In `packages/joyful-server/README.md`, update all `HANDY_MASTER_SECRET` references to `JOYFUL_MASTER_SECRET`
- [x] 3.2 In `packages/joyful-cli/src/commands/dev.ts`, update the bootstrap startup hint from `HANDY_MASTER_SECRET` to `JOYFUL_MASTER_SECRET`

## 4. Verify and Build

- [x] 4.1 Run `yarn workspace joyful-server build` to confirm no TypeScript errors
- [x] 4.2 Run `yarn workspace joyful build` to confirm CLI compiles cleanly (hint text change)
