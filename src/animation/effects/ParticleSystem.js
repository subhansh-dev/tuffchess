import { MathUtils } from '../../utils/MathUtils.js'

export class ParticleSystem {
  constructor(ctx, options = {}) {
    this.ctx = ctx
    this.x = options.x || 0
    this.y = options.y || 0
    this.colors = options.colors || ['#D46040', '#B8960F', '#E88070']
    this.count = options.count || 60
    this.duration = options.duration || 800
    this.size = options.size || { min: 2, max: 6 }
    this.speed = options.speed || { min: 100, max: 400 }
    this.gravity = options.gravity || 200
    this.fade = options.fade !== false
    
    this.particles = []
    this.active = false
    this.startTime = 0
    this.spawned = false
  }

  start() {
    this.active = true
    this.spawned = false
    this.startTime = performance.now()
    this.particles = []
    return new Promise(resolve => { this.onComplete = resolve })
  }

  spawnParticles() {
    for (let i = 0; i < this.count; i++) {
      const angle = MathUtils.random(0, Math.PI * 2)
      const speed = MathUtils.random(this.speed.min, this.speed.max)
      const size = MathUtils.random(this.size.min, this.size.max)
      const color = this.colors[MathUtils.randomInt(0, this.colors.length - 1)]
      const life = MathUtils.random(0.5, 1) * this.duration

      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - MathUtils.random(0, 100),
        size,
        color,
        life,
        maxLife: life,
        rotation: MathUtils.random(0, Math.PI * 2),
        rotationSpeed: MathUtils.random(-5, 5),
        type: MathUtils.randomInt(0, 2)
      })
    }
  }

  update(dt) {
    if (!this.active) return

    const elapsed = performance.now() - this.startTime

    if (!this.spawned) {
      this.spawnParticles()
      this.spawned = true
    }

    let aliveCount = 0

    this.particles.forEach(p => {
      p.life -= dt * 1000
      if (p.life <= 0) return
      aliveCount++

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += this.gravity * dt
      p.rotation += p.rotationSpeed * dt
    })

    if (aliveCount === 0) {
      this.active = false
      if (this.onComplete) this.onComplete()
    }
  }

  render() {
    if (!this.active && this.particles.length === 0) return

    this.particles.forEach(p => {
      if (p.life <= 0) return

      const alpha = this.fade ? Math.max(0, p.life / p.maxLife) : 1
      const size = p.size * alpha

      this.ctx.save()
      this.ctx.translate(p.x, p.y)
      this.ctx.rotate(p.rotation)
      this.ctx.globalAlpha = alpha

      if (p.type === 0) {
        this.ctx.fillStyle = p.color
        this.ctx.beginPath()
        this.ctx.arc(0, 0, size, 0, Math.PI * 2)
        this.ctx.fill()
      } else if (p.type === 1) {
        this.ctx.fillStyle = p.color
        this.ctx.fillRect(-size/2, -size/2, size, size)
      } else {
        this.ctx.strokeStyle = p.color
        this.ctx.lineWidth = Math.max(1, size * 0.3)
        this.ctx.beginPath()
        this.ctx.moveTo(-size, 0)
        this.ctx.lineTo(size, 0)
        this.ctx.moveTo(0, -size)
        this.ctx.lineTo(0, size)
        this.ctx.stroke()
      }

      this.ctx.restore()
    })
  }

  getProgress() {
    if (!this.active) return 1
    return Math.min((performance.now() - this.startTime) / this.duration, 1)
  }
}