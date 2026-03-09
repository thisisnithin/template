# Full-Stack Effect Monorepo

## Packages
- `apps/web` — Next.js App Router, React 19, Tailwind v4
- `packages/auth` — Better Auth + DodoPayments plugin
- `packages/shared` — multi-package only: env validation (t3-env), shared schemas
- `packages/db` — Drizzle ORM + @effect/sql-pg layers
- `packages/email` — React Email base template
- `packages/server` — Effect RPC server: domains, middleware, handler → Next.js

Cross-package imports: `@app/*` workspace aliases, never relative paths.

## Env Vars
- `apps/web/.env` — all app vars; `packages/db/.env` — `DATABASE_URL` only
- Always import `env` from `@app/shared/env`, never `process.env` (except in `env.ts`, `drizzle.config.ts`)
- Adding vars: update `packages/shared/src/env.ts` (schema + runtimeEnv), `.env.example`, `scripts/railway-setup.sh`
- `emptyStringAsUndefined: true` — leave optional vars empty, no need to comment out

## Effect (v3)
- Services: `Effect.Service<Self>()("Name", { effect, dependencies })` — `Context.Tag` for lightweight tags
- RPC API: `Rpc.make()` + `RpcGroup.make()` (declare) → `.toLayer()` (implement) → `RpcServer.toWebHandler()` (mount)
- Errors: `Schema.TaggedError` — yieldable directly: `yield* new MyError({ field })`
- Workflows: `@effect/experimental` cluster + `SqlMessageStorage`
- Client state: `AtomRpc` from `@effect-atom/atom`
- Secrets: `Redacted.make()`

**Prime references** (consult before guessing):
- `.context/effect/` — Effect source
- `.context/effect-atom/` — AtomRpc / AtomHttpApi
- `.context/accountability/` — canonical example app for architecture + patterns
- WunderGraph Hub (`/Users/nithinkumarb/Work/WunderGraph/hub/apps/backend`) — production RPC patterns

## Other Stack
- **DB**: Drizzle ORM + @effect/sql-drizzle.
- **Auth**: Better Auth — `authClient.useSession()`, route guard: `proxy.ts`
- **UI**: Tailwind v4, shadcn/ui, @tanstack/react-form, @effect-atom/atom-react
- **Payments**: DodoPayments via `@dodopayments/better-auth`
- **AI jobs**: @effect/ai + @effect/ai-anthropic (cluster); **AI streaming**: Vercel AI SDK
- **Email**: React Email + Resend; **Analytics**: PostHog

## Rules - Never Violate
- **Effect for all async server logic** — return `Effect`, never `Promise`
- **Env via `env` object** — never `process.env`. Wrap secrets with `Redacted.make()`
- **`packages/shared` for multi-package code only** — 2+ consumers required
- **Strict TS** — zero `any`, `noUncheckedIndexedAccess` on, use `unknown`
- **pnpm catalogs** — shared versions in `pnpm-workspace.yaml`, packages use `"catalog:"`
- **Error logging** — Always do `Effect.logError('Failed to X', Cause.fail(error))`. Same for `logFatal`. Cause needs to be 2nd param if applicable.
- **No try-catch** — use `Effect.try`, `Effect.catchTag`, `Effect.catchAll`, etc.
- **Biome only** — no ESLint/Prettier. Run `pnpm lint:fix` before committing
- **Layer naming** — no `Live` suffix: `Base`, `Handlers`, `RpcLayer`
- **Client env vars** — `NEXT_PUBLIC_*` prefix
- **Verify after changes** — `pnpm typecheck` + `pnpm lint`
- **File naming** — `<name>.<type>.ts`: `health.rpc.ts`, `health.handler.ts`, `user.service.ts`, `health.atom.ts`. For third-party SDK wrappers use the SDK name: `better-auth.client.ts`, `dodo-payments.client.ts`
- **Everything is a domain** — all server code lives under `domains/<name>/`. This includes RPC endpoints, services, AND third-party SDK wrappers (e.g. `domains/auth/`, `domains/payments/`). There is no separate `services/` or `clients/` folder. Co-locate by domain: `<name>.rpc.ts` (RPC definitions + router), `<name>.handler.ts` (implementations), `<name>.errors.ts`, `<name>.service.ts` (business logic), `<sdk-name>.client.ts` (third-party SDK wrapper). `errors.ts` at root = shared RPC errors only (401, 500)
- **RPC naming** — prefix RPC tags with `<domain>.`: `Rpc.make("check")` → `HealthRpcs.prefix("health.")` → tag becomes `"health.check"`
- **Domain-first errors** — always define typed `Schema.TaggedError` in `<domain>.errors.ts` with relevant context fields. Never use generic errors (`NotFoundError`, `InternalError`) for domain failures — those are last-resort fallbacks only
- **`RpcError` tagging** — errors meant to be communicated to and handled on the frontend must have `readonly [RpcError] = true as const` (import `RpcError` from `../../errors`), and must be added to the `error` field of `Rpc.make()`. Unexpected/programmer errors that should never occur in normal flow must NOT have this tag and must NOT be declared on the RPC — `catchRest` will convert them to `InternalError`
- **`Schema.TaggedError` is directly yieldable** — `yield* new MyError({ field })`, never `yield* Effect.fail(...)`
- **Error tag naming** — prefix `Schema.TaggedError` tags with `@<scope>/`: domain errors use `@<domain>/ErrorName` (e.g. `@profile/ProfileNotFoundError`), non-domain errors use `@<package>/ErrorName` (e.g. `@server/UnauthorizedError`)
- **Use `Effect.fnUntraced`** — RPC auto-attaches spans, so handlers use `Effect.fnUntraced(function* () { ... }, catchRest)`. Service methods, middleware, and clients use `Effect.fn("<Domain>.<method>")()` or `.pipe(Effect.withSpan("<Domain>.<method>"))`
- **RPC middleware** — use `RpcMiddleware.Tag` with `wrap: true` pattern. Middleware provides context via `Effect.provideService()` on `next`
- **Third-party SDK wrapping** — wrap promise-based clients using the `use` pattern in `<sdk-name>.client.ts` with `Client` suffix on class name. Search for existing `*.client.ts` files for reference
- **No `React.` namespace** — use named imports: `import { useState, useEffect, type ReactNode, type ComponentProps } from "react"`, never `React.useState`, `React.ReactNode`, etc.

## Testing (TDD)
- `pnpm test` / `pnpm test:watch` / `pnpm test:verbose`
- Vitest + `@effect/vitest` + `@testcontainers/postgresql` (Docker required)
- Testcontainer started once in `vitest.global-setup.ts`, shared via `inject("dbUrl")`
- Test utilities in `packages/server/src/test/utils.ts`: `RpcLive` (full RPC layer), `MockAuthMiddlewareLayer`, `SharedPgClientLive`, `mockUser`
- Co-located tests: `<name>.handler.test.ts` next to `<name>.handler.ts`
- Use `it.layer(RpcLive)` for scoped tests, `RpcClient.make(AppRouter)` inside `Effect.scoped()` for type-safe requests
- **TDD workflow**: write test (red) → implement (green) → refactor. Always run `pnpm test` after changes

## Railway
- `railway.json` — build/deploy config. `scripts/railway-setup.sh` — provisions Postgres + env vars
- `pnpm railway:setup [project-name]` — one-command setup
- New optional integrations: add to setup script or `railway variable set`
