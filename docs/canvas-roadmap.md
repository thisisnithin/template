# Collaborative Learning Canvas — Roadmap

Not built. This records the design and the reasoning so the work can start cold.

The product is a **live collaborative learning surface with AI** — several people on
one canvas, AI generating and streaming content onto it while they work.

## Why the backend alone can't carry it

Convex is the right home for structured, durable, low-write data. It is the wrong
home for canvas edits:

- Every mutation is a billed function call, and every write re-runs the queries
  subscribed to it. Cursor movement and stroke deltas want tens of ops/second/user.
- Concurrent edits to the same object need merge semantics, not last-write-wins.

So the canvas document is a **CRDT**, and CRDTs need a room-affine process. Convex has
no component for this — it is the one piece assembled by hand.

## Three planes

| Plane | Holds | Runs on |
|---|---|---|
| **Structured** | canvases, membership, permissions, invites, course/lesson metadata, progress, streaks, Yjs snapshots | Convex + Confect |
| **Live document** | nodes/cards, positions, strokes, text in blocks, awareness (cursors, selections, presence) | Yjs `Y.Doc`, one per canvas |
| **AI** | course generation, explanations, streamed answers | Convex workflows/actions that join the `Y.Doc` **as a CRDT peer** |

The AI plane is what makes this a learning canvas rather than a whiteboard. An action
opens a connection to the canvas's document and writes tokens in as `Y.Text` deltas, so
generated content materialises on the shared surface for **everyone**, not just the
person who asked. Streaming through Yjs — not Convex mutations — avoids per-token
billing and reactive-query storms, and merges cleanly against concurrent human edits.

For AI text that is *not* on the canvas (chat panes, lesson bodies), use
`@convex-dev/persistent-text-streaming` instead: it streams fast to the reader while
persisting chunks, so reloads and other viewers see the whole response.

## Chosen pieces

- `yjs` — the CRDT
- `y-durable-streams` + `@durable-streams/server` — Yjs over HTTP/SSE with persistence,
  compaction and presence built in. Self-hostable as one service, or Electric Cloud.
- `y-protocols` awareness — cursors and presence
- Renderer: either the **tldraw SDK** with a Yjs store adapter (fastest to a good canvas,
  some friction against its native store) or a **custom** renderer over the `Y.Doc`
  (`react-konva`/SVG — more work, cleanest fit). Pick custom if the primitives are
  cards/text/arrows with light freehand; tldraw if freehand fidelity matters on day one.

Alternatives if you'd rather not run the stream service: **Liveblocks** or **tldraw sync**
(managed, per-MAU), or plain `y-websocket` plus a persistence adapter.

## The seam

Convex is durable truth; the stream is the hot path.

1. Joining a canvas: Convex query authorises the user and returns metadata + the latest
   snapshot id → hydrate a `Y.Doc` from the snapshot → connect to the stream.
2. Debounced snapshot writes push `Y.Doc` state back into Convex storage.
3. Losing the stream service loses liveness, never data — it stays disposable.

Design the schema so canvas objects are discrete and addressable (a row per node, not
one blob) — that keeps the Convex side queryable and lets individual node content
become a CRDT later without an architecture change.

## Auth for the stream

Next.js is the gatekeeper and stays stateless: a route handler authenticates with Better
Auth, checks canvas membership against Convex, then mints/proxies access to that
canvas's stream. Durable Streams is HTTP/SSE, so this can be a plain App Router
streaming route — no custom server, no WebSocket upgrade, and the web tier still scales
to N replicas.

**Do not make the Next.js server the Yjs backend.** It would have to hold documents in
memory, which pins it to a single replica forever and drops every live canvas on each
frontend deploy.

## Hosting

Today: Vercel + Convex. Adding the canvas adds exactly one stateful service.

| Piece | Where | Notes |
|---|---|---|
| Next.js | Vercel | stateless, unchanged |
| Convex | Convex Cloud | unchanged |
| Durable Streams | Fly.io (auto-stop machines) or Railway + volume | the only stateful piece; one replica |

Cloudflare Durable Objects are the better long-term home for room affinity (no idle
cost, an object per canvas) at the price of writing that layer for Workers. Move when a
single process actually becomes the constraint — it's a transport swap, not a rewrite.

## Phases

1. **Canvas domain on Convex** — `confect/canvas/` with tables for canvases, membership
   and snapshots; CRUD + authz + reactive list. No CRDT yet.
2. **Document plane** — a `packages/canvas` package: `Y.Doc` schema, the
   `y-durable-streams` provider, awareness, and the renderer. Stream service in
   `docker-compose.yml` for local dev.
3. **Snapshots** — debounced persistence into Convex, hydrate-on-join.
4. **AI as peer** — Convex workflow/action that joins the doc and streams into it.

Phase 1 is independent of every transport decision, so it can start immediately.
