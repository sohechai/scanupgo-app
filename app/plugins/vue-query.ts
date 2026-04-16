import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

export default defineNuxtPlugin((nuxtApp) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				// Data considered fresh for 60s — no refetch on every navigation
				staleTime: 60_000,
				// Keep unused data in cache for 5 minutes
				gcTime: 5 * 60_000,
				// Don't retry on 4xx errors
				retry: (failureCount, error: any) => {
					if (error?.status >= 400 && error?.status < 500) return false
					return failureCount < 2
				},
			},
		},
	})

	nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

	return {
		provide: { queryClient },
	}
})
