import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/composables/queryKeys'

export const useGamesListQuery = () => {
	const { $api } = useNuxtApp()
	const { hasActiveSubscription } = useSubscription()

	return useQuery({
		queryKey: queryKeys.games.all,
		queryFn: () => $api<any[]>('/games').then(d => d ?? []),
		enabled: computed(() => hasActiveSubscription.value),
	})
}

export const useGameDetailQuery = (id: ComputedRef<string> | Ref<string>) => {
	const { $api } = useNuxtApp()
	const isNew = computed(() => unref(id) === 'new')

	return useQuery({
		queryKey: computed(() => queryKeys.games.detail(unref(id))),
		queryFn: () => $api<any>(`/games/${unref(id)}`),
		enabled: computed(() => !isNew.value && !!unref(id)),
	})
}

export const useDeleteGameMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()
	const { show: showToast } = useToast()
	const { t } = useI18n()

	return useMutation({
		mutationFn: (id: string) => $api(`/games/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.games.all })
			showToast(t('games.game_deleted'), 'success')
		},
		onError: (error: any) => {
			showToast(error?.data?.message || t('games.delete_error'), 'error')
		},
	})
}

export const useCreateGameMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: any) => $api<any>('/games', { method: 'POST', body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.games.all })
		},
	})
}

export const useSaveGameMutation = (id: ComputedRef<string> | Ref<string>) => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: any) => $api<any>(`/games/${unref(id)}`, { method: 'PATCH', body }),
		onSuccess: (data) => {
			queryClient.setQueryData(queryKeys.games.detail(unref(id)), data)
			queryClient.invalidateQueries({ queryKey: queryKeys.games.all })
		},
	})
}
