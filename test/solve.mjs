// Headless regression check: script a full solve of every level and assert the
// engine reports `won` with all gold collected.
//
//   node test/solve.mjs
//
// The engine/level/tiles modules are QML-flavoured JS (.pragma library /
// .import). We strip those directives and evaluate the modules in plain Node.

import fs from 'fs';
import path from 'path';

const root = path.join(import.meta.dirname, '..');
const gdir = path.join(root, 'game');

const strip = (s) =>
  s.replace(/^\.pragma library\s*$/m, '').replace(/^\.import .*$/gm, '');

const read = (p) => strip(fs.readFileSync(p, 'utf8'));

const T = new Function(
  read(path.join(gdir, 'tiles.js')) +
  ';return {EMPTY,BRICK,SOLID,LADDER,ROPE,GOLD,PLAYER,GUARD,EXIT,CHARS,fromChar};'
)();
const Level = new Function('T',
  read(path.join(gdir, 'level.js')) + ';return {parse};'
)(T);
const Engine = new Function('T',
  read(path.join(gdir, 'engine.js')) + ';return {SUB,createState,tick,tileAt};'
)(T);

const SUB = Engine.SUB;
let failures = 0;

function play(file, plan) {
  const text = fs.readFileSync(path.join(root, 'levels', file), 'utf8');
  const s = Engine.createState(Level.parse(text));
  let ticks = 0;
  for (const [dir, tiles] of plan) {
    const input = {
      left:  dir === 'L', right: dir === 'R',
      up:    dir === 'U', down:  dir === 'D'
    };
    for (let i = 0; i < tiles * SUB && s.status !== 'won'; i++) {
      Engine.tick(s, input);
      ticks++;
    }
    if (s.status === 'won') break;
  }
  const ok = s.status === 'won' && s.goldLeft === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file}  ` +
    `ticks=${ticks} status=${s.status} gold=${s.goldTotal - s.goldLeft}/${s.goldTotal}`);
  if (!ok) failures++;
}

play('01-intro.txt', [
  ['R', 1], ['U', 9],
  ['R', 6], ['R', 15], ['L', 21],
  ['D', 3], ['R', 15], ['L', 15],
  ['D', 3], ['R', 5],  ['L', 5],
  ['D', 3], ['R', 16], ['L', 16],
  ['U', 13]
]);

play('02-ropes.txt', [
  ['R', 1], ['U', 6],
  ['R', 6], ['D', 4], ['L', 6], ['U', 2],
  ['R', 11], ['D', 4], ['L', 11],
  ['D', 4], ['R', 15], ['L', 15],
  ['U', 10]
]);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall levels solved');
process.exit(failures ? 1 : 0);
