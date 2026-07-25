/**
 * CinematicCapture — Camera + Timing + Lighting. No particles, NO GSAP.
 * Native timeline for frame-perfect sync with render loop.
 * 
 * Timeline (~650ms):
 *   0ms     Board darkens, camera push (anticipation)
 *  35ms     HIT STOP: 70ms freeze
 *  45ms     Piece launches (fast)
 * 120ms     IMPACT: flash, directional shake, zoom punch, chromatic aberration
 * 140ms     Captured piece destruction (glow + crack + fade)
 * 190ms     Board lighting reaction (tiles glow outward)
 * 350ms     Camera recovery (elastic-out)
 * 500ms     Board brightens, normalcy
 * 650ms     Done
 */
export class CinematicCapture {
  constructor(renderer, camera, audioManager, comboSystem) {
    this.renderer = renderer
    this.camera = camera
    this.audioManager = audioManager
    this.comboSystem = comboSystem

    this.active = false
    this.timeline = null
    this.captureData = null
    this.intensity = 1
    this._resolve = null
    this._safetyTimer = null

    this.state = {
      boardDarken: 0,
      flashAlpha: 0,
      chromaticPulse: 0,
      vignetteIntensity: 0,
      boardGlowAlpha: 0,
      destructionGlow: 0,
      destructionCracks: 0,
      pieceFadeAlpha: 1,
      pieceScale: 1
    }

    this.squareFrom = { x: 0, y: 0 }
    this.squareTo = { x: 0, y: 0 }
    this.attackAngle = 0
    this.reactionSquares = []

    this.startTime = 0
    this.duration = 0.65
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

  trigger(captureData) {
    if (this.active) return Promise.resolve()
    this.active = true
    this.captureData = captureData
    this.intensity = this.comboSystem ? this.comboSystem.getIntensityMultiplier() : 1

    this.squareFrom = this.getSquareCenter(captureData.from)
    this.squareTo = this.getSquareCenter(captureData.to)
    this.attackAngle = Math.atan2(
      this.squareTo.y - this.squareFrom.y,
      this.squareTo.x - this.squareFrom.x
    )

    for (const key in this.state) this.state[key] = 0
    this.state.pieceFadeAlpha = 1
    this.state.pieceScale = 1

    this.computeReactionSquares(captureData.to)

    this._safetyTimer = setTimeout(() => {
      if (this.active) this.finish()
    }, 3000)

    this.buildTimeline()
    this.startTime = performance.now()
    return new Promise(resolve => { this._resolve = resolve })
  }

  computeReactionSquares(targetSq) {
    const file = targetSq % 8
    const rank = Math.floor(targetSq / 8)
    this.reactionSquares = []
    for (let df = -2; df <= 2; df++) {
      for (let dr = -2; dr <= 2; dr++) {
        if (df === 0 && dr === 0) continue
        const f = file + df
        const r = rank + dr
        if (f < 0 || f > 7 || r < 0 || r > 7) continue
        const dist = Math.sqrt(df * df + dr * dr)
        this.reactionSquares.push({
          sq: r * 8 + f, dist, alpha: 0,
          maxAlpha: Math.max(0, 0.45 - dist * 0.1) * this.intensity
        })
      }
    }
  }

  buildTimeline() {
    const s = this.state
    const I = this.intensity
    const cam = this.camera
    const cx = this.squareTo.x
    const cy = this.squareTo.y

    // Native timeline: array of tracks
    // Each track: { target, prop, from, to, start, dur, ease, delay, onStart, onComplete }
    this.timeline = []

    // Easing functions
    const ease = {
      none: t => t,
      power2In: t => t * t,
      power2Out: t => 1 - (1 - t) * (1 - t),
      power2InOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
      power3Out: t => 1 - Math.pow(1 - t, 3),
      power3In: t => t * t * t,
      elasticOut: t => {
        if (t === 0) return 0
        if (t === 1) return 1
        const p = 0.5
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / p) + 1
      }
    }

    const add = (target, prop, to, start, dur, easeFn = 'power2Out', from = null, onStart = null, onComplete = null) => {
      this.timeline.push({ target, prop, from: from ?? target[prop], to, start, dur, ease: ease[easeFn], onStart, onComplete, fired: false })
    }

    const addFn = (fn, time) => {
      this.timeline.push({ fn, time, fired: false })
    }

    // ═══ ANTICIPATION (0-35ms) ═══
    add(s, 'boardDarken', 0.22, 0, 0.035, 'power2In')
    add(s, 'vignetteIntensity', 0.28, 0, 0.035, 'power2In')
    add(cam, 'zoom', 1.05, 0, 0.055, 'power2Out')

    // ═══ HIT STOP (35-105ms) ═══
    addFn(() => {
      if (this.captureData?.onHitStop) this.captureData.onHitStop()
    }, 0.035)

    add(s, 'chromaticPulse', 0.55 * I, 0.035, 0.015, 'none')
    add(s, 'chromaticPulse', 0, 0.05, 0.07, 'power3Out')

    // ═══ LAUNCH (45ms) ═══
    addFn(() => {
      // Piece animation is handled by AnimationManager, not PieceRenderer directly
      if (this.audioManager) this.audioManager.playWhoosh?.()
    }, 0.045)

    add(cam, 'zoom', 1.07 * I, 0.045, 0.075, 'power2Out')
    add(cam, 'rotation', this.attackAngle * 0.007, 0.045, 0.075, 'power2Out')

    // ═══ IMPACT (120ms) ═══
    add(s, 'flashAlpha', 0.7 * Math.min(I, 2), 0.12, 0.008, 'none')
    add(s, 'flashAlpha', 0, 0.128, 0.1, 'power3Out')

    addFn(() => {
      cam.directionalShake(16 * I, this.attackAngle, 280)
    }, 0.12)

    add(cam, 'zoom', 1.12 * I, 0.12, 0.035, 'power3Out')
    add(cam, 'zoom', 1, 0.155, 0.38, 'elasticOut')
    add(cam, 'rotation', 0, 0.155, 0.38, 'elasticOut')

    add(s, 'chromaticPulse', 0.9 * I, 0.12, 0.018, 'none')
    add(s, 'chromaticPulse', 0, 0.138, 0.18, 'power2Out')

    add(s, 'vignetteIntensity', 0.5 * I, 0.12, 0.035, 'power2Out')
    add(s, 'vignetteIntensity', 0, 0.155, 0.35, 'power2InOut')

    addFn(() => {
      if (this.audioManager) {
        this.audioManager.playBassImpact?.()
        this.audioManager.playCapture?.()
      }
    }, 0.12)

    // ═══ DESTRUCTION (140-320ms) ═══
    add(s, 'destructionGlow', 1, 0.14, 0.055, 'power2In')
    add(s, 'destructionCracks', 1, 0.19, 0.035, 'none')
    add(s, 'pieceFadeAlpha', 0, 0.23, 0.09, 'power3In')
    add(s, 'pieceScale', 0.25, 0.23, 0.09, 'power3In')
    add(s, 'destructionGlow', 0, 0.28, 0.15, 'power2Out')

    addFn(() => {
      if (this.audioManager) this.audioManager.playExplosion?.()
      // Spawn particles via AnimationManager's particle engine
      const particleEngine = this.renderer?.animationManager?.particleEngine
      if (particleEngine) {
        const isWhite = (this.captureData?.color || 1) === 1
        particleEngine.emit('assassination', cx, cy, { count: 60 }, 'foreground')
        particleEngine.emit('impactBurst', cx, cy, { count: 50 }, 'foreground')
        particleEngine.emit('executionFlash', cx, cy, {}, 'foreground')
        particleEngine.emit(isWhite ? 'holyLight' : 'darkEnergy', cx, cy, { count: 40 }, 'foreground')
        particleEngine.emit('staggerRings', cx, cy, {}, 'foreground')
      }
    }, 0.23)

    // ═══ BOARD REACTION (190-390ms) ═══
    add(s, 'boardGlowAlpha', 0.35 * I, 0.19, 0.09, 'power2Out')
    add(s, 'boardGlowAlpha', 0, 0.28, 0.2, 'power2In')

    addFn(() => {
      for (const rsq of this.reactionSquares) {
        this.animateReactionSquare(rsq)
      }
    }, 0.19)

    // ═══ RECOVERY (350-650ms) ═══
    add(s, 'boardDarken', 0, 0.35, 0.25, 'power2InOut',
      null, null, () => { this.finish() })

    // Duration for safety
    this.duration = 0.65
  }

  animateReactionSquare(rsq) {
    const delay = rsq.dist * 0.014
    const dur = 0.055
    const start = performance.now() / 1000 + delay
    const end = start + dur
    const backEnd = end + 0.03 + dur

    const animate = (currentTime) => {
      if (!this.active) return
      if (currentTime < start) {
        requestAnimationFrame(animate)
        return
      }
      const elapsed = currentTime - start
      if (elapsed < dur) {
        const t = elapsed / dur
        rsq.alpha = rsq.maxAlpha * (1 - Math.pow(1 - t, 3))
        requestAnimationFrame(animate)
      } else if (elapsed < dur + 0.03) {
        rsq.alpha = rsq.maxAlpha
        requestAnimationFrame(animate)
      } else if (elapsed < backEnd) {
        const t = (elapsed - dur - 0.03) / dur
        rsq.alpha = rsq.maxAlpha * Math.pow(1 - t, 3)
        requestAnimationFrame(animate)
      } else {
        rsq.alpha = 0
      }
    }
    requestAnimationFrame(animate)
  }

  update(dt) {
    if (!this.active) return

    const now = performance.now() / 1000
    const elapsed = now - this.startTime

    if (elapsed >= this.duration) {
      this.finish()
      return
    }

    // Update timeline tracks
    for (const track of this.timeline) {
      if (track.fn) {
        if (!track.fired && elapsed >= track.time) {
          track.fn()
          track.fired = true
        }
      } else {
        const t = Math.min(Math.max((elapsed - track.start) / track.dur, 0), 1)
        if (t > 0) {
          if (!track.fired && track.onStart) { track.onStart(); track.fired = true }
          const e = track.ease(t)
          track.target[track.prop] = track.from + (track.to - track.from) * e
          if (t >= 1 && track.onComplete) { track.onComplete(); track.onComplete = null }
        }
      }
    }

    // Update reaction squares alpha
    for (const rsq of this.reactionSquares) {
      if (rsq.alpha > 0.001 && rsq.alpha < rsq.maxAlpha) {
        // Already handled by animateReactionSquare
      }
    }
  }

  render(ctx) {
    if (!this.active) return
    const s = this.state
    const { squareSize } = this.renderer.canvasRenderer
    const cx = this.squareTo.x
    const cy = this.squareTo.y

    ctx.save()

    // Board darkening
    if (s.boardDarken > 0.01) {
      ctx.save()
      ctx.globalAlpha = s.boardDarken
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, this.renderer.canvasRenderer.width, this.renderer.canvasRenderer.height)
      ctx.restore()
    }

    // Board glow reaction
    if (s.boardGlowAlpha > 0.01) {
      this.renderBoardReaction(ctx, squareSize)
      const glowR = squareSize * 2.8
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      gradient.addColorStop(0, `rgba(255, 215, 0, ${s.boardGlowAlpha * 0.55})`)
      gradient.addColorStop(0.35, `rgba(255, 160, 60, ${s.boardGlowAlpha * 0.25})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.fillStyle = gradient
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2)
      ctx.restore()
    }

    // Destruction glow
    if (s.destructionGlow > 0.01) {
      const dgR = squareSize * 0.7 * s.destructionGlow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, dgR)
      gradient.addColorStop(0, `rgba(255, 255, 255, ${s.destructionGlow * 0.7})`)
      gradient.addColorStop(0.35, `rgba(255, 215, 0, ${s.destructionGlow * 0.4})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(cx, cy, dgR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Cracks - deterministic for consistency
    if (s.destructionCracks > 0.01 && s.pieceFadeAlpha > 0.1) {
      this.renderCracks(ctx, cx, cy, squareSize, s.destructionCracks)
    }

    // Piece fade overlay
    if (s.pieceFadeAlpha > 0.01 && s.pieceFadeAlpha < 0.99) {
      ctx.save()
      ctx.globalAlpha = (1 - s.pieceFadeAlpha) * 0.4
      ctx.fillStyle = 'rgba(255, 215, 0, 0.5)'
      const r = squareSize * 0.42 * s.pieceScale
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Screen flash
    if (s.flashAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = s.flashAlpha
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, this.renderer.canvasRenderer.width, this.renderer.canvasRenderer.height)
      ctx.restore()
    }

    // Vignette
    if (s.vignetteIntensity > 0.01) {
      const w = this.renderer.canvasRenderer.width
      const h = this.renderer.canvasRenderer.height
      const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.68)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      gradient.addColorStop(1, `rgba(0, 0, 0, ${s.vignetteIntensity})`)
      ctx.save()
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    // Chromatic aberration handled in PostProcessing

    ctx.restore()
  }

  renderBoardReaction(ctx, squareSize) {
    const { boardOffsetX, boardOffsetY } = this.renderer.canvasRenderer
    const orientation = this.renderer.boardRenderer.boardAppearance.orientation
    for (const rsq of this.reactionSquares) {
      if (rsq.alpha < 0.01) continue
      const { file, rank } = this.renderer.canvasRenderer.squareToCoord(rsq.sq, orientation)
      const x = boardOffsetX + file * squareSize
      const y = boardOffsetY + rank * squareSize
      ctx.save()
      ctx.globalAlpha = rsq.alpha
      const gradient = ctx.createRadialGradient(
        x + squareSize / 2, y + squareSize / 2, 0,
        x + squareSize / 2, y + squareSize / 2, squareSize * 0.65
      )
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)')
      gradient.addColorStop(0.55, 'rgba(255, 150, 50, 0.12)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, squareSize, squareSize)
      ctx.restore()
    }
  }

  renderCracks(ctx, cx, cy, squareSize, progress) {
    ctx.save()
    ctx.globalAlpha = progress * 0.75
    ctx.strokeStyle = '#B8960F'
    ctx.lineWidth = 1.4
    ctx.shadowColor = '#B8960F'
    ctx.shadowBlur = 4
    const r = squareSize * 0.32 * progress
    // Deterministic crack pattern
    const seed = Math.floor(cx + cy * 1000) % 1000
    const rand = (i) => {
      const x = Math.sin(seed + i * 12.9898) * 43758.5453
      return x - Math.floor(x)
    }
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + rand(i) * 0.5
      const len = r * (0.45 + rand(i + 10) * 0.55)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      let px = cx, py = cy
      for (let j = 1; j <= 4; j++) {
        const t = j / 4
        const jitter = (rand(i * 10 + j * 3) - 0.5) * 7 * progress
        px = cx + Math.cos(angle) * len * t + jitter
        py = cy + Math.sin(angle) * len * t + jitter
        ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  finish() {
    if (!this.active && !this._safetyTimer) return
    if (this._safetyTimer) { clearTimeout(this._safetyTimer); this._safetyTimer = null }
    this.active = false
    if (this.renderer.boardRenderer) this.renderer.boardRenderer.clearCaptureHighlight()
    if (this.camera) {
      this.camera.setZoom(1, 180)
      this.camera.setRotation(0, 180)
    }
    this.reactionSquares = []
    if (this._resolve) { this._resolve(); this._resolve = null }
  }

  resize() {}
  dispose() { this.active = false; this.timeline = null }
}