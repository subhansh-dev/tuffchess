import { 
  Piece, Color, Square, MoveFlag,
  algebraicToSquare, squareToAlgebraic, makeMove, getMoveFrom, getMoveTo,
  isValidSquare, sameFile, sameRank,
  KNIGHT_OFFSETS, KING_OFFSETS, PAWN_ATTACKS, BISHOP_DIRS, ROOK_DIRS
} from './ChessTypes.js'

class MoveGenerator {
  generate(position) {
    const moves = []
    const turn = position.turn
    const enemyColor = turn === Color.WHITE ? Color.BLACK : Color.WHITE
    const pawnDir = turn === Color.WHITE ? 8 : -8
    const startRank = turn === Color.WHITE ? 1 : 6
    const promoRank = turn === Color.WHITE ? 7 : 0

    this.pinned = new Uint8Array(64)
    this.pinDirection = new Int8Array(64)  // Store direction from king to attacker
    this.computePins(position, turn)

    for (let sq = 0; sq < 64; sq++) {
      if (position.colors[sq] !== turn) continue
      const piece = position.board[sq]
      
      switch (piece) {
        case Piece.PAWN: this.generatePawnMoves(position, sq, moves, turn, enemyColor, pawnDir, startRank, promoRank); break
        case Piece.KNIGHT: this.generateKnightMoves(position, sq, moves, turn, enemyColor); break
        case Piece.BISHOP: this.generateBishopMoves(position, sq, moves, turn, enemyColor); break
        case Piece.ROOK: this.generateRookMoves(position, sq, moves, turn, enemyColor); break
        case Piece.QUEEN: this.generateQueenMoves(position, sq, moves, turn, enemyColor); break
        case Piece.KING: this.generateKingMoves(position, sq, moves, turn, enemyColor); break
      }
    }
    return moves
  }

  computePins(position, color) {
    const kingSq = this.findKing(position, color)
    if (kingSq === -1) return
    
    const enemyColor = color === Color.WHITE ? Color.BLACK : Color.WHITE
    
    // Diagonal pin directions
    for (const dir of BISHOP_DIRS) {
      let sq = kingSq + dir
      let pinnedSq = -1
      while (isValidSquare(sq)) {
        // Check board edge wrapping for diagonal moves
        const prevSq = sq - dir
        const prevFile = prevSq % 8
        const prevRank = Math.floor(prevSq / 8)
        const currFile = sq % 8
        const currRank = Math.floor(sq / 8)
        if (Math.abs(currFile - prevFile) !== 1 || Math.abs(currRank - prevRank) !== 1) break
        
        const piece = position.board[sq]
        const pc = position.colors[sq]
        if (piece !== Piece.NONE) {
          if (pc === color && pinnedSq === -1) {
            pinnedSq = sq
            // Store pin direction: the direction FROM king TO pinning attacker
            this.pinned[pinnedSq] = 1
            this.pinDirection[pinnedSq] = dir
          } else {
            if (pc === enemyColor && (piece === Piece.BISHOP || piece === Piece.QUEEN)) {
              // Valid pin — pin direction is already set
            } else {
              // Pinned piece blocked by friendly piece, or attacker is wrong piece type
              if (pinnedSq !== -1) {
                this.pinned[pinnedSq] = 0
                this.pinDirection[pinnedSq] = 0
              }
            }
            break
          }
        }
        sq += dir
      }
    }

    // Straight pin directions (rook/queen)
    for (const dir of ROOK_DIRS) {
      let sq = kingSq + dir
      let pinnedSq = -1
      while (isValidSquare(sq)) {
        // Check board edge wrapping for straight moves
        if (dir === -1 || dir === 1) {
          if (!sameRank(sq, sq - dir)) break
        }
        if (dir === -8 || dir === 8) {
          if (!sameFile(sq, sq - dir)) break
        }
        const piece = position.board[sq]
        const pc = position.colors[sq]
        if (piece !== Piece.NONE) {
          if (pc === color && pinnedSq === -1) {
            pinnedSq = sq
            this.pinned[pinnedSq] = 1
            this.pinDirection[pinnedSq] = dir
          } else {
            if (pc === enemyColor && (piece === Piece.ROOK || piece === Piece.QUEEN)) {
              // Valid pin
            } else {
              if (pinnedSq !== -1) {
                this.pinned[pinnedSq] = 0
                this.pinDirection[pinnedSq] = 0
              }
            }
            break
          }
        }
        sq += dir
      }
    }
  }

  findKing(position, color) {
    for (let i = 0; i < 64; i++) {
      if (position.board[i] === Piece.KING && position.colors[i] === color) return i
    }
    return -1
  }

  generatePawnMoves(position, sq, moves, turn, enemyColor, pawnDir, startRank, promoRank) {
    const rank = Math.floor(sq / 8)
    const file = sq % 8
    const pinned = this.pinned[sq]
    const canMoveDir = !pinned || this.isMoveAlongPin(sq, pawnDir)
    const canMoveDiag = !pinned || this.isMoveAlongPin(sq, pawnDir - 1) || this.isMoveAlongPin(sq, pawnDir + 1)

    const oneStep = sq + pawnDir
    const oneStepRank = Math.floor(oneStep / 8)
    if (isValidSquare(oneStep) && position.board[oneStep] === Piece.NONE && canMoveDir) {
      if (oneStepRank === promoRank) {
        this.addPromotions(moves, sq, oneStep, turn)
      } else {
        moves.push(makeMove(sq, oneStep, MoveFlag.QUIET))
        if (rank === startRank) {
          const twoStep = sq + pawnDir * 2
          if (position.board[twoStep] === Piece.NONE) {
            moves.push(makeMove(sq, twoStep, MoveFlag.DOUBLE_PAWN))
          }
        }
      }
    }

    for (const offset of PAWN_ATTACKS[turn]) {
      const target = sq + offset
      const targetRank = Math.floor(target / 8)
      if (!isValidSquare(target)) continue
      // Validate the target is one file away from the pawn (diagonal move)
      const sqFile = sq % 8
      const targetFile = target % 8
      if (Math.abs(sqFile - targetFile) !== 1) continue
      const targetPiece = position.board[target]
      if (targetPiece !== Piece.NONE && position.colors[target] === enemyColor && canMoveDiag) {
        if (targetRank === promoRank) {
          this.addPromoCaptures(moves, sq, target, turn)
        } else {
          moves.push(makeMove(sq, target, MoveFlag.CAPTURE))
        }
      }
    }

    if (position.enPassant !== Square.NONE && canMoveDiag) {
      for (const offset of PAWN_ATTACKS[turn]) {
        const target = sq + offset
        if (target === position.enPassant) {
          moves.push(makeMove(sq, target, MoveFlag.EN_PASSANT))
        }
      }
    }
  }

  addPromotions(moves, from, to, turn) {
    moves.push(makeMove(from, to, MoveFlag.PROMOTION, Piece.QUEEN))
    moves.push(makeMove(from, to, MoveFlag.PROMOTION, Piece.ROOK))
    moves.push(makeMove(from, to, MoveFlag.PROMOTION, Piece.BISHOP))
    moves.push(makeMove(from, to, MoveFlag.PROMOTION, Piece.KNIGHT))
  }

  addPromoCaptures(moves, from, to, turn) {
    moves.push(makeMove(from, to, MoveFlag.PROMO_CAPTURE, Piece.QUEEN))
    moves.push(makeMove(from, to, MoveFlag.PROMO_CAPTURE, Piece.ROOK))
    moves.push(makeMove(from, to, MoveFlag.PROMO_CAPTURE, Piece.BISHOP))
    moves.push(makeMove(from, to, MoveFlag.PROMO_CAPTURE, Piece.KNIGHT))
  }

  isMoveAlongPin(sq, dir) {
    // If piece is not pinned, any direction is allowed
    if (this.pinned[sq] === 0) return true
    // If piece IS pinned, only moves along the pin axis are allowed
    const pinDir = this.pinDirection[sq]
    // A move is along the pin if its direction is the same or opposite as the pin
    // Pin direction goes from king toward the attacker
    // Move direction must go either toward the attacker or back toward the king
    return dir === pinDir || dir === -pinDir
  }

  generateSlidingMoves(position, sq, moves, turn, enemyColor, dirs) {
    const isPinned = this.pinned[sq] === 1
    const pinDir = this.pinDirection[sq]
    
    for (const dir of dirs) {
      // If pinned, only allow moves along the pin axis
      if (isPinned && dir !== pinDir && dir !== -pinDir) continue
      
      let target = sq + dir
      while (isValidSquare(target)) {
        // Validate board edge wrapping
        const prevFile = (target - dir) % 8
        const currFile = target % 8
        const prevRank = Math.floor((target - dir) / 8)
        const currRank = Math.floor(target / 8)
        
        // Horizontal moves must stay on same rank
        if ((dir === -1 || dir === 1) && currRank !== prevRank) break
        // Vertical moves must stay on same file
        if ((dir === -8 || dir === 8) && currFile !== prevFile) break
        // Diagonal moves must change both rank and file by exactly 1
        if (Math.abs(dir) === 7 || Math.abs(dir) === 9) {
          if (Math.abs(currFile - prevFile) !== 1 || Math.abs(currRank - prevRank) !== 1) break
        }
        
        const piece = position.board[target]
        const pc = position.colors[target]
        if (piece !== Piece.NONE) {
          if (pc === enemyColor) {
            moves.push(makeMove(sq, target, MoveFlag.CAPTURE))
          }
          break
        }
        moves.push(makeMove(sq, target, MoveFlag.QUIET))
        target += dir
      }
    }
  }

  generateKnightMoves(position, sq, moves, turn, enemyColor) {
    for (const offset of KNIGHT_OFFSETS) {
      const target = sq + offset
      if (!isValidSquare(target)) continue
      if (!sameFile(sq, target) && !sameRank(sq, target)) {
        const fromFile = sq % 8
        const targetFile = target % 8
        if (Math.abs(fromFile - targetFile) > 2) continue
      }
      const piece = position.board[target]
      const pc = position.colors[target]
      if (piece === Piece.NONE) {
        moves.push(makeMove(sq, target, MoveFlag.QUIET))
      } else if (pc === enemyColor) {
        moves.push(makeMove(sq, target, MoveFlag.CAPTURE))
      }
    }
  }

  generateBishopMoves(position, sq, moves, turn, enemyColor) {
    this.generateSlidingMoves(position, sq, moves, turn, enemyColor, BISHOP_DIRS)
  }

  generateRookMoves(position, sq, moves, turn, enemyColor) {
    this.generateSlidingMoves(position, sq, moves, turn, enemyColor, ROOK_DIRS)
  }

  generateQueenMoves(position, sq, moves, turn, enemyColor) {
    this.generateSlidingMoves(position, sq, moves, turn, enemyColor, [...BISHOP_DIRS, ...ROOK_DIRS])
  }

  generateKingMoves(position, sq, moves, turn, enemyColor) {
    for (const offset of KING_OFFSETS) {
      const target = sq + offset
      if (!isValidSquare(target)) continue
      if (!sameFile(sq, target) && !sameRank(sq, target)) {
        if (Math.abs((sq % 8) - (target % 8)) > 1) continue
      }
      const piece = position.board[target]
      const pc = position.colors[target]
      if (piece === Piece.NONE || pc === enemyColor) {
        const flag = piece === Piece.NONE ? MoveFlag.QUIET : MoveFlag.CAPTURE
        moves.push(makeMove(sq, target, flag))
      }
    }

    if (!this.isSquareAttacked(position, sq, enemyColor)) {
      if (turn === Color.WHITE) {
        if (position.castling.includes('K') && this.canCastleKingSide(position, turn)) {
          moves.push(makeMove(sq, sq + 2, MoveFlag.CASTLE_KING))
        }
        if (position.castling.includes('Q') && this.canCastleQueenSide(position, turn)) {
          moves.push(makeMove(sq, sq - 2, MoveFlag.CASTLE_QUEEN))
        }
      } else {
        if (position.castling.includes('k') && this.canCastleKingSide(position, turn)) {
          moves.push(makeMove(sq, sq + 2, MoveFlag.CASTLE_KING))
        }
        if (position.castling.includes('q') && this.canCastleQueenSide(position, turn)) {
          moves.push(makeMove(sq, sq - 2, MoveFlag.CASTLE_QUEEN))
        }
      }
    }
  }

  canCastleKingSide(position, color) {
    const rank = color === Color.WHITE ? 0 : 7
    const sq1 = rank * 8 + 5, sq2 = rank * 8 + 6
    return position.board[sq1] === Piece.NONE && 
           position.board[sq2] === Piece.NONE &&
           !this.isSquareAttacked(position, sq1, color === Color.WHITE ? Color.BLACK : Color.WHITE) &&
           !this.isSquareAttacked(position, sq2, color === Color.WHITE ? Color.BLACK : Color.WHITE)
  }

  canCastleQueenSide(position, color) {
    const rank = color === Color.WHITE ? 0 : 7
    const sq1 = rank * 8 + 1, sq2 = rank * 8 + 2, sq3 = rank * 8 + 3
    return position.board[sq1] === Piece.NONE && 
           position.board[sq2] === Piece.NONE &&
           position.board[sq3] === Piece.NONE &&
           !this.isSquareAttacked(position, sq2, color === Color.WHITE ? Color.BLACK : Color.WHITE) &&
           !this.isSquareAttacked(position, sq3, color === Color.WHITE ? Color.BLACK : Color.WHITE)
  }

  isSquareAttacked(position, sq, byColor) {
    const enemyPawn = byColor === Color.WHITE ? Piece.PAWN : Piece.PAWN
    const pawnAttacks = PAWN_ATTACKS[byColor]
    
    for (const offset of pawnAttacks) {
      const attackSq = sq + offset
      if (isValidSquare(attackSq) && position.board[attackSq] === Piece.PAWN && position.colors[attackSq] === byColor) {
        if (!sameFile(sq, attackSq)) return true
      }
    }

    for (const offset of KNIGHT_OFFSETS) {
      const attackSq = sq + offset
      if (!isValidSquare(attackSq)) continue
      if (!sameFile(sq, attackSq) && !sameRank(sq, attackSq)) {
        if (Math.abs((sq % 8) - (attackSq % 8)) > 2) continue
      }
      if (position.board[attackSq] === Piece.KNIGHT && position.colors[attackSq] === byColor) return true
    }

    for (const dir of BISHOP_DIRS) {
      let attackSq = sq + dir
      while (isValidSquare(attackSq)) {
        const piece = position.board[attackSq]
        const pc = position.colors[attackSq]
        if (piece !== Piece.NONE) {
          if (pc === byColor && (piece === Piece.BISHOP || piece === Piece.QUEEN)) return true
          break
        }
        attackSq += dir
      }
    }

    for (const dir of ROOK_DIRS) {
      let attackSq = sq + dir
      while (isValidSquare(attackSq)) {
        if ((dir === -1 || dir === 1) && !sameRank(attackSq, attackSq - dir)) break
        const piece = position.board[attackSq]
        const pc = position.colors[attackSq]
        if (piece !== Piece.NONE) {
          if (pc === byColor && (piece === Piece.ROOK || piece === Piece.QUEEN)) return true
          break
        }
        attackSq += dir
      }
    }

    for (const offset of KING_OFFSETS) {
      const attackSq = sq + offset
      if (isValidSquare(attackSq) && position.board[attackSq] === Piece.KING && position.colors[attackSq] === byColor) return true
    }

    return false
  }
}

export const moveGenerator = new MoveGenerator()