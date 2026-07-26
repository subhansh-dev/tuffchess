import { Piece, Color } from '../core/ChessTypes.js'
import { GhostPiece } from './GhostPiece.js'
import { Camera } from './Camera.js'
import { Easing } from './Easing.js'
import {
  resolveCaptureTier,
  CaptureTier,
  AnimeSlashEffect,
  AnimePawnSlashEffect,
  AnimeKnightStrikeEffect,
  AnimeClashEffect,
  AnimeRoyalDecapEffect,
  AnimeQueenMultiSlashEffect,
  AnimeRookChargeEffect
} from './CaptureAnimations.js'

/**
 * AnimationManager — 2026 Chess Edit Style
 * Every capture is a viral TikTok chess clip moment:
 * - Impact Frame (1-2 frame black/white flash)
 * - Zoom Punch (snap zoom in, then snap back)
 * - Screen-Level Slash Mark
 * - Manga Speed Lines
 * - Hit Pause (2-3 frame freeze at impact)
 * - Screen Shake (directional, bounded)
 * - Victim Shatter/Dissolve
 * - Chromatic Aberration burst
 * - Dark Vignette framing
 * - Particle Explosion
 */
export class AnimationManager {
  constructor(canvasRenderer, pieceRenderer, engine, audioManager, timeController, eventBus) {
    this.canvasRenderer = canvasRenderer
    this.pieceRenderer = pieceRenderer
    this.engine = engine
    this.audioManager = audioManager
    this.timeController = timeController
    this.eventBus = eventBus
    this.boardRenderer = null // Set via setBoardRenderer()
    this.camera = new Camera(canvasRenderer)
    this.camera.isActive = false

    this.ghostPieces = []
    this.trails = []
    this.captureEffects = null
    this.movePromise = null
    this.capturePromise = null
    this.captureEffect = null
    this.captureTier = null
    this._speedLines = null
    this._screenSlash = null
    this._activeAnimeCapture = false
    this._animatingToSquare = -1
    // Screen-level VFX overlays (rendered AFTER camera restore, in screen space)
    this._screenOverlays = [] // { type, alpha, ... }
  }

  getCamera() { return this.camera }
  getGhostPieces() { return this.ghostPieces }
  getTrails() { return this.trails }
  getSpeedLines() { return this._speedLines }
  getScreenSlash() { return this._screenSlash }
  getScreenOverlays() { return this._screenOverlays }
  setBoardRenderer(br) { this.boardRenderer = br }

  getCaptureEffects() {
    if (!this.captureEffect) return null
    return {
      tier: this.captureTier,
      effect: this.captureEffect,
      progress: this.captureEffect.finished ? 1 : 0
    }
  }

  setTimeScale(scale) {
    if (this.timeController) this.timeController.setGlobalTimeScale(scale)
  }

  squareToPixel(sq, orientation) {
    const { squareSize, boardOffsetX, boardOffsetY } = this.canvasRenderer
    const file = sq % 8
    const rank = Math.floor(sq / 8)
    const drawRank = orientation === 1 ? 7 - rank : rank
    const drawFile = orientation === 1 ? file : 7 - file
    const pieceSize = squareSize * 0.92
    const offset = (squareSize - pieceSize) / 2
    return {
      x: boardOffsetX + drawFile * squareSize + offset,
      y: boardOffsetY + drawRank * squareSize + offset,
      size: pieceSize
    }
  }

  // === NORMAL MOVE ANIMATION — smooth piece glide ===
  animateMove({ from, to, piece, color, orientation, duration }) {
    return new Promise((resolve) => {
      const fromP = this.squareToPixel(from, orientation || 1)
      const toP = this.squareToPixel(to, orientation || 1)
      const dur = (duration || 0.28) * 1000

      this.ghostPieces = []
      this.pieceRenderer.ghostPiece = null
      this.pieceRenderer.victimGhostPiece = null
      this._animatingToSquare = to

      const gp = new GhostPiece(this.pieceRenderer, piece, color, fromP.x, fromP.y, fromP.size)
      gp.targetX = toP.x
      gp.targetY = toP.y
      gp.startTime = performance.now()
      gp.duration = dur
      gp.isMoving = true

      const dx = toP.x - fromP.x
      const dy = toP.y - fromP.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      gp.travelAngle = Math.atan2(dy, dx)

      this.ghostPieces = [gp]
      this.pieceRenderer.ghostPiece = gp

      const animate = (now) => {
        const elapsed = now - gp.startTime
        const t = Math.min(elapsed / gp.duration, 1)
        // SmoothStep ease
        const smooth = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

        gp.x = fromP.x + (toP.x - fromP.x) * smooth
        gp.y = fromP.y + (toP.y - fromP.y) * smooth

        // Parabolic arc
        const arcHeight = Math.min(fromP.size * 1.2, dist * 0.12 + fromP.size * 0.06)
        gp.height = arcHeight * Math.sin(t * Math.PI)
        gp.y -= arcHeight * Math.sin(t * Math.PI)

        // Subtle lean
        gp.rotation = Math.sin(t * Math.PI * 2) * 0.02 * Math.cos(gp.travelAngle)

        // Squash-and-stretch
        const velocity = smooth * (1 - smooth) * 4
        gp.scaleX = 1 - velocity * 0.025
        gp.scaleY = 1 + velocity * 0.04

        // Shadow depth
        gp.shadowAlpha = 0.12 + Math.sin(t * Math.PI) * 0.08

        // Dust trail
        if (Math.random() < 0.06 && t < 0.92) {
          const life = 0.15 + Math.random() * 0.2
          gp.dustParticles.push({
            x: gp.x + gp.size / 2 + (Math.random()-0.5) * gp.size * 0.3,
            y: gp.y + gp.size * 0.8,
            size: 0.5 + Math.random() * 1.5,
            color: 'rgba(200,180,140,0.2)',
            vx: (Math.random()-0.5) * 6, vy: -Math.random() * 4 - 1,
            life, maxLife: life, alpha: 0.2
          })
        }
        if (gp.updateDust) gp.updateDust(1/60)

        // Motion trail for longer moves
        if (dist > gp.size * 1.5 && t > 0.03 && t < 0.95) {
          gp.trail.push({ x: gp.x + gp.size/2, y: gp.y + gp.size/2 })
          if (gp.trail.length > 5) gp.trail.shift()
        }

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          // Quick settle
          gp.x = toP.x; gp.y = toP.y
          gp.height = 0; gp.rotation = 0
          gp.scaleX = 1; gp.scaleY = 1
          const settleStart = performance.now()
          const settleAnim = (settleNow) => {
            const st = Math.min((settleNow - settleStart) / 35, 1)
            gp.alpha = 1 - st
            if (st < 1) requestAnimationFrame(settleAnim)
            else {
              gp.alpha = 0; gp.isMoving = false
              this.ghostPieces = []
              this.pieceRenderer.ghostPiece = null
              this._animatingToSquare = -1
              resolve()
            }
          }
          requestAnimationFrame(settleAnim)
        }
      }
      requestAnimationFrame(animate)
    })
  }

  // === CAPTURE ANIMATION — 2026 Chess Edit Style ===
  // The full cinematic pipeline:
  //   0-20%: Piece approaches (smooth ease-in with dramatic anticipation)
  //   20%: IMPACT — Hit pause (3 frames), impact flash, zoom punch, screen slash
  //   20-35%: Victim destruction (shatter/dissolve), speed lines burst, chromatic peak
  //   35-60%: Recovery — camera settles, vignette fades, effects dissipate
  //   60-100%: Ghost fade, particle settle, camera returns to 1.0
  animateCapture({ from, to, piece, color, orientation, victimPiece: vp, victimColor: vc }) {
    return new Promise((resolve) => {
      const fromP = this.squareToPixel(from, orientation || 1)
      const toP = this.squareToPixel(to, orientation || 1)
      const { squareSize, boardOffsetX, boardOffsetY } = this.canvasRenderer

      const victimPiece = vp || 0
      const victimColor = vc || 0

      this.ghostPieces = []
      this.pieceRenderer.ghostPiece = null
      this.pieceRenderer.victimGhostPiece = null
      this._animatingToSquare = to
      this._screenSlash = null
      this._screenOverlays = []

      const gp = new GhostPiece(this.pieceRenderer, piece, color, fromP.x, fromP.y, fromP.size)
      gp.targetX = toP.x
      gp.targetY = toP.y
      gp.isCapture = true
      this.ghostPieces = [gp]
      this.pieceRenderer.ghostPiece = gp

      if (victimPiece !== 0) {
        const vgp = new GhostPiece(this.pieceRenderer, victimPiece, victimColor, toP.x, toP.y, toP.size)
        vgp.alpha = 1
        vgp.isCapture = true
        this.pieceRenderer.victimGhostPiece = vgp
      }

      const isKnightFork = piece === Piece.KNIGHT ? this.detectKnightFork(to, color) : false
      const tier = resolveCaptureTier(piece, victimPiece, false, isKnightFork)
      this.captureTier = tier
      this._activeAnimeCapture = true

      const file = to % 8
      const rank = Math.floor(to / 8)
      const drawRank = orientation === 1 ? 7 - rank : rank
      const cx = boardOffsetX + (file + 0.5) * squareSize
      const cy = boardOffsetY + (drawRank + 0.5) * squareSize

      // Travel direction for slash angle and directional shake
      const dx = toP.x - fromP.x
      const dy = toP.y - fromP.y
      const travelAngle = Math.atan2(dy, dx)

      // === CREATE TIER-SPECIFIC EFFECT ===
      switch (tier) {
        case CaptureTier.KNIGHT_DARKNESS:
          this.captureEffect = new AnimeKnightStrikeEffect(
            this.canvasRenderer, cx, cy, fromP.x, fromP.y, toP.x, toP.y, fromP.size, color, victimColor
          )
          break
        case CaptureTier.QUEEN_SLASH:
          this.captureEffect = new AnimeQueenMultiSlashEffect(
            this.canvasRenderer, cx, cy, fromP.size, victimColor
          )
          break
        case CaptureTier.ROOK_PATH:
          this.captureEffect = new AnimeRookChargeEffect(
            this.canvasRenderer, cx, cy, fromP.x, fromP.y, toP.x, toP.y, fromP.size, victimColor
          )
          break
        case CaptureTier.PAWN_SPLIT:
          this.captureEffect = new AnimePawnSlashEffect(
            this.canvasRenderer, cx, cy, fromP.size, victimColor
          )
          break
        case CaptureTier.ROYAL_DECAP:
          this.captureEffect = new AnimeRoyalDecapEffect(
            this.canvasRenderer, cx, cy, fromP.size, victimColor
          )
          break
        case CaptureTier.EPIC_CLASH:
          this.captureEffect = new AnimeClashEffect(
            this.canvasRenderer, cx, cy, fromP.size, victimColor
          )
          break
        default:
          this.captureEffect = new AnimeSlashEffect(
            this.canvasRenderer, cx, cy, fromP.size, victimColor, 1
          )
      }

      if (this.captureEffect && this.captureEffect.start) {
        this.captureEffect.start()
      }

      // === TIMING CONFIG PER TIER ===
      const timing = this._getTimingConfig(tier)

      // === INITIAL ZOOM-IN (dramatic anticipation) ===
      this.camera.zoomTo(timing.zoomPeak, timing.zoomInDuration)

      // === PLAY AUDIO ===
      if (this.audioManager) {
        this.audioManager.playCapture?.()
        this.audioManager.playBassImpact?.()
      }

      // === GENERATE SPEED LINES (for later burst) ===
      this._generateSpeedLines(cx, cy, tier)

      // === GENERATE SCREEN SLASH (entire screen diagonal slash at impact) ===
      const slashAngle = travelAngle + (Math.random() - 0.5) * 0.3
      this._screenSlash = {
        angle: slashAngle,
        width: 4 + timing.slashWidth,
        alpha: 0,
        maxLength: Math.max(this.canvasRenderer.width, this.canvasRenderer.height) * 1.5,
        color: tier === CaptureTier.ROYAL_DECAP ? '#D4A820' : '#F5F0E8',
        glowColor: tier === CaptureTier.ROYAL_DECAP ? '#B8960F' : '#F5F0E8'
      }

      // Track impact triggers
      this._impactTriggered = false
      this._zoomPunchTriggered = false
      this._hitPauseTriggered = false
      this._screenSlashTriggered = false
      this._particleBurstTriggered = false

      const effectDuration = (this.captureEffect.duration || 0.6) * 1000
      const startTime = performance.now()

      const animate = (now) => {
        const elapsed = now - startTime
        const rawProgress = Math.min(elapsed / effectDuration, 1)

        // === PHASE 1: APPROACH (0 → impactPoint) ===
        // Smooth dramatic approach with ease-in-out
        const impactPoint = timing.impactPoint // e.g. 0.20 = 20% into animation
        const moveEased = rawProgress < impactPoint
          ? Easing.easeInOutCubic(rawProgress / impactPoint) // ease into impact
          : 1 // piece has arrived at impact point

        // Piece position
        if (rawProgress < impactPoint) {
          gp.x = fromP.x + (toP.x - fromP.x) * moveEased
          gp.y = fromP.y + (toP.y - fromP.y) * moveEased
          // Arc lift during approach
          const arcH = fromP.size * 0.12
          gp.y -= arcH * Math.sin(rawProgress / impactPoint * Math.PI)
          // Trail during approach
          gp.trail.push({ x: gp.x + gp.size/2, y: gp.y + gp.size/2 })
          if (gp.trail.length > 8) gp.trail.shift()
        } else {
          gp.x = toP.x
          gp.y = toP.y
        }

        // === PHASE 2: IMPACT (at impactPoint) ===
        if (rawProgress >= impactPoint && !this._impactTriggered) {
          this._impactTriggered = true

          // HIT PAUSE — brief freeze frame for dramatic emphasis
          if (!this._hitPauseTriggered) {
            this._hitPauseTriggered = true
            if (this.timeController) {
              this.timeController.hitPause(timing.hitPauseDuration, 0.01)
            }
          }

          // IMPACT FLASH — brief white/black overlay
          this.camera.impactFlash(timing.impactColor, timing.impactFlashDuration)

          // ZOOM PUNCH — snap zoom then snap back
          this.camera.zoomTo(timing.zoomPeak, timing.zoomPunchInDuration)

          // SCREEN SHAKE — directional toward impact
          this.camera.shake(timing.shakeIntensity, timing.shakeDuration, travelAngle)

          // SCREEN SLASH — diagonal slash across entire screen
          this._screenSlash.alpha = 1
          this._screenSlashTriggered = true

          // VIGNETTE + CHROMATIC — dramatic framing
          this.camera.vignette = timing.vignettePeak
          this.camera.chromaticAberration = timing.chromaticPeak

          // COLOR GRADE — brief contrast boost
          this.camera.colorGrade = { contrast: timing.contrastBoost, saturation: 0.3, brightness: 0.1 }

          // PARTICLE BURST at impact point
          this.spawnImpactParticles(cx, cy, fromP.size, tier)

          // PLAY IMPACT AUDIO
          if (this.audioManager) {
            this.audioManager.playBassImpact?.()
            this.audioManager.playExplosion?.()
          }

          // Board capture highlight (golden glow on source/target squares)
          if (this.boardRenderer && this.boardRenderer.triggerCaptureHighlight) {
            this.boardRenderer.triggerCaptureHighlight(from, to)
          }
        }

        // === ZOOM PUNCH BACK (short delay after impact) ===
        const zoomBackPoint = impactPoint + timing.zoomPunchDelay
        if (rawProgress >= zoomBackPoint && !this._zoomPunchTriggered) {
          this._zoomPunchTriggered = true
          this.camera.zoomTo(1, timing.zoomPunchOutDuration)
        }

        // === SCREEN SLASH FADE ===
        if (this._screenSlashTriggered && this._screenSlash) {
          const slashFadeStart = impactPoint + 0.05
          if (rawProgress > slashFadeStart) {
            const slashFade = Math.max(0, 1 - (rawProgress - slashFadeStart) / 0.15)
            this._screenSlash.alpha = slashFade
            if (slashFade <= 0) {
              this._screenSlash = null
            }
          }
        }

        // === UPDATE CAPTURE EFFECT ===
        if (this.captureEffect && this.captureEffect.update) {
          this.captureEffect.update(rawProgress)
        }
        if (this.captureEffect) {
          this.captureEffect.finished = rawProgress >= 1
        }

        // === EFFECTS DECAY (after impact) ===
        if (rawProgress > impactPoint + 0.1) {
          // Vignette fade
          const vignetteFade = 1 - (rawProgress - impactPoint - 0.1) / 0.3
          this.camera.vignette = Math.max(0, timing.vignettePeak * vignetteFade)

          // Chromatic fade
          const chromaticFade = 1 - (rawProgress - impactPoint - 0.1) / 0.25
          this.camera.chromaticAberration = Math.max(0, timing.chromaticPeak * chromaticFade)

          // Color grade fade
          const gradeFade = 1 - (rawProgress - impactPoint - 0.1) / 0.2
          this.camera.colorGrade = {
            contrast: timing.contrastBoost * Math.max(0, gradeFade),
            saturation: 0.3 * Math.max(0, gradeFade),
            brightness: 0.1 * Math.max(0, gradeFade)
          }
        }

        // === SPEED LINES FADE ===
        if (this._speedLines && rawProgress > impactPoint + 0.15) {
          const speedFade = 1 - (rawProgress - impactPoint - 0.15) / 0.2
          this._speedLines.alpha = Math.max(0, speedFade)
          if (speedFade <= 0) this._speedLines = null
        }

        // Force post-processing to render every frame during animation
        this._forcePostProcessing = true

        if (rawProgress < 1) {
          requestAnimationFrame(animate)
        } else {
          // === CLEANUP ===
          gp.alpha = 0
          this.ghostPieces = []
          this.pieceRenderer.ghostPiece = null
          this.pieceRenderer.victimGhostPiece = null
          this.captureEffect = null
          this.captureTier = null
          this._speedLines = null
          this._screenSlash = null
          this._screenOverlays = []
          this._activeAnimeCapture = false
          this._forcePostProcessing = false
          this._animatingToSquare = -1
          // Force camera back to neutral — guaranteed reset
          this.camera.zoomTo(1, 0.2)
          this.camera.vignette = 0
          this.camera.chromaticAberration = 0
          this.camera.screenFlash = { color: [255,255,255], alpha: 0 }
          this.camera.colorGrade = { contrast: 0, saturation: 0, brightness: 0 }
          this.camera.impactFrame = { active: false, color: 'white', alpha: 0, duration: 0, timer: 0 }
          resolve()
        }
      }
      requestAnimationFrame(animate)
    })
  }

  // === TIMING CONFIG PER TIER — 2026 Chess Edit Style ===
  _getTimingConfig(tier) {
    // All values tuned for maximum dramatic impact while keeping board in frame
    // Zoom capped at 1.12, shake capped at 4px
    const configs = {
      [CaptureTier.EDIT_DISSOLVE]: {
        impactPoint: 0.20,
        hitPauseDuration: 0.05,  // 50ms freeze
        impactFlashDuration: 0.04, // 40ms flash
        impactColor: 'white',
        zoomPeak: 1.08,
        zoomInDuration: 0.15,
        zoomPunchInDuration: 0.08, // fast punch in
        zoomPunchOutDuration: 0.20, // smooth return
        zoomPunchDelay: 0.06,
        shakeIntensity: 3,
        shakeDuration: 0.12,
        vignettePeak: 0.35,
        chromaticPeak: 0.3,
        contrastBoost: 0.2,
        slashWidth: 2
      },
      [CaptureTier.PAWN_SPLIT]: {
        impactPoint: 0.18,
        hitPauseDuration: 0.06,
        impactFlashDuration: 0.05,
        impactColor: 'white',
        zoomPeak: 1.10,
        zoomInDuration: 0.12,
        zoomPunchInDuration: 0.06,
        zoomPunchOutDuration: 0.18,
        zoomPunchDelay: 0.05,
        shakeIntensity: 3.5,
        shakeDuration: 0.12,
        vignettePeak: 0.4,
        chromaticPeak: 0.35,
        contrastBoost: 0.25,
        slashWidth: 3
      },
      [CaptureTier.KNIGHT_DARKNESS]: {
        impactPoint: 0.22,
        hitPauseDuration: 0.08,
        impactFlashDuration: 0.06,
        impactColor: 'black',  // Knight = darkness
        zoomPeak: 1.12,
        zoomInDuration: 0.12,
        zoomPunchInDuration: 0.05,
        zoomPunchOutDuration: 0.25,
        zoomPunchDelay: 0.06,
        shakeIntensity: 4,
        shakeDuration: 0.15,
        vignettePeak: 0.5,
        chromaticPeak: 0.45,
        contrastBoost: 0.35,
        slashWidth: 4
      },
      [CaptureTier.QUEEN_SLASH]: {
        impactPoint: 0.15,
        hitPauseDuration: 0.10,
        impactFlashDuration: 0.07,
        impactColor: 'white',
        zoomPeak: 1.12,
        zoomInDuration: 0.10,
        zoomPunchInDuration: 0.04,
        zoomPunchOutDuration: 0.25,
        zoomPunchDelay: 0.05,
        shakeIntensity: 4,
        shakeDuration: 0.18,
        vignettePeak: 0.5,
        chromaticPeak: 0.5,
        contrastBoost: 0.3,
        slashWidth: 5
      },
      [CaptureTier.ROOK_PATH]: {
        impactPoint: 0.20,
        hitPauseDuration: 0.07,
        impactFlashDuration: 0.05,
        impactColor: 'white',
        zoomPeak: 1.10,
        zoomInDuration: 0.15,
        zoomPunchInDuration: 0.06,
        zoomPunchOutDuration: 0.20,
        zoomPunchDelay: 0.05,
        shakeIntensity: 3.5,
        shakeDuration: 0.14,
        vignettePeak: 0.4,
        chromaticPeak: 0.35,
        contrastBoost: 0.25,
        slashWidth: 3
      },
      [CaptureTier.EPIC_CLASH]: {
        impactPoint: 0.18,
        hitPauseDuration: 0.10,
        impactFlashDuration: 0.07,
        impactColor: 'white',
        zoomPeak: 1.12,
        zoomInDuration: 0.10,
        zoomPunchInDuration: 0.04,
        zoomPunchOutDuration: 0.30,
        zoomPunchDelay: 0.05,
        shakeIntensity: 4,
        shakeDuration: 0.20,
        vignettePeak: 0.55,
        chromaticPeak: 0.5,
        contrastBoost: 0.35,
        slashWidth: 5
      },
      [CaptureTier.ROYAL_DECAP]: {
        impactPoint: 0.15,
        hitPauseDuration: 0.12,
        impactFlashDuration: 0.08,
        impactColor: 'black',  // Royal death = darkness
        zoomPeak: 1.12,
        zoomInDuration: 0.08,
        zoomPunchInDuration: 0.03,
        zoomPunchOutDuration: 0.35,
        zoomPunchDelay: 0.04,
        shakeIntensity: 4,
        shakeDuration: 0.25,
        vignettePeak: 0.6,
        chromaticPeak: 0.6,
        contrastBoost: 0.4,
        slashWidth: 6
      }
    }
    return configs[tier] || configs[CaptureTier.EDIT_DISSOLVE]
  }

  // === CHECK / CHECKMATE DRAMA ===
  zoomToKing(kingSquare, orientation, intensity = 1) {
    this.camera.zoomTo(Math.min(1.08 * intensity, 1.12), 0.3)
    this.camera.vignette = 0.4 * intensity
    this.camera.screenFlash = { color: [220, 30, 30], alpha: 0.3 * intensity }
    this.camera.chromaticAberration = 0.25 * intensity
    this.camera.shake(Math.min(3 * intensity, 4), 0.18)
  }

  resetCameraView() {
    this.camera.zoomTo(1, 0.25)
    this.camera.vignette = 0
    this.camera.chromaticAberration = 0
    this.camera.screenFlash = { color: [255,255,255], alpha: 0 }
    this.camera.colorGrade = { contrast: 0, saturation: 0, brightness: 0 }
    this.camera.impactFrame = { active: false, color: 'white', alpha: 0, duration: 0, timer: 0 }
  }

  // === PARTICLE BURST — 2026 style spark explosion ===
  spawnImpactParticles(cx, cy, pieceSize, tier = CaptureTier.EDIT_DISSOLVE) {
    const intensity = tier === CaptureTier.ROYAL_DECAP ? 3 :
                     tier === CaptureTier.EPIC_CLASH ? 2.5 :
                     tier === CaptureTier.QUEEN_SLASH ? 2 :
                     tier === CaptureTier.KNIGHT_DARKNESS ? 2 : 1.5

    const count = Math.floor(16 * intensity)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8
      const speed = 80 + Math.random() * 200 * intensity
      const life = 0.25 + Math.random() * 0.4
      const colors = ['#B8960F', '#D4A820', '#F5F0E8', '#ff6600', '#ffaa00', '#E8DCCA']
      this.ghostPieces.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30 - Math.random() * 50,
        size: pieceSize * (0.04 + Math.random() * 0.08 * intensity),
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        life, maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        isParticle: true,
        drawShadow() {}, drawTrail() {}, drawDust() {}, shadows: [],
        pieceRenderer: { drawPiece() {} },
        piece: 0, color: 0, size: 1, scaleX: 1, scaleY: 1, rotation: 0,
        height: 0, shadowAlpha: 0, trail: [], config: null, travelAngle: 0,
        draw(ctx) {
          if (this.alpha <= 0.01) return
          ctx.save(); ctx.globalAlpha = this.alpha
          ctx.translate(this.x, this.y); ctx.rotate(this.rotation)
          ctx.fillStyle = this.color
          ctx.shadowColor = this.color; ctx.shadowBlur = 8
          // Diamond-shaped sparks (2026 chess edit style)
          ctx.beginPath()
          ctx.moveTo(0, -this.size)
          ctx.lineTo(this.size * 0.5, 0)
          ctx.lineTo(0, this.size * 0.4)
          ctx.lineTo(-this.size * 0.5, 0)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        },
        updateDust() {}
      })
    }
  }

  // Update camera + ghost pieces
  update(dt) {
    this.camera.update(dt)
    for (let i = this.ghostPieces.length - 1; i >= 0; i--) {
      const gp = this.ghostPieces[i]
      if (gp.isParticle) {
        gp.life -= dt
        gp.alpha = Math.max(0, gp.life / gp.maxLife)
        gp.x += gp.vx * dt
        gp.y += gp.vy * dt
        gp.vy += 350 * dt
        gp.rotation += gp.rotSpeed * dt
        if (gp.life <= 0) this.ghostPieces.splice(i, 1)
      } else if (gp.updateDust) {
        gp.updateDust(dt)
      }
    }
  }

  detectKnightFork(knightSq, knightColor) {
    const offsets = [
      [-1, -2], [1, -2], [-2, -1], [2, -1],
      [-2, 1], [2, 1], [-1, 2], [1, 2]
    ]
    const file = knightSq % 8
    const rank = Math.floor(knightSq / 8)
    let attackedCount = 0
    const position = this.engine.getPosition()
    for (const [df, dr] of offsets) {
      const nf = file + df
      const nr = rank + dr
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue
      const sq = nr * 8 + nf
      const targetPiece = position.board[sq]
      const targetColor = position.colors[sq]
      if (targetPiece !== 0 && targetColor !== knightColor && targetPiece !== Piece.PAWN) {
        attackedCount++
      }
    }
    return attackedCount >= 2
  }

  resize(width, height) {
    this.canvasRenderer.resize(width, height)
    this.camera.setViewport(width, height)
    const boardCenterX = this.canvasRenderer.boardOffsetX + this.canvasRenderer.squareSize * 4
    const boardCenterY = this.canvasRenderer.boardOffsetY + this.canvasRenderer.squareSize * 4
    this.camera.setBoardCenter(boardCenterX, boardCenterY)
  }

  _smoothStep(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  // === MANGA SPEED LINES ===
  _generateSpeedLines(cx, cy, tier) {
    const lineCount = tier === CaptureTier.ROYAL_DECAP ? 28 :
                     tier === CaptureTier.EPIC_CLASH ? 24 :
                     tier === CaptureTier.QUEEN_SLASH ? 20 :
                     tier === CaptureTier.KNIGHT_DARKNESS ? 18 : 14
    const { squareSize } = this.canvasRenderer
    const baseLength = squareSize * 2.5

    const lines = []
    for (let i = 0; i < lineCount; i++) {
      const angle = (Math.PI * 2 * i) / lineCount + (Math.random() - 0.5) * 0.2
      const length = baseLength * (0.7 + Math.random() * 0.8)
      const width = 2 + Math.random() * 3
      lines.push({ angle, length, width })
    }

    this._speedLines = {
      cx, cy, lines, alpha: 0, rotation: 0,  // alpha starts at 0, bursts at impact
      color: '#B8960F'
    }
  }

  // Render manga-style speed lines (called from Renderer in screen space)
  renderSpeedLines(ctx) {
    if (!this._speedLines || this._speedLines.alpha <= 0.01) return
    const { cx, cy, lines, alpha, rotation, color } = this._speedLines

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx, cy)
    ctx.rotate(rotation * Math.PI / 180)

    for (const line of lines) {
      const cos = Math.cos(line.angle)
      const sin = Math.sin(line.angle)
      const startDist = 20

      // Glow layer (wide, dim)
      ctx.beginPath()
      ctx.moveTo(cos * startDist, sin * startDist)
      ctx.lineTo(cos * (startDist + line.length), sin * (startDist + line.length))
      ctx.strokeStyle = 'rgba(245, 240, 232, 0.25)'
      ctx.lineWidth = line.width + 6
      ctx.globalAlpha = alpha * 0.25
      ctx.lineCap = 'round'
      ctx.stroke()

      // Core line (gold)
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(cos * startDist, sin * startDist)
      ctx.lineTo(cos * (startDist + line.length), sin * (startDist + line.length))
      ctx.strokeStyle = color
      ctx.lineWidth = line.width
      ctx.shadowColor = color; ctx.shadowBlur = 15
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    ctx.restore()
  }

  // Render screen-level slash (diagonal slash across entire viewport)
  renderScreenSlash(ctx) {
    if (!this._screenSlash || this._screenSlash.alpha <= 0.01) return
    const { angle, width, alpha, maxLength, color, glowColor } = this._screenSlash
    const cx = this.canvasRenderer.width / 2
    const cy = this.canvasRenderer.height / 2

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const halfLen = maxLength * 0.5

    ctx.save()
    // Glow layer (wide, warm white)
    ctx.globalAlpha = alpha * 0.35
    ctx.strokeStyle = glowColor
    ctx.lineWidth = width + 14
    ctx.lineCap = 'round'
    ctx.shadowColor = glowColor; ctx.shadowBlur = 30
    ctx.beginPath()
    ctx.moveTo(cx - cos * halfLen, cy - sin * halfLen)
    ctx.lineTo(cx + cos * halfLen, cy + sin * halfLen)
    ctx.stroke()

    // Core slash (gold/bright)
    ctx.globalAlpha = alpha * 0.9
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.shadowColor = '#B8960F'; ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(cx - cos * halfLen * 0.8, cy - sin * halfLen * 0.8)
    ctx.lineTo(cx + cos * halfLen * 0.8, cy + sin * halfLen * 0.8)
    ctx.stroke()

    // White-hot center (thin, bright)
    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#F5F0E8'
    ctx.lineWidth = width * 0.3
    ctx.shadowColor = '#F5F0E8'; ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(cx - cos * halfLen * 0.5, cy - sin * halfLen * 0.5)
    ctx.lineTo(cx + cos * halfLen * 0.5, cy + sin * halfLen * 0.5)
    ctx.stroke()

    ctx.restore()
  }

  // Render impact frame overlay (full-screen flash)
  renderImpactFrame(ctx) {
    if (!this.camera.impactFrame || !this.camera.impactFrame.active || this.camera.impactFrame.alpha <= 0.01) return
    const { color, alpha } = this.camera.impactFrame

    ctx.save()
    ctx.globalAlpha = alpha * 0.85  // strong but not full white
    if (color === 'black') {
      ctx.fillStyle = '#0a0805'
    } else {
      ctx.fillStyle = '#F5F0E8'
    }
    ctx.fillRect(0, 0, this.canvasRenderer.width, this.canvasRenderer.height)
    ctx.restore()
  }
}
