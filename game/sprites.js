.pragma library

// Pixel sprites as ASCII bitmaps ('X' = filled). 10 wide x 12 tall — the size
// the original Apple II Lode Runner used. Rendered as a white silhouette on the
// dark board (inverted silhouette, like the original). Poses face RIGHT; the
// renderer mirrors for left.
//
// The run is a 4-frame cycle: one smooth stride that, repeated, reads as a
// stride with the other leg (the original's trick — you can't tell the legs
// apart in silhouette).

var RUNNER = {
  run: [
    [ // 0 — right leg reaching forward, trailing arm back
      "...XX.....",
      "...XXX....",
      "...XX.....",
      "..XXXX....",
      "XXXXXX....",
      "..XXXX.X..",
      "..XXXXXX..",
      "..XXXX....",
      "..XX.X....",
      ".XX..XX...",
      "XX....XX..",
      ".......XX."
    ],
    [ // 1 — passing, weight forward
      "...XX.....",
      "...XXX....",
      "...XX.....",
      "..XXXX....",
      ".XXXXXX...",
      "..XXXXXX..",
      "..XXXX....",
      "..XXXX....",
      "..XXXX....",
      "...XXX....",
      "..XX.XX...",
      ".XX...XX.."
    ],
    [ // 2 — left leg reaching forward, leading arm up
      "...XX.....",
      "...XXX....",
      "...XX.....",
      "..XXXX....",
      "..XXXX.XX.",
      "..XXXXXX..",
      "X.XXXX....",
      "..XXXX....",
      "..XX.XX...",
      "..XX..XX..",
      ".XX....X..",
      "XX.....XX."
    ],
    [ // 3 — passing, weight back
      "...XX.....",
      "...XXX....",
      "...XX.....",
      "..XXXX....",
      "..XXXXXX..",
      ".XXXXXX...",
      "..XXXX....",
      "..XXXX....",
      "..XXXX....",
      "..XXX.....",
      ".XX.XX....",
      "XX...XX..."
    ]
  ],

  climb: [
    [ // reach: right hand high, left foot up
      "...XX.....",
      "...XXX....",
      "...XX.....",
      "X..XXX....",
      ".X.XXX.X..",
      "...XXX.X..",
      "...XXX....",
      "..XXXXX...",
      ".X.XXX....",
      ".X.XXX.X..",
      "...XXX.X..",
      "..XX..X..."
    ],
    [ // reach: left hand high, right foot up
      "...XX.....",
      "...XXX....",
      "...XX.....",
      "..XXX..X..",
      "..XXX.X...",
      "X..XXX....",
      "X..XXX....",
      "..XXXXX...",
      "...XXX.X..",
      "..XXX.X...",
      "X..XXX....",
      "..X..XX..."
    ]
  ],

  fall: [
    [
      "..X.XX.X..",
      "...XXX....",
      "X..XXX..X.",
      ".X.XXX.X..",
      "...XXX....",
      "..XXXXX...",
      "..XXXXX...",
      "..XXXX....",
      "..XXXX....",
      "..XX.XX...",
      ".XX...XX..",
      "XX.....X.."
    ]
  ],

  // dig pose (v0.3) — arms swung down to one side
  dig: [
    [
      "...XX.....",
      "...XXX....",
      "...XX.....",
      "..XXXX....",
      "..XXXXX...",
      "..XXXXXXX.",
      "..XXXXXXXX",
      "..XXXX....",
      "..XX.XX...",
      ".XX...XX..",
      ".X.....X..",
      "XX.....XX."
    ]
  ]
};

// Guard — heavier build, slight hunch. Used for the title scene now, the real
// enemies in bite 4.
var GUARD = {
  idle: [
    [
      "...XX.....",
      "...XXX....",
      "..X..X....",
      "..XXXX....",
      ".XXXXXX...",
      ".XXXXXX...",
      "..XXXX....",
      "..XXXX....",
      "..XX.XX...",
      ".XX...XX..",
      ".XX...XX..",
      "XXX...XXX."
    ]
  ],
  run: [
    [
      "...XX.....",
      "...XXX....",
      "..X..X....",
      "..XXXX....",
      "XXXXXX....",
      ".XXXXX.X..",
      ".XXXXXXX..",
      ".XXXX.....",
      ".XX.XX....",
      "XX...XX...",
      "X.....XX..",
      "......XX.."
    ],
    [
      "...XX.....",
      "...XXX....",
      "..X..X....",
      "..XXXX....",
      "..XXXXXX..",
      ".XXXXXX...",
      ".XXXXX....",
      ".XXXX.....",
      ".XXXX.....",
      "..XXX.....",
      ".XX.XX....",
      "XX...XX..."
    ]
  ]
};
