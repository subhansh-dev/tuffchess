import { ChessEngine } from './core/ChessEngine.js'
import { Renderer } from './render/Renderer.js'
import { CanvasRenderer } from './render/CanvasRenderer.js'
import { PieceRenderer } from './render/PieceRenderer.js'
import { BoardRenderer } from './render/BoardRenderer.js'
import { InputManager } from './input/InputManager.js'
import { AudioManager } from './audio/AudioManager.js'
import { UIManager } from './ui/UIManager.js'
import { StockfishBot } from './bot/StockfishBot.js'
import { EloSystem } from './core/EloSystem.js'
import { MatchHistory } from './core/MatchHistory.js'
import { ChessClock } from './core/ChessClock.js'
import { AnimationManager } from './animation/AnimationManager.js'
import { Camera } from './animation/Camera.js'
import { TimeController } from './animation/TimeController.js'
import { EventBus } from './utils/EventBus.js'
import { PostProcessing } from './vfx/PostProcessing.js'

const DIFFICULTY_NAMES = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert'
}

const DIFFICULTY_ELO = {
  beginner: 400,
  intermediate: 800,
  advanced: 1200,
  expert: 1600
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas')
    if (!this.canvas) throw new Error('Canvas element not found!')
    this.ctx = this.canvas.getContext('2d', { alpha: false })
    this.running = false
    this.engine = null
    this.renderer = null
    this.input = null
    this.audio = null
    this.ui = null
    this.bot = null
    this.elo = null
    this.matchHistory = null
    this.clock = null
    this.timeControl = 0
    this.selectedTimeControl = 0
    this.pendingDifficulty = null

    this.gameMode = null
    this.botDifficulty = null
    this.playerColor = 1
    this.botThinking = false
    this.gameActive = false

    this.timeController = new TimeController()
    this.eventBus = new EventBus()
    this.postProcessing = null
  }

  async init() {
    this.ui = new UIManager()
    this.elo = new EloSystem()
    this.matchHistory = new MatchHistory()
    this.clock = new ChessClock()
    this.audio = new AudioManager()
    this.bot = new StockfishBot()

    this.resize()
    window.addEventListener('resize', () => this.resize())

    this.ui.showLoading(10, 'Initializing...')

    this.engine = new ChessEngine()
    this.engine.init()
    this.ui.showLoading(20, 'Setting up board...')

    const canvasRenderer = new CanvasRenderer(this.ctx, window.innerWidth, window.innerHeight)
    const pieceRenderer = new PieceRenderer(canvasRenderer)
    const boardRenderer = new BoardRenderer(canvasRenderer)

    this.renderer = new Renderer(canvasRenderer, pieceRenderer, boardRenderer)

    this.renderer.pieceRenderer.setEngineRef(this.engine)

    this.ui.showLoading(25, 'Loading assets...')

    this.animationManager = new AnimationManager(
      this.renderer.canvasRenderer,
      this.renderer.pieceRenderer,
      this.engine,
      this.audio,
      this.timeController,
      this.eventBus
    )

    this.input = new InputManager(this.canvas, this.engine, this.renderer, this.animationManager)

    // Connect animation manager to renderer for speed line rendering
    this.renderer.setAnimationManager(this.animationManager)

    this.postProcessing = new PostProcessing(window.innerWidth, window.innerHeight)

    this.timeController.onTimeScaleChange = (scale) => {
      this.animationManager.setTimeScale(scale)
    }
    this.timeController.onFreezeStart = (duration) => {
      this.eventBus.emit('freeze:start', { duration })
    }
    this.timeController.onFreezeEnd = () => {
      this.eventBus.emit('freeze:end')
    }

    const pos = this.engine.getPosition()
    this.renderer.boardRenderer.setPosition(pos)

    this.engine.on('position', (pos) => {
      this.renderer.boardRenderer.setPosition(pos)
    })

    this.engine.on('move', (move) => {
      this.audio.playMove()
    })
    this.engine.on('capture', (captureData) => {
      this.audio.playCapture?.()
    })
    this.engine.on('check', () => {
      this.audio.playCheck()
      // Anime camera zoom for check
      const pos = this.engine.getPosition()
      const kingSq = this.findKing(pos, this.engine.getTurn())
      if (kingSq >= 0) {
        const orientation = this.renderer.boardRenderer.boardAppearance.orientation
        this.animationManager.zoomToKing(kingSq, orientation, 0.8)
        setTimeout(() => { this.animationManager.resetCameraView() }, 1500)
      }
    })
    this.engine.on('gameover', (gameOver) => {
      this.audio.playGameOver()
      if (gameOver && gameOver.result === 'checkmate') {
        const pos = this.engine.getPosition()
        const kingSq = this.findKing(pos, this.engine.getTurn())
        if (kingSq >= 0) {
          const orientation = this.renderer.boardRenderer.boardAppearance.orientation
          this.animationManager.zoomToKing(kingSq, orientation, 1.5)
          setTimeout(() => { this.animationManager.resetCameraView() }, 2500)
        }
      }
    })

    // Clock timeout handler
    this.clock.onFlag = (side) => {
      if (!this.gameActive) return
      const winner = side === 'white' ? 'black' : 'white'
      this.endGame({ result: 'timeout', winner })
    }

    const initAudioOnClick = async () => {
      await this.audio.init()
    }
    this.canvas.addEventListener('click', initAudioOnClick, { once: true })

    this.ui.showLoading(30, 'Loading engine...')
    try {
      await Promise.race([
        this.bot.init(),
        new Promise((resolve) => setTimeout(resolve, 15000))
      ])
    } catch (err) {
      console.warn('Stockfish init failed or timed out, continuing without bot:', err)
    }

    this.setupUIEvents()
    this.setupInputEvents()
    this.checkUrlParams()

    this.ui.showLoading(100, 'Ready!')
    await new Promise(r => setTimeout(r, 300))
    this.ui.hideLoading()

    this.updateMenuElo()
    this.ui.showScreen('mainMenu')

    this.running = true
    requestAnimationFrame((t) => this.loop(t))
  }

  setupUIEvents() {
    this.ui.on('play', () => this.ui.showScreen('modeSelect'))
    this.ui.on('back-to-menu', () => this.ui.showScreen('mainMenu'))
    this.ui.on('back-to-mode-select', () => this.ui.showScreen('modeSelect'))

    this.ui.on('select-bot', () => this.ui.showScreen('botDifficulty'))
    this.ui.on('select-friend', () => {
      this.pendingDifficulty = null
      this.ui.showScreen('timeControl')
    })

    this.ui.on('open-history', () => {
      this.showHistory()
      this.ui.showScreen('history')
    })
    this.ui.on('close-history', () => this.ui.showScreen('mainMenu'))

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        const filter = btn.dataset.filter
        this.showHistory(filter === 'all' ? null : filter)
      })
    })

    document.getElementById('history-list')?.addEventListener('click', (e) => {
      const replayBtn = e.target.closest('[data-replay-id]')
      if (replayBtn) {
        const match = this.matchHistory.getMatch(replayBtn.dataset.replayId)
        if (match && match.moves && match.moves.length > 0) {
          this.startReplay(match)
        }
      }
    })

    this.ui.on('replay-start', () => this.replayGoStart())
    this.ui.on('replay-back', () => this.replayStep(-1))
    this.ui.on('replay-play', () => this.replayTogglePlay())
    this.ui.on('replay-forward', () => this.replayStep(1))
    this.ui.on('replay-end', () => this.replayGoEnd())
    this.ui.on('replay-exit', () => this.exitReplay())

    this.ui.on('select-difficulty', (el) => {
      this.pendingDifficulty = el.dataset.difficulty
      this.ui.showScreen('timeControl')
    })

    this.ui.on('select-time', (el) => {
      const seconds = parseInt(el.dataset.time)
      this.timeControl = seconds
      this.startGame(this.pendingDifficulty !== null ? 'bot' : 'friend', this.pendingDifficulty, seconds)
    })

    this.ui.on('back-to-time-control', () => this.ui.showScreen('timeControl'))

    this.ui.on('toggle-sound', () => {
      const enabled = !this.audio.enabled
      this.audio.setEnabled(enabled)
      const btn = document.querySelector('[data-action="toggle-sound"]')
      if (btn) btn.style.opacity = enabled ? '1' : '0.4'
    })

    this.ui.on('flip-board', () => {
      this.renderer.flip()
      this.engine.flip()
    })

    this.ui.on('undo-move', () => {
      if (this.botThinking) return
      if (this.gameMode === 'bot' && this.engine.getHistory().length < 2) return

      if (this.gameMode === 'bot') {
        this.engine.undo()
        this.engine.undo()
      } else {
        this.engine.undo()
      }

      const pos = this.engine.getPosition()
      this.renderer.boardRenderer.setPosition(pos)
      this.renderer.pieceRenderer.setLastMove(-1, -1)
      this.clock.switchSide(this.engine.getTurn() === 1 ? 'white' : 'black')
      this.updateClockDisplay(this.engine.getTurn() === 1 ? 'white' : 'black')
    })

    this.ui.on('promote', (piece) => {
      this.input.resolvePromotion(piece)
    })

    this.ui.on('back-to-menu-game', () => {
      this.gameActive = false
      this.botThinking = false
      this.input.setInputEnabled(false)
      this.engine.setPaused(true)
      this.ui.showScreen('mainMenu')
    })
  }

  setupInputEvents() {
    this.input.on('move', async ({ from, to, move, animationPromise }) => {
      this.eventBus.emit('move:completed', { from, to, move })
      this.updateHUD()
      this.updateMoveList()

      if (this.gameMode === 'bot' && this.engine.getTurn() !== this.playerColor && !this.engine.getGameOver()) {
        if (animationPromise) {
          await animationPromise
        }
        this.makeBotMove()
      }
    })

    this.input.on('promotion', (pending) => {
      this.ui.showPromotion((piece) => {
        this.input.resolvePromotion(piece)
      })
    })
  }

  async startGame(mode, difficulty, timeControl) {
    this.gameMode = mode
    this.botDifficulty = difficulty
    this.timeControl = timeControl
    this.gameActive = true
    this.botThinking = false

    this.engine.init()
    this.renderer.boardRenderer.setPosition(this.engine.getPosition())
    this.renderer.pieceRenderer.setLastMove(-1, -1)

    if (timeControl > 0) {
      this.clock.configure(timeControl)
      this.clock.start('white')
      this.updateClockDisplay('white')
      this.updateClockDisplay('black')
    }

    this.ui.showScreen('gameHud')

    if (mode === 'bot') {
      this.input.setBotMode(true, this.playerColor)
      this.input.setInputEnabled(true)
      // Update player bar with actual ELO values
      const playerElo = this.elo.getRating('bot')
      const botElo = DIFFICULTY_ELO[this.botDifficulty] || 800
      const botName = DIFFICULTY_NAMES[this.botDifficulty] || 'Bot'
      this.ui.updatePlayerBar('top', botName, botElo, false)
      this.ui.updatePlayerBar('bottom', 'You', playerElo, this.playerColor === 1)
      // Reset Stockfish state for new game
      if (this.bot.ready) {
        this.bot.sendCommand('ucinewgame')
        this.bot.sendCommand('isready')
      }
      if (this.playerColor === 2) {
        this.makeBotMove()
      }
    } else {
      this.input.setBotMode(false)
      this.input.setInputEnabled(true)
    }
  }

  async makeBotMove(depth = 0) {
    if (this.botThinking || this.engine.getGameOver() || depth > 10) return
    this.botThinking = true
    this.input.setInputEnabled(false)
    const botSide = this.playerColor === 1 ? 'black' : 'white'
    this.ui.showThinking(botSide, true)

    try {
      const elo = DIFFICULTY_ELO[this.botDifficulty] || 800
      const moveStr = await this.bot.getBestMove(this.engine.getFEN(), elo, this.timeControl)
      if (!moveStr || !this.gameActive) {
        this.ui.showThinking(botSide, false)
        this.botThinking = false
        this.input.setInputEnabled(true)
        return
      }

      const FILES = 'abcdefgh'
      const RANKS = '12345678'
      const pieceMap = { q: 5, r: 4, b: 3, n: 2 }

      const fromAlg = moveStr.slice(0, 2)
      const toAlg = moveStr.slice(2, 4)
      const promotion = moveStr.length > 4 ? moveStr[4] : null
      const promoPiece = promotion ? (pieceMap[promotion] || 5) : null

      const fromSq = RANKS.indexOf(fromAlg[1]) * 8 + FILES.indexOf(fromAlg[0])
      const toSq = RANKS.indexOf(toAlg[1]) * 8 + FILES.indexOf(toAlg[0])
      const pos = this.engine.getPosition()
      const animPiece = pos.board[fromSq]
      const animColor = pos.colors[fromSq]
      const isCapture = pos.board[toSq] !== 0
      const orientation = this.renderer.boardRenderer.boardAppearance.orientation

      const result = this.engine.attemptMove(fromAlg, toAlg, promoPiece)

      if (!result.success) {
        // Stockfish returned an illegal move — fall back to a random legal move
        console.warn('Bot move failed:', moveStr, '— using fallback')
        const legalMoves = this.engine.getLegalMoves()
        if (legalMoves.length === 0) {
          this.ui.showThinking(botSide, false)
          this.botThinking = false
          this.input.setInputEnabled(true)
          return
        }
        const fallback = legalMoves[Math.floor(Math.random() * legalMoves.length)]
        const fbFrom = fallback & 0x3F
        const fbTo = (fallback >> 6) & 0x3F
        const fbResult = this.engine.attemptMove(fbFrom, fbTo)
        if (!fbResult.success) {
          this.ui.showThinking(botSide, false)
          this.botThinking = false
          this.input.setInputEnabled(true)
          return
        }
        this.input.clearSelection()
        this.updateBoardAfterMove(fbResult.move)
        this.updateHUD()
        this.updateMoveList()
      } else {
        this.input.clearSelection()
        this.updateBoardAfterMove(result.move)
        this.updateHUD()
        this.updateMoveList()

        // Animate as cosmetic overlay (engine state already committed)
        let botAnimPromise
        if (isCapture && animPiece !== 0 && animColor !== 0) {
          botAnimPromise = this.animationManager.animateCapture({
            from: fromSq, to: toSq, piece: animPiece, color: animColor,
            orientation, isCapture: true, onImpact: null
          }).catch(() => {})
        } else if (animPiece !== 0 && animColor !== 0) {
          botAnimPromise = this.animationManager.animateMove({
            from: fromSq, to: toSq, piece: animPiece, color: animColor,
            orientation, duration: 0.28
          }).catch(() => {})
        }

        // Wait for bot's animation to finish before proceeding
        if (botAnimPromise) {
          await botAnimPromise
        }
      }

      if (this.engine.getGameOver()) {
        this.clock.stop()
        this.endGame(this.engine.getGameOver())
        return
      }

      if (this.timeControl > 0 && this.gameActive) {
        const side = this.engine.getTurn() === 1 ? 'white' : 'black'
        this.clock.switchSide(side)
        this.updateClockDisplay(side)
      }
    } catch (err) {
      console.error('Bot move error:', err)
    }

    this.ui.showThinking(botSide, false)
    this.botThinking = false
    this.input.setInputEnabled(true)
  }

loop(time) {
    if (!this.running) return

    const rawDt = Math.min((time - (this._lastLoopTime || time)) / 1000, 0.1)
    this._lastLoopTime = time

    this.timeController.update(rawDt)
    const scaledDt = this.timeController.getScaledDelta(rawDt)

    // Tick clock every frame for smooth continuous updates
    if (this.gameActive && this.clock.running && this.timeControl > 0) {
      this.clock.updateFromLoop(rawDt)
      this.updateClockDisplay('white')
      this.updateClockDisplay('black')
    }

    this._accumulator = (this._accumulator || 0) + rawDt
    const FIXED_DT = 1 / 60
    const MAX_SUBSTEPS = 4
    let steps = 0

    while (this._accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
      const scaledFixedDt = FIXED_DT * this.timeController.getTimeScale()

      if (this.animationManager) {
        this.animationManager.update(FIXED_DT)
      }

      if (this.renderer.particleSystem) {
        this.renderer.particleSystem.update(FIXED_DT)
      }

      this._accumulator -= FIXED_DT
      steps++
    }

    this.renderer.render(
      this.engine,
      this.animationManager.getCamera(),
      this.animationManager.getGhostPieces?.() || [],
      this.animationManager.getTrails?.() || [],
      this.animationManager.getCaptureEffects?.() || null
    )

    if (this.postProcessing) {
      const hasActiveAnim = this.animationManager.captureEffect && !this.animationManager.captureEffect.finished
      const cam = this.animationManager.getCamera?.()
      const hasActiveCamera = cam && cam.isActive
      if (hasActiveAnim || hasActiveCamera) {
        this.postProcessing._forceRender = true
      }
      if (cam) {
        this.postProcessing.setChromatic(cam.chromaticAberration > 0.01 ? cam.chromaticAberration : 0, 0)
        this.postProcessing.setVignette(cam.vignette > 0.01 ? cam.vignette : 0)
        this.postProcessing.setScreenFlash(cam.screenFlash?.alpha > 0.01 ? cam.screenFlash.color : [255,255,255], cam.screenFlash?.alpha > 0.01 ? cam.screenFlash.alpha : 0)
        this.postProcessing.setColorGrade(cam.colorGrade?.contrast || 0, cam.colorGrade?.saturation || 0, cam.colorGrade?.brightness || 0)
      } else {
        this.postProcessing.setChromatic(0, 0)
        this.postProcessing.setVignette(0)
        this.postProcessing.setScreenFlash([255,255,255], 0)
        this.postProcessing.setColorGrade(0, 0, 0)
      }
      this.postProcessing.render(this.ctx)
      this.postProcessing._forceRender = false
    }

    if (this.renderer.particleSystem) {
      this.renderer.particleSystem.render(this.ctx)
    }

    requestAnimationFrame((t) => this.loop(t))
  }

  resize() {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.canvas.style.width = window.innerWidth + 'px'
    this.canvas.style.height = window.innerHeight + 'px'
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.renderer?.resize(window.innerWidth, window.innerHeight)
    if (this.animationManager) {
      this.animationManager.resize(window.innerWidth, window.innerHeight)
    }
    if (this.postProcessing) {
      this.postProcessing.resize(window.innerWidth, window.innerHeight)
    }
  }

  updateHUD() {
    const history = this.engine.getHistory()
    let whiteCaptured = 0
    let blackCaptured = 0
    for (let i = 0; i < history.length; i++) {
      const entry = history[i]
      if (entry.move && entry.move.captured) {
        if (i % 2 === 0) {
          blackCaptured++
        } else {
          whiteCaptured++
        }
      }
    }
    this.ui.updateCaptured('white', whiteCaptured)
    this.ui.updateCaptured('black', blackCaptured)
    this.ui.updateTurn(this.engine.getTurn() === 1 ? 'white' : 'black')
  }

  updateMoveList() {
    const history = this.engine.getHistory()
    const sans = history.map(h => h.move?.san || '')
    this.ui.updateMoveList(sans)
  }

  updateClockDisplay(side) {
    const time = side === 'white' ? this.clock.whiteTime : this.clock.blackTime
    this.ui.updateClock(side, time)
  }

  updateBoardAfterMove(moveResult) {
    this.renderer.boardRenderer.setLastMove(moveResult.from, moveResult.to)
    this.renderer.pieceRenderer.setLastMove(moveResult.from, moveResult.to)

    if (this.engine.isInCheck()) {
      const pos = this.engine.getPosition()
      const kingSq = this.findKing(pos, this.engine.getTurn())
      this.renderer.boardRenderer.setCheck(kingSq)
      this.renderer.pieceRenderer.setCheck(kingSq)
    } else {
      this.renderer.boardRenderer.setCheck(-1)
      this.renderer.pieceRenderer.setCheck(null)
    }
  }

  findKing(pos, color) {
    for (let sq = 0; sq < 64; sq++) {
      if (pos.board[sq] === 6 && pos.colors[sq] === color) return sq
    }
    return -1
  }

  endGame(gameOver) {
    this.gameActive = false
    this.input.setInputEnabled(false)

    let result, winner, title, detail

    if (gameOver.result === 'checkmate') {
      winner = gameOver.winner
      const winnerName = winner === 'white' ? 'White' : 'Black'
      title = 'Checkmate!'
      detail = `${winnerName} wins!`

      if (this.gameMode === 'bot') {
        const playerWon = (winner === 'white' && this.playerColor === 1) ||
                          (winner === 'black' && this.playerColor === 2)
        result = playerWon ? 'win' : 'loss'
      } else {
        result = winner === 'white' ? 'white-win' : 'black-win'
      }
    } else if (gameOver.result === 'resignation') {
      winner = gameOver.winner
      const winnerName = winner === 'white' ? 'White' : 'Black'
      title = 'Resignation'
      detail = `${winnerName} wins by resignation`

      if (this.gameMode === 'bot') {
        const playerWon = (winner === 'white' && this.playerColor === 1) ||
                          (winner === 'black' && this.playerColor === 2)
        result = playerWon ? 'win' : 'loss'
      } else {
        result = winner === 'white' ? 'white-win' : 'black-win'
      }
    } else if (gameOver.result === 'timeout') {
      winner = gameOver.winner
      const winnerName = winner === 'white' ? 'White' : 'Black'
      title = 'Timeout'
      detail = `${winnerName} wins on time`

      if (this.gameMode === 'bot') {
        const playerWon = (winner === 'white' && this.playerColor === 1) ||
                          (winner === 'black' && this.playerColor === 2)
        result = playerWon ? 'win' : 'loss'
      } else {
        result = winner === 'white' ? 'white-win' : 'black-win'
      }
    } else {
      title = 'Draw'
      detail = gameOver.reason || 'Game drawn'
      result = 'draw'
    }

    let ratingChange = 0
    if (this.gameMode === 'bot') {
      const opponentElo = this.botDifficulty ? (DIFFICULTY_ELO[this.botDifficulty] || 800) : 800
      const { change, newRating } = this.elo.updateRatings('bot', result, opponentElo)
      ratingChange = change
      this.updateMenuElo()
    }

    const match = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mode: this.gameMode,
      difficulty: this.botDifficulty,
      timeControl: this.timeControl,
      playerColor: this.playerColor,
      result,
      moves: this.engine.getHistory(),
      winner
    }
    this.matchHistory.addMatch(match)

    this.ui.showGameOver({ title, detail, result }, ratingChange, this.elo.getRating(this.gameMode || 'bot'))
  }

  showHistory(filter = null) {
    const matches = this.matchHistory.getMatches(filter)
    const stats = this.matchHistory.getStats()
    this.ui.renderHistory(matches, stats)
  }

  startReplay(match) {
    this.replayMatch = match
    this.replayIndex = -1
    this.replayPlaying = false
    this.engine.init()
    this.renderer.boardRenderer.setPosition(this.engine.getPosition())
    this.ui.showScreen('replay')
    this.ui.updateReplayInfo(match)
  }

  replayStep(direction) {
    if (!this.replayMatch) return
    this.replayIndex += direction
    this.replayIndex = Math.max(-1, Math.min(this.replayMatch.moves.length - 1, this.replayIndex))
    this.replayToIndex()
  }

  replayGoStart() {
    if (!this.replayMatch) return
    this.replayIndex = -1
    this.replayToIndex()
  }

  replayGoEnd() {
    if (!this.replayMatch) return
    this.replayIndex = this.replayMatch.moves.length - 1
    this.replayToIndex()
  }

  replayTogglePlay() {
    if (!this.replayMatch) return
    this.replayPlaying = !this.replayPlaying
    if (this.replayPlaying) {
      this.replayLoop()
    }
  }

  async replayLoop() {
    while (this.replayPlaying && this.replayIndex < this.replayMatch.moves.length - 1) {
      await new Promise(r => setTimeout(r, 500))
      if (!this.replayPlaying) break
      this.replayStep(1)
    }
    this.replayPlaying = false
  }

  replayToIndex() {
    this.engine.init()
    for (let i = 0; i <= this.replayIndex; i++) {
      const move = this.replayMatch.moves[i]
      this.engine.attemptMove(move.from, move.to, move.promotion)
    }
    this.renderer.boardRenderer.setPosition(this.engine.getPosition())
    this.ui.updateReplayProgress(this.replayIndex, this.replayMatch.moves.length)
  }

  exitReplay() {
    this.replayMatch = null
    this.replayIndex = -1
    this.replayPlaying = false
    this.ui.showScreen('history')
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search)
    if (params.has('replay')) {
      const match = this.matchHistory.getMatch(params.get('replay'))
      if (match) this.startReplay(match)
    }
  }

  updateMenuElo() {
    const rating = this.elo.getRating(this.gameMode || 'bot')
    this.ui.updateElo(rating)
  }
}

const game = new Game()
game.init().catch(console.error)

window.game = game

export { game }