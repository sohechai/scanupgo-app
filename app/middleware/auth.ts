// Cache auth status for 60s — avoids a backend round-trip on every tab click.
// Uses useState so signOut() can reset it when switching accounts.
const AUTH_CACHE_TTL = 60_000 // 1 minute

export default defineNuxtRouteMiddleware(async (to) => {
	// Skip middleware on server-side
	if (import.meta.server) {
		return
	}

	// Skip this middleware for admin routes (they have their own middleware)
	if (to.path.startsWith('/admin')) {
		return
	}

	const authStore = useAuthStore()
	const nuxtApp = useNuxtApp()
	const { $api } = nuxtApp

	// Shared cache via useState — accessible from signOut() to clear on logout
	const authCache = useState<{ user: any; checkedAt: number }>('_auth_cache', () => ({ user: null, checkedAt: 0 }))

	// Determine login path based on subdomain
	const host = window.location.hostname
	const isAdminSubdomain = host.startsWith('admin.')
	const loginPath = isAdminSubdomain ? '/admin/login' : '/login'

	let user: any = null

	// Use cached auth result if fresh enough — skip the backend call
	const now = Date.now()
	if (authCache.value.user && now - authCache.value.checkedAt < AUTH_CACHE_TTL) {
		user = authCache.value.user
	} else {
		try {
			// 5-second timeout — if the backend doesn't respond, fail fast
			const controller = new AbortController()
			const timeout = setTimeout(() => controller.abort(), 5000)

			const response = await $api<{ authenticated: boolean; user: any }>('/auth/status', {
				signal: controller.signal,
			})
			clearTimeout(timeout)

			if (!response.authenticated || !response.user) {
				authCache.value = { user: null, checkedAt: 0 }
				authStore.user = null
				authStore._saveState()
				return navigateTo(loginPath)
			}

			user = response.user
			authCache.value = { user, checkedAt: now }
		} catch (error: any) {
			// Timeout or network error — redirect to login
			console.warn('Auth check failed:', error?.message || error)
			authCache.value = { user: null, checkedAt: 0 }
			authStore.user = null
			authStore.initialized = true
			authStore._saveState()
			return navigateTo(loginPath)
		}
	}

	// Update local state
	if (authStore.user?.id !== user.id) {
		authStore.user = user
	} else {
		Object.assign(authStore.user, user)
	}
	authStore.initialized = true
	authStore._saveState()

	// Apply user's preferred language via cookie
	if (user.preferredLanguage) {
		const localeCookie = useCookie('i18n_locale')
		localeCookie.value = user.preferredLanguage
	}

	// Block access if account is suspended
	if (user.status === 'suspended' && to.path !== '/account-suspended') {
		return navigateTo('/account-suspended')
	}

	// Block access to dashboard if email is not verified
	if (!user.emailVerified && to.path.startsWith('/dashboard')) {
		return navigateTo('/verify-email-pending')
	}

	// Onboarding flow
	if (user.emailVerified && to.path.startsWith('/dashboard')) {
		const business = user.business
		const onboardingDone = business?.name &&
			business.name.trim() !== '' &&
			business.name.trim() !== user.email?.trim()

		if (!onboardingDone && to.path !== '/dashboard/onboarding') {
			return navigateTo('/dashboard/onboarding')
		}
	}
})
