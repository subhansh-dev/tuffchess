export class UIManager {
  constructor() {
    this.screens = {}
    this.currentScreen = null
    this.callbacks = {}
    this.init()
  }

  init() {
    this.screens = {
      loading: document.getElementById('loading-screen'),
      mainMenu: document.getElementById('main-menu'),
      modeSelect: document.getElementById('mode-select'),
      botDifficulty: document.getElementById('bot-difficulty'),
      gameHud: document.getElementById('game-hud'),
      gameOver: document.getElementById('game-over-modal'),
      promotion: document.getElementById('promotion-modal'),
      share: document.getElementById('share-modal'),
      history: document.getElementById('match-history'),
      timeControl: document.getElementById('time-control')
    }

    this.setupEventListeners()
  }

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = []
    this.callbacks[event].push(callback)
  }

  emit(event, data) {
    const cbs = this.callbacks[event]
    if (cbs) cbs.forEach(cb => cb(data))
  }

  setupEventListeners() {
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action
        this.emit(action, e.currentTarget)
      })
    })
  }

  showScreen(screenId) {
    Object.values(this.screens).forEach(s => {
      if (s) s.classList.remove('active')
    })
    const screen = this.screens[screenId]
    if (screen) {
      screen.classList.add('active')
      this.currentScreen = screenId
    }
  }

  hideScreen(screenId) {
    const screen = this.screens[screenId]
    if (screen) screen.classList.remove('active')
  }

  hideAll() {
    Object.values(this.screens).forEach(s => {
      if (s) s.classList.remove('active')
    })
    this.currentScreen = null
  }

  showLoading(progress, text) {
    const bar = document.querySelector('#loading-screen .loading-bar-fill')
    const txt = document.querySelector('#loading-screen .loading-status')
    if (bar) bar.style.width = progress + '%'
    if (txt) txt.textContent = text
  }

  hideLoading() {
    const ls = this.screens.loading || document.getElementById('loading-screen')
    if (ls) {
      ls.classList.add('hidden')
      // Force remove after transition
      setTimeout(() => {
        try { ls.style.display = 'none' } catch(e) {}
      }, 700)
    }
  }

  updatePlayerBar(position, name, rating, isActive) {
    const bar = document.querySelector(`.player-bar.${position}`)
    if (!bar) return
    const nameEl = bar.querySelector('.player-name')
    const ratingEl = bar.querySelector('.player-rating')
    const avatarEl = bar.querySelector('.player-avatar')
    if (nameEl) nameEl.textContent = name
    if (ratingEl) {
      if (rating) {
        ratingEl.textContent = `ELO ${rating}`
        ratingEl.style.display = ''
      } else {
        ratingEl.style.display = 'none'
      }
    }
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase()
    bar.classList.toggle('active', isActive)
  }

  showThinking(position, visible) {
    const bar = document.querySelector(`.player-bar.${position}`)
    if (!bar) return
    const indicator = bar.querySelector('.thinking-indicator')
    if (indicator) indicator.classList.toggle('visible', visible)
  }

  showGameOver(result, ratingChange, newRating) {
    const modal = this.screens.gameOver
    if (!modal) return

    const resultEl = modal.querySelector('.game-over-result')
    const detailEl = modal.querySelector('.game-over-detail')
    const changeEl = modal.querySelector('.rating-change')
    const newEl = modal.querySelector('.rating-new')

    if (resultEl) resultEl.textContent = result.title || 'Game Over'
    if (detailEl) detailEl.textContent = result.detail || ''

    if (changeEl) {
      const change = ratingChange
      changeEl.textContent = change > 0 ? `+${change}` : change < 0 ? `${change}` : '0'
      changeEl.className = 'rating-change ' + (change > 0 ? 'positive' : change < 0 ? 'negative' : 'draw')
    }
    if (newEl) newEl.textContent = `New Rating: ${newRating}`

    modal.classList.add('active')
  }

  hideGameOver() {
    this.hideScreen('gameOver')
  }

  showPromotion(callback) {
    const modal = this.screens.promotion
    if (!modal) return
    this.hidePromotion()
    modal.classList.add('active')

    const pieces = modal.querySelectorAll('.promotion-piece')
    const handler = (e) => {
      const piece = e.currentTarget.dataset.piece
      pieces.forEach(p => p.removeEventListener('click', handler))
      modal.classList.remove('active')
      callback(piece)
    }
    this._promotionHandler = handler
    pieces.forEach(p => p.addEventListener('click', handler))
  }

  hidePromotion() {
    const modal = this.screens.promotion
    if (modal && this._promotionHandler) {
      modal.querySelectorAll('.promotion-piece').forEach(p => {
        p.removeEventListener('click', this._promotionHandler)
      })
      this._promotionHandler = null
    }
    this.hideScreen('promotion')
  }

  updateElo(rating) {
    const el = document.getElementById('menu-elo')
    if (el) el.textContent = rating
  }

  updateReplayInfo(match) {
    const el = document.getElementById('replay-info')
    if (el) {
      el.textContent = `${match.mode === 'bot' ? 'vs Bot' : 'vs Friend'} - ${match.result}`
    }
  }

  updateReplayProgress(index, total) {
    const el = document.getElementById('replay-progress')
    if (el) el.textContent = `${index + 1} / ${total}`
  }

  updateClock(side, time) {
    const el = document.getElementById(`clock-${side}`)
    if (el) {
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  updateCaptured(side, count) {
    const el = document.querySelector(`.captured-${side}`)
    if (el) el.textContent = count > 0 ? `+${count}` : ''
  }

  updateTurn(side) {
    const whiteBar = document.querySelector('.player-bar.white')
    const blackBar = document.querySelector('.player-bar.black')
    if (whiteBar) whiteBar.classList.toggle('active', side === 'white')
    if (blackBar) blackBar.classList.toggle('active', side === 'black')
  }

  showShare(fen) {
    const modal = this.screens.share
    if (!modal) return

    const urlInput = modal.querySelector('.share-url')
    const copiedMsg = modal.querySelector('.copied-msg')
    const baseUrl = window.location.origin + window.location.pathname
    const shareUrl = `${baseUrl}?fen=${encodeURIComponent(fen)}`

    if (urlInput) urlInput.value = shareUrl
    if (copiedMsg) copiedMsg.style.display = 'none'

    modal.classList.add('active')
  }

  hideShare() {
    this.hideScreen('share')
  }

  showCopied() {
    const msg = document.querySelector('.copied-msg')
    if (msg) {
      msg.style.display = 'block'
      setTimeout(() => { msg.style.display = 'none' }, 2000)
    }
  }

  updateMoveList(moves) {
    const body = document.querySelector('.move-list-body')
    if (!body) return

    let html = ''
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1
      const white = moves[i] || ''
      const black = moves[i + 1] || ''
      html += `<div class="move-row">
        <span class="move-num">${moveNum}.</span>
        <span class="move-white">${white}</span>
        <span class="move-black">${black}</span>
      </div>`
    }
    body.innerHTML = html
    body.scrollTop = body.scrollHeight
  }

  clearMoveList() {
    const body = document.querySelector('.move-list-body')
    if (body) body.innerHTML = ''
  }

  setPlayerSide(side) {
    const topName = document.querySelector('.player-bar.top .player-name')
    const bottomName = document.querySelector('.player-bar.bottom .player-name')
    if (topName) topName.dataset.side = side === 'white' ? 'black' : 'white'
    if (bottomName) bottomName.dataset.side = side
  }

  renderHistory(matches, stats) {
    const statsEl = document.getElementById('history-stats')
    if (stats) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
      set('stat-total', stats.total)
      set('stat-wins', stats.wins)
      set('stat-losses', stats.losses)
      set('stat-draws', stats.draws)
      set('stat-winrate', stats.winRate + '%')
    }

    const list = document.getElementById('history-list')
    if (!list) return

    if (matches.length === 0) {
      list.innerHTML = '<div class="history-empty">No matches played yet</div>'
      return
    }

    const DIFFICULTY_NAMES = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' }

    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

    list.innerHTML = matches.map(m => {
      const date = new Date(m.date)
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const modeLabel = m.mode === 'bot' ? `vs ${DIFFICULTY_NAMES[m.difficulty] || 'Bot'}` : 'vs Friend'
      const resultLabel = m.result === 'win' ? 'Won' : m.result === 'loss' ? 'Lost' : 'Draw'
      const badge = m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D'
      const change = m.ratingChange || 0
      const changeStr = change > 0 ? `+${change}` : change < 0 ? `${change}` : '0'
      const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'draw'
      const moveCount = m.moves ? Math.ceil(m.moves.length / 2) : 0

      return `<div class="history-item" data-match-id="${esc(m.id)}">
        <div class="history-result-badge ${esc(m.result)}">${badge}</div>
        <div class="history-info">
          <div class="history-mode">${esc(modeLabel)}</div>
          <div class="history-detail">${esc(resultLabel)} &middot; ${moveCount} moves</div>
        </div>
        <div class="history-rating">
          <div class="history-rating-change ${changeClass}">${changeStr}</div>
          <div class="history-date">${esc(dateStr)}</div>
        </div>
        <button class="history-item-replay" data-replay-id="${esc(m.id)}" title="Replay">&#9654;</button>
      </div>`
    }).join('')
  }
}