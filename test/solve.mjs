// Smoke test: load every level, run the engine for a while with scripted-ish
// input, and assert nothing throws and the state stays sane.
//   node test/solve.mjs
//
// The engine/level/tiles modules are QML-flavoured JS (.pragma library /
// .import); we strip those directives and evaluate them in plain Node.

import fs from 'fs';
import path from 'path';

const root = path.join(import.meta.dirname, '..');
const gdir = path.join(root, 'game');
const strip = (s) => s.replace(/^\.pragma library\s*$/m, '').replace(/^\.import .*$/gm, '');
const read = (p) => strip(fs.readFileSync(p, 'utf8'));

const T = new Function(read(path.join(gdir, 'tiles.js')) +
  ';return {EMPTY,BRICK,SOLID,LADDER,ROPE,TRAP,GOLD,PLAYER,GUARD,EXIT,fromChar};')();
const Level = new Function('T', read(path.join(gdir, 'level.js')) + ';return {parse};')(T);
const Engine = new Function('T', read(path.join(gdir, 'engine.js')) +
  ';return {SUB,createState,tick};')(T);

const filesJs = read(path.join(gdir, 'levels.js')) + ';return FILES;';
const FILES = new Function(filesJs)();

let fails = 0;
const inputs = [
  { right: true }, { left: true }, { up: true }, { down: true },
  { right: true, digRight: true }, { left: true, digLeft: true }, {}
];

let dug = 0, guardHoles = 0, deaths = 0;

for (let i = 0; i < FILES.length; i++) {
  const file = FILES[i];
  let s;
  try {
    const lvl = Level.parse(fs.readFileSync(path.join(root, 'levels', file), 'utf8'));
    if (lvl.width !== 28 || lvl.height !== 16) throw new Error(`size ${lvl.width}x${lvl.height}`);
    if (lvl.guardStarts.length < 1) throw new Error('no guards');
    if (lvl.gold.length < 1) throw new Error('no gold');
    s = Engine.createState(lvl);
  } catch (e) {
    console.log(`FAIL  ${file}  parse/create: ${e.message}`);
    fails++;
    continue;
  }

  try {
    // deterministic pseudo-random walk
    let seed = i * 2654435761 >>> 0;
    for (let t = 0; t < 1200; t++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      Engine.tick(s, inputs[seed % inputs.length]);
      if (s.status !== 'playing') break;
    }
    if (s.holes.length || s.tick) dug += s.tilesRev > 0 ? 1 : 0;
    if (s.status === 'dead') deaths++;
    for (const g of s.guards) if (g.inHole) guardHoles++;
    // sanity
    const p = s.player;
    if (!isFinite(p.px) || !isFinite(p.py)) throw new Error('player NaN');
    if (p.px < -8 || p.py < -8 || p.px > s.w * 8 + 8 || p.py > s.h * 8 + 8)
      throw new Error(`player OOB ${p.px},${p.py}`);
  } catch (e) {
    console.log(`FAIL  ${file}  tick: ${e.message}`);
    fails++;
  }
}

console.log(`\n${FILES.length} levels · ${dug} saw digging · ${deaths} random-walked into death`);
console.log(fails ? `${fails} FAILURE(S)` : 'all levels load and run clean');
process.exit(fails ? 1 : 0);
