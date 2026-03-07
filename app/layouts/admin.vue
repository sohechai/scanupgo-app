<script setup lang="ts">
const { $api } = useNuxtApp()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Admin user state
const adminUser = ref<any>(null)
const loading = ref(true)

// Fetch admin user
onMounted(async () => {
	try {
		const response = await $api<{ authenticated: boolean; user: any }>('/auth/status')
		if (response.authenticated && response.user?.role === 'SUPER_ADMIN') {
			adminUser.value = response.user
		} else {
			// Not a super admin, redirect to admin login
			router.push('/admin/login')
		}
	} catch (error) {
		router.push('/admin/login')
	} finally {
		loading.value = false
	}
})

const signOut = async () => {
	await $api('/auth/logout', { method: 'POST' })
	router.push('/admin/login')
}

const navItems = computed(() => [
	{ name: t('admin.nav.overview'), path: '/admin', icon: 'ph:chart-line-duotone' },
	{ name: t('admin.nav.businesses'), path: '/admin/businesses', icon: 'ph:storefront-duotone' },
	{ name: t('admin.nav.orders'), path: '/admin/orders', icon: 'ph:package-duotone' },
	{ name: t('admin.nav.templates'), path: '/admin/templates', icon: 'ph:images-duotone' },
	{ name: t('admin.nav.pricing'), path: '/admin/pricing', icon: 'ph:tag-duotone' },
	{ name: t('admin.nav.subscriptions'), path: '/admin/subscriptions', icon: 'ph:crown-duotone' },
	{ name: t('admin.nav.payments'), path: '/admin/payments', icon: 'ph:credit-card-duotone' },
	{ name: t('admin.nav.users'), path: '/admin/users', icon: 'ph:users-three-duotone' },
	{ name: t('admin.nav.notifications'), path: '/admin/notifications', icon: 'ph:bell-duotone' },
	{ name: t('admin.nav.settings'), path: '/admin/settings', icon: 'ph:gear-duotone' },
])

const isActive = (path: string) => {
	if (path === '/admin') {
		return route.path === path
	}
	return route.path.startsWith(path)
}

const isSidebarOpen = ref(false)

watch(() => route.path, () => {
	isSidebarOpen.value = false
})
</script>

<template>
	<div v-if="!loading" class="min-h-screen bg-black text-white flex">
		<!-- Gradient Background -->
		<div class="fixed inset-0 bg-gradient-to-br from-black via-slate-950 to-black pointer-events-none"></div>

		<!-- Grid Pattern -->
		<div
			class="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none">
		</div>

		<!-- Mobile Sidebar Backdrop -->
		<div v-if="isSidebarOpen" @click="isSidebarOpen = false"
			class="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"></div>

		<!-- Sidebar -->
		<aside
			class="w-64 fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 bg-black/40 backdrop-blur-xl border-r rtl:border-r-0 rtl:border-l border-white/10 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 rtl:lg:-translate-x-0"
			:class="isSidebarOpen ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full'">
			<!-- Logo -->
			<div class="h-16 flex items-center px-6 border-b border-white/10">
				<div class="flex items-center gap-3">
					<div
						class="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center">
						<span class="text-white font-bold text-sm">B.</span>
					</div>
					<div>
						<h1 class="font-bold text-sm">ScanUpGo</h1>
						<p class="text-[10px] text-slate-500">{{ $t('admin.super_admin') }}</p>
					</div>
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
				<NuxtLink v-for="item in navItems" :key="item.path" :to="item.path"
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group relative" :class="isActive(item.path)
						? 'bg-white/10 text-white'
						: 'text-slate-400 hover:text-white hover:bg-white/5'">
					<!-- Active Indicator -->
					<div v-if="isActive(item.path)"
						class="absolute left-0 rtl:left-auto rtl:right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand-500 rounded-r rtl:rounded-r-none rtl:rounded-l"></div>

					<Icon :name="item.icon" size="20" />
					<span class="font-medium">{{ item.name }}</span>
				</NuxtLink>
			</nav>

			<!-- User Footer -->
			<div class="p-3 border-t border-white/10 space-y-1">
				<NuxtLink to="/admin/account"
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs hover:bg-white/5"
					:class="route.path === '/admin/account' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'">
					<div
						class="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold">
						{{ adminUser?.email?.charAt(0).toUpperCase() }}
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-medium text-white truncate">{{ $t('admin.super_admin') }}</p>
						<p class="text-[10px] text-slate-500 truncate">{{ adminUser?.email }}</p>
					</div>
					<Icon name="ph:caret-right-bold" size="12" class="text-slate-600 rtl:rotate-180" />
				</NuxtLink>
				<button @click="signOut"
					class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
					<Icon name="ph:sign-out-bold" size="16" />
					{{ $t('admin.logout') }}
				</button>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 flex flex-col lg:ml-64 rtl:lg:ml-0 rtl:lg:mr-64 relative">
			<!-- Top Bar -->
			<header
				class="h-16 border-b border-white/10 backdrop-blur-xl bg-black/40 sticky top-0 z-30 flex items-center px-6">
				<button @click="isSidebarOpen = true" class="lg:hidden mr-4 rtl:mr-0 rtl:ml-4 p-2 -ml-2 rtl:-ml-0 rtl:-mr-2 text-slate-400 hover:text-white">
					<Icon name="ph:list-bold" size="24" />
				</button>

				<div class="flex-1">
					<h2 class="text-lg font-semibold">{{navItems.find(i => isActive(i.path))?.name || $t('admin.administration')
					}}</h2>
				</div>

				<div class="flex items-center gap-3">
					<!-- Language Selector -->
					<LanguageSelector variant="dark" />

					<!-- Notifications -->
					<button
						class="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all relative">
						<Icon name="ph:bell-duotone" size="20" class="text-slate-400" />
						<span class="absolute top-2 right-2 rtl:right-auto rtl:left-2 w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
					</button>

					<!-- Settings -->
					<button
						class="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
						<Icon name="ph:gear-duotone" size="20" class="text-slate-400" />
					</button>
				</div>
			</header>

			<!-- Page Content -->
			<div class="flex-1 p-6 overflow-y-auto">
				<div class="max-w-7xl mx-auto">
					<slot />
				</div>
			</div>
		</main>
	</div>

	<!-- Loading State -->
	<div v-else class="min-h-screen bg-black flex items-center justify-center">
		<Icon name="ph:spinner-gap-bold" size="32" class="text-brand-500 animate-spin" />
	</div>

	<!-- Toast Notifications -->
	<Toast />
</template>
