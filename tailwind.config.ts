import type { Config } from 'tailwindcss'

export default <Config>{
	darkMode: 'class',
	content: [
		'./components/**/*.{js,vue,ts}',
		'./layouts/**/*.vue',
		'./pages/**/*.vue',
		'./plugins/**/*.{js,ts}',
		'./app.vue',
		'./error.vue'
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				display: ['Outfit', 'sans-serif'],
				wide: ['Outfit', 'sans-serif'], // Restored for Neon layout
				arabic: ['"Noto Sans Arabic"', 'sans-serif'],
			},
			colors: {
				brand: {
					DEFAULT: '#2563EB', // Blue 600
					50: '#EFF6FF',
					100: '#DBEAFE',
					200: '#BFDBFE',
					300: '#93C5FD',
					400: '#60A5FA',
					500: '#3B82F6',
					600: '#2563EB',
					700: '#1D4ED8',
					800: '#1E40AF',
					900: '#1E3A8A',
					950: '#172554',
				},
				slate: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					850: '#162032', // Custom for dark panels
					900: '#0f172a',
					950: '#020617',
				},
				surface: {
					light: '#ffffff',
					dark: '#1e293b', // Slate 800
				}
			},
			animation: {
				'spin-slow': 'spin 10s linear infinite',
				'spin-slow-reverse': 'spin-reverse 10s linear infinite',
				'spin-fast': 'spin 1s linear infinite',
				'wheel-spin': 'wheelSpin 4s cubic-bezier(0.17, 0.67, 0.12, 0.99) forwards',
				'float': 'float 6s ease-in-out infinite',
				'float-delayed': 'float 6s ease-in-out 3s infinite',
				'float-slow': 'float 8s ease-in-out infinite',
				'float-slower': 'float 10s ease-in-out infinite',
				'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'fade-in-down': 'fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'fade-in-left': 'fadeInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'fade-in-right': 'fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'zoom-in': 'zoomIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'fade-in': 'fadeIn 1s ease-out forwards',
				'shine': 'shine 1.5s ease-in-out infinite',
				'shine-once': 'shine 1.5s ease-in-out forwards',
			},
			keyframes: {
				'spin-reverse': {
					'from': { transform: 'rotate(0deg)' },
					'to': { transform: 'rotate(-360deg)' },
				},
				wheelSpin: {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(1080deg)' }, // 3 full rotations
				},
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-20px)' },
				},
				fadeInUp: {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				fadeInDown: {
					'0%': { opacity: '0', transform: 'translateY(-30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				fadeInLeft: {
					'0%': { opacity: '0', transform: 'translateX(-30px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' },
				},
				fadeInRight: {
					'0%': { opacity: '0', transform: 'translateX(30px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' },
				},
				zoomIn: {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				shine: {
					'100%': { left: '125%' },
				},
			},
		},
	},
	plugins: []
}
