// Cache auth status for 60s — avoids a backend round-trip on every tab click.
// The backend session is still the authority; this just reduces chattiness.
const _authCache = {
	user: null as any,
	checkedAt: 0,
	TTL: 60_000, // 1 minute
}

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

	// Determine login path based on subdomain
	const host = window.location.hostname
	const isAdminSubdomain = host.startsWith('admin.')
	const loginPath = isAdminSubdomain ? '/admin/login' : '/login'

	let user: any = null

	// Use cached auth result if fresh enough — skip the backend call
	const now = Date.now()
	if (_authCache.user && now - _authCache.checkedAt < _authCache.TTL) {
		user = _authCache.user
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
				_authCache.user = null
				_authCache.checkedAt = 0
				authStore.user = null
				authStore._saveState()
				return navigateTo(loginPath)
			}

			user = response.user
			_authCache.user = user
			_authCache.checkedAt = now
		} catch (error: any) {
			// Timeout or network error — redirect to login
			console.warn('Auth check failed:', error?.message || error)
			_authCache.user = null
			_authCache.checkedAt = 0
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
