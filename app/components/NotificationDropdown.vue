<script setup lang="ts">
const router = useRouter()
const {
	notifications,
	unreadCount,
	loading,
	isDropdownOpen,
	toggleDropdown,
	closeDropdown,
	markAsRead,
	markAllAsRead,
	getNotificationIcon,
	getNotificationColor,
	formatRelativeTime,
} = useNotifications()

// Close dropdown when clicking outside
const dropdownRef = ref<HTMLElement | null>(null)

onMounted(() => {
	document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
})

const handleClickOutside = (event: MouseEvent) => {
	if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
		closeDropdown()
	}
}

const handleNotificationClick = async (notification: any) => {
	// Mark as read
	if (!notification.read) {
		await markAsRead(notification.id)
	}

	// Close dropdown
	closeDropdown()

	// Navigate to related entity
	if (notification.entityType === 'order' && notification.entityId) {
		router.push('/dashboard/orders')
	} else if (notification.entityType === 'player' && notification.entityId) {
		router.push('/dashboard/players')
	} else if (notification.entityType === 'game_session') {
		router.push('/dashboard/redeem')
	}
}

const getColorClasses = (color: string) => {
	const colorMap: Record<string, { bg: string; text: string }> = {
		green: {
			bg: 'bg-green-50 dark:bg-green-900/20',
			text: 'text-green-600 dark:text-green-400',
		},
		blue: {
			bg: 'bg-blue-50 dark:bg-blue-900/20',
			text: 'text-blue-600 dark:text-blue-400',
		},
		purple: {
			bg: 'bg-purple-50 dark:bg-purple-900/20',
			text: 'text-purple-600 dark:text-purple-400',
		},
		yellow: {
			bg: 'bg-yellow-50 dark:bg-yellow-900/20',
			text: 'text-yellow-600 dark:text-yellow-400',
		},
		red: {
			bg: 'bg-red-50 dark:bg-red-900/20',
			text: 'text-red-600 dark:text-red-400',
		},
		slate: {
			bg: 'bg-slate-50 dark:bg-slate-800/50',
			text: 'text-slate-600 dark:text-slate-400',
		},
	}

	return colorMap[color] || colorMap.slate
}
</script>

<template>
	<div ref="dropdownRef" class="relative">
		<!-- Trigger Button -->
		<button @click.stop="toggleDropdown"
			class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors relative"
			:title="$t('notifications.title')">
			<Icon name="ph:bell-simple-bold" size="18" />
			<span v-if="unreadCount > 0"
				class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900">
				{{ unreadCount > 99 ? '99+' : unreadCount }}
			</span>
		</button>

		<!-- Dropdown Panel -->
		<Teleport to="body">
			<Transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 scale-95"
				enter-to-class="opacity-100 scale-100" leave-active-class="transition ease-in duration-150"
				leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
				<div v-if="isDropdownOpen"
					class="fixed z-[9999] w-96 max-h-[480px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
					:style="{
						top: dropdownRef ? `${dropdownRef.getBoundingClientRect().bottom + 8}px` : '60px',
						right: '24px'
					}">
					<!-- Header -->
					<div
						class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
						<div class="flex items-center gap-2">
							<h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('notifications.dropdown.title') }}</h3>
							<span v-if="unreadCount > 0"
								class="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
								{{ unreadCount }}
							</span>
						</div>
						<button v-if="unreadCount > 0" @click="markAllAsRead"
							class="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
							{{ $t('notifications.dropdown.mark_all') }}
						</button>
					</div>

					<!-- Loading -->
					<div v-if="loading" class="flex items-center justify-center py-8">
						<Icon name="svg-spinners:ring-resize" size="24" class="text-slate-400" />
					</div>

					<!-- Empty State -->
					<div v-else-if="notifications.length === 0" class="py-12 text-center">
						<div
							class="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3">
							<Icon name="ph:bell-slash-bold" size="24" class="text-slate-400" />
						</div>
						<p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('notifications.dropdown.no_notifications') }}</p>
					</div>

					<!-- Notifications List -->
					<div v-else class="max-h-[350px] overflow-y-auto">
						<div v-for="notification in notifications" :key="notification.id"
							@click="handleNotificationClick(notification)" :class="[
								'px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50',
								!notification.read && 'bg-blue-50/50 dark:bg-blue-900/10'
							]">
							<div class="flex items-start gap-3">
								<!-- Icon -->
								<div :class="[
									'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
									getColorClasses(getNotificationColor(notification)).bg
								]">
									<Icon :name="getNotificationIcon(notification)" size="18"
										:class="getColorClasses(getNotificationColor(notification)).text" />
								</div>

								<!-- Content -->
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2">
										<h4 :class="[
											'text-sm font-semibold truncate',
											notification.read
												? 'text-slate-600 dark:text-slate-300'
												: 'text-slate-900 dark:text-white'
										]">
											{{ notification.title }}
											<span v-if="!notification.read"
												class="inline-block w-2 h-2 bg-blue-500 rounded-full ml-1"></span>
										</h4>
									</div>
									<p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
										{{ notification.message }}
									</p>
									<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
										{{ formatRelativeTime(notification.createdAt) }}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div class="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
						<NuxtLink to="/dashboard/notifications" @click="closeDropdown"
							class="block w-full text-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
							{{ $t('notifications.dropdown.view_all') }}
						</NuxtLink>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<style scoped>
.line-clamp-2 {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>
