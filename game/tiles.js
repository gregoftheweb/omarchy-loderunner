.pragma library

// Tile codes stored in the level grid.
var EMPTY  = 0;
var BRICK  = 1;   // diggable wall
var SOLID  = 2;   // concrete — never diggable
var LADDER = 3;
var ROPE   = 4;   // horizontal bar you hang from
var TRAP   = 5;   // false brick — looks solid, you fall straight through

// Marker codes — present only in the source text, lifted out into entity
// lists by the parser and left as EMPTY in the grid.
var GOLD   = 10;
var PLAYER = 11;
var GUARD  = 12;
var EXIT   = 13;  // hidden exit-ladder segment; behaves as EMPTY until revealed

// Canonical charset (matches the widely-used classic Lode Runner level text):
//   space/.  empty      #  brick        @  solid/concrete
//   H  ladder            -  rope/bar     X  trap (false brick)
//   $  gold               &  player      0  guard        S  hidden exit ladder
var CHARS = {
  ".": EMPTY,  " ": EMPTY,
  "#": BRICK,
  "@": SOLID,
  "H": LADDER,
  "-": ROPE,
  "X": TRAP,
  "$": GOLD,
  "&": PLAYER,
  "0": GUARD,
  "S": EXIT
};

function fromChar(ch) {
  return CHARS.hasOwnProperty(ch) ? CHARS[ch] : EMPTY;
}
