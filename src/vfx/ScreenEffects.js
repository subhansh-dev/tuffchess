/**
 * ScreenEffects — Premium cinematic overlay effects.
 * Speed lines, light rays, energy rings, distortion waves, slash trails.
 */
export class ScreenEffects {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.speedLines = []
    this.lightRays = []
    this.energyRings = []
    this.distortionWaves = []
    this.slashTrails = []
    this.lightBeams = []
  }

  resize(w, h) {
    this.width = w
    this.height = h
  }

  // ── Speed Lines (directional) ────────────────────────────────
  spawnSpeedLines(cx, cy, angle, count = 12, intensity = 1) {
    for (let i = 0; i < count; i++) {
      const offset = (Math.random() - 0.5) * this.width * 0.6
      const perpAngle = angle + Math.PI / 2
      this.speedLines.push({
        x: cx + Math.cos(perpAngle) * offset,
        y: cy + Math.sin(perpAngle) * offset,
        angle: angle + (Math.random() - 0.5) * 0.2,
        length: 30 + Math.random() * 80 * intensity,
        alpha: 0.8,
        decay: 0.03,
        width: 1 + Math.random() * 2,
        speed: 600 + Math.random() * 400
      })
    }
  }

  // ── Light Rays (radial burst) ────────────────────────────────
  spawnLightRays(cx, cy, count = 8, intensity = 1) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3
      this.lightRays.push({
        x: cx,
        y: cy,
        angle,
        length: 0,
        maxLength: (100 + Math.random() * 200) * intensity,
        width: 2 + Math.random() * 4,
        alpha: 0.9,
        decay: 0.02,
        growSpeed: 800 + Math.random() * 400,
        color: ['#B8960F', '#F5F0E8', '#D4A820', '#8B7355'][Math.floor(Math.random() * 4)]
      })
    }
  }

  // ── Energy Rings (expanding) ──────────────────────────────────
  spawnEnergyRing(cx, cy, radius = 5, maxRadius = 150, color = '#B8960F', width = 2) {
    this.energyRings.push({
      x: cx,
      y: cy,
      radius,
      maxRadius,
      alpha: 1,
      decay: 0.03,
      width: width + Math.random() * 2,
      color,
      expandSpeed: 400 + Math.random() * 200
    })
  }

  spawnTripleRing(cx, cy, intensity = 1) {
    this.spawnEnergyRing(cx, cy, 5, 120 * intensity, '#B8960F', 3)
    this.spawnEnergyRing(cx, cy, 5, 180 * intensity, '#D4A820', 2)
    this.spawnEnergyRing(cx, cy, 5, 80 * intensity, '#8B7355', 2.5)
  }

  // ── Distortion Wave (heat haze) ──────────────────────────────
  spawnDistortionWave(cx, cy, radius = 10, maxRadius = 200) {
    this.distortionWaves.push({
      x: cx, y: cy,
      radius, maxRadius,
      alpha: 0.5,
      decay: 0.02,
      speed: 300
    })
  }

  // ── Slash Trail (anime cut) ──────────────────────────────────
  spawnSlashTrail(fromX, fromY, toX, toY, color = '#ffffff', width = 3) {
    const dx = toX - fromX
    const dy = toY - fromY
    const len = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    this.slashTrails.push({
      fromX, fromY, toX, toY,
      angle, length: len,
      alpha: 1,
      decay: 0.04,
      width,
      color,
      progress: 0
    })
  }

  // ── Light Beam (focused) ─────────────────────────────────────
  spawnLightBeam(cx, cy, angle, length = 300, width = 8) {
    this.lightBeams.push({
      x: cx, y: cy,
      angle, length, width,
      alpha: 0.9,
      decay: 0.03,
      growProgress: 0,
      growSpeed: 8
    })
  }

  // ── Update ────────────────────────────────────────────────────
  update(dt) {
    // Speed lines
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      const line = this.speedLines[i]
      line.x += Math.cos(line.angle) * line.speed * dt
      line.y += Math.sin(line.angle) * line.speed * dt
      line.alpha -= line.decay
      if (line.alpha <= 0) this.speedLines.splice(i, 1)
    }

    // Light rays
    for (let i = this.lightRays.length - 1; i >= 0; i--) {
      const ray = this.lightRays[i]
      ray.length = Math.min(ray.length + ray.growSpeed * dt, ray.maxLength)
      ray.alpha -= ray.decay
      if (ray.alpha <= 0) this.lightRays.splice(i, 1)
    }

    // Energy rings
    for (let i = this.energyRings.length - 1; i >= 0; i--) {
      const ring = this.energyRings[i]
      ring.radius = Math.min(ring.radius + ring.expandSpeed * dt, ring.maxRadius)
      ring.alpha -= ring.decay
      if (ring.alpha <= 0) this.energyRings.splice(i, 1)
    }

    // Distortion waves
    for (let i = this.distortionWaves.length - 1; i >= 0; i--) {
      const w = this.distortionWaves[i]
      w.radius = Math.min(w.radius + w.speed * dt, w.maxRadius)
      w.alpha -= w.decay
      if (w.alpha <= 0) this.distortionWaves.splice(i, 1)
    }

    // Slash trails
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      const s = this.slashTrails[i]
      s.progress = Math.min(1, s.progress + dt * 8)
      s.alpha -= s.decay
      if (s.alpha <= 0) this.slashTrails.splice(i, 1)
    }

    // Light beams
    for (let i = this.lightBeams.length - 1; i >= 0; i--) {
      const b = this.lightBeams[i]
      b.growProgress = Math.min(1, b.growProgress + b.growSpeed * dt)
      b.alpha -= b.decay
      if (b.alpha <= 0) this.lightBeams.splice(i, 1)
    }
  }

  // ── Render ────────────────────────────────────────────────────
  render(ctx) {
    ctx.save()

    // Speed lines
    for (const line of this.speedLines) {
      if (line.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = line.alpha
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = line.width
      ctx.lineCap = 'round'
      const endX = line.x + Math.cos(line.angle) * line.length
      const endY = line.y + Math.sin(line.angle) * line.length
      ctx.beginPath()
      ctx.moveTo(line.x, line.y)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      ctx.restore()
    }

    // Light rays
    for (const ray of this.lightRays) {
      if (ray.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = ray.alpha * 0.6
      ctx.translate(ray.x, ray.y)
      ctx.rotate(ray.angle)
      const gradient = ctx.createLinearGradient(0, 0, ray.length, 0)
      gradient.addColorStop(0, ray.color)
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(0, -ray.width / 2)
      ctx.lineTo(ray.length, -ray.width * 0.1)
      ctx.lineTo(ray.length, ray.width * 0.1)
      ctx.lineTo(0, ray.width / 2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // Energy rings
    for (const ring of this.energyRings) {
      if (ring.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = ring.alpha
      ctx.strokeStyle = ring.color
      ctx.lineWidth = ring.width
      ctx.shadowColor = ring.color
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Distortion waves (rendered as subtle white rings)
    for (const w of this.distortionWaves) {
      if (w.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = w.alpha * 0.3
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Slash trails
    for (const s of this.slashTrails) {
      if (s.alpha <= 0) continue
      const progress = s.progress
      const currentLen = s.length * progress
      const tailLen = s.length * Math.min(1, progress * 2)
      ctx.save()
      ctx.globalAlpha = s.alpha
      ctx.translate(s.fromX, s.fromY)
      ctx.rotate(s.angle)

      // Glow layer
      ctx.shadowColor = s.color
      ctx.shadowBlur = 12
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tailLen - currentLen, 0)
      ctx.lineTo(tailLen, 0)
      ctx.stroke()

      // Bright core
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = s.width * 0.4
      ctx.beginPath()
      ctx.moveTo(tailLen - currentLen, 0)
      ctx.lineTo(tailLen, 0)
      ctx.stroke()

      ctx.restore()
    }

    // Light beams
    for (const b of this.lightBeams) {
      if (b.alpha <= 0) continue
      const len = b.length * b.growProgress
      ctx.save()
      ctx.globalAlpha = b.alpha * 0.5
      ctx.translate(b.x, b.y)
      ctx.rotate(b.angle)
      const gradient = ctx.createLinearGradient(0, 0, len, 0)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.4)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(0, -b.width / 2)
      ctx.lineTo(len, -b.width * 0.05)
      ctx.lineTo(len, b.width * 0.05)
      ctx.lineTo(0, b.width / 2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    ctx.restore()
  }

  clear() {
    this.speedLines = []
    this.lightRays = []
    this.energyRings = []
    this.distortionWaves = []
    this.slashTrails = []
    this.lightBeams = []
  }
}
