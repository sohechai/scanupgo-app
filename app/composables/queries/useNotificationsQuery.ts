import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { queryKeys } from '~/composables/queryKeys'
import type { Notification } from '~/composables/useNotifications'

// Dropdown open state is shared module-level (same as before)
const isDropdownOpen = ref(false)

export const useNotificationsCountQuery = () => {
	const { $api } = useNuxtApp()

	return useQuery({
		queryKey: queryKeys.notifications.count,
		queryFn: () => $api<{ count: number }>('/notifications/unread-count').then(r => r.count),
		refetchInterval: 10_000,
		staleTime: 0,
	})
}

export const useNotificationsListQuery = (opts?: { alwaysEnabled?: boolean; limit?: number }) => {
	const { $api } = useNuxtApp()
	const params: Record<string, string> = {}
	if (opts?.limit) params.limit = String(opts.limit)

	return useQuery({
		queryKey: queryKeys.notifications.list,
		queryFn: () => $api<Notification[]>('/notifications', { params }).then(d => d ?? []),
		enabled: opts?.alwaysEnabled ? true : computed(() => isDropdownOpen.value),
		staleTime: 0,
	})
}

export const useMarkAsReadMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => $api(`/notifications/${id}/read`, { method: 'PATCH' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list })
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.count })
		},
	})
}

export const useMarkAllAsReadMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => $api('/notifications/mark-all-read', { method: 'POST' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list })
			queryClient.setQueryData(queryKeys.notifications.count, 0)
		},
	})
}

export const useDeleteNotificationMutation = () => {
	const { $api } = useNuxtApp()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => $api(`/notifications/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list })
			queryClient.invalidateQueries({ queryKey: queryKeys.notifications.count })
		},
	})
}

export const useNotificationsDropdown = () => {
	const toggleDropdown = () => {
		isDropdownOpen.value = !isDropdownOpen.value
	}
	const closeDropdown = () => {
		isDropdownOpen.value = false
	}
	return { isDropdownOpen: readonly(isDropdownOpen), toggleDropdown, closeDropdown }
}
