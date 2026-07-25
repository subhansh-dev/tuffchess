export class ChessClock {
  constructor() {
    this.whiteTime = 0
    this.blackTime = 0
    this.initialTime = 0
    this.running = false
    this.activeSide = null
    this.lastTick = 0
    this.interval = null
    this.onTick = null
    this.onFlag = null
  }

  configure(seconds) {
    this.initialTime = seconds
    this.whiteTime = seconds
    this.blackTime = seconds
    this.running = false
    this.activeSide = null
    this.stop()
  }

  start(side) {
    if (this.initialTime === 0) return
    this.stop()
    this.activeSide = side
    this.running = true
    this.lastTick = performance.now()
    // No setInterval — clock updates via updateFromLoop only
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.running = false
  }

  switchSide(side) {
    this.activeSide = side
    this.lastTick = performance.now()
  }

  tick() {
    if (!this.running || this.initialTime === 0) return

    const now = performance.now()
    const elapsed = (now - this.lastTick) / 1000
    this.lastTick = now

    if (this.activeSide === 'white') {
      this.whiteTime = Math.max(0, this.whiteTime - elapsed)
      if (this.whiteTime <= 0) {
        this.whiteTime = 0
        this.stop()
        if (this.onFlag) this.onFlag('white')
      }
    } else if (this.activeSide === 'black') {
      this.blackTime = Math.max(0, this.blackTime - elapsed)
      if (this.blackTime <= 0) {
        this.blackTime = 0
        this.stop()
        if (this.onFlag) this.onFlag('black')
      }
    }

    if (this.onTick) this.onTick(this.getDisplay())
  }

  /**
   * Update clock from game loop dt. Called every frame for continuous ticking.
   * This ensures the clock updates smoothly even without the setInterval.
   */
  updateFromLoop(dt) {
    if (!this.running || this.initialTime === 0 || this.activeSide === null) return

    if (this.activeSide === 'white') {
      this.whiteTime = Math.max(0, this.whiteTime - dt)
      if (this.whiteTime <= 0) {
        this.whiteTime = 0
        this.running = false
        if (this.onFlag) this.onFlag('white')
      }
    } else if (this.activeSide === 'black') {
      this.blackTime = Math.max(0, this.blackTime - dt)
      if (this.blackTime <= 0) {
        this.blackTime = 0
        this.running = false
        if (this.onFlag) this.onFlag('black')
      }
    }
  }

  getTime(side) {
    return side === 'white' ? this.whiteTime : this.blackTime
  }

  getDisplay() {
    return {
      white: this.formatTime(this.whiteTime),
      black: this.formatTime(this.blackTime),
      whiteRaw: this.whiteTime,
      blackRaw: this.blackTime,
      activeSide: this.activeSide,
      enabled: this.initialTime > 0
    }
  }

  formatTime(seconds) {
    if (this.initialTime === 0) return '--:--'
    const s = Math.floor(seconds + 0.05)
    if (s < 60) {
      const tenths = Math.floor((seconds % 1) * 10)
      return `${s}.${tenths}`
    }
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  reset() {
    this.whiteTime = this.initialTime
    this.blackTime = this.initialTime
    this.running = false
    this.activeSide = null
    this.stop()
  }

  isLowTime(side) {
    const t = side === 'white' ? this.whiteTime : this.blackTime
    return this.initialTime > 0 && t <= 10 && t > 0
  }

  hasFlagFallen() {
    if (this.initialTime === 0) return false
    return this.whiteTime <= 0 || this.blackTime <= 0
  }

  dispose() {
    this.stop()
  }
}
