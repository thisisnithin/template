# Project: Full-Stack Effect Monorepo Template

## Quick Commands

```
pnpm dev              # start dev server
pnpm build            # build all packages
pnpm lint             # lint (ultracite check)
pnpm lint:fix         # auto-fix lint issues
pnpm typecheck        # type-check all packages
pnpm infra:up         # start local postgres
pnpm infra:down       # stop local postgres
pnpm infra:down-v     # stop and wipe volumes
pnpm db:generate      # generate drizzle migrations
pnpm db:migrate       # apply drizzle migrations
pnpm railway:setup    # provision Railway project (Postgres + env vars)
```

## Architecture

Turborepo + pnpm workspaces monorepo. Shared versions pinned via pnpm catalogs in `pnpm-workspace.yaml`.

```
apps/web          Next.js (App Router, React 19, Tailwind v4)
packages/auth     Better Auth config + DodoPayments plugin
packages/shared   Only for code used across multiple packages — env validation (t3-env), shared schemas
packages/db       Drizzle ORM schema + Effect SQL layers
packages/email    React Email base template
packages/server   Effect HTTP server — routes, layers, handler mounted to Next.js
```

Cross-package imports use `@app/*` workspace name, never relative paths.

### Env vars

Per-package `.env` files (Turborepo convention). See `.env.example` in each.
- `apps/web/.env` — all app env vars
- `packages/db/.env` — just `DATABASE_URL`

Always use the `env` object from `@app/shared/env` — never `process.env` directly (except in `env.ts` itself and `drizzle.config.ts`). `emptyStringAsUndefined: true` is set in t3-env, so optional vars can be left empty (no need to comment them out). When adding new env vars, add them to `packages/shared/src/env.ts` (both the schema and `runtimeEnv` block), the relevant `.env.example`, and `scripts/railway-setup.sh`.

## Tech Stack

### Effect (v3) — Core Runtime

| Need                                 | Use                                                                                                 |
|--------------------------------------|-----------------------------------------------------------------------------------------------------|
| **Services & dependency injection**  | `Effect.Service` pattern (Effect v3) — or `Context.Tag` for lightweight tags                        |
| **HTTP API (schema-first)**          | `HttpApi` + `HttpApiGroup` + `HttpApiEndpoint` for declaration, `HttpApiBuilder` for implementation |
| **HTTP handler**                     | `HttpApiBuilder.toWebHandler()` to create a web-compatible handler from layers                      |
| **Durable workflows & delayed jobs** | `@effect/experimental` cluster + `SqlMessageStorage` backed by Postgres                             |
| **Typed schemas & validation**       | `Schema` from `effect` — used locally where needed (e.g., `api.ts`, `auth-dialog.tsx`, `email.ts`)  |
| **Error handling**                   | Typed errors via `Effect.fail`, never throw raw errors in services                                  |
| **Resource management**              | `Layer` composition, `Effect.acquireRelease`                                                        |
| **Concurrency**                      | `Effect.fork`, `Effect.all`, `Fiber`                                                                |
| **Sensitive config**                 | `Redacted.make()` for secrets in Effect layers                                                      |
| **Reactive client state**            | `AtomHttpApi` from `@effect-atom/atom` for type-safe API atoms                                      |

**Service definition:**
```ts
class MyService extends Effect.Service<MyService>()("MyService", {
  effect: Effect.gen(function* () {
    const db = yield* Db
    const doThing = Effect.fn("doThing")(function* (input: string) {
      return yield* db.query(input)
    })
    return { doThing }
  }),
  dependencies: [Db.Default],
}) {}
```


**Reference (prime sources — always consult before guessing):**
- `.context/effect/` — Effect source code, the definitive reference for Effect APIs and patterns
- `.context/effect-atom/` — effect-atom source, reference for AtomHttpApi and reactive client state
- `.context/accountability/` — prime example app built on this stack, use as the go-to reference for architecture, patterns, and conventions

Clone these with `pnpm context:clone` (gitignored, not included in repo).

### Other Stack
- **Drizzle ORM** + **@effect/sql-pg** + **@effect/sql-drizzle** — `packages/db`. Auth tables via `npx auth generate`.
- **Better Auth** — `packages/auth`. Client: `authClient.useSession()`. Route guard: `proxy.ts`.
- **Next.js** App Router, **Tailwind CSS v4**, **shadcn/ui**, **@tanstack/react-form**, **@effect-atom/atom-react**
- **DodoPayments** — all payments, subscriptions, and billing. Uses `@dodopayments/better-auth` plugin.
- **AI background jobs** — `@effect/ai` + `@effect/ai-anthropic` (cluster jobs)
- **AI streaming** — Vercel AI SDK: `ai` + `@ai-sdk/anthropic` (server routes)
- **React Email** + **Resend**, **PostHog** (optional)

## Rules — Never Violate

1. **Effect for all async server logic** — services return `Effect`, never raw `Promise`
2. **`Effect.Service` pattern** (v3) — `Effect.Service<Self>()("Name", { effect, dependencies })`. `Context.Tag` for lightweight tags.
3. **All env vars via `env` object** — import from `@app/shared/env`, never `process.env` (except in `env.ts` and `drizzle.config.ts`). Wrap secrets with `Redacted.make()`.
4. **`packages/shared` strictly for multi-package code** — don't put utils here unless imported by 2+ packages
5. **Schema-first API routes** — declare in `api.ts`, implement in `routes/<name>.route.ts`, register in `handler.ts`
6. **Strict TypeScript** — zero `any`, `noUncheckedIndexedAccess` on, use `unknown` for unknowns
7. **pnpm catalogs** — all shared versions in `pnpm-workspace.yaml`, packages use `"catalog:"`
8. **No barrel files** — use granular `exports` in `package.json`
9. **Error logging** — always use `Effect.logError('Failed to do X', Cause.fail(error))`. Pass a human-readable message as first arg, `Cause.fail(error)` as second. Same for `Effect.logFatal`.
10. **No try-catch** — use Effect error combinators (`Effect.try`, `Effect.catchTag`, `Effect.catchAll`, etc.)
11. **Biome only** — no ESLint, no Prettier. Run `pnpm lint:fix` before committing
12. **Layer naming** — descriptive names without `Live` suffix: `Base`, `Routes`, `ApiLayer`
13. **Optional integrations** — guard with `...(env.KEY ? { ... } : {})`
14. **Client env vars** — `NEXT_PUBLIC_*` prefix for browser-exposed vars
15. **Always verify after changes** — run `pnpm typecheck` and `pnpm lint` after making changes to confirm nothing is broken

## File Naming

Use `<name>.<type>.ts` — e.g., `health.route.ts`, `auth.schema.ts`, `user.service.ts`, `health.atom.ts`.

## Ultracite / Biome

Sorted imports, no barrel files, kebab-case filenames, no nested ternaries, no `any`, no non-null assertions, arrow functions for callbacks, `for...of` over `.forEach()`, `const` by default. Namespace imports allowed (needed for Effect).

## Railway Deployment

`railway.json` at repo root defines build/deploy config. `scripts/railway-setup.sh` provisions the full project (Postgres, env vars) via CLI.

```bash
pnpm railway:setup [project-name]   # one-command setup
```

The script sets these env vars using Railway's template syntax:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NEXT_PUBLIC_APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
BETTER_AUTH_SECRET=<auto-generated>
```

When adding new optional integrations (Google OAuth, Dodo Payments, Resend, etc.), also add them to the setup script or set manually via `railway variable set`.

## Setup (New Clone)

1. `pnpm install`
2. `cp apps/web/.env.example apps/web/.env` — fill `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
3. `cp packages/db/.env.example packages/db/.env`
4. `pnpm infra:up` → `pnpm db:migrate` → `pnpm dev`
