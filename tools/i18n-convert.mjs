// One-off helper: rewrites UI template literals into t('...{1}...', arg1, ...)
// calls (AST based, so nested templates are safe).   node tools/i18n-convert.mjs file...
import fs from 'node:fs';
import { parseAst } from 'rolldown/parseAst';

const CSSLIKE = /px|%|;|translate\(|animation|--pc|rgba|\bms\b|\.sleep|:\s*\d/;

function convert(file) {
  const src = fs.readFileSync(file, 'utf8');
  const ast = parseAst(src, { lang: 'js' }, file);
  const edits = [];                       // { start, end, node }
  const visit = (n) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    if (n.type === 'TemplateLiteral' && n.expressions.length) {
      const stat = n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? `{${i + 1}}` : '')).join('');
      const text = stat.replace(/\{\d+\}/g, '');
      if (/[A-Za-z]{3}/.test(text) && !CSSLIKE.test(stat) && !/^[\s\W\d]*$/.test(text)) edits.push({ start: n.start, end: n.end, node: n, stat });
    }
    for (const k of Object.keys(n)) if (k !== 'type' && k !== 'start' && k !== 'end') visit(n[k]);
  };
  visit(ast);
  // text of [s,e) with nested edits applied (outermost edits inside the range win)
  const textOf = (s, e) => {
    const inner = edits.filter((x) => x.start >= s && x.end <= e && !(x.start === s && x.end === e && false)).sort((a, b) => a.start - b.start || b.end - a.end);
    let out = '', pos = s;
    for (const x of inner) {
      if (x.start < pos) continue;                      // nested inside an already emitted edit
      out += src.slice(pos, x.start) + render(x);
      pos = x.end;
    }
    return out + src.slice(pos, e);
  };
  const render = (x) => {
    const key = x.stat.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    const args = x.node.expressions.map((ex) => textOf(ex.start, ex.end));
    return `t('${key}', ${args.join(', ')})`;
  };
  // emit top-level edits (those not nested in another edit)
  const top = edits.filter((x) => !edits.some((y) => y !== x && y.start <= x.start && y.end >= x.end && (y.start < x.start || y.end > x.end)));
  top.sort((a, b) => a.start - b.start);
  let out = '', pos = 0;
  for (const x of top) { out += src.slice(pos, x.start) + render(x); pos = x.end; }
  out += src.slice(pos);
  fs.writeFileSync(file, out);
  return edits.length;
}
for (const f of process.argv.slice(2)) console.log(f, convert(f));
