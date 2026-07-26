export class Camera {
  constructor(canvasRenderer) {
    this.canvasRenderer = canvasRenderer

    // Camera only does zoom-from-center + bounded shake + post-processing effects
    // NO PANNING — this keeps the board always centered and in frame
    this.zoom = 1
    this.targetZoom = 1
    this.zoomLerpSpeed = 0.15

    // Shake: bounded, fast-decaying
    this.shakeOffsetX = 0
    this.shakeOffsetY = 0
    this.shakeIntensity = 0
    this.shakeDuration = 0
    this.shakeTimer = 0
    this.shakeAngle = 0

    // Post-processing effect intensities (set by AnimationManager, applied by Renderer/PostProcessing)
    this.chromaticAberration = 0
    this.vignette = 0
    this.screenFlash = { color: [255, 255, 255], alpha: 0 }
    this.colorGrade = { contrast: 0, saturation: 0, brightness: 0 }

    this.viewportWidth = canvasRenderer.width
    this.viewportHeight = canvasRenderer.height

    this.boardCenterX = canvasRenderer.boardOffsetX + canvasRenderer.squareSize * 4
    this.boardCenterY = canvasRenderer.boardOffsetY + canvasRenderer.squareSize * 4

    // isActive flag tells Renderer whether to apply camera transform
    this.isActive = false
  }

  setViewport(width, height) {
    this.viewportWidth = width
    this.viewportHeight = height
  }

  setBoardCenter(x, y) {
    this.boardCenterX = x
    this.boardCenterY = y
  }

  update(dt, rawDt = dt) {
    // Zoom interpolation
    const dt60 = dt * 60
    this.zoom += (this.targetZoom - this.zoom) * this.zoomLerpSpeed * dt60
    if (Math.abs(this.targetZoom - this.zoom) < 0.001) this.zoom = this.targetZoom

    // Shake decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= rawDt
      const progress = 1 - this.shakeTimer / this.shakeDuration
      // Bounded shake: max 6px offset, decays linearly
      const currentIntensity = Math.min(this.shakeIntensity * (1 - progress), 6)
      this.shakeOffsetX = Math.cos(this.shakeAngle + this.shakeTimer * 60) * currentIntensity
      this.shakeOffsetY = Math.sin(this.shakeAngle + this.shakeTimer * 60) * currentIntensity * 0.6

      if (this.shakeTimer <= 0) {
        this.shakeOffsetX = 0
        this.shakeOffsetY = 0
      }
    }

    // isActive: true when any visual effect is active
    this.isActive = this.shakeTimer > 0 ||
                    Math.abs(this.zoom - 1) > 0.001 ||
                    this.chromaticAberration > 0.001 ||
                    this.vignette > 0.001 ||
                    this.screenFlash?.alpha > 0.001
  }

  // === ZOOM ONLY — no pan ===
  zoomTo(zoom, duration = 0.3) {
    this.targetZoom = zoom
    this.zoomLerpSpeed = duration > 0 ? 1 / (duration * 60) : 1
  }

  // Shake: bounded to 6px max
  shake(intensity, duration, angle = 0) {
    this.shakeIntensity = Math.min(intensity, 6) // BOUND THE SHAKE
    this.shakeDuration = duration
    this.shakeTimer = duration
    this.shakeAngle = angle
  }

  directionalShake(intensity, angle, duration) {
    this.shake(intensity, duration, angle)
  }

  // Apply zoom-from-center + bounded shake
  applyTransform(ctx) {
    const cx = this.viewportWidth / 2
    const cy = this.viewportHeight / 2

    ctx.save()
    // Shake offset (bounded, in screen space)
    ctx.translate(this.shakeOffsetX, this.shakeOffsetY)
    // Zoom from viewport center — this keeps the board centered
    ctx.translate(cx, cy)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-cx, -cy)
  }

  restoreTransform(ctx) {
    ctx.restore()
  }

  getTransform() {
    return {
      zoom: this.zoom,
      shakeOffsetX: this.shakeOffsetX,
      shakeOffsetY: this.shakeOffsetY,
      chromaticAberration: this.chromaticAberration || 0,
      vignette: this.vignette || 0,
      screenFlash: this.screenFlash || { color: [255, 255, 255], alpha: 0 },
      colorGrade: this.colorGrade || { contrast: 0, saturation: 0, brightness: 0 }
    }
  }

  // Reset everything to neutral
  reset(instant = false) {
    this.zoom = 1
    this.targetZoom = 1
    this.zoomLerpSpeed = instant ? 1 : 0.15
    this.shakeOffsetX = 0
    this.shakeOffsetY = 0
    this.shakeIntensity = 0
    this.shakeTimer = 0
    this.chromaticAberration = 0
    this.vignette = 0
    this.screenFlash = { color: [255, 255, 255], alpha: 0 }
    this.colorGrade = { contrast: 0, saturation: 0, brightness: 0 }
  }

  snapToBoardCenter() {
    this.zoom = 1
    this.targetZoom = 1
    this.shakeOffsetX = 0
    this.shakeOffsetY = 0
    this.shakeTimer = 0
    this.chromaticAberration = 0
    this.vignette = 0
    this.screenFlash = { color: [255, 255, 255], alpha: 0 }
  }

  isShaking() {
    return this.shakeTimer > 0
  }

  isAnimating() {
    return Math.abs(this.zoom - this.targetZoom) > 0.01
  }

  // Unused but kept for API compatibility
  panTo() { /* NO PANNING — zoom-only keeps board in frame */ }
  follow() { /* NO PANNING */ }
  lookAt() { /* NO PANNING */ }
  setTimeScale() { /* No effect on zoom-only camera */ }
  screenToWorld(screenX, screenY) {
    const cx = this.viewportWidth / 2
    const cy = this.viewportHeight / 2
    return {
      x: (screenX - cx - this.shakeOffsetX) / this.zoom + cx,
      y: (screenY - cy - this.shakeOffsetY) / this.zoom + cy
    }
  }
  worldToScreen(worldX, worldY) {
    const cx = this.viewportWidth / 2
    const cy = this.viewportHeight / 2
    return {
      x: (worldX - cx) * this.zoom + cx + this.shakeOffsetX,
      y: (worldY - cy) * this.zoom + cy + this.shakeOffsetY
    }
  }
}
