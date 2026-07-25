import { MathUtils } from '../utils/MathUtils.js';

export const ParticlePresets = {
  sparks: {
    count: 30,
    colors: ['#B8960F', '#F5F0E8', '#D4A820', '#E8DCCA'],
    size: { min: 1.5, max: 4 },
    speed: { min: 200, max: 600 },
    gravity: 300,
    life: { min: 0.3, max: 0.8 },
    shapes: ['circle', 'line'],
    spread: Math.PI * 2,
    angleOffset: -Math.PI / 2
  },

  embers: {
    count: 25,
    colors: ['#ff6b35', '#ff8c00', '#ffa500', '#B8960F', '#F5F0E8'],
    size: { min: 2, max: 5 },
    speed: { min: 50, max: 250 },
    gravity: 150,
    life: { min: 0.5, max: 1.2 },
    shapes: ['circle', 'diamond'],
    spread: Math.PI * 1.5,
    angleOffset: -Math.PI / 2,
    fade: true
  },

  dust: {
    count: 40,
    colors: ['#8b7d6b', '#a89f91', '#c5bdb3', '#ddd5cc'],
    size: { min: 1, max: 3 },
    speed: { min: 30, max: 120 },
    gravity: 50,
    life: { min: 0.8, max: 1.5 },
    shapes: ['circle'],
    spread: Math.PI * 2,
    angleOffset: 0
  },

  smoke: {
    count: 20,
    colors: ['rgba(20,20,30,0.6)', 'rgba(40,40,50,0.4)', 'rgba(60,60,70,0.3)', 'rgba(80,80,90,0.2)'],
    size: { min: 8, max: 20 },
    speed: { min: 20, max: 80 },
    gravity: -20,
    life: { min: 1.0, max: 2.0 },
    shapes: ['circle', 'smokePuff'],
    spread: Math.PI * 0.8,
    angleOffset: -Math.PI / 2,
    expansion: { value: 1.5 }
  },

  lightFragments: {
    count: 35,
    colors: ['#D4A820', '#8B7355', '#B8960F', '#B8960F', '#F5F0E8'],
    size: { min: 1, max: 3 },
    speed: { min: 150, max: 500 },
    gravity: 100,
    life: { min: 0.4, max: 0.9 },
    shapes: ['diamond', 'star', 'circle'],
    spread: Math.PI * 2,
    angleOffset: 0,
    glow: true
  },

  energyShards: {
    count: 20,
    colors: ['#D4A820', '#8B7355', '#B8960F', '#F5F0E8'],
    size: { min: 3, max: 8 },
    speed: { min: 200, max: 800 },
    gravity: 200,
    life: { min: 0.3, max: 0.7 },
    shapes: ['diamond', 'slash'],
    spread: Math.PI * 1.2,
    angleOffset: -Math.PI / 4,
    rotationSpeed: { min: -20, max: 20 }
  },

  shockwave: {
    count: 1,
    colors: ['rgba(255,215,0,0.8)', 'rgba(255,60,60,0.6)', 'rgba(0,255,255,0.5)'],
    size: { min: 5, max: 5 },
    speed: { min: 0, max: 0 },
    gravity: 0,
    life: { min: 0.6, max: 0.6 },
    shapes: ['ring'],
    spread: 0,
    angleOffset: 0,
    expansion: 1200
  },

  slashLines: {
    count: 8,
    colors: ['#F5F0E8', '#D4A820', '#B8960F'],
    size: { min: 60, max: 120 },
    speed: { min: 0, max: 0 },
    gravity: 0,
    life: { min: 0.15, max: 0.25 },
    shapes: ['slash'],
    spread: Math.PI * 0.3,
    angleOffset: -Math.PI / 2,
    rotationSpeed: { min: -5, max: 5 }
  },

  crownBurst: {
    count: 24,
    colors: ['#B8960F', '#F5F0E8', '#D4A820', '#E8DCCA', '#F5F0E8'],
    size: { min: 4, max: 8 },
    speed: { min: 200, max: 500 },
    gravity: 250,
    life: { min: 0.6, max: 1.0 },
    shapes: ['crown', 'star', 'diamond'],
    spread: Math.PI * 2,
    angleOffset: -Math.PI / 2,
    rotationSpeed: { min: -10, max: 10 }
  },

  pieceDisintegration: {
    count: 50,
    colors: ['#ffffff', '#e8e8e8', '#d0d0d0', '#b8b8b8'],
    size: { min: 2, max: 6 },
    speed: { min: 100, max: 400 },
    gravity: 200,
    life: { min: 0.5, max: 1.2 },
    shapes: ['square', 'diamond', 'slash'],
    spread: Math.PI * 2,
    angleOffset: 0,
    rotationSpeed: { min: -15, max: 15 }
  },

  capture: {
    count: 30,
    colors: ['#00dc32', '#80ff80', '#00ff40', '#555555', '#ffffff'],
    size: { min: 2, max: 5 },
    speed: { min: 80, max: 200 },
    gravity: 150,
    life: { min: 0.4, max: 0.8 },
    shapes: ['circle', 'square'],
    spread: Math.PI * 2,
    angleOffset: 0
  },

  // === Premium Cinematic Presets ===

  plasmaBurst: {
    count: 40,
    colors: ['#B8960F', '#ff6b35', '#B84030', '#F5F0E8'],
    size: { min: 2, max: 6 },
    speed: { min: 150, max: 500 },
    gravity: 200,
    life: { min: 0.3, max: 0.7 },
    shapes: ['circle', 'diamond'],
    spread: Math.PI * 2,
    angleOffset: 0,
    glow: true,
    trailLength: 3
  },

  electricBurst: {
    count: 25,
    colors: ['#D4A820', '#8B7355', '#F5F0E8'],
    size: { min: 1, max: 3 },
    speed: { min: 300, max: 800 },
    gravity: 0,
    life: { min: 0.15, max: 0.35 },
    shapes: ['slash', 'diamond'],
    spread: Math.PI * 2,
    angleOffset: 0,
    rotationSpeed: { min: -30, max: 30 },
    glow: true
  },

  energyWave: {
    count: 1,
    colors: ['rgba(255,215,0,0.9)', 'rgba(0,255,255,0.7)', 'rgba(255,64,129,0.5)'],
    size: { min: 5, max: 5 },
    speed: { min: 0, max: 0 },
    gravity: 0,
    life: { min: 0.5, max: 0.5 },
    shapes: ['ring'],
    spread: 0,
    angleOffset: 0,
    expansion: 1500
  },

  impactSparks: {
    count: 50,
    colors: ['#B8960F', '#D4A820', '#F5F0E8', '#ff6b35'],
    size: { min: 1, max: 3 },
    speed: { min: 200, max: 700 },
    gravity: 350,
    life: { min: 0.2, max: 0.6 },
    shapes: ['circle', 'line'],
    spread: Math.PI * 2,
    angleOffset: 0,
    trailLength: 2
  },

  debrisShard: {
    count: 30,
    colors: ['#B8960F', '#ff6b35', '#B84030', '#8B7355', '#E8DCCA'],
    size: { min: 3, max: 7 },
    speed: { min: 100, max: 400 },
    gravity: 280,
    life: { min: 0.4, max: 1.0 },
    shapes: ['diamond', 'square', 'slash'],
    spread: Math.PI * 2,
    angleOffset: 0,
    rotationSpeed: { min: -20, max: 20 },
    glow: true
  },

  risingEmber: {
    count: 20,
    colors: ['#ff6b35', '#ffa500', '#B8960F', '#F5F0E8'],
    size: { min: 1, max: 3 },
    speed: { min: 30, max: 80 },
    gravity: -60,
    life: { min: 1.0, max: 2.5 },
    shapes: ['circle'],
    spread: Math.PI * 1.2,
    angleOffset: -Math.PI / 2,
    glow: true,
    trailLength: 4
  },

  // === ASSASSINATION / CAPTURE CINEMATIC PRESETS ===

  assassination: {
    count: 60,
    colors: ['#ff1a1a', '#ff4444', '#ff6666', '#ffcc00', '#ffffff', '#8b0000'],
    size: { min: 1.5, max: 5 },
    speed: { min: 200, max: 1000 },
    gravity: 250,
    life: { min: 0.3, max: 1.0 },
    shapes: ['slash', 'diamond', 'bloodDrop', 'spark'],
    spread: Math.PI * 1.5,
    angleOffset: -Math.PI / 2,
    rotationSpeed: { min: -25, max: 25 },
    glow: true,
    trailLength: 4
  },

  bloodMist: {
    count: 40,
    colors: ['rgba(139,0,0,0.7)', 'rgba(200,0,0,0.5)', 'rgba(255,50,50,0.4)', 'rgba(100,0,0,0.6)'],
    size: { min: 4, max: 12 },
    speed: { min: 15, max: 60 },
    gravity: -10,
    life: { min: 1.5, max: 3.0 },
    shapes: ['circle', 'smokePuff'],
    spread: Math.PI * 2,
    angleOffset: 0,
    expansion: 30,
    fade: true
  },

  executionFlash: {
    count: 1,
    colors: ['rgba(255,255,255,0.95)', 'rgba(255,200,0,0.8)'],
    size: { min: 10, max: 10 },
    speed: { min: 0, max: 0 },
    gravity: 0,
    life: { min: 0.08, max: 0.08 },
    shapes: ['flashRing'],
    spread: 0,
    angleOffset: 0,
    expansion: 3000
  },

  soulRelease: {
    count: 30,
    colors: ['#F5F0E8', '#E8DCCA', '#D4C4A8', '#B8960F', '#fff8dc'],
    size: { min: 2, max: 6 },
    speed: { min: 20, max: 100 },
    gravity: -80,
    life: { min: 1.0, max: 2.5 },
    shapes: ['spirit', 'diamond', 'star'],
    spread: Math.PI * 1.2,
    angleOffset: -Math.PI / 2,
    rotationSpeed: { min: -10, max: 10 },
    glow: true,
    trailLength: 5
  },

  bladeSlash: {
    count: 15,
    colors: ['#F5F0E8', '#B8960F', '#B84030', '#D4A820'],
    size: { min: 30, max: 60 },
    speed: { min: 0, max: 0 },
    gravity: 0,
    life: { min: 0.1, max: 0.2 },
    shapes: ['slashTrail'],
    spread: Math.PI * 0.2,
    angleOffset: -Math.PI / 2,
    rotationSpeed: { min: -3, max: 3 },
    glow: true
  },

  impactBurst: {
    count: 50,
    colors: ['#B8960F', '#ff6b35', '#F5F0E8', '#B84030', '#ff8800'],
    size: { min: 2, max: 8 },
    speed: { min: 300, max: 1200 },
    gravity: 400,
    life: { min: 0.2, max: 0.6 },
    shapes: ['spark', 'diamond', 'shard'],
    spread: Math.PI * 2,
    angleOffset: 0,
    rotationSpeed: { min: -30, max: 30 },
    glow: true,
    trailLength: 3
  },

  pieceShatter: {
    count: 35,
    colors: ['#ffffff', '#f0f0f0', '#e0e0e0', '#d0d0d0', '#c0c0c0'],
    size: { min: 3, max: 10 },
    speed: { min: 150, max: 500 },
    gravity: 300,
    life: { min: 0.5, max: 1.5 },
    shapes: ['shard', 'square', 'triangle'],
    spread: Math.PI * 2,
    angleOffset: 0,
    rotationSpeed: { min: -20, max: 20 },
    trailLength: 2
  },

  darkEnergy: {
    count: 45,
    colors: ['#4a006e', '#6e00a3', '#9b4dff', '#cc88ff', '#ffffff'],
    size: { min: 2, max: 7 },
    speed: { min: 100, max: 600 },
    gravity: 50,
    life: { min: 0.4, max: 1.2 },
    shapes: ['spirit', 'diamond', 'slash'],
    spread: Math.PI * 2,
    angleOffset: 0,
    rotationSpeed: { min: -15, max: 15 },
    glow: true,
    trailLength: 4
  },

  holyLight: {
    count: 45,
    colors: ['#fff8dc', '#B8960F', '#E8DCCA', '#F5F0E8', '#ffe4b5'],
    size: { min: 2, max: 7 },
    speed: { min: 100, max: 600 },
    gravity: -30,
    life: { min: 0.4, max: 1.2 },
    shapes: ['spirit', 'star', 'diamond'],
    spread: Math.PI * 1.5,
    angleOffset: -Math.PI / 2,
    rotationSpeed: { min: -10, max: 10 },
    glow: true,
    trailLength: 5
  },

  staggerRings: {
    count: 3,
    colors: ['rgba(255,215,0,0.9)', 'rgba(255,100,100,0.7)', 'rgba(0,255,255,0.5)'],
    size: { min: 5, max: 5 },
    speed: { min: 0, max: 0 },
    gravity: 0,
    life: { min: 0.4, max: 0.6 },
    shapes: ['ring'],
    spread: 0,
    angleOffset: 0,
    expansion: { rate: { min: 800, max: 1600 } },
    delay: { min: 0, max: 0.08 }
  }
};

class Particle {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.radius = config.radius;
    this.color = config.color;
    this.shape = config.shape;
    this.life = 1;
    this.maxLife = config.maxLife;
    this.age = 0;
    this.gravity = config.gravity || 0;
    this.rotation = config.rotation || 0;
    this.rotationSpeed = config.rotationSpeed || 0;
    this.expansion = config.expansion || 0;
    this.maxRadius = config.maxRadius || null;
    this.glow = config.glow || false;
    this.alpha = config.alpha || 1;
    this.trail = [];
    this.trailLength = config.trailLength || 0;
    this.customDraw = config.customDraw || null;
    this.delay = config.delay || 0;
    this.active = this.delay <= 0;
  }

  update(dt, currentTime) {
    if (!this.active) {
      if (this.delay > 0) {
        this.delay -= dt;
        if (this.delay <= 0) this.active = true;
      }
      return true;
    }
    
    this.age += dt;
    this.life = 1 - (this.age / this.maxLife);
    
    if (this.life <= 0) return false;
    
    if (this.trailLength > 0) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.trailLength) this.trail.shift();
    }
    
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;
    
    if (this.expansion) {
      const exp = typeof this.expansion === 'object' ? this.expansion : { value: this.expansion };
      const rate = exp.value ?? exp.min ?? 0;
      this.radius += rate * dt;
      if (this.maxRadius && this.radius > this.maxRadius) {
        this.radius = this.maxRadius;
      }
    }
    
    return true;
  }

  draw(ctx) {
    if (!this.active || this.life <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha * this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw trail with fade
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length
        const prev = this.trail[i - 1]
        const curr = this.trail[i]
        ctx.beginPath()
        ctx.moveTo(prev.x - this.x, prev.y - this.y)
        ctx.lineTo(curr.x - this.x, curr.y - this.y)
        ctx.strokeStyle = this.color.replace(/[\d.]+\)$/, `${this.alpha * this.life * t * 0.4})`)
        ctx.lineWidth = Math.max(0.5, this.radius * 0.3 * t)
        ctx.lineCap = 'round'
        ctx.stroke()
      }
    }

    // Glow first (behind)
    if (this.glow) {
      ctx.save()
      ctx.shadowColor = this.color
      ctx.shadowBlur = this.radius * 4
      ctx.globalAlpha = this.alpha * this.life * 0.6
      this.drawShape(ctx)
      ctx.restore()
    }

    // Main shape
    if (this.customDraw) {
      this.customDraw(ctx, this)
    } else {
      this.drawShape(ctx)
    }

    ctx.restore()
  }

  drawShape(ctx) {
    const r = this.radius;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    switch (this.shape) {
      case 'circle':
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        break;
      case 'square':
        ctx.rect(-r, -r, r * 2, r * 2);
        break;
      case 'diamond':
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        break;
      case 'star':
        this.drawStar(ctx, 0, 0, r, r * 0.5, 5);
        break;
      case 'slash':
        ctx.moveTo(-r * 1.5, -r * 1.5);
        ctx.lineTo(r * 1.5, r * 1.5);
        ctx.lineWidth = Math.max(1, r * 0.3);
        ctx.strokeStyle = this.color;
        ctx.stroke();
        return;
      case 'crown':
        this.drawCrown(ctx, 0, 0, r);
        break;
      case 'ring':
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1, r * 0.15);
        ctx.strokeStyle = this.color;
        ctx.stroke();
        return;
      case 'bloodDrop':
        ctx.moveTo(0, -r * 0.5);
        ctx.bezierCurveTo(r * 0.7, -r * 0.3, r * 0.7, r * 0.5, 0, r * 1.5);
        ctx.bezierCurveTo(-r * 0.7, r * 0.5, -r * 0.7, -r * 0.3, 0, -r * 0.5);
        break;
      case 'smokePuff':
        this.drawSmokePuff(ctx, 0, 0, r);
        break;
      case 'flashRing':
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(2, r * 0.08);
        ctx.strokeStyle = this.color;
        ctx.stroke();
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = r * 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.restore();
        return;
      case 'spirit':
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.6, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.6, 0);
        ctx.closePath();
        break;
      case 'slashTrail':
        ctx.moveTo(-r * 2, -r * 0.3);
        ctx.lineTo(r * 2, r * 0.3);
        ctx.lineTo(r * 1.5, r * 0.8);
        ctx.lineTo(-r * 2.5, -r * 0.8);
        ctx.closePath();
        break;
      case 'spark':
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.3, -r * 0.3);
        ctx.lineTo(r, 0);
        ctx.lineTo(r * 0.3, r * 0.3);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.3, r * 0.3);
        ctx.lineTo(-r, 0);
        ctx.lineTo(-r * 0.3, -r * 0.3);
        ctx.closePath();
        break;
      case 'shard':
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.8, r * 0.2);
        ctx.lineTo(r * 0.3, r);
        ctx.lineTo(-r * 0.5, r * 0.5);
        ctx.closePath();
        break;
      case 'triangle':
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.866, r * 0.5);
        ctx.lineTo(-r * 0.866, r * 0.5);
        ctx.closePath();
        break;
      default:
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    
    ctx.fill();
  }

  drawSmokePuff(ctx, cx, cy, r) {
    const offsets = [
      { x: 0, y: 0, s: 1 },
      { x: r * 0.4, y: -r * 0.2, s: 0.7 },
      { x: -r * 0.3, y: -r * 0.3, s: 0.6 },
      { x: r * 0.2, y: r * 0.3, s: 0.5 },
      { x: -r * 0.5, y: r * 0.1, s: 0.4 }
    ];
    for (const o of offsets) {
      ctx.beginPath();
      ctx.arc(cx + o.x, cy + o.y, r * o.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawStar(ctx, cx, cy, outerR, innerR, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  drawCrown(ctx, cx, cy, size) {
    const spikes = 5;
    const outerR = size;
    const innerR = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

export class ParticleEngine {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.particles = [];
    this.emitters = [];
    this.layers = new Map();
    this.defaultLayer = 'default';
    this.layerOrder = ['background', 'default', 'foreground', 'ui'];
    this.time = 0;
    this.paused = false;
    this.maxParticles = 5000;
    this.objectPool = [];
    this.poolSize = 1000;
  }

  createLayer(name, options = {}) {
    this.layers.set(name, {
      particles: [],
      emitters: [],
      blendMode: options.blendMode || 'source-over',
      alpha: options.alpha || 1,
      visible: true,
      ...options
    });
    if (!this.layerOrder.includes(name)) {
      this.layerOrder.push(name);
    }
  }

  setLayerOrder(order) {
    this.layerOrder = order;
  }

  emit(presetName, x, y, overrides = {}, layer = 'default') {
    const preset = ParticlePresets[presetName];
    if (!preset) {
      console.warn(`Particle preset "${presetName}" not found`);
      return;
    }

    const config = { ...preset, ...overrides };
    const count = Math.floor(MathUtils.random(config.count * 0.8, config.count * 1.2));
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      
      const spread = config.spread || Math.PI * 2;
      const baseAngle = config.angleOffset || 0;
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = MathUtils.random(config.speed.min, config.speed.max);
      const size = MathUtils.random(config.size.min, config.size.max);
      const life = MathUtils.random(config.life.min, config.life.max);
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      const shape = config.shapes[Math.floor(Math.random() * config.shapes.length)];
      const rotationSpeed = config.rotationSpeed 
        ? MathUtils.random(config.rotationSpeed.min, config.rotationSpeed.max)
        : MathUtils.random(-5, 5);
      
      const expansion = typeof config.expansion === 'object' 
        ? config.expansion.rate 
        : (config.expansion || 0);
      const maxRadius = typeof config.expansion === 'object' 
        ? config.expansion.max 
        : null;
      
      const particle = this.getPooledParticle({
        x: x + (config.offsetX || 0),
        y: y + (config.offsetY || 0),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (config.initialVy || 0),
        radius: size,
        color,
        shape,
        maxLife: life,
        gravity: config.gravity || 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed,
        expansion,
        maxRadius,
        glow: config.glow || false,
        trailLength: config.trailLength || 0,
        alpha: config.alpha || 1,
        delay: config.delay ? MathUtils.random(config.delay.min, config.delay.max) : 0
      });
      
      this.addToLayer(particle, layer);
    }
  }

  emitCustom(particles, layer = 'default') {
    for (const p of particles) {
      if (this.particles.length >= this.maxParticles) break;
      const particle = this.getPooledParticle(p);
      this.addToLayer(particle, layer);
    }
  }

  getPooledParticle(config) {
    if (this.objectPool.length > 0) {
      const p = this.objectPool.pop();
      Object.assign(p, config);
      p.delay = config.delay || 0;
      p.active = p.delay <= 0;
      return p;
    }
    return new Particle(config);
  }

  returnToPool(particle) {
    if (this.objectPool.length < this.poolSize) {
      this.objectPool.push(particle);
    }
  }

  addToLayer(particle, layerName) {
    const layer = this.layers.get(layerName) || this.layers.get(this.defaultLayer);
    if (layer) {
      layer.particles.push(particle);
      this.particles.push(particle);
    }
  }

  createEmitter(config) {
    const emitter = {
      ...config,
      active: true,
      timer: 0,
      particlesPerSecond: config.rate || 60,
      burstCount: config.burst || 0,
      burstInterval: config.burstInterval || 0,
      lastBurst: 0,
      duration: config.duration || Infinity,
      startTime: this.time,
      layer: config.layer || 'default',
      preset: config.preset || 'sparks',
      overrides: config.overrides || {},
      position: { x: config.x || 0, y: config.y || 0 },
      followTarget: config.follow || null
    };
    
    const layer = this.layers.get(this.defaultLayer);
    if (layer) layer.emitters.push(emitter);
    this.emitters.push(emitter);
    return emitter;
  }

  destroyEmitter(emitter) {
    emitter.active = false;
    const idx = this.emitters.indexOf(emitter);
    if (idx !== -1) this.emitters.splice(idx, 1);
    for (const layer of this.layers.values()) {
      const eIdx = layer.emitters.indexOf(emitter);
      if (eIdx !== -1) layer.emitters.splice(eIdx, 1);
    }
  }

  update(dt) {
    if (this.paused) return;
    this.time += dt;

    for (const emitter of this.emitters) {
      if (!emitter.active) continue;
      if (this.time - emitter.startTime > emitter.duration) {
        this.destroyEmitter(emitter);
        continue;
      }

      if (emitter.followTarget) {
        emitter.position.x = emitter.followTarget.x;
        emitter.position.y = emitter.followTarget.y;
      }

      if (emitter.burstCount > 0 && emitter.burstInterval > 0) {
        if (this.time - emitter.lastBurst >= emitter.burstInterval) {
          for (let i = 0; i < emitter.burstCount; i++) {
            this.emit(emitter.preset, emitter.position.x, emitter.position.y, emitter.overrides, emitter.layer);
          }
          emitter.lastBurst = this.time;
        }
      } else {
        const interval = 1 / emitter.particlesPerSecond;
        emitter.timer += dt;
        while (emitter.timer >= interval) {
          this.emit(emitter.preset, emitter.position.x, emitter.position.y, emitter.overrides, emitter.layer);
          emitter.timer -= interval;
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.update(dt, this.time)) {
        this.returnToPool(p);
        this.particles.splice(i, 1);
        for (const layer of this.layers.values()) {
          const idx = layer.particles.indexOf(p);
          if (idx !== -1) layer.particles.splice(idx, 1);
        }
      }
    }
  }

  render() {
    for (const layerName of this.layerOrder) {
      const layer = this.layers.get(layerName);
      if (!layer || !layer.visible) continue;
      
      this.ctx.save();
      this.ctx.globalAlpha = layer.alpha;
      this.ctx.globalCompositeOperation = layer.blendMode;
      
      // Batch particles by (color, shape, glow) to minimize state changes
      const batches = new Map();
      for (const p of layer.particles) {
        if (!p.active && p.delay > 0) continue;
        if (p.life <= 0) continue;
        const key = `${p.color}|${p.shape}|${p.glow}|${p.alpha}`;
        if (!batches.has(key)) batches.set(key, []);
        batches.get(key).push(p);
      }
      
      for (const [, batch] of batches) {
        if (batch.length === 1) {
          batch[0].draw(this.ctx);
        } else {
          this.drawBatch(batch);
        }
      }
      
      this.ctx.restore();
    }
  }

  drawBatch(batch) {
    const p = batch[0];
    const ctx = this.ctx;
    
    // Set shared state once
    ctx.globalAlpha = p.alpha;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    
    // Draw all trails first
    for (const p of batch) {
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.lineWidth = Math.max(0.5, p.radius * 0.3);
        ctx.lineCap = 'round';
        ctx.strokeStyle = p.color.replace(/[\d.]+\)$/, `${p.alpha * p.life * 0.4})`);
        ctx.stroke();
      }
    }
    
    // Draw all shapes
    for (const p of batch) {
      if (p.life <= 0) continue;
      
      ctx.save();
      ctx.globalAlpha = p.alpha * p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      
      // Glow
      if (p.glow) {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.radius * 4;
        ctx.globalAlpha = p.alpha * p.life * 0.6;
        p.drawShape(ctx);
        ctx.restore();
      }
      
      p.drawShape(ctx);
      ctx.restore();
    }
  }

  clear() {
    for (const p of this.particles) {
      this.returnToPool(p);
    }
    this.particles = [];
    for (const layer of this.layers.values()) {
      layer.particles = [];
      layer.emitters = [];
    }
    this.emitters = [];
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  setPaused(p) { this.paused = p; }

  getParticleCount() { return this.particles.length; }
  getEmitterCount() { return this.emitters.length; }
}