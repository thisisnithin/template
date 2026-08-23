# Full-Stack Effect + Convex Monorepo

## Packages

- `apps/web` — Next.js App Router, React 19, Tailwind v4
- `packages/backend` — the Convex deployment: Confect domains, Better Auth, HTTP routes
- `packages/shared` — schemas used by more than one package (e.g. the `Email` schema)
- `packages/email` — React Email base template

`packages/backend` is a deployable (`convex deploy`), not a library — it lives
under `packages/` because `apps/web` imports its generated refs and types.
Turborepo orders work from the dependency graph, not the folder name.

Cross-package imports: `@app/*` workspace aliases, never relative paths.

## Env Vars

**Two environments, two mechanisms, zero `process.env` in app code.**

- **Web** — `apps/web/src/lib/env.ts` (t3-env + zod), imported as `@/lib/env`.
  Holds the `NEXT_PUBLIC_*` vars. It lives in the app, not in
  `packages/shared`, because nothing else uses it.
- **Backend** — `packages/backend/confect/config.ts`: one `Config.all({...})`
  tree of Effect `Config`. Confect installs `ConvexConfigProvider` for every
  registered function, so `yield* config` resolves inside any impl or service.
  Effect Config rather than t3-env here because it resolves **lazily**: codegen
  evaluates backend modules with an empty environment, so module-load
  validation would break the build.
  - Secrets are `Config.redacted`; optional values are `Config.option` or carry
    a `withDefault`. Every field defaults or is optional, so config can never
    fail at runtime — subtract `ConfigError` with `Effect.orDie` at the impl.
  - `configSync` is for the **plain-Convex boundary only** (`auth.config`,
    Better Auth's `createAuth`, component constructors) — those are invoked by
    the platform, not from an Effect, so there is no ambient provider.
- Backend values are set on the deployment, never in a file:
  `pnpm --filter @app/backend exec convex env set NAME value`. Documented in
  `packages/backend/.env.example`. `CONVEX_SITE_URL` is injected by Convex.
- Adding a var: add it to `confect/config.ts` (backend) or `apps/web/src/lib/env.ts`
  (web), then to the matching `.env.example`.
- `emptyStringAsUndefined: true` on the web side — leave optional vars empty.
- Client env vars need the `NEXT_PUBLIC_*` prefix.

## Stack

- **Effect v4** (pinned RC) — services via `Context.Service<Self>()("Name", { make })`. There is **no auto-generated `.Default`**: declare the layer yourself as `static readonly layer = Layer.effect(Self, Self.make)` and wire deps with `Layer.provide`. `dependencies` no longer exists.
- **One version for the whole ecosystem.** `effect` and every `@effect/*` package share the exact same version — bump them together, never singly. `@effect/platform`, `@effect/rpc`, `@effect/sql` and `@effect/experimental` were **folded into core**; import from `effect/unstable/{http,rpc,sql,…}` and never re-add those packages. `@confect/*` versions are pinned exactly and bumped as a set, in step with `effect`.
- **Backend = Convex via Confect** (`@confect/{core,server,react,cli}`, pinned prerelease on the `next` line). Effect Schema defines tables, args, returns and errors; Convex validators are compiled from them.
  - **Declare** in `<domain>/<domain>.spec.ts`: `GroupSpec.make().addFunction(FunctionSpec.publicQuery({ name, args, returns, error }))`. `args`/`returns`/`error` are **thunks** (`() => Schema…`).
  - **Implement** in `<domain>/<domain>.impl.ts`: `FunctionImpl.make(databaseSchema, group, "name", handler)` → a `Layer`; assemble with `GroupImpl.make(...).pipe(Layer.provide(each), GroupImpl.finalize)`. `finalize` only typechecks once **every** declared function has an impl.
  - Variants: `publicQuery`/`internalQuery`/`publicMutation`/`internalMutation`/`publicAction`/`publicNodeAction`/`publicPaginatedQuery`.
  - **`confect codegen` owns the whole `convex/` directory** except `convex.config.ts` and `tsconfig.json`. Never hand-write or hand-edit files there. `confect/http.ts` → `convex/http.ts`; `confect/auth.ts` → `convex/auth.config.ts`; `confect/tables/*` → the schema.
  - **Generated output is committed** (`confect/_generated`, `convex/`), matching Convex's and confect's own guidance: the repo typechecks on a fresh clone without running codegen. Regenerate with `pnpm codegen` (`convex codegen && confect codegen`) and commit the diff.
  - **Codegen evaluates the module graph.** No side effects or `throw`s at module load anywhere under `confect/`, or codegen fails.
- **Client state**: `useQuery`/`useMutation`/`useAction`/`usePaginatedQuery` from `@confect/react`, addressed by generated refs (`refs.public.<dir>.<leaf>.<fn>`). Branch with `QueryResult.match({ onLoading, onSuccess, onFailure })`. Convex pushes updates — no polling, no cache invalidation.
- **DB**: Convex documents. `DatabaseReader`/`DatabaseWriter` from `confect/_generated/services`; `reader.table("x").index(...).collect()`. Tables are `Table.make(() => Schema.Struct({…}))` in `confect/tables/<name>.ts`, with `.index()`/`.searchIndex()`/`.vectorIndex()`. Filename = table name.
- **Auth**: Better Auth running **inside** Convex via `@convex-dev/better-auth`. Server config in `confect/auth/better-auth.client.ts` (`betterAuth` from `better-auth/minimal`, `convex({ authConfig })` plugin last). Client: `createAuthClient` + `convexClient()` from `@convex-dev/better-auth/client/plugins`; `authClient.useSession()`. Next.js helpers (`getToken`, `isAuthenticated`, `handler`, `preloadAuthQuery`) come from `convexBetterAuthNextJs` in `apps/web/src/lib/auth-server.ts`. Route guard: `proxy.ts` (`await isAuthenticated()`).
- **UI**: Tailwind v4, shadcn/ui, @tanstack/react-form
- **Payments**: DodoPayments via `@dodopayments/better-auth`
- **AI jobs**: `@convex-dev/workflow` (durable, retryable) + `@convex-dev/agent`; model calls via `@effect/ai` + `@effect/ai-anthropic` inside actions. **AI streaming**: `@convex-dev/persistent-text-streaming`.
- **Convex components** replace hand-rolled infra: `@convex-dev/{resend,r2,rate-limiter,presence,aggregate,crons,migrations}`. Install in `convex/convex.config.ts`, then reach them through `confect/_generated/components`.
- **Email**: `@convex-dev/resend` (durable queue, batching, retries, idempotency) + React Email templates from `@app/email`. Rendering needs Node APIs, so send functions live in a **`GroupSpec.makeNode()`** group using `FunctionSpec.internalNodeAction` — codegen emits `"use node"`. Delivery events hit `/resend-webhook` in `confect/http.ts`. No `RESEND_API_KEY` ⇒ the component runs in test mode (sandbox addresses only).
- **PostHog is the single observability vendor** — analytics, session replay, error tracking and feature flags, on both sides. There is no Sentry.
  - **Backend**: the official `@posthog/convex` component, installed in `convex/convex.config.ts` with its env passed from `defineApp({ env })`, and instantiated once in `confect/analytics/posthog.client.ts`. `capture` / `identify` / `captureException` need a scheduler, so they work in **mutations and actions** (the component batches delivery itself). Feature flags evaluate **locally** and therefore work in **queries** too, given `POSTHOG_PERSONAL_API_KEY`. `POSTHOG_PROJECT_TOKEN` is required by the component — leave it empty to run with analytics inert.
  - **Web**: `posthog-js` with `capture_exceptions: true` in `instrumentation-client.ts` (browser errors), `posthog-node` in `instrumentation.ts` via `onRequestError` (SSR / route handlers / middleware), and `posthog.captureException` in the error boundary.
  - **Attribution comes from log annotations, never from threading a user through call signatures.** `RequireUser` annotates every authenticated request with `userId` / `userEmail`; the reporting middleware reads `References.CurrentLogAnnotations` and turns `userId` into `distinctId`, with the remaining annotations becoming event properties. Add context with `Effect.annotateLogs({ … })` and it lands on the report automatically.
  - The browser identifies on login (`identifyUser`). The backend never calls `identify` — server-truth person properties ride on an event you are already emitting via `properties: { $set: { … } }`.
- **`fetch` works in actions only.** Queries and mutations throw `Can't use fetch() in queries and mutations`, so anything needing the network is an action. This is also why **failures cannot self-report**: catching in a mutation and scheduling a report rolls back with the failed transaction. Uncaught query/mutation errors are visible in the Convex dashboard and `convex logs`; forwarding them automatically needs Convex Pro's PostHog Error Tracking destination.
- **No distributed tracing.** PostHog's is alpha and not wired here. Convex traces its own functions internally.
- **Logs**: Convex captures everything Effect logs; read them in the dashboard or with `convex logs [--prod] [--jsonl]`. Automatic forwarding of *uncaught* function errors, and log streams to Axiom/Datadog/PostHog, need **Convex Pro** (Deployment Settings → Integrations). `apps/web/src/lib/logger.ts` is web-only and must never be imported from `packages/backend`.
- **Custom services in impls**: confect fixes a handler's context to its own services, so app services (`PostHogClient`, SDK clients) are provided **inside** the handler — `Effect.gen(…).pipe(Effect.provide(X.layer))` — not into the `FunctionImpl` layer.

**Prime references** (consult before guessing):

- `.context/effect/` — Effect source
- `.context/accountability/` — example app for architecture + patterns
- Confect: the shipped `src/` inside `node_modules/@confect/*` is the source of truth. `confect.dev` documents the **older v9/Effect-v3 line** — do not trust it for this codebase. The upstream example app (`rjdellecese/confect`, `apps/example`) is also still on v3.
- Convex + Better Auth: `labs.convex.dev/better-auth` (verify against the installed version; the API moved between 0.9 and 0.12).

## Baseline Rules

- **Effect for all async server logic** — return `Effect`, never `Promise`
- **Strict TS** — zero `any`, `noUncheckedIndexedAccess` on, use `unknown` only at true boundaries
- **TypeScript 7** (native port) with `@effect/tsgo` — the Effect language service plugin for TS 7+. `@effect/language-service` supports only TS 5/6 and will refuse to patch. `pnpm prepare` runs `effect-tsgo patch`.
- **pnpm catalogs** — shared versions in `pnpm-workspace.yaml`, packages use `"catalog:"`
- **Biome only** — no ESLint/Prettier/oxlint. Run `pnpm lint:fix` before committing
- **Much of the below is enforced, not advisory** — `@effect/tsgo` (81 Effect rules, via `tsc`) and Biome already catch `yield* Effect.fail(new X)`, `try/catch` inside `Effect.gen`, v3 APIs in a v4 project, barrel files, `any`, and `!` assertions. Read the gates before re-deriving a rule.
- **Effect diagnostics come from `@effect/tsgo`** (the TS 7 successor to `@effect/language-service`) and surface through `tsc`, including warnings when v3 APIs are used against this v4 project. `pnpm prepare` runs `effect-tsgo patch --typescript`.
- **Verify after changes** — `pnpm typecheck` + `pnpm lint`
- **Error logging** — `Effect.logError('Failed to X', Cause.fail(error))`; Cause is the 2nd param. Same for `logFatal`
- **Layer naming** — v4 convention: the primary layer is `layer`, variants get descriptive suffixes (`layerNoDeps`, `layerTest`). No `Live`/`Default` suffix. Composite app layers stay descriptive: `Base`, `Handlers`, `RpcLayer`
- **No `React.` namespace** — named imports only: `import { useState, type ReactNode } from "react"`

## Domain Layout (`packages/backend/confect/`)

**Everything is a domain.** One directory per domain, directly under `confect/`.

```
confect/
  <name>/
    <name>.spec.ts         # declare: GroupSpec + FunctionSpecs (args/returns/error)
    <name>.impl.ts         # implement: FunctionImpl.make → Layer, GroupImpl.finalize
    <name>.types.ts        # branded IDs, value objects, Schema.Class — the vocabulary, ONCE
    <name>.errors.ts       # canonical TaggedErrors, ONCE (one tag per concept)
    <name>.service.ts      # business logic — only when an impl outgrows itself
    <name>.utils.ts        # pure helpers — only if genuinely needed
    <sdk-name>.client.ts   # third-party SDK wrapper (Client suffix on class)
  tables/<table>.ts        # one Table.make per file; filename = table name
  auth.ts                  # Convex JWT provider config (codegen → convex/auth.config.ts)
  http.ts                  # HTTP router (codegen → convex/http.ts)
```

- **Only `<name>.spec.ts` / `<name>.impl.ts` are codegen leaves.** Every other file in a
  domain directory is invisible to codegen — which is exactly why domain internals
  (types, errors, middleware, SDK clients) live beside them freely.
- **The directory and the leaf both become path segments**: `confect/profile/profile.spec.ts`
  → `refs.public.profile.profile.getProfile`, Convex path `profile/profile:getProfile`.
  Adding a `domains/` wrapper would add a third segment — don't.
- **A spec with no sibling impl is a codegen error.** They ship together.
- `errors.ts` at `confect/` root = shared errors only (401, 500)
- File naming is `<name>.<type>.ts`; SDK wrappers use the SDK name: `better-auth.client.ts`
- Dependency direction is transport → domain: types, errors and services never import spec modules

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

- Every error is a `Schema.TaggedError` in `<name>.errors.ts`: tag **`@<domain>/Name`** (non-domain errors: `@<package>/Name`, e.g. `@auth/UnauthorizedError`), **branded payload fields**, a `get message()`, an exported `is` guard, causes wrapped with `Schema.Defect()` (a **call** in v4). The prefix is mandatory — it's the runtime `_tag` identity and a bare tag can collide with third-party tags. Applies to **service keys too** (`@<domain>/XService`).
- **One tag per concept — never split on data shape.** "Profile not found" is one tag whether looked up by id, slug, or email; carry identifiers as **optional** fields and let `get message()` adapt. Never mint `…ById`/`…BySlug` variants.
- **One canonical owner per concept** server-wide — defined in one `<name>.errors.ts`, imported elsewhere; never re-mint per domain.
- Genuinely different failures stay **distinct tags** so `catchTag` discrimination holds. Never use generic errors (`NotFoundError`, `InternalError`) for domain failures — those are last-resort fallbacks only.
- **Client-visible errors are exactly the ones in the spec's `error` thunk.** Declare an error there and the frontend can branch on its `_tag`; leave it out and `Effect.orDie` it, so it becomes a defect and a logged 500.
- `Effect.fail` semantics: domain errors for recoverable failures; `Effect.die`/`dieMessage` for impossible-state invariants. Never swallow.

**Shrink unions by subtraction, not wrapping.** An error belongs in a signature **iff the client will branch on it**. Everything else **leaves the channel** via `Effect.orDie` (→ defect → logged 500):

- **Subtract infra errors** (external SDKs, Convex read/write failures) at the impl or service boundary: `yield* something.pipe(Effect.orDie)`.
- **Never `orDie` a domain error** — an unmapped `*NotFoundError` is a handler bug (should be 4xx), not a 500.
- `mapError` only re-domains a foreign failure into a _recoverable_ concept a handler branches on — never to collapse a union to "shorten" it.
- **Prefer exhaustiveness for closed sets:** `Match.value(e).pipe(Match.tag(...), Match.exhaustive)` so a new case is a compile error, not a silent 500.

## Data Access

Convex documents replace the repository layer — `ctx.db` **is** the repository, so
there is no `<name>.repository.ts` and no hand-written query layer.

- **`DatabaseReader` / `DatabaseWriter`** from `confect/_generated/services` are the
  only way to touch data. Yield them inside an impl; never reach for a raw ctx to query.
- **Mutations are transactions.** A Convex mutation is already atomic across every
  write it makes — no `withTransaction`, no savepoints, no "did the caller open one?".
  Actions are **not** transactional: they may call external APIs, and must do their
  writes by scheduling/calling mutations.
- **Never do network I/O in a query or mutation.** That is what actions are for.
- **Index, don't scan.** Declare indexes on the table and read through
  `.index("by_x", ...)`; a `.collect()` over an unindexed table is a full scan.
- **One query shape per intent.** Don't mint a second function because you want
  fewer fields — return the superset, project at the call site.
- **A scoping id is a protection — keep it required.** Tenancy/owner ids stay
  mandatory arguments; optional params are for genuine filters only.
- Build domain models **inline** per function; never return raw docs from a service.

## Service (`<name>.service.ts`)

- A `Context.Service` yielding other services and the generated DB services.
- Add one **only when an impl outgrows itself** — a single-call impl needs no service.
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
- **Spans:** Convex traces functions itself, so impls need no manual span; service methods, middleware and clients use `Effect.fn("<Domain>.<method>")()`.
- **Taste override:** a clear ternary or single `if` guard beats `Option`/`Match` ceremony — prefer the version a reader understands fastest.

## Specs & Impls (`<name>.spec.ts`, `<name>.impl.ts`)

- Impls stay thin: pull the current user from middleware, call **one** service method
  (or do the one obvious thing), map the domain model → the declared return schema.
- **Errors declared in the spec's `error` thunk** are the ones the client can branch
  on; they arrive as a `ConvexError` carrying the `_tag`. Everything else should
  `Effect.orDie` at the impl boundary → a defect → logged 500.
- **Middleware**: `MiddlewareSpec.MiddlewareSpec<Self, { provides: X }>()("Key", { error, functionTypes })`
  declares it; `MiddlewareImpl.provides(databaseSchema, Spec, Tag, effect)` implements it.
  Attach with `.middleware(Spec)` on a FunctionSpec, and `Layer.provide` the impl into
  the group. Auth lives in `confect/auth/auth.middleware{,.layer}.ts`.
- **Spans**: service methods, middleware and clients use `Effect.fn("<Domain>.<method>")()`.
  Convex traces functions itself, so impls need no manual span.
- **Third-party SDK wrapping** — wrap promise-based clients using the `use` pattern in
  `<sdk-name>.client.ts`.

## Testing (TDD)

- `pnpm test` / `pnpm test:watch` / `pnpm test:verbose`
- Vitest + `@effect/vitest` + `convex-test` against the real local Convex backend. No
  Docker, no testcontainers, no migrations to run.
- Assert the **specific** error tag (`Effect.result`, then `result.failure._tag === "@profile/ProfileNotFoundError"` — `Result` uses `_tag: "Failure"` + `.failure`) and **explicit collection lengths**.
- Mock only **external** services; never mock the database — Convex's local backend is the real thing.
- **TDD workflow**: write test (red) → implement (green) → refactor. Run `pnpm test` after changes.

## Hosting & Local Dev

- **Vercel** (`apps/web`) + **Convex Cloud** (`packages/backend`). No database, no
  container, no Postgres to operate.
- `vercel.json` runs `pnpm build:vercel`: confect codegen → `convex deploy --cmd '<next build>'`,
  so the backend is pushed and `NEXT_PUBLIC_CONVEX_URL` is injected before the web build.
- **Local dev is fully offline and account-free.** `pnpm setup:local` provisions a local
  Convex deployment via `CONVEX_AGENT_MODE=anonymous` (no login), mirrors its URLs into
  `apps/web/.env`, and sets the deployment's secrets. Then `pnpm dev` runs
  `next dev` + `convex dev` + `confect dev` together.
- Only the initial provisioning needs `CONVEX_AGENT_MODE=anonymous`; afterwards plain
  `convex dev` picks up the local deployment.
- Convex dashboard: `pnpm --filter @app/backend exec convex dashboard`.
- `pnpm setup:seed` creates a signed-in-able dev user (`dev@example.com` / `password12345`) through Better Auth's real sign-up endpoint; override with `SEED_EMAIL` / `SEED_PASSWORD` / `SEED_NAME`. It is idempotent.
