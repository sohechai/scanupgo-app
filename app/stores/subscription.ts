import { defineStore } from 'pinia'

const TTL = 60 * 1000 // re-fetch after 1 minute

export const useSubscriptionStore = defineStore('subscription', {
	state: () => ({
		data: null as any,
		loading: false,
		initialized: false,
		lastFetchedAt: 0,
	}),

	getters: {
		isStale: (state) => Date.now() - state.lastFetchedAt > TTL,
	},

	actions: {
		async fetch(force = false) {
			if (this.initialized && !force && !this.isStale) return

			this.loading = true
			try {
				const { $api } = useNuxtApp()
				this.data = await $api('/subscriptions/current')
				this.initialized = true
				this.lastFetchedAt = Date.now()
			} catch {
				this.data = null
				this.initialized = true
			} finally {
				this.loading = false
			}
		},

		clear() {
			this.data = null
			this.initialized = false
			this.lastFetchedAt = 0
		},
	},
})
