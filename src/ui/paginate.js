// A dialogue box has a fixed size, so long lines are split into pages (at sentence, then word, boundaries).
export const PAGE_CHARS = 120;
export function paginate(text, max = PAGE_CHARS) {
  const out = [];
  let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (const para of String(text).split('\n')) {
    if (cur) cur += '\n';
    for (const sent of para.match(/[^.!?…]+[.!?…]*["')\]]*\s*|\s+/g) || [para]) {
      if ((cur + sent).trim().length <= max) { cur += sent; continue; }
      push();
      if (sent.trim().length <= max) { cur = sent; continue; }
      for (const w of sent.split(/(?<=\s)/)) {
        if ((cur + w).trim().length > max) push();
        cur += w;
      }
    }
  }
  push();
  return out.length ? out : [''];
}
