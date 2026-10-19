// Standing pictures for dialogue. Nothing is drawn yet: a silhouette
// placeholder is used until a file name is set below.
//
// To add art: drop PNGs (transparent background, standing pose, roughly
// 800×1400) into  public/portraits/  and put the file name here, e.g.
//   laras: { normal: 'laras.png', happy: 'laras_happy.png' }
// A mood that has no file falls back to `normal`; no file at all = placeholder.
export const PORTRAITS = {
  laras: { normal: null, happy: null, worried: null, serious: null },
  rani: { normal: null, happy: null, worried: null, serious: null },
  dimas: { normal: null, happy: null, worried: null, serious: null },
  gun: { normal: null, happy: null, worried: null, serious: null }
};

export const PLACEHOLDER = {
  laras: { color: '#e8a35a', initial: 'L' },
  rani: { color: '#6ec7e8', initial: 'R' },
  dimas: { color: '#9b8cff', initial: 'D' },
  gun: { color: '#d9645a', initial: 'G' }
};

// URL of the picture for this NPC + mood, or null → use the placeholder.
export function portraitSrc(npcId, mood = 'normal') {
  const set = PORTRAITS[npcId] || {};
  const file = set[mood] || set.normal;
  return file ? `${import.meta.env.BASE_URL}portraits/${file}` : null;
}
