<div align="center">

<br>

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&size=42&duration=2500&pause=1000&color=F7E7CE&center=true&vCenter=true&width=600&height=60&lines=TUFFCHESS;Where+every+capture+is+a+duel" alt="tuffchess header" />

<br>

[![GitHub Repo](https://img.shields.io/badge/repo-subhansh--dev%2Ftuffchess-181818?style=for-the-badge&logo=github&logoColor=F7E7CE)](https://github.com/subhansh-dev/tuffchess)
[![License](https://img.shields.io/badge/license-MIT-3D3318?style=for-the-badge&logo=opensource&logoColor=F7E7CE)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-3D3318?style=for-the-badge&logo=semver&logoColor=F7E7CE)](https://github.com/subhansh-dev/tuffchess/releases)
[![Vite](https://img.shields.io/badge/built%20with-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![JavaScript](https://img.shields.io/badge/lang-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3D3318?style=for-the-badge&logo=git&logoColor=F7E7CE)](https://github.com/subhansh-dev/tuffchess/pulls)
[![Issues](https://img.shields.io/badge/issues-open-3D3318?style=for-the-badge&logo=github&logoColor=F7E7CE)](https://github.com/subhansh-dev/tuffchess/issues)

<br>

<sub>chess. but it hits different.</sub>

<br><br>

</div>

---

## what is this

tuffchess is a browser chess game that doesn't play like your grandma's lichess clone. every capture triggers an anime-style duel sequence — zoom, blur, impact frames, the whole deal. the UI is paper-textured, warm-toned, and built with that minimalism + skeuomorphism vibe. feels premium without trying too hard.

no AI slop colors. no generic bootstrap gradients. just clean design that looks like a real person made it.

## features

- **cinematic captures** — pieces don't just disappear. when you take something, the board zooms in, the screen flashes, particles scatter, and your piece delivers the kill like it means it. anime duel energy.
- **stockfish bot** — play against a real chess engine with adjustable difficulty (beginner → expert, ~800–2000 ELO range)
- **ELO tracking** — your rating updates after every game. climb the ladder.
- **chess clock** — bullet (1 min), blitz (3/5 min), rapid (10 min), or untimed. your call.
- **match history** — full game log with stats, filters, and replay
- **combo system** — chain captures for escalating VFX. triple kill? the board knows.
- **camera shake + glitch effects** — the board reacts to big moments. not just visual noise — it's timed, weighted, and deliberate.
- **paper UI** — warm parchment tones, brass accents, serif-meets-mono typography. nothing looks generated.
- **sound design** — move clicks, capture impacts, clock ticks. everything has weight.
- **SVG pieces** — clean, scalable, hand-tuned chess piece art

## tech stack

| piece | what |
|-------|------|
| engine | vanilla JS chess engine (move gen, rules, validation) |
| bot | Stockfish WASM via `stockfish.js` |
| animations | GSAP + custom particle engine + camera system |
| audio | Tone.js |
| renderer | Canvas 2D + layered VFX compositor |
| build | Vite 5 |
| tests | Vitest |
| styling | hand-written CSS, zero frameworks |

## run it

```bash
# clone
git clone https://github.com/subhansh-dev/tuffchess.git
cd tuffchess

# install
npm install

# dev server
npm run dev

# build for production
npm run build

# run tests
npm run test
```

## project structure

```
src/
  core/        → chess engine, move gen, types, clock, elo, match history
  render/      → board renderer, piece renderer, canvas compositor
  animation/   → GSAP tweening, particle engine, camera shake, glitch, combo, capture VFX
  vfx/         → cinematic capture, premium effects, screen FX, post-processing, anime edit
  audio/       → sound manager (Tone.js)
  bot/         → stockfish bot engine
  ui/          → UI manager, styles.css (paper theme)
  input/       → mouse/touch input handler
  utils/       → math, colors, event bus, asset loader
public/
  assets/      → SVG chess pieces, theme.json
  stockfish.js → WASM engine binary
```

## why "tuff"

because the captures are tuff. the VFX are tuff. the UI is tuff. chess is already elegant — this just makes the violence pretty.

## contribute

found a bug? got an animation idea? want to add a new VFX layer?

1. fork it
2. branch it (`git checkout -b my-tuff-feature`)
3. commit it
4. push it
5. PR it

all PRs get reviewed. all ideas get heard. just make sure it doesn't look like AI made it.

## license

MIT — do whatever you want with it, just don't blame us if your browser catches fire from the particles.

---

<div align="center">

<br>

<sub>built with hands. not with prompts.</sub>

<br>

<img src="https://capsule-render.vercel.app?type=soft&color=3D3318&height=30&section=footer" alt="footer" />

</div>
