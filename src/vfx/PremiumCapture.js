import { timeManager } from '../animation/TimeManager.js'

const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => 1 - (1 - t) * (1 - t),
  easeInCubic: t => t * t * t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuart: t => 1 - Math.pow(1 - t, 4),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutElastic: t => {
    if (t === 0) return 0
    if (t === 1) return 1
    const p = 0.4
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / p) + 1
  },
  easeInBack: t => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  easeOutBack: t => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  easeOutBounce: t => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    else return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}

const Colors = {
  coreWhite: '#F5F0E8',
  warmOrange: '#ff8c00',
  goldenOrange: '#ffa500',
  brightGold: '#B8960F',
  softGold: '#D4A820',
  paleGold: '#E8DCCA',
  emberOrange: '#ff6b00',
  deepOrange: '#e85d00',
  softWhite: '#F5F0E8'
}

const seededRandom = (seed) => {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export class PremiumCapture {
  constructor(renderer, camera, audioManager) {
    this.renderer = renderer
    this.camera = camera
    this.audioManager = audioManager

    this.active = false
    this.captureData = null
    this.startTime = 0
    this.duration = 1.8

    this.state = {
      phase: 'idle',
      phaseProgress: 0,

      moveTrail: [],
      pieceGlow: 0,
      pieceGlowPulse: 0,

      freezeProgress: 0,
      freezeGlow: 0,
      buildupLight: 0,

      impactPulse: 0,
      shockwave: 0,
      sparks: [],
      embers: [],
      impactFlash: 0,

      victimGlow: 0,
      victimFragments: [],
      victimDissolve: 0,
      victimSparks: [],

      squareGlow: 0,
      adjacentGlow: [],

      recoveryProgress: 0
    }

    this.victimPieceImage = null
    this.attackerPieceImage = null
    this.attackerSquare = -1
    this.victimSquare = -1
    this.attackerPos = { x: 0, y: 0 }
    this.victimPos = { x: 0, y: 0 }
    this.attackerColor = 1
    this.victimPiece = 0
    this.attackerPiece = 0

    this._resolve = null
    this._safetyTimer = null
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

    this.attackerSquare = captureData.from
    this.victimSquare = captureData.to
    this.attackerPiece = captureData.piece
    this.victimPiece = captureData.captured
    this.attackerColor = captureData.color || 1

    this.attackerPos = this.getSquareCenter(this.attackerSquare)
    this.victimPos = this.getSquareCenter(this.victimSquare)

    this.state = {
      phase: 'move',
      phaseProgress: 0,

      moveTrail: [],
      pieceGlow: 0,
      pieceGlowPulse: 0,

      freezeProgress: 0,
      freezeGlow: 0,
      buildupLight: 0,

      impactPulse: 0,
      shockwave: 0,
      sparks: [],
      embers: [],
      impactFlash: 0,

      victimGlow: 0,
      victimFragments: [],
      victimDissolve: 0,
      victimSparks: [],

      squareGlow: 0,
      adjacentGlow: [],

      recoveryProgress: 0
    }

    this.initAdjacentGlow()
    this.cachePieceImages()

    this._safetyTimer = setTimeout(() => {
      if (this.active) this.finish()
    }, 4000)

    this.startTime = performance.now()
    timeManager.hitStop(70, 0.015)

    if (this.audioManager) {
      this.audioManager.playWhoosh?.()
    }

    return new Promise(resolve => { this._resolve = resolve })
  }

  initAdjacentGlow() {
    const file = this.victimSquare % 8
    const rank = Math.floor(this.victimSquare / 8)
    this.state.adjacentGlow = []

    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue
        const f = file + df
        const r = rank + dr
        if (f < 0 || f > 7 || r < 0 || r > 7) continue
        const sq = r * 8 + f
        const dist = Math.sqrt(df * df + dr * dr)
        this.state.adjacentGlow.push({ sq, dist, alpha: 0, maxAlpha: Math.max(0, 0.25 - dist * 0.1) })
      }
    }
  }

  cachePieceImages() {
    const prefix = this.attackerColor === 1 ? 'w' : 'b'
    const victimColor = this.attackerColor === 1 ? 2 : 1
    const victimPrefix = victimColor === 1 ? 'w' : 'b'

    const pieceSymbols = { 1: 'p', 2: 'n', 3: 'b', 4: 'r', 5: 'q', 6: 'k' }
    const attackerKey = `${prefix}${pieceSymbols[this.attackerPiece]}`
    const victimKey = `${victimPrefix}${pieceSymbols[this.victimPiece]}`

    this.attackerPieceImage = this.renderer.pieceRenderer.pieceImages.get(attackerKey)
    this.victimPieceImage = this.renderer.pieceRenderer.pieceImages.get(victimKey)
  }

  update(dt) {
    if (!this.active) return

    const elapsed = (performance.now() - this.startTime) / 1000
    const s = this.state

    if (elapsed >= this.duration) {
      this.finish()
      return
    }

    switch (s.phase) {
      case 'move':
        this.updateMovePhase(elapsed, dt)
        break
      case 'freeze':
        this.updateFreezePhase(elapsed, dt)
        break
      case 'impact':
        this.updateImpactPhase(elapsed, dt)
        break
      case 'destruction':
        this.updateDestructionPhase(elapsed, dt)
        break
      case 'reaction':
        this.updateReactionPhase(elapsed, dt)
        break
      case 'recovery':
        this.updateRecoveryPhase(elapsed, dt)
        break
    }
  }

  updateMovePhase(elapsed, dt) {
    const s = this.state
    const moveDuration = 0.35

    if (elapsed < moveDuration) {
      const t = elapsed / moveDuration
      const eased = Easing.easeInOutCubic(t)

      const dx = this.victimPos.x - this.attackerPos.x
      const dy = this.victimPos.y - this.attackerPos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      const currentX = this.attackerPos.x + dx * eased
      const currentY = this.attackerPos.y + dy * eased

      s.moveTrail.push({ x: currentX, y: currentY, t: elapsed, alpha: 1 })
      if (s.moveTrail.length > 12) s.moveTrail.shift()

      s.pieceGlow = 0.3 + 0.2 * Math.sin(elapsed * 12)
      s.pieceGlowPulse = 0.15 + 0.1 * Math.sin(elapsed * 20)

      if (t >= 1) {
        s.phase = 'freeze'
        s.phaseProgress = 0
      }
    }
  }

  updateFreezePhase(elapsed, dt) {
    const s = this.state
    const freezeDuration = 0.07

    const freezeStart = 0.35
    const freezeElapsed = elapsed - freezeStart

    if (freezeElapsed < freezeDuration) {
      const t = freezeElapsed / freezeDuration

      s.freezeProgress = t
      s.freezeGlow = Easing.easeOutCubic(t)
      s.buildupLight = Easing.easeOutCubic(t)

      s.pieceGlow = 0.5 + 0.5 * s.freezeGlow
      s.pieceGlowPulse = 0.3 + 0.2 * s.freezeGlow

      if (t >= 1) {
        s.phase = 'impact'
        this.spawnImpactParticles()
        if (this.audioManager) {
          this.audioManager.playBassImpact?.()
          this.audioManager.playCapture?.()
        }
        if (this.camera) {
          this.camera.directionalShake(8, Math.atan2(
            this.victimPos.y - this.attackerPos.y,
            this.victimPos.x - this.attackerPos.x
          ), 180)
        }
      }
    }
  }

  updateImpactPhase(elapsed, dt) {
    const s = this.state
    const impactDuration = 0.12

    const impactStart = 0.42
    const impactElapsed = elapsed - impactStart

    if (impactElapsed < impactDuration) {
      const t = impactElapsed / impactDuration
      const eased = Easing.easeOutQuart(t)

      s.impactPulse = eased
      s.shockwave = eased
      s.impactFlash = t < 0.5 ? Easing.easeOutQuad(t * 2) * 0.6 : Easing.easeInQuad((t - 0.5) * 2) * 0.6

      this.updateSparks(dt)
      this.updateEmbers(dt)

      if (t >= 1) {
        s.phase = 'destruction'
        this.spawnVictimFragments()
      }
    }
  }

  updateDestructionPhase(elapsed, dt) {
    const s = this.state
    const destructionDuration = 0.5

    const destructionStart = 0.54
    const destructionElapsed = elapsed - destructionStart

    if (destructionElapsed < destructionDuration) {
      const t = destructionElapsed / destructionDuration

      s.victimGlow = Easing.easeOutCubic(1 - t)
      s.victimDissolve = Easing.easeInCubic(t)

      this.updateVictimFragments(dt)
      this.updateVictimSparks(dt)

      if (t >= 1) {
        s.phase = 'reaction'
        this.initSquareGlow()
      }
    }
  }

  updateReactionPhase(elapsed, dt) {
    const s = this.state
    const reactionDuration = 0.45

    const reactionStart = 1.04
    const reactionElapsed = elapsed - reactionStart

    if (reactionElapsed < reactionDuration) {
      const t = reactionElapsed / reactionDuration

      s.squareGlow = t < 0.3 ? Easing.easeOutCubic(t / 0.3) * 0.6 : Easing.easeInCubic((t - 0.3) / 0.7) * 0.6

      for (const adj of s.adjacentGlow) {
        const delay = adj.dist * 0.05
        const adjT = (reactionElapsed - delay) / 0.3
        if (adjT > 0 && adjT < 1) {
          adj.alpha = adj.maxAlpha * Easing.easeOutCubic(adjT)
        } else if (adjT >= 1) {
          adj.alpha = adj.maxAlpha * Easing.easeInCubic(Math.min(1, (adjT - 1) * 2))
        }
      }

      this.updateSparks(dt)
      this.updateEmbers(dt)

      if (t >= 1) {
        s.phase = 'recovery'
      }
    }
  }

  updateRecoveryPhase(elapsed, dt) {
    const s = this.state
    const recoveryDuration = 0.5

    const recoveryStart = 1.49
    const recoveryElapsed = elapsed - recoveryStart

    if (recoveryElapsed < recoveryDuration) {
      const t = recoveryElapsed / recoveryDuration

      s.recoveryProgress = t

      s.squareGlow *= (1 - t)
      for (const adj of s.adjacentGlow) {
        adj.alpha *= (1 - t * 0.5)
      }

      this.updateSparks(dt)
      this.updateEmbers(dt)
      this.updateVictimSparks(dt)

      s.pieceGlow = 0.3 * (1 - t) + 0.3
      s.pieceGlowPulse = 0.15 * (1 - t) + 0.15
    } else {
      this.finish()
    }
  }

  spawnImpactParticles() {
    const s = this.state
    const cx = this.victimPos.x
    const cy = this.victimPos.y

    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.15
      const speed = 180 + Math.random() * 120
      s.sparks.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 1,
        life: 0.4 + Math.random() * 0.2,
        color: ['#ff8c00', '#ffa500', '#B8960F', '#fff8dc', '#ffffff'][Math.floor(Math.random() * 5)],
        gravity: 100 + Math.random() * 80,
        rotation: angle,
        rotationSpeed: (Math.random() - 0.5) * 15
      })
    }

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.2
      const speed = 80 + Math.random() * 60
      s.embers.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        alpha: 0.9,
        life: 0.6 + Math.random() * 0.4,
        color: ['#ff8c00', '#ffa500', '#e85d00', '#ff6b00'][Math.floor(Math.random() * 4)],
        gravity: 40 + Math.random() * 60,
        drag: 0.98
      })
    }
  }

  spawnVictimFragments() {
    const s = this.state
    const cx = this.victimPos.x
    const cy = this.victimPos.y
    const pieceSize = this.renderer.canvasRenderer.squareSize * 0.92
    const fragmentCount = 8

    for (let i = 0; i < fragmentCount; i++) {
      const angle = (Math.PI * 2 * i) / fragmentCount + (Math.random() - 0.5) * 0.3
      const speed = 60 + Math.random() * 100
      const size = 8 + Math.random() * 12

      s.victimFragments.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 150 + Math.random() * 100,
        drag: 0.99,
        scale: 1,
        color: this.attackerColor === 1 ? '#B8960F' : '#e85d00'
      })
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 40 + Math.random() * 80
      s.victimSparks.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: 1 + Math.random() * 2,
        alpha: 1,
        life: 0.5 + Math.random() * 0.4,
        color: ['#ff8c00', '#ffa500', '#B8960F', '#fff8dc'][Math.floor(Math.random() * 4)],
        gravity: 80 + Math.random() * 60,
        drag: 0.97
      })
    }
  }

  initSquareGlow() {
    const s = this.state
    s.squareGlow = 0.6
  }

  updateSparks(dt) {
    const s = this.state
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i]
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rotation += p.rotationSpeed * dt
      p.life -= dt
      p.alpha = Math.max(0, p.life / 0.4)
      if (p.life <= 0 || p.alpha <= 0) s.sparks.splice(i, 1)
    }
  }

  updateEmbers(dt) {
    const s = this.state
    for (let i = s.embers.length - 1; i >= 0; i--) {
      const p = s.embers[i]
      p.vx *= p.drag
      p.vy *= p.drag
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      p.alpha = Math.max(0, p.life / 0.6)
      if (p.life <= 0 || p.alpha <= 0) s.embers.splice(i, 1)
    }
  }

  updateVictimFragments(dt) {
    const s = this.state
    for (let i = s.victimFragments.length - 1; i >= 0; i--) {
      const f = s.victimFragments[i]
      f.vy += f.gravity * dt
      f.vx *= f.drag
      f.vy *= f.drag
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.rotation += f.rotationSpeed * dt
      f.scale = Math.max(0, 1 - s.victimDissolve)
      f.alpha = Math.max(0, 1 - s.victimDissolve * 1.5)
      if (f.alpha <= 0 || f.scale <= 0) s.victimFragments.splice(i, 1)
    }
  }

  updateVictimSparks(dt) {
    const s = this.state
    for (let i = s.victimSparks.length - 1; i >= 0; i--) {
      const p = s.victimSparks[i]
      p.vy += p.gravity * dt
      p.vx *= p.drag
      p.vy *= p.drag
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      p.alpha = Math.max(0, p.life / 0.5)
      if (p.life <= 0 || p.alpha <= 0) s.victimSparks.splice(i, 1)
    }
  }

  render(ctx) {
    if (!this.active) return

    const s = this.state
    const { squareSize, boardOffsetX, boardOffsetY } = this.renderer.canvasRenderer
    const pieceSize = squareSize * 0.92
    const offset = (squareSize - pieceSize) / 2

    ctx.save()

    if (s.phase === 'move') {
      this.renderMovePhase(ctx, pieceSize, offset)
    } else if (s.phase === 'freeze') {
      this.renderFreezePhase(ctx, pieceSize, offset)
    } else if (s.phase === 'impact') {
      this.renderImpactPhase(ctx, pieceSize, offset)
    } else if (s.phase === 'destruction') {
      this.renderDestructionPhase(ctx, pieceSize, offset)
    } else if (s.phase === 'reaction') {
      this.renderReactionPhase(ctx, pieceSize, offset)
    } else if (s.phase === 'recovery') {
      this.renderRecoveryPhase(ctx, pieceSize, offset)
    }

    ctx.restore()
  }

  renderMovePhase(ctx, pieceSize, offset) {
    const s = this.state

    if (s.moveTrail.length > 2) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 1; i < s.moveTrail.length; i++) {
        const t = i / s.moveTrail.length
        const prev = s.moveTrail[i - 1]
        const curr = s.moveTrail[i]
        const alpha = t * 0.18 * s.pieceGlowPulse
        ctx.globalAlpha = alpha
        ctx.strokeStyle = this.attackerColor === 1 ? '#B8960F' : '#e85d00'
        ctx.lineWidth = pieceSize * 0.12 * t
        ctx.lineCap = 'round'
        ctx.shadowColor = this.attackerColor === 1 ? '#B8960F' : '#e85d00'
        ctx.shadowBlur = 6 * t
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(curr.x, curr.y)
        ctx.stroke()
      }
      ctx.restore()
    }

    const cx = this.victimPos.x
    const cy = this.victimPos.y

    if (s.pieceGlow > 0.01) {
      const glowR = pieceSize * 0.7
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      const color = this.attackerColor === 1 ? '255, 215, 0' : '232, 93, 0'
      gradient.addColorStop(0, `rgba(${color}, ${s.pieceGlow * 0.35})`)
      gradient.addColorStop(0.5, `rgba(${color}, ${s.pieceGlow * 0.15})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2)
      ctx.restore()
    }

    if (this.attackerPieceImage && this.attackerPieceImage.complete) {
      ctx.save()
      ctx.globalAlpha = 1
      ctx.drawImage(this.attackerPieceImage, cx - pieceSize / 2, cy - pieceSize / 2, pieceSize, pieceSize)
      ctx.restore()
    }
  }

  renderFreezePhase(ctx, pieceSize, offset) {
    const s = this.state

    this.renderMovePhase(ctx, pieceSize, offset)

    if (s.buildupLight > 0.01) {
      const lightR = pieceSize * 1.5
      const gradient = ctx.createRadialGradient(this.victimPos.x, this.victimPos.y, 0, this.victimPos.x, this.victimPos.y, lightR)
      gradient.addColorStop(0, `rgba(255, 140, 0, ${s.buildupLight * 0.4})`)
      gradient.addColorStop(0.5, `rgba(255, 165, 0, ${s.buildupLight * 0.15})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.fillRect(this.victimPos.x - lightR, this.victimPos.y - lightR, lightR * 2, lightR * 2)
      ctx.restore()
    }

    if (this.victimPieceImage && this.victimPieceImage.complete) {
      ctx.save()
      ctx.globalAlpha = 1
      ctx.drawImage(this.victimPieceImage, this.victimPos.x - pieceSize / 2, this.victimPos.y - pieceSize / 2, pieceSize, pieceSize)
      ctx.restore()
    }
  }

  renderImpactPhase(ctx, pieceSize, offset) {
    const s = this.state
    const cx = this.victimPos.x
    const cy = this.victimPos.y

    this.renderFreezePhase(ctx, pieceSize, offset)

    if (s.impactPulse > 0.01) {
      const pulseR = pieceSize * (0.8 + s.impactPulse * 2.5)
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR)
      gradient.addColorStop(0, `rgba(255, 255, 255, ${s.impactPulse * 0.8})`)
      gradient.addColorStop(0.25, `rgba(255, 215, 0, ${s.impactPulse * 0.5})`)
      gradient.addColorStop(0.6, `rgba(255, 140, 0, ${s.impactPulse * 0.25})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.fillRect(cx - pulseR, cy - pulseR, pulseR * 2, pulseR * 2)
      ctx.restore()
    }

    if (s.shockwave > 0.01) {
      const waveR = pieceSize * (0.5 + s.shockwave * 4)
      const waveWidth = pieceSize * 0.15 * (1 - s.shockwave)
      ctx.save()
      ctx.globalAlpha = (1 - s.shockwave) * 0.6
      ctx.strokeStyle = '#B8960F'
      ctx.lineWidth = waveWidth
      ctx.shadowColor = '#B8960F'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(cx, cy, waveR, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    this.renderSparks(ctx)
    this.renderEmbers(ctx)

    if (s.impactFlash > 0.01) {
      ctx.save()
      ctx.globalAlpha = s.impactFlash
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, this.renderer.canvasRenderer.width, this.renderer.canvasRenderer.height)
      ctx.restore()
    }

    if (this.victimPieceImage && this.victimPieceImage.complete) {
      ctx.save()
      ctx.globalAlpha = 1
      ctx.drawImage(this.victimPieceImage, cx - pieceSize / 2, cy - pieceSize / 2, pieceSize, pieceSize)
      ctx.restore()
    }
  }

  renderDestructionPhase(ctx, pieceSize, offset) {
    const s = this.state
    const cx = this.victimPos.x
    const cy = this.victimPos.y

    this.renderImpactPhase(ctx, pieceSize, offset)

    if (s.victimGlow > 0.01) {
      const glowR = pieceSize * 1.2
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      const color = this.attackerColor === 1 ? '255, 215, 0' : '232, 93, 0'
      gradient.addColorStop(0, `rgba(${color}, ${s.victimGlow * 0.6})`)
      gradient.addColorStop(0.5, `rgba(${color}, ${s.victimGlow * 0.25})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2)
      ctx.restore()
    }

    if (this.victimPieceImage && this.victimPieceImage.complete && s.victimGlow > 0.01) {
      ctx.save()
      ctx.globalAlpha = s.victimGlow * 0.8 + (1 - s.victimDissolve) * 0.5
      if (s.victimDissolve > 0) {
        ctx.globalAlpha = Math.max(0, 1 - s.victimDissolve * 1.2)
      }
      ctx.drawImage(this.victimPieceImage, cx - pieceSize / 2, cy - pieceSize / 2, pieceSize, pieceSize)
      ctx.restore()
    }

    for (const frag of s.victimFragments) {
      if (frag.alpha <= 0 || frag.scale <= 0) continue
      ctx.save()
      ctx.globalAlpha = frag.alpha
      ctx.translate(frag.x, frag.y)
      ctx.rotate(frag.rotation)
      ctx.scale(frag.scale, frag.scale)
      const fragSize = frag.size * frag.scale
      ctx.fillStyle = frag.color
      ctx.shadowColor = frag.color
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.rect(-fragSize / 2, -fragSize / 2, fragSize, fragSize * 0.6)
      ctx.fill()
      ctx.restore()
    }

    this.renderSparks(ctx)
    this.renderEmbers(ctx)
    this.renderVictimSparks(ctx)
  }

  renderReactionPhase(ctx, pieceSize, offset) {
    const s = this.state
    const cx = this.victimPos.x
    const cy = this.victimPos.y

    if (s.squareGlow > 0.01) {
      const glowR = pieceSize * 1.8
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      gradient.addColorStop(0, `rgba(255, 215, 0, ${s.squareGlow * 0.4})`)
      gradient.addColorStop(0.4, `rgba(255, 165, 0, ${s.squareGlow * 0.18})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2)
      ctx.restore()
    }

    const { boardOffsetX, boardOffsetY, squareSize } = this.renderer.canvasRenderer
    const orientation = this.renderer.boardRenderer.boardAppearance.orientation

    for (const adj of s.adjacentGlow) {
      if (adj.alpha <= 0.01) continue
      const { file, rank } = this.renderer.canvasRenderer.squareToCoord(adj.sq, orientation)
      const x = boardOffsetX + file * squareSize
      const y = boardOffsetY + rank * squareSize
      const tileR = squareSize * 0.7
      const gradient = ctx.createRadialGradient(x + squareSize / 2, y + squareSize / 2, 0, x + squareSize / 2, y + squareSize / 2, tileR)
      gradient.addColorStop(0, `rgba(255, 215, 0, ${adj.alpha * 0.5})`)
      gradient.addColorStop(0.6, `rgba(255, 165, 0, ${adj.alpha * 0.15})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, squareSize, squareSize)
      ctx.restore()
    }

    if (this.attackerPieceImage && this.attackerPieceImage.complete) {
      ctx.save()
      ctx.globalAlpha = 1
      ctx.drawImage(this.attackerPieceImage, cx - pieceSize / 2, cy - pieceSize / 2, pieceSize, pieceSize)
      ctx.restore()
    }

    if (s.pieceGlow > 0.01) {
      const glowR = pieceSize * 0.6
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      const color = this.attackerColor === 1 ? '255, 215, 0' : '232, 93, 0'
      gradient.addColorStop(0, `rgba(${color}, ${s.pieceGlow * 0.25})`)
      gradient.addColorStop(0.5, `rgba(${color}, ${s.pieceGlow * 0.1})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gradient
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2)
      ctx.restore()
    }

    this.renderSparks(ctx)
    this.renderEmbers(ctx)
    this.renderVictimSparks(ctx)
  }

  renderRecoveryPhase(ctx, pieceSize, offset) {
    const s = this.state
    const cx = this.victimPos.x
    const cy = this.victimPos.y

    this.renderReactionPhase(ctx, pieceSize, offset)

    if (this.attackerPieceImage && this.attackerPieceImage.complete) {
      ctx.save()
      ctx.globalAlpha = 1
      ctx.drawImage(this.attackerPieceImage, cx - pieceSize / 2, cy - pieceSize / 2, pieceSize, pieceSize)
      ctx.restore()
    }
  }

  renderSparks(ctx) {
    const s = this.state
    for (const p of s.sparks) {
      if (p.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.moveTo(-p.size, 0)
      ctx.lineTo(p.size, 0)
      ctx.lineTo(0, -p.size * 1.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }

  renderEmbers(ctx) {
    const s = this.state
    for (const p of s.embers) {
      if (p.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  renderVictimSparks(ctx) {
    const s = this.state
    for (const p of s.victimSparks) {
      if (p.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  finish() {
    if (!this.active && !this._safetyTimer) return
    if (this._safetyTimer) { clearTimeout(this._safetyTimer); this._safetyTimer = null }
    this.active = false
    if (this._resolve) { this._resolve(); this._resolve = null }
  }

  resize() {}

  dispose() {
    this.finish()
  }
}