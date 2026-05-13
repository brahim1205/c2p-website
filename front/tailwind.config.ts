import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        c2p: {
          bg: 'var(--c2p-bg)',
          surface: 'var(--c2p-surface)',
          'surface-soft': 'var(--c2p-surface-soft)',
          'surface-muted': 'var(--c2p-surface-muted)',
          border: 'var(--c2p-border)',
          'border-strong': 'var(--c2p-border-strong)',
          text: 'var(--c2p-text)',
          muted: 'var(--c2p-text-muted)',
          soft: 'var(--c2p-text-soft)',
          primary: 'var(--c2p-primary)',
          'primary-hover': 'var(--c2p-primary-hover)',
          accent: 'var(--c2p-accent)',
          'accent-hover': 'var(--c2p-accent-hover)',
          'accent-strong': 'var(--c2p-accent-strong)',
          gold: 'var(--c2p-gold)',
          'gold-strong': 'var(--c2p-gold-strong)',
          success: 'var(--c2p-success)',
          'success-soft': 'var(--c2p-success-soft)',
          warning: 'var(--c2p-warning)',
          'warning-soft': 'var(--c2p-warning-soft)',
          danger: 'var(--c2p-danger)',
          'danger-soft': 'var(--c2p-danger-soft)',
        },
        primary: {
          DEFAULT: '#27346b',
          dark: '#0c0e3a',
        },
        accent: {
          DEFAULT: '#dbad29',
          light: '#e1a913',
        },
        beige: {
          DEFAULT: '#80bfdf',
          light: '#d0b55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        c2p: '0 24px 60px rgba(12, 14, 58, 0.08)',
        'c2p-lg': '0 35px 100px rgba(12, 14, 58, 0.10)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
