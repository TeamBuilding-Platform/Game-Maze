# TeamBuilding React frontend

This is the production frontend (React + Vite). It replaced the original Phaser UI
and is served by the Express backend from `frontend/dist` after `npm run build`.

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
