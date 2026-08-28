.pragma library
.import "tiles.js" as T

// ---------------------------------------------------------------------------
// Pure game logic. No QML, no rendering. `tick(state, input)` advances one
// frame; the view mirrors `state` afterwards.
//
// Positions are in SUBCELLS: SUB subcells per tile. All speeds divide SUB, so
// actors land exactly on tile boundaries and never tunnel through a wall.
// ---------------------------------------------------------------------------

var SUB   = 8;    // subcells per tile
var RUN   = 1;    // horizontal subcells / tick
var CLIMB = 1;    // vertical subcells / tick on ladders
var FALL  = 1;    // vertical subcells / tick in the air

var DIG_REFILL   = 150;  // ticks a dug hole stays open
var DIG_WARN     = 45;   // ticks before refill that the brick starts reforming
var DIG_POSE     = 8;    // ticks the dig animation shows
var GUARD_SKIP   = 4;    // guards sit out 1 tick in this many (→ ~0.75x speed)
var GUARD_INHOLE = 26;   // ticks a guard flails in a hole before climbing out
var GUARD_REBORN = 12;   // ticks a dead guard waits before dropping back in

function k(x, y) { return x + "," + y; }
function sign(n) { return n < 0 ? -1 : (n > 0 ? 1 : 0); }

function createState(level) {
  var exitSet = {};
  for (var i = 0; i < level.exitCells.length; i++)
    exitSet[k(level.exitCells[i].x, level.exitCells[i].y)] = true;

  var goldSet = {};
  for (var j = 0; j < level.gold.length; j++)
    goldSet[k(level.gold[j].x, level.gold[j].y)] = true;

  var tiles = [];
  for (var y = 0; y < level.tiles.length; y++) tiles.push(level.tiles[y].slice());

  var guards = [];
  for (var gi = 0; gi < level.guardStarts.length; gi++) {
    var gs = level.guardStarts[gi];
    guards.push({
      id: gi,
      px: gs.x * SUB, py: gs.y * SUB,
      spawnX: gs.x, spawnY: gs.y,
      face: 1, hdir: 0, vdir: 0,
      onLadder: false, onRope: false, falling: false,
      inHole: false, holeClock: 0,
      dead: false, rebornClock: 0,
      carrying: false, frame: 0
    });
  }

  return {
    w: level.width,
    h: level.height,
    tiles: tiles,
    exitCells: level.exitCells,
    exitSet: exitSet,
    goldSet: goldSet,
    gold: level.gold.slice(),
    goldTotal: level.gold.length,
    goldLeft: level.gold.length,   // still lying in the level
    goldCarried: 0,                // in a guard's hands
    revealed: level.gold.length === 0,
    status: "playing",              // "playing" | "won" | "dead"
    tick: 0,
    tilesRev: 0,
    holes: [],
    guards: guards,
    player: {
      px: level.playerStart.x * SUB,
      py: level.playerStart.y * SUB,
      spawnX: level.playerStart.x, spawnY: level.playerStart.y,
      face: 1, hdir: 0, vdir: 0,
      moving: false, onRope: false, onLadder: false, falling: false,
      digging: 0, frame: 0
    }
  };
}

function rawTile(s, tx, ty) {
  if (ty < 0 || tx < 0 || tx >= s.w || ty >= s.h) return T.SOLID;
  return s.tiles[ty][tx];
}

// Effective tile for movement queries (folds in the revealed exit ladder).
function tileAt(s, tx, ty) {
  if (ty < 0) return T.EMPTY;
  if (tx < 0 || tx >= s.w || ty >= s.h) return T.SOLID;
  if (s.revealed && s.exitSet[k(tx, ty)]) return T.LADDER;
  return s.tiles[ty][tx];
}

function solid(t)     { return t === T.BRICK || t === T.SOLID; }
function standable(t) { return t === T.BRICK || t === T.SOLID || t === T.LADDER; }

function guardAt(s, tx, ty, skipId) {
  for (var i = 0; i < s.guards.length; i++) {
    var g = s.guards[i];
    if (g.id === skipId || g.dead) continue;
    if (Math.round(g.px / SUB) === tx && Math.round(g.py / SUB) === ty) return g;
  }
  return null;
}

// ---- shared physics --------------------------------------------------------
// Advance one actor by one tick given a movement intent. `who` is "player" or
// "guard" (guards are blocked by each other and can't leave a hole normally).
function physics(s, a, intent, who) {
  a.moving = false;
  a.falling = false;

  var xa = (a.px % SUB) === 0;
  var ya = (a.py % SUB) === 0;

  if (!xa) {
    a.px += a.hdir * RUN;
    a.moving = true;
    if ((a.px % SUB) === 0) a.hdir = 0;
    return;
  }
  if (!ya && a.vdir !== 0) {
    a.py += a.vdir * CLIMB;
    a.moving = true;
    if ((a.py % SUB) === 0) a.vdir = 0;
    return;
  }

  var tx = a.px / SUB;
  var ty = Math.floor(a.py / SUB);
  var grid = (a.py % SUB) === 0;

  var here  = grid ? tileAt(s, tx, ty) : T.EMPTY;
  var below = tileAt(s, tx, ty + 1);

  var onLadder = grid && here === T.LADDER;
  var onRope   = grid && here === T.ROPE;
  var footing  = grid && standable(below);
  // a guard also rests on the head of another guard
  if (who === "guard" && grid && !footing && guardAt(s, tx, ty + 1, a.id)) footing = true;
  var supported = footing || onLadder || onRope;

  a.onLadder = onLadder;
  a.onRope = onRope;

  if (!supported) {
    a.px = Math.round(a.px / SUB) * SUB;
    a.py += FALL;
    a.moving = true;
    a.falling = true;
    return;
  }

  // climb up
  if (intent.up && here === T.LADDER && !solid(tileAt(s, tx, ty - 1))
      && !(who === "guard" && guardAt(s, tx, ty - 1, a.id))) {
    a.vdir = -1;
    a.py += a.vdir * CLIMB;
    a.moving = true;
    if ((a.py % SUB) === 0) a.vdir = 0;
    return;
  }
  // climb / step down
  if (intent.down) {
    var d = tileAt(s, tx, ty + 1);
    if ((here === T.LADDER || d === T.LADDER) && !solid(d)
        && !(who === "guard" && guardAt(s, tx, ty + 1, a.id))) {
      a.vdir = 1;
      a.py += a.vdir * CLIMB;
      a.moving = true;
      if ((a.py % SUB) === 0) a.vdir = 0;
      return;
    }
    if (onRope) { a.py += FALL; a.moving = true; a.falling = true; return; }
  }

  var dir = intent.left ? -1 : (intent.right ? 1 : 0);
  if (dir !== 0) {
    a.face = dir;
    var ahead = tileAt(s, tx + dir, ty);
    var blockedByGuard = who === "guard" && guardAt(s, tx + dir, ty, a.id);
    if (!solid(ahead) && !blockedByGuard) {
      a.hdir = dir;
      a.px += dir * RUN;
      a.moving = true;
      if ((a.px % SUB) === 0) a.hdir = 0;
    }
  }
}

// ---- digging --------------------------------------------------------------
function tryDig(s, hx, hy, sideX, sideY) {
  if (hx < 0 || hx >= s.w || hy < 0 || hy >= s.h) return false;
  if (s.tiles[hy][hx] !== T.BRICK) return false;          // only real brick
  if (solid(tileAt(s, sideX, sideY))) return false;       // need a clear space beside the digger
  if (solid(tileAt(s, hx, hy - 1))) return false;         // and clear above the target
  for (var i = 0; i < s.holes.length; i++)
    if (s.holes[i].x === hx && s.holes[i].y === hy) return false;
  s.tiles[hy][hx] = T.EMPTY;
  s.tilesRev++;
  s.holes.push({ x: hx, y: hy, timer: DIG_REFILL });
  return true;
}

function updateHoles(s) {
  for (var i = s.holes.length - 1; i >= 0; i--) {
    var h = s.holes[i];
    h.timer--;
    if (h.timer > 0) continue;

    s.tiles[h.y][h.x] = T.BRICK;
    s.tilesRev++;
    s.holes.splice(i, 1);

    // crush whatever is standing in the hole
    var p = s.player;
    if (Math.round(p.px / SUB) === h.x && Math.round(p.py / SUB) === h.y)
      s.status = "dead";
    for (var gi = 0; gi < s.guards.length; gi++) {
      var g = s.guards[gi];
      if (g.dead) continue;
      if (Math.round(g.px / SUB) === h.x && Math.round(g.py / SUB) === h.y)
        killGuard(s, g);
    }
  }
}

// ---- guards --------------------------------------------------------------
function killGuard(s, g) {
  if (g.carrying) dropGold(s, Math.round(g.px / SUB), Math.round(g.py / SUB));
  g.dead = true;
  g.carrying = false;
  g.inHole = false;
  g.rebornClock = GUARD_REBORN;
}

function respawnGuard(s, g) {
  // drop back in from the top, near the guard's original column
  var col = g.spawnX;
  var row = 0;
  for (var scan = 0; scan < s.w; scan++) {
    var c = (scan % 2 === 0) ? col + (scan >> 1) : col - (scan >> 1) - 1;
    if (c < 0 || c >= s.w) continue;
    if (!solid(rawTile(s, c, 0)) && !guardAt(s, c, 0, g.id)) { col = c; break; }
  }
  g.px = col * SUB; g.py = row * SUB;
  g.hdir = g.vdir = 0;
  g.dead = false; g.inHole = false; g.holeClock = 0;
}

function dropGold(s, x, y) {
  // let the freed gold settle onto the nearest floor at/below (x,y)
  var ty = y;
  while (ty < s.h - 1 && !standable(rawTile(s, x, ty + 1)) && rawTile(s, x, ty) === T.EMPTY) ty++;
  while (ty > 0 && solid(rawTile(s, x, ty))) ty--;
  s.goldSet[k(x, ty)] = true;
  s.gold.push({ x: x, y: ty });
  s.goldLeft++;
  s.goldCarried = Math.max(0, s.goldCarried - 1);
}

function guardIntent(s, g) {
  var out = { up: false, down: false, left: false, right: false };
  var gx = Math.round(g.px / SUB), gy = Math.round(g.py / SUB);
  var p = s.player;
  var pxT = Math.round(p.px / SUB), pyT = Math.round(p.py / SUB);
  var here = tileAt(s, gx, gy);

  if (pyT < gy) {
    if (here === T.LADDER && !solid(tileAt(s, gx, gy - 1))) { out.up = true; return out; }
  } else if (pyT > gy) {
    var d = tileAt(s, gx, gy + 1);
    if (d === T.LADDER) { out.down = true; return out; }
    if (here === T.ROPE && !standable(d)) { out.down = true; return out; }
  }

  var dir = bestDir(s, gx, gy, pxT, pyT);
  if (dir < 0) out.left = true;
  else if (dir > 0) out.right = true;
  return out;
}

// Scan the guard's row both ways for the nearest column offering a route
// toward the player's row; head the shorter way.
function bestDir(s, gx, gy, px, py) {
  if (py === gy) return sign(px - gx);
  var wantDown = py > gy;
  var bestDist = 1e9, bestD = sign(px - gx) || 1;

  for (var s2 = 0; s2 < 2; s2++) {
    var d = s2 === 0 ? -1 : 1;
    for (var dist = 1; dist < s.w; dist++) {
      var cx = gx + d * dist;
      if (cx < 0 || cx >= s.w) break;
      var cell = tileAt(s, cx, gy);
      if (solid(cell)) break;
      var floor = tileAt(s, cx, gy + 1);
      var walkable = standable(floor) || cell === T.LADDER || cell === T.ROPE;

      if (wantDown) {
        if (tileAt(s, cx, gy + 1) === T.LADDER || !standable(floor)) {
          if (dist < bestDist) { bestDist = dist; bestD = d; }
          if (!standable(floor)) break; // a gap: guard would fall here anyway
        }
      } else {
        if (cell === T.LADDER && !solid(tileAt(s, cx, gy - 1))) {
          if (dist < bestDist) { bestDist = dist; bestD = d; }
        }
      }
      if (!walkable) break;
    }
  }
  return bestD;
}

function stepGuard(s, g) {
  if (g.dead) {
    if (--g.rebornClock <= 0) respawnGuard(s, g);
    return;
  }

  var gx = Math.round(g.px / SUB), gy = Math.round(g.py / SUB);
  var aligned = (g.px % SUB) === 0 && (g.py % SUB) === 0;

  // in a hole: flail, then hop out
  if (g.inHole) {
    if (--g.holeClock <= 0) {
      var outX = gx + g.face;
      if (!solid(tileAt(s, outX, gy - 1)) && !solid(tileAt(s, outX, gy))) {
        g.px = outX * SUB; g.py = (gy - 1) * SUB;
      } else if (!solid(tileAt(s, gx, gy - 1))) {
        g.py = (gy - 1) * SUB;
      }
      g.inHole = false;
    }
    return;
  }

  physics(s, g, aligned ? guardIntent(s, g) : {}, "guard");

  // landed in an open hole?
  var ngx = Math.round(g.px / SUB), ngy = Math.round(g.py / SUB);
  if ((g.px % SUB) === 0 && (g.py % SUB) === 0) {
    for (var i = 0; i < s.holes.length; i++) {
      if (s.holes[i].x === ngx && s.holes[i].y === ngy) {
        g.inHole = true;
        g.holeClock = GUARD_INHOLE;
        break;
      }
    }
    // pick up gold
    if (!g.carrying && s.goldSet[k(ngx, ngy)]) {
      delete s.goldSet[k(ngx, ngy)];
      s.gold = s.gold.filter(function (gg) { return !(gg.x === ngx && gg.y === ngy); });
      s.goldLeft--;
      s.goldCarried++;
      g.carrying = true;
    }
  }
  if (g.moving && !g.falling) g.frame = (g.frame + 1) & 1023;
}

// ---- main tick ----------------------------------------------------------
function tick(s, input) {
  if (s.status !== "playing") return s;
  s.tick++;
  var p = s.player;
  if (p.digging > 0) p.digging--;

  var xa = (p.px % SUB) === 0;
  var ya = (p.py % SUB) === 0;
  var tx = p.px / SUB;
  var ty = Math.floor(p.py / SUB);
  var grid = (p.py % SUB) === 0;
  var here  = grid ? tileAt(s, tx, ty) : T.EMPTY;
  var footing = grid && standable(tileAt(s, tx, ty + 1));

  // dig — only when aligned, standing on something, not on a ladder/rope
  if ((input.digLeft || input.digRight) && xa && ya && footing
      && here !== T.LADDER && here !== T.ROPE) {
    var dx = input.digLeft ? -1 : 1;
    if (tryDig(s, tx + dx, ty + 1, tx + dx, ty)) {
      p.face = dx;
      p.digging = DIG_POSE;
      finishPlayer(s);
      stepGuards(s);
      updateHoles(s);
      checkDeath(s);
      return s;
    }
  }

  physics(s, p, p.digging > 0 ? {} : input, "player");
  finishPlayer(s);
  stepGuards(s);
  updateHoles(s);
  checkDeath(s);
  return s;
}

function stepGuards(s) {
  for (var i = 0; i < s.guards.length; i++) {
    var g = s.guards[i];
    if (!g.dead && !g.inHole && (s.tick % GUARD_SKIP === 0)) continue; // slower than the runner
    stepGuard(s, g);
  }
}

function finishPlayer(s) {
  var p = s.player;
  if ((p.px % SUB) === 0 && (p.py % SUB) === 0) {
    var key = k(p.px / SUB, p.py / SUB);
    if (s.goldSet[key]) {
      delete s.goldSet[key];
      s.goldLeft--;
      s.gold = s.gold.filter(function (g) { return k(g.x, g.y) !== key; });
    }
  }
  if (s.goldLeft <= 0 && s.goldCarried <= 0) s.revealed = true;
  if (p.moving && !p.falling) p.frame = (p.frame + 1) & 1023;
  if (s.revealed && p.py <= 0) { p.py = 0; s.status = "won"; }
}

function checkDeath(s) {
  if (s.status !== "playing") return;
  var p = s.player;
  var pxT = Math.round(p.px / SUB), pyT = Math.round(p.py / SUB);
  for (var i = 0; i < s.guards.length; i++) {
    var g = s.guards[i];
    if (g.dead) continue;
    if (Math.abs(g.px - p.px) < SUB && Math.abs(g.py - p.py) < SUB) {
      s.status = "dead";
      return;
    }
  }
}
