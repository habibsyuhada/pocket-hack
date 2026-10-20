// Trace timer. A secured node watches you: stay connected too long and you are kicked out,
// and the node refuses you for LOCKOUT_MS. Pure logic; the UI ticks it (see ui/app.js).
// State lives on the run so it is saved with the profile:
//   run.trace    = { id, left }            ms left on the node you are connected to (null otherwise)
//   run.exposure = { [id]: { left, at } }  budget left on nodes you walked away from; it recovers while you are away
//   run.locked   = { [id]: until }         wall-clock ms until you may connect again
export const LOCKOUT_MS = 30000;
export const WARN_MS = 30000;

// seconds of connection time per mission difficulty (the timer is paused during loading screens)
export const TRACE_SECONDS = { 2: 210, 3: 180, 4: 150, 5: 130 };

export const traceBudget = (d) => (d?.trace || 0) * 1000;

// how much of the budget you would have if you connected at `now`
export function budgetLeft(run, d, now = Date.now()) {
  const full = traceBudget(d);
  const e = run.exposure?.[d.id];
  if (!e) return full;
  return Math.min(full, e.left + Math.max(0, now - e.at));
}

export function lockLeft(run, id, now = Date.now()) {
  return Math.max(0, (run.locked?.[id] || 0) - now);
}

// leaving a node (or being moved on): remember what is left of its budget
export function leaveNode(run, now = Date.now()) {
  const t = run.trace;
  if (!t) return;
  (run.exposure ||= {})[t.id] = { left: Math.max(0, t.left), at: now };
  run.trace = null;
}

// entering a node: start its timer if it is a traced one
export function enterNode(run, d, now = Date.now()) {
  leaveNode(run, now);
  run.trace = null;
  if (!traceBudget(d)) return;
  run.trace = { id: d.id, left: Math.max(1000, budgetLeft(run, d, now)) };
}

// advance the timer by dt ms. Returns { id } when the node just kicked you out.
export function tickTrace(run, dt, now = Date.now()) {
  const t = run.trace;
  if (!t) return null;
  t.left -= dt;
  if (t.left > 0) return null;
  const id = t.id;
  run.trace = null;
  run.current = null;
  (run.locked ||= {})[id] = now + LOCKOUT_MS;
  delete run.exposure?.[id];                       // a fresh budget once the lockout is over
  return { id };
}

// lines for the "why is CONNECT disabled" reason
export const lockSeconds = (run, id, now = Date.now()) => Math.ceil(lockLeft(run, id, now) / 1000);
