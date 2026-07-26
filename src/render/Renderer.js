import { ParticleSystem, ParticlePalettes } from '../animation/ParticleSystem.js'
import { CaptureTier } from '../animation/CaptureAnimations.js'

/**
 * Renderer — Arena Battle Style
 * Renders board + pieces inside camera transform (board space),
 * then renders all VFX overlays in screen space AFTER camera restore.
 */
export class Renderer {
  constructor(canvasRenderer, pieceRenderer, boardRenderer) {
    this.canvasRenderer = canvasRenderer
    this.pieceRenderer = pieceRenderer
    this.boardRenderer = boardRenderer

    this.ctx = canvasRenderer.ctx
    this.width = canvasRenderer.width
    this.height = canvasRenderer.height

    this.particleSystem = new ParticleSystem()
    this.animationManager = null
    this._renderTime = 0
  }

  setAnimationManager(am) { this.animationManager = am }

  resize(width, height) {
    this.width = width
    this.height = height
    this.canvasRenderer.resize(width, height)
  }

  render(engine, camera, ghostPieces = [], trails = [], captureEffects = null) {
    const { ctx, width, height } = this
    this._renderTime += 16.67

    this.clear()

    // === BOARD SPACE: everything inside camera transform ===
    if (camera && camera.isActive) {
      camera.applyTransform(ctx)
    }

    this.renderBackground(ctx, width, height)
    this.boardRenderer.render(ctx, this._renderTime)

    if (engine) {
      this.renderStaticPieces(engine, captureEffects)
    }

    // Render ghost pieces (attacker + victim)
    this.renderGhostPieces(ctx, ghostPieces, captureEffects)

    // Render trails
    for (const trail of trails) {
      if (trail && trail.length > 1) {
        this.renderTrail(ctx, trail)
      }
    }

    if (camera && camera.isActive) {
      camera.restoreTransform(ctx)
    }

    // === SCREEN SPACE: all overlay effects WITHOUT camera transform ===

    // 1. Capture effects (slash lines, darkening, vignette)
    if (captureEffects) {
      this.renderCaptureEffects(ctx, captureEffects)
    }

    // 2. Screen-level slash
    if (this.animationManager && this.animationManager.renderScreenSlash) {
      this.animationManager.renderScreenSlash(ctx)
    }

    // 3. Speed lines (manga radial burst)
    if (this.animationManager && this.animationManager.renderSpeedLines) {
      this.animationManager.renderSpeedLines(ctx)
    }

    // 4. Impact frame
    if (this.animationManager && this.animationManager.renderImpactFrame) {
      this.animationManager.renderImpactFrame(ctx)
    }

    // 5. Particle system
    if (this.particleSystem) {
      this.particleSystem.render(ctx)
    }

    this.renderDebugInfo(ctx, ghostPieces, trails)
  }

  clear() {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)
  }

  renderBackground(ctx, width, height) {
    // Deep arena floor
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.8
    )
    gradient.addColorStop(0, '#0d0b14')
    gradient.addColorStop(0.4, '#0a0812')
    gradient.addColorStop(0.8, '#050408')
    gradient.addColorStop(1, '#020103')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Arena spotlight effect
    ctx.globalAlpha = 0.04
    const spot1 = ctx.createRadialGradient(
      width * 0.3, height * 0.4, 0,
      width * 0.3, height * 0.4, width * 0.6
    )
    spot1.addColorStop(0, '#FFD700')
    spot1.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = spot1
    ctx.fillRect(0, 0, width, height)

    const spot2 = ctx.createRadialGradient(
      width * 0.7, height * 0.6, 0,
      width * 0.7, height * 0.6, width * 0.5
    )
    spot2.addColorStop(0, '#C41E3A')
    spot2.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = spot2
    ctx.fillRect(0, 0, width, height)
    ctx.globalAlpha = 1
  }

  renderStaticPieces(engine, captureEffects) {
    const position = engine.getPosition()
    const { board, colors } = position
    const { squareSize, boardOffsetX, boardOffsetY } = this.canvasRenderer
    const pieceSize = squareSize * this.pieceRenderer.drawScale
    const offset = (squareSize - pieceSize) / 2

    const pr = this.pieceRenderer

    if (pr.ghostPiece && pr.ghostPiece.alpha <= 0.01) {
      pr.ghostPiece = null
      pr.victimGhostPiece = null
    }

    const animatingToSquare = this.animationManager?._animatingToSquare ?? -1

    for (let sq = 0; sq < 64; sq++) {
      const piece = board[sq]
      const color = colors[sq]
      if (piece === 0) continue

      if (sq === animatingToSquare && pr.ghostPiece && pr.ghostPiece.alpha > 0.01) continue

      const { file, rank } = this.canvasRenderer.squareToCoord(sq, this.boardRenderer.boardAppearance.orientation)
      const x = boardOffsetX + file * squareSize + offset
      const y = boardOffsetY + rank * squareSize + offset

      this.pieceRenderer.drawPiece(this.ctx, piece, color, x, y, pieceSize)
    }
  }

  renderGhostPieces(ctx, ghostPieces, captureEffects) {
    // Shadows first
    for (const ghost of ghostPieces) {
      if (ghost && ghost.alpha > 0.01 && !ghost.isParticle) {
        ghost.drawShadow(ctx)
        if (ghost.drawDust) ghost.drawDust(ctx)
      }
    }

    // Attacker ghost trail + piece
    const attackerGhost = this.pieceRenderer.ghostPiece
    if (attackerGhost && attackerGhost.alpha > 0.01) {
      attackerGhost.drawTrail(ctx, attackerGhost.color)
      if (attackerGhost.drawDust) attackerGhost.drawDust(ctx)
      attackerGhost.draw(ctx)
    }

    // Victim ghost
    const victimGhost = this.pieceRenderer.victimGhostPiece
    if (victimGhost && victimGhost.alpha > 0.01) {
      if (captureEffects?.tier === CaptureTier.PAWN_SPLIT && captureEffects?.effect) {
        this.renderSplitVictim(ctx, victimGhost, captureEffects.effect)
      } else {
        victimGhost.draw(ctx)
      }
    }

    // Other ghost pieces (particles etc.)
    for (const ghost of ghostPieces) {
      if (ghost && ghost.alpha > 0.01 && ghost !== attackerGhost && ghost !== victimGhost) {
        ghost.draw(ctx)
      }
    }
  }

  renderSplitVictim(ctx, victimGhost, effect) {
    if (effect.dissolveAlpha <= 0.01) return

    const halfW = effect.pieceSize * 0.5
    const splitAngle = effect.travelAngle + Math.PI / 2
    const cx = effect.cx
    const cy = effect.cy
    const pieceSize = effect.pieceSize

    ctx.save()
    ctx.globalAlpha = effect.dissolveAlpha
    const leftOffsetX = effect.leftHalfOffset * Math.cos(splitAngle)
    const leftOffsetY = effect.leftHalfOffset * Math.sin(splitAngle)
    ctx.beginPath()
    ctx.rect(cx - pieceSize * 0.5 + leftOffsetX, cy - pieceSize * 0.5, halfW, pieceSize)
    ctx.clip()
    ctx.translate(leftOffsetX, leftOffsetY)
    victimGhost.draw(ctx)
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = effect.dissolveAlpha
    const rightOffsetX = effect.rightHalfOffset * Math.cos(splitAngle)
    const rightOffsetY = effect.rightHalfOffset * Math.sin(splitAngle)
    ctx.beginPath()
    ctx.rect(cx, cy - pieceSize * 0.5, halfW, pieceSize)
    ctx.clip()
    ctx.translate(rightOffsetX, rightOffsetY)
    victimGhost.draw(ctx)
    ctx.restore()
  }

  renderTrail(ctx, trail) {
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'

    for (let i = 1; i < trail.length; i++) {
      const t = i / trail.length
      const prev = trail[i - 1]
      const curr = trail[i]
      const alpha = t * 0.18

      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 4 * t
      ctx.lineCap = 'round'
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(curr.x, curr.y)
      ctx.stroke()
    }
    ctx.restore()
  }

  renderCaptureEffects(ctx, effects) {
    if (!effects) return

    if (effects.effect && typeof effects.effect.render === 'function') {
      effects.effect.render(ctx)
      return
    }

    const pieceSize = effects.pieceSize || 64
    const cx = effects.centerX || 0
    const cy = effects.centerY || 0

    if (effects.flashAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = effects.flashAlpha * 0.15
      ctx.fillStyle = '#FFD700'
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.restore()
    }

    if (effects.ringProgress > 0.01) {
      const ringR = pieceSize * (0.5 + effects.ringProgress * 3)
      const ringWidth = pieceSize * 0.12 * (1 - effects.ringProgress)
      ctx.save()
      ctx.globalAlpha = (1 - effects.ringProgress) * 0.8
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = ringWidth
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 16
      ctx.beginPath()
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    if (effects.victimFragments && effects.victimFragments.length > 0) {
      for (const f of effects.victimFragments) {
        if (f.alpha <= 0) continue
        ctx.save()
        ctx.globalAlpha = f.alpha
        ctx.translate(f.x, f.y)
        ctx.rotate(f.rotation)
        ctx.fillStyle = f.color
        ctx.shadowColor = f.color
        ctx.shadowBlur = 8
        if (f.shape === 'square') {
          ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size)
        } else if (f.shape === 'diamond') {
          ctx.beginPath()
          ctx.moveTo(0, -f.size)
          ctx.lineTo(f.size, 0)
          ctx.lineTo(0, f.size)
          ctx.lineTo(-f.size, 0)
          ctx.closePath()
          ctx.fill()
        } else if (f.shape === 'triangle') {
          ctx.beginPath()
          ctx.moveTo(0, -f.size)
          ctx.lineTo(f.size * 0.866, f.size * 0.5)
          ctx.lineTo(-f.size * 0.866, f.size * 0.5)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
    }

    if (effects.chromaticAberration > 0.01) {
      const splitDist = pieceSize * 0.04 * effects.chromaticAberration
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = 0.4 * effects.chromaticAberration
      ctx.filter = 'sepia(1) saturate(5) hue-rotate(-120deg)'
      ctx.drawImage(ctx.canvas, -splitDist, 0)
      ctx.filter = 'sepia(1) saturate(5) hue-rotate(120deg)'
      ctx.drawImage(ctx.canvas, splitDist, 0)
      ctx.filter = 'none'
      ctx.restore()
    }

    if (effects.vignette > 0.01) {
      ctx.save()
      const gradient = ctx.createRadialGradient(
        this.width / 2, this.height / 2, 0,
        this.width / 2, this.height / 2, Math.max(this.width, this.height)
      )
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, `rgba(10,5,20,${effects.vignette * 0.6})`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.restore()
    }
  }

  renderDebugInfo(ctx, ghostPieces, trails) {
    if (!this.debug) return

    ctx.save()
    ctx.font = '12px monospace'
    ctx.fillStyle = '#FFD700'
    ctx.fillText(`Ghost pieces: ${ghostPieces.filter(g => g?.visible).length}`, 10, 20)
    ctx.fillText(`Trails: ${trails.length}`, 10, 35)
    ctx.restore()
  }
}
