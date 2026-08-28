// Title screen — purely visual. Key handling lives in LodeRunner.qml.
import QtQuick

Item {
  id: title
  property var manifest: null
  property string monoFont: "monospace"
  property bool active: true          // drives the blinking prompt

  readonly property color brickRed:   "#c8523c"
  readonly property color brickDark:  "#5f231a"
  readonly property color gold:       "#f4c542"
  readonly property color goldDark:   "#8a6410"
  readonly property color runnerInk:  "#f2f0e6"
  readonly property color guardInk:   "#ff5db1"
  readonly property color ladderInk:  "#6de1d2"
  readonly property color titleInk:   "#f4c542"
  readonly property color titleShade: "#7a4a12"

  Column {
    anchors.fill: parent
    anchors.margins: Math.round(title.width * 0.05)
    spacing: Math.round(title.height * 0.035)

    // ---- Title ----
    Item {
      width: parent.width
      height: title.height * 0.22

      Text {
        anchors.centerIn: parent
        anchors.horizontalCenterOffset: 3
        anchors.verticalCenterOffset: 4
        text: "LODE RUNNER"
        color: title.titleShade
        font.family: title.monoFont
        font.bold: true
        font.pixelSize: title.height * 0.15
        font.letterSpacing: title.width * 0.011
      }
      Text {
        anchors.centerIn: parent
        text: "LODE RUNNER"
        color: title.titleInk
        font.family: title.monoFont
        font.bold: true
        font.pixelSize: title.height * 0.15
        font.letterSpacing: title.width * 0.011
      }
    }

    // ---- Scene ----
    Item {
      id: sceneBox
      width: parent.width
      height: title.height * 0.4
      readonly property real u: Math.max(1, Math.min(width / 160, height / 48))

      Item {
        id: stage
        width: 160 * sceneBox.u
        height: 48 * sceneBox.u
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        readonly property real u: sceneBox.u
        readonly property int floorY: 40

        Repeater {
          model: 10
          Rectangle {
            x: index * 16 * stage.u
            y: stage.floorY * stage.u
            width: 16 * stage.u
            height: 8 * stage.u
            color: title.brickRed
            border.width: Math.max(1, stage.u * 0.6)
            border.color: title.brickDark
          }
        }

        Repeater {
          model: 3
          Rectangle {
            x: (8 + index * 16) * stage.u
            y: (stage.floorY - 20) * stage.u
            width: 16 * stage.u
            height: 7 * stage.u
            color: title.brickRed
            border.width: Math.max(1, stage.u * 0.6)
            border.color: title.brickDark
          }
        }

        Item {
          x: 40 * stage.u
          y: (stage.floorY - 20) * stage.u
          width: 13 * stage.u
          height: 20 * stage.u
          Rectangle { x: 0;            width: 2 * stage.u; height: parent.height; color: title.ladderInk }
          Rectangle { x: 11 * stage.u; width: 2 * stage.u; height: parent.height; color: title.ladderInk }
          Repeater {
            model: 4
            Rectangle {
              y: (2 + index * 5) * stage.u
              width: 13 * stage.u
              height: 2 * stage.u
              color: title.ladderInk
            }
          }
        }

        Repeater {
          model: [92, 108, 124]
          Rectangle {
            x: modelData * stage.u
            y: (stage.floorY - 6) * stage.u
            width: 9 * stage.u
            height: 6 * stage.u
            color: title.gold
            border.width: Math.max(1, stage.u * 0.5)
            border.color: title.goldDark
            Rectangle {
              anchors.centerIn: parent
              width: 2 * stage.u; height: 2 * stage.u
              color: title.goldDark
            }
          }
        }

        PixelSprite {
          cell: stage.u
          ink: title.runnerInk
          x: 15 * stage.u
          y: (stage.floorY - 20 - height / stage.u) * stage.u
          bits: [
            "..XXXX..", "..XXXX..", ".XXXXXX.", "X.XXXX.X",
            "X.XXXX.X", "..XXXX..", ".XX..XX.", ".X....X.", "XX....XX"
          ]
        }

        PixelSprite {
          cell: stage.u
          ink: title.guardInk
          x: 140 * stage.u
          y: (stage.floorY - height / stage.u) * stage.u
          bits: [
            "..XXXX..", "..XXXX..", ".XXXXXX.", ".XXXXXX.",
            "X.XXXX.X", "..XXXX..", ".XX..XX.", ".X....X.", "XX....XX"
          ]
        }
      }

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
        font.family: title.monoFont
        font.pixelSize: title.height * 0.03
      }
      Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: "Recreation — gonzo · v" + ((title.manifest && title.manifest.version) || "0.2.0")
        color: "#8892a6"
        font.family: title.monoFont
        font.pixelSize: title.height * 0.03
      }
    }

    // ---- Prompt ----
    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: "PRESS SPACE TO PLAY"
      color: title.runnerInk
      font.family: title.monoFont
      font.bold: true
      font.pixelSize: title.height * 0.048
      font.letterSpacing: 2
      SequentialAnimation on opacity {
        running: title.active
        loops: Animation.Infinite
        NumberAnimation { to: 0.15; duration: 550; easing.type: Easing.InOutQuad }
        NumberAnimation { to: 1.0;  duration: 550; easing.type: Easing.InOutQuad }
      }
    }

    Text {
      anchors.horizontalCenter: parent.horizontalCenter
      text: "Esc / Q to exit"
      color: "#5b6478"
      font.family: title.monoFont
      font.pixelSize: title.height * 0.026
    }
  }
}
