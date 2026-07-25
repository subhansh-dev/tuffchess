export class BoardRenderer {
  constructor(canvasRenderer) {
    this.renderer = canvasRenderer
    this.boardAppearance = {
      orientation: 1
    }
    this.lightColor = '#E8D5B5'
    this.darkColor = '#8B7355'
    this.lightColorAlt = '#D4C4A8'
    this.darkColorAlt = '#6B5344'
    this.lastMoveFrom = -1
    this.lastMoveTo = -1
    this.selectedSquare = -1
    this.legalMoves = []
    this.checkSquare = -1
    this.hoverSquare = -1
    this.captureHighlight = { from: -1, to: -1, fromAlpha: 0, toAlpha: 0, active: false }
    // Per-square grain texture data — keyed by (rank * 8 + file)
    this._grainDataMap = new Map()
    this._grainSize = 0
  }

  // Generate grain texture points for a given square position
  // BUG FIX: Use different seed per square position (rank * 8 + file)
  // so that all squares don't share the same repetitive grain pattern
  _generateGrain(squareSize, positionKey) {
    if (this._grainDataMap.has(positionKey) && this._grainSize === squareSize) {
      return this._grainDataMap.get(positionKey)
    }
    // Clear cache if squareSize changed (resize)
    if (this._grainSize !== squareSize) {
      this._grainDataMap.clear()
      this._grainSize = squareSize
    }
    // Use positionKey as a seed for varied grain per square
    const density = Math.floor(squareSize * squareSize * 0.04)
    const points = []
    // Simple seeded random based on positionKey
    let seed = positionKey * 2654435761 // Knuth multiplicative hash
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < density; i++) {
      points.push({
        x: seededRandom() * squareSize,
        y: seededRandom() * squareSize,
        alpha: 0.02 + seededRandom() * 0.06,
        size: 0.5 + seededRandom() * 1.5
      })
    }
    this._grainDataMap.set(positionKey, points)
    return points
  }

  setLastMove(from, to) {
    this.lastMoveFrom = from
    this.lastMoveTo = to
  }

  triggerCaptureHighlight(from, to) {
    this.captureHighlight = { from, to, fromAlpha: 1, toAlpha: 1, active: true }
  }

  updateCaptureHighlight(fromAlpha, toAlpha) {
    this.captureHighlight.fromAlpha = fromAlpha
    this.captureHighlight.toAlpha = toAlpha
  }

  clearCaptureHighlight() {
    this.captureHighlight.active = false
    this.captureHighlight.fromAlpha = 0
    this.captureHighlight.toAlpha = 0
  }

  setSelected(sq) { this.selectedSquare = sq }
  setLegalMoves(moves) { this.legalMoves = moves }
  setCheck(sq) { this.checkSquare = sq }
  setHover(sq) { this.hoverSquare = sq }

  render(ctx) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const orientation = this.boardAppearance.orientation

    // Draw board background (warm wood tone surrounding the board)
    ctx.fillStyle = '#4A3C2A'
    ctx.fillRect(0, 0, this.renderer.width, this.renderer.height)

    // Draw warm wooden border around the board
    const borderPad = 4
    ctx.fillStyle = '#5C4A36'
    ctx.fillRect(
      boardOffsetX - borderPad,
      boardOffsetY - borderPad,
      8 * squareSize + 2 * borderPad,
      8 * squareSize + 2 * borderPad
    )
    // Inner border highlight (top-left light edge)
    ctx.strokeStyle = 'rgba(200, 180, 140, 0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(
      boardOffsetX - borderPad + 1,
      boardOffsetY - borderPad + 1,
      8 * squareSize + 2 * borderPad - 2,
      8 * squareSize + 2 * borderPad - 2
    )

    // Draw squares with warm parchment/wooden tones
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLight = (file + rank) % 2 === 0
        const x = boardOffsetX + file * squareSize
        const y = boardOffsetY + rank * squareSize

        // Base color fill
        ctx.fillStyle = isLight ? this.lightColor : this.darkColor
        ctx.fillRect(x, y, squareSize, squareSize)

        // Subtle inner shadow for depth (recessed squares feel)
        if (!isLight) {
          // Dark squares: subtle inset shadow top-left
          ctx.fillStyle = 'rgba(30, 20, 10, 0.12)'
          ctx.fillRect(x, y, squareSize, squareSize * 0.08)
          ctx.fillRect(x, y, squareSize * 0.08, squareSize)
          // Bottom-right light edge (simulates depth)
          ctx.fillStyle = 'rgba(160, 140, 100, 0.08)'
          ctx.fillRect(x, y + squareSize * 0.92, squareSize, squareSize * 0.08)
          ctx.fillRect(x + squareSize * 0.92, y, squareSize * 0.08, squareSize)
        } else {
          // Light squares: subtle raised feel with gentle shadow bottom-right
          ctx.fillStyle = 'rgba(30, 20, 10, 0.06)'
          ctx.fillRect(x, y + squareSize * 0.94, squareSize, squareSize * 0.06)
          ctx.fillRect(x + squareSize * 0.94, y, squareSize * 0.06, squareSize)
        }

        // Paper grain texture — BUG FIX: vary per square position
        const positionKey = rank * 8 + file
        const grain = this._generateGrain(squareSize, positionKey)
        const grainColor = isLight ? 'rgba(100, 80, 50, 1)' : 'rgba(40, 30, 20, 1)'
        for (const pt of grain) {
          ctx.fillStyle = grainColor
          ctx.globalAlpha = pt.alpha
          ctx.fillRect(x + pt.x, y + pt.y, pt.size, pt.size)
        }
        ctx.globalAlpha = 1
      }
    }

    // Draw capture highlight (warm gold tint) - takes priority
    if (this.captureHighlight.active && (this.captureHighlight.fromAlpha > 0 || this.captureHighlight.toAlpha > 0)) {
      this.drawWarmCaptureSquare(ctx, this.captureHighlight.from, this.captureHighlight.fromAlpha, orientation)
      this.drawWarmCaptureSquare(ctx, this.captureHighlight.to, this.captureHighlight.toAlpha, orientation)
    } else {
      // Draw last move highlight (warm amber/gold tint instead of yellow)
      this.drawSquareHighlight(ctx, this.lastMoveFrom, 'rgba(184, 150, 15, 0.35)', orientation)
      this.drawSquareHighlight(ctx, this.lastMoveTo, 'rgba(184, 150, 15, 0.35)', orientation)
    }

    // Draw selected square highlight (warm brown tint)
    if (this.selectedSquare >= 0) {
      this.drawSquareHighlight(ctx, this.selectedSquare, 'rgba(139, 115, 85, 0.45)', orientation)
    }

    // Draw hover highlight (subtle warm shadow)
    if (this.hoverSquare >= 0 && this.hoverSquare !== this.selectedSquare) {
      this.drawSquareHighlight(ctx, this.hoverSquare, 'rgba(44, 36, 24, 0.1)', orientation)
    }

    // Draw check highlight (warm red glow)
    if (this.checkSquare >= 0) {
      this.drawCheckHighlight(ctx, this.checkSquare, orientation)
    }

    // Draw legal move indicators
    for (const move of this.legalMoves) {
      this.drawLegalMoveIndicator(ctx, move.to, orientation)
    }

    // Draw coordinates
    this.drawCoordinates(ctx, orientation)
  }

  drawWarmCaptureSquare(ctx, square, alpha, orientation) {
    if (square < 0) return
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)

    // Warm gold-green tint for captures
    ctx.fillStyle = `rgba(120, 160, 40, ${alpha * 0.5})`
    ctx.fillRect(
      boardOffsetX + file * squareSize,
      boardOffsetY + rank * squareSize,
      squareSize,
      squareSize
    )
    // Add golden border glow
    ctx.strokeStyle = `rgba(184, 150, 15, ${alpha * 0.7})`
    ctx.lineWidth = 3
    ctx.strokeRect(
      boardOffsetX + file * squareSize + 2,
      boardOffsetY + rank * squareSize + 2,
      squareSize - 4,
      squareSize - 4
    )
  }

  drawSquareHighlight(ctx, square, color, orientation) {
    if (square < 0) return
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)

    ctx.fillStyle = color
    ctx.fillRect(
      boardOffsetX + file * squareSize,
      boardOffsetY + rank * squareSize,
      squareSize,
      squareSize
    )
  }

  drawCheckHighlight(ctx, square, orientation) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const x = boardOffsetX + file * squareSize
    const y = boardOffsetY + rank * squareSize

    const gradient = ctx.createRadialGradient(
      x + squareSize / 2, y + squareSize / 2, 0,
      x + squareSize / 2, y + squareSize / 2, squareSize * 0.7
    )
    gradient.addColorStop(0, 'rgba(184, 60, 40, 0.7)')
    gradient.addColorStop(1, 'rgba(184, 60, 40, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(x, y, squareSize, squareSize)
  }

  drawLegalMoveIndicator(ctx, square, orientation) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const cx = boardOffsetX + file * squareSize + squareSize / 2
    const cy = boardOffsetY + rank * squareSize + squareSize / 2

    const isCapture = this.isSquareOccupied(square)

    if (isCapture) {
      // Warm amber corners for capture indicators
      const cornerSize = squareSize * 0.25
      ctx.fillStyle = 'rgba(44, 36, 24, 0.18)'

      ctx.beginPath()
      ctx.moveTo(boardOffsetX + file * squareSize, boardOffsetY + rank * squareSize)
      ctx.lineTo(boardOffsetX + file * squareSize + cornerSize, boardOffsetY + rank * squareSize)
      ctx.lineTo(boardOffsetX + file * squareSize, boardOffsetY + rank * squareSize + cornerSize)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(boardOffsetX + (file + 1) * squareSize, boardOffsetY + rank * squareSize)
      ctx.lineTo(boardOffsetX + (file + 1) * squareSize - cornerSize, boardOffsetY + rank * squareSize)
      ctx.lineTo(boardOffsetX + (file + 1) * squareSize, boardOffsetY + rank * squareSize + cornerSize)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(boardOffsetX + file * squareSize, boardOffsetY + (rank + 1) * squareSize)
      ctx.lineTo(boardOffsetX + file * squareSize + cornerSize, boardOffsetY + (rank + 1) * squareSize)
      ctx.lineTo(boardOffsetX + file * squareSize, boardOffsetY + (rank + 1) * squareSize - cornerSize)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(boardOffsetX + (file + 1) * squareSize, boardOffsetY + (rank + 1) * squareSize)
      ctx.lineTo(boardOffsetX + (file + 1) * squareSize - cornerSize, boardOffsetY + (rank + 1) * squareSize)
      ctx.lineTo(boardOffsetX + (file + 1) * squareSize, boardOffsetY + (rank + 1) * squareSize - cornerSize)
      ctx.closePath()
      ctx.fill()
    } else {
      // Warm brown dot for move indicators
      ctx.fillStyle = 'rgba(44, 36, 24, 0.15)'
      ctx.beginPath()
      ctx.arc(cx, cy, squareSize * 0.15, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  isSquareOccupied(square) {
    if (!this._position) return false
    return this._position.board[square] !== 0
  }

  setPosition(position) {
    this._position = position
  }

  drawCoordinates(ctx, orientation) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer

    ctx.font = `bold ${squareSize * 0.18}px 'JetBrains Mono', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < 8; i++) {
      const fileChar = String.fromCharCode(97 + i)
      const rankChar = String(8 - i)

      // File labels (bottom of board) - warm readable colors
      const fileX = boardOffsetX + i * squareSize + squareSize * 0.88
      const fileY = boardOffsetY + 8 * squareSize - squareSize * 0.12
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(107, 83, 68, 0.8)' : 'rgba(232, 213, 181, 0.9)'
      ctx.fillText(orientation === -1 ? String.fromCharCode(104 - i) : fileChar, fileX, fileY)

      // Rank labels (left side) - warm readable colors
      const rankX = boardOffsetX + squareSize * 0.12
      const rankY = boardOffsetY + i * squareSize + squareSize * 0.12
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(232, 213, 181, 0.9)' : 'rgba(107, 83, 68, 0.8)'
      ctx.fillText(orientation === -1 ? String(i + 1) : rankChar, rankX, rankY)
    }
  }

  flip() {
    this.boardAppearance.orientation = this.boardAppearance.orientation === 1 ? -1 : 1
  }
}
