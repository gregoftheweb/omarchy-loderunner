// Lode Runner — an Omarchy shell overlay plugin.
//
// v0.1 scope: show the title screen and nothing else. The overlay contract
// (open/close/dismiss/toggle + injected `shell` / `manifest`) mirrors the
// first-party emoji picker so `omarchy-shell shell toggle gonzo.loderunner`
// just works.

import Quickshell
import Quickshell.Wayland
import QtQuick

Item {
  id: root

  // Injected by the shell's plugin loader.
  property var shell: null
  property var manifest: null

  property bool opened: false

  // Retro palette (Apple II / C64 Lode Runner flavour).
  readonly property color paperBlack: "#05070d"
  readonly property color brickRed:   "#c8523c"
  readonly property color brickDark:  "#5f231a"
  readonly property color gold:       "#f4c542"
  readonly property color goldDark:   "#8a6410"
  readonly property color runnerInk:  "#f2f0e6"
  readonly property color guardInk:   "#ff5db1"
  readonly property color ladderInk:  "#6de1d2"
  readonly property color titleInk:   "#f4c542"
  readonly property color titleShade: "#7a4a12"

  property string monoFont: "monospace"

  function open(payloadJson) {
    root.opened = true
    Qt.callLater(function () { keyCatcher.forceActiveFocus() })
  }

  function close() {
    root.opened = false
  }

  function dismiss() {
    root.opened = false
    if (root.shell && typeof root.shell.hide === "function")
      root.shell.hide((root.manifest && root.manifest.id) || "gonzo.loderunner")
  }

  function toggle() {
    if (root.opened) root.dismiss()
    else root.open("{}")
  }

  // Placeholder — the game itself lands here in a later version.
  function startGame() {
    startFlash.start()
  }

  // A chunky pixel sprite built from an ASCII bitmap ('X' = filled cell).
  component Sprite: Item {
    id: sprite
    property var bits: []
    property color ink: "white"
    property real cell: 4
    readonly property int cols: bits.length ? bits[0].length : 0
    width: cols * cell
    height: bits.length * cell

    Repeater {
      model: sprite.bits.length * sprite.cols
      Rectangle {
        readonly property int r: Math.floor(index / sprite.cols)
        readonly property int c: index % sprite.cols
        visible: sprite.bits[r].charAt(c) === "X"
        x: c * sprite.cell
        y: r * sprite.cell
        width: sprite.cell
        height: sprite.cell
        color: sprite.ink
      }
    }
  }

  PanelWindow {
    id: panel
    visible: root.opened
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"

    WlrLayershell.namespace: "omarchy-loderunner"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive
    exclusionMode: ExclusionMode.Ignore

    // Dim the desktop behind the cabinet.
    Rectangle {
      anchors.fill: parent
      color: "#dd000000"
    }

    MouseArea {
      anchors.fill: parent
      onClicked: root.dismiss()
    }

    // The "cabinet" — fixed 5:3-ish screen, centred, capped for small displays.
    Rectangle {
      id: cabinet
      anchors.centerIn: parent
      width: Math.min(900, parent.width - 96)
      height: Math.min(width * 0.62, parent.height - 96)
      radius: 12
      color: root.paperBlack
      border.width: 2
      border.color: "#243149"

      // eat clicks so they don't fall through to the dismiss layer
      MouseArea { anchors.fill: parent; onClicked: {} }

      Item {
        id: keyCatcher
        anchors.fill: parent
        focus: true
        Keys.priority: Keys.BeforeItem
        Keys.onPressed: function (event) {
          switch (event.key) {
          case Qt.Key_Escape:
          case Qt.Key_Q:
            root.dismiss(); event.accepted = true; break
          case Qt.Key_Space:
          case Qt.Key_Return:
          case Qt.Key_Enter:
            root.startGame(); event.accepted = true; break
          }
        }
      }

      Column {
        anchors.fill: parent
        anchors.margins: Math.round(cabinet.width * 0.06)
        spacing: Math.round(cabinet.height * 0.04)

        // ---- Title ----
        Item {
          width: parent.width
          height: cabinet.height * 0.2

          Text {
            anchors.centerIn: parent
            anchors.horizontalCenterOffset: 3
            anchors.verticalCenterOffset: 4
            text: "LODE RUNNER"
            color: root.titleShade
            font.family: root.monoFont
            font.bold: true
            font.pixelSize: cabinet.height * 0.14
            font.letterSpacing: cabinet.width * 0.012
          }
          Text {
            anchors.centerIn: parent
            text: "LODE RUNNER"
            color: root.titleInk
            font.family: root.monoFont
            font.bold: true
            font.pixelSize: cabinet.height * 0.14
            font.letterSpacing: cabinet.width * 0.012
          }
        }

        // ---- Scene ----
        Item {
          id: sceneBox
          width: parent.width
          height: cabinet.height * 0.42

          // Virtual playfield: 160 x 48 cells, scaled to fit, pinned bottom.
          readonly property real u: Math.max(1, Math.min(width / 160, height / 48))

          Item {
            id: stage
            width: 160 * sceneBox.u
            height: 48 * sceneBox.u
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.bottom: parent.bottom

            readonly property real u: sceneBox.u
            readonly property int floorY: 40

            // Brick courses (full-width tiles, mortar drawn as an inset border)
            Repeater {
              model: 10
              Rectangle {
                x: index * 16 * stage.u
                y: stage.floorY * stage.u
                width: 16 * stage.u
                height: 8 * stage.u
                color: root.brickRed
                border.width: Math.max(1, stage.u * 0.6)
                border.color: root.brickDark
              }
            }

            // Left platform
            Repeater {
              model: 3
              Rectangle {
                x: (8 + index * 16) * stage.u
                y: (stage.floorY - 20) * stage.u
                width: 16 * stage.u
                height: 7 * stage.u
                color: root.brickRed
                border.width: Math.max(1, stage.u * 0.6)
                border.color: root.brickDark
              }
            }

            // Ladder from the platform down to the ground
            Item {
              x: 40 * stage.u
              y: (stage.floorY - 20) * stage.u
              width: 13 * stage.u
              height: 20 * stage.u

              Rectangle { x: 0;                width: 2 * stage.u; height: parent.height; color: root.ladderInk }
              Rectangle { x: 11 * stage.u;     width: 2 * stage.u; height: parent.height; color: root.ladderInk }
              Repeater {
                model: 4
                Rectangle {
                  x: 0
                  y: (2 + index * 5) * stage.u
                  width: 13 * stage.u
                  height: 2 * stage.u
                  color: root.ladderInk
                }
              }
            }

            // Gold stashes on the ground
            Repeater {
              model: [92, 108, 124]
              Rectangle {
                x: modelData * stage.u
                y: (stage.floorY - 6) * stage.u
                width: 9 * stage.u
                height: 6 * stage.u
                color: root.gold
                border.width: Math.max(1, stage.u * 0.5)
                border.color: root.goldDark

                Rectangle {
                  anchors.centerIn: parent
                  width: 2 * stage.u
                  height: 2 * stage.u
                  color: root.goldDark
                }
              }
            }

            // The runner, poised on the platform
            Sprite {
              cell: stage.u
              ink: root.runnerInk
              x: 15 * stage.u
              y: (stage.floorY - 20 - height / stage.u) * stage.u
              bits: [
                "..XXXX..",
                "..XXXX..",
                ".XXXXXX.",
                "X.XXXX.X",
                "X.XXXX.X",
                "..XXXX..",
                ".XX..XX.",
                ".X....X.",
                "XX....XX"
              ]
            }

            // A guard down on the ground
            Sprite {
              cell: stage.u
              ink: root.guardInk
              x: 140 * stage.u
              y: (stage.floorY - height / stage.u) * stage.u
              bits: [
                "..XXXX..",
                "..XXXX..",
                ".XXXXXX.",
                ".XXXXXX.",
                "X.XXXX.X",
                "..XXXX..",
                ".XX..XX.",
                ".X....X.",
                "XX....XX"
              ]
            }
          }

          // CRT scanlines
          Column {
            anchors.fill: parent
            spacing: 2
            Repeater {
              model: Math.ceil(sceneBox.height / 3)
              Rectangle { width: sceneBox.width; height: 1; color: "#00000026" }
            }
          }
        }

        // ---- Credits ----
        Column {
          width: parent.width
          spacing: 4

          Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "Original design by Doug Smith · 1983"
            color: "#8892a6"
            font.family: root.monoFont
            font.pixelSize: cabinet.height * 0.03
          }
          Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "Recreation — gonzo · v" + ((root.manifest && root.manifest.version) || "0.1.0")
            color: "#8892a6"
            font.family: root.monoFont
            font.pixelSize: cabinet.height * 0.03
          }
        }

        // ---- Prompt ----
        Text {
          id: prompt
          anchors.horizontalCenter: parent.horizontalCenter
          text: "PRESS SPACE TO START"
          color: root.runnerInk
          font.family: root.monoFont
          font.bold: true
          font.pixelSize: cabinet.height * 0.048
          font.letterSpacing: 2

          SequentialAnimation on opacity {
            running: root.opened
            loops: Animation.Infinite
            NumberAnimation { to: 0.15; duration: 550; easing.type: Easing.InOutQuad }
            NumberAnimation { to: 1.0;  duration: 550; easing.type: Easing.InOutQuad }
          }
        }

        Text {
          anchors.horizontalCenter: parent.horizontalCenter
          text: "Esc / Q to exit"
          color: "#5b6478"
          font.family: root.monoFont
          font.pixelSize: cabinet.height * 0.028
        }
      }

      // Brief flash when SPACE is pressed (game not implemented yet).
      Rectangle {
        id: startFlashRect
        anchors.fill: parent
        radius: cabinet.radius
        color: root.gold
        opacity: 0
        SequentialAnimation {
          id: startFlash
          NumberAnimation { target: startFlashRect; property: "opacity"; to: 0.35; duration: 60 }
          NumberAnimation { target: startFlashRect; property: "opacity"; to: 0.0;  duration: 220 }
        }
      }
    }
  }
}
