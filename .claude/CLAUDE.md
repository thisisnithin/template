# Full-Stack Effect Monorepo

## Packages
- `apps/web` — Next.js App Router, React 19, Tailwind v4
- `packages/auth` — Better Auth + DodoPayments plugin
- `packages/shared` — multi-package only: env validation (t3-env), shared schemas
- `packages/db` — Drizzle ORM + @effect/sql-pg layers
- `packages/email` — React Email base template
- `packages/server` — Effect HTTP server: domains, middleware, handler → Next.js

Cross-package imports: `@app/*` workspace aliases, never relative paths.

## Env Vars
- `apps/web/.env` — all app vars; `packages/db/.env` — `DATABASE_URL` only
- Always import `env` from `@app/shared/env`, never `process.env` (except in `env.ts`, `drizzle.config.ts`)
- Adding vars: update `packages/shared/src/env.ts` (schema + runtimeEnv), `.env.example`, `scripts/railway-setup.sh`
- `emptyStringAsUndefined: true` — leave optional vars empty, no need to comment out

## Effect (v3)
- Services: `Effect.Service<Self>()("Name", { effect, dependencies })` — `Context.Tag` for lightweight tags
- HTTP API: `HttpApi` + `HttpApiGroup` + `HttpApiEndpoint` (declare) → `HttpApiBuilder` (implement) → `HttpApiBuilder.toWebHandler()` (mount)
- Errors: `Schema.TaggedError` with `HttpApiSchema.annotations({ status })` — yieldable directly: `yield* new MyError({ field })`
- Workflows: `@effect/experimental` cluster + `SqlMessageStorage`
- Client state: `AtomHttpApi` from `@effect-atom/atom`
- Secrets: `Redacted.make()`

**Prime references** (consult before guessing):
- `.context/effect/` — Effect source
- `.context/effect-atom/` — AtomHttpApi
- `.context/accountability/` — canonical example app for architecture + patterns

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
- **Layer naming** — no `Live` suffix: `Base`, `Routes`, `ApiLayer`
- **Client env vars** — `NEXT_PUBLIC_*` prefix
- **Verify after changes** — `pnpm typecheck` + `pnpm lint`
- **File naming** — `<name>.<type>.ts`: `health.route.ts`, `user.service.ts`, `health.atom.ts`
- **Domain structure in `packages/server`** — co-locate by domain under `domains/<name>/`: `<name>.route.ts`, `<name>.errors.ts`, `<name>.service.ts` (add service when logic is reused or grows complex). `errors.ts` at root = shared HTTP errors only (401, 500)
- **Domain-first errors** — always define typed `Schema.TaggedError` in `<domain>.errors.ts` with relevant context fields. Never use generic errors (`NotFoundError`, `InternalError`) for domain failures — those are last-resort fallbacks only
- **`ApiError` tagging** — errors meant to be communicated to and handled on the frontend must have `readonly [ApiError] = true as const` (import `ApiError` from `../../errors`), must use `HttpApiSchema.annotations({ status })`, and must be added via `.addError()` on the endpoint in the group file. Unexpected/programmer errors that should never occur in normal flow must NOT have this tag, must NOT use `HttpApiSchema.annotations`, and must NOT be declared in the group — `catchRest` will convert them to `InternalError`
- **`Schema.TaggedError` is directly yieldable** — `yield* new MyError({ field })`, never `yield* Effect.fail(...)`
- **Error tag naming** — prefix `Schema.TaggedError` tags with `@<scope>/`: domain errors use `@<domain>/ErrorName` (e.g. `@profile/ProfileNotFoundError`), non-domain errors use `@<package>/ErrorName` (e.g. `@server/UnauthorizedError`)
- **Always use `Effect.fn("spanName")()`** — every route handler, service method, and utility must use `Effect.fn("name")()` with a span name for tracing. `HttpApiBuilder.handle` does NOT auto-attach spans. Naming: routes `"<domain>.<action>"`, services `"ServiceName.methodName"`, middleware uses `.pipe(Effect.withSpan("middleware.<name>"))`

## Testing (TDD)
- `pnpm test` / `pnpm test:watch` / `pnpm test:verbose`
- Vitest + `@effect/vitest` + `@testcontainers/postgresql` (Docker required)
- Testcontainer started once in `vitest.global-setup.ts`, shared via `inject("dbUrl")`
- Test utilities in `packages/server/src/test/utils.ts`: `HttpLive` (full API layer), `MockAuthMiddlewareLayer`, `SharedPgClientLive`, `mockUser`
- Co-located tests: `<name>.route.test.ts` next to `<name>.route.ts`
- Use `it.layer(HttpLive)` for scoped tests, `HttpApiClient.make(AppApi)` for type-safe requests
- **TDD workflow**: write test (red) → implement (green) → refactor. Always run `pnpm test` after changes

## Railway
- `railway.json` — build/deploy config. `scripts/railway-setup.sh` — provisions Postgres + env vars
- `pnpm railway:setup [project-name]` — one-command setup
- New optional integrations: add to setup script or `railway variable set`
