import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        accent: {
          DEFAULT: '#F97316',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        surface: '#FEFDFB',
        subtle: '#FDF8F3',
        muted: '#FAF9F7',
        text: {
          DEFAULT: '#1C1917',
          secondary: '#57534E',
          muted: '#A8A29E',
        },
        border: {
          DEFAULT: '#E7E5E4',
          strong: '#D6D3D1',
        },
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['var(--font-primary)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        lifted: '0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)',
        hero: '0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(13,148,136,0.15)',
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-delay-1': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'fade-up-delay-2': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
        'fade-up-delay-3': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
