<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth',
})

const { t } = useI18n()
const router = useRouter()
const {
	notifications,
	unreadCount,
	loading,
	fetchNotifications,
	markAsRead,
	markAllAsRead,
	deleteNotification,
	getNotificationIcon,
	getNotificationColor,
	formatRelativeTime,
} = useNotifications()

const filterType = ref<string>('all')

onMounted(() => {
	fetchNotifications()
})

const filteredNotifications = computed(() => {
	if (filterType.value === 'all') return notifications.value
	if (filterType.value === 'unread') return notifications.value.filter(n => !n.read)
	return notifications.value.filter(n => n.type.startsWith(filterType.value))
})

const filterOptions = computed(() => [
	{ value: 'all', label: t('notifications.filter_all'), icon: 'ph:list-bold' },
	{ value: 'unread', label: t('notifications.filter_unread'), icon: 'ph:circle-bold' },
	{ value: 'order', label: t('notifications.filter_orders'), icon: 'ph:package-bold' },
	{ value: 'prize', label: t('notifications.filter_prizes'), icon: 'ph:gift-bold' },
	{ value: 'new_player', label: t('notifications.filter_players'), icon: 'ph:users-bold' },
])

const handleNotificationClick = async (notification: any) => {
	// Mark as read
	if (!notification.read) {
		await markAsRead(notification.id)
	}

	// Navigate to related entity
	if (notification.entityType === 'order' && notification.entityId) {
		// For orders, go to orders page
		router.push('/dashboard/orders')
	} else if (notification.entityType === 'player' && notification.entityId) {
		router.push('/dashboard/players')
	} else if (notification.entityType === 'game_session') {
		router.push('/dashboard/redeem')
	}
}

const getColorClasses = (color: string) => {
	const colorMap: Record<string, { bg: string; text: string; border: string }> = {
		green: {
			bg: 'bg-green-50 dark:bg-green-900/20',
			text: 'text-green-600 dark:text-green-400',
			border: 'border-green-200 dark:border-green-800',
		},
		blue: {
			bg: 'bg-blue-50 dark:bg-blue-900/20',
			text: 'text-blue-600 dark:text-blue-400',
			border: 'border-blue-200 dark:border-blue-800',
		},
		purple: {
			bg: 'bg-purple-50 dark:bg-purple-900/20',
			text: 'text-purple-600 dark:text-purple-400',
			border: 'border-purple-200 dark:border-purple-800',
		},
		yellow: {
			bg: 'bg-yellow-50 dark:bg-yellow-900/20',
			text: 'text-yellow-600 dark:text-yellow-400',
			border: 'border-yellow-200 dark:border-yellow-800',
		},
		red: {
			bg: 'bg-red-50 dark:bg-red-900/20',
			text: 'text-red-600 dark:text-red-400',
			border: 'border-red-200 dark:border-red-800',
		},
		slate: {
			bg: 'bg-slate-50 dark:bg-slate-900/20',
			text: 'text-slate-600 dark:text-slate-400',
			border: 'border-slate-200 dark:border-slate-700',
		},
	}

	return colorMap[color] || colorMap.slate
}
</script>

<template>
	<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
			<!-- Header -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ $t('notifications.title') }}</h1>
					<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
						<span v-if="unreadCount > 0">{{ $t('notifications.unread', { count: unreadCount }) }}</span>
						<span v-else>{{ $t('notifications.all_read') }}</span>
					</p>
				</div>

				<button v-if="unreadCount > 0" @click="markAllAsRead"
					class="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
					<Icon name="ph:checks-bold" size="16" />
					{{ $t('notifications.mark_all_read') }}
				</button>
			</div>

			<!-- Filters -->
			<div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
				<button v-for="option in filterOptions" :key="option.value" @click="filterType = option.value" :class="[
					'px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap',
					filterType === option.value
						? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
						: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
				]">
					<Icon :name="option.icon" size="16" />
					{{ option.label }}
				</button>
			</div>

			<!-- Loading -->
			<div v-if="loading" class="flex justify-center py-12">
				<Icon name="svg-spinners:ring-resize" size="32" class="text-slate-400" />
			</div>

			<!-- Empty State -->
			<div v-else-if="filteredNotifications.length === 0"
				class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
				<div
					class="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
					<Icon name="ph:bell-slash-bold" size="32" class="text-slate-400" />
				</div>
				<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ $t('notifications.no_notifications') }}</h3>
				<p class="text-sm text-slate-500 dark:text-slate-400">
					{{ filterType === 'unread' ? $t('notifications.no_notifications_unread') : $t('notifications.no_notifications_default') }}
				</p>
			</div>

			<!-- Notifications List -->
			<div v-else class="space-y-3">
				<TransitionGroup name="notification">
					<div v-for="notification in filteredNotifications" :key="notification.id" @click="handleNotificationClick(notification)"
						:class="[
							'bg-white dark:bg-slate-800 rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md group',
							notification.read
								? 'border-slate-200 dark:border-slate-700'
								: 'border-slate-300 dark:border-slate-600 ring-1 ring-slate-200 dark:ring-slate-600'
						]">
						<div class="flex items-start gap-4">
							<!-- Icon -->
							<div :class="[
								'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
								getColorClasses(getNotificationColor(notification)).bg
							]">
								<Icon :name="getNotificationIcon(notification)" size="20"
									:class="getColorClasses(getNotificationColor(notification)).text" />
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-start justify-between gap-2">
									<div>
										<h4 :class="[
											'text-sm font-bold',
											notification.read
												? 'text-slate-700 dark:text-slate-300'
												: 'text-slate-900 dark:text-white'
										]">
											{{ notification.title }}
											<span v-if="!notification.read"
												class="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
										</h4>
										<p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
											{{ notification.message }}
										</p>
									</div>

									<div class="flex items-center gap-2 shrink-0">
										<span class="text-xs text-slate-400 dark:text-slate-500">
											{{ formatRelativeTime(notification.createdAt) }}
										</span>
										<button @click.stop="deleteNotification(notification.id)"
											class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
											:title="$t('notifications.delete')">
											<Icon name="ph:trash-bold" size="14" />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</TransitionGroup>
			</div>
		</div>
	</div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
	display: none;
}

.no-scrollbar {
	-ms-overflow-style: none;
	scrollbar-width: none;
}

.notification-enter-active,
.notification-leave-active {
	transition: all 0.3s ease;
}

.notification-enter-from {
	opacity: 0;
	transform: translateX(-20px);
}

.notification-leave-to {
	opacity: 0;
	transform: translateX(20px);
}
</style>
