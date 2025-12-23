/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Engineering Theme - Professional CAD Aesthetic
        canvas: '#09090b',      // Deep black for 3D viewport
        surface: '#18181b',     // Dark gray for panels
        border: '#27272a',      // Panel borders
        muted: '#a1a1aa',       // Muted text
        
        // HUD Accents
        success: '#22c55e',     // Vivid green for PASS status
        warning: '#eab308',     // Yellow for warnings
        error: '#ef4444',       // Red for failures
        accent: '#0ea5e9',      // Electric blue for selection
        
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
      },
      backdropBlur: {
        hud: '12px',
      },
      animation: {
        'pulse-success': 'pulse-success 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'spring-pop': 'spring-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'pulse-success': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)' },
        },
        'slide-in': {
          'from': { transform: 'translateX(-100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        'spring-pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

