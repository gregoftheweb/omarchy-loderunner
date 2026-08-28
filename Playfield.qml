// The game. Renders a level and runs the loop; LodeRunner.qml feeds it keys
// via keyDown()/keyUp() and listens for finished().
import QtQuick
import "game/engine.js" as Engine
import "game/level.js" as LevelParser

Item {
  id: pf
  property var manifest: null
  property string monoFont: "monospace"

  property string levelText: ""
  property int levelIndex: 0
  property int levelCount: 1

  signal finished()

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
  readonly property color exitInk:   "#8affc8"

  // engine state + mirrored render fields
  property var state: null
  property bool won: false
  property int px: 0
  property int py: 0
  property int face: 1
  property bool onLadder: false
  property bool onRope: false
  property var goldCells: []
  property int goldLeft: 0
  property int goldTotal: 0
  property bool revealed: false

  property var bricks: []
  property var ladders: []
  property var ropes: []
  property var exits: []

  readonly property int cols: state ? state.w : 0
  readonly property int rows: state ? state.h : 0

  property var held: ({})

  onLevelTextChanged: reset()
  Component.onCompleted: reset()

  function reset() {
    won = false
    held = ({})
    if (!levelText) { state = null; return }
    var lvl = LevelParser.parse(levelText)
    state = Engine.createState(lvl)

    var b = [], l = [], r = []
    for (var y = 0; y < lvl.height; y++) {
      for (var x = 0; x < lvl.width; x++) {
        var t = lvl.tiles[y][x]
        if (t === 1 || t === 2) b.push({ x: x, y: y, solid: t === 2 })
        else if (t === 3)       l.push({ x: x, y: y })
        else if (t === 4)       r.push({ x: x, y: y })
      }
    }
    bricks = b; ladders = l; ropes = r
    exits = lvl.exitCells.slice()
    sync()
  }

  function sync() {
    if (!state) return
    var p = state.player
    px = p.px; py = p.py; face = p.face
    onLadder = p.onLadder; onRope = p.onRope
    goldLeft = state.goldLeft; goldTotal = state.goldTotal
    revealed = state.revealed
    goldCells = state.gold.slice()
    if (state.status === "won" && !won) won = true
  }

  function step() {
    if (!state || won) return
    Engine.tick(state, {
      left:  !!held[Qt.Key_Left]  || !!held[Qt.Key_A],
      right: !!held[Qt.Key_Right] || !!held[Qt.Key_D],
      up:    !!held[Qt.Key_Up]    || !!held[Qt.Key_W],
      down:  !!held[Qt.Key_Down]  || !!held[Qt.Key_S]
    })
    sync()
  }

  function keyDown(e) {
    if (e.isAutoRepeat) return
    if (won && (e.key === Qt.Key_Space || e.key === Qt.Key_Return || e.key === Qt.Key_Enter)) {
      pf.finished(); return
    }
    if (e.key === Qt.Key_R) { reset(); return }
    held[e.key] = true
  }

  function keyUp(e) {
    if (e.isAutoRepeat) return
    delete held[e.key]
  }

  Timer {
    interval: 22
    repeat: true
    running: pf.visible && pf.state !== null && !pf.won
    onTriggered: pf.step()
  }

  // ---- HUD ----
  Item {
    id: hud
    width: parent.width
    height: parent.height * 0.12
    anchors.top: parent.top

    Text {
      anchors.left: parent.left
      anchors.verticalCenter: parent.verticalCenter
      text: "GOLD  " + (pf.goldTotal - pf.goldLeft) + " / " + pf.goldTotal
        + (pf.revealed ? "   ▲ EXIT OPEN" : "")
      color: pf.revealed ? pf.exitInk : pf.goldInk
      font.family: pf.monoFont
      font.bold: true
      font.pixelSize: hud.height * 0.42
    }
    Text {
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      text: "LEVEL " + (pf.levelIndex + 1) + " / " + pf.levelCount
      color: "#8892a6"
      font.family: pf.monoFont
      font.pixelSize: hud.height * 0.42
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
        color: modelData.solid ? pf.solid : pf.brick
        border.width: Math.max(1, board.u * 0.09)
        border.color: modelData.solid ? pf.solidDark : pf.brickDark
      }
    }

    Repeater {
      model: pf.ladders
      Item {
        x: modelData.x * board.u
        y: modelData.y * board.u
        width: board.u
        height: board.u
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
        x: modelData.x * board.u
        y: modelData.y * board.u
        width: board.u
        height: board.u
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
        Rectangle {
          anchors.centerIn: parent
          width: board.u * 0.14; height: board.u * 0.14
          color: pf.goldDark
        }
      }
    }

    // ---- Runner ----
    PixelSprite {
      id: runner
      cell: Math.max(1, board.u / 8)
      ink: pf.runnerInk
      mirror: pf.face < 0
      x: Math.round(pf.px * board.sub) + (board.u - width) / 2
      y: Math.round(pf.py * board.sub) + (board.u - height)
      bits: pf.onLadder ? climbBits : runBits

      readonly property var runBits: [
        "..XXXX..", "..XXXX..", ".XXXXXX.", "X.XXXX.X",
        "X.XXXX.X", "..XXXX..", ".XX..XX.", ".X....X.", "XX....XX"
      ]
      readonly property var climbBits: [
        "X.XXXX.X", "X.XXXX.X", ".XXXXXX.", "..XXXX..",
        "..XXXX..", "..XXXX..", "..XXXX..", "..X..X..", "..X..X.."
      ]
    }
  }

  // ---- Footer ----
  Item {
    id: foot
    width: parent.width
    height: parent.height * 0.09
    anchors.bottom: parent.bottom
    Text {
      anchors.centerIn: parent
      text: "←/→ run   ↑/↓ ladders   R restart   Esc back"
      color: "#5b6478"
      font.family: pf.monoFont
      font.pixelSize: foot.height * 0.42
    }
  }

  // ---- Win banner ----
  Rectangle {
    anchors.fill: parent
    visible: pf.won
    color: "#cc05070d"
    Column {
      anchors.centerIn: parent
      spacing: parent.height * 0.03
      Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: "LEVEL CLEAR"
        color: pf.goldInk
        font.family: pf.monoFont
        font.bold: true
        font.pixelSize: pf.height * 0.1
        font.letterSpacing: 3
      }
      Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: pf.levelIndex + 1 < pf.levelCount ? "press SPACE for the next level"
                                                : "press SPACE — that's all of v0.2"
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
