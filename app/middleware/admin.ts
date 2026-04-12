export default defineNuxtRouteMiddleware(async (to, from) => {
	// Skip on server-side
	if (import.meta.server) {
		return
	}

	const { $api } = useNuxtApp()

	// Determine subdomain context
	const host = window.location.hostname
	const isAdminSubdomain = host.startsWith('admin.')
	const isLocalhost = host === 'localhost' || host.startsWith('127.0.0.1')

	// Block admin access from non-admin subdomains — return 404 silently (don't reveal admin exists)
	if (!isAdminSubdomain && !isLocalhost) {
		throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
	}

	try {
		const response = await $api<{ authenticated: boolean; user: any }>('/auth/status')


		// Not authenticated -> redirect to login
		if (!response.authenticated || !response.user) {
			return navigateTo('/login')
		}

		// Authenticated but not SUPER_ADMIN
		if (response.user.role !== 'SUPER_ADMIN') {
			await $api('/auth/logout', { method: 'POST' })
			return navigateTo('/login')
		}

	} catch (error) {
		console.error('[Admin middleware] error:', error)
		return navigateTo('/login')
	}
})
