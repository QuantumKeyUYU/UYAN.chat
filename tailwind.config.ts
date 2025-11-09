import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1A1A1D',
          secondary: '#2E2E32',
          tertiary: '#3A3A40',
        },
        text: {
          primary: '#E8E8E8',
          secondary: '#B0B0B0',
          tertiary: '#808080',
        },
        uyan: {
          darkness: '#6B4E71',
          light: '#F4C542',
          action: '#5DADE2',
          success: '#58D68D',
          warning: '#F39C12',
          error: '#E74C3C',
        },
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        glow: '0 0 40px rgba(244, 197, 66, 0.2)',
      },
      keyframes: {
        pulseLight: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        pulseLight: 'pulseLight 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
