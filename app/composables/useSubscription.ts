export const useSubscription = () => {
	const { user } = useAuth()
	const store = useSubscriptionStore()

	const isAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')

	const subscription = computed(() => store.data)
	const loading = computed(() => store.loading)

	const hasActiveSubscription = computed(() => {
		if (isAdmin.value) return true
		if (!store.data) return false
		if (store.data.status !== 'active') return false
		if (store.data.cancelledAt && store.data.currentPeriodEnd) {
			if (new Date(store.data.currentPeriodEnd) <= new Date()) return false
		}
		return true
	})

	const fetchSubscription = (force = false) => store.fetch(force)
	const refreshSubscription = () => store.fetch(true)

	const hasPlanFeature = (feature: string): boolean => {
		if (isAdmin.value) return true
		return !!store.data?.plan?.features?.[feature]
	}

	const getPlanLimit = (limit: string): number | null => {
		if (isAdmin.value) return null
		return store.data?.plan?.features?.[limit] ?? null
	}

	return {
		subscription,
		loading,
		hasActiveSubscription,
		isAdmin,
		fetchSubscription,
		refreshSubscription,
		hasPlanFeature,
		getPlanLimit,
	}
}
