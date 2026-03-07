<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

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

// Recent subscriptions and top businesses
const recentSubscriptions = ref<any[]>([])
const topBusinesses = ref<any[]>([])

// Fetch stats
onMounted(async () => {
	try {
		// Fetch real stats from backend
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
		change: '+12%',
		positive: true,
		icon: 'ph:storefront-duotone',
		color: 'from-blue-500 to-cyan-500'
	},
	{
		label: t('admin.dashboard.global_revenue'),
		value: formatNumber(stats.value.totalRevenue),
		change: '+23%',
		positive: true,
		icon: 'ph:currency-dollar-duotone',
		color: 'from-emerald-500 to-green-500'
	},
	{
		label: t('admin.dashboard.monthly_recurring_revenue'),
		value: formatNumber(stats.value.mrr),
		change: '+15%',
		positive: true,
		icon: 'ph:chart-line-up-duotone',
		color: 'from-teal-500 to-cyan-500'
	},
	{
		label: t('admin.dashboard.flyers_sold'),
		value: formatNumber(stats.value.flyersSold),
		change: '+10%',
		positive: true,
		icon: 'ph:printer-duotone',
		color: 'from-rose-500 to-pink-500'
	},
	{
		label: t('admin.dashboard.active_subscriptions'),
		value: stats.value.activeSubscriptions,
		change: '+8%',
		positive: true,
		icon: 'ph:crown-duotone',
		color: 'from-purple-500 to-pink-500'
	},
	{
		label: t('admin.dashboard.players'),
		value: formatNumber(stats.value.totalPlayers),
		change: '+18%',
		positive: true,
		icon: 'ph:users-three-duotone',
		color: 'from-orange-500 to-amber-500'
	},
	{
		label: t('admin.dashboard.games_created'),
		value: stats.value.totalGames,
		change: '+5%',
		positive: true,
		icon: 'ph:game-controller-duotone',
		color: 'from-violet-500 to-purple-500'
	},
	{
		label: t('admin.dashboard.prizes_distributed'),
		value: stats.value.totalPrizes,
		change: '+31%',
		positive: true,
		icon: 'ph:gift-duotone',
		color: 'from-rose-500 to-red-500'
	}
])
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen animate-pulse-slow">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen animate-pulse-slow"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.dashboard.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.dashboard.description') }}</p>
				</div>

				<!-- Quick Actions Toolbar -->
				<div
					class="flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 gap-1">
					<NuxtLink to="/admin/businesses"
						class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-medium group">
						<div
							class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
							<Icon name="ph:storefront-duotone" size="18" class="text-blue-400" />
						</div>
						<span>{{ $t('admin.dashboard.view_businesses') }}</span>
					</NuxtLink>

					<div class="w-px h-6 bg-white/10 mx-1"></div>

					<NuxtLink to="/admin/subscriptions"
						class="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-medium group">
						<div
							class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
							<Icon name="ph:crown-duotone" size="18" class="text-purple-400" />
						</div>
						<span>{{ $t('admin.dashboard.manage_plans') }}</span>
					</NuxtLink>
				</div>
			</div>

			<!-- Loading State -->
			<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div v-for="i in 6" :key="i"
					class="h-48 bg-white/5 rounded-[2rem] border border-white/10 animate-pulse"></div>
			</div>

			<!-- Stats Grid -->
			<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div v-for="stat in statCards" :key="stat.label" class="group relative">
					<!-- Card Glow -->
					<div
						:class="`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 rounded-[2rem] blur-xl transition-all duration-500`">
					</div>

					<!-- Main Card -->
					<div
						class="relative h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 hover:border-white/20 transition-all duration-300 overflow-hidden">
						<!-- Background Pattern (Removed) -->

						<div class="relative z-10 flex flex-col justify-between h-full">
							<div class="flex justify-between items-start mb-6">
								<div
									class="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
									<Icon :name="stat.icon" size="24" class="text-slate-300" />
								</div>

								<div
									:class="`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${stat.positive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`">
									<Icon :name="stat.positive ? 'ph:trend-up-bold' : 'ph:trend-down-bold'" size="14" />
									{{ stat.change }}
								</div>
							</div>

							<div>
								<p
									class="text-4xl font-bold text-white mb-2 tracking-tight shadow-black/10 drop-shadow-sm">
									{{ stat.value }}</p>
								<p class="text-slate-400 font-medium flex items-center gap-2">
									{{ stat.label }}
									<Icon name="ph:caret-right-bold" size="14"
										class="opacity-0 group-hover:opacity-100 transition-all text-white/50 rtl:rotate-180" />
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Recent Activity & Top Businesses -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- Recent Subscriptions -->
				<div class="group relative">
					<div
						class="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] blur opacity-50">
					</div>
					<div
						class="relative bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 h-full">
						<div class="flex items-center justify-between mb-8">
							<div class="flex items-center gap-3">
								<div
									class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
									<Icon name="ph:receipt-duotone" size="20" class="text-slate-300" />
								</div>
								<h3 class="text-xl font-bold text-white">{{ $t('admin.dashboard.recent_subscriptions') }}</h3>
							</div>
							<NuxtLink to="/admin/subscriptions"
								class="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
								<Icon name="ph:arrow-right-bold" size="20" class="rtl:rotate-180" />
							</NuxtLink>
						</div>

						<div class="space-y-3">
							<div v-if="recentSubscriptions.length === 0"
								class="flex flex-col items-center justify-center py-12 text-slate-500">
								<div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
									<Icon name="ph:receipt-x-duotone" size="32" class="opacity-50" />
								</div>
								<p>{{ $t('admin.dashboard.no_recent_subscriptions') }}</p>
							</div>

							<div v-else v-for="(sub, index) in recentSubscriptions" :key="sub.id"
								class="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group/item">
								<div
									class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 font-bold text-sm">
									{{ sub.businessName.charAt(0).toUpperCase() }}
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="font-bold text-white truncate">{{ sub.businessName }}</h4>
									<div class="flex items-center gap-2 text-xs text-slate-400 mt-1">
										<span
											class="px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/5 capitalize">{{
												sub.planName }}</span>
										<span>•</span>
										<span class="capitalize">{{ sub.period === 'monthly' ? $t('admin.dashboard.monthly') : sub.period
											=== 'annual' ? $t('admin.dashboard.annual') : $t('admin.dashboard.lifetime') }}</span>
									</div>
								</div>
								<div class="text-right rtl:text-left">
									<p class="text-lg font-bold text-emerald-400">+{{ formatNumber(sub.price)
									}} Dhs</p>
									<p class="text-xs text-slate-500 mt-1">{{ formatDate(sub.createdAt, {
											day: 'numeric', month: 'short'
										}) }}</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Top Businesses -->
				<div class="group relative">
					<div
						class="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2rem] blur opacity-50">
					</div>
					<div
						class="relative bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 h-full">
						<div class="flex items-center justify-between mb-8">
							<div class="flex items-center gap-3">
								<div
									class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
									<Icon name="ph:trophy-duotone" size="20" class="text-slate-300" />
								</div>
								<h3 class="text-xl font-bold text-white">{{ $t('admin.dashboard.top_businesses') }}</h3>
							</div>
							<NuxtLink to="/admin/businesses"
								class="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
								<Icon name="ph:arrow-right-bold" size="20" class="rtl:rotate-180" />
							</NuxtLink>
						</div>

						<div class="space-y-4">
							<div v-if="topBusinesses.length === 0"
								class="flex flex-col items-center justify-center py-12 text-slate-500">
								<div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
									<Icon name="ph:storefront-duotone" size="32" class="opacity-50" />
								</div>
								<p>{{ $t('admin.dashboard.no_businesses') }}</p>
							</div>

							<div v-else v-for="(business, index) in topBusinesses" :key="business.id"
								class="relative overflow-hidden flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
								<!-- Rank Badge -->
								<div :class="`
									w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl border border-white/5
									${index === 0 ? 'bg-white/10 text-white' :
										index === 1 ? 'bg-white/5 text-slate-300' :
											index === 2 ? 'bg-white/5 text-slate-400' :
												'bg-white/5 text-slate-500'}
								`">
									<Icon v-if="index < 3" name="ph:crown-fill" size="20" />
									<span v-else>#{{ business.rank }}</span>
								</div>

								<div class="flex-1 min-w-0 z-10">
									<div class="flex justify-between items-center mb-2">
										<p class="font-bold text-white truncate">{{ business.name }}</p>
										<span
											class="text-sm font-medium text-white/80 bg-white/10 px-2 py-0.5 rounded-lg">{{
												business.playerCount }} {{ $t('admin.businesses.players') }}</span>
									</div>

									<!-- Progress -->
									<div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
										<div class="h-full rounded-full transition-all duration-1000 ease-out"
											:class="index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'"
											:style="{ width: `${Math.min(100, (business.playerCount / (topBusinesses[0]?.playerCount || 1)) * 100)}%` }">
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
