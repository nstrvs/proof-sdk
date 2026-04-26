# Architecture

Use this file as the L0 rulebook for Proof SDK.

This is an index of how the app works: where ownership lives, how data moves
across modules, and what the public surface is. Treat it as the contract; if
the code drifts, fix the code or update this doc — do not let drift compound.

## 1. Prime Directive

Optimize for an embeddable, agent-friendly collaborative markdown editor:

- keep the SDK boundary clean — packages should be drop-in for downstream apps
- keep document state authoritative on the server, derived everywhere else
- treat marks (comments, suggestions, approvals) as first-class atoms
- keep the live collab path direct browser ↔ Hocuspocus after bootstrap
- keep agent operations idempotent and resumable
- prefer narrow HTTP routes over RPC sprawl

Every architecture change MUST preserve these rules:

- The server owns canonical markdown; the editor owns the live projection.
- Marks are never embedded as raw HTML in markdown — they live in the mark store.
- Yjs updates are the live transport; the canonical document is reconciled from them.
- Agent edits flow through the document engine, never directly into storage.
- Cross-module callers use package exports, not deep paths into `src/` or `server/`.
- Folder layout MUST stay aligned with package boundaries.

## 2. Shape of the Repo

```text
proof-sdk/
  packages/        # public SDK surface (5 workspaces)
    doc-core/        — @proof/core: types, marks, provenance
    doc-editor/      — @proof/editor: editor runtime
    doc-server/      — @proof/server: HTTP routes, collab, document engine
    doc-store-sqlite/— @proof/sqlite: SQLite persistence adapter
    agent-bridge/    — @proof/agent-bridge: agent HTTP client + protocol types
  src/             # web shell + editor implementation (consumed by doc-editor)
    editor/          — Milkdown runtime, schema, 26 plugins
    formats/         — marks, provenance sidecar, remark integration
    bridge/          — bridge HTTP client, share client, marks preservation
    agent/           — agent orchestration, sub-agent, proposals
    ui/              — domain-aware editor UI components
    shared/          — cross-layer types (agent identity, anchors, live markdown)
    analytics/       — telemetry hooks
    tests/           — integration tests (collab, bridge, agent)
    index.html       — web shell entry
  server/          # server implementation (consumed by doc-server)
    index.ts         — Express + WebSocket entry
    routes.ts        — document/op routes
    agent-routes.ts, agent-edit-v2.ts — agent edit paths
    bridge.ts, ws.ts — bridge executor + WebSocket multiplexer
    collab.ts        — Hocuspocus + Yjs runtime
    canonical-document.ts, document-engine.ts — server authority + mutation engine
    db.ts            — SQLite schema and queries
    share-web-routes.ts, snapshot.ts — share landing + OG snapshots
  apps/proof-example — HTTP bridge demo
  snapshots/       — pre-rendered HTML share previews (one per slug)
  dist/            — vite build output
  docs/            — agent contract, provenance spec, ADRs, skill template
  scripts/         — finalize-web-build.mjs (writes manifest)
```

Local development:

- editor: `npm run dev` starts Vite on `http://localhost:3000`
- server: `npm run serve` starts `tsx server/index.ts` on `http://localhost:4000`
- browser `/d/:slug` views opened through the local server redirect to the Vite editor; agents, JSON, markdown, and server routes stay on the server
- no frontend build is required for the local feedback loop

Build:

- frontend: `vite build` over [src/index.html](src/index.html), output to `dist/`
- server: `tsx server/index.ts` at runtime; no build step
- packages: not built; consumed via TypeScript `exports` pointing at `src/`

## 3. Required Modules

Use exactly these target modules. Do not add modules without removing one.

### 3.1 `doc-core` (`@proof/core`)

Put canonical types and pure logic in `doc-core`.

`doc-core` MUST own:

- mark types and mark kinds (`comment`, `suggestion.{insert,delete,replace}`, `approval`)
- provenance sidecar shape
- agent identity normalization (`agent:`, `ai:`, `human:` prefixes)
- anchor target text contract
- live markdown contract (the surface shared between editor and server)
- ordering, color, and resolution rules for marks

`doc-core` MUST NOT own:

- I/O of any kind
- persistence schema
- transport (HTTP, WebSocket, Yjs)
- editor UI
- mutation execution

Rules:

- `doc-core` is leaf; it MUST NOT import any other proof package.
- Other modules import types and pure helpers via `@proof/core`.
- Any new domain noun goes here first, before being used elsewhere.

### 3.2 `doc-editor` (`@proof/editor`)

Put the in-browser editor runtime in `doc-editor`. The implementation lives in
[src/editor/](src/editor) and is re-exported by the package.

`doc-editor` MUST own:

- Milkdown editor instance and lifecycle
- ProseMirror schema extensions (proof marks, suggestion marks, code blocks, frontmatter)
- the 26 editor plugins under [src/editor/plugins/](src/editor/plugins) — collab cursors, agent cursor, mark popover, suggestions, comments, agent presence, find highlights, mermaid, etc.
- y-prosemirror binding for live collab
- mark rendering and decorations
- domain-aware editor UI under [src/ui/](src/ui)

`doc-editor` MUST NOT own:

- canonical document persistence
- HTTP routes
- bridge protocol execution semantics
- network transport beyond y-websocket / HocuspocusProvider

Rules:

- `doc-editor` MUST NOT import `doc-server` or `doc-store-sqlite`.
- Editor reads marks via the mark store; it does not parse marks out of HTML.
- New plugins go under [src/editor/plugins/](src/editor/plugins) with the existing pattern.

### 3.3 `doc-server` (`@proof/server`)

Put HTTP routes, the document engine, and the collab runtime in `doc-server`.
The implementation lives in [server/](server) and is re-exported by the package.

`doc-server` MUST own:

- HTTP routes for documents, ops, edits, presence, events, and bridge
- document engine: precondition checks, revision matching, mutation application ([server/document-engine.ts](server/document-engine.ts))
- canonical document authority ([server/canonical-document.ts](server/canonical-document.ts))
- block-level edit path ([server/agent-edit-v2.ts](server/agent-edit-v2.ts))
- bridge executor: forward HTTP ops to live viewers over WebSocket ([server/bridge.ts](server/bridge.ts))
- WebSocket multiplexer for bridge + Hocuspocus ([server/ws.ts](server/ws.ts))
- Hocuspocus + Yjs collab runtime ([server/collab.ts](server/collab.ts))
- mark rehydration after edits, mark sync between Yjs and canonical
- rewrite policy (live-editor barrier)
- anchor resolution (quote-to-position matching)
- document integrity analysis
- snapshot HTML rendering and share web routes

`doc-server` MUST NOT own:

- editor UI
- agent decision logic (which op to send, when)
- persistence backend internals (those live in `doc-store-sqlite`)

Rules:

- All mutations go through the document engine; nothing bypasses to the store.
- `doc-server` calls `doc-store-sqlite` through its public exports.
- `doc-server` MUST NOT import `doc-editor`.

### 3.4 `doc-store-sqlite` (`@proof/sqlite`)

Put persistence in `doc-store-sqlite`. Implementation lives in [server/db.ts](server/db.ts) and adjacent files.

`doc-store-sqlite` MUST own:

- SQLite schema: `documents`, `document_projections`, `document_y_updates`, `document_y_snapshots`, `document_access`, `mark_tombstones`, `mutation_outbox`, `mutation_idempotency`, `active_collab_connections`, `share_auth_sessions`
- query and write APIs for those tables
- Y-update append log + periodic snapshots
- mutation outbox for broadcast
- idempotency dedup by `(slug, key, route)`

`doc-store-sqlite` MUST NOT own:

- HTTP route handling
- mutation semantics or validation rules
- transport
- mark interpretation (it stores; `doc-server` decides)

Rules:

- The schema is the contract; migrations MUST be additive where possible.
- Other modules read/write only via exported functions.

### 3.5 `agent-bridge` (`@proof/agent-bridge`)

Put the agent-side HTTP client and shared bridge protocol types in `agent-bridge`.

`agent-bridge` MUST own:

- bridge HTTP client (`createAgentBridgeClient`)
- bridge route protocol types (input/output shapes for state, marks, comments, suggestions, rewrite, presence)
- request signing / token header conventions

`agent-bridge` MUST NOT own:

- server-side execution (lives in `doc-server`)
- viewer-side handling (lives in `doc-editor`)
- agent decision logic (that belongs to consumers, e.g. [apps/proof-example](apps/proof-example))

Rules:

- `agent-bridge` MUST NOT import `doc-server` internals.
- Protocol types are shared via this package, not duplicated in `doc-server` or callers.

### 3.6 `app` (root)

Put composition-root work at the repo root.

`app` MUST own:

- server entry [server/index.ts](server/index.ts) — Express setup, port binding, route mounting, WebSocket attachment
- web shell [src/index.html](src/index.html) and bootstrap
- vite config [vite.config.ts](vite.config.ts) and finalize script [scripts/finalize-web-build.mjs](scripts/finalize-web-build.mjs)
- env wiring (`.env`, `PROOF_*` flags)

`app` MUST NOT own:

- domain rules
- persistence schema
- mutation logic
- editor plugin behavior

Rules:

- Nothing imports `app`.
- `app` may import all other modules to wire the product.
- New routes register here; the route handlers live in `doc-server`.

## 4. Required Dependency Direction

Keep this dependency shape:

```text
app
  -> doc-server -> doc-store-sqlite
                -> doc-core
  -> doc-editor -> doc-core
  -> agent-bridge -> doc-core
```

Enforce these import rules:

- Nothing may import `app`.
- `doc-core` imports nothing from other proof packages.
- `doc-editor` MUST NOT import `doc-server` or `doc-store-sqlite`.
- `agent-bridge` MUST NOT import `doc-server` or `doc-editor`.
- `doc-server` MUST NOT import `doc-editor`.
- Cross-module callers MUST use package exports (`@proof/...`), not deep paths.

## 5. Canonical Concepts

Use these concepts as canonical. Do not introduce synonyms without updating
this section.

### 5.1 Document

```ts
{ slug, docId, title, markdown, revision, ownerId, shareState }
```

- `slug` — public identifier; appears in URLs and snapshot filenames
- `revision` — monotonically increasing; required as edit precondition
- `shareState` — `ACTIVE` | `PAUSED` | `REVOKED` | `DELETED`

Rules:

- Markdown in `documents.markdown` is canonical truth.
- `document_projections` is a derived view; rebuild it, never read it as source of truth.
- `revision` mismatch on edit MUST reject the request.

### 5.2 Mark

The atomic provenance unit. Kinds:

- `comment` — anchored discussion thread
- `suggestion.insert` — proposed insertion at a range
- `suggestion.delete` — proposed deletion of a range
- `suggestion.replace` — proposed replacement of a range
- `approval` — explicit accept/reject record

Properties: `id`, `kind`, `by` (author), `quote` (anchor text), `range`, `color`, `resolved`, `metadata`.

Rules:

- Marks are stored in the mark store, never embedded as HTML in markdown.
- Quote anchors MUST be validated by [server/anchor-resolver.ts](server/anchor-resolver.ts).
- Author identity is normalized via `@proof/core` agent-identity.
- New mark kinds are declared in [src/formats/marks.ts](src/formats/marks.ts) first, then surfaced through bridge routes.

### 5.3 Op

Mutation envelope sent to `POST /documents/:slug/ops`:

- `comment.add`, `comment.reply`, `comment.resolve`
- `suggestion.add`, `suggestion.accept`, `suggestion.reject`
- `rewrite.apply`

Rules:

- Every op MUST send `Idempotency-Key`.
- Ops are processed by the document engine, never by direct DB writes.
- New op kinds extend this list in `doc-core`, then in `doc-server` route handlers.

### 5.4 Share / Access

```ts
{ ownerSecret, accessToken, role, tokenUrl, shareUrl, snapshotUrl }
```

Roles: `viewer` | `commenter` | `editor` | `owner`.

Rules:

- `ownerSecret` is full-owner; never expose it in user-facing UI.
- `accessToken` is a scoped link credential.
- Auth header: `Authorization: Bearer <token>` or `x-share-token: <token>`.
- Bridge calls additionally use `x-bridge-token: <token>`.

### 5.5 Snapshot

Pre-rendered HTML at `snapshots/{slug}.html`, generated by [server/snapshot.ts](server/snapshot.ts).

Rules:

- Snapshots are derived; regenerate on share state change.
- Snapshots are for OG previews and link unfurls, not for live reads.

### 5.6 Collab Session

A Y.Doc bound to a Hocuspocus room, gated by a short-lived collab token.

Rules:

- Live transport is direct browser ↔ Hocuspocus over `/ws` after bootstrap.
- Collab token is refreshed via `POST /api/documents/:slug/collab-refresh` before expiry.
- Yjs updates are appended to `document_y_updates`; periodic snapshots compact them.

### 5.7 Bridge Request

An HTTP-originated op forwarded over WebSocket to a live viewer for execution.

Rules:

- Default timeout: 10s.
- Fallback: execute on server if no bridge-capable viewer is connected.
- The viewer MUST be authenticated and authorized for the requested role.

### 5.8 Event

Append-only mutation record, polled by `events/pending`, acked by `events/ack`.

Rules:

- Events are durable until acked.
- Polling supports `after=<id>&limit=<n>` for incremental consumption.

## 6. Required Subsystem Pipes

A subsystem MUST move truth across modules. Each pipe is a single flow.

### 6.1 Document Creation

```text
agent -> POST /documents
      -> doc-server: parse + validate
      -> doc-core: assign slug, build initial mark set
      -> doc-store-sqlite: insert document + access tokens
      -> doc-server: render snapshot HTML
      -> response { slug, ownerSecret, accessToken, tokenUrl, snapshotUrl }
```

Rules:

- Creation MUST issue both `ownerSecret` and `accessToken`.
- Snapshot rendering MUST not block the response on long work; defer if needed.

### 6.2 Edit (V2 block-level, recommended)

```text
agent -> GET /documents/:slug/snapshot
      -> POST /documents/:slug/edit/v2
      -> document-engine: precondition + revision check
      -> canonical-document: apply block edits
      -> proof-mark-rehydration: preserve marks across edits
      -> doc-store-sqlite: persist new revision
      -> collab broadcast (Yjs update)
      -> response { state, marks, revision }
```

Rules:

- Always read `snapshot` first to obtain a revision.
- Revision mismatch returns `409`; agent retries with fresh snapshot.
- Marks MUST be rehydrated; never lose marks across edits.

### 6.3 Op / Mutation

```text
agent -> POST /documents/:slug/ops { type, payload, Idempotency-Key }
      -> doc-server: idempotency check
      -> document-engine: validate op
      -> canonical-document: apply
      -> doc-store-sqlite: persist + outbox
      -> broadcast to live viewers
      -> response
```

Rules:

- Same `Idempotency-Key` returns the cached result.
- Outbox entries are published asynchronously to subscribers.

### 6.4 Bridge Forwarding

```text
agent -> POST /documents/:slug/bridge/{comment|suggestion|rewrite|presence|...}
      -> bridge-auth-policy: authorize
      -> sendBridgeRequest() over /ws
      -> live viewer (doc-editor) executes mark mutation
      -> server reconciles to canonical
      -> mutation_outbox -> broadcast
      -> response
```

Rules:

- Bridge requests time out after 10s.
- If no live viewer, fall back to server-side execution.
- The viewer's response is the authoritative result for the bridge call.

### 6.5 Collab Sync

```text
browser (y-prosemirror) <-> Hocuspocus (/ws) <-> Y.Doc
                                              -> document_y_updates (append)
                                              -> document_y_snapshots (periodic)
                                              -> proof-authored-mark-sync (reconcile marks)
                                              -> document_projections (rebuild)
```

Rules:

- Live edits flow through Yjs; canonical reconciles asynchronously.
- Mark drift between live and canonical MUST be reconciled by `proof-authored-mark-sync`.
- Projections are rebuilt from canonical, never read as source of truth.

### 6.6 Event Poll / Ack

```text
agent -> GET /documents/:slug/events/pending?after=<id>&limit=<n>
      -> doc-store-sqlite: read events
      -> response { events, upToId }
agent -> POST /documents/:slug/events/ack { upToId }
      -> doc-store-sqlite: advance ack cursor
```

Rules:

- Events are durable until acked.
- Multiple consumers: each maintains its own ack cursor.

### 6.7 Share Access

```text
client -> GET /d/:slug?token=...
       -> doc-server: validate token + role
       -> share-web-routes: serve shell + permissions
       -> doc-editor: bootstrap with role
       -> collab session opens with collab token
```

Rules:

- Role gates available ops; the editor MUST hide UI it cannot perform.
- Server MUST re-validate role on every mutation; do not trust client claims.

## 7. Public API Surface

Two surfaces, both stable across folder moves.

### 7.1 HTTP Routes (canonical SDK surface)

Document lifecycle:

- `POST   /documents`
- `GET    /documents/:slug/state`
- `GET    /documents/:slug/snapshot`

Edits and ops:

- `POST   /documents/:slug/edit`
- `POST   /documents/:slug/edit/v2`
- `POST   /documents/:slug/ops`

Presence and events:

- `POST   /documents/:slug/presence`
- `GET    /documents/:slug/events/pending`
- `POST   /documents/:slug/events/ack`

Bridge:

- `GET    /documents/:slug/bridge/state`
- `GET    /documents/:slug/bridge/marks`
- `POST   /documents/:slug/bridge/comments`
- `POST   /documents/:slug/bridge/suggestions`
- `POST   /documents/:slug/bridge/rewrite`
- `POST   /documents/:slug/bridge/presence`

Compatibility aliases (`/api/documents/...`, `/share/markdown`) remain mounted
for the hosted product but are NOT the public SDK surface.

### 7.2 Package Exports

- `@proof/core` — mark types, provenance sidecar, agent identity, anchor contract
- `@proof/editor` — editor runtime, schema, plugins, y-prosemirror binding
- `@proof/server` — route factories (`createDocumentRouter`, `createBridgeRouter`, `createAgentRouter`, `createShareRouter`), `mountProofSdkRoutes(app)`, `startCollabRuntime()`
- `@proof/sqlite` — store APIs for documents, marks, Y-updates, outbox
- `@proof/agent-bridge` — `createAgentBridgeClient(config)`, bridge protocol types

Public APIs MUST be:

- side-effect-light
- narrow
- stable across folder moves
- tree-shakable where possible

## 8. Guardrails

Required checks on every mutation path:

- **Idempotency** — `Idempotency-Key` header dedup'd by `(slug, key, route)` in [server/mutation-idempotency.ts](server/mutation-idempotency.ts) and the `mutation_idempotency` table.
- **Precondition** — edits MUST match the current `revision`; mismatch returns `409`.
- **Auth** — `Authorization: Bearer` or `x-share-token`; bridge ops additionally require `x-bridge-token`.
- **Rewrite barrier** — rewrites are blocked when live editors are present, unless force-flagged ([server/rewrite-policy.ts](server/rewrite-policy.ts)).
- **Anchor validation** — mark quotes MUST resolve to a position via [server/anchor-resolver.ts](server/anchor-resolver.ts).
- **Integrity check** — structural drift analyzed on mutation ([server/document-integrity.ts](server/document-integrity.ts)).
- **Rate limits** — 60 req/min unauthed per IP, 240 req/min per bridge token.
- **Role enforcement** — server MUST re-validate role on every mutation.

Architectural exceptions MUST include: owner, reason, exit condition, and test
or lint coverage where possible.

## 9. Legacy Vocabulary

Do not introduce new code or active docs using:

- `/api/documents` — use `/documents` (legacy alias kept for the hosted product)
- `/share/markdown` — use `/documents` (compatibility alias)
- raw HTML annotations inside markdown — marks are stored separately
- direct `rewrite.apply` for agent edits when block-level changes suffice — use `edit/v2`
- "share" as a synonym for "document" — share is the access wrapper around a document
- internal SDK label as user-facing vocabulary

The hosted product lives at [proofeditor.ai](https://proofeditor.ai) and is
made by [Every](https://every.to). This repo is the OSS extract; keep the SDK
surface free of hosted-product assumptions.
