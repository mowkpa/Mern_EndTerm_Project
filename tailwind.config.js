/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        'text-2': 'var(--text-2)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-border': 'var(--sidebar-border)',
        mine: 'var(--mine)',
        'mine-bg': 'var(--mine-bg)',
        free: 'var(--free)',
        'free-bg': 'var(--free-bg)',
        pending: 'var(--pending)',
        'pending-bg': 'var(--pending-bg)',
        booked: 'var(--booked)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        // Retain primary for backwards compatibility during progressive migration
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#3D3BF3',
          600: '#3D3BF3',
          700: '#312ecb',
          800: '#2825a5',
          900: '#1e1c7e',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        control: '8px',
        panel: '14px',
        chip: '6px',
        floating: '18px',
      },
      boxShadow: {
        floating: '0 12px 32px rgba(18, 26, 43, 0.14)',
      },
    },
  },
  plugins: [],
};
