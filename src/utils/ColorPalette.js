export const Colors = {
  background: '#4A3C2A',
  board: {
    light: '#E8D5B5',
    dark: '#8B7355',
    lightHighlight: '#F5EDE0',
    darkHighlight: '#6B5344'
  },
  highlight: {
    move: 'rgba(184, 150, 15, 0.35)',
    capture: 'rgba(180, 60, 40, 0.45)',
    check: 'rgba(184, 60, 40, 0.6)',
    lastMove: 'rgba(184, 150, 15, 0.25)',
    selected: 'rgba(139, 115, 85, 0.4)',
    premove: 'rgba(120, 160, 40, 0.3)'
  },
  piece: {
    whiteStroke: '#2C2C2C',
    blackStroke: '#1a1a1a',
    whiteGlow: 'rgba(255, 255, 255, 0.5)',
    blackGlow: 'rgba(44, 36, 24, 0.8)'
  },
  ui: {
    primary: '#B8960F',
    secondary: '#8B7355',
    danger: '#B84030',
    success: '#5A8A3C',
    text: '#2C2C2C',
    textDim: '#6B5344',
    panel: 'rgba(240, 232, 216, 0.92)',
    border: 'rgba(184, 150, 15, 0.3)'
  },
  effects: {
    sparkle: ['#B8960F', '#D4A820', '#F5F0E8', '#E8DCCA'],
    capture: ['#B84030', '#D46040', '#E88070', '#F0A098'],
    magic: ['#B8960F', '#8B7355', '#D4A820', '#6B5344']
  },
  square: (file, rank) => (file + rank) % 2 === 0 ? Colors.board.light : Colors.board.dark
}
