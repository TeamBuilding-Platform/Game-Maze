'use strict';

function buildObserverSignals(state) {
  return state.log
    .filter((entry) => {
      return [
        'input',
        'hazard_hit',
        'reset',
        'ghost_move',
        'ghost_collision',
        'timer_start',
        'timer_stop',
        'timer_reset',
        'timer_expired',
        'phase_start',
        'follow_up_end',
        'clarity_event',
      ].includes(entry.event);
    })
    .map((entry) => ({
      eventId: entry.eventId,
      ts: entry.ts,
      t: entry.t,
      category: entry.event.startsWith('timer_')
        ? 'timer'
        : (entry.event === 'phase_start' || entry.event === 'follow_up_end'
          ? 'flow'
        : (entry.event === 'clarity_event'
          ? 'clarity'
          : (entry.event === 'hazard_hit' || entry.event === 'reset' || entry.event === 'ghost_move' || entry.event === 'ghost_collision'
            ? 'state'
            : 'input'))),
      type: entry.event,
      playerId: entry.playerId || null,
      player: entry.player || null,
      role: entry.role || null,
      result: entry.result || null,
      reason: entry.reason || null,
      hazardType: entry.hazardType || null,
      clarityType: entry.clarityType || null,
      durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : null,
      remainingMs: typeof entry.remainingMs === 'number' ? entry.remainingMs : null,
    }));
}

function buildReplaySnippet(state, eventId, windowSeconds = 5) {
  const anchor = state.log.find((entry) => entry.eventId === eventId);
  if (!anchor || anchor.event !== 'clarity_event') {
    return null;
  }
  const replayEvents = [{
    eventId: anchor.eventId,
    event: anchor.event,
    t: anchor.t,
    ts: anchor.ts,
    player: anchor.player || null,
    dir: anchor.dir || null,
    result: anchor.result || null,
    hazardType: anchor.hazardType || null,
    clarityType: anchor.clarityType || null,
    position: anchor.position || null,
    snapshot: anchor.snapshot || null,
  }];

  return {
    type: 'replay_snippet',
    eventId: anchor.eventId,
    event: anchor.event,
    t: anchor.t,
    windowSeconds,
    replayEvents,
    startSnapshot: replayEvents[0] ? replayEvents[0].snapshot : null,
    focusSnapshot: anchor.snapshot || null,
    endSnapshot: replayEvents.length ? replayEvents[replayEvents.length - 1].snapshot : null,
  };
}

function buildAiSuggestions(state) {
  const observerSignals = buildObserverSignals(state);
  const suggestions = [];
  const decisions = state.aiSuggestionDecisions || {};

  const wallHazards = observerSignals.filter((entry) => entry.type === 'hazard_hit' && entry.hazardType === 'wall');
  if (wallHazards.length >= 2) {
    suggestions.push({
      id: 'suggestion-wall-hazards',
      type: 'repeated_failed_instruction',
      summary: 'Repeated wall hazard resets suggest unclear navigation instructions.',
    });
  }

  const timerExpired = observerSignals.find((entry) => entry.type === 'timer_expired');
  if (timerExpired) {
    suggestions.push({
      id: 'suggestion-timer-expired',
      type: 'silence_during_critical_moment',
      summary: 'Timer expiry may indicate silence or stalled coordination during a critical moment.',
    });
  }

  const roleUnclear = observerSignals.find((entry) => entry.type === 'clarity_event' && entry.clarityType === 'role_unclear');
  if (roleUnclear) {
    suggestions.push({
      id: 'suggestion-role-confusion',
      type: 'role_confusion_pattern',
      summary: 'Trainer-marked role confusion suggests players were unclear on responsibilities.',
    });
  }

  const silentConfusion = observerSignals.find((entry) => entry.type === 'clarity_event' && entry.clarityType === 'silent_confusion');
  if (silentConfusion) {
    suggestions.push({
      id: 'suggestion-silent-confusion',
      type: 'silent_confusion_pattern',
      summary: 'Silent confusion marker suggests players hesitated without communicating clearly.',
    });
  }

  const resetSignals = observerSignals.filter((entry) => entry.type === 'reset');
  if (resetSignals.length >= 2) {
    suggestions.push({
      id: 'suggestion-high-reset-load',
      type: 'high_communication_load',
      summary: 'Multiple resets in one session suggest communication load spiked around navigation.',
    });
  }

  return suggestions.map((suggestion) => ({
    ...suggestion,
    status: decisions[suggestion.id] || 'pending',
  }));
}

module.exports = {
  buildAiSuggestions,
  buildObserverSignals,
  buildReplaySnippet,
};
