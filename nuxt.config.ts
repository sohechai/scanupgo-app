// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	devServer: {
		port: 3001,
	},
	css: ['~/assets/css/rtl.css'],
	tailwindcss: {
		cssPath: '~/assets/css/tailwind.css',
	},
	modules: [
		'@nuxt/icon',
		'@nuxt/image',
		'@nuxtjs/tailwindcss',
		'@pinia/nuxt',
		'@nuxtjs/color-mode',
		'@vueuse/motion/nuxt',
		'@nuxtjs/i18n',
		'@vite-pwa/nuxt',
	],
	// PWA — résilience réseau pour le jeu joueur (/play). Cache les assets
	// pour que la page s'ouvre même sans réseau. NE cache PAS les API.
	pwa: {
		registerType: 'autoUpdate',
		manifest: {
			name: 'ScanUpGo',
			short_name: 'ScanUpGo',
			theme_color: '#007AFF',
			background_color: '#ffffff',
			display: 'standalone',
		},
		workbox: {
			// Précache des assets du build (JS, CSS, polices, images, html)
			globPatterns: ['**/*.{js,css,html,woff,woff2,png,jpg,jpeg,svg,webp,ico}'],
			// Certaines images de templates dépassent 2 MiB (limite par défaut) -> 4 MiB.
			maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
			navigateFallback: null,
			runtimeCaching: [
				{
					// Logos / images d'établissement (R2) — affichage offline
					urlPattern: ({ url }: any) =>
						/\.(?:png|jpg|jpeg|svg|webp|gif)$/i.test(url.pathname) ||
						url.hostname.includes('r2.dev') ||
						url.hostname.includes('cloudflarestorage'),
					handler: 'CacheFirst',
					options: {
						cacheName: 'play-images',
						expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
					},
				},
			],
		},
		// Ne pas enregistrer le SW en dev (évite le cache pénible pendant le dev)
		devOptions: { enabled: false },
	},
	i18n: {
		locales: [
			{ code: 'fr', name: 'Français', dir: 'ltr', language: 'fr-FR', file: 'fr.json' },
			{ code: 'en', name: 'English', dir: 'ltr', language: 'en-US', file: 'en.json' },
			{ code: 'ar', name: 'العربية', dir: 'rtl', language: 'ar-MA', file: 'ar.json' },
		],
		defaultLocale: 'fr',
		strategy: 'no_prefix',
		detectBrowserLanguage: {
			useCookie: true,
			cookieKey: 'i18n_locale',
			redirectOn: 'root',
			alwaysRedirect: false,
		},
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
	// Dashboard routes are auth-only — SSR provides no value and causes hydration mismatches
	// because user/subscription data is only available client-side.
	routeRules: {
		'/dashboard/**': { ssr: false },
		// Le jeu joueur n'a pas besoin de SSR (aucun SEO, app en noindex). On le sert
		// en SPA depuis le CDN -> pas de cold start serverless, chargement instantané
		// au moment critique (clic "Lancer la roue").
		'/play/**': { ssr: false },
		// app.scanupgo.com ne doit jamais être indexé (seule la landing scanupgo.com l'est).
		// X-Robots-Tag empêche l'indexation même si une URL est découverte via un lien externe.
		'/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
	},
	vite: {
		optimizeDeps: {
			include: [
				'@tanstack/vue-query',
				'@vue/devtools-core',
				'@vue/devtools-kit',
				'fabric',
				'file-saver',
				'html2canvas',
				'jspdf',
				'jsqr',
				'jszip',
				'node-vibrant/browser',
				'qrcode',
			]
		}
	},
	compatibilityDate: '2025-07-15',
	hooks: {
		// Workaround for Nuxt 4.2.2 + Nitro 2.12.9 bug:
		// nuxt.options.alias['#build'] = withTrailingSlash(buildDir) overrides Nitro's
		// rollup alias, causing double slashes in generated import paths (.nuxt//dist/...)
		'nitro:config'(nitroConfig) {
			const buildAlias = nitroConfig.alias?.['#build']
			if (typeof buildAlias === 'string' && buildAlias.endsWith('/')) {
				nitroConfig.alias!['#build'] = buildAlias.slice(0, -1)
			}
		}
	},
	runtimeConfig: {
		public: {
			apiUrl: process.env.API_URL || 'http://localhost:4000',
			siteUrl: process.env.SITE_URL || '',
			// Subdomain URLs for cross-subdomain navigation
			merchantUrl: process.env.MERCHANT_URL || 'http://merchant.localhost.com:3000',
			adminUrl: process.env.ADMIN_URL || 'http://admin.localhost.com:3000',
			commercantRole: '58046033-0498-4665-ba4d-2a3b05210001'
		}
	},
	app: {
		pageTransition: false,
		head: {
			titleTemplate: '%s',
			link: [
				{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
				{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@800&family=Outfit:wght@300;400;500;600;700;800&family=Anton&family=Bangers&family=Luckiest+Guy&family=Righteous&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap' }
			],
			style: [
				{ innerHTML: 'body { font-family: "Inter", sans-serif; }' }
			]
		}
	}
})