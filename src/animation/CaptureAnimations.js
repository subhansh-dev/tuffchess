import { Piece, Color } from '../core/ChessTypes.js'
import { Easing } from './Easing.js'

/**
 * CaptureAnimations — Anime Duel-Style VFX System.
 * Each capture feels like an anime sword fight moment:
 * - Slash lines across victim with spark particles
 * - Impact freeze frame (brief time stop)
 * - Camera zoom-in then zoom-out
 * - Speed lines (manga radial lines)
 * - Screen flash + shake at impact
 * - Dramatic victim destruction
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
   ANIME SLASH LINE - Core building block for all effects
   Manga-style slash with glow, spark particles along the line
   ================================================================ */

class SlashLine {
  constructor(cx, cy, angle, length, width, delay = 0) {
    this.cx = cx; this.cy = cy; this.angle = angle
    this.length = length; this.width = width; this.delay = delay
    this.alpha = 0; this.started = false; this.elapsed = 0
    this.sparkParticles = []
    const sparkCount = Math.floor(length / 8)
    for (let i = 0; i < sparkCount; i++) {
      const t = (i + 0.5) / sparkCount
      const dist = t * length * 0.5
      this.sparkParticles.push({
        x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle + Math.PI/2) * (20 + Math.random() * 40) + (Math.random()-0.5) * 30,
        vy: Math.sin(angle + Math.PI/2) * (20 + Math.random() * 40) + (Math.random()-0.5) * 30,
        size: 1 + Math.random() * 3, alpha: 1,
        life: 0.15 + Math.random() * 0.2, maxLife: 0.15 + Math.random() * 0.2
      })
    }
  }

  update(progress, dt = 1/60) {
    this.elapsed += dt
    if (this.elapsed < this.delay) return
    this.started = true
    const slashProgress = Math.max(0, this.elapsed - this.delay)
    if (slashProgress < 0.05) { this.alpha = 1 }
    else if (slashProgress < 0.3) { this.alpha = 1 - (slashProgress - 0.05) / 0.25 }
    else { this.alpha = 0 }
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i]
      p.life -= dt; p.alpha = Math.max(0, p.life / p.maxLife)
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 100 * dt
      if (p.life <= 0) this.sparkParticles.splice(i, 1)
    }
  }

  render(ctx) {
    if (!this.started || this.alpha <= 0.01) return
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle)
    const halfLen = this.length * 0.5
    ctx.save()
    // Glow layer
    ctx.globalAlpha = this.alpha * 0.4; ctx.strokeStyle = '#F5F0E8'
    ctx.lineWidth = this.width + 8; ctx.lineCap = 'round'
    ctx.shadowColor = '#F5F0E8'; ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(this.cx - cos * halfLen, this.cy - sin * halfLen)
    ctx.lineTo(this.cx + cos * halfLen, this.cy + sin * halfLen)
    ctx.stroke()
    // Core line (warm gold)
    ctx.globalAlpha = this.alpha; ctx.strokeStyle = '#B8960F'
    ctx.lineWidth = this.width; ctx.shadowColor = '#B8960F'; ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(this.cx - cos * halfLen, this.cy - sin * halfLen)
    ctx.lineTo(this.cx + cos * halfLen, this.cy + sin * halfLen)
    ctx.stroke()
    // White hot center
    ctx.globalAlpha = this.alpha * 0.8; ctx.strokeStyle = '#F5F0E8'
    ctx.lineWidth = this.width * 0.4; ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(this.cx - cos * halfLen * 0.7, this.cy - sin * halfLen * 0.7)
    ctx.lineTo(this.cx + cos * halfLen * 0.7, this.cy + sin * halfLen * 0.7)
    ctx.stroke()
    ctx.restore()
    // Spark particles
    ctx.save()
    for (const p of this.sparkParticles) {
      if (p.alpha <= 0.01) continue
      ctx.globalAlpha = p.alpha; ctx.fillStyle = '#B8960F'
      ctx.shadowColor = '#B8960F'; ctx.shadowBlur = 4
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

/* ================================================================
   ANIME SLASH EFFECT (Default)
   Single dramatic slash + victim dissolve
   ================================================================ */

export class AnimeSlashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor, intensity = 1) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor; this.intensity = intensity
    this.duration = 0.6 + intensity * 0.15; this.finished = false
    const slashAngle = Math.PI * 0.25 + Math.random() * 0.3
    this.slashLines = [new SlashLine(cx, cy, slashAngle, pieceSize * 1.8, 3 + intensity * 2)]
    if (intensity > 1) this.slashLines.push(new SlashLine(cx, cy, slashAngle + 0.4, pieceSize * 1.4, 2 + intensity, 0.05))
    this.victimAlpha = 1; this.victimScale = 1; this.dissolveProgress = 0
    this.shakeX = 0; this.shakeY = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.15) { this.victimAlpha = 1; this.victimScale = 1 }
    else if (progress < 0.3) { const h = (progress-0.15)/0.15; this.victimScale = 1 + h*0.15*this.intensity; this.victimAlpha = 1 }
    else if (progress < 0.5) { const d = (progress-0.3)/0.2; this.victimAlpha = 1 - Easing.easeInCubic(d); this.victimScale = 1+0.15*this.intensity-d*0.3; this.dissolveProgress = d }
    else { this.victimAlpha = 0; this.victimScale = 0.5; this.dissolveProgress = 1 }
    if (progress > 0.14 && progress < 0.25) { const s = (progress-0.14)/0.11; const i = 4*this.intensity*(1-s); this.shakeX = Math.cos(performance.now()*0.05)*i; this.shakeY = Math.sin(performance.now()*0.07)*i*0.5 }
    else { this.shakeX = 0; this.shakeY = 0 }
    if (progress >= 1) this.finished = true
  }
  render(ctx) { for (const s of this.slashLines) s.render(ctx); return { shakeX: this.shakeX, shakeY: this.shakeY } }
}

/* ================================================================
   ANIME PAWN SLASH - Quick slash, victim splits in two halves
   ================================================================ */

export class AnimePawnSlashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 0.5; this.finished = false
    const slashAngle = Math.PI * 0.15 + Math.random() * 0.2
    this.slashLines = [new SlashLine(cx, cy, slashAngle, pieceSize * 1.5, 2)]
    this.travelAngle = slashAngle
    this.dissolveAlpha = 1; this.leftHalfOffset = 0; this.rightHalfOffset = 0; this.splitProgress = 0
    this.shakeX = 0; this.shakeY = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.15) { this.dissolveAlpha = 1; this.leftHalfOffset = 0; this.rightHalfOffset = 0 }
    else if (progress < 0.4) { const sp = (progress-0.15)/0.25; this.splitProgress = sp; this.dissolveAlpha = 1 - sp*0.3; this.leftHalfOffset = sp*this.pieceSize*0.6; this.rightHalfOffset = sp*this.pieceSize*0.6 }
    else { const fp = (progress-0.4)/0.1; this.dissolveAlpha = Math.max(0, 0.7 - fp*0.7); this.leftHalfOffset = this.pieceSize*0.6 + fp*this.pieceSize*0.3; this.rightHalfOffset = this.pieceSize*0.6 + fp*this.pieceSize*0.3 }
    if (progress > 0.14 && progress < 0.22) { const s = (progress-0.14)/0.08; this.shakeX = Math.cos(performance.now()*0.05)*3*(1-s); this.shakeY = Math.sin(performance.now()*0.07)*2*(1-s) }
    else { this.shakeX = 0; this.shakeY = 0 }
    if (progress >= 1) this.finished = true
  }
  render(ctx) { for (const s of this.slashLines) s.render(ctx); return { shakeX: this.shakeX, shakeY: this.shakeY } }
}

/* ================================================================
   ANIME KNIGHT STRIKE - Dark aura, teleport, dramatic slash
   ================================================================ */

export class AnimeKnightStrikeEffect {
  constructor(canvasRenderer, cx, cy, fromX, fromY, toX, toY, pieceSize, attackerColor, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.fromX = fromX; this.fromY = fromY; this.toX = toX; this.toY = toY
    this.pieceSize = pieceSize; this.attackerColor = attackerColor; this.victimColor = victimColor
    this.duration = 1.2; this.finished = false
    const slashAngle = Math.atan2(toY-fromY, toX-fromX) + Math.PI*0.3
    this.slashLines = [new SlashLine(cx, cy, slashAngle, pieceSize*2.5, 4), new SlashLine(cx, cy, slashAngle+0.5, pieceSize*2, 3, 0.08)]
    this.darkAuraAlpha = 0; this.victimAlpha = 1; this.shakeX = 0; this.shakeY = 0
  }
  start() {}
  update(progress) {
    if (progress < 0.3) this.darkAuraAlpha = Easing.easeOutCubic(progress/0.3)*0.5
    else if (progress < 0.6) this.darkAuraAlpha = 0.5*(1-(progress-0.3)/0.3)
    else this.darkAuraAlpha = 0
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.4) this.victimAlpha = 1
    else if (progress < 0.6) this.victimAlpha = 1-(progress-0.4)/0.2
    else this.victimAlpha = 0
    if (progress > 0.38 && progress < 0.5) { const s = (progress-0.38)/0.12; this.shakeX = Math.cos(performance.now()*0.04)*10*(1-s); this.shakeY = Math.sin(performance.now()*0.06)*6*(1-s) }
    else { this.shakeX = 0; this.shakeY = 0 }
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.darkAuraAlpha > 0.01) { ctx.save(); ctx.globalAlpha = this.darkAuraAlpha; ctx.fillStyle = '#1a1410'; ctx.fillRect(0,0,this.canvasRenderer.width,this.canvasRenderer.height); ctx.restore() }
    for (const s of this.slashLines) s.render(ctx)
    return { shakeX: this.shakeX, shakeY: this.shakeY }
  }
}

/* ================================================================
   ANIME QUEEN MULTI-SLASH - 3 rapid slashes, big impact
   ================================================================ */

export class AnimeQueenMultiSlashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 0.9; this.finished = false
    this.slashLines = [new SlashLine(cx, cy, Math.PI*0.2, pieceSize*2.2, 4), new SlashLine(cx, cy, Math.PI*0.5, pieceSize*2, 3, 0.08), new SlashLine(cx, cy, Math.PI*0.8, pieceSize*1.8, 3, 0.16)]
    this.victimAlpha = 1; this.shakeX = 0; this.shakeY = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.35) this.victimAlpha = 1
    else if (progress < 0.6) this.victimAlpha = 1 - Easing.easeInCubic((progress-0.35)/0.25)
    else this.victimAlpha = 0
    if (progress > 0.06 && progress < 0.12) { this.shakeX = Math.cos(performance.now()*0.05)*8; this.shakeY = Math.sin(performance.now()*0.07)*5 }
    else if (progress > 0.14 && progress < 0.2) { this.shakeX = Math.cos(performance.now()*0.06)*10; this.shakeY = Math.sin(performance.now()*0.08)*6 }
    else if (progress > 0.22 && progress < 0.3) { this.shakeX = Math.cos(performance.now()*0.04)*12; this.shakeY = Math.sin(performance.now()*0.06)*8 }
    else { this.shakeX = 0; this.shakeY = 0 }
    if (progress >= 1) this.finished = true
  }
  render(ctx) { for (const s of this.slashLines) s.render(ctx); return { shakeX: this.shakeX, shakeY: this.shakeY } }
}

/* ================================================================
   ANIME ROOK CHARGE - Charging slide + impact shake
   ================================================================ */

export class AnimeRookChargeEffect {
  constructor(canvasRenderer, cx, cy, fromX, fromY, toX, toY, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.fromX = fromX; this.fromY = fromY; this.toX = toX; this.toY = toY
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 0.7; this.finished = false
    const moveAngle = Math.atan2(toY-fromY, toX-fromX)
    this.slashLines = [new SlashLine(cx, cy, moveAngle+Math.PI/4, pieceSize*2, 4)]
    this.victimAlpha = 1; this.trailAlpha = 0; this.shakeX = 0; this.shakeY = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.4) this.trailAlpha = Easing.easeOutCubic(progress/0.4)*0.5
    else this.trailAlpha = Math.max(0, 0.5-(progress-0.4)*2)
    if (progress < 0.3) this.victimAlpha = 1
    else if (progress < 0.5) this.victimAlpha = 1-(progress-0.3)/0.2
    else this.victimAlpha = 0
    if (progress > 0.25 && progress < 0.4) { const s = (progress-0.25)/0.15; this.shakeX = Math.cos(performance.now()*0.03)*10*(1-s); this.shakeY = Math.sin(performance.now()*0.05)*6*(1-s) }
    else { this.shakeX = 0; this.shakeY = 0 }
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.trailAlpha > 0.01) { ctx.save(); ctx.globalAlpha = this.trailAlpha; ctx.strokeStyle = '#B8960F'; ctx.lineWidth = this.pieceSize*0.15; ctx.lineCap = 'round'; ctx.shadowColor = '#B8960F'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.moveTo(this.fromX+this.pieceSize/2, this.fromY+this.pieceSize/2); ctx.lineTo(this.toX+this.pieceSize/2, this.toY+this.pieceSize/2); ctx.stroke(); ctx.restore() }
    for (const s of this.slashLines) s.render(ctx)
    return { shakeX: this.shakeX, shakeY: this.shakeY }
  }
}

/* ================================================================
   ANIME CLASH EFFECT - Both pieces clash dramatically
   ================================================================ */

export class AnimeClashEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 1.0; this.finished = false
    this.slashLines = [new SlashLine(cx, cy, Math.PI*0.1, pieceSize*2.5, 5), new SlashLine(cx, cy, Math.PI*0.6, pieceSize*2.3, 4, 0.06), new SlashLine(cx, cy, Math.PI*1.1, pieceSize*2, 3, 0.12)]
    this.victimAlpha = 1; this.flashAlpha = 0; this.boardDarken = 0; this.shakeX = 0; this.shakeY = 0
  }
  start() {}
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress > 0.12 && progress < 0.2) this.flashAlpha = 0.3*(1-(progress-0.12)/0.08)
    else this.flashAlpha = 0
    if (progress < 0.2) this.boardDarken = Easing.easeOutCubic(progress/0.2)*0.2
    else if (progress < 0.5) this.boardDarken = 0.2
    else this.boardDarken = 0.2*(1-(progress-0.5)/0.5)
    if (progress < 0.3) this.victimAlpha = 1
    else if (progress < 0.5) this.victimAlpha = 1 - Easing.easeInCubic((progress-0.3)/0.2)
    else this.victimAlpha = 0
    if (progress > 0.1 && progress < 0.3) { const s = (progress-0.1)/0.2; this.shakeX = Math.cos(performance.now()*0.03)*14*(1-s); this.shakeY = Math.sin(performance.now()*0.05)*8*(1-s) }
    else { this.shakeX = 0; this.shakeY = 0 }
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.boardDarken > 0.01) { ctx.save(); ctx.globalAlpha = this.boardDarken; ctx.fillStyle = '#1a1410'; ctx.fillRect(0,0,this.canvasRenderer.width,this.canvasRenderer.height); ctx.restore() }
    if (this.flashAlpha > 0.01) { ctx.save(); ctx.globalAlpha = this.flashAlpha; ctx.fillStyle = '#F5F0E8'; ctx.fillRect(0,0,this.canvasRenderer.width,this.canvasRenderer.height); ctx.restore() }
    for (const s of this.slashLines) s.render(ctx)
    return { shakeX: this.shakeX, shakeY: this.shakeY }
  }
}

/* ================================================================
   ANIME ROYAL DECAP - Crown shatter, sepia, extreme slow-mo
   ================================================================ */

export class AnimeRoyalDecapEffect {
  constructor(canvasRenderer, cx, cy, pieceSize, victimColor) {
    this.canvasRenderer = canvasRenderer; this.cx = cx; this.cy = cy
    this.pieceSize = pieceSize; this.victimColor = victimColor
    this.duration = 2.0; this.finished = false
    this.slashLines = [new SlashLine(cx, cy, Math.PI*0.15, pieceSize*3, 6), new SlashLine(cx, cy, Math.PI*0.45, pieceSize*2.8, 5, 0.1), new SlashLine(cx, cy, Math.PI*0.75, pieceSize*2.5, 4, 0.2), new SlashLine(cx, cy, Math.PI*1.05, pieceSize*2.2, 3, 0.3)]
    this.victimAlpha = 1; this.sepiaAmount = 0; this.boardDarken = 0; this.crownShatterAlpha = 0
    this.crownParticles = []; this.shakeX = 0; this.shakeY = 0
  }
  start() {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 80 + Math.random() * 200
      this.crownParticles.push({ x: this.cx, y: this.cy - this.pieceSize*0.2, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-100, size: 2+Math.random()*4, alpha: 1, life: 0.8+Math.random()*0.6, maxLife: 0.8+Math.random()*0.6, rotation: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*10, color: '#B8960F' })
    }
  }
  update(progress) {
    for (const s of this.slashLines) s.update(progress)
    if (progress < 0.2) this.sepiaAmount = Easing.easeOutCubic(progress/0.2)*0.6
    else if (progress < 0.7) this.sepiaAmount = 0.6
    else this.sepiaAmount = 0.6*(1-(progress-0.7)/0.3)
    if (progress < 0.3) this.boardDarken = Easing.easeOutCubic(progress/0.3)*0.4
    else if (progress < 0.7) this.boardDarken = 0.4
    else this.boardDarken = 0.4*(1-(progress-0.7)/0.3)
    if (progress > 0.2 && progress < 0.8) this.crownShatterAlpha = 1
    else if (progress >= 0.8) this.crownShatterAlpha = Math.max(0, 1-(progress-0.8)/0.2)
    for (let i = this.crownParticles.length - 1; i >= 0; i--) {
      const p = this.crownParticles[i]
      p.life -= 1/60; p.alpha = Math.max(0, p.life/p.maxLife)
      p.x += p.vx*1/60; p.y += p.vy*1/60; p.vy += 200*1/60; p.rotation += p.rotSpeed*1/60
      if (p.life <= 0) this.crownParticles.splice(i, 1)
    }
    if (progress < 0.3) this.victimAlpha = 1
    else if (progress < 0.6) this.victimAlpha = 1 - Easing.easeInQuint((progress-0.3)/0.3)
    else this.victimAlpha = 0
    if (progress > 0.15 && progress < 0.25) { const s = (progress-0.15)/0.1; this.shakeX = Math.cos(performance.now()*0.02)*16*(1-s); this.shakeY = Math.sin(performance.now()*0.04)*10*(1-s) }
    else if (progress > 0.3 && progress < 0.4) { const s = (progress-0.3)/0.1; this.shakeX = Math.cos(performance.now()*0.03)*12*(1-s); this.shakeY = Math.sin(performance.now()*0.05)*8*(1-s) }
    else { this.shakeX = 0; this.shakeY = 0 }
    if (progress >= 1) this.finished = true
  }
  render(ctx) {
    if (this.boardDarken > 0.01) { ctx.save(); ctx.globalAlpha = this.boardDarken; ctx.fillStyle = '#0a0805'; ctx.fillRect(0,0,this.canvasRenderer.width,this.canvasRenderer.height); ctx.restore() }
    if (this.sepiaAmount > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = this.sepiaAmount*0.4; ctx.fillStyle = '#8B7355'; ctx.fillRect(0,0,this.canvasRenderer.width,this.canvasRenderer.height); ctx.restore() }
    for (const s of this.slashLines) s.render(ctx)
    if (this.crownShatterAlpha > 0.01) {
      ctx.save()
      for (const p of this.crownParticles) {
        if (p.alpha <= 0.01) continue
        ctx.globalAlpha = p.alpha * this.crownShatterAlpha
        ctx.translate(p.x, p.y); ctx.rotate(p.rotation)
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6
        ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size*0.6, 0); ctx.lineTo(0, p.size*0.5); ctx.lineTo(-p.size*0.6, 0); ctx.closePath(); ctx.fill()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }
      ctx.restore()
    }
    return { shakeX: this.shakeX, shakeY: this.shakeY }
  }
}
