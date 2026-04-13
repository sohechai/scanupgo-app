// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	devServer: {
		port: 3001,
	},
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
		storageKey: 'nuxt-color-mode'
	},
	compatibilityDate: '2025-07-15',
	runtimeConfig: {
		public: {
			apiUrl: process.env.API_URL || 'http://localhost:4000',
			siteUrl: process.env.SITE_URL || 'http://localhost.com:3000',
			// Subdomain URLs for cross-subdomain navigation
			merchantUrl: process.env.MERCHANT_URL || 'http://merchant.localhost.com:3000',
			adminUrl: process.env.ADMIN_URL || 'http://admin.localhost.com:3000',
			commercantRole: '58046033-0498-4665-ba4d-2a3b05210001'
		}
	},
	app: {
		pageTransition: { name: 'page' },
		head: {
			link: [
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
				{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Anton&family=Bangers&family=Luckiest+Guy&family=Righteous&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap' }
			],
			style: [
				{ innerHTML: 'body { font-family: "Inter", sans-serif; }' }
			]
		}
	}
})