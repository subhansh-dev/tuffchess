export class CanvasRenderer {
  constructor(ctx, width, height) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.squareSize = 0
    this.boardOffsetX = 0
    this.boardOffsetY = 0
    this.orientation = 1
    this.hudTopHeight = 52    // player bar at top (with border)
    this.hudBottomHeight = 52 // player bar at bottom (with border)
    this.resize(width, height)
  }

  resize(width, height) {
    this.width = width
    this.height = height
    // Board fits between HUD bars with comfortable margin
    const topMargin = this.hudTopHeight + 8    // extra 8px gap below top bar
    const bottomMargin = this.hudBottomHeight + 8 // extra 8px gap above bottom bar
    const availableHeight = height - topMargin - bottomMargin
    const maxBoardByWidth = width * 0.88   // leave some horizontal margin
    const maxBoardByHeight = availableHeight * 0.92
    const boardSize = Math.min(maxBoardByWidth, maxBoardByHeight)
    this.squareSize = boardSize / 8
    this.boardOffsetX = (width - boardSize) / 2
    this.boardOffsetY = topMargin + (availableHeight - boardSize) / 2
  }

  clear() {
    // Warm wooden background instead of dark
    this.ctx.fillStyle = '#4A3C2A'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  squareToCoord(sq, orientation = 1) {
    const file = sq % 8
    const rank = Math.floor(sq / 8)
    if (orientation === 1) {
      return { file, rank: 7 - rank }
    } else {
      return { file: 7 - file, rank }
    }
  }

  coordToSquare(file, rank, orientation = 1) {
    if (orientation === 1) {
      return (7 - rank) * 8 + file
    } else {
      return rank * 8 + (7 - file)
    }
  }

  getSquareFromPoint(x, y) {
    const file = Math.floor((x - this.boardOffsetX) / this.squareSize)
    const rank = Math.floor((y - this.boardOffsetY) / this.squareSize)
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return -1
    return this.coordToSquare(file, rank, this.orientation)
  }
}
