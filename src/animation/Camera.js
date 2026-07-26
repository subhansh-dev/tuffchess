export class Camera {
  constructor(canvasRenderer) {
    this.canvasRenderer = canvasRenderer

    // Camera: zoom-from-center + bounded shake + post-processing
    // NO PANNING — keeps board always centered and in frame
    this.zoom = 1
    this.targetZoom = 1
    this.zoomLerpSpeed = 0.15

    // Shake: bounded to 4px max, fast-decaying for snappy impact
    this.shakeOffsetX = 0
    this.shakeOffsetY = 0
    this.shakeIntensity = 0
    this.shakeDuration = 0
    this.shakeTimer = 0
    this.shakeAngle = 0

    // Post-processing effect intensities
    this.chromaticAberration = 0
    this.vignette = 0
    this.screenFlash = { color: [255, 255, 255], alpha: 0 }
    this.colorGrade = { contrast: 0, saturation: 0, brightness: 0 }

    // Impact frame: brief black/white overlay at capture moment
    this.impactFrame = { active: false, color: 'white', alpha: 0, duration: 0, timer: 0 }

    this.viewportWidth = canvasRenderer.width
    this.viewportHeight = canvasRenderer.height

    this.boardCenterX = canvasRenderer.boardOffsetX + canvasRenderer.squareSize * 4
    this.boardCenterY = canvasRenderer.boardOffsetY + canvasRenderer.squareSize * 4

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
    // Zoom interpolation — snappy lerp for punch feel
    const dt60 = dt * 60
    this.zoom += (this.targetZoom - this.zoom) * this.zoomLerpSpeed * dt60
    if (Math.abs(this.targetZoom - this.zoom) < 0.002) this.zoom = this.targetZoom

    // Clamp zoom to 1.12 max — keeps board fully in frame even at peak
    this.zoom = Math.min(this.zoom, 1.12)

    // Shake decay — exponential for snappy stop
    if (this.shakeTimer > 0) {
      this.shakeTimer -= rawDt
      const decay = Math.pow(1 - (rawDt / this.shakeDuration), 3) // exponential decay
      const currentIntensity = this.shakeIntensity * decay
      // Bounded to 4px max — no board displacement
      const boundedIntensity = Math.min(currentIntensity, 4)
      // Multi-frequency shake for organic feel
      this.shakeOffsetX = Math.cos(this.shakeAngle + this.shakeTimer * 47) * boundedIntensity * 0.7
        + Math.cos(this.shakeAngle * 1.5 + this.shakeTimer * 93) * boundedIntensity * 0.3
      this.shakeOffsetY = Math.sin(this.shakeAngle + this.shakeTimer * 47) * boundedIntensity * 0.5
        + Math.sin(this.shakeAngle * 1.5 + this.shakeTimer * 93) * boundedIntensity * 0.2

      if (this.shakeTimer <= 0) {
        this.shakeOffsetX = 0
        this.shakeOffsetY = 0
      }
    }

    // Impact frame decay
    if (this.impactFrame.active) {
      this.impactFrame.timer -= rawDt
      if (this.impactFrame.timer <= 0) {
        this.impactFrame.active = false
        this.impactFrame.alpha = 0
      } else {
        // Quick fade-out over the duration
        this.impactFrame.alpha = this.impactFrame.timer / this.impactFrame.duration
      }
    }

    // isActive: true when any visual effect is active
    this.isActive = this.shakeTimer > 0 ||
                    Math.abs(this.zoom - 1) > 0.002 ||
                    this.chromaticAberration > 0.001 ||
                    this.vignette > 0.001 ||
                    this.screenFlash?.alpha > 0.001 ||
                    this.impactFrame.active
  }

  // === ZOOM ONLY — no pan ===
  zoomTo(zoom, duration = 0.3) {
    this.targetZoom = zoom
    this.zoomLerpSpeed = duration > 0 ? 1 / (duration * 60) : 1
  }

  // Shake: bounded to 4px max — keeps board in frame
  shake(intensity, duration, angle = 0) {
    this.shakeIntensity = Math.min(intensity, 4) // BOUND TO 4PX
    this.shakeDuration = duration
    this.shakeTimer = duration
    this.shakeAngle = angle
  }

  // Impact frame: brief full-screen overlay (white or black) at capture moment
  impactFlash(color = 'white', duration = 0.06) {
    this.impactFrame = { active: true, color, alpha: 1, duration, timer: duration }
  }

  directionalShake(intensity, angle, duration) {
    this.shake(intensity, duration, angle)
  }

  // Apply zoom-from-center + bounded shake
  applyTransform(ctx) {
    const cx = this.viewportWidth / 2
    const cy = this.viewportHeight / 2

    ctx.save()
    // Zoom from viewport center — keeps board centered
    ctx.translate(cx, cy)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-cx, -cy)
    // Shake offset AFTER zoom (in screen space, bounded)
    ctx.translate(this.shakeOffsetX, this.shakeOffsetY)
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
      colorGrade: this.colorGrade || { contrast: 0, saturation: 0, brightness: 0 },
      impactFrame: this.impactFrame || { active: false, color: 'white', alpha: 0 }
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
    this.impactFrame = { active: false, color: 'white', alpha: 0, duration: 0, timer: 0 }
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
    this.impactFrame = { active: false, color: 'white', alpha: 0, duration: 0, timer: 0 }
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
