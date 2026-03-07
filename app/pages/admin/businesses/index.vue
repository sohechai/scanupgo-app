<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate, formatNumber } = useLocaleDate()

const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const limit = 50

// Response data
const businesses = ref<any[]>([])
const total = ref(0)
const totalPages = ref(0)
const hasMore = ref(false)

// Fetch businesses from API with filters
const fetchBusinesses = async () => {
	loading.value = true
	try {
		const params: Record<string, string> = {
			page: currentPage.value.toString(),
			limit: limit.toString(),
		}
		if (searchQuery.value) params.search = searchQuery.value
		if (statusFilter.value !== 'all') params.status = statusFilter.value

		const response = await $api<{
			businesses: any[]
			total: number
			page: number
			limit: number
			totalPages: number
			hasMore: boolean
		}>('/admin/businesses', { params })

		businesses.value = response.businesses
		total.value = response.total
		totalPages.value = response.totalPages
		hasMore.value = response.hasMore
	} catch (error) {
		console.error('Failed to fetch businesses:', error)
	} finally {
		loading.value = false
	}
}

// Debounced search: reset to page 1 when filters change
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch([searchQuery, statusFilter], () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		if (currentPage.value !== 1) {
			currentPage.value = 1 // triggers the page watcher which calls fetchBusinesses
		} else {
			fetchBusinesses()
		}
	}, 300)
})

// Page change: immediate fetch
watch(currentPage, () => {
	fetchBusinesses()
})

// Initial load
onMounted(() => {
	fetchBusinesses()
})

const getOwnerName = (owner: any) => {
	if (owner.firstName && owner.lastName) {
		return `${owner.firstName} ${owner.lastName}`
	}
	return owner.email
}

const getPlanDisplay = (subscription: any) => {
	if (!subscription) return t('admin.businesses.no_plan')
	const period = subscription.billingPeriod === 'monthly' ? t('admin.subscriptions.period_monthly') :
		subscription.billingPeriod === 'annual' ? t('admin.subscriptions.period_annual') : t('admin.subscriptions.period_lifetime')
	return `${subscription.planName} (${period})`
}

const getStatusClass = (subscription: any) => {
	if (!subscription) return 'inactive'
	return subscription.status
}

const getStatusLabel = (subscription: any) => {
	if (!subscription) return t('admin.businesses.status_inactive')
	switch (subscription.status) {
		case 'active':
			return t('admin.businesses.status_active')
		case 'past_due':
			return t('admin.businesses.status_past_due')
		case 'canceled':
			return t('admin.businesses.status_canceled')
		case 'expired':
			return t('admin.subscriptions.status_expired')
		default:
			return subscription.status
	}
}
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
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.businesses.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.businesses.description') }}</p>
				</div>
				<button
					class="px-4 py-2 bg-white hover:bg-slate-100 text-black rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-lg shadow-white/5">
					<Icon name="ph:plus-bold" />
					{{ $t('admin.businesses.add_button') }}
				</button>
			</div>

			<!-- Filters & Actions -->
			<div class="flex flex-col md:flex-row gap-4">
				<div class="relative flex-1">
					<Icon name="ph:magnifying-glass" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500"
						size="20" />
					<input v-model="searchQuery" type="text" :placeholder="$t('admin.businesses.search_placeholder')"
						class="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl pl-10 rtl:pl-4 pr-4 rtl:pr-10 py-3 text-white placeholder-slate-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all" />
				</div>
				<div class="flex gap-2">
					<div class="relative">
						<select v-model="statusFilter"
							class="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl pl-4 pr-10 py-3 text-slate-300 focus:border-white/20 outline-none appearance-none cursor-pointer transition-all hover:bg-white/10">
							<option value="all" class="bg-slate-900">{{ $t('admin.businesses.all_status') }}</option>
							<option value="active" class="bg-slate-900">{{ $t('admin.businesses.status_active') }}</option>
							<option value="inactive" class="bg-slate-900">{{ $t('admin.businesses.status_inactive') }}</option>
							<option value="canceled" class="bg-slate-900">{{ $t('admin.businesses.status_canceled') }}</option>
							<option value="past_due" class="bg-slate-900">{{ $t('admin.businesses.status_past_due') }}</option>
						</select>
						<Icon name="ph:caret-down-bold"
							class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
							size="16" />
					</div>
				</div>
			</div>

			<!-- Table Card -->
			<div
				class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-white/5 border-b border-white/10">
							<tr>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.businesses.table_header_business') }}</th>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.businesses.table_header_owner') }}</th>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.businesses.table_header_plan') }}</th>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.businesses.table_header_stats') }}</th>
								<th
									class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.businesses.table_header_status') }}</th>
								<th
									class="px-6 py-4 text-right rtl:text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.businesses.table_header_actions') }}</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/5">
							<tr v-if="loading" v-for="i in 5" :key="i" class="animate-pulse">
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-32"></div>
								</td>
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-24"></div>
								</td>
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-16"></div>
								</td>
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-20"></div>
								</td>
								<td class="px-6 py-4">
									<div class="h-4 bg-white/10 rounded w-16"></div>
								</td>
								<td class="px-6 py-4 text-right rtl:text-left">
									<div class="h-8 w-8 bg-white/10 rounded ml-auto rtl:ml-0 rtl:mr-auto"></div>
								</td>
							</tr>
							<tr v-else v-for="business in businesses" :key="business.id"
								class="hover:bg-white/5 transition-colors group cursor-pointer"
								@click="navigateTo(`/admin/businesses/${business.id}`)">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-3">
										<img v-if="business.logo" :src="business.logo" :alt="business.name"
											class="w-10 h-10 rounded-lg object-cover border border-white/10" />
										<div v-else
											class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-slate-300">
											{{ business.name.charAt(0).toUpperCase() }}
										</div>
										<div>
											<div class="font-bold text-white">{{ business.name }}</div>
											<div class="text-xs text-slate-500">
												{{ $t('admin.businesses.registered_on') }} {{ formatDate(business.createdAt) }}
											</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-slate-300">{{ getOwnerName(business.owner) }}</div>
									<div class="text-xs text-slate-500">{{ business.owner.email }}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-slate-400 border border-white/5">
										{{ getPlanDisplay(business.subscription) }}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="space-y-1">
										<div class="text-xs text-slate-400">
											<span class="font-medium text-white">{{ business.stats.gamesCount }}</span>
											{{ $t('admin.businesses.games') }}
										</div>
										<div class="text-xs text-slate-400">
											<span class="font-medium text-white">{{ business.stats.playersCount
											}}</span> {{ $t('admin.businesses.players') }}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div v-if="getStatusClass(business.subscription) === 'active'"
										class="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
										<div
											class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]">
										</div>
										{{ getStatusLabel(business.subscription) }}
									</div>
									<div v-else-if="getStatusClass(business.subscription) === 'past_due'"
										class="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
										<div class="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
										{{ getStatusLabel(business.subscription) }}
									</div>
									<div v-else-if="getStatusClass(business.subscription) === 'canceled'"
										class="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
										<div class="w-1.5 h-1.5 rounded-full bg-red-400"></div>
										{{ getStatusLabel(business.subscription) }}
									</div>
									<div v-else
										class="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
										<div class="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
										{{ getStatusLabel(business.subscription) }}
									</div>
								</td>
								<td class="px-6 py-4 text-right rtl:text-left">
									<NuxtLink :to="`/admin/businesses/${business.id}`"
										class="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors inline-flex">
										<Icon name="ph:eye-bold" size="20" />
									</NuxtLink>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				<div v-if="!loading && businesses.length > 0 && totalPages > 1"
					class="flex items-center justify-between px-6 py-4 border-t border-white/10">
					<div class="text-sm text-slate-400">
						{{ $t('admin.businesses.pagination_showing', { from: ((currentPage - 1) * limit) + 1, to: Math.min(currentPage * limit, total), total: total }) }}
					</div>
					<div class="flex gap-2">
						<button @click="currentPage--" :disabled="currentPage === 1" :class="[
							'px-4 py-2 rounded-lg font-bold transition-all text-sm',
							currentPage === 1
								? 'bg-white/5 text-slate-500 cursor-not-allowed'
								: 'bg-white/10 text-white hover:bg-white/20'
						]">
							{{ $t('admin.businesses.pagination_previous') }}
						</button>
						<div class="flex items-center px-4 py-2 text-sm text-slate-300">
							{{ $t('admin.businesses.pagination_page', { current: currentPage, total: totalPages }) }}
						</div>
						<button @click="currentPage++" :disabled="!hasMore" :class="[
							'px-4 py-2 rounded-lg font-bold transition-all text-sm',
							!hasMore
								? 'bg-white/5 text-slate-500 cursor-not-allowed'
								: 'bg-white/10 text-white hover:bg-white/20'
						]">
							{{ $t('admin.businesses.pagination_next') }}
						</button>
					</div>
				</div>

				<!-- Empty State -->
				<div v-if="!loading && businesses.length === 0" class="p-12 text-center text-slate-500">
					<Icon name="ph:storefront-duotone" size="48" class="mx-auto mb-4 opacity-50" />
					<p v-if="total === 0 && !searchQuery && statusFilter === 'all'">{{ $t('admin.businesses.no_businesses') }}</p>
					<p v-else>{{ $t('admin.businesses.no_results') }}</p>
				</div>
			</div>

			<!-- Stats Summary -->
			<div v-if="!loading && total > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
					<div class="text-sm text-slate-400 mb-1">{{ $t('admin.businesses.stats_total') }}</div>
					<div class="text-3xl font-bold text-white">{{ total }}</div>
				</div>
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
					<div class="text-sm text-slate-400 mb-1">{{ $t('admin.businesses.stats_active_subscriptions') }}</div>
					<div class="text-3xl font-bold text-emerald-400">
						{{businesses.filter(b => b.subscription?.status === 'active').length}}
					</div>
				</div>
				<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
					<div class="text-sm text-slate-400 mb-1">{{ $t('admin.businesses.stats_total_players') }}</div>
					<div class="text-3xl font-bold text-white">
						{{formatNumber(businesses.reduce((sum, b) => sum + b.stats.playersCount, 0))}}
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
