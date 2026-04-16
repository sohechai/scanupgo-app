// Module-level dedup: one in-flight fetch at a time
let _pendingFetch: Promise<any> | null = null
let _lastFetchedAt: number = 0
const SUBSCRIPTION_TTL = 5 * 1000 // 5 seconds — dedup only, effectively always fresh on navigation

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
		// Don't fetch again if recently fetched (unless forced or TTL expired)
		const cacheExpired = Date.now() - _lastFetchedAt > SUBSCRIPTION_TTL
		if (fetched.value && !force && !cacheExpired) return subscription.value

		// Dedup: if a fetch is already in-flight, wait for it instead of firing another
		if (_pendingFetch) return _pendingFetch

		loading.value = true
		_pendingFetch = $api('/subscriptions/current', { params: force ? { sync: 'true' } : {} })
			.then((data: any) => { subscription.value = data })
			.catch(() => { subscription.value = null })
			.finally(() => {
				loading.value = false
				fetched.value = true
				_lastFetchedAt = Date.now()
				_pendingFetch = null
			})

		await _pendingFetch
		return subscription.value
	}

	const refreshSubscription = () => fetchSubscription(true)

	// Check if the current plan includes a boolean feature (e.g. 'google_reviews')
	const hasPlanFeature = (feature: string): boolean => {
		if (isAdmin.value) return true
		return !!subscription.value?.plan?.features?.[feature]
	}

	// Get a numeric plan limit (e.g. 'email_credits_per_month', 'max_games')
	const getPlanLimit = (limit: string): number | null => {
		if (isAdmin.value) return null // no limit for admins
		return subscription.value?.plan?.features?.[limit] ?? null
	}

	return {
		subscription,
		loading,
		hasActiveSubscription,
		isAdmin,
		fetchSubscription,
		refreshSubscription,
		hasPlanFeature,
		getPlanLimit
	}
}
