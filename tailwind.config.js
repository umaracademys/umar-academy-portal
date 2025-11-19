/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F3224',
          50: '#f5f7f2',
          100: '#e8ede3',
          200: '#d1dac7',
          300: '#b0c09f',
          400: '#8ba177',
          500: '#6d8559',
          600: '#556a47',
          700: '#45553a',
          800: '#3a4632',
          900: '#1F3224',
        },
        accent: {
          DEFAULT: '#E7AA39',
          50: '#fef9f0',
          100: '#fef2d9',
          200: '#fce2b3',
          300: '#f9ca82',
          400: '#f6a94f',
          500: '#E7AA39',
          600: '#d8921f',
          700: '#b37319',
          800: '#8f5c1a',
          900: '#754d18',
        },
        success: {
          DEFAULT: '#10B981',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          DEFAULT: '#EF4444',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#EF4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          DEFAULT: '#3B82F6',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B82F6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        'soft-primary': 'rgba(31, 50, 36, 0.08)',
        'soft-accent': 'rgba(231, 170, 57, 0.15)',
        'soft-success': 'rgba(16, 185, 129, 0.1)',
        'soft-warning': 'rgba(245, 158, 11, 0.1)',
        'soft-error': 'rgba(239, 68, 68, 0.1)',
        'soft-info': 'rgba(59, 130, 246, 0.1)',
        background: '#F9FAFB',
        surface: '#FFFFFF',
      },
      spacing: {
        'xs': '0.25rem',   /* 4px */
        'sm': '0.5rem',    /* 8px */
        'md': '1rem',      /* 16px */
        'lg': '1.5rem',    /* 24px */
        'xl': '2rem',      /* 32px */
        '2xl': '3rem',     /* 48px */
        '3xl': '4rem',     /* 64px */
      },
      borderRadius: {
        'sm': '0.25rem',   /* 4px */
        'md': '0.5rem',    /* 8px */
        'lg': '0.75rem',   /* 12px */
        'xl': '1rem',      /* 16px */
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      fontFamily: {
        arabic: ['Amiri', '"Arabic Typesetting"', '"Traditional Arabic"', 'serif'],
        surahNames: ['QPC V2 Font', 'Surah Names', 'Amiri', '"Arabic Typesetting"', '"Traditional Arabic"', 'serif'],
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}
