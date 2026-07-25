export class Particle {
  constructor(x, y, options = {}) {
    this.x = x
    this.y = y
    this.vx = options.vx || 0
    this.vy = options.vy || 0
    this.ax = options.ax || 0
    this.ay = options.ay || 0
    this.size = options.size || 4
    this.color = options.color || '#ffffff'
    this.alpha = options.alpha || 1
    this.rotation = options.rotation || 0
    this.rotationSpeed = options.rotationSpeed || 0
    this.life = options.life || 1
    this.maxLife = this.life
    this.shape = options.shape || 'circle'
    this.gravity = options.gravity || 0
    this.friction = options.friction || 0.98
    this.glow = options.glow || false
    this.glowColor = options.glowColor || this.color
  }

  update(dt) {
    this.vx += this.ax * dt
    this.vy += this.ay * dt
    this.vy += this.gravity * dt
    this.vx *= this.friction
    this.vy *= this.friction
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.rotation += this.rotationSpeed * dt
    this.life -= dt
    this.alpha = Math.max(0, this.life / this.maxLife)
  }

  isDead() {
    return this.life <= 0
  }

  render(ctx) {
    if (this.alpha <= 0) return

    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    if (this.glow) {
      ctx.shadowColor = this.glowColor
      ctx.shadowBlur = this.size * 2
    }

    ctx.fillStyle = this.color

    switch (this.shape) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(0, 0, this.size, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'square':
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size)
        break
      case 'diamond':
        ctx.beginPath()
        ctx.moveTo(0, -this.size)
        ctx.lineTo(this.size, 0)
        ctx.lineTo(0, this.size)
        ctx.lineTo(-this.size, 0)
        ctx.closePath()
        ctx.fill()
        break
      case 'triangle':
        ctx.beginPath()
        ctx.moveTo(0, -this.size)
        ctx.lineTo(this.size * 0.866, this.size * 0.5)
        ctx.lineTo(-this.size * 0.866, this.size * 0.5)
        ctx.closePath()
        ctx.fill()
        break
      case 'shard':
        ctx.beginPath()
        ctx.moveTo(0, -this.size)
        ctx.lineTo(this.size * 0.8, this.size * 0.2)
        ctx.lineTo(this.size * 0.3, this.size)
        ctx.lineTo(-this.size * 0.5, this.size * 0.5)
        ctx.closePath()
        ctx.fill()
        break
    }

    ctx.restore()
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = []
    this.emitters = []
    this.maxParticles = 500
  }

  emit(x, y, options = {}) {
    const count = options.count || 1
    const spread = options.spread || Math.PI * 2
    const speed = options.speed || 100
    const angle = options.angle || 0

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break

      const a = angle + (Math.random() - 0.5) * spread
      const s = speed * (0.5 + Math.random() * 0.5)

      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: options.size || (2 + Math.random() * 3),
        color: options.color || this._randomColor(options.palette),
        life: options.life || (0.5 + Math.random() * 1),
        shape: options.shape || 'circle',
        gravity: options.gravity || 0,
        friction: options.friction || 0.98,
        rotationSpeed: (Math.random() - 0.5) * 10,
        glow: options.glow || false,
        glowColor: options.glowColor
      }))
    }
  }

  emitBurst(x, y, options = {}) {
    this.emit(x, y, { ...options, count: options.count || 20, spread: Math.PI * 2 })
  }

  emitDirectional(x, y, angle, options = {}) {
    this.emit(x, y, { ...options, angle, spread: options.spread || Math.PI / 4 })
  }

  addEmitter(emitter) {
    this.emitters.push(emitter)
  }

  removeEmitter(emitter) {
    const idx = this.emitters.indexOf(emitter)
    if (idx !== -1) this.emitters.splice(idx, 1)
  }

  update(dt) {
    for (const emitter of this.emitters) {
      if (emitter.active) {
        emitter.update(dt, this)
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.update(dt)
      if (p.isDead()) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      p.render(ctx)
    }
  }

  clear() {
    this.particles.length = 0
    this.emitters.length = 0
  }

  getCount() {
    return this.particles.length
  }

  _randomColor(palette) {
    if (!palette || !palette.length) return '#ffffff'
    return palette[Math.floor(Math.random() * palette.length)]
  }
}

export class ParticleEmitter {
  constructor(options = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.rate = options.rate || 10
    this.options = options
    this.active = true
    this.timer = 0
    this.duration = options.duration || 0
    this.elapsed = 0
  }

  update(dt, system) {
    if (!this.active) return

    this.elapsed += dt
    if (this.duration > 0 && this.elapsed >= this.duration) {
      this.active = false
      return
    }

    this.timer += dt
    const interval = 1 / this.rate

    while (this.timer >= interval) {
      this.timer -= interval
      system.emit(this.x, this.y, this.options)
    }
  }

  setPosition(x, y) {
    this.x = x
    this.y = y
  }

  setRate(rate) {
    this.rate = rate
  }

  stop() {
    this.active = false
  }
}

export const ParticlePalettes = {
  white: ['#F5F0E8', '#fff8dc', '#ffec8b', '#ffe4b5', '#fffacd'],
  black: ['#2C2C2C', '#3D3020', '#4A3C2A', '#5C4A36', '#6B5344'],
  gold: ['#B8960F', '#D4A820', '#F5F0E8', '#ffe4b5', '#E8DCCA'],
  fire: ['#B84030', '#D46040', '#E88070', '#ffa500', '#D4A820'],
  magic: ['#B8960F', '#8B7355', '#D4A820', '#F5F0E8', '#E8DCCA'],
  blood: ['#8b0000', '#B84030', '#dc143c', '#b22222', '#800000'],
  ice: ['#D4C4A8', '#C8B898', '#F5F0E8', '#E8DCCA', '#B8960F'],
  earth: ['#8B7355', '#6B5344', '#a0522d', '#d2b48c', '#f5deb3']
}