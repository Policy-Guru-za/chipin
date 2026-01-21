import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488',
          light: '#5EEAD4',
          dark: '#134E4A',
        },
        accent: {
          DEFAULT: '#F97316',
          light: '#FDBA74',
        },
        surface: '#FEFDFB',
        subtle: '#FDF8F3',
        muted: 'var(--color-bg-muted)',
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
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
      },
    },
  },
  plugins: [],
};

export default config;
