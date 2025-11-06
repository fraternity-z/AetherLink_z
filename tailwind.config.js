/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // 映射现有 Paper 主题颜色
        primary: '#9333EA',
        secondary: '#754AB4',
        tertiary: '#8B5CF6',
        surface: {
          DEFAULT: '#F5F5F5',
          dark: '#2A2A2A',
        },
        background: {
          light: '#FFFFFF',
          dark: '#121212',
        },
        error: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
      borderRadius: {
        paper: '12px', // Paper roundness
      },
    },
  },
  plugins: [],
}

