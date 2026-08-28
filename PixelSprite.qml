// A chunky pixel sprite built from an ASCII bitmap ('X' = filled cell).
import QtQuick

Item {
  id: sprite
  property var bits: []
  property color ink: "white"
  property real cell: 4
  property bool mirror: false
  readonly property int cols: bits.length ? bits[0].length : 0
  width: cols * cell
  height: bits.length * cell

  Repeater {
    model: sprite.bits.length * sprite.cols
    Rectangle {
      readonly property int r: Math.floor(index / sprite.cols)
      readonly property int c: index % sprite.cols
      visible: sprite.bits[r].charAt(sprite.mirror ? sprite.cols - 1 - c : c) === "X"
      x: c * sprite.cell
      y: r * sprite.cell
      width: sprite.cell
      height: sprite.cell
      color: sprite.ink
    }
  }
}
