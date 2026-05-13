/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ["'Playfair Display'", 'Georgia', 'serif'],
        mono: ["'DM Mono'", 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#0F4C35',
          light: '#E8F5F0',
          hover: '#0A3828',
        },
        navy: '#1a1a2e',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      borderRadius: {
        card: '12px',
        btn: '6px',
        input: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      },
      maxWidth: {
        mobile: '480px',
      },
    },
  },
  plugins: [],
};
