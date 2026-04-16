import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/composables/queryKeys'
import type { Order, OrderStats, CreateOrderDto, UpdateOrderStatusDto } from '~/composables/useOrders'

export const useOrdersListQuery = () => {
	const { $api } = useNuxtApp()
	const { hasActiveSubscription } = useSubscription()

	return useQuery({
		queryKey: queryKeys.orders.all,
		queryFn: () => $api<Order[]>('/orders').then(d => d ?? []),
		enabled: computed(() => hasActiveSubscription.value),
	})
}

export const useOrderStatsQuery = () => {
	const { $api } = useNuxtApp()
	const { hasActiveSubscription } = useSubscription()

	return useQuery({
		queryKey: queryKeys.orders.stats,
		queryFn: () => $api<OrderStats>('/orders/stats'),
		enabled: computed(() => hasActiveSubscription.value),
	})
}

export const useCreateOrderMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (body: CreateOrderDto) => $api<Order>('/orders', { method: 'POST', body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats })
		},
	})
}

export const useUpdateOrderStatusMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()
	const { show: showToast } = useToast()

	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & UpdateOrderStatusDto) =>
			$api<Order>(`/orders/${id}/status`, { method: 'PATCH', body }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
			queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats })
			showToast('Statut mis à jour avec succès', 'success')
		},
		onError: (error: any) => {
			showToast(error?.data?.message || 'Impossible de mettre à jour le statut', 'error')
		},
	})
}
