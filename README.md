# Proof SDK

Proof SDK is the open-source editor, collaboration server, provenance model, and agent HTTP bridge that power collaborative documents in Proof.

If you want the hosted product, use [Proof](https://proofeditor.ai). Hosted Proof is made by [Every](https://every.to).

## What Is Included

- Collaborative markdown editor with provenance tracking
- Comments, suggestions, and rewrite operations
- Realtime collaboration server
- Agent HTTP bridge for state, marks, edits, presence, and events
- A small example app under `apps/proof-example`

## Workspace Layout

- `packages/doc-core`
- `packages/doc-editor`
- `packages/doc-server`
- `packages/doc-store-sqlite`
- `packages/agent-bridge`
- `apps/proof-example`
- `server`
- `src`

## Local Development

Requirements:

- Node.js 18+

Install dependencies:

```bash
npm install
```

Start the editor:

```bash
npm run dev
```

Editor UI runs at `http://localhost:3000`.

Start the local server in another terminal:

```bash
npm run serve
```

API, collaboration, agent docs, and server-rendered routes run at `http://localhost:4000`.
When you open a shared document in a browser from the server, the local server
hands the live editor view to Vite on port 3000. You do not need to run
`npm run build` during local development.

## Core Routes

Canonical Proof SDK routes:

- `POST /documents`
- `GET /documents/:slug/state`
- `GET /documents/:slug/snapshot`
- `POST /documents/:slug/edit`
- `POST /documents/:slug/edit/v2`
- `POST /documents/:slug/ops`
- `POST /documents/:slug/presence`
- `GET /documents/:slug/events/pending`
- `POST /documents/:slug/events/ack`
- `GET /documents/:slug/bridge/state`
- `GET /documents/:slug/bridge/marks`
- `POST /documents/:slug/bridge/comments`
- `POST /documents/:slug/bridge/suggestions`
- `POST /documents/:slug/bridge/rewrite`
- `POST /documents/:slug/bridge/presence`

Compatibility aliases remain mounted for the hosted product, but the routes above are the public SDK surface.

## Production Build

```bash
npm run build
```

The build is only needed for production or embeddable web bundle artifacts. It
outputs the web bundle to `dist/` and writes `dist/web-artifact-manifest.json`.

## Tests

```bash
npm test
```

## Docs

- `AGENT_CONTRACT.md`
- `docs/agent-docs.md`
- `docs/proof.SKILL.md`
- `docs/adr/2026-03-proof-sdk-public-core.md`

## License

- Code: `MIT` in `LICENSE`
- Trademark guidance: `TRADEMARKS.md`
