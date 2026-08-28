// Headless checks for digging, holes, death, and guard behaviour.
//   node test/mechanics.mjs

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
  ';return {SUB,createState,tick,tileAt,DIG_REFILL};')(T);
const SUB = Engine.SUB;

let fails = 0;
function check(name, cond, detail) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '   ' + (detail || '')}`);
  if (!cond) fails++;
}
function mk(rows) { return Engine.createState(Level.parse(rows.join('\n'))); }
function run(s, input, n) { for (let i = 0; i < n && s.status === 'playing'; i++) Engine.tick(s, input); }
const T8 = SUB;
const ptile = (s) => [Math.round(s.player.px / SUB), Math.round(s.player.py / SUB)];
const gtile = (g) => [Math.round(g.px / SUB), Math.round(g.py / SUB)];

// 1. dig opens a hole, hole refills
{
  const s = mk([
    '..........',
    '.&........',
    '.####.....',
    '.####.....',
    '..........'
  ]);
  Engine.tick(s, { digRight: true });
  check('dig opens hole', s.tiles[2][2] === T.EMPTY && s.holes.length === 1);
  run(s, {}, Engine.DIG_REFILL + 4);
  check('hole refills', s.tiles[2][2] === T.BRICK && s.holes.length === 0);
}

// 2. dig, walk in, get crushed on refill
{
  const s = mk([
    '..........',
    '.&........',
    '.####.....',
    '.####.....',
    '..........'
  ]);
  Engine.tick(s, { digRight: true });
  run(s, { right: true }, 5 * T8);            // pause, step onto the hole, fall in
  const inHole = ptile(s)[0] === 2 && ptile(s)[1] === 2;
  check('player drops into own hole', inHole, `at ${ptile(s)}`);
  run(s, {}, Engine.DIG_REFILL);
  check('refill crushes player', s.status === 'dead', `status=${s.status}`);
}

// 3. dig lets the player descend a level
{
  const s = mk([
    '............',
    '.&..........',
    '.####.......',
    '............',
    '.##########.',
    '............'
  ]);
  Engine.tick(s, { digRight: true });
  run(s, { right: true }, 10 * T8);
  check('dig-through descent', ptile(s)[1] === 3, `y=${ptile(s)[1]}`);
}

// 4. guard chases along a row and catches a still player
{
  const s = mk([
    '..............',
    '.0..........&.',
    '.############.'
  ]);
  run(s, {}, 60 * T8);
  check('guard chases & catches', s.status === 'dead', `status=${s.status} guard=${gtile(s.guards[0])}`);
}

// 4b. spawn grace: a guard sitting on the runner can't kill for a moment
{
  const s = mk([
    '..............',
    '.0&...........',
    '.############.'
  ]);
  run(s, {}, 20);
  check('spawn grace holds', s.status === 'playing', `died after ${s.tick} ticks`);
  run(s, {}, 60);
  check('grace then lethal', s.status === 'dead', `status=${s.status}`);
}

// 5. guard falls into a hole and is held there
{
  const s = mk([
    '.............',
    '.&.0.........',
    '.###########.',
    '.###########.'
  ]);
  Engine.tick(s, { digRight: true });        // hole at (2,2)
  run(s, {}, 20 * T8);
  const g = s.guards[0];
  check('guard trapped in hole', g.inHole || g.dead, `inHole=${g.inHole} dead=${g.dead} at=${gtile(g)}`);
}

// 6. guard trapped when the hole refills dies and reappears
{
  const s = mk([
    '.............',
    '.&.0.........',
    '.###########.',
    '.###########.'
  ]);
  Engine.tick(s, { digRight: true });
  run(s, {}, Engine.DIG_REFILL + 30);
  const g = s.guards[0];
  check('guard survives its own respawn', s.guards.length === 1 && !g.inHole,
        `dead=${g.dead} at=${gtile(g)}`);
}

// 7. guard picks up gold; exit stays shut until it's freed
{
  const s = mk([
    '.............',
    '.&.$.0......S',
    '.###########.'
  ]);
  // player grabs nothing; guard walks left over the gold
  run(s, {}, 40 * T8);
  const g = s.guards[0];
  check('guard carries the gold', g.carrying && !s.revealed, `carrying=${g.carrying} revealed=${s.revealed}`);
}

// 8. the runner can run across a guard settled in a hole, but not while
//    it is climbing back out
{
  const s = mk([
    '..............',
    '.&.0..........',
    '.####.........',
    '.####.........'
  ]);
  Engine.tick(s, { digRight: true });          // hole at (2,2), guard walks in
  run(s, {}, 8 * T8);
  const g = s.guards[0];
  check('guard is settled in the hole', g.inHole && !g.climbing, `inHole=${g.inHole} climbing=${g.climbing}`);
  // walk right over the top — should cross without dying
  run(s, { right: true }, 3 * T8);
  check('runner crosses the trapped guard', s.status === 'playing' && ptile(s)[0] >= 3,
        `status=${s.status} at ${ptile(s)}`);
}

console.log(fails ? `\n${fails} FAILURE(S)` : '\nall mechanics OK');
process.exit(fails ? 1 : 0);
