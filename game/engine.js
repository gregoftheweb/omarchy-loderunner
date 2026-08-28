.pragma library
.import "tiles.js" as T

// ---------------------------------------------------------------------------
// Pure game logic. No QML, no rendering. `tick(state, input)` advances one
// frame; the view mirrors `state` afterwards.
//
// Positions are in SUBCELLS: SUB subcells per tile. All speeds divide SUB, so
// the player lands exactly on tile boundaries and never tunnels through a wall.
// ---------------------------------------------------------------------------

var SUB   = 8;   // subcells per tile
var RUN   = 1;   // horizontal subcells / tick
var CLIMB = 1;   // vertical subcells / tick on ladders
var FALL  = 1;   // vertical subcells / tick in the air

function k(x, y) { return x + "," + y; }

function createState(level) {
  var exitSet = {};
  for (var i = 0; i < level.exitCells.length; i++)
    exitSet[k(level.exitCells[i].x, level.exitCells[i].y)] = true;

  var goldSet = {};
  for (var j = 0; j < level.gold.length; j++)
    goldSet[k(level.gold[j].x, level.gold[j].y)] = true;

  return {
    w: level.width,
    h: level.height,
    tiles: level.tiles,            // read-only until digging (v0.3)
    exitCells: level.exitCells,
    exitSet: exitSet,
    goldSet: goldSet,
    gold: level.gold.slice(),
    goldTotal: level.gold.length,
    goldLeft: level.gold.length,
    revealed: level.gold.length === 0,
    status: "playing",             // -> "won"
    player: {
      px: level.playerStart.x * SUB,
      py: level.playerStart.y * SUB,
      face: 1,                     // -1 left, +1 right
      hdir: 0,                     // committed horizontal step in progress
      vdir: 0,                     // committed vertical step in progress
      moving: false,
      onRope: false,
      onLadder: false,
      falling: false,
      frame: 0
    }
  };
}

function tileAt(s, tx, ty) {
  if (ty < 0) return T.EMPTY;                       // open sky above the level
  if (tx < 0 || tx >= s.w || ty >= s.h) return T.SOLID;  // walls all around
  if (s.revealed && s.exitSet[k(tx, ty)]) return T.LADDER;
  return s.tiles[ty][tx];
}

function solid(t)     { return t === T.BRICK || t === T.SOLID; }
function standable(t) { return t === T.BRICK || t === T.SOLID || t === T.LADDER; }

function tick(s, input) {
  if (s.status !== "playing") return s;
  var p = s.player;
  p.moving = false;
  p.falling = false;

  var xa = (p.px % SUB) === 0;
  var ya = (p.py % SUB) === 0;

  // 1. Finish a horizontal step already underway.
  if (!xa) {
    p.px += p.hdir * RUN;
    p.moving = true;
    if ((p.px % SUB) === 0) p.hdir = 0;
    return settle(s);
  }

  // 2. Finish a vertical climb already underway.
  if (!ya && p.vdir !== 0) {
    p.py += p.vdir * CLIMB;
    p.moving = true;
    if ((p.py % SUB) === 0) p.vdir = 0;
    return settle(s);
  }

  var tx = p.px / SUB;
  var ty = Math.floor(p.py / SUB);
  var onGrid = (p.py % SUB) === 0;

  var here  = onGrid ? tileAt(s, tx, ty) : T.EMPTY;
  var below = tileAt(s, tx, ty + 1);

  var onLadder = onGrid && here === T.LADDER;
  var onRope   = onGrid && here === T.ROPE;
  var footing  = onGrid && standable(below);
  var supported = footing || onLadder || onRope;

  p.onLadder = onLadder;
  p.onRope = onRope;

  // 3. Airborne — fall straight down. Alignment is re-checked every tick, so a
  //    solid or a ladder/rope in the next cell stops the fall cleanly.
  if (!supported) {
    p.px = Math.round(p.px / SUB) * SUB;
    p.py += FALL;
    p.moving = true;
    p.falling = true;
    return settle(s);
  }

  // 4. Grounded and aligned — act on input.
  if (input.up && here === T.LADDER && !solid(tileAt(s, tx, ty - 1))) {
    p.vdir = -1;
    p.py += p.vdir * CLIMB;
    p.moving = true;
    if ((p.py % SUB) === 0) p.vdir = 0;
    return settle(s);
  }

  if (input.down) {
    var d = tileAt(s, tx, ty + 1);
    if ((here === T.LADDER || d === T.LADDER) && !solid(d)) {
      p.vdir = 1;
      p.py += p.vdir * CLIMB;
      p.moving = true;
      if ((p.py % SUB) === 0) p.vdir = 0;
      return settle(s);
    }
    if (onRope) {                 // let go and drop
      p.py += FALL;
      p.moving = true;
      p.falling = true;
      return settle(s);
    }
  }

  var dir = input.left ? -1 : (input.right ? 1 : 0);
  if (dir !== 0) {
    p.face = dir;
    if (!solid(tileAt(s, tx + dir, ty))) {
      p.hdir = dir;
      p.px += dir * RUN;
      p.moving = true;
      if ((p.px % SUB) === 0) p.hdir = 0;
    }
  }

  return settle(s);
}

function settle(s) {
  var p = s.player;

  if ((p.px % SUB) === 0 && (p.py % SUB) === 0) {
    var key = k(p.px / SUB, p.py / SUB);
    if (s.goldSet[key]) {
      delete s.goldSet[key];
      s.goldLeft--;
      s.gold = s.gold.filter(function (g) { return k(g.x, g.y) !== key; });
      if (s.goldLeft <= 0) s.revealed = true;
    }
  }

  if (p.moving && !p.falling) p.frame = (p.frame + 1) & 1023;

  if (s.revealed && p.py <= 0) {
    p.py = 0;
    s.status = "won";
  }

  return s;
}
