# Proof SDK

Proof SDK is the open-source editor, collaboration server, provenance model, and agent HTTP bridge that power collaborative documents in Proof.

If you want the hosted product, use [Proof](https://proofeditor.ai). Hosted Proof is made by [Every](https://every.to).

## What This Fork Changes

This fork is collecting changes that make local development more predictable
after a fresh clone.

### 1. Local Development Works After a Fresh Clone

Problem: The local development docs said to run the editor with `npm run dev`
and the server with `npm run serve`, and also said that `npm run build` was not
needed. But the server-side share route could still fall back to
`dist/index.html`, which does not exist on a fresh clone until after a production
build. Local configuration was also spread across scripts and defaults, and the
example environment file did not show every setting currently needed for a
smooth local run.

Fix: `npm run serve` now starts the server with `PROOF_DEV_EDITOR=1`. Local
browser requests for `/d/:slug` on the server are redirected to the Vite editor
on port 3000, while API, agent, markdown, and unfurl routes continue to come
from the server on port 4000. `npm run serve` also loads `.env` through `tsx --env-file=.env`. Shared local development defaults live in `local-dev.ts`, and
`.env.example` includes the local server port, public browser origins, embedded
collaboration websocket URL, and collaboration signing secret field.

### 2. Editor CSS Has One Main Theme Surface

Problem: Editor CSS was hard to reason about, especially when using LLMs to
change styling, because the editor was styled by both the app's custom CSS and
Milkdown's Nord theme.

Fix: The Milkdown Nord theme dependency and `.config(nord)` hook were removed,
so app CSS is now the main theme surface for the editor and shared document
view.

### 3. Markdown Toolbar Is Added End-to-End

Problem: Markdown formatting support existed in pieces, but it was not wired
end-to-end into the editor UI. Earlier toolbar-shaped code did not need to be a
Milkdown prose plugin, and putting formatting in a separate topbar control would
split selection-driven actions across two places.

Fix: The toolbar is now implemented end-to-end as a `Format` button on the
mark-selection-bar, next to `Comment`, `Flag`, and `Suggest`, reusing the bar's
existing pill-button styling. `buildMarkdownToolbarMenu` exposes the dropdown
as a pure factory that reads Milkdown commands from the editor context; the
mark-selection-bar mounts and tears it down with its own lifecycle, so the menu
cannot outlive a hidden bar and the topbar carries no toolbar wiring.
