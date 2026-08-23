# Full-Stack Effect + Convex Monorepo Template

Next.js + Convex, with Effect all the way through the backend via
[Confect](https://github.com/rjdellecese/confect).

## Setup

```bash
pnpm setup:local   # local Convex deployment (no account), env wiring, secrets
pnpm dev           # next dev + convex dev + confect dev
pnpm setup:seed    # dev@example.com / password12345
```

Local development is fully offline: no cloud account, no Docker, no database to run.

## Layout

| Path | What |
| --- | --- |
| `apps/web` | Next.js App Router, React 19, Tailwind v4, shadcn/ui |
| `packages/backend` | the Convex deployment — Confect domains, Better Auth, HTTP routes |
| `packages/shared` | env validation (t3-env), shared schemas |
| `packages/email` | React Email templates |

`packages/backend/confect/` is the source; `packages/backend/convex/` is generated
and committed. Write code in the former, never the latter.

## Commands

```bash
pnpm dev            # everything, watched
pnpm codegen        # regenerate confect/_generated + convex/
pnpm typecheck      # tsc across the workspace
pnpm test           # vitest + convex-test
pnpm lint:fix       # biome via ultracite
pnpm deploy:backend # convex deploy
```

Convex dashboard: `pnpm --filter @app/backend exec convex dashboard`

## Env

- **Web** — `apps/web/.env`, validated by `apps/web/src/lib/env.ts` (t3-env)
- **Backend** — set on the Convex deployment, declared in
  `packages/backend/confect/config.ts` (Effect `Config`):
  `pnpm --filter @app/backend exec convex env set NAME value`.
  See `packages/backend/.env.example` for the full list.

## Deploy

Vercel builds via `pnpm build:vercel`, which runs codegen, `convex deploy`, then
`next build` with `NEXT_PUBLIC_CONVEX_URL` injected. Set
`NEXT_PUBLIC_CONVEX_SITE_URL` and `CONVEX_DEPLOY_KEY` in the Vercel project.

## Docs

- `.claude/CLAUDE.md` — architecture rules and conventions (read before writing code)
