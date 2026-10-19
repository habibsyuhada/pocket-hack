import { dataStrings, sourceStrings } from './i18n-extract.mjs';
import { EN } from '../src/i18n/en.js';
import { SAME } from '../src/i18n/same.js';
const all=[...new Set([...(await dataStrings()),...sourceStrings()])];
const same=new Set(SAME);
const miss=all.filter(s=>EN[s]===undefined&&!same.has(s));
console.log(JSON.stringify(miss,null,1));
