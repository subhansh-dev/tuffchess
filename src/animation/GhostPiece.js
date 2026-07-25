export class GhostPiece {
  constructor(pieceRenderer, piece, color, x, y, size) {
    this.pieceRenderer = pieceRenderer
    this.piece = piece
    this.color = color
    this.x = x
    this.y = y
    this.size = size
    this.scaleX = 1
    this.scaleY = 1
    this.rotation = 0
    this.alpha = 1
    this.height = 0
    this.shadowAlpha = 0.15
    this.trail = []
    this.config = null
    this.travelAngle = 0
    this.dustParticles = []
  }

  setConfig(config, travelAngle) {
    this.config = config
    this.travelAngle = travelAngle
  }

  applyTransform(ctx) {
    const cx = this.x + this.size / 2
    const cy = this.y + this.size / 2

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.rotation)
    ctx.scale(this.scaleX, this.scaleY)
    ctx.translate(-cx, -cy)
    ctx.globalAlpha = this.alpha
  }

  restoreTransform(ctx) {
    ctx.restore()
  }

  draw(ctx) {
    this.applyTransform(ctx)
    this.pieceRenderer.drawPiece(ctx, this.piece, this.color, this.x, this.y, this.size)
    this.restoreTransform(ctx)
  }

  drawTrail(ctx, color) {
    if (this.trail.length < 2) return

    const trailColor = color === 1 ? '#F5F0E8' : '#2C2C2C'

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'

    for (let i = 1; i < this.trail.length; i++) {
      const t = i / this.trail.length
      const prev = this.trail[i - 1]
      const curr = this.trail[i]
      const alpha = t * 0.12 * (1 - this.height * 0.5)

      ctx.globalAlpha = alpha
      ctx.strokeStyle = trailColor
      ctx.lineWidth = this.size * 0.15 * t
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(prev.x + this.size / 2, prev.y + this.size / 2)
      ctx.lineTo(curr.x + this.size / 2, curr.y + this.size / 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawShadow(ctx) {
    const cx = this.x + this.size / 2
    const liftAmount = Math.max(0, this.height)
    // Shadow moves DOWN when piece lifts UP; shrinks as piece lifts
    const shadowY = this.y + this.size + 2 + liftAmount * 10
    const shadowScale = 0.5 - liftAmount * 0.15
    const shadowH = this.size * 0.06 * (1 - liftAmount * 0.3)
    const shadowW = this.size * Math.max(0.2, shadowScale)

    ctx.save()
    ctx.globalAlpha = this.shadowAlpha * 0.5
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.beginPath()
    ctx.ellipse(cx, shadowY, shadowW, Math.max(shadowH, 1), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawDust(ctx) {
    if (this.dustParticles.length === 0) return
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    for (const p of this.dustParticles) {
      if (p.alpha <= 0.01) continue
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  updateDust(dt) {
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i]
      p.life -= dt
      p.alpha = Math.max(0, p.life / p.maxLife)
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.life <= 0) {
        this.dustParticles.splice(i, 1)
      }
    }
  }
}
