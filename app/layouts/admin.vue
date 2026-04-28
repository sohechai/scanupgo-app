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
			router.push('/admin/login')
		}
	} catch (error) {
		router.push('/admin/login')
	} finally {
		loading.value = false
	}
})

const signOut = async () => {
	try { await $api('/auth/logout', { method: 'POST' }) } catch { /* session may already be gone */ }
	window.location.href = '/login'
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
	<div class="min-h-screen">
	<div v-if="!loading" class="min-h-screen bg-[#0d0e12] text-slate-200 flex">

		<!-- Mobile Sidebar Backdrop -->
		<div v-if="isSidebarOpen" @click="isSidebarOpen = false"
			class="fixed inset-0 bg-black/60 z-40 lg:hidden"></div>

		<!-- Sidebar -->
		<aside
			class="w-60 fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 bg-[#111318] border-r rtl:border-r-0 rtl:border-l border-white/[0.06] flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 rtl:lg:-translate-x-0"
			:class="isSidebarOpen ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full'">

			<!-- Logo -->
			<div class="h-14 flex items-center px-5 border-b border-white/[0.06]">
				<img src="/images/scanupgo-logo-transparent-sombre.png" alt="ScanUpGo" class="h-7" />
			</div>

			<!-- Navigation -->
			<nav class="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
				<NuxtLink
					v-for="item in navItems"
					:key="item.path"
					:to="item.path"
					class="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm"
					:class="isActive(item.path)
						? 'bg-white/[0.08] text-white'
						: 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'">
					<Icon :name="item.icon" size="17" :class="isActive(item.path) ? 'text-brand-400' : 'text-slate-500'" />
					<span class="font-medium">{{ item.name }}</span>
				</NuxtLink>
			</nav>

			<!-- User Footer -->
			<div class="p-2.5 border-t border-white/[0.06]">
				<NuxtLink to="/admin/account"
					class="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group"
					:class="route.path === '/admin/account' ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'">
					<div
						class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
						{{ adminUser?.email?.charAt(0).toUpperCase() }}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-xs font-medium text-slate-200 truncate">{{ adminUser?.email }}</p>
						<p class="text-[10px] text-slate-500">{{ $t('admin.super_admin') }}</p>
					</div>
				</NuxtLink>
				<button @click="signOut"
					class="mt-0.5 w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors">
					<Icon name="ph:sign-out-bold" size="15" />
					<span class="text-xs">{{ $t('admin.logout') }}</span>
				</button>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="flex-1 flex flex-col lg:ml-60 rtl:lg:ml-0 rtl:lg:mr-60 relative">

			<!-- Top Bar -->
			<header class="h-14 border-b border-white/[0.06] bg-[#0d0e12] sticky top-0 z-30 flex items-center px-6">
				<button @click="isSidebarOpen = true" class="lg:hidden mr-4 rtl:mr-0 rtl:ml-4 p-1.5 -ml-1.5 rtl:-ml-0 rtl:-mr-1.5 text-slate-400 hover:text-white">
					<Icon name="ph:list-bold" size="20" />
				</button>

				<div class="flex-1">
					<h2 class="text-sm font-semibold text-white">{{ navItems.find(i => isActive(i.path))?.name || $t('admin.administration') }}</h2>
				</div>

				<div class="flex items-center gap-2">
					<LanguageSelector variant="dark" />

					<button
						class="w-8 h-8 rounded-md hover:bg-white/[0.06] flex items-center justify-center transition-colors relative">
						<Icon name="ph:bell-duotone" size="17" class="text-slate-400" />
						<span class="absolute top-1.5 right-1.5 rtl:right-auto rtl:left-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
					</button>

					<NuxtLink to="/admin/settings"
						class="w-8 h-8 rounded-md hover:bg-white/[0.06] flex items-center justify-center transition-colors">
						<Icon name="ph:gear-duotone" size="17" class="text-slate-400" />
					</NuxtLink>
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
	<div v-else class="min-h-screen bg-[#0d0e12] flex items-center justify-center">
		<Icon name="ph:spinner-gap-bold" size="28" class="text-brand-500 animate-spin" />
	</div>

	<!-- Toast Notifications -->
	<Toast />
	</div>
</template>
