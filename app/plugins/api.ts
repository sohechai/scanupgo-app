export default defineNuxtPlugin({
	name: 'api',
	setup() {
		const config = useRuntimeConfig()
		const apiUrl = config.public.apiUrl || 'http://localhost:4000'

		// Create $fetch instance with default config
		const api = $fetch.create({
			baseURL: apiUrl,
			credentials: 'include', // CRITICAL for session cookies (client-side)
			onRequest({ options }) {
				const headers = new Headers(options.headers as HeadersInit)

				// Add locale header for backend i18n
				const localeCookie = useCookie('i18n_locale')
				headers.set('X-Locale', localeCookie.value || 'fr')

				// SSR: Forward cookies from incoming request to API
				if (import.meta.server) {
					const event = useRequestEvent()
					const cookie = event?.node.req.headers.cookie
					if (cookie) {
						headers.set('cookie', cookie)
					}
				}

				options.headers = headers
			},
			onResponseError({ response }) {
				// Handle 401 unauthorized - only redirect, don't interfere with error propagation
				if (response.status === 401) {
					// Clear auth state completely
					const authStore = useAuthStore()
					authStore.clearAuth()

					// Only redirect if not already on login/register/admin page
					if (import.meta.client) {
						const currentPath = window.location.pathname
						if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register') && !currentPath.startsWith('/admin/login')) {
							// Redirect to appropriate login page
							if (currentPath.startsWith('/admin')) {
								navigateTo('/admin/login')
							} else {
								navigateTo('/login')
							}
						}
					}
				}
				// $fetch automatically throws FetchError for non-2xx responses
				// No need to throw manually - it would interfere with error handling
			},
		})

		return {
			provide: {
				api,
			},
		}
	},
})
