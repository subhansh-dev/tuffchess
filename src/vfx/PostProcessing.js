/**
 * PostProcessing — Performance-optimized post-processing effects.
 * Uses Canvas composite/drawImage/filter instead of slow per-pixel ImageData.
 */
export class PostProcessing {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.offscreen = document.createElement('canvas')
    this.offscreen.width = width
    this.offscreen.height = height
    this.offCtx = this.offscreen.getContext('2d')
    this.effectCanvas = document.createElement('canvas')
    this.effectCanvas.width = width
    this.effectCanvas.height = height
    this.effectCtx = this.effectCanvas.getContext('2d')
    this.bloom = { intensity: 0, radius: 8, threshold: 0.6 }
    this.chromatic = { intensity: 0, angle: 0 }
    this.radialBlur = { intensity: 0, centerX: 0, centerY: 0 }
    this.lensDistortion = { intensity: 0 }
    this.vignette = { intensity: 0 }
    this.colorGrade = { brightness: 0, contrast: 0, saturation: 0 }
    this.screenFlash = { color: [255, 255, 255], intensity: 0 }
    this.directionalBlur = { intensity: 0, angle: 0 }
    this.glitch = { intensity: 0, blockSize: 20, sliceCount: 5 }
    this._forceRender = false
    this._dirty = false
    this._lastActiveEffects = ''
  }
  _markDirty() { this._dirty = true }
  setBloom(i, r=8, t=0.6) { this.bloom={intensity:i,radius:r,threshold:t}; this._markDirty() }
  setChromatic(i, a=0) { this.chromatic={intensity:i,angle:a}; this._markDirty() }
  setRadialBlur(i, cx, cy) { this.radialBlur={intensity:i,centerX:cx,centerY:cy}; this._markDirty() }
  setLensDistortion(i) { this.lensDistortion={intensity:i}; this._markDirty() }
  setVignette(i) { this.vignette={intensity:i}; this._markDirty() }
  setColorGrade(b=0,c=0,s=0) { this.colorGrade={brightness:b,contrast:c,saturation:s}; this._markDirty() }
  setScreenFlash(color, i) { this.screenFlash={color,intensity:i}; this._markDirty() }
  setDirectionalBlur(i, a) { this.directionalBlur={intensity:i,angle:a}; this._markDirty() }
  setGlitch(i, bs=20, sc=5) { this.glitch={intensity:i,blockSize:bs,sliceCount:sc}; this._markDirty() }

  resize(w, h) {
    this.width=w; this.height=h
    this.offscreen.width=w; this.offscreen.height=h
    this.effectCanvas.width=w; this.effectCanvas.height=h
  }

  render(ctx) {
    if (this._destroyed || !this.offscreen) return
    const sig = this._getSig()
    if (!sig && !this._dirty && !this._forceRender) return
    if (sig === this._lastActiveEffects && !this._dirty && !this._forceRender) return
    this._lastActiveEffects = sig
    this._dirty = false

    // Copy the main canvas content at its native resolution (DPR-adjusted)
    // We work entirely in device pixels, bypassing the DPR transform
    const dpr = window.devicePixelRatio || 1
    const cssW = ctx.canvas.width / dpr
    const cssH = ctx.canvas.height / dpr

    this.offCtx.clearRect(0,0,this.width,this.height)
    // ctx.canvas is at DPR resolution, draw at 1:1 scale (no DPR transform)
    this.offCtx.drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, this.width, this.height)

    if (this.bloom.intensity>0.01) this.applyBloom()
    if (this.chromatic.intensity>0.01) this.applyChromatic()
    if (this.radialBlur.intensity>0.01) this.applyRadialBlur()
    if (this.directionalBlur.intensity>0.01) this.applyDirectionalBlur()
    if (this.lensDistortion.intensity>0.01) this.applyLensDistortion()
    if (this.colorGrade.brightness!==0||this.colorGrade.contrast!==0||this.colorGrade.saturation!==0) this.applyColorGradeFast()
    if (this.vignette.intensity>0.01) this.applyVignette()
    if (this.screenFlash.intensity>0.01) this.applyScreenFlash()
    if (this.glitch.intensity>0.01) this.applyGlitch()

    // Draw the processed result back to the main canvas, bypassing DPR transform
    // Save current transform, reset to identity, draw at device pixel coordinates, restore
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset to identity (device pixels)
    ctx.globalAlpha = 1
    ctx.drawImage(this.offscreen, 0, 0, this.width, this.height, 0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.restore()
  }

  _getSig() {
    const p=[]
    if(this.bloom.intensity>0.01) p.push(`b${this.bloom.intensity.toFixed(3)}`)
    if(this.chromatic.intensity>0.01) p.push(`c${this.chromatic.intensity.toFixed(3)}`)
    if(this.radialBlur.intensity>0.01) p.push(`r${this.radialBlur.intensity.toFixed(3)}`)
    if(this.lensDistortion.intensity>0.01) p.push(`l${this.lensDistortion.intensity.toFixed(3)}`)
    if(this.vignette.intensity>0.01) p.push(`v${this.vignette.intensity.toFixed(3)}`)
    if(this.screenFlash.intensity>0.01) p.push(`f${this.screenFlash.intensity.toFixed(3)}`)
    if(this.directionalBlur.intensity>0.01) p.push(`d${this.directionalBlur.intensity.toFixed(3)}`)
    if(this.glitch.intensity>0.01) p.push(`g${this.glitch.intensity.toFixed(3)}`)
    if(this.colorGrade.brightness!==0||this.colorGrade.contrast!==0||this.colorGrade.saturation!==0) p.push(`cg${this.colorGrade.brightness.toFixed(3)}|${this.colorGrade.contrast.toFixed(3)}|${this.colorGrade.saturation.toFixed(3)}`)
    return p.join(',')
  }

  applyBloom() {
    const {intensity}=this.bloom
    const ctx=this.effectCtx, w=this.width, h=this.height
    ctx.clearRect(0,0,w,h)
    ctx.save()
    ctx.filter=`brightness(${1+intensity*3}) contrast(${1+intensity})`
    ctx.globalAlpha=intensity*0.4
    ctx.drawImage(this.offscreen,0,0)
    ctx.filter='none'
    ctx.restore()
    // Blur using scaling trick
    for(let i=0;i<3;i++){
      const s=0.5+i*0.1
      ctx.save(); ctx.globalAlpha=intensity*0.15
      ctx.drawImage(this.effectCanvas,w*(1-s)/2,h*(1-s)/2,w*s,h*s,0,0,w,h)
      ctx.restore()
    }
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='screen'
    this.offCtx.globalAlpha=intensity*0.5
    this.offCtx.drawImage(this.effectCanvas,0,0)
    this.offCtx.restore()
  }

  applyChromatic() {
    const {intensity}=this.chromatic
    const shift=Math.round(intensity*6)
    if(shift<1) return
    this.effectCtx.clearRect(0,0,this.width,this.height)
    this.effectCtx.drawImage(this.offscreen,0,0)
    // Red shift
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='screen'
    this.offCtx.globalAlpha=intensity*0.6
    this.offCtx.filter='sepia(1) saturate(3) hue-rotate(-30deg)'
    this.offCtx.drawImage(this.effectCanvas,shift,0)
    this.offCtx.filter='none'
    this.offCtx.restore()
    // Cyan shift
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='screen'
    this.offCtx.globalAlpha=intensity*0.4
    this.offCtx.filter='sepia(0.3) saturate(2) hue-rotate(160deg)'
    this.offCtx.drawImage(this.effectCanvas,-shift,0)
    this.offCtx.filter='none'
    this.offCtx.restore()
  }

  applyRadialBlur() {
    const {intensity,centerX,centerY}=this.radialBlur
    const ctx=this.effectCtx
    ctx.clearRect(0,0,this.width,this.height)
    for(let i=0;i<4;i++){
      const t=i/4, scale=1+t*intensity*0.03, alpha=(1-t)*0.25
      ctx.save(); ctx.globalAlpha=alpha
      ctx.translate(centerX,centerY); ctx.scale(scale,scale); ctx.translate(-centerX,-centerY)
      ctx.drawImage(this.offscreen,0,0)
      ctx.restore()
    }
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='screen'
    this.offCtx.globalAlpha=intensity*0.4
    this.offCtx.drawImage(this.effectCanvas,0,0)
    this.offCtx.restore()
  }

  applyDirectionalBlur() {
    const {intensity,angle}=this.directionalBlur
    if(intensity<0.01) return
    const ctx=this.effectCtx, maxOff=intensity*12
    const cos=Math.cos(angle), sin=Math.sin(angle)
    ctx.clearRect(0,0,this.width,this.height)
    for(let i=0;i<5;i++){
      const t=(i/5)-0.5, ox=cos*t*maxOff, oy=sin*t*maxOff, alpha=(1-Math.abs(t)*2)*0.3
      ctx.save(); ctx.globalAlpha=alpha
      ctx.drawImage(this.offscreen,ox,oy)
      ctx.restore()
    }
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='screen'
    this.offCtx.globalAlpha=intensity*0.5
    this.offCtx.drawImage(this.effectCanvas,0,0)
    this.offCtx.restore()
  }

  applyLensDistortion() {
    const {intensity}=this.lensDistortion
    const ctx=this.effectCtx
    ctx.clearRect(0,0,this.width,this.height)
    for(let i=0;i<3;i++){
      const t=i/3, scale=1+t*intensity*0.04, alpha=(1-t)*0.15
      ctx.save(); ctx.globalAlpha=alpha
      ctx.translate(this.width/2,this.height/2); ctx.scale(scale,scale); ctx.translate(-this.width/2,-this.height/2)
      ctx.drawImage(this.offscreen,0,0)
      ctx.restore()
    }
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='screen'
    this.offCtx.globalAlpha=intensity*0.35
    this.offCtx.drawImage(this.effectCanvas,0,0)
    this.offCtx.restore()
  }

  // FIX: Fast color grading using CSS filter (orders of magnitude faster than per-pixel)
  applyColorGradeFast() {
    const {brightness,contrast,saturation}=this.colorGrade
    if(brightness===0&&contrast===0&&saturation===0) return
    this.effectCtx.clearRect(0,0,this.width,this.height)
    this.effectCtx.save()
    this.effectCtx.filter=`brightness(${1+brightness}) contrast(${1+contrast}) saturate(${1+saturation})`
    this.effectCtx.drawImage(this.offscreen,0,0)
    this.effectCtx.filter='none'
    this.effectCtx.restore()
    this.offCtx.clearRect(0,0,this.width,this.height)
    this.offCtx.drawImage(this.effectCanvas,0,0)
  }

  applyVignette() {
    const ctx=this.effectCtx, w=this.width, h=this.height
    ctx.clearRect(0,0,w,h)
    const g=ctx.createRadialGradient(w/2,h/2,w*0.2,w/2,h/2,w*0.7)
    g.addColorStop(0,'rgba(0,0,0,0)')
    g.addColorStop(1,`rgba(30,20,10,${this.vignette.intensity})`)
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h)
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='multiply'
    this.offCtx.globalAlpha=1
    this.offCtx.drawImage(this.effectCanvas,0,0)
    this.offCtx.restore()
  }

  applyScreenFlash() {
    const {color,intensity}=this.screenFlash
    this.offCtx.save()
    this.offCtx.globalCompositeOperation='screen'
    this.offCtx.globalAlpha=intensity
    this.offCtx.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`
    this.offCtx.fillRect(0,0,this.width,this.height)
    this.offCtx.restore()
  }

  applyGlitch() {
    const {intensity,blockSize,sliceCount}=this.glitch
    if(intensity<0.01) return
    const ctx=this.effectCtx, w=this.width, h=this.height
    ctx.clearRect(0,0,w,h)
    ctx.drawImage(this.offscreen,0,0)
    const sliceH=h/sliceCount
    for(let i=0;i<sliceCount;i++){
      if(Math.random()>intensity*1.5) continue
      const y=i*sliceH, shift=(Math.random()-0.5)*blockSize*intensity*3
      ctx.save(); ctx.beginPath(); ctx.rect(0,y,w,sliceH); ctx.clip()
      ctx.drawImage(this.offscreen,shift,0); ctx.restore()
    }
    const bc=Math.floor(intensity*6)
    for(let i=0;i<bc;i++){
      const bx=Math.random()*w, by=Math.random()*h
      const bw=blockSize+Math.random()*blockSize*2, bh=blockSize*0.5+Math.random()*blockSize
      ctx.save(); ctx.globalAlpha=intensity*0.25; ctx.globalCompositeOperation='screen'
      const colors=['rgba(184,150,15,0.4)','rgba(139,115,85,0.3)','rgba(245,240,232,0.4)']
      ctx.fillStyle=colors[Math.floor(Math.random()*colors.length)]
      ctx.fillRect(bx,by,bw,bh); ctx.restore()
    }
    this.offCtx.save(); this.offCtx.globalAlpha=1
    this.offCtx.drawImage(this.effectCanvas,0,0); this.offCtx.restore()
  }

  reset() {
    this.bloom={intensity:0,radius:8,threshold:0.6}
    this.chromatic={intensity:0,angle:0}
    this.radialBlur={intensity:0,centerX:0,centerY:0}
    this.lensDistortion={intensity:0}
    this.vignette={intensity:0}
    this.colorGrade={brightness:0,contrast:0,saturation:0}
    this.screenFlash={color:[255,255,255],intensity:0}
    this.directionalBlur={intensity:0,angle:0}
    this.glitch={intensity:0,blockSize:20,sliceCount:5}
  }

  destroy() {
    this.offscreen=null; this.offCtx=null
    this.effectCanvas=null; this.effectCtx=null
    this._destroyed=true
  }
}
