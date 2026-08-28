.pragma library

// Tile codes stored in the level grid.
var EMPTY  = 0;
var BRICK  = 1;   // diggable wall (dig mechanic lands in v0.3)
var SOLID  = 2;   // concrete — never diggable
var LADDER = 3;
var ROPE   = 4;   // horizontal bar you hang from

// Marker codes — present only in the source text, lifted out into entity
// lists by the parser and left as EMPTY in the grid.
var GOLD   = 5;
var PLAYER = 6;
var GUARD  = 7;
var EXIT   = 8;   // hidden exit-ladder segment; behaves as EMPTY until revealed

var CHARS = {
  ".": EMPTY,  " ": EMPTY,
  "#": BRICK,
  "@": SOLID,
  "H": LADDER,
  "-": ROPE,
  "$": GOLD,
  "&": PLAYER,
  "0": GUARD,
  "S": EXIT
};

function fromChar(ch) {
  return CHARS.hasOwnProperty(ch) ? CHARS[ch] : EMPTY;
}
