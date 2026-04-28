<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

useHead({ title: 'Dashboard Admin' })

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatNumber, formatDate } = useLocaleDate()

// Stats
const stats = ref({
	totalBusinesses: 0,
	activeSubscriptions: 0,
	totalRevenue: 0,
	mrr: 0,
	flyersSold: 0,
	totalPlayers: 0,
	totalGames: 0,
	totalPrizes: 0
})

const loading = ref(true)

const recentSubscriptions = ref<any[]>([])
const topBusinesses = ref<any[]>([])

onMounted(async () => {
	try {
		const [statsData, recentSubs, topBiz] = await Promise.all([
			$api<typeof stats.value>('/admin/stats'),
			$api<any[]>('/admin/recent-subscriptions'),
			$api<any[]>('/admin/top-businesses')
		])
		stats.value = statsData
		recentSubscriptions.value = recentSubs
		topBusinesses.value = topBiz
	} catch (error) {
		console.error('Failed to fetch admin data:', error)
	} finally {
		loading.value = false
	}
})

const statCards = computed(() => [
	{
		label: t('admin.dashboard.businesses_label'),
		value: stats.value.totalBusinesses,
		icon: 'ph:storefront-duotone',
		iconColor: 'text-blue-400',
		link: '/admin/businesses'
	},
	{
		label: t('admin.dashboard.global_revenue'),
		value: formatNumber(stats.value.totalRevenue) + ' Dhs',
		icon: 'ph:currency-dollar-duotone',
		iconColor: 'text-emerald-400',
		link: '/admin/payments'
	},
	{
		label: t('admin.dashboard.monthly_recurring_revenue'),
		value: formatNumber(stats.value.mrr) + ' Dhs',
		icon: 'ph:chart-line-up-duotone',
		iconColor: 'text-teal-400',
		link: '/admin/payments'
	},
	{
		label: t('admin.dashboard.flyers_sold'),
		value: formatNumber(stats.value.flyersSold),
		icon: 'ph:printer-duotone',
		iconColor: 'text-rose-400',
		link: '/admin/orders'
	},
	{
		label: t('admin.dashboard.active_subscriptions'),
		value: stats.value.activeSubscriptions,
		icon: 'ph:crown-duotone',
		iconColor: 'text-purple-400',
		link: '/admin/subscriptions'
	},
	{
		label: t('admin.dashboard.players'),
		value: formatNumber(stats.value.totalPlayers),
		icon: 'ph:users-three-duotone',
		iconColor: 'text-amber-400',
		link: '/admin/businesses'
	},
	{
		label: t('admin.dashboard.games_created'),
		value: stats.value.totalGames,
		icon: 'ph:game-controller-duotone',
		iconColor: 'text-violet-400',
		link: '/admin/businesses'
	},
	{
		label: t('admin.dashboard.prizes_distributed'),
		value: stats.value.totalPrizes,
		icon: 'ph:gift-duotone',
		iconColor: 'text-orange-400',
		link: '/admin/businesses'
	}
])
</script>

<template>
	<div class="space-y-6 pb-8">

		<!-- Page Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.dashboard.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.dashboard.description') }}</p>
			</div>
			<div class="flex items-center gap-2">
				<NuxtLink to="/admin/businesses"
					class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md transition-colors">
					<Icon name="ph:storefront-duotone" size="16" />
					{{ $t('admin.dashboard.view_businesses') }}
				</NuxtLink>
				<NuxtLink to="/admin/subscriptions"
					class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md transition-colors">
					<Icon name="ph:crown-duotone" size="16" />
					{{ $t('admin.dashboard.manage_plans') }}
				</NuxtLink>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div v-for="i in 8" :key="i" class="h-24 bg-white/[0.04] rounded-lg border border-white/[0.06] animate-pulse"></div>
		</div>

		<!-- Stats Grid -->
		<div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<NuxtLink
				v-for="stat in statCards"
				:key="stat.label"
				:to="stat.link"
				class="bg-[#161920] border border-white/[0.07] rounded-lg p-4 hover:border-white/[0.14] hover:bg-[#1a1f2a] transition-all group">
				<div class="flex items-center justify-between mb-3">
					<Icon :name="stat.icon" size="18" :class="stat.iconColor" />
					<Icon name="ph:arrow-up-right-bold" size="13" class="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-90" />
				</div>
				<p class="text-2xl font-semibold text-white tabular-nums">{{ stat.value }}</p>
				<p class="text-xs text-slate-500 mt-1">{{ stat.label }}</p>
			</NuxtLink>
		</div>

		<!-- Recent Activity -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

			<!-- Recent Subscriptions -->
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg">
				<div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
					<h3 class="text-sm font-semibold text-white">{{ $t('admin.dashboard.recent_subscriptions') }}</h3>
					<NuxtLink to="/admin/subscriptions" class="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
						{{ $t('admin.dashboard.view_all') || 'Voir tout' }}
						<Icon name="ph:arrow-right-bold" size="12" class="rtl:rotate-180" />
					</NuxtLink>
				</div>

				<div v-if="recentSubscriptions.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-600">
					<Icon name="ph:receipt-x-duotone" size="28" class="mb-2" />
					<p class="text-sm">{{ $t('admin.dashboard.no_recent_subscriptions') }}</p>
				</div>

				<div v-else class="divide-y divide-white/[0.04]">
					<div v-for="sub in recentSubscriptions" :key="sub.id"
						class="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors">
						<div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
							{{ sub.businessName.charAt(0).toUpperCase() }}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-white truncate">{{ sub.businessName }}</p>
							<p class="text-xs text-slate-500">
								{{ sub.planName }} ·
								{{ sub.period === 'monthly' ? $t('admin.dashboard.monthly') : sub.period === 'annual' ? $t('admin.dashboard.annual') : $t('admin.dashboard.lifetime') }}
							</p>
						</div>
						<div class="text-right rtl:text-left shrink-0">
							<p class="text-sm font-semibold text-emerald-400">+{{ formatNumber(sub.price) }} Dhs</p>
							<p class="text-xs text-slate-600">{{ formatDate(sub.createdAt, { day: 'numeric', month: 'short' }) }}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Top Businesses -->
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg">
				<div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
					<h3 class="text-sm font-semibold text-white">{{ $t('admin.dashboard.top_businesses') }}</h3>
					<NuxtLink to="/admin/businesses" class="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
						{{ $t('admin.dashboard.view_all') || 'Voir tout' }}
						<Icon name="ph:arrow-right-bold" size="12" class="rtl:rotate-180" />
					</NuxtLink>
				</div>

				<div v-if="topBusinesses.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-600">
					<Icon name="ph:storefront-duotone" size="28" class="mb-2" />
					<p class="text-sm">{{ $t('admin.dashboard.no_businesses') }}</p>
				</div>

				<div v-else class="divide-y divide-white/[0.04]">
					<div v-for="(business, index) in topBusinesses" :key="business.id"
						class="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors">
						<div class="w-7 h-7 flex items-center justify-center shrink-0">
							<Icon v-if="index === 0" name="ph:crown-fill" size="16" class="text-amber-400" />
							<Icon v-else-if="index === 1" name="ph:crown-fill" size="14" class="text-slate-400" />
							<Icon v-else-if="index === 2" name="ph:crown-fill" size="13" class="text-amber-700" />
							<span v-else class="text-xs text-slate-600 font-medium">#{{ index + 1 }}</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-white truncate">{{ business.name }}</p>
							<div class="flex items-center gap-2 mt-1">
								<div class="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
									<div class="h-full rounded-full bg-brand-500/70 transition-all"
										:style="{ width: `${Math.min(100, (business.playerCount / (topBusinesses[0]?.playerCount || 1)) * 100)}%` }">
									</div>
								</div>
							</div>
						</div>
						<span class="text-xs text-slate-500 shrink-0 tabular-nums">{{ business.playerCount }} {{ $t('admin.businesses.players') }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
