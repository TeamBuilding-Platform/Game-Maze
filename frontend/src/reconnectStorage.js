/**
 * Reconnect state persistence helpers.
 *
 * These functions are the only place that reads/writes reconnect tokens.
 * Keeping them isolated here means frontend UI work can never accidentally
 * break the server-level reconnect handshake.
 *
 * Storage is sessionStorage on purpose: it is per-tab, so multiple tabs on the
 * same device can each hold their own player identity (multi-tab play), while
 * still surviving same-tab reloads for silent auto-resume. A brand-new tab
 * won't auto-resume, but the server's lobby same-name takeover and mid-game
 * slot-claim recover the player slot on a fresh join.
 *
 * Storage shape: { playerId: string, reconnectToken: string, name: string, isTrainer: boolean }
 * Storage key:   "teambuilding.reconnect.<SESSIONID>"
 */

export function storageKey(sessionId) {
  return `teambuilding.reconnect.${sessionId}`
}

export function loadReconnectState(sessionId) {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveReconnectState(sessionId, payload) {
  try {
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(payload))
  } catch {
    // Ignore storage failures (private browsing, quota exceeded, etc.)
  }
}

export function clearReconnectState(sessionId) {
  try {
    sessionStorage.removeItem(storageKey(sessionId))
  } catch {
    // Ignore storage failures.
  }
}
