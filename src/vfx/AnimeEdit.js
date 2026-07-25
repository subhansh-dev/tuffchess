import { timeManager } from '../animation/TimeManager.js'

/**
 * AnimeEdit — 2-Second Anime-Style Kill Cam
 * 
 * Timeline (2000ms):
 *   0ms      TIME FREEZE — World stops, killer glows
 *  50ms     CAMERA SLAM — Instant zoom to killer piece
 * 100ms     SPEED LINES — Radial burst from killer
 * 150ms     FLASH — White frame flash
 * 200ms     KILLER CLOSEUP — Portrait moment, piece scales up
 * 400ms     IMPACT WAVE — Shockwave from killer to victim
 * 600ms     VICTIM SHATTER — Target explodes in slow-mo
 * 800ms     BLOOD/ENERGY — Particles burst from impact point
 * 1000ms    CAMERA SHAKE — Heavy trauma shake
 * 1200ms    CHROMATIC ABERRATION — RGB split peaks
 * 1400ms    VIGNETTE + DARKEN — Dramatic framing
 * 1600ms    SLOW RECOVERY — Time returns to normal
 * 1800ms    FADE OUT — Effects dissipate
 * 2000ms    DONE
 */
export class AnimeEdit {
  constructor(renderer, camera, particleEngine, audioManager, comboSystem) {
    this.renderer = renderer
    this.camera = camera
    this.particleEngine = particleEngine
    this.audioManager = audioManager
    this.comboSystem = comboSystem

    this.active = false
    this.captureData = null
    this.startTime = 0
    this.duration = 2.0 // 2 seconds

    // State for rendering
    this.state = {
      // Camera
      camZoom: 1,
      camTargetX: 0,
      camTargetY: 0,
      camRotation: 0,
      
      // Effects
      timeFreeze: 0,           // 0-1, how frozen time is
      speedLines: 0,           // 0-1, speed line intensity
      flashAlpha: 0,           // 0-1, white flash
      killerGlow: 0,           // 0-1, killer piece glow
      killerScale: 1,          // killer piece scale
      killerAlpha: 1,          // killer piece alpha
      victimAlpha: 1,          // victim piece alpha
      victimScale: 1,          // victim piece scale
      impactWave: 0,           // 0-1, shockwave from killer to victim
      shatterProgress: 0,      // 0-1, victim shatter
      particlesBurst: 0,       // trigger for particle burst
      shakeIntensity: 0,       // camera shake
      chromaticAberration: 0,  // RGB split
      vignette: 0,             // vignette intensity
      darken: 0,               // screen darken
      
      // Portrait
      showPortrait: false,
      portraitScale: 0,
      portraitAlpha: 0,
    }

    // Positions
    this.killerPos = { x: 0, y: 0 }
    this.victimPos = { x: 0, y: 0 }
    this.killerSquare = -1
    this.victimSquare = -1
    this.killerPiece = 0
    this.killerColor = 1
    this.victimPiece = 0

    // Callbacks
    this.onComplete = null
    this._resolve = null

    // Portrait canvas (for killer piece closeup)
    this.portraitCanvas = document.createElement('canvas')
    this.portraitCanvas.width = 256
    this.portraitCanvas.height = 256
    this.portraitCtx = this.portraitCanvas.getContext('2d')
  }

  trigger(captureData) {
    if (this.active) return Promise.resolve()
    
    this.active = true
    this.captureData = captureData
    
    // Get positions
    const fromCenter = this.getSquareCenter(captureData.from)
    const toCenter = this.getSquareCenter(captureData.to)
    
    this.killerPos = fromCenter
    this.victimPos = toCenter
    this.killerSquare = captureData.from
    this.victimSquare = captureData.to
    this.killerPiece = captureData.piece
    this.killerColor = captureData.color || 1
    this.victimPiece = captureData.captured

    // Reset state
    for (const key in this.state) {
      if (typeof this.state[key] === 'number') this.state[key] = 0
      else if (typeof this.state[key] === 'boolean') this.state[key] = false
    }
    this.state.camZoom = 1
    this.state.killerScale = 1
    this.state.killerAlpha = 1
    this.state.victimAlpha = 1
    this.state.victimScale = 1

    this.startTime = performance.now()
    this._speedLinesSpawned = false
    this._flashSoundPlayed = false
    this._impactParticlesSpawned = false
    this._burstParticlesSpawned = false
    
    // DON'T pause engine — just let the animation run and resolve when done
    
    // Play whoosh sound
    if (this.audioManager) this.audioManager.playWhoosh?.()

    return new Promise(resolve => { this._resolve = resolve })
  }

  getSquareCenter(sq) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer.canvasRenderer
    const file = sq % 8
    const rank = Math.floor(sq / 8)
    return {
      x: boardOffsetX + (file + 0.5) * squareSize,
      y: boardOffsetY + (7 - rank + 0.5) * squareSize
    }
  }

  update() {
    if (!this.active) return

    const elapsed = (performance.now() - this.startTime) / 1000
    const progress = Math.min(elapsed / this.duration, 1)
    const s = this.state

    // ═══ 0-50ms: TIME FREEZE ═══
    if (progress < 0.025) {
      const t = progress / 0.025
      s.timeFreeze = this.easeInCubic(t)
      s.killerGlow = t
      // Camera snaps to killer
      s.camTargetX = this.killerPos.x
      s.camTargetY = this.killerPos.y
      s.camZoom = 1 + t * 0.5
    }

    // ═══ 50-100ms: CAMERA SLAM ZOOM ═══
    if (progress >= 0.025 && progress < 0.05) {
      const t = (progress - 0.025) / 0.025
      s.camZoom = 1.5 + this.easeOutExpo(t) * 1.5 // Zoom to 3x
      s.killerGlow = 1
      s.killerScale = 1 + this.easeOutBack(t) * 0.3
    }

    // ═══ 100-150ms: SPEED LINES BURST ═══
    if (progress >= 0.05 && progress < 0.075) {
      const t = (progress - 0.05) / 0.025
      s.speedLines = this.easeOutExpo(t)
      if (t > 0.5 && !this._speedLinesSpawned) {
        this.spawnSpeedLines()
        this._speedLinesSpawned = true
      }
    }

    // ═══ 150-200ms: WHITE FLASH ═══
    if (progress >= 0.075 && progress < 0.1) {
      const t = (progress - 0.075) / 0.025
      if (t < 0.5) {
        s.flashAlpha = this.easeOutQuad(t * 2) * 0.9
      } else {
        s.flashAlpha = this.easeInQuad((t - 0.5) * 2) * 0.9
      }
      if (t > 0.5 && !this._flashSoundPlayed) {
        if (this.audioManager) this.audioManager.playBassImpact?.()
        this._flashSoundPlayed = true
      }
    }

    // ═══ 200-400ms: KILLER PORTRAIT / CLOSEUP ═══
    if (progress >= 0.1 && progress < 0.2) {
      const t = (progress - 0.1) / 0.1
      s.showPortrait = true
      s.portraitScale = this.easeOutBack(t)
      s.portraitAlpha = 1
      s.killerScale = 1 + 0.4 * this.easeOutElastic(t)
      // Camera stays locked on killer
      s.camTargetX = this.killerPos.x
      s.camTargetY = this.killerPos.y
    }

    // ═══ 400-600ms: IMPACT WAVE (killer → victim) ═══
    if (progress >= 0.2 && progress < 0.3) {
      const t = (progress - 0.2) / 0.1
      s.impactWave = this.easeOutExpo(t)
      s.camZoom = 3 + t * 0.5 // Slight push
      if (t > 0.5 && !this._impactParticlesSpawned) {
        this.spawnImpactParticles()
        this._impactParticlesSpawned = true
        if (this.audioManager) this.audioManager.playExplosion?.()
      }
    }

    // ═══ 600-800ms: VICTIM SHATTER ═══
    if (progress >= 0.3 && progress < 0.4) {
      const t = (progress - 0.3) / 0.1
      s.shatterProgress = this.easeInCubic(t)
      s.victimScale = 1 + this.easeOutElastic(t) * 0.5
      s.victimAlpha = 1 - this.easeInCubic(t)
      // Camera shakes
      s.shakeIntensity = this.easeOutQuad(t) * 15
    }

    // ═══ 800-1000ms: PARTICLE BURST / BLOOD ═══
    if (progress >= 0.4 && progress < 0.5) {
      const t = (progress - 0.4) / 0.1
      if (t < 0.1 && !this._burstParticlesSpawned) {
        this.spawnBurstParticles()
        this._burstParticlesSpawned = true
      }
      s.particlesBurst = 1
      s.shakeIntensity = 15 * (1 - t)
    }

    // ═══ 1000-1200ms: HEAVY CAMERA SHAKE ═══
    if (progress >= 0.5 && progress < 0.6) {
      const t = (progress - 0.5) / 0.1
      s.shakeIntensity = this.easeOutQuad(1 - t) * 20
      s.camRotation = Math.sin(progress * 100) * 0.02 * (1 - t)
    }

    // ═══ 1200-1400ms: CHROMATIC ABERRATION PEAK ═══
    if (progress >= 0.6 && progress < 0.7) {
      const t = (progress - 0.6) / 0.1
      if (t < 0.5) {
        s.chromaticAberration = this.easeOutQuad(t * 2) * 1.5
      } else {
        s.chromaticAberration = this.easeInQuad((t - 0.5) * 2) * 1.5
      }
    }

    // ═══ 1400-1600ms: VIGNETTE + DARKEN ═══
    if (progress >= 0.7 && progress < 0.8) {
      const t = (progress - 0.7) / 0.1
      s.vignette = this.easeOutQuad(t) * 0.6
      s.darken = this.easeOutQuad(t) * 0.3
    }

    // ═══ 1600-1800ms: SLOW RECOVERY ═══
    if (progress >= 0.8 && progress < 0.9) {
      const t = (progress - 0.8) / 0.1
      s.camZoom = 3 + (1 - 3) * this.easeInOutCubic(t)
      s.camTargetX = this.killerPos.x + (this.renderer.canvasRenderer.width / 2 - this.killerPos.x) * this.easeInOutCubic(t)
      s.camTargetY = this.killerPos.y + (this.renderer.canvasRenderer.height / 2 - this.killerPos.y) * this.easeInOutCubic(t)
      s.chromaticAberration = 1.5 * (1 - t)
      s.vignette = 0.6 * (1 - t)
      s.darken = 0.3 * (1 - t)
      s.showPortrait = false
      // Restore time scale
      timeManager.setGlobalScale(0.5 + 0.5 * t, 5)
    }

    // ═══ 1800-2000ms: FADE OUT ═══
    if (progress >= 0.9 && progress < 1.0) {
      const t = (progress - 0.9) / 0.1
      s.flashAlpha = 0
      s.killerGlow = 1 - t
      s.killerScale = 1
      timeManager.setGlobalScale(1, 8)
    }

    // Complete
    if (progress >= 1) {
      this.finish()
    }
  }

  spawnSpeedLines() {
    const cx = this.killerPos.x
    const cy = this.killerPos.y
    const count = 24
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3
      this.particleEngine.emit('bladeSlash', cx, cy, {
        count: 1,
        angleOffset: angle,
        spread: 0.1,
        override: { vx: Math.cos(angle) * 0, vy: Math.sin(angle) * 0 }
      }, 'foreground')
    }
    // Also spawn radial speed lines using custom particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      this.particleEngine.emitCustom([{
        x: cx, y: cy,
        vx: Math.cos(angle) * 800,
        vy: Math.sin(angle) * 800,
        radius: 2,
        color: this.killerColor === 1 ? '#B8960F' : '#8B7355',
        shape: 'slashTrail',
        maxLife: 0.3,
        gravity: 0,
        rotation: angle,
        rotationSpeed: 0,
        glow: true,
        trailLength: 8,
        alpha: 1
      }], 'foreground')
    }
  }

  spawnImpactParticles() {
    const cx = this.victimPos.x
    const cy = this.victimPos.y
    const isWhite = this.killerColor === 1
    
    // Impact burst
    this.particleEngine.emit('impactBurst', cx, cy, { count: 60 }, 'foreground')
    this.particleEngine.emit('executionFlash', cx, cy, {}, 'foreground')
    this.particleEngine.emit(isWhite ? 'holyLight' : 'darkEnergy', cx, cy, { count: 50 }, 'foreground')
    this.particleEngine.emit('staggerRings', cx, cy, {}, 'foreground')
    this.particleEngine.emit('assassination', cx, cy, { count: 70 }, 'foreground')
  }

  spawnBurstParticles() {
    const cx = this.victimPos.x
    const cy = this.victimPos.y
    const isWhite = this.killerColor === 1
    
    // Blood mist / soul release
    this.particleEngine.emit('bloodMist', cx, cy, { count: 50 }, 'foreground')
    this.particleEngine.emit('soulRelease', cx, cy, { count: 40 }, 'foreground')
    this.particleEngine.emit(isWhite ? 'holyLight' : 'darkEnergy', cx, cy, { count: 40 }, 'foreground')
  }

  render(ctx) {
    if (!this.active) return
    const s = this.state
    const { width, height, squareSize, boardOffsetX, boardOffsetY } = this.renderer.canvasRenderer

    ctx.save()

    // Apply camera transform for this effect
    const centerX = width / 2
    const centerY = height / 2
    ctx.translate(centerX, centerY)
    ctx.scale(s.camZoom, s.camZoom)
    ctx.rotate(s.camRotation)
    ctx.translate(-centerX - s.camTargetX + centerX, -centerY - s.camTargetY + centerY)

    // ═══ SCREEN DARKEN ═══
    if (s.darken > 0.01) {
      ctx.save()
      ctx.globalAlpha = s.darken
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }

    // ═══ VIGNETTE ═══
    if (s.vignette > 0.01) {
      const gradient = ctx.createRadialGradient(centerX, centerY, width * 0.1, centerX, centerY, width * 0.7)
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, `rgba(0,0,0,${s.vignette})`)
      ctx.save()
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }

    // ═══ SPEED LINES (rendered as radial lines from killer) ═══
    if (s.speedLines > 0.01) {
      this.renderSpeedLines(ctx, s.speedLines)
    }

    // ═══ IMPACT WAVE (expanding ring from killer to victim) ═══
    if (s.impactWave > 0.01) {
      this.renderImpactWave(ctx, s.impactWave)
    }

    // ═══ WHITE FLASH ═══
    if (s.flashAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = s.flashAlpha
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }

    // ═══ KILLER GLOW ═══
    if (s.killerGlow > 0.01) {
      this.renderKillerGlow(ctx, s.killerGlow)
    }

    // ═══ PORTRAIT / CLOSEUP ═══
    if (s.showPortrait && s.portraitAlpha > 0.01) {
      this.renderPortrait(ctx, s.portraitScale, s.portraitAlpha)
    }

    ctx.restore()

    // ═══ CHROMATIC ABERRATION (post-camera) ═══
    if (s.chromaticAberration > 0.01) {
      this.renderChromaticAberration(ctx, s.chromaticAberration)
    }

    // ═══ SHAKE OFFSET (applied after everything) ═══
    if (s.shakeIntensity > 0.01) {
      // Handled by camera controller
    }
  }

  renderSpeedLines(ctx, intensity) {
    const cx = this.killerPos.x
    const cy = this.killerPos.y
    const maxLen = Math.max(this.renderer.canvasRenderer.width, this.renderer.canvasRenderer.height) * 1.5

    ctx.save()
    ctx.globalAlpha = intensity * 0.6
    ctx.strokeStyle = this.killerColor === 1 ? '#B8960F' : '#8B7355'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    const count = 24
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const offset = (Math.random() - 0.5) * 100
      const perpAngle = angle + Math.PI / 2
      
      const startX = cx + Math.cos(perpAngle) * offset
      const startY = cy + Math.sin(perpAngle) * offset
      const endX = startX + Math.cos(angle) * maxLen
      const endY = startY + Math.sin(angle) * maxLen

      // Gradient
      const grad = ctx.createLinearGradient(startX, startY, endX, endY)
      grad.addColorStop(0, this.killerColor === 1 ? 'rgba(255,215,0,0.8)' : 'rgba(124,77,255,0.8)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = grad

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }
    ctx.restore()
  }

  renderImpactWave(ctx, progress) {
    const cx = this.killerPos.x
    const cy = this.killerPos.y
    const targetDist = Math.sqrt(
      Math.pow(this.victimPos.x - cx, 2) + Math.pow(this.victimPos.y - cy, 2)
    )
    const currentRadius = targetDist * progress

    ctx.save()
    ctx.globalAlpha = (1 - progress) * 0.8
    ctx.strokeStyle = this.killerColor === 1 ? '#B8960F' : '#8B7355'
    ctx.lineWidth = 4
    ctx.shadowColor = this.killerColor === 1 ? '#B8960F' : '#8B7355'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Inner ring
    ctx.lineWidth = 2
    ctx.globalAlpha = (1 - progress) * 0.5
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(cx, cy, currentRadius * 0.8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  renderKillerGlow(ctx, intensity) {
    const cx = this.killerPos.x
    const cy = this.killerPos.y
    const squareSize = this.renderer.canvasRenderer.squareSize
    const glowRadius = squareSize * 1.5 * intensity

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius)
    const color = this.killerColor === 1 ? '255, 215, 0' : '124, 77, 255'
    gradient.addColorStop(0, `rgba(${color}, ${intensity * 0.6})`)
    gradient.addColorStop(0.4, `rgba(${color}, ${intensity * 0.3})`)
    gradient.addColorStop(1, `rgba(${color}, 0)`)

    ctx.save()
    ctx.fillStyle = gradient
    ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2)
    ctx.restore()
  }

  renderPortrait(ctx, scale, alpha) {
    // Draw killer piece large in center of screen
    const centerX = this.renderer.canvasRenderer.width / 2
    const centerY = this.renderer.canvasRenderer.height / 2
    const size = 200 * scale

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(centerX, centerY)
    ctx.scale(scale, scale)
    ctx.translate(-centerX, -centerY)

    // Background glow
    const glowRadius = size * 1.5
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
    const color = this.killerColor === 1 ? '255, 215, 0' : '124, 77, 255'
    gradient.addColorStop(0, `rgba(${color}, 0.3)`)
    gradient.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(centerX - glowRadius, centerY - glowRadius, glowRadius * 2, glowRadius * 2)

    // Draw piece
    const pieceSize = size
    const x = centerX - pieceSize / 2
    const y = centerY - pieceSize / 2
    this.drawPieceLarge(ctx, this.killerPiece, this.killerColor, x, y, pieceSize)

    ctx.restore()
  }

  drawPieceLarge(ctx, piece, color, x, y, size) {
    const symbol = this.getPieceSymbol(piece)
    const colorName = color === 1 ? 'white' : 'black'
    const key = `${colorName}-${symbol}`
    const img = this.renderer.pieceRenderer.pieceImages.get(key)
    if (img && img.complete && img.naturalWidth > 0) {
      // Add glow effect
      ctx.shadowColor = color === 1 ? '#B8960F' : '#8B7355'
      ctx.shadowBlur = 30
      ctx.drawImage(img, x, y, size, size)
    }
  }

  getPieceSymbol(piece) {
    // Correct mapping: Piece.PAWN=1, Piece.KNIGHT=2, Piece.BISHOP=3, Piece.ROOK=4, Piece.QUEEN=5, Piece.KING=6
    const symbols = { 1: 'pawn', 2: 'knight', 3: 'bishop', 4: 'rook', 5: 'queen', 6: 'king' }
    return symbols[piece] || 'pawn'
  }

  renderChromaticAberration(ctx, intensity) {
    // Use fast CSS-based approach instead of per-pixel ImageData manipulation
    // Draw three offset copies of the canvas content with different blend modes
    const shift = Math.round(intensity * 5)
    if (shift < 1) return

    const w = this.renderer.canvasRenderer.width
    const h = this.renderer.canvasRenderer.height
    const canvas = ctx.canvas

    ctx.save()
    // Red channel shifted left
    ctx.globalAlpha = intensity * 0.3
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(canvas, -shift, 0, w, h)
    // Blue channel shifted right
    ctx.drawImage(canvas, shift, 0, w, h)
    ctx.restore()
  }

  finish() {
    this.active = false
    timeManager.setGlobalScale(1, 10)
    if (this._resolve) { this._resolve(); this._resolve = null }
  }

  // Easing functions
  easeInCubic(t) { return t * t * t }
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
  easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
  easeInQuad(t) { return t * t }
  easeOutQuad(t) { return 1 - (1 - t) * (1 - t) }
  easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }
  easeOutBack(t) {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  }
  easeOutElastic(t) {
    if (t === 0) return 0
    if (t === 1) return 1
    const p = 0.3
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / p) + 1
  }
}