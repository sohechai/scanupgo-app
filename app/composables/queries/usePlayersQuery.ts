import { useQuery } from '@tanstack/vue-query'
import { queryKeys } from '~/composables/queryKeys'

export const usePlayersQuery = () => {
	const { $api } = useNuxtApp()
	const { hasActiveSubscription } = useSubscription()

	return useQuery({
		queryKey: queryKeys.players.all,
		queryFn: () => $api<any[]>('/players').then(d => d ?? []),
		enabled: computed(() => hasActiveSubscription.value),
	})
}
