# AI-Supported Teamwork Analysis Plan

## Purpose

The application should help trainers notice and discuss teamwork patterns without
requiring them to manually record events while facilitating. Automatically
detected moments of interest are the foundation. AI can interpret those moments,
but its output should remain evidence-backed, reviewable, and supportive rather
than acting as an authoritative judgment of participants.

The system should keep four layers separate:

1. Raw observations: gameplay, timing, roles, and eventually media.
2. Deterministic features: pauses, retries, recovery times, and participation.
3. Moments of interest: meaningful evidence windows on the session timeline.
4. AI interpretations: hypotheses reviewed and discussed by the trainer.

## Current data

The application already captures useful behavioral evidence.

| Data group | Available information |
| --- | --- |
| Session context | Mode, participants, trainer, start and end time |
| Round context | Level, time limit, outcome, maze seed, and layout |
| Roles | Participant-to-role assignments and role changes |
| Actions | Inputs, signals, and attempted movements |
| Movement | Direction, result, previous position, and next position |
| Friction | Wall and hazard collisions, ghost collisions, and resets |
| Progress | Keys, lives, and reaching the goal |
| Timing | First movement, movement pauses, and timer events |
| Trainer/system actions | Interventions, broadcasts, and legacy trainer markers |
| Overview metrics | Duration, keys, hazards, resets, and MOI timelines per round |

Current automatically selected moments include mode and level changes, first
movement, movement pauses, hazard hits, key pickups, reaching the goal, timer
expiry, and running out of lives.

One current limitation is that a `movement_pause` is logged when movement resumes
after the threshold. A pause that continues until the timer or round ends should
also be derived from the complete timeline.

## Data principles

- Events are immutable observations and should be append-only.
- A room session and each played round need separate stable identifiers.
- Event identifiers must be globally unique and must not restart at `evt-1`.
- All data sources should use the same monotonic session timeline.
- Moments should reference evidence events instead of copying or replacing them.
- AI interpretations must be stored separately from observations.
- Every AI claim must cite evidence that exists in the stored session.
- Model, prompt, detector, and schema versions must be recorded.
- Store the minimum personal and media data necessary for the trainer use case.

## Proposed data model

### Sessions and rounds

```text
session
  id
  mode
  started_at
  ended_at
  schema_version
  consent_configuration

round
  id
  session_id
  sequence
  started_at
  ended_at
  time_limit
  outcome
  maze_seed
  configuration
```

### Participants and roles

```text
participant
  id
  session_id
  display_name_or_pseudonym

role_assignment
  participant_id
  round_id
  role
  valid_from_ms
  valid_until_ms
```

Role assignments are intervals so later analysis can determine whether behavior
changed after a role transition.

### Events

```text
event
  id
  session_id
  round_id
  sequence
  occurred_at
  session_time_ms
  type
  actor_participant_id
  payload
  schema_version
```

The event-specific payload can remain JSON. Frequently queried identifiers and
timestamps should be proper columns.

Complete state snapshots should not be attached to every event. Save them at
round and phase boundaries, resets, major outcomes, periodic checkpoints, and
moments where reconstruction would otherwise be difficult.

### Moments of interest

```text
moment
  id
  session_id
  round_id
  detector
  detector_version
  type
  dimension
  start_time_ms
  focus_time_ms
  end_time_ms
  evidence_event_ids
  observed_facts
  source
  confidence
```

Suggested dimensions are:

- Communication
- Shared understanding
- Role clarity
- Coordination
- Participation
- Adaptation
- Decision-making

A moment is a time window rather than just a marked event. For example, a
collision moment can include the actions before the collision and the team's
recovery afterward.

### AI analyses and trainer review

```text
analysis
  id
  session_id
  round_id_or_null
  model
  prompt_version
  generated_at
  input_range
  result
  status

trainer_review
  analysis_id
  decision
  edited_result
  reviewed_at
```

Trainer input should focus on accepting, correcting, or dismissing generated
interpretations after the fact. Trainers should not have to annotate the live
session for the system to work.

## Assessment approach

Avoid starting with one good-teamwork or bad-teamwork score. Game performance
and teamwork quality are not equivalent:

- A team can finish because one participant dominates the activity.
- A team can fail while communicating and adapting effectively.
- Silence can indicate confusion, concentration, or an agreed plan.
- More communication is not necessarily clearer communication.

Use supportive assessment states instead:

- `supportive`
- `strained`
- `mixed`
- `insufficient_evidence`

An AI conclusion should follow a structure like this:

```json
{
  "dimension": "role_clarity",
  "assessment": "strained",
  "observation": "Movement repeatedly began before navigation information was available.",
  "evidence_event_ids": ["event-42", "event-47", "event-53"],
  "confidence": "medium",
  "alternative_explanations": [
    "The team may have intentionally chosen a trial-and-error strategy."
  ],
  "reflection_question": "How did the team decide when the mover had enough information to act?"
}
```

The trainer should see the observed facts, possible interpretation, confidence,
alternative explanations, and a useful reflection question.

## Candidate teamwork signals

Deterministic metrics and detectors should be developed before asking an LLM to
interpret the session.

| Dimension | Possible evidence |
| --- | --- |
| Shared understanding | Action after instructions, repeated failed routes, contradictory actions |
| Role clarity | Behavior around role transitions and actions outside the expected role flow |
| Coordination | Time to first action, pauses, and simultaneous or conflicting signals |
| Information sharing | Relevant information preceding movement once audio is available |
| Participation | Contribution balance and long non-participation periods |
| Adaptation | Behavior changes after hazards, resets, or failed rounds |
| Recovery | Time and actions required to resume after an error |
| Inclusion | Contributions being acknowledged, ignored, or repeatedly overridden |
| Efficiency | Progress per minute and repeated unnecessary actions |

Teams should initially be compared with themselves across rounds. Differences in
round duration, assigned roles, maze layout, and difficulty make global team
comparisons unreliable until enough calibrated data exists.

## Groq integration

Groq should be called by the Node backend, never directly from a browser client.
Useful analysis triggers are:

1. At the end of a round, analyze its detected moments.
2. At session end, compare patterns across rounds.
3. On demand, analyze a trainer-selected moment or time window.

Send a compact evidence package containing:

- Session and round context
- Role history
- Computed metrics
- Moment windows
- Relevant events before, during, and after each moment
- Comparisons with previous rounds

Do not send the entire raw session log or repeated maze snapshots. Require a
strict structured response and validate every cited event ID. The existing
deterministic rules should remain available as reliable triggers and as a
fallback when the AI service is unavailable.

## Audio roadmap

The most reliable first identity strategy is to record each participant through
their already connected phone. Each track is then associated with a known
participant without voice recognition or speaker diarization.

```text
participant phone -> known participant audio track
                  -> timestamped transcript
                  -> utterances linked to participant ID
```

Store:

- Media asset reference
- Participant and track ID
- Start time and clock offset
- Transcript segments
- Word or segment timestamps
- Transcription confidence
- Speech and non-speech intervals

Groq Whisper can provide multilingual transcription and timestamps. A shared
room microphone would additionally require speaker diarization because the
transcription response does not identify speakers.

Audio can support measurements such as speaking time, participation balance,
turn-taking, interruptions, questions, instructions, acknowledgements,
contradictions, and whether communication preceded or followed an action.

## Video roadmap

Do not begin with facial recognition. It adds biometric-data and privacy risk
and is not required for the first useful version.

Safer identity approaches include:

- A camera associated with one known participant or device
- Fixed participant positions or zones
- Visible colored markers or participant codes
- Trainer confirmation of proposed tracks
- Explicit opt-in identity enrollment only if later proven necessary

Video analysis should focus on observable actions such as presence in a known
zone, pointing, looking toward the shared display, physical turn-taking, and
entering or leaving the activity area. It should not infer emotion, personality,
engagement, or attention from facial appearance.

Groq vision models analyze still images rather than continuous video streams.
A practical system would track video separately, select keyframes around moments
of interest, and submit only those frames for interpretation.

## Storage direction

Use PostgreSQL for durable structured data. SQLite stored outside release
directories can be a short-lived transitional option for the current
single-server deployment.

Store large audio and video assets in object storage rather than in the
database. Database records should contain asset references, checksums, timing,
consent state, processing status, and retention or deletion dates.

The current release-relative `session-logs` directory is not a sufficient
long-term store because deployments switch the application to a new release
directory.

## Delivery phases

### Phase 1: Preserve the evidence

- Introduce stable session, round, and globally unique event IDs.
- Stop clearing historical events between rounds or games.
- Move persistence to PostgreSQL or an interim durable SQLite location.
- Replace per-event full snapshots with sparse checkpoints.
- Add schema versions and explicit retention settings.

### Phase 2: Formalize moments

- Move moment detection into shared backend code.
- Represent moments as time windows with evidence references.
- Detect pauses that continue until a round ends.
- Add recovery, repeated-attempt, and role-transition detectors.
- Make overview screens consume stored moments instead of re-deriving them.

### Phase 3: AI debrief pilot

- Add a server-side Groq client.
- Produce structured, evidence-backed round assessments.
- Add a cross-round session synthesis.
- Let trainers accept, edit, or dismiss conclusions.
- Measure trainer usefulness and unsupported-claim rate.

### Phase 4: Audio pilot

- Obtain explicit session consent.
- Capture one known audio track per participant.
- Synchronize tracks with the gameplay timeline.
- Transcribe audio and derive turn-taking features.
- Add transcript-backed moments and conclusions.

### Phase 5: Video research pilot

- Establish a non-biometric identity strategy.
- Track participants and extract a limited set of observable actions.
- Retain only necessary clips or keyframes.
- Determine whether added trainer value justifies the privacy and storage cost.

## Evaluation

Before presenting AI assessments as dependable, create an evaluation set from
real sessions reviewed by trainers. Measure:

- Moment detection precision and recall
- Evidence citation correctness
- Unsupported or overstated conclusions
- Agreement and disagreement with trainers
- Usefulness of reflection questions
- Whether conclusions change appropriately when roles or context change

Trainer disagreement should be stored as valuable evaluation data rather than
treated as trainer error.

## Immediate next step

Implement Phases 1 and 2 before connecting Groq. Stable, durable evidence and
first-class moments will make AI analysis a contained service instead of
coupling it to temporary frontend timelines.
