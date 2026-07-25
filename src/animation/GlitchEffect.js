import { MathUtils } from '../utils/MathUtils.js'

export class GlitchEffect {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.intensity = 0
    this.active = false
    this.glitchBlocks = []
    this.rgbShift = { r: { x: 0, y: 0 }, g: { x: 0, y: 0 }, b: { x: 0, y: 0 } }
    this.scanlineOffset = 0
    this.colorChannels = null
  }

  trigger(intensity = 1, duration = 300) {
    this.intensity = intensity
    this.active = true
    this.duration = duration
    this.elapsed = 0
    this.generateBlocks()
  }

  generateBlocks() {
    this.glitchBlocks = []
    const blockCount = Math.floor(5 + this.intensity * 15)
    for (let i = 0; i < blockCount; i++) {
      const h = MathUtils.random(2, 20)
      const y = MathUtils.random(0, this.height - h)
      const w = MathUtils.random(50, this.width * 0.6)
      const x = MathUtils.random(0, this.width - w)
      this.glitchBlocks.push({ x, y, w, h, shiftX: MathUtils.random(-20, 20) })
    }
  }

  update(dt) {
    if (!this.active) return

    this.elapsed += dt
    const progress = this.elapsed / this.duration

    const currentIntensity = this.intensity * (1 - MathUtils.easeOutCubic(progress))

    this.rgbShift.r.x = MathUtils.random(-currentIntensity * 8, currentIntensity * 8)
    this.rgbShift.r.y = MathUtils.random(-currentIntensity * 3, currentIntensity * 3)
    this.rgbShift.b.x = MathUtils.random(-currentIntensity * 8, currentIntensity * 8)
    this.rgbShift.b.y = MathUtils.random(-currentIntensity * 3, currentIntensity * 3)

    this.glitchBlocks.forEach(block => {
      block.shiftX += MathUtils.random(-5, 5)
    })

    this.scanlineOffset = MathUtils.random(-2, 2)

    if (progress >= 1) {
      this.active = false
      this.intensity = 0
      this.rgbShift = { r: { x: 0, y: 0 }, g: { x: 0, y: 0 }, b: { x: 0, y: 0 } }
    }
  }

  render(ctx, sourceCanvas) {
    if (!this.active && this.intensity === 0) return

    ctx.save()

    if (this.intensity > 0.1) {
      this.renderRGBShift(ctx, sourceCanvas)
    }

    if (this.glitchBlocks.length > 0) {
      this.renderBlockGlitch(ctx, sourceCanvas)
    }

    if (this.intensity > 0.2) {
      this.renderScanlines(ctx)
    }

    ctx.restore()
  }

  renderRGBShift(ctx, source) {
    ctx.globalCompositeOperation = 'screen'
    
    ctx.filter = 'none'
    ctx.drawImage(source, this.rgbShift.r.x, this.rgbShift.r.y)
    
    ctx.globalCompositeOperation = 'lighter'
    ctx.filter = 'none'
    ctx.drawImage(source, this.rgbShift.g.x, this.rgbShift.g.y)
    
    ctx.drawImage(source, this.rgbShift.b.x, this.rgbShift.b.y)
    
    ctx.globalCompositeOperation = 'source-over'
  }

  renderBlockGlitch(ctx, source) {
    ctx.globalCompositeOperation = 'source-over'
    this.glitchBlocks.forEach(block => {
      ctx.drawImage(
        source,
        block.x, block.y, block.w, block.h,
        block.x + block.shiftX, block.y, block.w, block.h
      )
    })
  }

  renderScanlines(ctx) {
    ctx.save()
    ctx.globalAlpha = 0.15 * this.intensity
    ctx.strokeStyle = '#D4A820'
    ctx.lineWidth = 1
    
    for (let y = 0; y < this.height; y += 4) {
      ctx.beginPath()
      ctx.moveTo(0, y + this.scanlineOffset)
      ctx.lineTo(this.width, y + this.scanlineOffset)
      ctx.stroke()
    }
    ctx.restore()
  }

  resize(width, height) {
    this.width = width
    this.height = height
  }
}