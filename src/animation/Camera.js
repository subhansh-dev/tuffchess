export class Camera {
  constructor(canvasRenderer) {
    this.canvasRenderer = canvasRenderer

    // Camera: zoom-from-center + bounded shake + post-processing
    this.zoom = 1
    this.targetZoom = 1
    this.zoomLerpSpeed = 0.15

    // Shake: now bounded to 8px max for more dramatic feel
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

    // Zoom target offset (for zooming to specific squares)
    this.zoomOffsetX = 0
    this.zoomOffsetY = 0
    this.targetZoomOffsetX = 0
    this.targetZoomOffsetY = 0

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
    // Zoom interpolation
    const dt60 = dt * 60
    this.zoom += (this.targetZoom - this.zoom) * this.zoomLerpSpeed * dt60
    if (Math.abs(this.targetZoom - this.zoom) < 0.002) this.zoom = this.targetZoom

    // Clamp zoom to 1.25 max for more dramatic zoom while keeping board visible
    this.zoom = Math.min(this.zoom, 1.25)

    // Zoom offset interpolation
    this.zoomOffsetX += (this.targetZoomOffsetX - this.zoomOffsetX) * this.zoomLerpSpeed * dt60
    this.zoomOffsetY += (this.targetZoomOffsetY - this.zoomOffsetY) * this.zoomLerpSpeed * dt60

    // Shake decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= rawDt
      const decay = Math.pow(1 - (rawDt / this.shakeDuration), 2)
      const currentIntensity = this.shakeIntensity * decay
      // Bounded to 8px max for more drama
      const boundedIntensity = Math.min(currentIntensity, 8)
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
        this.impactFrame.alpha = this.impactFrame.timer / this.impactFrame.duration
      }
    }

    // isActive: true when any visual effect is active
    this.isActive = this.shakeTimer > 0 ||
                    Math.abs(this.zoom - 1) > 0.002 ||
                    Math.abs(this.zoomOffsetX) > 0.5 ||
                    Math.abs(this.zoomOffsetY) > 0.5 ||
                    this.chromaticAberration > 0.001 ||
                    this.vignette > 0.001 ||
                    this.screenFlash?.alpha > 0.001 ||
                    this.impactFrame.active
  }

  zoomTo(zoom, duration = 0.3) {
    this.targetZoom = zoom
    this.zoomLerpSpeed = duration > 0 ? 1 / (duration * 60) : 1
  }

  zoomToSquare(squareX, squareY, zoom, duration = 0.3) {
    this.targetZoom = zoom
    this.targetZoomOffsetX = squareX
    this.targetZoomOffsetY = squareY
    this.zoomLerpSpeed = duration > 0 ? 1 / (duration * 60) : 1
  }

  shake(intensity, duration, angle = 0) {
    this.shakeIntensity = Math.min(intensity, 8)
    this.shakeDuration = duration
    this.shakeTimer = duration
    this.shakeAngle = angle
  }

  impactFlash(color = 'white', duration = 0.06) {
    this.impactFrame = { active: true, color, alpha: 1, duration, timer: duration }
  }

  directionalShake(intensity, angle, duration) {
    this.shake(intensity, duration, angle)
  }

  applyTransform(ctx) {
    const cx = this.viewportWidth / 2
    const cy = this.viewportHeight / 2

    ctx.save()
    // Zoom from viewport center with optional offset
    ctx.translate(cx + this.zoomOffsetX, cy + this.zoomOffsetY)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-cx - this.zoomOffsetX, -cy - this.zoomOffsetY)
    // Shake offset AFTER zoom
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
      zoomOffsetX: this.zoomOffsetX,
      zoomOffsetY: this.zoomOffsetY,
      chromaticAberration: this.chromaticAberration || 0,
      vignette: this.vignette || 0,
      screenFlash: this.screenFlash || { color: [255, 255, 255], alpha: 0 },
      colorGrade: this.colorGrade || { contrast: 0, saturation: 0, brightness: 0 },
      impactFrame: this.impactFrame || { active: false, color: 'white', alpha: 0 }
    }
  }

  reset(instant = false) {
    this.zoom = 1
    this.targetZoom = 1
    this.zoomLerpSpeed = instant ? 1 : 0.15
    this.zoomOffsetX = 0
    this.zoomOffsetY = 0
    this.targetZoomOffsetX = 0
    this.targetZoomOffsetY = 0
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
    this.zoomOffsetX = 0
    this.zoomOffsetY = 0
    this.targetZoomOffsetX = 0
    this.targetZoomOffsetY = 0
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
    return Math.abs(this.zoom - this.targetZoom) > 0.01 ||
           Math.abs(this.zoomOffsetX - this.targetZoomOffsetX) > 0.5 ||
           Math.abs(this.zoomOffsetY - this.targetZoomOffsetY) > 0.5
  }

  panTo() { /* NO PANNING */ }
  follow() { /* NO PANNING */ }
  lookAt() { /* NO PANNING */ }
  setTimeScale() { }
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
