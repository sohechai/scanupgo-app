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
	<div class="space-y-5">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('notifications.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
					<span v-if="unreadCount > 0">{{ $t('notifications.unread', { count: unreadCount }) }}</span>
					<span v-else>{{ $t('notifications.all_read') }}</span>
				</p>
			</div>
			<button v-if="unreadCount > 0" @click="markAllAsRead"
				class="text-[#007AFF] text-sm font-semibold hover:opacity-70 transition-opacity flex items-center gap-1.5">
				<Icon name="ph:checks-bold" size="15" />
				{{ $t('notifications.mark_all_read') }}
			</button>
		</div>

		<!-- Filters -->
		<div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
			<button v-for="option in filterOptions" :key="option.value" @click="filterType = option.value"
				class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
				:class="filterType === option.value
					? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
					: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300 hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]'">
				{{ option.label }}
			</button>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex justify-center py-12">
			<Icon name="ph:spinner-gap-bold" size="28" class="animate-spin text-slate-300" />
		</div>

		<!-- Empty State -->
		<div v-else-if="filteredNotifications.length === 0"
			class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-12 text-center shadow-sm">
			<div class="w-14 h-14 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-center mx-auto mb-3">
				<Icon name="ph:bell-slash-bold" size="28" class="text-slate-400" />
			</div>
			<h3 class="text-base font-bold text-slate-900 dark:text-white mb-1">{{ $t('notifications.no_notifications') }}</h3>
			<p class="text-sm text-slate-400 dark:text-slate-500">
				{{ filterType === 'unread' ? $t('notifications.no_notifications_unread') : $t('notifications.no_notifications_default') }}
			</p>
		</div>

		<!-- Notifications List -->
		<div v-else class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden shadow-sm">
			<TransitionGroup name="notification" tag="div" class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
				<div v-for="notification in filteredNotifications" :key="notification.id"
					@click="handleNotificationClick(notification)"
					class="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer group"
					:class="!notification.read ? 'bg-[#007AFF]/[0.03] dark:bg-[#007AFF]/5' : ''">
					<!-- Icon -->
					<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon :name="getNotificationIcon(notification)" size="17" class="text-slate-500 dark:text-slate-400" />
					</div>
					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<p :class="['text-sm font-semibold truncate', notification.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white']">
								{{ notification.title }}
							</p>
							<span v-if="!notification.read" class="w-2 h-2 rounded-full bg-[#007AFF] shrink-0"></span>
						</div>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{{ notification.message }}</p>
					</div>
					<!-- Time + delete -->
					<div class="flex items-center gap-2 shrink-0">
						<span class="text-[11px] text-slate-400">{{ formatRelativeTime(notification.createdAt) }}</span>
						<button @click.stop="deleteNotification(notification.id)"
							class="p-1 text-slate-300 hover:text-[#FF3B30] rounded-lg opacity-0 group-hover:opacity-100 transition-all"
							:title="$t('notifications.delete')">
							<Icon name="ph:trash-bold" size="13" />
						</button>
					</div>
				</div>
			</TransitionGroup>
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
