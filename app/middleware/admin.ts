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

	const checkAuth = async () => {
		const response = await $api<{ authenticated: boolean; user: any }>('/auth/status')
		return response
	}

	let response: { authenticated: boolean; user: any } | null = null

	try {
		response = await checkAuth()

		// If not authenticated on first try, wait briefly and retry once
		// (session may still be committing after login redirect)
		if (!response.authenticated || !response.user) {
			await new Promise(resolve => setTimeout(resolve, 400))
			response = await checkAuth()
		}
	} catch {
		// On network/server error, wait and retry once
		await new Promise(resolve => setTimeout(resolve, 400))
		try {
			response = await checkAuth()
		} catch (retryError) {
			console.error('[Admin middleware] error:', retryError)
			return navigateTo('/login')
		}
	}

	// Not authenticated after retry -> redirect to login
	if (!response || !response.authenticated || !response.user) {
		return navigateTo('/login')
	}

	// Authenticated but not SUPER_ADMIN
	if (response.user.role !== 'SUPER_ADMIN') {
		await $api('/auth/logout', { method: 'POST' })
		return navigateTo('/login')
	}
})
