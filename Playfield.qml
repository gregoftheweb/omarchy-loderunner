// The game. Renders a level and runs the loop; LodeRunner.qml feeds it keys
// via keyDown()/keyUp(). Emits finished() when the level is cleared and quit()
// when the player is out of lives (or asks to leave a game-over screen).
import QtQuick
import "game/engine.js" as Engine
import "game/level.js" as LevelParser
import "game/sprites.js" as Sprites

Item {
  id: pf
  property var manifest: null
  property string monoFont: "monospace"

  property string levelText: ""
  property int levelIndex: 0
  property int levelCount: 1

  signal finished()
  signal quit()

  readonly property int subPerTile: 8

  readonly property color bg:        "#05070d"
  readonly property color brick:     "#c8523c"
  readonly property color brickDark: "#5f231a"
  readonly property color solid:     "#7d8798"
  readonly property color solidDark: "#4b5361"
  readonly property color ladderInk: "#6de1d2"
  readonly property color ropeInk:   "#d9a441"
  readonly property color goldInk:   "#f4c542"
  readonly property color goldDark:  "#8a6410"
  readonly property color runnerInk: "#f2f0e6"
  readonly property color guardInk:  "#ff5db1"
  readonly property color exitInk:   "#8affc8"

  // --- run state ---
  property var state: null
  property int lives: 5
  property bool won: false
  property bool gameOver: false
  property int dyingClock: 0

  // --- mirrored render fields (updated each tick) ---
  property int px: 0
  property int py: 0
  property int face: 1
  property int frame: 0
  property bool onLadder: false
  property bool onRope: false
  property bool falling: false
  property bool digging: false
  property var goldCells: []
  property var guardList: []
  property var holeList: []
  property int goldLeft: 0
  property int goldCarried: 0
  property int goldTotal: 0
  property bool revealed: false
  property int tilesRev: -1

  property var bricks: []
  property var ladders: []
  property var ropes: []
  property var exits: []

  readonly property int cols: state ? state.w : 0
  readonly property int rows: state ? state.h : 0
  property var held: ({})

  onLevelTextChanged: loadLevel()
  Component.onCompleted: { lives = 5; loadLevel() }

  function loadLevel() {
    won = false
    gameOver = false
    dyingClock = 0
    held = ({})
    tilesRev = -1
    if (!levelText) { state = null; return }
    state = Engine.createState(LevelParser.parse(levelText))
    exits = state.exitCells.slice()
    rebuildStatics()
    sync()
  }

  function rebuildStatics() {
    if (!state) return
    var b = [], l = [], r = []
    for (var y = 0; y < state.h; y++) {
      for (var x = 0; x < state.w; x++) {
        var t = state.tiles[y][x]
        if (t === 1 || t === 5) b.push({ x: x, y: y, kind: 0 })   // brick / trap
        else if (t === 2)       b.push({ x: x, y: y, kind: 1 })   // solid
        else if (t === 3)       l.push({ x: x, y: y })
        else if (t === 4)       r.push({ x: x, y: y })
      }
    }
    bricks = b; ladders = l; ropes = r
    tilesRev = state.tilesRev
  }

  function sync() {
    if (!state) return
    if (state.tilesRev !== tilesRev) rebuildStatics()
    var p = state.player
    px = p.px; py = p.py; face = p.face; frame = p.frame
    onLadder = p.onLadder; onRope = p.onRope; falling = p.falling
    digging = p.digging > 0
    goldLeft = state.goldLeft; goldCarried = state.goldCarried; goldTotal = state.goldTotal
    revealed = state.revealed
    goldCells = state.gold.slice()
    guardList = state.guards.map(function (g) {
      return { x: g.px, y: g.py, face: g.face, frame: g.frame,
               dead: g.dead, inHole: g.inHole, carrying: g.carrying,
               falling: g.falling, onLadder: g.onLadder }
    })
    holeList = state.holes.map(function (h) { return { x: h.x, y: h.y, timer: h.timer } })

    if (state.status === "won" && !won) won = true
    else if (state.status === "dead" && dyingClock === 0) dyingClock = 45
  }

  function step() {
    if (!state || won || gameOver) return

    if (dyingClock > 0) {
      dyingClock--
      if (dyingClock === 0) {
        lives--
        if (lives <= 0) gameOver = true
        else loadLevel()               // a death restarts the level
      }
      return
    }

    Engine.tick(state, {
      left:     !!held[Qt.Key_Left]  || !!held[Qt.Key_A],
      right:    !!held[Qt.Key_Right] || !!held[Qt.Key_D],
      up:       !!held[Qt.Key_Up]    || !!held[Qt.Key_W],
      down:     !!held[Qt.Key_Down]  || !!held[Qt.Key_S],
      digLeft:  !!held[Qt.Key_Z]     || !!held[Qt.Key_Comma],
      digRight: !!held[Qt.Key_X]     || !!held[Qt.Key_Period]
    })
    sync()
  }

  function keyDown(e) {
    if (e.isAutoRepeat) return
    if ((won || gameOver) &&
        (e.key === Qt.Key_Space || e.key === Qt.Key_Return || e.key === Qt.Key_Enter)) {
      if (won) pf.finished()
      else pf.quit()
      return
    }
    if (e.key === Qt.Key_R) { loadLevel(); return }
    held[e.key] = true
  }

  function keyUp(e) {
    if (e.isAutoRepeat) return
    delete held[e.key]
  }

  Timer {
    interval: 22
    repeat: true
    running: pf.visible && pf.state !== null && !pf.won && !pf.gameOver
    onTriggered: pf.step()
  }

  // ---- HUD ----
  Item {
    id: hud
    width: parent.width
    height: parent.height * 0.11
    anchors.top: parent.top

    Row {
      anchors.left: parent.left
      anchors.verticalCenter: parent.verticalCenter
      spacing: hud.height * 0.6

      Text {
        text: "GOLD " + (pf.goldTotal - pf.goldLeft - pf.goldCarried) + "/" + pf.goldTotal
              + (pf.revealed ? "  ▲" : "")
        color: pf.revealed ? pf.exitInk : pf.goldInk
        font.family: pf.monoFont; font.bold: true
        font.pixelSize: hud.height * 0.4
      }
      Text {
        text: "LIVES " + pf.lives
        color: pf.runnerInk
        font.family: pf.monoFont
        font.pixelSize: hud.height * 0.4
      }
    }
    Text {
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      text: "LEVEL " + (pf.levelIndex + 1) + " / " + pf.levelCount
      color: "#8892a6"
      font.family: pf.monoFont
      font.pixelSize: hud.height * 0.4
    }
  }

  // ---- Board ----
  Item {
    id: board
    readonly property real u: (pf.cols > 0 && pf.rows > 0)
      ? Math.max(1, Math.floor(Math.min(pf.width / pf.cols,
                                        (pf.height - hud.height - foot.height) / pf.rows)))
      : 0
    readonly property real sub: u / pf.subPerTile
    width: pf.cols * u
    height: pf.rows * u
    anchors.horizontalCenter: parent.horizontalCenter
    y: hud.height + Math.max(0, (pf.height - hud.height - foot.height - height) / 2)

    Rectangle { anchors.fill: parent; color: pf.bg }

    Repeater {
      model: pf.bricks
      Rectangle {
        x: modelData.x * board.u
        y: modelData.y * board.u
        width: board.u
        height: board.u
        color: modelData.kind === 1 ? pf.solid : pf.brick
        border.width: Math.max(1, board.u * 0.09)
        border.color: modelData.kind === 1 ? pf.solidDark : pf.brickDark
      }
    }

    // reforming holes — a brick growing back from the edges
    Repeater {
      model: pf.holeList
      Item {
        readonly property bool warn: modelData.timer < 45
        x: modelData.x * board.u
        y: modelData.y * board.u
        width: board.u
        height: board.u
        Rectangle {
          anchors.horizontalCenter: parent.horizontalCenter
          width: parent.width * (warn ? (1 - modelData.timer / 45) : 0.14)
          height: parent.height
          color: pf.brick
          border.width: Math.max(1, board.u * 0.09)
          border.color: pf.brickDark
          visible: warn
        }
        // faint lip so an open pit reads as dug, not just empty
        Rectangle { width: parent.width; height: Math.max(1, board.u * 0.12); color: pf.brickDark; opacity: 0.6 }
      }
    }

    Repeater {
      model: pf.ladders
      Item {
        x: modelData.x * board.u; y: modelData.y * board.u
        width: board.u; height: board.u
        Rectangle { x: board.u * 0.16; width: board.u * 0.12; height: parent.height; color: pf.ladderInk }
        Rectangle { x: board.u * 0.72; width: board.u * 0.12; height: parent.height; color: pf.ladderInk }
        Rectangle { y: board.u * 0.20; width: parent.width; height: board.u * 0.12; color: pf.ladderInk }
        Rectangle { y: board.u * 0.64; width: parent.width; height: board.u * 0.12; color: pf.ladderInk }
      }
    }

    Repeater {
      model: pf.ropes
      Rectangle {
        x: modelData.x * board.u
        y: modelData.y * board.u + board.u * 0.12
        width: board.u
        height: Math.max(2, board.u * 0.12)
        color: pf.ropeInk
      }
    }

    Repeater {
      model: pf.exits
      Item {
        visible: pf.revealed
        x: modelData.x * board.u; y: modelData.y * board.u
        width: board.u; height: board.u
        Rectangle { x: board.u * 0.16; width: board.u * 0.12; height: parent.height; color: pf.exitInk }
        Rectangle { x: board.u * 0.72; width: board.u * 0.12; height: parent.height; color: pf.exitInk }
        Rectangle { y: board.u * 0.20; width: parent.width; height: board.u * 0.12; color: pf.exitInk }
        Rectangle { y: board.u * 0.64; width: parent.width; height: board.u * 0.12; color: pf.exitInk }
      }
    }

    Repeater {
      model: pf.goldCells
      Rectangle {
        x: modelData.x * board.u + board.u * 0.15
        y: modelData.y * board.u + board.u * 0.28
        width: board.u * 0.7
        height: board.u * 0.5
        color: pf.goldInk
        border.width: Math.max(1, board.u * 0.06)
        border.color: pf.goldDark
        Rectangle { anchors.centerIn: parent; width: board.u * 0.14; height: board.u * 0.14; color: pf.goldDark }
      }
    }

    // ---- Guards ----
    Repeater {
      model: pf.guardList
      Item {
        visible: !modelData.dead
        x: Math.round(modelData.x * board.sub)
        y: Math.round(modelData.y * board.sub)
        width: board.u
        height: board.u
        PixelSprite {
          anchors.horizontalCenter: parent.horizontalCenter
          y: parent.height - height + (modelData.inHole ? board.u * 0.28 : 0)
          cell: Math.max(1, board.u / 10)
          ink: pf.guardInk
          mirror: modelData.face < 0
          bits: modelData.falling ? Sprites.GUARD.run[0]
              : modelData.onLadder ? Sprites.GUARD.run[Math.floor(modelData.frame / 3) % 2]
              : (modelData.x % 8 === 0 && modelData.y % 8 === 0 && modelData.frame === 0)
                ? Sprites.GUARD.idle[0]
                : Sprites.GUARD.run[Math.floor(modelData.frame / 2) % 2]
        }
        Rectangle {
          visible: modelData.carrying
          anchors.horizontalCenter: parent.horizontalCenter
          y: parent.height * 0.05
          width: board.u * 0.24; height: board.u * 0.24
          color: pf.goldInk
        }
      }
    }

    // ---- Runner ----
    PixelSprite {
      id: runner
      visible: pf.dyingClock === 0 || (pf.dyingClock % 8 < 4)
      cell: Math.max(1, board.u / 10)
      ink: pf.runnerInk
      mirror: pf.face < 0
      x: Math.round(pf.px * board.sub) + (board.u - width) / 2
      y: Math.round(pf.py * board.sub) + (board.u - height)
      bits: pf.dyingClock > 0 ? Sprites.RUNNER.fall[0]
          : pf.digging  ? Sprites.RUNNER.dig[0]
          : pf.falling  ? Sprites.RUNNER.fall[0]
          : pf.onLadder ? Sprites.RUNNER.climb[Math.floor(pf.frame / 3) % 2]
          : pf.onRope   ? Sprites.RUNNER.climb[Math.floor(pf.frame / 3) % 2]
          :               Sprites.RUNNER.run[Math.floor(pf.frame / 2) % 4]
    }
  }

  // ---- Footer ----
  Item {
    id: foot
    width: parent.width
    height: parent.height * 0.085
    anchors.bottom: parent.bottom
    Text {
      anchors.centerIn: parent
      text: "←/→ run   ↑/↓ ladders   Z/X dig   R restart   Esc back"
      color: "#5b6478"
      font.family: pf.monoFont
      font.pixelSize: foot.height * 0.42
    }
  }

  // ---- Banners ----
  Rectangle {
    anchors.fill: parent
    visible: pf.won || pf.gameOver
    color: "#cc05070d"
    Column {
      anchors.centerIn: parent
      spacing: parent.height * 0.03
      Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: pf.won ? "LEVEL CLEAR" : "GAME OVER"
        color: pf.won ? pf.goldInk : pf.guardInk
        font.family: pf.monoFont; font.bold: true
        font.pixelSize: pf.height * 0.1
        font.letterSpacing: 3
      }
      Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: pf.won
              ? (pf.levelIndex + 1 < pf.levelCount ? "press SPACE for the next level"
                                                   : "press SPACE — you cleared them all")
              : "press SPACE for the title"
        color: pf.runnerInk
        font.family: pf.monoFont
        font.pixelSize: pf.height * 0.035
      }
    }
  }

  Text {
    anchors.centerIn: parent
    visible: pf.state === null
    text: "LOADING…"
    color: pf.runnerInk
    font.family: pf.monoFont
    font.pixelSize: pf.height * 0.06
  }
}
