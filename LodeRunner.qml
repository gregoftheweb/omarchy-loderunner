// Lode Runner — an Omarchy shell overlay plugin.
//
// This file is the overlay shell: the layer-surface window, the cabinet chrome,
// keyboard routing, and a small title <-> playing state machine. The title
// screen lives in TitleScreen.qml, the game in Playfield.qml, the rules in
// game/*.js.

import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import QtQuick
import "game/levels.js" as Levels

Item {
  id: root

  // Injected by the shell's plugin loader.
  property var shell: null
  property var manifest: null

  property bool opened: false
  property string screen: "title"        // "title" | "playing"
  property int levelIndex: 0
  property string levelText: ""
  property string monoFont: "monospace"

  readonly property string pluginDir:
    (manifest && manifest.__sourceDir) ? String(manifest.__sourceDir) : ""
  readonly property int levelCount: Levels.FILES.length

  function open(payloadJson) {
    opened = true
    screen = "title"
    levelIndex = 0
    Qt.callLater(function () { keyCatcher.forceActiveFocus() })
  }

  function close() {
    opened = false
  }

  function dismiss() {
    opened = false
    screen = "title"
    if (shell && typeof shell.hide === "function")
      shell.hide((manifest && manifest.id) || "gonzo.loderunner")
  }

  function toggle() {
    if (opened) dismiss()
    else open("{}")
  }

  function startGame() {
    levelIndex = 0
    screen = "playing"
  }

  function nextLevel() {
    if (levelIndex + 1 < levelCount) {
      levelIndex += 1
      screen = "playing"
    } else {
      screen = "title"
    }
  }

  onOpenedChanged: if (opened) Qt.callLater(function () { keyCatcher.forceActiveFocus() })

  FileView {
    id: levelFile
    path: (root.pluginDir !== "" && root.screen === "playing"
           && root.levelIndex >= 0 && root.levelIndex < root.levelCount)
      ? root.pluginDir + "/levels/" + Levels.FILES[root.levelIndex]
      : ""
    onLoaded: root.levelText = text()
    onLoadFailed: root.levelText = ""
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

    Rectangle {
      anchors.fill: parent
      color: "#dd000000"
    }

    MouseArea {
      anchors.fill: parent
      onClicked: root.dismiss()
    }

    Rectangle {
      id: cabinet
      anchors.centerIn: parent
      width: Math.min(940, parent.width - 96)
      height: Math.min(width * 0.64, parent.height - 96)
      radius: 12
      color: "#05070d"
      border.width: 2
      border.color: "#243149"

      MouseArea { anchors.fill: parent; onPressed: keyCatcher.forceActiveFocus() }

      Item {
        id: keyCatcher
        anchors.fill: parent
        focus: true
        Keys.priority: Keys.BeforeItem

        // The overlay can lose keyboard focus (a notification, the compositor,
        // wtype's virtual keyboard). Grab it straight back while we're open.
        onActiveFocusChanged: if (!activeFocus && root.opened) Qt.callLater(forceActiveFocus)
        Component.onCompleted: forceActiveFocus()

        Connections {
          target: panel
          function onVisibleChanged() { if (panel.visible) Qt.callLater(keyCatcher.forceActiveFocus) }
        }

        Keys.onPressed: function (event) {
          if (root.screen === "title") {
            if (event.key === Qt.Key_Space || event.key === Qt.Key_Return || event.key === Qt.Key_Enter)
              root.startGame()
            else if (event.key === Qt.Key_Escape || event.key === Qt.Key_Q)
              root.dismiss()
          } else {
            if (event.key === Qt.Key_Escape)
              root.screen = "title"
            else if (gameLoader.item && gameLoader.item.keyDown)
              gameLoader.item.keyDown(event)
          }
          event.accepted = true
        }

        Keys.onReleased: function (event) {
          if (root.screen === "playing" && gameLoader.item && gameLoader.item.keyUp)
            gameLoader.item.keyUp(event)
          event.accepted = true
        }
      }

      Loader {
        id: gameLoader
        anchors.fill: parent
        sourceComponent: root.screen === "playing" ? playComp : titleComp
      }

      Component {
        id: titleComp
        TitleScreen {
          manifest: root.manifest
          monoFont: root.monoFont
          active: root.opened && root.screen === "title"
        }
      }

      Component {
        id: playComp
        Playfield {
          manifest: root.manifest
          monoFont: root.monoFont
          levelText: root.levelText
          levelIndex: root.levelIndex
          levelCount: root.levelCount
          onFinished: root.nextLevel()
        }
      }
    }
  }
}
