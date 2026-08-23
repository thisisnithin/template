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
- Client env vars need the `NEXT_PUBLIC_*` prefix; wrap secrets with `Redacted.make()`

## Stack

- **Effect v4** (pinned RC) — services via `Context.Service<Self>()("Name", { make })`. There is **no auto-generated `.Default`**: declare the layer yourself as `static readonly layer = Layer.effect(Self, Self.make)` and wire deps with `Layer.provide`. `dependencies` no longer exists.
- **One version for the whole ecosystem.** `effect` and every `@effect/*` package share the exact same version — bump them together, never singly. `@effect/platform`, `@effect/rpc`, `@effect/sql` and `@effect/experimental` were **folded into core**; import from `effect/unstable/{http,rpc,sql,cluster, reactivity,…}` and never re-add those packages.
- **RPC**: `Rpc.make()` + `RpcGroup.make()` (declare) → `.toLayer()` (implement) → `RpcServer.layerHttp({ group, path, protocol: "http" })` + `HttpRouter.toWebHandler()` (mount). `protocol: "http"` is **required** — `layerHttp` mounts a websocket route by default. Client keys are **flat**: `client["health.check"]()`, not `client.health.check()`.
- **Client state**: `AtomRpc.Service` from `effect/unstable/reactivity` (`AsyncResult`, not `Result`); React bindings from `@effect/atom-react`
- **DB**: Drizzle v1 + its **native** Effect integration, `drizzle-orm/effect-postgres` (`PgDrizzle.makeWithDefaults()`). `@effect/sql-drizzle` is dead — it has no v4 release.
- **Auth**: Better Auth — `authClient.useSession()`, route guard: `proxy.ts`
- **UI**: Tailwind v4, shadcn/ui, @tanstack/react-form
- **Payments**: DodoPayments via `@dodopayments/better-auth`
- **AI jobs**: @effect/ai + @effect/ai-anthropic (cluster); **AI streaming**: Vercel AI SDK
- **Workflows**: `effect/unstable/cluster` + `SqlMessageStorage`
- **Email**: React Email + Resend; **Analytics**: PostHog

**Prime references** (consult before guessing):

- `.context/effect/` — Effect source
- `.context/drizzle-orm/` — Drizzle v1 + its Effect integration (atom now lives in `.context/effect/packages/atom` + `effect/unstable/reactivity`)
- `.context/accountability/` — canonical example app for architecture + patterns

## Baseline Rules

- **Effect for all async server logic** — return `Effect`, never `Promise`
- **Strict TS** — zero `any`, `noUncheckedIndexedAccess` on, use `unknown` only at true boundaries
- **TypeScript 7** (native port) with `@effect/tsgo` — the Effect language service plugin for TS 7+. `@effect/language-service` supports only TS 5/6 and will refuse to patch. `pnpm prepare` runs `effect-tsgo patch`.
- **pnpm catalogs** — shared versions in `pnpm-workspace.yaml`, packages use `"catalog:"`
- **Biome only** — no ESLint/Prettier/oxlint. Run `pnpm lint:fix` before committing
- **Effect diagnostics come from `@effect/tsgo`** (the TS 7 successor to `@effect/language-service`) and surface through `tsc`, including warnings when v3 APIs are used against this v4 project. `pnpm prepare` runs `effect-tsgo patch --typescript`.
- **Verify after changes** — `pnpm typecheck` + `pnpm lint`
- **No `try/catch`/`throw`** — `Effect.try`, `Effect.catchTag`, typed errors (except `unsafe*` pure helpers)
- **Error logging** — `Effect.logError('Failed to X', Cause.fail(error))`; Cause is the 2nd param. Same for `logFatal`
- **Layer naming** — v4 convention: the primary layer is `layer`, variants get descriptive suffixes (`layerNoDeps`, `layerTest`). No `Live`/`Default` suffix. Composite app layers stay descriptive: `Base`, `Handlers`, `RpcLayer`
- **No re-export barrels / `index.ts`** — import directly from the defining module
- **No `React.` namespace** — named imports only: `import { useState, type ReactNode } from "react"`

## Domain Layout (`packages/server/src/domains/`)

**Everything is a domain.** All server code lives under `domains/<name>/` — RPC endpoints, services, repositories, AND third-party SDK wrappers (`domains/auth/`, `domains/payments/`). No separate `services/` or `clients/` folder.

```
domains/<name>/
  <name>.types.ts        # branded IDs, value objects, Schema.Class/Struct — the domain's vocabulary, ONCE
  <name>.errors.ts       # canonical TaggedErrors for the domain, ONCE (one tag per concept)
  <name>.rpc.ts          # RPC definitions + router
  <name>.handler.ts      # thin RPC implementations
  <name>.service.ts      # business logic — composes repositories
  <name>.repository.ts   # DB access — the ONLY place that imports @app/db
  <name>.utils.ts        # pure helpers — only if genuinely needed
  <sdk-name>.client.ts   # third-party SDK wrapper (Client suffix on class)
```

- `errors.ts` at `src/` root = shared RPC errors only (401, 500)
- File naming is `<name>.<type>.ts`; SDK wrappers use the SDK name: `better-auth.client.ts`
- Pure helpers (classification/parsing/calculation) go in `<name>.utils.ts`; row→domain and domain→wire mapping stays **inlined** (no shared `toDomain`/`toWire`)
- Dependency direction is transport → domain: domain code (types, errors, service, repository) never imports RPC modules

## Types & Schema

- **Brand every ID — no raw `string`/`number` ID in any signature.** Pair each with `type X = typeof X.Type`, `{ identifier, title, description }` annotations, and `isX = Schema.is(X)`:
  ```ts
  export const ProfileId = Schema.String.pipe(
    Schema.check(Schema.isUUID()),
    Schema.brand("ProfileId"),
    Schema.annotate({
      identifier: "ProfileId",
      title: "Profile ID",
      description: "…",
    })
  );
  export type ProfileId = typeof ProfileId.Type;
  export const isProfileId = Schema.is(ProfileId);
  ```
- **Base schema by origin — this prevents runtime crashes.** A UUID-branded `.make()` _validates_ and throws on a non-UUID. Brand **our own** ids over `Schema.String.check(Schema.isUUID())` (v4 removed `Schema.UUID`); brand **foreign / external-system** ids (payment provider, OAuth, webhook ids…) over `Schema.String` (or `Schema.Number` for numeric external ids) — never with a UUID check, because the value isn't ours. `.make()` is called only at the boundary where the raw value first enters (external API response, webhook body, decoded rpc payload, repo row→domain). A foreign id shared across providers is branded **once** at the domain root, not per provider.
- **`Schema.Class` vs `Schema.Struct` — by behavior, not by layer.** `Class` for entities/value objects (identity, invariants, behavior). `Struct` for behaviorless projections (list/report results, DB-row shapes, rpc-adjacent params). **Guard rule:** branded IDs, `Schema.Literal` enums, and `Class` get an `is*`; plain `Struct` projections get `type` only.
- **Optionals are `Schema.OptionFromNullOr(...)` → `Option<T>`** — never `Schema.optional`, never `null`/`undefined` on a domain field. Branch with `Option.match`/`Option.isSome`. `null` is allowed **only** in the wire DTO.
- **One type per concept — consolidate near-duplicates with `Option`.** The domain model is the single currency shared by repo ↔ service ↔ handler; don't mint a type per projection or per layer. Same-concept shapes with more/fewer fields → **one** superset model with absent fields as `Option.none()`.
- **Share one input param type** between a service method and the repo method it calls when the shape is identical. The one accepted extra representation is the **wire DTO** (`null`/plain ids); domain→wire mapping in the handler is the single boundary — add no further layers.
- **Naming:** full entity = bare concept name (`Profile`); minimal projection / repo-return contract = `…Ref` suffix (`ProfileRef = { id, slug }`).
- **Enums** = `Schema.Literal(...)` + annotations + `type` + `is`. Transition rules are exported predicates or `Class` getters next to the model.
- **`Schema.decodeUnknownEffect` only at boundaries** (rpc payloads, webhook bodies, external responses) — v4 renamed the effectful decoders with an `Effect` suffix; wrap with `Effect.mapError(() => new InvalidXError({ … }))`.

## Errors

- Every error is a `Schema.TaggedError` in `<name>.errors.ts`: tag **`@<domain>/Name`** (non-domain errors: `@<package>/Name`, e.g. `@server/UnauthorizedError`), **branded payload fields**, a `get message()`, an exported `is` guard, causes wrapped with `Schema.Defect()` (a **call** in v4). The prefix is mandatory — it's the runtime `_tag` identity and a bare tag can collide with third-party tags. Applies to **service & repository keys too** (`@<domain>/XService`, `…/XRepository`).
- **Directly yieldable** — `yield* new MyError({ field })`, never `yield* Effect.fail(new MyError(...))`.
- **One tag per concept — never split on data shape.** "Profile not found" is one tag whether looked up by id, slug, or email; carry identifiers as **optional** fields and let `get message()` adapt. Never mint `…ById`/`…BySlug` variants.
- **One canonical owner per concept** server-wide — defined in one `<name>.errors.ts`, imported elsewhere; never re-mint per domain.
- Genuinely different failures stay **distinct tags** so `catchTag` discrimination holds. Never use generic errors (`NotFoundError`, `InternalError`) for domain failures — those are last-resort fallbacks only.
- **`RpcError` tagging** — errors handled on the frontend get `readonly [RpcError] = true as const` (from `src/errors.ts`) and go in `Rpc.make()`'s `error` field. Programmer errors get neither — `catchRest` converts them to `InternalError`.
- `Effect.fail` semantics: domain errors for recoverable failures; `Effect.die`/`dieMessage` for impossible-state invariants. Never swallow.

**Shrink unions by subtraction, not wrapping.** An error belongs in a method's signature **iff a handler will `catchTag` it**. Everything else **leaves the channel** via `Effect.orDie` (→ defect → `catchRest` → logged 500):

- **Subtract infra errors** (`SqlError`, external SDKs) **at the service boundary** — at the repo call site (`yield* repo.find(...).pipe(Effect.orDie)`) or around a `sql.withTransaction` whose only failures are infra.
- Repos still **surface `SqlError`**; the _service_ owns the subtraction.
- **Never `orDie` a domain error** — an unmapped `*NotFoundError` is a handler bug (should be 4xx), not a 500.
- `mapError` only re-domains a foreign failure into a _recoverable_ concept a handler branches on — never to collapse a union to "shorten" it.
- **Prefer exhaustiveness for closed sets:** `Match.value(e).pipe(Match.tag(...), Match.exhaustive)` so a new case is a compile error, not a silent 500.

## Repository (`<name>.repository.ts`)

- A `Context.Service` yielding the db layer — **the only place `@app/db` / `@effect/sql` imports are allowed** (services get `SqlClient` for `withTransaction` only).
- **One repo per table-cluster/aggregate.** Each query method exists **exactly once**, in the repo owning its **primary table** — judge by primary intent even when it joins others.
- **Fetch generously** — join tables / select extra columns for a richer row; preferred over a service stitching multiple repo calls.
- **Services compose repos** — across aggregates, and even **another domain's repo to read** data it doesn't own; never re-implement that query.
- **Explicit return type on every method `const`.** Methods return `Option` / domain models / typed errors — **never raw rows or wire DTOs**. Build the model **inline** per method. `find*` → `Option` (service maps `None` → domain error); `list*` → `ReadonlyArray`.
- **Query Drizzle natively** — `const [row] = yield* db.select(...)`. Never `Effect.tryPromise`, never wrap in a custom persistence error; the native `SqlError` flows to `catchRest`. The error channel is just `SqlError`.
- **A scoping id is a protection — keep it required.** A tenancy/owner id carried alongside the lookup key is a guard; never demote it to optional to merge methods — **add** the scope to the merged method. Optional params are for genuine _filters_ only.
- **Order methods CRUD** (Create → Read → Update → Delete); the return object lists them in the same order.
- **No caller-provided `Effect`** (no `runInTransaction` params). Within-repo atomicity = `sql.withTransaction(...)` inside one method. Cross-repo atomicity: the **service** yields `SqlClient` and wraps orchestration in `sql.withTransaction(effect)` — a service never queries the db directly.
- **Never assume the caller opened a transaction.** Any method with **≥2 writes** (or delete-then-insert, or a write in a loop) opens its **own** `withTransaction`. It's **reentrant** (nests as a SAVEPOINT), so wrapping is always safe. Never expose a "DB-only core" relying on an ambient tx; never split one operation's writes across two transactions. A single write needs no tx.
- **Never hold a transaction open across external/network I/O.** A tx body is DB writes only — no HTTP/RPC/queue/email calls. Fetch inputs **before** the tx; run side-effects **after** it commits.

### No duplicate queries

**One method per (primary table + filter intent).** Two methods are duplicates if they hit the same table and touch the same rows (or one is a subset). "Different projection / return shape / convenience wrapper" is **not** a reason to keep both. Recurring collapses:

1. **Subset projection** — same table + WHERE, fewer columns → keep the superset.
2. **Data-shape filter split** — two methods differing only by a hard-coded filter → ONE method with an **optional filter param**; branch the `where` on `param === undefined`.
3. **Derivable id/scalar list** — caller does `fuller(...).map(r => r.id)` instead.
4. **insert-vs-upsert** — keep the upsert.
5. **Row-builder wrappers** — ONE generic `insert({ values })`, rows built inline at the call site; a per-item loop becomes one bulk insert.
6. **find-then-act** — `findFirst` then act-by-id → one filtered `delete/update … where (<filter>)`.

## Service (`<name>.service.ts`)

- A `Context.Service` yielding **repos and other services — never the db**.
- Name a repo binding `<domain>Repo` (`const profileRepo = yield* ProfileRepository`).
- Public methods take a **single object param** of branded fields. **Inline the param type in the `const` annotation** — no dangling `*Params`/`*Shape` interface; genuinely-reused value objects live in `<name>.types.ts`. Don't `Schema.decode` params inside a service.
- **Explicit return type on every method `const`** — it is the contract (documents the success/error channel; fails the build if a method leaks a new error):
  ```ts
  const create: (p: CreateProfileParams) =>
    Effect.Effect<Profile, ProfileConflictError> =
    Effect.fn('ProfileService.create')(function* (p) { … });
  ```

## Effect Idioms

`Effect.gen` + `yield*` is the primary tool. Write **flat, sequential** code; reach for `.pipe()`/combinators only for short local transforms. Legibility over purity.

- **No `.pipe()` pyramids** — branch inside the generator with `yield*` + early-return guards. Never nest a `.pipe()` inside another `.pipe()`'s callback.
- **Short pipes are fine** — 1–2 combinators for one transform.
- **Collections:** `Effect.forEach` (`{ concurrency }` when independent) / `all` / `partition` for **effectful** iteration; `effect/Array` for pure data. Don't wrap pure aggregation in `Effect.forEach`.
- **Multi-branch:** `Match.value(x).pipe(…, Match.exhaustive)` over a `switch`/`if-else` chain on a `_tag`/literal, when it reads cleaner.
- **Spans:** handlers use `Effect.fnUntraced(function* () { … }, catchRest)` (RPC auto-attaches spans); service methods, middleware, and clients use `Effect.fn("<Domain>.<method>")()`.
- **v4 `catch*` renames** — `Effect.catchAll` → `Effect.catch`, `catchAllCause` → `catchCause`, `catchAllDefect` → `catchDefect`, `catchSome` → `catchFilter`. `catchTag`/`catchTags`/`catchIf` are unchanged.
- **`Cause` is flat in v4** — `cause.reasons` is an array of `Fail | Die | Interrupt`; there is no `Cause.isEmpty` (use `cause.reasons.length === 0`) and no `Sequential`/`Parallel`.
- No `!` non-null assertions, no needless `let`.
- **Taste override:** a clear ternary or single `if` guard beats `Option`/`Match` ceremony — prefer the version a reader understands fastest.

## Handlers & RPC (`<name>.handler.ts`, `<name>.rpc.ts`)

- Thin: pull current session/context, call **one** service method, map domain model → wire DTO **inline**, map domain errors → rpc errors via `Effect.catchTags`, finish with `catchRest`.
- **RPC naming** — prefix tags with `<domain>.`: `Rpc.make("check")` → `HealthRpcs.prefix("health.")` → `"health.check"`.
- **RPC middleware** — `RpcMiddleware.Tag` with `wrap: true`; middleware provides context via `Effect.provideService()` on `next`.
- **Third-party SDK wrapping** — wrap promise-based clients using the `use` pattern in `<sdk-name>.client.ts`; search existing `*.client.ts` files for reference.

## Testing (TDD)

- `pnpm test` / `pnpm test:watch` / `pnpm test:verbose`
- Vitest + `@effect/vitest` + `@testcontainers/postgresql` (Docker required)
- Testcontainer started **and migrated** once in `vitest.global-setup.ts`, shared via `inject("dbUrl")`. Never migrate from a test file: files run in separate module registries, so an in-process guard cannot serialize them and they race.
- Test utilities in `packages/server/src/test/utils.ts`: `RpcLive`, `MockAuthMiddlewareLayer`, `SharedPgClientLive`, `mockUser`
- Co-located tests: `<name>.handler.test.ts` next to `<name>.handler.ts`
- Use `it.layer(RpcLive)` for scoped tests, `RpcClient.make(AppRouter)` inside `Effect.scoped()` for type-safe requests
- **Real-integration:** tests run against the real testcontainer DB; mock only **external** services via layer overrides. **Do not mock repositories.**
- Assert the **specific** error tag (`Effect.result` — v4 renamed `Either`→`Result`, so there is no `Effect.either` — then `result.failure._tag === '@profile/ProfileNotFoundError'` — `Result` uses `_tag: "Failure"` + `.failure`, not `.left`) and **explicit collection lengths**.
- **TDD workflow**: write test (red) → implement (green) → refactor. Always run `pnpm test` after changes.

## Railway

- `railway.json` — build/deploy config. `scripts/railway-setup.sh` — provisions Postgres + env vars
- `pnpm setup:railway [project-name]` — one-command setup
- New optional integrations: add to setup script or `railway variable set`
