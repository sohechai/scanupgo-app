<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth',
})
useHead({ title: 'Notifications' })

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
	{ value: 'all',        label: t('notifications.filter_all'),     icon: 'ph:list-bold' },
	{ value: 'unread',     label: t('notifications.filter_unread'),  icon: 'ph:circle-bold' },
	{ value: 'order',      label: t('notifications.filter_orders'),  icon: 'ph:package-bold' },
	{ value: 'prize',      label: t('notifications.filter_prizes'),  icon: 'ph:gift-bold' },
	{ value: 'new_player', label: t('notifications.filter_players'), icon: 'ph:users-bold' },
])

const handleNotificationClick = async (notification: any) => {
	if (!notification.read) await markAsRead(notification.id)
	if (notification.entityType === 'order' && notification.entityId) router.push('/dashboard/orders')
	else if (notification.entityType === 'player' && notification.entityId) router.push('/dashboard/players')
	else if (notification.entityType === 'game_session') router.push('/dashboard/redeem')
}
</script>

<template>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('notifications.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
					<span v-if="unreadCount > 0">{{ $t('notifications.unread', { count: unreadCount }) }}</span>
					<span v-else>{{ $t('notifications.all_read') }}</span>
				</p>
			</div>
			<button v-if="unreadCount > 0" @click="markAllAsRead"
				class="text-[#007AFF] text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-1.5">
				<Icon name="ph:checks-bold" size="14" />
				{{ $t('notifications.mark_all_read') }}
			</button>
		</div>

		<!-- Filters -->
		<div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
			<button v-for="option in filterOptions" :key="option.value" @click="filterType = option.value"
				class="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap"
				:class="filterType === option.value
					? 'bg-[#007AFF] text-white'
					: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'">
				{{ option.label }}
			</button>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex justify-center py-12">
			<Icon name="ph:spinner-gap-bold" size="28" class="animate-spin text-slate-300" />
		</div>

		<!-- Empty State -->
		<div v-else-if="filteredNotifications.length === 0"
			class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center">
			<div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mx-auto mb-3">
				<Icon name="ph:bell-slash-bold" size="18" class="text-slate-400" />
			</div>
			<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">{{ $t('notifications.no_notifications') }}</h3>
			<p class="text-sm text-slate-400 dark:text-slate-500">
				{{ filterType === 'unread' ? $t('notifications.no_notifications_unread') : $t('notifications.no_notifications_default') }}
			</p>
		</div>

		<!-- Notifications List -->
		<div v-else class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
			<TransitionGroup name="notification" tag="div" class="divide-y divide-slate-100 dark:divide-slate-800">
				<div v-for="notification in filteredNotifications" :key="notification.id"
					@click="handleNotificationClick(notification)"
					class="flex items-center gap-3.5 px-5 py-3.5 transition-colors cursor-pointer group"
					:class="!notification.read
						? 'bg-[#007AFF]/[0.03] dark:bg-[#007AFF]/5 hover:bg-[#007AFF]/[0.05]'
						: 'hover:bg-slate-50 dark:hover:bg-slate-800/50'">

					<!-- Icon -->
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon :name="getNotificationIcon(notification)" size="15" class="text-slate-400 dark:text-slate-500" />
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<p :class="['text-sm truncate', notification.read ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-900 dark:text-white font-semibold']">
								{{ notification.title }}
							</p>
							<span v-if="!notification.read" class="w-1.5 h-1.5 rounded-full bg-[#007AFF] shrink-0"></span>
						</div>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{{ notification.message }}</p>
					</div>

					<!-- Time + delete -->
					<div class="flex items-center gap-2 shrink-0">
						<span class="text-xs text-slate-400">{{ formatRelativeTime(notification.createdAt) }}</span>
						<button @click.stop="deleteNotification(notification.id)"
							class="p-1 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
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
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.notification-enter-active,
.notification-leave-active { transition: all 0.3s ease; }
.notification-enter-from { opacity: 0; transform: translateX(-20px); }
.notification-leave-to { opacity: 0; transform: translateX(20px); }
</style>
