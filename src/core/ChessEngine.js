import { Chess } from 'chess.js'
import { EventBus } from '../utils/EventBus.js'
import { Piece, Color, Square } from './ChessTypes.js'

const FILES = 'abcdefgh'
const RANKS = '12345678'

function algebraicToIndex(alg) {
  const file = FILES.indexOf(alg[0])
  const rank = RANKS.indexOf(alg[1])
  return rank * 8 + file
}

function indexToAlgebraic(index) {
  const file = index % 8
  const rank = Math.floor(index / 8)
  return FILES[file] + RANKS[rank]
}

const PIECE_MAP = {
  'p': 1, 'n': 2, 'b': 3, 'r': 4, 'q': 5, 'k': 6
}

export class ChessEngine extends EventBus {
  constructor() {
    super()
    this.chess = new Chess()
    this.history = []
    this.orientation = 'white'
    this.promotionPending = null
    this.lastMove = null
    this.paused = false
  }

  init(fen = null) {
    if (fen) {
      this.chess.load(fen)
    } else {
      this.chess.reset()
    }
    this.history = []
    this.promotionPending = null
    this.lastMove = null
    this.emit('position', this.getPosition())
  }

  getPosition() {
    const board = new Array(64).fill(0)
    const colors = new Array(64).fill(0)
    
    for (let i = 0; i < 64; i++) {
      const square = indexToAlgebraic(i)
      const piece = this.chess.get(square)
      if (piece) {
        board[i] = PIECE_MAP[piece.type.toLowerCase()]
        colors[i] = piece.color === 'w' ? 1 : 2
      }
    }
    
    return {
      board,
      colors,
      turn: this.chess.turn() === 'w' ? 1 : 2,
      castling: this.getCastlingRights(),
      enPassant: this.getEnPassantSquare(),
      halfmove: this.chess._halfMoves ?? 0,
      fullmove: this.chess.moveNumber(),
      fen: this.chess.fen()
    }
  }

  getFEN() {
    return this.chess.fen()
  }

  getTurn() {
    return this.chess.turn() === 'w' ? 1 : 2
  }

  getHistory() {
    return [...this.history]
  }

  setPaused(paused) {
    this.paused = !!paused
  }

  getGameOver() {
    if (this.chess.isGameOver()) {
      if (this.chess.isCheckmate()) {
        return { result: 'checkmate', winner: this.chess.turn() === 'w' ? 'black' : 'white' }
      }
      if (this.chess.isStalemate()) return { result: 'stalemate' }
      if (this.chess.isThreefoldRepetition()) return { result: 'repetition' }
      if (this.chess.isInsufficientMaterial()) return { result: 'insufficient-material' }
      if (this.chess.isDraw()) return { result: 'draw' }
    }
    return null
  }

  attemptMove(from, to, promotion = null) {
    if (this.paused) return { success: false, reason: 'paused' }
    
    if (this.promotionPending) {
      if (!promotion) return { success: false, reason: 'promotion required' }
      return this.resolvePromotion(promotion)
    }

    const fromSquare = typeof from === 'string' ? from : indexToAlgebraic(from)
    const toSquare = typeof to === 'string' ? to : indexToAlgebraic(to)
    
    const moves = this.chess.moves({ square: fromSquare, verbose: true })
    const move = moves.find(m => m.to === toSquare)
    
    if (!move) return { success: false, reason: 'illegal' }
    
    if (move.promotion && !promotion) {
      this.promotionPending = { from: algebraicToIndex(fromSquare), to: algebraicToIndex(toSquare), move }
      this.emit('promotion', { from: algebraicToIndex(fromSquare), to: algebraicToIndex(toSquare) })
      return { success: true, promotion: true, pending: { from: algebraicToIndex(fromSquare), to: algebraicToIndex(toSquare) } }
    }
    
    return this.makeMove(move, promotion || move.promotion)
  }

  resolvePromotion(promotion) {
    if (!this.promotionPending) return { success: false }
    const { move } = this.promotionPending
    this.promotionPending = null
    return this.makeMove(move, promotion)
  }

  makeMove(move, promotion = null) {
    const from = algebraicToIndex(move.from)
    const to = algebraicToIndex(move.to)
    const capturedPiece = move.captured ? PIECE_MAP[move.captured] : 0
    const isCapture = !!move.captured
    const isPromotion = !!move.promotion
    
    const san = this.chess.move(move)
    if (!san) return { success: false, reason: 'illegal' }
    
    this.lastMove = { from, to }
    this.history.push({ 
      position: this.getPosition(), 
      move: { from, to, piece: PIECE_MAP[move.piece], captured: capturedPiece, promotion: isPromotion ? PIECE_MAP[promotion || move.promotion] : 0, san } 
    })
    
    const moveData = {
      from, to,
      piece: PIECE_MAP[move.piece],
      captured: isCapture ? capturedPiece : 0,
      promotion: isPromotion ? PIECE_MAP[promotion || move.promotion] : 0,
      san
    }
    
    this.emit('move', moveData)
    if (isCapture) this.emit('capture', moveData)
    if (this.chess.inCheck()) this.emit('check', this.chess.turn() === 'w' ? 1 : 2)
    
    const gameOver = this.getGameOver()
    if (gameOver) this.emit('gameover', gameOver)
    
    this.emit('position', this.getPosition())
    return { success: true, move: moveData }
  }

  undo() {
    if (this.history.length === 0) return false
    const last = this.history.pop()
    this.chess.undo()
    this.emit('position', this.getPosition())
    this.emit('undo', last.move)
    return true
  }

  getLegalMoves(square = null) {
    const squareArg = square !== null ? indexToAlgebraic(square) : undefined
    const moves = this.chess.moves({ square: squareArg, verbose: true })
    return moves.map(m => {
      const from = algebraicToIndex(m.from)
      const to = algebraicToIndex(m.to)
      const flags = m.flags === 'b' ? 2 : m.flags === 'c' || m.flags === 'x' ? 1 : 0
      const promotion = m.promotion ? PIECE_MAP[m.promotion] : 0
      return from | (to << 6) | (flags << 12) | (promotion << 16)
    })
  }

  isInCheck(color = null) {
    // If color is specified, check if that specific color's king is in check
    // Otherwise check if the current turn's side is in check
    if (color !== null) {
      // Temporarily check the specified color
      const turn = this.chess.turn()
      const targetColor = color === 1 || color === Color.WHITE ? 'w' : 'b'
      if (turn === targetColor) {
        return this.chess.inCheck()
      }
      // For the non-current turn, we need to check if their king is attacked
      // This means checking if the current turn's pieces attack the enemy king
      // chess.js doesn't support this directly, so we check the FEN
      const fen = this.chess.fen()
      const tempChess = new Chess(fen)
      // Flip the turn to the target color
      const modifiedFen = fen.replace(/ [wb] /, ` ${targetColor} `)
      try {
        tempChess.load(modifiedFen)
        return tempChess.inCheck()
      } catch {
        return false
      }
    }
    return this.chess.inCheck()
  }

  pieceTypeToIndex(type) {
    const map = { 'p': 1, 'n': 2, 'b': 3, 'r': 4, 'q': 5, 'k': 6 }
    return map[type.toLowerCase()] || 0
  }

  getCastlingRights() {
    const fen = this.chess.fen()
    const parts = fen.split(' ')
    return parts[2] || '-'
  }

  getEnPassantSquare() {
    // chess.js v1.4.0 doesn't have a public epSquare getter
    // Parse from FEN instead
    const fen = this.chess.fen()
    const parts = fen.split(' ')
    const epStr = parts[3]
    if (epStr && epStr !== '-') {
      return algebraicToIndex(epStr)
    }
    return -1
  }

  flip() {
    this.orientation = this.orientation === 'white' ? 'black' : 'white'
    this.emit('flip', this.orientation)
  }
}
