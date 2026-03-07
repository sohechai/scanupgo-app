export interface Notification {
	id: string
	userId: string
	type: string
	title: string
	message: string
	icon?: string
	color?: string
	entityType?: string
	entityId?: string
	read: boolean
	readAt?: string
	emailSent: boolean
	emailSentAt?: string
	createdAt: string
}

// Shared state across all components using this composable
const notifications = ref<Notification[]>([])
const unreadCount = ref(0)
const loading = ref(false)
const isDropdownOpen = ref(false)
const lastFetchTime = ref(0)
const pollingInterval = ref<ReturnType<typeof setInterval> | null>(null)

export const useNotifications = () => {
	const { $api } = useNuxtApp()
	const { t } = useI18n()
	const { formatDate } = useLocaleDate()

	/**
	 * Fetch all notifications
	 */
	const fetchNotifications = async (options?: { unreadOnly?: boolean; limit?: number }) => {
		loading.value = true
		try {
			const params: Record<string, string> = {}
			if (options?.unreadOnly) params.unreadOnly = 'true'
			if (options?.limit) params.limit = options.limit.toString()

			notifications.value = await $api<Notification[]>('/notifications', { params })
			lastFetchTime.value = Date.now()
		} catch (error) {
			console.error('Error fetching notifications:', error)
		} finally {
			loading.value = false
		}
	}

	/**
	 * Fetch unread count
	 */
	const fetchUnreadCount = async () => {
		try {
			const result = await $api<{ count: number }>('/notifications/unread-count')
			const previousCount = unreadCount.value
			unreadCount.value = result.count

			// If new notifications arrived, refresh the list
			if (result.count > previousCount && isDropdownOpen.value) {
				await fetchNotifications({ limit: 10 })
			}
		} catch (error) {
			console.error('Error fetching unread count:', error)
		}
	}

	/**
	 * Start polling for new notifications
	 */
	const startPolling = (intervalMs = 10000) => {
		if (pollingInterval.value) return

		// Initial fetch
		fetchUnreadCount()

		// Poll every intervalMs
		pollingInterval.value = setInterval(() => {
			fetchUnreadCount()
		}, intervalMs)
	}

	/**
	 * Stop polling
	 */
	const stopPolling = () => {
		if (pollingInterval.value) {
			clearInterval(pollingInterval.value)
			pollingInterval.value = null
		}
	}

	/**
	 * Mark notification as read
	 */
	const markAsRead = async (notificationId: string) => {
		try {
			await $api(`/notifications/${notificationId}/read`, { method: 'PATCH' })

			// Update local state
			const notification = notifications.value.find(n => n.id === notificationId)
			if (notification && !notification.read) {
				notification.read = true
				notification.readAt = new Date().toISOString()
				unreadCount.value = Math.max(0, unreadCount.value - 1)
			}
		} catch (error) {
			console.error('Error marking notification as read:', error)
		}
	}

	/**
	 * Mark all notifications as read
	 */
	const markAllAsRead = async () => {
		try {
			await $api('/notifications/mark-all-read', { method: 'POST' })

			// Update local state
			notifications.value.forEach(n => {
				if (!n.read) {
					n.read = true
					n.readAt = new Date().toISOString()
				}
			})
			unreadCount.value = 0
		} catch (error) {
			console.error('Error marking all as read:', error)
		}
	}

	/**
	 * Delete notification
	 */
	const deleteNotification = async (notificationId: string) => {
		try {
			await $api(`/notifications/${notificationId}`, { method: 'DELETE' })

			// Update local state
			const index = notifications.value.findIndex(n => n.id === notificationId)
			if (index !== -1) {
				if (!notifications.value[index].read) {
					unreadCount.value = Math.max(0, unreadCount.value - 1)
				}
				notifications.value.splice(index, 1)
			}
		} catch (error) {
			console.error('Error deleting notification:', error)
		}
	}

	/**
	 * Toggle dropdown
	 */
	const toggleDropdown = async () => {
		isDropdownOpen.value = !isDropdownOpen.value

		// Fetch notifications when opening
		if (isDropdownOpen.value) {
			await fetchNotifications({ limit: 10 })
		}
	}

	/**
	 * Close dropdown
	 */
	const closeDropdown = () => {
		isDropdownOpen.value = false
	}

	/**
	 * Get icon for notification type
	 */
	const getNotificationIcon = (notification: Notification): string => {
		if (notification.icon) return notification.icon

		const iconMap: Record<string, string> = {
			order_created: 'ph:package-bold',
			order_paid: 'ph:check-circle-bold',
			order_shipped: 'ph:truck-bold',
			order_delivered: 'ph:check-circle-bold',
			prize_redeemed: 'ph:gift-bold',
			new_player: 'ph:user-plus-bold',
			subscription_expiring: 'ph:warning-bold',
			admin_announcement: 'ph:megaphone-bold',
		}

		return iconMap[notification.type] || 'ph:bell-bold'
	}

	/**
	 * Get color for notification type
	 */
	const getNotificationColor = (notification: Notification): string => {
		if (notification.color) return notification.color

		const colorMap: Record<string, string> = {
			order_created: 'blue',
			order_paid: 'green',
			order_shipped: 'purple',
			order_delivered: 'green',
			prize_redeemed: 'green',
			new_player: 'blue',
			subscription_expiring: 'yellow',
			admin_announcement: 'blue',
		}

		return colorMap[notification.type] || 'slate'
	}

	/**
	 * Format relative time
	 */
	const formatRelativeTime = (dateString: string): string => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMinutes = Math.floor(diffMs / (1000 * 60))
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffMinutes < 1) return t('notifications.time.just_now')
		if (diffMinutes < 60) return t('notifications.time.minutes_ago', { count: diffMinutes })
		if (diffHours < 24) return t('notifications.time.hours_ago', { count: diffHours })
		if (diffDays < 7) return t('notifications.time.days_ago', { count: diffDays })

		return formatDate(date, { day: 'numeric', month: 'short' })
	}

	return {
		notifications,
		unreadCount,
		loading,
		isDropdownOpen,
		fetchNotifications,
		fetchUnreadCount,
		startPolling,
		stopPolling,
		markAsRead,
		markAllAsRead,
		deleteNotification,
		toggleDropdown,
		closeDropdown,
		getNotificationIcon,
		getNotificationColor,
		formatRelativeTime,
	}
}
