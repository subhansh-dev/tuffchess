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
 * AnimationManager — Arena Battle Chess Style
 * Every move is dramatic. Every capture is a cinematic event.
 * - Per-piece movement styles (knight jump, rook charge, queen glide)
 * - Zoom on every move with camera focus
 * - Impact frames, screen slashes, speed lines
 * - Hit pause, chromatic aberration, vignette
 */
export class AnimationManager {
  constructor(canvasRenderer, pieceRenderer, engine, audioManager, timeController, eventBus) {
    this.canvasRenderer = canvasRenderer
    this.pieceRenderer = pieceRenderer
    this.engine = engine
    this.audioManager = audioManager
    this.timeController = timeController
    this.eventBus = eventBus
    this.boardRenderer = null
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
    this._screenOverlays = []
    this._forcePostProcessing = false

    // Screen flash overlay DOM element
    this._flashOverlay = document.getElementById('screen-flash-overlay')
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

  // === PER-PIECE MOVE ANIMATION ===
  animateMove({ from, to, piece, color, orientation, duration }) {
    switch (piece) {
      case Piece.KNIGHT:
        return this._animateKnightJump({ from, to, piece, color, orientation, duration })
      case Piece.BISHOP:
        return this._animateBishopGlide({ from, to, piece, color, orientation, duration })
      case Piece.ROOK:
        return this._animateRookCharge({ from, to, piece, color, orientation, duration })
      case Piece.QUEEN:
        return this._animateQueenGlide({ from, to, piece, color, orientation, duration })
      case Piece.KING:
        return this._animateKingMarch({ from, to, piece, color, orientation, duration })
      case Piece.PAWN:
      default:
        return this._animatePawnDash({ from, to, piece, color, orientation, duration })
    }
  }

  // --- PAWN: Quick dash with dust ---
  _animatePawnDash({ from, to, piece, color, orientation, duration }) {
    return this._baseMoveAnimation({
      from, to, piece, color, orientation, duration: duration || 0.22,
      config: {
        arcHeight: 0.3,
        dustRate: 0.12,
        dustColor: 'rgba(255,215,0,0.15)',
        trailLength: 4,
        zoomAmount: 1.03,
        zoomDuration: 0.25,
        squashAmount: 0.04
      }
    })
  }

  // --- KNIGHT: Teleport jump with dark arc ---
  _animateKnightJump({ from, to, piece, color, orientation, duration }) {
    return this._baseMoveAnimation({
      from, to, piece, color, orientation, duration: duration || 0.35,
      config: {
        arcHeight: 2.5,
        dustRate: 0.08,
        dustColor: 'rgba(160,140,255,0.2)',
        trailLength: 6,
        zoomAmount: 1.06,
        zoomDuration: 0.3,
        squashAmount: 0.06,
        rotationAmount: 0.15,
        preJumpDelay: 80,
        isKnight: true
      }
    })
  }

  // --- BISHOP: Diagonal glide with light trail ---
  _animateBishopGlide({ from, to, piece, color, orientation, duration }) {
    return this._baseMoveAnimation({
      from, to, piece, color, orientation, duration: duration || 0.32,
      config: {
        arcHeight: 0.8,
        dustRate: 0.06,
        dustColor: 'rgba(200,180,255,0.18)',
        trailLength: 8,
        zoomAmount: 1.04,
        zoomDuration: 0.28,
        squashAmount: 0.03,
        glowColor: 'rgba(200,180,255,0.1)'
      }
    })
  }

  // --- ROOK: Heavy charge with dust and screen shake ---
  _animateRookCharge({ from, to, piece, color, orientation, duration }) {
    return this._baseMoveAnimation({
      from, to, piece, color, orientation, duration: duration || 0.3,
      config: {
        arcHeight: 0.15,
        dustRate: 0.15,
        dustColor: 'rgba(255,100,50,0.2)',
        trailLength: 5,
        zoomAmount: 1.05,
        zoomDuration: 0.3,
        squashAmount: 0.08,
        shakeOnLand: 2,
        shakeDuration: 0.1
      }
    })
  }

  // --- QUEEN: Majestic glide with golden aura ---
  _animateQueenGlide({ from, to, piece, color, orientation, duration }) {
    return this._baseMoveAnimation({
      from, to, piece, color, orientation, duration: duration || 0.35,
      config: {
        arcHeight: 0.5,
        dustRate: 0.05,
        dustColor: 'rgba(255,215,0,0.2)',
        trailLength: 10,
        zoomAmount: 1.05,
        zoomDuration: 0.35,
        squashAmount: 0.03,
        glowColor: 'rgba(255,215,0,0.08)',
        isQueen: true
      }
    })
  }

  // --- KING: Solemn march with subtle glow ---
  _animateKingMarch({ from, to, piece, color, orientation, duration }) {
    return this._baseMoveAnimation({
      from, to, piece, color, orientation, duration: duration || 0.4,
      config: {
        arcHeight: 0.1,
        dustRate: 0.04,
        dustColor: 'rgba(255,200,100,0.15)',
        trailLength: 3,
        zoomAmount: 1.04,
        zoomDuration: 0.4,
        squashAmount: 0.02,
        glowColor: 'rgba(255,200,100,0.06)'
      }
    })
  }

  // === BASE MOVE ANIMATION ===
  _baseMoveAnimation({ from, to, piece, color, orientation, duration, config }) {
    return new Promise((resolve) => {
      const fromP = this.squareToPixel(from, orientation || 1)
      const toP = this.squareToPixel(to, orientation || 1)
      const dur = duration * 1000
      const cfg = config || {}

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

      // Camera zoom to move
      const { squareSize, boardOffsetX, boardOffsetY } = this.canvasRenderer
      const toFile = to % 8
      const toRank = Math.floor(to / 8)
      const drawRank = orientation === 1 ? 7 - toRank : toRank
      const cx = boardOffsetX + (toFile + 0.5) * squareSize - this.canvasRenderer.width / 2
      const cy = boardOffsetY + (drawRank + 0.5) * squareSize - this.canvasRenderer.height / 2
      this.camera.zoomToSquare(cx * 0.3, cy * 0.3, cfg.zoomAmount || 1.02, cfg.zoomDuration || 0.25)
      setTimeout(() => { this.camera.zoomTo(1, 0.3) }, dur * 0.7)

      // Pre-jump delay for knight
      const preDelay = cfg.preJumpDelay || 0

      const animate = (now) => {
        const elapsed = now - gp.startTime - preDelay
        if (elapsed < 0) {
          // Pre-jump: squish down in anticipation
          const anticipation = 1 - (elapsed + preDelay) / preDelay
          gp.scaleY = 1 - anticipation * 0.15
          gp.scaleX = 1 + anticipation * 0.1
          requestAnimationFrame(animate)
          return
        }

        const t = Math.min(elapsed / gp.duration, 1)
        const smooth = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

        gp.x = fromP.x + (toP.x - fromP.x) * smooth
        gp.y = fromP.y + (toP.y - fromP.y) * smooth

        // Arc
        const arcHeight = Math.min(fromP.size * cfg.arcHeight, dist * 0.1 + fromP.size * 0.05)
        gp.height = arcHeight * Math.sin(t * Math.PI)
        gp.y -= arcHeight * Math.sin(t * Math.PI)

        // Rotation
        if (cfg.rotationAmount) {
          gp.rotation = Math.sin(t * Math.PI * 2) * cfg.rotationAmount * Math.cos(gp.travelAngle)
        } else {
          gp.rotation = Math.sin(t * Math.PI * 2) * 0.02 * Math.cos(gp.travelAngle)
        }

        // Squash-and-stretch
        const velocity = smooth * (1 - smooth) * 4
        const sqAmount = cfg.squashAmount || 0.025
        gp.scaleX = 1 - velocity * sqAmount
        gp.scaleY = 1 + velocity * (sqAmount * 1.5)

        // Shadow
        gp.shadowAlpha = 0.12 + Math.sin(t * Math.PI) * 0.08

        // Dust
        if (Math.random() < (cfg.dustRate || 0.06) && t < 0.92) {
          const life = 0.15 + Math.random() * 0.2
          gp.dustParticles.push({
            x: gp.x + gp.size / 2 + (Math.random()-0.5) * gp.size * 0.3,
            y: gp.y + gp.size * 0.8,
            size: 0.5 + Math.random() * 2,
            color: cfg.dustColor || 'rgba(255,215,0,0.15)',
            vx: (Math.random()-0.5) * 8, vy: -Math.random() * 5 - 1,
            life, maxLife: life, alpha: 0.3
          })
        }
        if (gp.updateDust) gp.updateDust(1/60)

        // Trail
        const tLen = cfg.trailLength || 5
        if (dist > gp.size * 1.5 && t > 0.03 && t < 0.95) {
          gp.trail.push({ x: gp.x + gp.size/2, y: gp.y + gp.size/2 })
          if (gp.trail.length > tLen) gp.trail.shift()
        }

        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          // Land
          gp.x = toP.x; gp.y = toP.y
          gp.height = 0; gp.rotation = 0
          gp.scaleX = 1; gp.scaleY = 1

          // Screen shake on land for rook
          if (cfg.shakeOnLand) {
            this.camera.shake(cfg.shakeOnLand, cfg.shakeDuration || 0.1, gp.travelAngle)
          }

          const settleStart = performance.now()
          const settleAnim = (settleNow) => {
            const st = Math.min((settleNow - settleStart) / 40, 1)
            gp.alpha = 1 - st
            if (st < 1) requestAnimationFrame(settleAnim)
            else {
              gp.alpha = 0; gp.isMoving = false
              this.ghostPieces = []
              this.pieceRenderer.ghostPiece = null
              this._animatingToSquare = -1
              this.camera.zoomTo(1, 0.3)
              resolve()
            }
          }
          requestAnimationFrame(settleAnim)
        }
      }
      requestAnimationFrame(animate)
    })
  }

  // === CAPTURE ANIMATION — Enhanced Cinematic Pipeline ===
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

      const timing = this._getTimingConfig(tier)

      // === INITIAL ZOOM-IN ===
      this.camera.zoomTo(timing.zoomPeak, timing.zoomInDuration)

      // === PLAY AUDIO ===
      if (this.audioManager) {
        this.audioManager.playCapture?.()
        this.audioManager.playBassImpact?.()
      }

      // === GENERATE SPEED LINES ===
      this._generateSpeedLines(cx, cy, tier)

      // === GENERATE SCREEN SLASH ===
      const slashAngle = travelAngle + (Math.random() - 0.5) * 0.3
      this._screenSlash = {
        angle: slashAngle,
        width: 4 + timing.slashWidth,
        alpha: 0,
        maxLength: Math.max(this.canvasRenderer.width, this.canvasRenderer.height) * 1.5,
        color: tier === CaptureTier.ROYAL_DECAP ? '#FFD700' : '#FFFFFF',
        glowColor: tier === CaptureTier.ROYAL_DECAP ? '#B8860B' : '#FFD700'
      }

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

        // === PHASE 1: APPROACH ===
        const impactPoint = timing.impactPoint
        const moveEased = rawProgress < impactPoint
          ? Easing.easeInOutCubic(rawProgress / impactPoint)
          : 1

        if (rawProgress < impactPoint) {
          gp.x = fromP.x + (toP.x - fromP.x) * moveEased
          gp.y = fromP.y + (toP.y - fromP.y) * moveEased
          const arcH = fromP.size * 0.15
          gp.y -= arcH * Math.sin(rawProgress / impactPoint * Math.PI)
          gp.trail.push({ x: gp.x + gp.size/2, y: gp.y + gp.size/2 })
          if (gp.trail.length > 10) gp.trail.shift()
        } else {
          gp.x = toP.x
          gp.y = toP.y
        }

        // === PHASE 2: IMPACT ===
        if (rawProgress >= impactPoint && !this._impactTriggered) {
          this._impactTriggered = true

          if (!this._hitPauseTriggered) {
            this._hitPauseTriggered = true
            if (this.timeController) {
              this.timeController.hitPause(timing.hitPauseDuration, 0.01)
            }
          }

          this.camera.impactFlash(timing.impactColor, timing.impactFlashDuration)
          this.camera.zoomTo(timing.zoomPeak, timing.zoomPunchInDuration)
          this.camera.shake(timing.shakeIntensity, timing.shakeDuration, travelAngle)

          this._screenSlash.alpha = 1
          this._screenSlashTriggered = true

          this.camera.vignette = timing.vignettePeak
          this.camera.chromaticAberration = timing.chromaticPeak
          this.camera.colorGrade = { contrast: timing.contrastBoost, saturation: 0.3, brightness: 0.1 }

          this.spawnImpactParticles(cx, cy, fromP.size, tier)

          // DOM screen flash for extra impact
          if (this._flashOverlay) {
            this._flashOverlay.classList.add('active')
            setTimeout(() => { if (this._flashOverlay) this._flashOverlay.classList.remove('active') }, 150)
          }

          if (this.audioManager) {
            this.audioManager.playBassImpact?.()
            this.audioManager.playExplosion?.()
          }

          if (this.boardRenderer && this.boardRenderer.triggerCaptureHighlight) {
            this.boardRenderer.triggerCaptureHighlight(from, to)
          }
        }

        // === ZOOM PUNCH BACK ===
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

        // === EFFECTS DECAY ===
        if (rawProgress > impactPoint + 0.1) {
          const vignetteFade = 1 - (rawProgress - impactPoint - 0.1) / 0.3
          this.camera.vignette = Math.max(0, timing.vignettePeak * vignetteFade)

          const chromaticFade = 1 - (rawProgress - impactPoint - 0.1) / 0.25
          this.camera.chromaticAberration = Math.max(0, timing.chromaticPeak * chromaticFade)

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

  // === TIMING CONFIG PER TIER ===
  _getTimingConfig(tier) {
    const configs = {
      [CaptureTier.EDIT_DISSOLVE]: {
        impactPoint: 0.20,
        hitPauseDuration: 0.05,
        impactFlashDuration: 0.04,
        impactColor: 'white',
        zoomPeak: 1.12,
        zoomInDuration: 0.15,
        zoomPunchInDuration: 0.08,
        zoomPunchOutDuration: 0.20,
        zoomPunchDelay: 0.06,
        shakeIntensity: 4,
        shakeDuration: 0.12,
        vignettePeak: 0.4,
        chromaticPeak: 0.35,
        contrastBoost: 0.25,
        slashWidth: 3
      },
      [CaptureTier.PAWN_SPLIT]: {
        impactPoint: 0.18,
        hitPauseDuration: 0.06,
        impactFlashDuration: 0.05,
        impactColor: 'white',
        zoomPeak: 1.14,
        zoomInDuration: 0.12,
        zoomPunchInDuration: 0.06,
        zoomPunchOutDuration: 0.18,
        zoomPunchDelay: 0.05,
        shakeIntensity: 4.5,
        shakeDuration: 0.12,
        vignettePeak: 0.45,
        chromaticPeak: 0.4,
        contrastBoost: 0.3,
        slashWidth: 4
      },
      [CaptureTier.KNIGHT_DARKNESS]: {
        impactPoint: 0.22,
        hitPauseDuration: 0.08,
        impactFlashDuration: 0.06,
        impactColor: 'black',
        zoomPeak: 1.16,
        zoomInDuration: 0.12,
        zoomPunchInDuration: 0.05,
        zoomPunchOutDuration: 0.25,
        zoomPunchDelay: 0.06,
        shakeIntensity: 5,
        shakeDuration: 0.15,
        vignettePeak: 0.55,
        chromaticPeak: 0.5,
        contrastBoost: 0.4,
        slashWidth: 5
      },
      [CaptureTier.QUEEN_SLASH]: {
        impactPoint: 0.15,
        hitPauseDuration: 0.10,
        impactFlashDuration: 0.07,
        impactColor: 'white',
        zoomPeak: 1.18,
        zoomInDuration: 0.10,
        zoomPunchInDuration: 0.04,
        zoomPunchOutDuration: 0.25,
        zoomPunchDelay: 0.05,
        shakeIntensity: 5,
        shakeDuration: 0.18,
        vignettePeak: 0.55,
        chromaticPeak: 0.55,
        contrastBoost: 0.35,
        slashWidth: 6
      },
      [CaptureTier.ROOK_PATH]: {
        impactPoint: 0.20,
        hitPauseDuration: 0.07,
        impactFlashDuration: 0.05,
        impactColor: 'white',
        zoomPeak: 1.14,
        zoomInDuration: 0.15,
        zoomPunchInDuration: 0.06,
        zoomPunchOutDuration: 0.20,
        zoomPunchDelay: 0.05,
        shakeIntensity: 4.5,
        shakeDuration: 0.14,
        vignettePeak: 0.45,
        chromaticPeak: 0.4,
        contrastBoost: 0.3,
        slashWidth: 4
      },
      [CaptureTier.EPIC_CLASH]: {
        impactPoint: 0.18,
        hitPauseDuration: 0.10,
        impactFlashDuration: 0.07,
        impactColor: 'white',
        zoomPeak: 1.18,
        zoomInDuration: 0.10,
        zoomPunchInDuration: 0.04,
        zoomPunchOutDuration: 0.30,
        zoomPunchDelay: 0.05,
        shakeIntensity: 5.5,
        shakeDuration: 0.20,
        vignettePeak: 0.6,
        chromaticPeak: 0.55,
        contrastBoost: 0.4,
        slashWidth: 6
      },
      [CaptureTier.ROYAL_DECAP]: {
        impactPoint: 0.15,
        hitPauseDuration: 0.12,
        impactFlashDuration: 0.08,
        impactColor: 'black',
        zoomPeak: 1.20,
        zoomInDuration: 0.08,
        zoomPunchInDuration: 0.03,
        zoomPunchOutDuration: 0.35,
        zoomPunchDelay: 0.04,
        shakeIntensity: 6,
        shakeDuration: 0.25,
        vignettePeak: 0.65,
        chromaticPeak: 0.65,
        contrastBoost: 0.45,
        slashWidth: 7
      }
    }
    return configs[tier] || configs[CaptureTier.EDIT_DISSOLVE]
  }

  // === CHECK / CHECKMATE DRAMA ===
  zoomToKing(kingSquare, orientation, intensity = 1) {
    this.camera.zoomTo(Math.min(1.12 * intensity, 1.2), 0.3)
    this.camera.vignette = 0.45 * intensity
    this.camera.screenFlash = { color: [220, 30, 30], alpha: 0.35 * intensity }
    this.camera.chromaticAberration = 0.3 * intensity
    this.camera.shake(Math.min(3.5 * intensity, 5), 0.18)
  }

  resetCameraView() {
    this.camera.zoomTo(1, 0.25)
    this.camera.vignette = 0
    this.camera.chromaticAberration = 0
    this.camera.screenFlash = { color: [255,255,255], alpha: 0 }
    this.camera.colorGrade = { contrast: 0, saturation: 0, brightness: 0 }
    this.camera.impactFrame = { active: false, color: 'white', alpha: 0, duration: 0, timer: 0 }
  }

  // === PARTICLE BURST ===
  spawnImpactParticles(cx, cy, pieceSize, tier = CaptureTier.EDIT_DISSOLVE) {
    const intensity = tier === CaptureTier.ROYAL_DECAP ? 3 :
                     tier === CaptureTier.EPIC_CLASH ? 2.5 :
                     tier === CaptureTier.QUEEN_SLASH ? 2 :
                     tier === CaptureTier.KNIGHT_DARKNESS ? 2 : 1.5

    const count = Math.floor(20 * intensity)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8
      const speed = 100 + Math.random() * 250 * intensity
      const life = 0.3 + Math.random() * 0.5
      const colors = ['#FFD700', '#FF6B35', '#C41E3A', '#FFE55C', '#FFFFFF', '#A090C0']
      this.ghostPieces.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40 - Math.random() * 60,
        size: pieceSize * (0.04 + Math.random() * 0.1 * intensity),
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 15,
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
          ctx.shadowColor = this.color; ctx.shadowBlur = 10
          // Star-shaped sparks
          ctx.beginPath()
          const s = this.size
          ctx.moveTo(0, -s)
          ctx.lineTo(s * 0.25, -s * 0.25)
          ctx.lineTo(s, 0)
          ctx.lineTo(s * 0.25, s * 0.25)
          ctx.lineTo(0, s * 0.5)
          ctx.lineTo(-s * 0.25, s * 0.25)
          ctx.lineTo(-s, 0)
          ctx.lineTo(-s * 0.25, -s * 0.25)
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
        gp.vy += 400 * dt
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
    const lineCount = tier === CaptureTier.ROYAL_DECAP ? 32 :
                     tier === CaptureTier.EPIC_CLASH ? 28 :
                     tier === CaptureTier.QUEEN_SLASH ? 24 :
                     tier === CaptureTier.KNIGHT_DARKNESS ? 22 : 18
    const { squareSize } = this.canvasRenderer
    const baseLength = squareSize * 3

    const lines = []
    for (let i = 0; i < lineCount; i++) {
      const angle = (Math.PI * 2 * i) / lineCount + (Math.random() - 0.5) * 0.2
      const length = baseLength * (0.7 + Math.random() * 0.8)
      const width = 2 + Math.random() * 3
      lines.push({ angle, length, width })
    }

    this._speedLines = {
      cx, cy, lines, alpha: 0, rotation: 0,
      color: '#FFD700'
    }
  }

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

      ctx.beginPath()
      ctx.moveTo(cos * startDist, sin * startDist)
      ctx.lineTo(cos * (startDist + line.length), sin * (startDist + line.length))
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = line.width + 8
      ctx.globalAlpha = alpha * 0.2
      ctx.lineCap = 'round'
      ctx.stroke()

      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = line.width
      ctx.shadowColor = color; ctx.shadowBlur = 20
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    ctx.restore()
  }

  renderScreenSlash(ctx) {
    if (!this._screenSlash || this._screenSlash.alpha <= 0.01) return
    const { angle, width, alpha, maxLength, color, glowColor } = this._screenSlash
    const cx = this.canvasRenderer.width / 2
    const cy = this.canvasRenderer.height / 2

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const halfLen = maxLength * 0.5

    ctx.save()
    ctx.globalAlpha = alpha * 0.4
    ctx.strokeStyle = glowColor
    ctx.lineWidth = width + 18
    ctx.lineCap = 'round'
    ctx.shadowColor = glowColor; ctx.shadowBlur = 40
    ctx.beginPath()
    ctx.moveTo(cx - cos * halfLen, cy - sin * halfLen)
    ctx.lineTo(cx + cos * halfLen, cy + sin * halfLen)
    ctx.stroke()

    ctx.globalAlpha = alpha * 0.9
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 25
    ctx.beginPath()
    ctx.moveTo(cx - cos * halfLen * 0.8, cy - sin * halfLen * 0.8)
    ctx.lineTo(cx + cos * halfLen * 0.8, cy + sin * halfLen * 0.8)
    ctx.stroke()

    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = width * 0.3
    ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(cx - cos * halfLen * 0.5, cy - sin * halfLen * 0.5)
    ctx.lineTo(cx + cos * halfLen * 0.5, cy + sin * halfLen * 0.5)
    ctx.stroke()

    ctx.restore()
  }

  renderImpactFrame(ctx) {
    if (!this.camera.impactFrame || !this.camera.impactFrame.active || this.camera.impactFrame.alpha <= 0.01) return
    const { color, alpha } = this.camera.impactFrame

    ctx.save()
    ctx.globalAlpha = alpha * 0.9
    if (color === 'black') {
      ctx.fillStyle = '#050308'
    } else {
      ctx.fillStyle = '#FFFFFF'
    }
    ctx.fillRect(0, 0, this.canvasRenderer.width, this.canvasRenderer.height)
    ctx.restore()
  }
}
