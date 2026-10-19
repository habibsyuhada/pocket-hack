// Tiny helpers for writing dialogue lines. Line shape: { who: 'npc' | 'you', text, mood }.
// mood picks the standing picture (normal | happy | worried | serious).
// Kept dependency-free so mission files can import it without cycles.
export const L = (who, text, mood = 'normal') => ({ who, text, mood });
export const N = (text, mood) => L('npc', text, mood);
export const Y = (text) => L('you', text);
// An offer scene (what the giver says when handing out a mission).
export const offer = (lines, accept, decline, onAccept, onDecline) => ({ lines, accept, decline, onAccept, onDecline });
// A talk scene = lines, then an optional choice. band: low | mid | high. Option: label, affinity bonus, reply lines.
export const scene = (id, band, lines, options) => ({ id, band, lines, choice: options ? { options } : null });
export const opt = (label, bonus, ...lines) => ({ label, bonus, lines });
