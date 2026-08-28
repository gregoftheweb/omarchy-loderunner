.pragma library
.import "tiles.js" as T

// Parse an ASCII level into a structured object:
//   { width, height, tiles[y][x], gold[], guardStarts[], exitCells[], playerStart }
// Unknown characters become EMPTY. Rows shorter than the widest row are padded
// with EMPTY. Trailing blank lines are trimmed.
function parse(text) {
  var lines = String(text).replace(/\r/g, "").split("\n");
  while (lines.length && lines[lines.length - 1].trim() === "")
    lines.pop();

  var height = lines.length;
  var width = 0;
  for (var i = 0; i < height; i++)
    width = Math.max(width, lines[i].length);

  var tiles = [];
  var gold = [];
  var guardStarts = [];
  var exitCells = [];
  var playerStart = { x: 1, y: 1 };

  for (var y = 0; y < height; y++) {
    var line = lines[y];
    var row = [];
    for (var x = 0; x < width; x++) {
      var ch = x < line.length ? line.charAt(x) : ".";
      var code = T.fromChar(ch);
      switch (code) {
      case T.GOLD:   gold.push({ x: x, y: y });        row.push(T.EMPTY); break;
      case T.PLAYER: playerStart = { x: x, y: y };     row.push(T.EMPTY); break;
      case T.GUARD:  guardStarts.push({ x: x, y: y }); row.push(T.EMPTY); break;
      case T.EXIT:   exitCells.push({ x: x, y: y });   row.push(T.EMPTY); break;
      default:       row.push(code);
      }
    }
    tiles.push(row);
  }

  return {
    width: width,
    height: height,
    tiles: tiles,
    gold: gold,
    guardStarts: guardStarts,
    exitCells: exitCells,
    playerStart: playerStart
  };
}
