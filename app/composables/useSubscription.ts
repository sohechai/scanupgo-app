export const useSubscription = () => {
	const { $api } = useNuxtApp()
	const { user } = useAuth()

	const subscription = useState<any>('subscription', () => null)
	const loading = useState<boolean>('subscription-loading', () => true)
	const fetched = useState<boolean>('subscription-fetched', () => false)

	// Check if user is SUPER_ADMIN
	const isAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')

	const hasActiveSubscription = computed(() => {
		// SUPER_ADMIN always has full access
		if (isAdmin.value) return true

		if (!subscription.value) return false
		if (subscription.value.status !== 'active') return false
		// Check if expired
		if (subscription.value.cancelledAt && subscription.value.currentPeriodEnd) {
			const endDate = new Date(subscription.value.currentPeriodEnd)
			const now = new Date()
			if (endDate <= now) return false
		}
		return true
	})

	const fetchSubscription = async (force = false) => {
		// Don't fetch again if already fetched (unless forced)
		if (fetched.value && !force) return subscription.value

		loading.value = true
		try {
			subscription.value = await $api('/subscriptions/current')
		} catch (error) {
			console.error('Failed to fetch subscription:', error)
			subscription.value = null
		} finally {
			loading.value = false
			fetched.value = true
		}
		return subscription.value
	}

	const refreshSubscription = () => fetchSubscription(true)

	return {
		subscription,
		loading,
		hasActiveSubscription,
		isAdmin,
		fetchSubscription,
		refreshSubscription
	}
}
