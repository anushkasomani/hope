module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#0b1020',           // near-black background
        'surface': '#0f1724',      // panel surface
        'muted': '#94a3b8',        // muted text
        'accent': '#7C3AED',       // primary purple
        'accent-600': '#6D28D9',
        'success': '#10B981',
        'danger': '#EF4444'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Manrope', 'Inter']
      },
      boxShadow: {
        'soft': '0 6px 18px rgba(2,6,23,0.6)'
      }
    }
  },
  plugins: [],
}; 