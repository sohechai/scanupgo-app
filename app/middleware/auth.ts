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
	const { $api } = useNuxtApp()

	// Determine login path based on subdomain
	const host = window.location.hostname
	const isAdminSubdomain = host.startsWith('admin.')
	const loginPath = isAdminSubdomain ? '/admin/login' : '/login'

	try {
		// Always verify session with backend
		// This ensures we have a valid server-side session
		const response = await $api<{ authenticated: boolean; user: any }>('/auth/status')

		if (!response.authenticated || !response.user) {
			// Clear local state and redirect to login
			authStore.user = null
			authStore._saveState()
			return navigateTo(loginPath)
		}

		// Update local state with server user data
		// Only replace the user object if the ID changed to avoid unnecessary re-renders
		if (authStore.user?.id !== response.user.id) {
			authStore.user = response.user
		} else {
			Object.assign(authStore.user, response.user)
		}
		authStore.initialized = true
		authStore._saveState()

		// Block access if account is suspended
		if (response.user.status === 'suspended' && to.path !== '/account-suspended') {
			return navigateTo('/account-suspended')
		}

		// Block access to dashboard if email is not verified
		if (!response.user.emailVerified && to.path.startsWith('/dashboard')) {
			return navigateTo('/verify-email-pending')
		}
	} catch (error: any) {
		// If status check fails (401, network error, etc.), redirect to login
		console.warn('Auth check failed:', error)
		authStore.user = null
		authStore.initialized = true
		authStore._saveState()
		return navigateTo(loginPath)
	}
})
