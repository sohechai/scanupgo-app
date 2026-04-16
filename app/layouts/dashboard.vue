<script setup lang="ts">
const { user, signOut } = useAuth()
const { t } = useI18n()
const route = useRoute()
// Notifications polling is handled by Vue Query refetchInterval in useNotificationsCountQuery
const { fetchSubscription, hasActiveSubscription, isAdmin } = useSubscription()

// Routes accessible without active subscription
// /dashboard (exact) handles its own subscription display inline — don't wrap it in the layout gate
const freeRoutes = ['/dashboard/subscription', '/dashboard/account', '/dashboard/profile', '/dashboard/onboarding']
const requiresSubscription = computed(() => {
	if (route.path === '/dashboard') return false
	return !freeRoutes.some(r => route.path === r || route.path.startsWith(r + '/'))
})

// Fetch fresh subscription on layout mount (fires once per session login).
// Fire-and-forget: content renders immediately, gate updates reactively.
const handleVisibilityChange = () => {
	if (document.visibilityState === 'visible') {
		fetchSubscription(true) // force bypass cache — picks up refunds/cancellations immediately
	}
}

onMounted(() => {
	fetchSubscription() // Read DB only — no Stripe sync on every page load
	document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
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

// Close sidebar on route change (mobile).
// Also trigger a subscription re-fetch on navigation — the composable has a 2-min TTL,
// so this only hits the backend when the cached value is stale (no spam).
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
	<div
		class="h-screen overflow-hidden bg-[#FAFAFA] dark:bg-slate-950 font-sans flex text-slate-900 dark:text-slate-100 selection:bg-brand-500/30 selection:text-brand-700">

		<!-- Mobile Sidebar Backdrop -->
		<div v-if="isSidebarOpen" @click="isSidebarOpen = false"
			class="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm transition-opacity"></div>

		<!-- Sidebar (Floating / Blended) -->
		<aside
			class="w-64 fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 bg-[#FAFAFA] dark:bg-slate-950 flex flex-col z-40 transition-transform duration-300 border-r rtl:border-r-0 rtl:border-l border-transparent dark:border-slate-800"
			:class="isSidebarOpen ? 'translate-x-0 rtl:-translate-x-0 shadow-xl' : '-translate-x-full rtl:translate-x-full lg:translate-x-0 rtl:lg:-translate-x-0'">

			<!-- Brand -->
			<div class="h-16 flex items-center px-6 mb-2">
				<div class="flex items-center gap-3 cursor-pointer">
					<div
						class="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-slate-900 font-bold shadow-md shadow-slate-900/10">
						<span class="text-sm">B.</span>
					</div>
					<span class="font-bold text-slate-900 dark:text-white text-lg tracking-tight">ScanUpGo</span>
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 overflow-y-auto px-3 space-y-1">
				<div v-for="(group, index) in [navItems]" :key="index">
					<NuxtLink v-for="item in group" :key="item.path" :to="item.path"
						class="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative"
						:class="isActive(item.path)
							? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-700 text-slate-900 dark:text-white font-semibold'
							: 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'">

						<Icon :name="item.icon" size="18" class="transition-colors"
							:class="isActive(item.path) ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'" />
						<span class="text-sm">{{ item.name }}</span>
					</NuxtLink>
				</div>
			</nav>

			<!-- User Footer -->
			<div class="p-4 mt-auto border-t border-slate-100 dark:border-slate-800">
				<!-- User Profile -->
				<NuxtLink to="/dashboard/account"
					class="flex items-center gap-3 p-2 rounded-xl mb-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
					<img v-if="user?.business?.logo" :src="user.business.logo" :alt="user.business.name"
						class="w-8 h-8 rounded-lg object-cover shadow-sm" />
					<div v-else
						class="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:bg-brand-600 transition-colors">
						{{ user?.email?.charAt(0).toUpperCase() || 'U' }}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-xs font-bold text-slate-900 dark:text-slate-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{{ $t('dashboard.my_account') }}</p>
						<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium">{{ user?.email }}
						</p>
					</div>
					<Icon name="ph:caret-right-bold" size="14" class="text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition-colors rtl:rotate-180" />
				</NuxtLink>

				<!-- Logout Button -->
				<button @click="signOut"
					class="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group">
					<Icon name="ph:sign-out-bold" size="18" class="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
					<span class="text-xs font-bold uppercase tracking-wide">{{ $t('dashboard.logout') }}</span>
				</button>
			</div>
		</aside>

		<!-- Main Content (The "Card") -->
		<main class="flex-1 h-full overflow-hidden lg:ml-64 rtl:lg:ml-0 rtl:lg:mr-64 p-2 lg:p-3 transition-all duration-300 flex flex-col">
			<!-- Interface Card (Gray Canvas for Cards) -->
			<div
				class="bg-[#F8FAFC] dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex-1 flex flex-col relative overflow-hidden transition-colors duration-300">

				<!-- Header inside the card -->
				<header
					class="h-16 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 bg-white dark:bg-slate-900 z-20 transition-colors duration-300">
					<div class="flex items-center gap-4">
						<button @click="isSidebarOpen = true"
							class="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white">
							<Icon name="ph:list-bold" size="20" />
						</button>
						<div class="flex items-center gap-2 text-slate-400 text-sm">
							<Icon name="ph:house-duotone" size="16" />
							<span>/</span>
							<span class="font-semibold text-slate-900 dark:text-slate-200">{{navItems.find(i =>
								isActive(i.path))?.name ||
								$t('dashboard.nav.dashboard')}}</span>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<!-- Language Selector -->
						<LanguageSelector />
						<!-- Minimal Actions -->
						<ClientOnly>
							<button @click="toggleTheme"
								class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
								:title="colorMode.value === 'dark' ? $t('dashboard.light_mode') : $t('dashboard.dark_mode')">
								<Icon :name="colorMode.value === 'dark' ? 'ph:sun-bold' : 'ph:moon-bold'" size="18" />
							</button>
						</ClientOnly>
						<!-- Notification Dropdown -->
						<NotificationDropdown />
						<a href="/" target="_blank"
							class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm">
							<Icon name="ph:arrow-square-out-bold" size="16" />
							{{ $t('dashboard.view_site') }}
						</a>
					</div>
				</header>

				<!-- Page Content -->
				<div class="flex-1 overflow-y-auto">
					<div class="p-6 lg:p-8 animate-fade-in-up">
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

		<!-- Toast Notifications -->
		<Toast />
	</div>
</template>
