export default defineNuxtConfig({
	css: ['~/assets/css/rtl.css'],
	modules: [
		'@nuxt/icon',
		'@nuxt/image',
		'@nuxtjs/tailwindcss',
		'@pinia/nuxt',
		'@nuxtjs/color-mode',
		'@vueuse/motion/nuxt',
		'@nuxtjs/i18n',
	],
	i18n: {
		locales: [
			{ code: 'fr', name: 'Français', dir: 'ltr', language: 'fr-FR', file: 'fr.json' },
			{ code: 'en', name: 'English', dir: 'ltr', language: 'en-US', file: 'en.json' },
			{ code: 'ar', name: 'العربية', dir: 'rtl', language: 'ar-MA', file: 'ar.json' },
		],
		defaultLocale: 'fr',
		strategy: 'no_prefix',
		detectBrowserLanguage: false,
		langDir: 'locales/',
		compilation: {
			strictMessage: false,
		},
	},
	colorMode: {
		classSuffix: '',
		preference: 'light',
		fallback: 'light',
		storageKey: 'nuxt-color-mode',
	},
	compatibilityDate: '2025-07-15',
	runtimeConfig: {
		public: {
			apiUrl: process.env.API_URL || 'http://localhost:4000',
			landingUrl: process.env.LANDING_URL || 'http://localhost:3000',
		},
	},
	app: {
		pageTransition: { name: 'page', mode: 'out-in' },
		head: {
			link: [
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
				{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Anton&family=Bangers&family=Luckiest+Guy&family=Righteous&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap' },
			],
			style: [
				{ innerHTML: 'body { font-family: "Inter", sans-serif; }' },
			],
		},
	},
})
