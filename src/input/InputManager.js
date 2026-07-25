import { EventBus } from '../utils/EventBus.js'
import { Square, Piece } from '../core/ChessTypes.js'
import { CaptureTier, resolveCaptureTier } from '../animation/CaptureAnimations.js'

export class InputManager extends EventBus {
  constructor(canvas, engine, renderer, animationManager) {
    super()
    this.canvas = canvas
    this.engine = engine
    this.renderer = renderer
    this.animationManager = animationManager
    this.selectedSquare = -1
    this.legalMoves = []
    this.promotionPending = null
    this.playerColor = 1
    this.botMode = false
    this.inputEnabled = true
    this.setupListeners()
  }

  setupListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.handleClick(e))
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (e.touches.length === 1) this.handleClick(e.touches[0])
    }, { passive: false })
  }

  setBotMode(enabled, playerColor = 1) {
    this.botMode = enabled
    this.playerColor = playerColor
  }

  setInputEnabled(enabled) {
    this.inputEnabled = enabled
    if (!enabled) this.clearSelection()
  }

  handleClick(e) {
    if (!this.inputEnabled) return
    if (this.engine.getGameOver()) return
    if (this.promotionPending) return

    if (this.botMode && this.engine.getTurn() !== this.playerColor) return

    // DPR FIX: Use CSS coordinates directly since CanvasRenderer uses ctx.setTransform
    // for DPR scaling. The canvas internal dimensions include DPR, but setTransform
    // already handles that. We just need CSS-pixel coordinates.
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const { boardOffsetX, boardOffsetY, squareSize } = this.renderer.canvasRenderer
    const orientation = this.renderer.boardRenderer.boardAppearance.orientation

    const file = Math.floor((x - boardOffsetX) / squareSize)
    const rank = Math.floor((y - boardOffsetY) / squareSize)

    if (file < 0 || file > 7 || rank < 0 || rank > 7) return

    let sq
    if (orientation === 1) {
      sq = (7 - rank) * 8 + file
    } else {
      sq = rank * 8 + (7 - file)
    }

    const pos = this.engine.getPosition()
    const piece = pos.board[sq]
    const color = pos.colors[sq]
    const turn = this.engine.getTurn()

    if (this.selectedSquare !== -1) {
      const isLegal = this.legalMoves.some(m => m.to === sq)
      if (isLegal) {
        this.executeMove(this.selectedSquare, sq)
        return
      }
    }

    if (piece !== Piece.NONE && color === turn) {
      this.selectPiece(sq)
    } else {
      this.clearSelection()
    }
  }

  selectPiece(sq) {
    this.selectedSquare = sq
    const rawMoves = this.engine.getLegalMoves(sq)
    this.legalMoves = rawMoves.map(m => ({
      from: m & 0x3F,
      to: (m >> 6) & 0x3F,
      flags: (m >> 12) & 0xF,
      promotion: (m >> 16) & 0x7
    }))

    this.renderer.boardRenderer.setSelected(sq)
    this.renderer.boardRenderer.setLegalMoves(this.legalMoves)
    this.renderer.pieceRenderer.setSelectedSquare(sq)
    this.renderer.pieceRenderer.setLegalMoves(this.legalMoves)
  }

  clearSelection() {
    this.selectedSquare = -1
    this.legalMoves = []
    this.renderer.boardRenderer.setSelected(-1)
    this.renderer.boardRenderer.setLegalMoves([])
    this.renderer.pieceRenderer.setSelectedSquare(null)
    this.renderer.pieceRenderer.setLegalMoves([])
  }

  async executeMove(from, to, promotionPiece = null) {
    if (!promotionPiece) {
      promotionPiece = this.getPromotionPiece(from, to)
    }

    const pos = this.engine.getPosition()
    const piece = pos.board[from]
    const color = pos.colors[from]
    const orientation = this.renderer.boardRenderer.boardAppearance.orientation

    // Detect captures including en passant
    // En passant: target square is empty but the captured pawn is on a different square
    const isNormalCapture = pos.board[to] !== Piece.NONE
    const isEnPassant = piece === Piece.PAWN && pos.board[to] === Piece.NONE &&
      Math.abs((from % 8) - (to % 8)) === 1 && Math.abs(Math.floor(from / 8) - Math.floor(to / 8)) === 1
    const isCapture = isNormalCapture || isEnPassant

    // Capture victim info BEFORE engine move changes the board
    const victimPiece = isNormalCapture ? pos.board[to] : isEnPassant ? Piece.PAWN : 0
    const victimColor = isNormalCapture ? pos.colors[to] : isEnPassant ? (color === 1 ? 2 : 1) : 0

    // Clear any leftover ghost pieces from previous animations
    this.renderer.pieceRenderer.ghostPiece = null
    this.renderer.pieceRenderer.victimGhostPiece = null

    // Execute engine move first
    let result
    if (promotionPiece && piece === Piece.PAWN) {
      const isPromoRank = (color === 1 && to >= 56) || (color === 2 && to <= 7)
      if (isPromoRank) {
        result = this.engine.attemptMove(from, to, promotionPiece)
      } else {
        result = this.engine.attemptMove(from, to, null)
      }
    } else {
      result = this.engine.attemptMove(from, to, promotionPiece)
    }

    if (!result.success) {
      this.clearSelection()
      return
    }

    // Handle promotion dialog
    if (result.promotion && result.pending) {
      this.promotionPending = { from, to }
      this.emit('promotion', result.pending)
      return
    }

    // Update board state immediately
    this.clearSelection()
    this.updateBoardAfterMove(result.move)

    // Animate as cosmetic overlay (engine state already committed)
    let animationPromise
    if (isCapture) {
      animationPromise = this.animationManager.animateCapture({
        from, to, piece, color, orientation, isCapture: true,
        victimPiece, victimColor,
        onImpact: null
      }).catch(() => {})
    } else {
      animationPromise = this.animationManager.animateMove({
        from, to, piece, color, orientation, duration: 0.28
      }).catch(() => {})
    }
    this.currentAnimation = animationPromise
    this.emit('move', { from, to, move: result.move, animationPromise })
  }

  resolvePromotion(pieceChar) {
    if (!this.promotionPending) return
    const { from, to } = this.promotionPending
    this.promotionPending = null

    const pos = this.engine.getPosition()
    const piece = pos.board[from]
    const color = pos.colors[from]
    const isCapture = pos.board[to] !== Piece.NONE
    const victimPiece = isCapture ? pos.board[to] : 0
    const victimColor = isCapture ? pos.colors[to] : 0
    const orientation = this.renderer.boardRenderer.boardAppearance.orientation

    const pieceMap = { q: Piece.QUEEN, r: Piece.ROOK, b: Piece.BISHOP, n: Piece.KNIGHT }
    const promotionPiece = pieceMap[pieceChar] || Piece.QUEEN

    const result = this.engine.attemptMove(from, to, promotionPiece)
    if (result.success) {
      this.clearSelection()
      this.updateBoardAfterMove(result.move)

      let animationPromise
      if (isCapture) {
        animationPromise = this.animationManager.animateCapture({
          from, to, piece, color, orientation, isCapture: true,
          victimPiece, victimColor,
          onImpact: null
        }).catch(() => {})
      } else {
        animationPromise = this.animationManager.animateMove({
          from, to, piece, color, orientation, duration: 0.28
        }).catch(() => {})
      }
      this.currentAnimation = animationPromise
      this.emit('move', { from, to, move: result.move, animationPromise })
    }
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
      if (pos.board[sq] === Piece.KING && pos.colors[sq] === color) return sq
    }
    return -1
  }

  getPromotionPiece(from, to) {
    const pos = this.engine.getPosition()
    const piece = pos.board[from]
    if (piece !== Piece.PAWN) return null
    const color = pos.colors[from]
    const isPromotionRank = (color === 1 && to >= 56) || (color === 2 && to <= 7)
    if (!isPromotionRank) return null
    return Piece.QUEEN
  }
}
