<script setup lang="ts">
const { user, signOut } = useAuth()
const { t } = useI18n()
const route = useRoute()
const { startPolling, stopPolling } = useNotifications()
const { fetchSubscription, hasActiveSubscription, isAdmin } = useSubscription()

const freeRoutes = ['/dashboard/subscription', '/dashboard/account', '/dashboard/profile', '/dashboard/onboarding']
const requiresSubscription = computed(() => {
	if (route.path === '/dashboard') return false
	return !freeRoutes.some(r => route.path === r || route.path.startsWith(r + '/'))
})

const handleVisibilityChange = () => {
	if (document.visibilityState === 'visible') {
		fetchSubscription(true)
	}
}

onMounted(() => {
	fetchSubscription()
	startPolling(10000)
	document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
	stopPolling()
	document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const navItems = computed(() => [
	{ name: t('dashboard.nav.dashboard'), path: '/dashboard', icon: 'ph:squares-four-duotone' },
	{ name: t('dashboard.nav.business'), path: '/dashboard/profile', icon: 'ph:storefront-duotone' },
	{ name: t('dashboard.nav.games'), path: '/dashboard/games', icon: 'ph:game-controller-duotone' },
	{ name: t('dashboard.nav.orders'), path: '/dashboard/orders', icon: 'ph:shopping-cart-duotone' },
	{ name: t('dashboard.nav.players'), path: '/dashboard/players', icon: 'ph:users-three-duotone' },
	{ name: t('dashboard.nav.marketing'), path: '/dashboard/marketing', icon: 'ph:megaphone-duotone' },
	{ name: t('dashboard.nav.redeem'), path: '/dashboard/redeem', icon: 'ph:check-circle-duotone' },
	{ name: t('dashboard.nav.subscription'), path: '/dashboard/subscription', icon: 'ph:crown-duotone' },
	{ name: t('dashboard.nav.account'), path: '/dashboard/account', icon: 'ph:user-circle-duotone' },
])

const isActive = (path: string) => route.path === path || (path !== '/dashboard' && route.path.startsWith(path))

const isSidebarOpen = ref(false)

watch(
	() => route.path,
	() => {
		isSidebarOpen.value = false
		fetchSubscription()
	}
)

const colorMode = useColorMode()
const toggleTheme = () => {
	colorMode.preference = colorMode.value === 'light' ? 'dark' : 'light'
}
</script>

<template>
	<div class="h-screen overflow-hidden bg-[#f0f4f8] dark:bg-slate-950 font-sans flex text-slate-900 dark:text-slate-100 selection:bg-brand-500/30 selection:text-brand-700">

		<!-- Mobile Sidebar Backdrop -->
		<div v-if="isSidebarOpen" @click="isSidebarOpen = false"
			class="fixed inset-0 bg-black/20 z-30 lg:hidden transition-opacity"></div>

		<!-- Sidebar -->
		<aside
			class="w-60 fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 bg-[#f0f4f8] dark:bg-slate-950 flex flex-col z-40 transition-transform duration-300"
			:class="isSidebarOpen ? 'translate-x-0 rtl:-translate-x-0 shadow-xl' : '-translate-x-full rtl:translate-x-full lg:translate-x-0 rtl:lg:-translate-x-0'">

			<!-- Brand -->
			<div class="h-14 flex items-center px-4">
				<div class="flex items-center gap-2.5">
					<div class="w-7 h-7 bg-slate-900 dark:bg-white rounded-md flex items-center justify-center text-white dark:text-slate-900 font-bold text-xs">
						B.
					</div>
					<span class="font-semibold text-slate-800 dark:text-white text-sm tracking-tight">ScanUpGo</span>
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 overflow-y-auto px-2 space-y-0.5">
				<NuxtLink v-for="item in navItems" :key="item.path" :to="item.path"
					class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group"
					:class="isActive(item.path)
						? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-sm'
						: 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'">
					<Icon :name="item.icon" size="17" class="shrink-0 transition-colors"
						:class="isActive(item.path) ? 'text-[#007AFF]' : 'text-slate-400 dark:text-slate-500'" />
					<span>{{ item.name }}</span>
				</NuxtLink>
			</nav>

			<!-- User Footer -->
			<div class="p-2 mt-auto space-y-0.5">
				<NuxtLink to="/dashboard/account"
					class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/50 transition-colors group">
					<img v-if="user?.business?.logo" :src="user.business.logo" :alt="user.business.name"
						class="w-7 h-7 rounded-md object-cover shrink-0" />
					<div v-else
						class="w-7 h-7 rounded-md bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
						{{ user?.email?.charAt(0).toUpperCase() || 'U' }}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{{ user?.business?.name || t('dashboard.my_account') }}</p>
						<p class="text-[10px] text-slate-400 truncate">{{ user?.email }}</p>
					</div>
					<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />
				</NuxtLink>

				<button @click="signOut"
					class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500 dark:hover:text-red-400 transition-colors">
					<Icon name="ph:sign-out-bold" size="15" class="shrink-0" />
					<span class="text-xs font-medium">{{ $t('dashboard.logout') }}</span>
				</button>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 h-full overflow-hidden lg:ml-60 rtl:lg:ml-0 rtl:lg:mr-60 p-2.5 transition-all duration-300 flex flex-col">

			<!-- Interface Card -->
			<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden">

				<!-- Header -->
				<header class="h-14 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-5 shrink-0 bg-white dark:bg-slate-900">
					<div class="flex items-center gap-4">
						<button @click="isSidebarOpen = true" class="lg:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white">
							<Icon name="ph:list-bold" size="18" />
						</button>
						<div class="flex items-center gap-2 text-sm">
							<Icon name="ph:house-duotone" size="15" class="text-slate-400" />
							<span class="text-slate-300 dark:text-slate-600">/</span>
							<span class="font-medium text-slate-700 dark:text-slate-200">
								{{ navItems.find(i => isActive(i.path))?.name || $t('dashboard.nav.dashboard') }}
							</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<LanguageSelector />
						<ClientOnly>
							<button @click="toggleTheme"
								class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
								:title="colorMode.value === 'dark' ? $t('dashboard.light_mode') : $t('dashboard.dark_mode')">
								<Icon :name="colorMode.value === 'dark' ? 'ph:sun-bold' : 'ph:moon-bold'" size="16" />
							</button>
						</ClientOnly>
						<NotificationDropdown />
						<a href="/" target="_blank"
							class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 text-xs font-medium hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-white transition-colors">
							<Icon name="ph:arrow-square-out-bold" size="14" />
							{{ $t('dashboard.view_site') }}
						</a>
					</div>
				</header>

				<!-- Page Content -->
				<div class="flex-1 overflow-y-auto bg-[#f8fafc] dark:bg-slate-900/50">
					<div class="p-6 lg:p-7">
						<template v-if="requiresSubscription">
							<SubscriptionGate>
								<slot />
							</SubscriptionGate>
						</template>
						<slot v-else />
					</div>
				</div>

			</div>
		</main>

		<Toast />
	</div>
</template>