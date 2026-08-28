// Level lint: catches a mangled import and flags anything that looks
// unreachable.
//
//   node test/solver.mjs           — check every level
//   node test/solver.mjs 087       — map + reachability for one level
//
// Two passes:
//
//   FAIL  — structural: wrong grid size, no gold / player / exit, or a
//           piece of gold walled off from the player by concrete (which
//           digging can never open). These are import corruption.
//
//   WARN  — a movement flood (walk / climb / rope / fall, plus an
//           optimistic "you can dig down through brick") can't reach a
//           piece of gold or can't reach the top row. The flood is
//           deliberately generous, so a WARN means "look at this by
//           hand", not "provably impossible". Guards are not modelled.
//
// A full brute-force solver for the classic 150 is a much bigger rock
// (Lode Runner solving is PSPACE-hard in general); this is the cheap
// filter that still catches a broken level file.

import fs from 'fs';
import path from 'path';

const root = path.join(import.meta.dirname, '..');
const gdir = path.join(root, 'game');
const strip = (s) => s.replace(/^\.pragma library\s*$/m, '').replace(/^\.import .*$/gm, '');
const read = (p) => strip(fs.readFileSync(p, 'utf8'));

const T = new Function(read(path.join(gdir, 'tiles.js')) +
  ';return {EMPTY,BRICK,SOLID,LADDER,ROPE,TRAP,GOLD,PLAYER,GUARD,EXIT,fromChar};')();
const Level = new Function('T', read(path.join(gdir, 'level.js')) + ';return {parse};')(T);
const FILES = new Function(read(path.join(gdir, 'levels.js')) + ';return FILES;')();

const W = 28, H = 16;

const isConcrete = (t) => t === T.SOLID;
const isSolid = (t) => t === T.BRICK || t === T.SOLID;
const isStand = (t) => t === T.BRICK || t === T.SOLID || t === T.LADDER;

// exit ladders (S) fold in as real ladders — by the time you need them
// every piece of gold is gone
function grid(lvl) {
  const g = lvl.tiles.map((row) => row.slice());
  for (const e of lvl.exitCells) if (g[e.y]) g[e.y][e.x] = T.LADDER;
  return g;
}
const at = (g, x, y) =>
  y < 0 ? T.EMPTY : (x < 0 || x >= W || y >= H) ? T.SOLID : g[y][x];

// Flood the tiles the runner can occupy from (sx,sy).
//   dig=false  strict movement (walk/climb/rope/fall)
//   dig=true   also: from firm footing you may pass diagonally down into
//              a brick and keep going down through brick — an optimistic
//              stand-in for a dig staircase. Concrete still blocks.
function flood(g, sx, sy, dig) {
  const seen = new Uint8Array(W * H);
  const st = [[sx, sy]];
  seen[sy * W + sx] = 1;
  const add = (x, y) => {
    if (x < 0 || x >= W || y < 0 || y >= H || seen[y * W + x]) return;
    seen[y * W + x] = 1;
    st.push([x, y]);
  };
  while (st.length) {
    const [x, y] = st.pop();
    const here = at(g, x, y);
    const passHere = dig ? !isConcrete(here) : !isSolid(here);
    if (!passHere) continue;

    const below = at(g, x, y + 1);
    const support = isStand(below) || here === T.LADDER || here === T.ROPE ||
      (dig && below === T.BRICK);

    if (!support) {
      if (dig ? !isConcrete(below) : !isSolid(below)) add(x, y + 1);
      continue;
    }

    const clear = (t) => dig ? !isConcrete(t) : !isSolid(t);
    if (clear(at(g, x - 1, y))) add(x - 1, y);
    if (clear(at(g, x + 1, y))) add(x + 1, y);
    if (here === T.LADDER && !isSolid(at(g, x, y - 1))) add(x, y - 1);
    if (!isSolid(below) &&
        (here === T.LADDER || below === T.LADDER || here === T.ROPE || !isStand(below)))
      add(x, y + 1);

    if (dig && here !== T.LADDER && here !== T.ROPE) {
      for (const d of [-1, 1]) {
        if (isConcrete(at(g, x + d, y))) continue;
        const t = at(g, x + d, y + 1);
        if (t === T.BRICK || t === T.EMPTY) add(x + d, y + 1);
      }
    }
  }
  return seen;
}

const topReached = (seen, lvl) => {
  for (let x = 0; x < W; x++) if (seen[x]) return true;
  return lvl.exitCells.some((c) => seen[c.y * W + c.x]);
};

function check(file) {
  const lvl = Level.parse(fs.readFileSync(path.join(root, 'levels', file), 'utf8'));
  const fails = [], warns = [];

  if (lvl.width !== W || lvl.height !== H)
    fails.push(`grid ${lvl.width}x${lvl.height}, want ${W}x${H}`);
  if (!lvl.gold.length) fails.push('no gold');
  if (!lvl.guardStarts.length) warns.push('no guards');
  if (fails.length) return { file, fails, warns, lvl };

  const g = grid(lvl);
  const s = lvl.playerStart;

  // structural: 4-connected cavity, only concrete and the border are
  // walls. Brick is diggable, so it never truly seals anything; if a
  // piece of gold isn't in the player's cavity the level file is broken.
  const cReach = new Uint8Array(W * H);
  {
    const st = [[s.x, s.y]];
    cReach[s.y * W + s.x] = 1;
    while (st.length) {
      const [x, y] = st.pop();
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        if (cReach[ny * W + nx] || isConcrete(at(g, nx, ny))) continue;
        cReach[ny * W + nx] = 1;
        st.push([nx, ny]);
      }
    }
  }
  const sealed = lvl.gold.filter((c) => !cReach[c.y * W + c.x]);
  if (sealed.length)
    fails.push(`gold walled off by concrete: ${sealed.map((c) => `(${c.x},${c.y})`).join(' ')}`);
  if (!topReached(cReach, lvl)) fails.push('no route to the top even through brick');

  // movement reachability
  const digF = flood(g, s.x, s.y, true);
  const walkF = flood(g, s.x, s.y, false);
  const reach = digF.map((v, i) => v || walkF[i]);
  const unreach = lvl.gold.filter((c) => !reach[c.y * W + c.x]);
  if (unreach.length && !sealed.length)
    warns.push(`gold maybe unreachable: ${unreach.map((c) => `(${c.x},${c.y})`).join(' ')}`);
  if (!topReached(digF, lvl) && !topReached(walkF, lvl) && !fails.length)
    warns.push('escape to the top not found by the flood');

  const needsDig = lvl.gold.some((c) => reach[c.y * W + c.x] && !walkF[c.y * W + c.x]);
  return { file, fails, warns, lvl, reach, needsDig };
}

// ---- one-level map ----
const only = process.argv[2];
if (only) {
  const file = only.endsWith('.txt') ? only : only.padStart(3, '0') + '.txt';
  const r = check(file);
  const g = grid(r.lvl);
  console.log(`\n${file}  ${r.lvl.width}x${r.lvl.height}  gold=${r.lvl.gold.length}  guards=${r.lvl.guardStarts.length}  exitCells=${r.lvl.exitCells.length}\n`);
  for (let y = 0; y < H; y++) {
    let line = '';
    for (let x = 0; x < W; x++) {
      const t = g[y][x];
      const reach = r.reach && r.reach[y * W + x];
      const gold = r.lvl.gold.some((c) => c.x === x && c.y === y);
      let ch = t === T.BRICK ? '#' : t === T.SOLID ? '@' : t === T.LADDER ? 'H' : t === T.ROPE ? '-' : ' ';
      if (gold) ch = reach ? '$' : '!';
      else if (ch === ' ' && reach) ch = '·';
      line += ch;
    }
    console.log(line);
  }
  console.log('\n· reachable   ! unreached gold');
  if (r.fails.length) console.log('\nFAIL:\n  ' + r.fails.join('\n  '));
  if (r.warns.length) console.log('\nWARN:\n  ' + r.warns.join('\n  '));
  if (!r.fails.length && !r.warns.length) console.log('\nOK' + (r.needsDig ? ' (needs digging)' : ''));
  process.exit(r.fails.length ? 1 : 0);
}

let nFail = 0, nWarn = 0, nDig = 0;
for (const file of FILES) {
  const r = check(file);
  if (r.needsDig) nDig++;
  if (r.fails.length) {
    nFail++;
    console.log(`FAIL  ${file}`);
    for (const p of r.fails) console.log(`        ${p}`);
  } else if (r.warns.length) {
    nWarn++;
    console.log(`warn  ${file}`);
    for (const p of r.warns) console.log(`        ${p}`);
  }
}
console.log(`\n${FILES.length} levels · ${nDig} need digging · ${nWarn} warn · ${nFail ? nFail + ' FAILED' : 'no structural failures'}`);
process.exit(nFail ? 1 : 0);
