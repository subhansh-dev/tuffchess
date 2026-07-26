import { Piece, Color } from '../core/ChessTypes.js'
import { Easing } from './Easing.js'

/**
 * CaptureAnimations — Arena Battle Chess VFX System
 * Every capture is a cinematic event:
 * - Slash lines with intense crimson/gold glow
 * - Impact frames and screen-level slash marks
 * - Victim shatter with star-shaped fragments
 * - Dramatic color grading (darkness for knight, gold for royal)
 */

export const CaptureTier = {
  EDIT_DISSOLVE: 'edit_dissolve',
  PAWN_SPLIT: 'pawn_split',
  KNIGHT_DARKNESS: 'knight_darkness',
  EPIC_CLASH: 'epic_clash',
  ROYAL_DECAP: 'royal_decap',
  QUEEN_SLASH: 'queen_slash',
  ROOK_PATH: 'rook_path'
}

const BIG_PIECES = new Set([Piece.QUEEN, Piece.ROOK, Piece.BISHOP, Piece.KNIGHT])
function isBigPiece(piece) { return BIG_PIECES.has(piece) }

export function resolveCaptureTier(attackerPiece, victimPiece, isCheckmate = false, isKnightFork = false) {
  if (victimPiece === Piece.KING || isCheckmate) return CaptureTier.ROYAL_DECAP
  if (attackerPiece === Piece.KNIGHT && (victimPiece === Piece.QUEEN || victimPiece === Piece.ROOK || isKnightFork)) return CaptureTier.KNIGHT_DARKNESS
  if (attackerPiece === Piece.QUEEN && victimPiece !== Piece.PAWN) return CaptureTier.QUEEN_SLASH
  if (attackerPiece === Piece.ROOK) return CaptureTier.ROOK_PATH
  if (attackerPiece === Piece.PAWN) return CaptureTier.PAWN_SPLIT
  if (isBigPiece(attackerPiece) && isBigPiece(victimPiece)) return CaptureTier.EPIC_CLASH
  return CaptureTier.EDIT_DISSOLVE
}

/* ================================================================
   ANIME SLASH LINE — Core building block
   ================================================================ */

class SlashLine {
  constructor(cx, cy, angle, length, width, delay = 0) {
    this.cx = cx; this.cy = cy; this.angle = angle
    this.length = length; this.width = width; this.delay = delay
    this.alpha = 0; this.started = false; this.elapsed = 0
    this.sparkParticles = []
    const sparkCount = Math.floor(length / 5)
    for (let i = 0; i < sparkCount; i++) {
      const t = (i + 0.5) / sparkCount
      const dist = t * length * 0.5
      this.sparkParticles.push({
        x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle + Math.PI/2) * (40 + Math.random() * 80) + (Math.random()-0.5) * 50,
        vy: Math.sin(angle + Math.PI/2) * (40 + Math.random() * 80) + (Math.random()-0.5) * 50,
        size: 2 + Math.random() * 4, alpha: 1,
        life: 0.15 + Math.random() * 0.2, maxLife: 0.15 + Math.random() * 0.2
      })
    }
  }

  update(progress, dt = 1/60) {
    this.elapsed += dt
    if (this.elapsed < this.delay) return
    this.started = true
    const slashProgress = Math.max(0, this.elapsed - this.delay)
    if (slashProgress < 0.04) { this.alpha = 1 }
    else if (slashProgress < 0.25) { this.alpha = 1 - (slashProgress - 0.04) / 0.21 }
    else { this.alpha = 0 }
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i]
      p.life -= dt; p.alpha = Math.max(0, p.life / p.maxLife)
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt
      if (p.life <= 0) this.sparkParticles.splice(i, 1)
    }
  }

  render(ctx) {
    if (!this.started || this.alpha <= 0.01) return
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle)
    const halfLen = this.length * 0.5
    ctx.save()

    // Outer glow (wide, dim)
    ctx.globalAlpha = this.alpha * 0.5; ctx.strokeStyle = '#FF6B35'
    ctx.lineWidth = this.width + 16; ctx.lineCap = 'round'
    ctx.shadowColor = '#FF6B35'; ctx.shadowBlur = 35
    ctx.beginPath()
    ctx.moveTo(this.cx - cos * halfLen, this.cy - sin * halfLen)
    ctx.lineTo(this.cx + cos * halfLen, this.cy + sin * halfLen)
    ctx.stroke()

    // Core line (gold)
    ctx.globalAlpha = this.alpha; ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = this.width; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(this.cx - cos * halfLen, this.cy - sin * halfLen)
    ctx.lineTo(this.cx + cos * halfLen, this.cy + sin * halfLen)
    ctx.stroke()

    // White-hot center
    ctx.globalAlpha = this.alpha * 0.9; ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = this.width * 0.3; ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(this.cx - cos * halfLen * 0.6, this.cy - sin * halfLen * 0.6)
    ctx.lineTo(this.cx + cos * halfLen * 0.6, this.cy + sin * halfLen * 0.6)
    ctx.stroke()

    ctx.restore()

    // Spark particles
    ctx.save()
    for (const p of this.sparkParticles) {
      if (p.alpha <= 0.01) continue
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = '#FFD700'
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(p.x, p.y - p.size)
      ctx.lineTo(p.x + p.size * 0.5, p.y)
      ctx.lineTo(p.x, p.y + p.size * 0.4)
      ctx.lineTo(p.x - p.size * 0.5, p.y)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}

/* ================================================================
   ANIME SLASH EFFECT (Default)
   ================================================================ */

export class AnimeSlashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor, intensity = 1) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor; this.intensity = intensity
    this.duration = 0.5 + intensity * 0.1; this.finished = false
    const slashAngle = Math.PI * 0.25 + Math.random() * 0.3
    this.slashLines = [new SlashLine(cx, cy, slashAngle, pieceSize * 2.4, 4 + intensity * 2)]
    if (intensity > 1) {
      this.slashLines.push(new SlashLine(cx, cy, slashAngle + 0.5, pieceSize * 1.8, 2 + intensity, 0.04))
    }
    this.victimAlpha = 1; this.victimScale = 1; this.dissolveProgress = 0
    this.fragments = []
    this.fragmentsSpawned = false
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.18) { this.victimAlpha = 1; this.victimScale = 1 }
    else if (progress < 0.28) {
      const h = (progress-0.18)/0.10
      this.victimScale = 1 + h*0.18*this.intensity
      this.victimAlpha = 1
    }
    else if (progress < 0.42) {
      const d = (progress-0.28)/0.14
      this.victimAlpha = Math.max(0, 1 - Easing.easeInCubic(d))
      this.victimScale = 1+0.18*this.intensity - d*0.35
      this.dissolveProgress = d
    }
    else { this.victimAlpha = 0; this.dissolveProgress = 1 }

    if (progress > 0.30 && !this.fragmentsSpawned) {
      this.fragmentsSpawned = true
      this._spawnFragments(this.intensity * 10)
    }
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i]
      f.x += f.vx * 1/60; f.y += f.vy * 1/60; f.vy += 200 * 1/60
      f.rotation += f.rotSpeed * 1/60
      f.alpha = Math.max(0, 1 - progress * 0.8)
      if (f.alpha <= 0) this.fragments.splice(i, 1)
    }

    if (progress >= 1) this.finished = true
  }
  _spawnFragments(count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random()-0.5) * 0.5
      const speed = 150 + Math.random() * 200
      const colors = ['#FFD700', '#FF6B35', '#C41E3A', '#FFFFFF', '#A090C0']
      this.fragments.push({
        x: this.cx, y: this.cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60,
        size: this.pieceSize * (0.08 + Math.random() * 0.12),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random()-0.5) * 14,
        alpha: 1, color: colors[Math.floor(Math.random() * colors.length)]
      })
    }
  }
  render(ctx) {
    for (const s of this.slashLines) s.render(ctx)
    ctx.save()
    for (const f of this.fragments) {
      if (f.alpha <= 0.01) continue
      ctx.globalAlpha = f.alpha
      ctx.translate(f.x, f.y); ctx.rotate(f.rotation)
      ctx.fillStyle = f.color; ctx.shadowColor = f.color; ctx.shadowBlur = 6
      // Star fragment
      const s = f.size
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.lineTo(s*0.3, -s*0.3)
      ctx.lineTo(s, 0)
      ctx.lineTo(s*0.3, s*0.3)
      ctx.lineTo(0, s*0.6)
      ctx.lineTo(-s*0.3, s*0.3)
      ctx.lineTo(-s, 0)
      ctx.lineTo(-s*0.3, -s*0.3)
      ctx.closePath(); ctx.fill()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    ctx.restore()
  }
}

/* ================================================================
   ANIME PAWN SLASH
   ================================================================ */

export class AnimePawnSlashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 0.45; this.finished = false
    const slashAngle = Math.PI * 0.15 + Math.random() * 0.2
    this.slashLines = [new SlashLine(cx, cy, slashAngle, pieceSize * 1.8, 3)]
    this.travelAngle = slashAngle
    this.dissolveAlpha = 1; this.leftHalfOffset = 0; this.rightHalfOffset = 0; this.splitProgress = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.18) { this.dissolveAlpha = 1; this.leftHalfOffset = 0; this.rightHalfOffset = 0 }
    else if (progress < 0.38) {
      const sp = (progress-0.18)/0.20; this.splitProgress = sp
      this.dissolveAlpha = 1 - sp*0.4
      this.leftHalfOffset = sp*this.pieceSize*0.7
      this.rightHalfOffset = sp*this.pieceSize*0.7
    }
    else {
      const fp = (progress-0.38)/0.07
      this.dissolveAlpha = Math.max(0, 0.6 - fp*0.6)
      this.leftHalfOffset = this.pieceSize*0.7 + fp*this.pieceSize*0.3
      this.rightHalfOffset = this.pieceSize*0.7 + fp*this.pieceSize*0.3
    }
    if (progress >= 1) this.finished = true
  }
  render(ctx) { for (const s of this.slashLines) s.render(ctx) }
}

/* ================================================================
   ANIME KNIGHT STRIKE
   ================================================================ */

export class AnimeKnightStrikeEffect {
  constructor(canvasRenderer, cx, cy, fromX, fromY, toX, toY, pieceSize, attackerColor, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.fromX = fromX; this.fromY = fromY; this.toX = toX; this.toY = toY
    this.pieceSize = pieceSize; this.attackerColor = attackerColor; this.victimColor = victimColor
    this.duration = 0.8; this.finished = false
    const slashAngle = Math.atan2(toY-fromY, toX-fromX) + Math.PI*0.3
    this.slashLines = [
      new SlashLine(cx, cy, slashAngle, pieceSize*2.6, 5),
      new SlashLine(cx, cy, slashAngle+0.5, pieceSize*2.0, 4, 0.06)
    ]
    this.darkAuraAlpha = 0; this.victimAlpha = 1
  }
  start() {}
  update(progress) {
    if (progress < 0.25) this.darkAuraAlpha = Easing.easeOutCubic(progress/0.25)*0.5
    else if (progress < 0.55) this.darkAuraAlpha = 0.5*(1-(progress-0.25)/0.30)
    else this.darkAuraAlpha = 0
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.35) this.victimAlpha = 1
    else if (progress < 0.55) this.victimAlpha = 1-(progress-0.35)/0.20
    else this.victimAlpha = 0
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.darkAuraAlpha > 0.01) {
      ctx.save(); ctx.globalAlpha = this.darkAuraAlpha
      ctx.fillStyle = '#0a0812'
      ctx.fillRect(0, 0, this.canvasRenderer.width, this.canvasRenderer.height)
      ctx.restore()
    }
    for (const s of this.slashLines) s.render(ctx)
  }
}

/* ================================================================
   ANIME QUEEN MULTI-SLASH
   ================================================================ */

export class AnimeQueenMultiSlashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 0.7; this.finished = false
    this.slashLines = [
      new SlashLine(cx, cy, Math.PI*0.2, pieceSize*2.4, 5),
      new SlashLine(cx, cy, Math.PI*0.5, pieceSize*2.0, 4, 0.06),
      new SlashLine(cx, cy, Math.PI*0.8, pieceSize*1.8, 3, 0.12)
    ]
    this.victimAlpha = 1
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.30) this.victimAlpha = 1
    else if (progress < 0.50) this.victimAlpha = 1 - Easing.easeInCubic((progress-0.30)/0.20)
    else this.victimAlpha = 0
    if (progress >= 1) this.finished = true
  }
  render(ctx) { for (const s of this.slashLines) s.render(ctx) }
}

/* ================================================================
   ANIME ROOK CHARGE
   ================================================================ */

export class AnimeRookChargeEffect {
  constructor(canvasRenderer, cx, cy, fromX, fromY, toX, toY, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.fromX = fromX; this.fromY = fromY; this.toX = toX; this.toY = toY
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 0.6; this.finished = false
    const moveAngle = Math.atan2(toY-fromY, toX-fromX)
    this.slashLines = [new SlashLine(cx, cy, moveAngle+Math.PI/4, pieceSize*2.0, 4)]
    this.victimAlpha = 1; this.trailAlpha = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.35) this.trailAlpha = Easing.easeOutCubic(progress/0.35)*0.6
    else this.trailAlpha = Math.max(0, 0.6-(progress-0.35)*3)
    if (progress < 0.25) this.victimAlpha = 1
    else if (progress < 0.40) this.victimAlpha = 1-(progress-0.25)/0.15
    else this.victimAlpha = 0
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.trailAlpha > 0.01) {
      ctx.save(); ctx.globalAlpha = this.trailAlpha
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = this.pieceSize*0.18
      ctx.lineCap = 'round'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 22
      ctx.beginPath()
      ctx.moveTo(this.fromX+this.pieceSize/2, this.fromY+this.pieceSize/2)
      ctx.lineTo(this.toX+this.pieceSize/2, this.toY+this.pieceSize/2)
      ctx.stroke(); ctx.restore()
    }
    for (const s of this.slashLines) s.render(ctx)
  }
}

/* ================================================================
   ANIME CLASH EFFECT
   ================================================================ */

export class AnimeClashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 0.8; this.finished = false
    this.slashLines = [
      new SlashLine(cx, cy, Math.PI*0.1, pieceSize*2.6, 6),
      new SlashLine(cx, cy, Math.PI*0.6, pieceSize*2.2, 5, 0.05),
      new SlashLine(cx, cy, Math.PI*1.1, pieceSize*1.8, 4, 0.10)
    ]
    this.victimAlpha = 1; this.flashAlpha = 0; this.boardDarken = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress > 0.12 && progress < 0.18) this.flashAlpha = 0.4*(1-(progress-0.12)/0.06)
    else this.flashAlpha = 0
    if (progress < 0.15) this.boardDarken = Easing.easeOutCubic(progress/0.15)*0.25
    else if (progress < 0.45) this.boardDarken = 0.25
    else this.boardDarken = 0.25*(1-(progress-0.45)/0.35)
    if (progress < 0.25) this.victimAlpha = 1
    else if (progress < 0.40) this.victimAlpha = 1 - Easing.easeInCubic((progress-0.25)/0.15)
    else this.victimAlpha = 0
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.boardDarken > 0.01) {
      ctx.save(); ctx.globalAlpha = this.boardDarken
      ctx.fillStyle = '#0a0812'
      ctx.fillRect(0, 0, this.canvasRenderer.width, this.canvasRenderer.height)
      ctx.restore()
    }
    if (this.flashAlpha > 0.01) {
      ctx.save(); ctx.globalAlpha = this.flashAlpha
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, this.canvasRenderer.width, this.canvasRenderer.height)
      ctx.restore()
    }
    for (const s of this.slashLines) s.render(ctx)
  }
}

/* ================================================================
   ANIME ROYAL DECAP
   ================================================================ */

export class AnimeRoyalDecapEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 1.5; this.finished = false
    this.slashLines = [
      new SlashLine(cx, cy, Math.PI*0.15, pieceSize*3.0, 7),
      new SlashLine(cx, cy, Math.PI*0.45, pieceSize*2.6, 6, 0.08),
      new SlashLine(cx, cy, Math.PI*0.75, pieceSize*2.2, 5, 0.16),
      new SlashLine(cx, cy, Math.PI*1.05, pieceSize*1.8, 4, 0.24)
    ]
    this.victimAlpha = 1; this.sepiaAmount = 0; this.boardDarken = 0
    this.crownShatterAlpha = 0
    this.crownParticles = []
  }
  start() {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 120 + Math.random() * 280
      this.crownParticles.push({
        x: this.cx, y: this.cy - this.pieceSize*0.2,
        vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-140,
        size: 3+Math.random()*6, alpha: 1,
        life: 1.0+Math.random()*0.6, maxLife: 1.0+Math.random()*0.6,
        rotation: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*14,
        color: '#FFD700'
      })
    }
  }
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.15) this.sepiaAmount = Easing.easeOutCubic(progress/0.15)*0.7
    else if (progress < 0.60) this.sepiaAmount = 0.7
    else this.sepiaAmount = 0.7*(1-(progress-0.60)/0.40)
    if (progress < 0.25) this.boardDarken = Easing.easeOutCubic(progress/0.25)*0.45
    else if (progress < 0.60) this.boardDarken = 0.45
    else this.boardDarken = 0.45*(1-(progress-0.60)/0.40)
    if (progress > 0.15 && progress < 0.75) this.crownShatterAlpha = 1
    else if (progress >= 0.75) this.crownShatterAlpha = Math.max(0, 1-(progress-0.75)/0.25)
    for (let i = this.crownParticles.length - 1; i >= 0; i--) {
      const p = this.crownParticles[i]
      p.life -= 1/60; p.alpha = Math.max(0, p.life/p.maxLife)
      p.x += p.vx*1/60; p.y += p.vy*1/60; p.vy += 220*1/60; p.rotation += p.rotSpeed*1/60
      if (p.life <= 0) this.crownParticles.splice(i, 1)
    }
    if (progress < 0.25) this.victimAlpha = 1
    else if (progress < 0.50) this.victimAlpha = 1 - Easing.easeInQuint((progress-0.25)/0.25)
    else this.victimAlpha = 0
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.boardDarken > 0.01) {
      ctx.save(); ctx.globalAlpha = this.boardDarken
      ctx.fillStyle = '#050308'
      ctx.fillRect(0, 0, this.canvasRenderer.width, this.canvasRenderer.height)
      ctx.restore()
    }
    if (this.sepiaAmount > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = this.sepiaAmount*0.45; ctx.fillStyle = '#8B7355'
      ctx.fillRect(0, 0, this.canvasRenderer.width, this.canvasRenderer.height)
      ctx.restore()
    }
    for (const s of this.slashLines) s.render(ctx)
    if (this.crownShatterAlpha > 0.01) {
      ctx.save()
      for (const p of this.crownParticles) {
        if (p.alpha <= 0.01) continue
        ctx.globalAlpha = p.alpha * this.crownShatterAlpha
        ctx.translate(p.x, p.y); ctx.rotate(p.rotation)
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10
        // Star fragment
        const s = p.size
        ctx.beginPath()
        ctx.moveTo(0, -s); ctx.lineTo(s*0.3, -s*0.3)
        ctx.lineTo(s, 0); ctx.lineTo(s*0.3, s*0.3)
        ctx.lineTo(0, s); ctx.lineTo(-s*0.3, s*0.3)
        ctx.lineTo(-s, 0); ctx.lineTo(-s*0.3, -s*0.3)
        ctx.closePath(); ctx.fill()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }
      ctx.restore()
    }
  }
}
