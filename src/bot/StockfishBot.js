const ELO_TO_SKILL = [
  { minElo: 0,    skill: 0,  depth: 1,  movetime: 800  },
  { minElo: 200,  skill: 1,  depth: 1,  movetime: 900  },
  { minElo: 400,  skill: 2,  depth: 2,  movetime: 1000 },
  { minElo: 500,  skill: 3,  depth: 2,  movetime: 1000 },
  { minElo: 600,  skill: 4,  depth: 3,  movetime: 1100 },
  { minElo: 700,  skill: 5,  depth: 3,  movetime: 1100 },
  { minElo: 800,  skill: 6,  depth: 4,  movetime: 1200 },
  { minElo: 900,  skill: 7,  depth: 4,  movetime: 1200 },
  { minElo: 1000, skill: 8,  depth: 5,  movetime: 1300 },
  { minElo: 1100, skill: 9,  depth: 5,  movetime: 1300 },
  { minElo: 1200, skill: 10, depth: 6,  movetime: 1400 },
  { minElo: 1300, skill: 11, depth: 6,  movetime: 1400 },
  { minElo: 1400, skill: 12, depth: 7,  movetime: 1500 },
  { minElo: 1500, skill: 13, depth: 8,  movetime: 1600 },
  { minElo: 1600, skill: 14, depth: 9,  movetime: 1700 },
  { minElo: 1700, skill: 15, depth: 10, movetime: 1800 },
  { minElo: 1800, skill: 16, depth: 11, movetime: 1900 },
  { minElo: 1900, skill: 17, depth: 12, movetime: 2000 },
  { minElo: 2000, skill: 18, depth: 14, movetime: 2200 },
  { minElo: 2100, skill: 19, depth: 16, movetime: 2400 },
  { minElo: 2200, skill: 20, depth: 18, movetime: 2600 },
  { minElo: 2400, skill: 20, depth: 20, movetime: 3000 }
]

function getSkillConfig(elo) {
  let config = ELO_TO_SKILL[0]
  for (const level of ELO_TO_SKILL) {
    if (elo >= level.minElo) config = level
  }
  return config
}

export class StockfishBot {
  constructor() {
    this.worker = null
    this.ready = false
    this.pendingResolve = null
    this.onMessageHandler = null
    this.commandQueue = []
  }

  async init() {
    // Use the worker-based stockfish from public folder
    try {
      this.worker = new Worker('/stockfish-worker.js')
    } catch (err) {
      console.warn('Failed to create Stockfish worker:', err)
      return // Bot will be non-functional but game still works
    }

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('Stockfish worker init timeout')
        this.ready = false
        resolve() // Resolve instead of reject so game continues
      }, 5000)

      let gotUciOk = false

      this.worker.onmessage = (e) => {
        const msg = e.data
        if (typeof msg !== 'string') return
        if (msg === 'uciok') {
          gotUciOk = true
          // Send isready to confirm engine is fully initialized
          this.worker.postMessage('isready')
        } else if (msg === 'readyok' && gotUciOk) {
          clearTimeout(timeout)
          this.ready = true
          // Process queued commands
          this.commandQueue.forEach(cmd => this.worker.postMessage(cmd))
          this.commandQueue = []
          resolve()
        } else if (msg.startsWith('bestmove')) {
          if (this.pendingResolve) {
            const moveStr = msg.split(' ')[1]
            this.pendingResolve(moveStr)
            this.pendingResolve = null
          }
        } else if (this.onMessageHandler) {
          this.onMessageHandler(msg)
        }
      }

      this.worker.onerror = (err) => {
        clearTimeout(timeout)
        reject(err)
      }

      // Start UCI handshake
      this.worker.postMessage('uci')
    })
  }

  sendCommand(cmd) {
    if (this.ready) {
      this.worker.postMessage(cmd)
    } else {
      this.commandQueue.push(cmd)
    }
  }

  setSkillLevel(elo) {
    const config = getSkillConfig(elo)
    this.sendCommand(`setoption name Skill Level value ${config.skill}`)
    return config
  }

  async getBestMove(fen, elo = 1200) {
    if (!this.ready) {
      try {
        await this.init()
      } catch(e) {
        console.warn('Bot not ready, returning null')
        return null
      }
    }
    if (!this.ready || !this.worker) {
      console.warn('Bot unavailable, returning null')
      return null
    }

    const config = this.setSkillLevel(elo)
    const jitter = Math.floor((Math.random() - 0.5) * 400)
    const movetime = Math.max(500, config.movetime + jitter)

    return new Promise((resolve) => {
      this.pendingResolve = resolve
      this.sendCommand(`position fen ${fen}`)
      this.sendCommand(`go movetime ${movetime}`)

      const timeout = setTimeout(() => {
        if (this.pendingResolve) {
          this.stop()
          this.pendingResolve = null
          console.warn('Stockfish move timeout - returning null')
          resolve(null)
        }
      }, movetime + 3000)

      const origResolve = resolve
      this.pendingResolve = (val) => {
        clearTimeout(timeout)
        origResolve(val)
      }
    })
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage('stop')
    }
  }

  destroy() {
    if (this.pendingResolve) {
      this.pendingResolve(null)
      this.pendingResolve = null
    }
    if (this.worker) {
      this.worker.postMessage('quit')
      this.worker.terminate()
      this.worker = null
    }
    this.ready = false
  }
}