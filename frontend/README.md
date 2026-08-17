# TeamBuilding React frontend

This is the production frontend (React + Vite). It replaced the original Phaser UI
and is served by the Express backend from `frontend/dist` after `npm run build`.

## AI-assisted frontend guardrails

Google AI Studio is commonly used for work in this directory. Keep generated
changes within these boundaries:

- Treat `frontend/` as browser code and `../src/` plus `../server.js` as backend
  code. Do not change backend message behavior as part of a visual edit.
- Keep wire-message names aligned with `frontend/src/protocol.js`. If a protocol
  change is genuinely required, update the backend contract, frontend contract,
  documentation, and tests together.
- Extend existing role views and shared components before creating parallel or
  duplicated implementations.
- Preserve the distinction between the host display, player controllers, and
  trainer controls; do not expose private role information on the host display.
- Run `npm run lint` and `npm run build` from this directory before finishing.
  Remove unused generated imports, props, state, and handlers rather than leaving
  warnings behind.
- Do not commit `node_modules/`, `dist/`, local environment files, or generated
  AI Studio artifacts.

## Commands

```bash
npm install
npm run dev
```

The root package also includes shortcuts:

```bash
npm run frontend:dev
npm run frontend:build
npm run frontend:preview
```

Frontend contract tests and zero-warning lint checks are available from this
directory with `npm test` and `npm run lint`.

## Backend connectivity

By default:

- `npm run dev` and production builds both use the page's own origin
  (`window.location.origin`), relying on the Vite dev server's `/api`, `/join`,
  and `/ws` proxy rules (see `vite.config.js`) to reach the backend at
  `http://localhost:$PORT` (default `3000`). This works both for local
  development and for remote/sandboxed preview environments where the
  browser can't reach `localhost` directly.

Optional env vars:

- `VITE_BACKEND_ORIGIN` (example: `https://game.example.com`)
- `VITE_WS_URL` for explicit WebSocket endpoint override

Copy `.env.example` to `.env` to set them locally.

## Protocol contract (frontend-facing)

The scaffold keeps protocol constants in `src/protocol.js` for React usage.

### Client -> server messages

- `display_register` `{ sessionId }`
- `controller_join` `{ sessionId, name, reconnectToken?, requestedTrainer? }`
- `game_start` `{}`
- `game_restart` `{}`
- `timer_start` `{ durationMs }`
- `timer_stop` `{}`
- `timer_reset` `{ durationMs }`
- `followup_end` `{}`
- `player_input` `{ input }`
- `resync_request` `{}`
- `ping` `{}` (app-level heartbeat)

### Server -> client messages

- `client_registered`
- `state_sync`
- `join_error` (includes `code`)
- `pong` (heartbeat reply)
- `session_closed` (legacy event)

Server envelopes include protocol version `v` and message `type`.
