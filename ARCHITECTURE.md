# Architecture

## Package boundary

The repository contains two deliberately separate Node packages:

- The root package is the backend. `server.js` owns process startup and `src/`
  owns the authoritative session, game, networking, and persistence behavior.
- `frontend/` is the browser application. It renders the host display, player
  controllers, and trainer tools, but never owns authoritative game state.

The duplicated lockfiles are intentional. Backend dependencies must be added at
the root; browser dependencies must be added from `frontend/`.

## Client visibility boundary

Every connected client receives a state projection appropriate to its role.
This is a security and game-design boundary, not merely a UI choice.

| Client | Purpose | May receive | Must not receive |
| --- | --- | --- | --- |
| Host display | Shared room screen | Lobby, public progress, timers, follow-up and debrief data | Private role-only guidance during play |
| Player controller | Individual phone | The player's assigned role view and shared summary | Other roles' hidden maze information |
| Trainer controller | Facilitator console | Combined maze, perspectives, controls, insights and session log | Server-only connection tokens and internal socket state |

Backend state projections are assembled in `src/sessionManager.js` today. The
frontend mirrors the three client categories under `frontend/src/components/`:
`display/`, `controller/`, and trainer components within `controller/`.

## Protocol changes

The backend contract lives in `src/protocol.js`; its browser mirror lives in
`frontend/src/protocol.js`. `frontend/test/protocol.test.js` prevents their wire
constants from drifting. A protocol change must update both files plus relevant
backend and frontend tests in one change.

## Keeping managers small

`SessionManager` should coordinate collaborators rather than accumulate more
pure transformation logic. New code should go into focused modules:

- `src/gameplay/`: authoritative round, timer, maze, and role rules.
- `src/networking/`: transport envelopes and connection health.
- `src/session/`: identity, lifecycle, reconnect, and state projection helpers.
- `src/trainer/`: trainer-only event validation and derived insights.
- `src/mvc/session/`: HTTP and WebSocket adapters around the session domain.

Trainer insight derivation has already moved to
`src/trainer/sessionInsights.js`. The next safe extractions from
`src/sessionManager.js`, in order, are:

1. Client state projectors (`display`, `player`, and `trainer`) into
   `src/session/stateProjectors.js` with visibility-focused unit tests.
2. Timer and phase transitions into `src/gameplay/phaseManager.js`.
3. Connection claiming, reconnect grace, and abandoned cleanup into
   `src/session/connectionManager.js`.
4. Session export mapping into `src/session/sessionExport.js`.

On the frontend, `TrainerDashboard.jsx` should be split by its existing tabs and
phases rather than by arbitrary line count. Prefer `TrainerLobby`,
`TrainerGameplay`, `TrainerFollowUp`, `TrainerOverview`, and small shared control
components. Keep `TrainerDashboard` as the state-aware router and command owner.
Likewise, keep `GridCanvas` as the canvas lifecycle owner while moving pure
coordinate, visibility, and drawing helpers into testable modules.

Extract one responsibility at a time and keep behavior unchanged. The backend
test suite and frontend protocol tests are the safety net for that sequence.
