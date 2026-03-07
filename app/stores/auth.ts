import { defineStore } from 'pinia'

interface Business {
	id: string
	name: string
	email?: string
	addressStreet?: string
	addressCity?: string
	addressZip?: string
	addressCountry?: string
	logo?: string
	primaryColor?: string
}

interface User {
	id: string
	email: string
	firstName?: string
	lastName?: string
	phone?: string
	role?: string
	preferredLanguage?: string
	cgvAccepted?: boolean
	emailVerified?: boolean
	business?: Business
}

interface AuthState {
	user: User | null
	loading: boolean
	initialized: boolean
}

export const useAuthStore = defineStore('auth', {
	state: (): AuthState => {
		// Start with empty state - will be verified against server session
		return {
			user: null,
			loading: false,
			initialized: false
		}
	},

	getters: {
		isAuthenticated: (state) => !!state.user,
		currentUser: (state) => state.user
	},

	actions: {
		async fetchUser() {
			try {
				const { $api } = useNuxtApp()

				if (!$api) {
					this.user = null
					this.initialized = true
					this._saveState()
					return
				}

				this.loading = true

				// Call NestJS /auth/status endpoint (public, doesn't throw 401)
				const response = await $api<{ authenticated: boolean; user: User | null }>('/auth/status')

				if (response.authenticated && response.user) {
					this.user = response.user

					// Sync locale with user preference
					if (import.meta.client && response.user.preferredLanguage) {
						const localeCookie = useCookie('i18n_locale')
						if (localeCookie.value !== response.user.preferredLanguage) {
							localeCookie.value = response.user.preferredLanguage
						}
					}
				} else {
					this.user = null
				}

				this._saveState()
			} catch (error: any) {
				// Network error or other issue
				console.error('Failed to fetch user:', error)
				this.user = null
				this._saveState()
			} finally {
				this.loading = false
				this.initialized = true
			}
		},

		async signIn(email: string, password: string, rememberMe?: boolean) {
			const { $api } = useNuxtApp()

			try {
				this.loading = true

				// Call NestJS /auth/login endpoint
				const response = await $api<{ message: string; user: User }>('/auth/login', {
					method: 'POST',
					body: {
						email,
						password,
						rememberMe: rememberMe ?? false
					}
				})

				this.user = response.user
				this._saveState()

				// Sync locale with user preference on login
				if (import.meta.client && response.user.preferredLanguage) {
					const localeCookie = useCookie('i18n_locale')
					if (localeCookie.value !== response.user.preferredLanguage) {
						localeCookie.value = response.user.preferredLanguage
					}
				}

				// If email not verified, redirect to pending verification page
				if (!response.user.emailVerified) {
					await navigateTo('/verify-email-pending', { external: false })
					return true
				}

				// Redirect based on business completion
				const business = response.user.business
				const isProfileComplete = business &&
					business.name &&
					business.addressStreet

				const redirectPath = isProfileComplete ? '/dashboard' : '/dashboard/profile'
				await navigateTo(redirectPath, { external: false })

				return true
			} catch (error) {
				console.error('Login failed:', error)
				throw error
			} finally {
				this.loading = false
			}
		},

		async signUp(email: string, password: string, firstName?: string, lastName?: string, cgvAccepted?: boolean) {
			const { $api } = useNuxtApp()

			try {
				this.loading = true

				// Pass current locale as preferred language
				const localeCookie = useCookie('i18n_locale')

				// Call NestJS /auth/register endpoint
				// This creates user + empty business + auto-login
				const response = await $api<{ message: string; user: User }>('/auth/register', {
					method: 'POST',
					body: {
						email,
						password,
						firstName,
						lastName,
						preferredLanguage: localeCookie.value || 'fr',
						cgvAccepted: cgvAccepted ?? true
					}
				})

				this.user = response.user
				this._saveState()

				return true
			} catch (error: any) {
				console.error('Registration failed:', error)

				// Format error for display
				const errorMessage = error?.data?.message || error?.message || 'Registration failed'
				throw {
					errors: [{ message: errorMessage }]
				}
			} finally {
				this.loading = false
			}
		},

		async signOut() {
			const { $api } = useNuxtApp()

			try {
				// Call NestJS /auth/logout endpoint
				await $api('/auth/logout', {
					method: 'POST'
				})
			} catch (error) {
				console.error('Logout error:', error)
			} finally {
				this.user = null
				this._saveState()
				// Stay on current subdomain
				await navigateTo('/login', { external: false })
			}
		},

		// Initialize auth state on app load
		async initialize() {
			if (!this.initialized) {
				await this.fetchUser()
			}
		},

		// Save state to localStorage (for caching only, not as source of truth)
		_saveState() {
			if (import.meta.client) {
				if (this.user) {
					localStorage.setItem('auth_state', JSON.stringify({
						user: this.user
					}))
				} else {
					localStorage.removeItem('auth_state')
				}
			}
		},

		// Clear all auth state
		clearAuth() {
			this.user = null
			this.initialized = false
			this._saveState()
		}
	}
})
