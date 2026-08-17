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

/**
 * Cross-tab token ownership.
 *
 * sessionStorage alone does not guarantee one identity per tab: duplicating a
 * tab (and same-origin windows opened with an opener) clones session storage,
 * so a duplicate would silently auto-resume the copied token and kick the
 * original player. Before auto-resuming, a tab probes over a BroadcastChannel;
 * any live tab that registered with the same token replies, and the prober
 * then clears its copied identity instead of stealing the slot.
 */

const OWNERSHIP_CHANNEL = 'teambuilding.reconnect.ownership'
const OWNERSHIP_PROBE_TIMEOUT_MS = 250

function openOwnershipChannel() {
  if (typeof BroadcastChannel === 'undefined') {
    return null
  }
  try {
    return new BroadcastChannel(OWNERSHIP_CHANNEL)
  } catch {
    return null
  }
}

export function announceTokenOwnership(sessionId, reconnectToken) {
  const channel = openOwnershipChannel()
  if (!channel) {
    return () => {}
  }
  channel.onmessage = (event) => {
    const msg = event && event.data ? event.data : {}
    if (msg.type === 'probe' && msg.sessionId === sessionId && msg.reconnectToken === reconnectToken) {
      channel.postMessage({ type: 'owned', sessionId, reconnectToken })
    }
  }
  return () => {
    try {
      channel.close()
    } catch {
      // Ignore close failures.
    }
  }
}

export function probeTokenOwnership(sessionId, reconnectToken) {
  return new Promise((resolve) => {
    const channel = openOwnershipChannel()
    if (!channel) {
      resolve(false)
      return
    }
    const finish = (ownedElsewhere) => {
      try {
        channel.close()
      } catch {
        // Ignore close failures.
      }
      resolve(ownedElsewhere)
    }
    const timer = setTimeout(() => finish(false), OWNERSHIP_PROBE_TIMEOUT_MS)
    channel.onmessage = (event) => {
      const msg = event && event.data ? event.data : {}
      if (msg.type === 'owned' && msg.sessionId === sessionId && msg.reconnectToken === reconnectToken) {
        clearTimeout(timer)
        finish(true)
      }
    }
    channel.postMessage({ type: 'probe', sessionId, reconnectToken })
  })
}
