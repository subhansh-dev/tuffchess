export class BoardRenderer {
  constructor(canvasRenderer) {
    this.renderer = canvasRenderer
    this.boardAppearance = { orientation: 1 }
    // Rich mahogany & walnut board with gold inlay
    this.lightColor = '#5C3D1E'
    this.darkColor = '#3D2817'
    this.lightColorAlt = '#6B4A28'
    this.darkColorAlt = '#2C1E10'
    this.lastMoveFrom = -1
    this.lastMoveTo = -1
    this.selectedSquare = -1
    this.legalMoves = []
    this.checkSquare = -1
    this.hoverSquare = -1
    this.captureHighlight = { from: -1, to: -1, fromAlpha: 0, toAlpha: 0, active: false }
    this._grainDataMap = new Map()
    this._grainSize = 0
    this._glowPhase = 0
    this._woodGrainCanvas = null
  }

  _getWoodGrainCanvas(size) {
    if (this._woodGrainCanvas && this._woodGrainSize === size) return this._woodGrainCanvas
    const c = document.createElement('canvas')
    c.width = size; c.height = size
    const ctx = c.getContext('2d')
    // Base
    ctx.fillStyle = '#5C3D1E'
    ctx.fillRect(0, 0, size, size)
    // Wood grain lines
    ctx.globalAlpha = 0.08
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = '#2C1E10'
      ctx.lineWidth = 1 + Math.random() * 2
      ctx.beginPath()
      const y = Math.random() * size
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 10, size * 0.7, y + (Math.random() - 0.5) * 10, size, y + (Math.random() - 0.5) * 5)
      ctx.stroke()
    }
    // Knots
    ctx.globalAlpha = 0.06
    for (let i = 0; i < 2; i++) {
      const kx = Math.random() * size
      const ky = Math.random() * size
      const kr = 3 + Math.random() * 6
      ctx.strokeStyle = '#1A1008'
      ctx.lineWidth = 1
      for (let r = kr * 0.3; r < kr; r += 1.5) {
        ctx.beginPath()
        ctx.ellipse(kx, ky, r, r * 0.6, Math.random() * 0.5, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
    this._woodGrainCanvas = c
    this._woodGrainSize = size
    return c
  }

  _generateGrain(squareSize, positionKey) {
    if (this._grainDataMap.has(positionKey) && this._grainSize === squareSize) {
      return this._grainDataMap.get(positionKey)
    }
    if (this._grainSize !== squareSize) {
      this._grainDataMap.clear()
      this._grainSize = squareSize
    }
    const density = Math.floor(squareSize * squareSize * 0.025)
    const points = []
    let seed = positionKey * 2654435761
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

  setLastMove(from, to) { this.lastMoveFrom = from; this.lastMoveTo = to }
  triggerCaptureHighlight(from, to) { this.captureHighlight = { from, to, fromAlpha: 1, toAlpha: 1, active: true } }
  updateCaptureHighlight(fromAlpha, toAlpha) { this.captureHighlight.fromAlpha = fromAlpha; this.captureHighlight.toAlpha = toAlpha }
  clearCaptureHighlight() { this.captureHighlight.active = false; this.captureHighlight.fromAlpha = 0; this.captureHighlight.toAlpha = 0 }
  setSelected(sq) { this.selectedSquare = sq }
  setLegalMoves(moves) { this.legalMoves = moves }
  setCheck(sq) { this.checkSquare = sq }
  setHover(sq) { this.hoverSquare = sq }

  render(ctx, time = 0) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const orientation = this.boardAppearance.orientation
    this._glowPhase += 0.016

    this._drawBackground(ctx, time)

    // Ornate wooden frame with gold inlay
    const outerPad = 14
    const innerPad = 5

    // Outer shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 25
    ctx.fillStyle = '#1A1008'
    ctx.fillRect(
      boardOffsetX - outerPad,
      boardOffsetY - outerPad,
      8 * squareSize + 2 * outerPad,
      8 * squareSize + 2 * outerPad
    )
    ctx.restore()

    // Frame layers
    ctx.fillStyle = '#2C1E10'
    ctx.fillRect(boardOffsetX - outerPad, boardOffsetY - outerPad, 8 * squareSize + 2 * outerPad, 8 * squareSize + 2 * outerPad)

    // Gold inlay line
    ctx.fillStyle = '#8B6914'
    ctx.fillRect(boardOffsetX - innerPad - 1, boardOffsetY - innerPad - 1, 8 * squareSize + 2 * (innerPad + 1), 8 * squareSize + 2 * (innerPad + 1))

    // Inner dark wood
    ctx.fillStyle = '#1A1008'
    ctx.fillRect(boardOffsetX - innerPad, boardOffsetY - innerPad, 8 * squareSize + 2 * innerPad, 8 * squareSize + 2 * innerPad)

    // Corner brass studs
    const studSize = 5
    const studOffset = outerPad - 2
    const studs = [
      [boardOffsetX - studOffset, boardOffsetY - studOffset],
      [boardOffsetX + 8 * squareSize + studOffset - studSize, boardOffsetY - studOffset],
      [boardOffsetX - studOffset, boardOffsetY + 8 * squareSize + studOffset - studSize],
      [boardOffsetX + 8 * squareSize + studOffset - studSize, boardOffsetY + 8 * squareSize + studOffset - studSize]
    ]
    for (const [sx, sy] of studs) {
      ctx.fillStyle = '#B8860B'
      ctx.fillRect(sx, sy, studSize, studSize)
      ctx.fillStyle = '#E8C547'
      ctx.fillRect(sx + 1, sy + 1, studSize - 2, studSize - 2)
    }

    // Wood grain texture for the whole board area
    const grainCanvas = this._getWoodGrainCanvas(Math.max(squareSize * 2, 64))
    ctx.save()
    ctx.globalAlpha = 0.15
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const x = boardOffsetX + file * squareSize
        const y = boardOffsetY + rank * squareSize
        ctx.drawImage(grainCanvas, x, y, squareSize, squareSize)
      }
    }
    ctx.restore()

    // Draw squares
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isLight = (file + rank) % 2 === 0
        const x = boardOffsetX + file * squareSize
        const y = boardOffsetY + rank * squareSize

        // Base fill
        ctx.fillStyle = isLight ? this.lightColor : this.darkColor
        ctx.fillRect(x, y, squareSize, squareSize)

        // Varnish sheen (subtle)
        if (isLight) {
          const sheen = ctx.createLinearGradient(x, y, x, y + squareSize)
          sheen.addColorStop(0, 'rgba(255,230,180,0.06)')
          sheen.addColorStop(0.5, 'rgba(255,230,180,0)')
          sheen.addColorStop(1, 'rgba(0,0,0,0.08)')
          ctx.fillStyle = sheen
          ctx.fillRect(x, y, squareSize, squareSize)
        } else {
          const sheen = ctx.createLinearGradient(x, y, x, y + squareSize)
          sheen.addColorStop(0, 'rgba(255,230,180,0.03)')
          sheen.addColorStop(0.5, 'rgba(255,230,180,0)')
          sheen.addColorStop(1, 'rgba(0,0,0,0.12)')
          ctx.fillStyle = sheen
          ctx.fillRect(x, y, squareSize, squareSize)
        }

        // Edge bevel
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.fillRect(x, y, squareSize, 1)
        ctx.fillRect(x, y, 1, squareSize)
        ctx.fillStyle = 'rgba(255,230,180,0.04)'
        ctx.fillRect(x + squareSize - 1, y, 1, squareSize)
        ctx.fillRect(x, y + squareSize - 1, squareSize, 1)
      }
    }

    // Highlights
    if (this.captureHighlight.active && (this.captureHighlight.fromAlpha > 0 || this.captureHighlight.toAlpha > 0)) {
      this._drawCaptureSquare(ctx, this.captureHighlight.from, this.captureHighlight.fromAlpha, orientation)
      this._drawCaptureSquare(ctx, this.captureHighlight.to, this.captureHighlight.toAlpha, orientation)
    } else {
      this._drawPulseHighlight(ctx, this.lastMoveFrom, orientation, time)
      this._drawPulseHighlight(ctx, this.lastMoveTo, orientation, time)
    }

    if (this.selectedSquare >= 0) this._drawSelectedHighlight(ctx, this.selectedSquare, orientation)
    if (this.hoverSquare >= 0 && this.hoverSquare !== this.selectedSquare) this._drawHoverHighlight(ctx, this.hoverSquare, orientation)
    if (this.checkSquare >= 0) this._drawCheckHighlight(ctx, this.checkSquare, orientation, time)

    for (const move of this.legalMoves) {
      this._drawLegalMoveIndicator(ctx, move.to, orientation)
    }

    this._drawCoordinates(ctx, orientation)
  }

  _drawBackground(ctx, time) {
    const { width, height } = this.renderer
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7)
    gradient.addColorStop(0, '#1A1410')
    gradient.addColorStop(0.5, '#120E0A')
    gradient.addColorStop(1, '#0A0806')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Warm ambient light spots
    ctx.globalAlpha = 0.04
    const spot1 = ctx.createRadialGradient(width * 0.25, height * 0.75, 0, width * 0.25, height * 0.75, width * 0.4)
    spot1.addColorStop(0, '#E8C547')
    spot1.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = spot1
    ctx.fillRect(0, 0, width, height)
    ctx.globalAlpha = 1
  }

  _drawCaptureSquare(ctx, square, alpha, orientation) {
    if (square < 0) return
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const x = boardOffsetX + file * squareSize
    const y = boardOffsetY + rank * squareSize

    const gradient = ctx.createRadialGradient(x + squareSize / 2, y + squareSize / 2, 0, x + squareSize / 2, y + squareSize / 2, squareSize * 0.75)
    gradient.addColorStop(0, `rgba(184, 60, 40, ${alpha * 0.55})`)
    gradient.addColorStop(0.5, `rgba(139, 40, 20, ${alpha * 0.3})`)
    gradient.addColorStop(1, 'rgba(139, 40, 20, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, squareSize, squareSize)

    ctx.strokeStyle = `rgba(232, 197, 71, ${alpha * 0.7})`
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(232, 197, 71, 0.4)'
    ctx.shadowBlur = 8
    ctx.strokeRect(x + 2, y + 2, squareSize - 4, squareSize - 4)
    ctx.shadowBlur = 0
  }

  _drawPulseHighlight(ctx, square, orientation, time) {
    if (square < 0) return
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const x = boardOffsetX + file * squareSize
    const y = boardOffsetY + rank * squareSize

    const pulse = 0.2 + Math.sin(time * 0.003) * 0.08
    const gradient = ctx.createRadialGradient(x + squareSize / 2, y + squareSize / 2, 0, x + squareSize / 2, y + squareSize / 2, squareSize * 0.8)
    gradient.addColorStop(0, `rgba(232, 197, 71, ${pulse * 0.4})`)
    gradient.addColorStop(1, 'rgba(232, 197, 71, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, squareSize, squareSize)
  }

  _drawSelectedHighlight(ctx, square, orientation) {
    if (square < 0) return
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const x = boardOffsetX + file * squareSize
    const y = boardOffsetY + rank * squareSize

    const gradient = ctx.createRadialGradient(x + squareSize / 2, y + squareSize / 2, 0, x + squareSize / 2, y + squareSize / 2, squareSize * 0.8)
    gradient.addColorStop(0, 'rgba(232, 150, 50, 0.3)')
    gradient.addColorStop(1, 'rgba(232, 150, 50, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, squareSize, squareSize)

    ctx.strokeStyle = 'rgba(232, 197, 71, 0.45)'
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(232, 197, 71, 0.25)'
    ctx.shadowBlur = 6
    ctx.strokeRect(x + 2, y + 2, squareSize - 4, squareSize - 4)
    ctx.shadowBlur = 0
  }

  _drawHoverHighlight(ctx, square, orientation) {
    if (square < 0) return
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const x = boardOffsetX + file * squareSize
    const y = boardOffsetY + rank * squareSize
    ctx.fillStyle = 'rgba(232, 197, 71, 0.05)'
    ctx.fillRect(x, y, squareSize, squareSize)
  }

  _drawCheckHighlight(ctx, square, orientation, time) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const x = boardOffsetX + file * squareSize
    const y = boardOffsetY + rank * squareSize

    const pulse = 0.5 + Math.sin(time * 0.005) * 0.2
    const gradient = ctx.createRadialGradient(x + squareSize / 2, y + squareSize / 2, 0, x + squareSize / 2, y + squareSize / 2, squareSize * 0.8)
    gradient.addColorStop(0, `rgba(200, 40, 30, ${pulse * 0.6})`)
    gradient.addColorStop(0.5, `rgba(155, 30, 20, ${pulse * 0.35})`)
    gradient.addColorStop(1, 'rgba(155, 30, 20, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, squareSize, squareSize)

    ctx.strokeStyle = `rgba(200, 40, 30, ${pulse * 0.7})`
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(200, 40, 30, 0.4)'
    ctx.shadowBlur = 8
    ctx.strokeRect(x + 2, y + 2, squareSize - 4, squareSize - 4)
    ctx.shadowBlur = 0
  }

  _drawLegalMoveIndicator(ctx, square, orientation) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    const { file, rank } = this.renderer.squareToCoord(square, orientation)
    const cx = boardOffsetX + file * squareSize + squareSize / 2
    const cy = boardOffsetY + rank * squareSize + squareSize / 2
    const isCapture = this.isSquareOccupied(square)

    if (isCapture) {
      const cornerSize = squareSize * 0.2
      ctx.fillStyle = 'rgba(200, 40, 30, 0.6)'
      ctx.shadowColor = 'rgba(200, 40, 30, 0.3)'
      ctx.shadowBlur = 4
      const corners = [[0,0,1,1],[1,0,-1,1],[0,1,1,-1],[1,1,-1,-1]]
      for (const [fx, fy, dx, dy] of corners) {
        const bx = boardOffsetX + (file + fx) * squareSize
        const by = boardOffsetY + (rank + fy) * squareSize
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + cornerSize * dx, by)
        ctx.lineTo(bx, by + cornerSize * dy)
        ctx.closePath()
        ctx.fill()
      }
      ctx.shadowBlur = 0
    } else {
      ctx.fillStyle = 'rgba(232, 197, 71, 0.45)'
      ctx.shadowColor = 'rgba(232, 197, 71, 0.25)'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(cx, cy, squareSize * 0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  isSquareOccupied(square) {
    if (!this._position) return false
    return this._position.board[square] !== 0
  }

  setPosition(position) { this._position = position }

  _drawCoordinates(ctx, orientation) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer
    ctx.font = `bold ${squareSize * 0.16}px 'JetBrains Mono', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < 8; i++) {
      const fileChar = String.fromCharCode(97 + i)
      const rankChar = String(8 - i)
      const fileX = boardOffsetX + i * squareSize + squareSize * 0.88
      const fileY = boardOffsetY + 8 * squareSize - squareSize * 0.12
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(168,144,112,0.6)' : 'rgba(232,197,71,0.4)'
      ctx.fillText(orientation === -1 ? String.fromCharCode(104 - i) : fileChar, fileX, fileY)
      const rankX = boardOffsetX + squareSize * 0.12
      const rankY = boardOffsetY + i * squareSize + squareSize * 0.12
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(232,197,71,0.4)' : 'rgba(168,144,112,0.6)'
      ctx.fillText(orientation === -1 ? String(i + 1) : rankChar, rankX, rankY)
    }
  }

  flip() { this.boardAppearance.orientation = this.boardAppearance.orientation === 1 ? -1 : 1 }
}
