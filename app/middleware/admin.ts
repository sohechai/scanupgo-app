export default defineNuxtRouteMiddleware(async (to, from) => {
	// Skip on server-side
	if (import.meta.server) {
		return
	}

	const { $api } = useNuxtApp()

	// Determine subdomain context
	const host = window.location.hostname
	const isAdminSubdomain = host.startsWith('admin.')

	console.log('[Admin middleware] checking access to:', to.path)

	try {
		const response = await $api<{ authenticated: boolean; user: any }>('/auth/status')

		console.log('[Admin middleware] auth status:', response.authenticated, 'role:', response.user?.role)

		// Not authenticated -> redirect to admin login
		if (!response.authenticated || !response.user) {
			console.log('[Admin middleware] not authenticated, redirect to /admin/login')
			return navigateTo('/admin/login')
		}

		// Authenticated but not SUPER_ADMIN
		if (response.user.role !== 'SUPER_ADMIN') {
			console.log('[Admin middleware] not SUPER_ADMIN (role:', response.user.role, '), logging out')
			await $api('/auth/logout', { method: 'POST' })

			// If on admin subdomain, redirect to admin login
			// Otherwise redirect to main login
			if (isAdminSubdomain) {
				return navigateTo('/admin/login')
			} else {
				return navigateTo('/login')
			}
		}

		console.log('[Admin middleware] access granted for SUPER_ADMIN')
	} catch (error) {
		console.error('[Admin middleware] error:', error)
		return navigateTo('/admin/login')
	}
})
