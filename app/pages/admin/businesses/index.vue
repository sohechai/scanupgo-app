<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

useHead({ title: 'Commerces' })

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate, formatNumber } = useLocaleDate()

const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const limit = 50

const businesses = ref<any[]>([])
const total = ref(0)
const totalPages = ref(0)
const hasMore = ref(false)

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

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch([searchQuery, statusFilter], () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		if (currentPage.value !== 1) {
			currentPage.value = 1
		} else {
			fetchBusinesses()
		}
	}, 300)
})

watch(currentPage, () => {
	fetchBusinesses()
})

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
		case 'active': return t('admin.businesses.status_active')
		case 'past_due': return t('admin.businesses.status_past_due')
		case 'canceled': return t('admin.businesses.status_canceled')
		case 'expired': return t('admin.subscriptions.status_expired')
		default: return subscription.status
	}
}

const activeCount = computed(() => businesses.value.filter(b => b.subscription?.status === 'active').length)
const totalPlayers = computed(() => businesses.value.reduce((sum, b) => sum + b.stats.playersCount, 0))
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.businesses.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.businesses.description') }}</p>
			</div>
		</div>

		<!-- Summary Stats -->
		<div v-if="!loading && total > 0" class="grid grid-cols-3 gap-4">
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.businesses.stats_total') }}</p>
				<p class="text-2xl font-semibold text-white tabular-nums">{{ total }}</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.businesses.stats_active_subscriptions') }}</p>
				<p class="text-2xl font-semibold text-emerald-400 tabular-nums">{{ activeCount }}</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.businesses.stats_total_players') }}</p>
				<p class="text-2xl font-semibold text-white tabular-nums">{{ formatNumber(totalPlayers) }}</p>
			</div>
		</div>

		<!-- Filters -->
		<div class="flex flex-col sm:flex-row gap-3">
			<div class="relative flex-1">
				<Icon name="ph:magnifying-glass" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" size="16" />
				<input
					v-model="searchQuery"
					type="text"
					:placeholder="$t('admin.businesses.search_placeholder')"
					class="w-full bg-[#161920] border border-white/[0.07] rounded-md pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors"
				/>
			</div>
			<div class="relative">
				<select
					v-model="statusFilter"
					class="bg-[#161920] border border-white/[0.07] rounded-md pl-3 pr-8 py-2 text-sm text-slate-300 focus:border-white/20 focus:outline-none appearance-none cursor-pointer transition-colors hover:bg-[#1a1f2a]">
					<option value="all" class="bg-[#161920]">{{ $t('admin.businesses.all_status') }}</option>
					<option value="active" class="bg-[#161920]">{{ $t('admin.businesses.status_active') }}</option>
					<option value="inactive" class="bg-[#161920]">{{ $t('admin.businesses.status_inactive') }}</option>
					<option value="canceled" class="bg-[#161920]">{{ $t('admin.businesses.status_canceled') }}</option>
					<option value="past_due" class="bg-[#161920]">{{ $t('admin.businesses.status_past_due') }}</option>
				</select>
				<Icon name="ph:caret-down-bold" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size="13" />
			</div>
		</div>

		<!-- Table -->
		<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/[0.06]">
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.businesses.table_header_business') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.businesses.table_header_owner') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.businesses.table_header_plan') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.businesses.table_header_stats') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.businesses.table_header_status') }}</th>
							<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/[0.04]">
						<!-- Loading skeleton -->
						<tr v-if="loading" v-for="i in 6" :key="i" class="animate-pulse">
							<td class="px-4 py-3"><div class="h-3.5 bg-white/[0.06] rounded w-32"></div></td>
							<td class="px-4 py-3"><div class="h-3.5 bg-white/[0.06] rounded w-24"></div></td>
							<td class="px-4 py-3"><div class="h-3.5 bg-white/[0.06] rounded w-20"></div></td>
							<td class="px-4 py-3"><div class="h-3.5 bg-white/[0.06] rounded w-16"></div></td>
							<td class="px-4 py-3"><div class="h-3.5 bg-white/[0.06] rounded w-14"></div></td>
							<td class="px-4 py-3"><div class="h-3.5 bg-white/[0.06] rounded w-6 ml-auto rtl:ml-0 rtl:mr-auto"></div></td>
						</tr>

						<!-- Data rows -->
						<tr
							v-else
							v-for="business in businesses"
							:key="business.id"
							class="hover:bg-white/[0.03] transition-colors cursor-pointer"
							@click="navigateTo(`/admin/businesses/${business.id}`)">

							<td class="px-4 py-3 whitespace-nowrap">
								<div class="flex items-center gap-3">
									<img v-if="business.logo" :src="business.logo" :alt="business.name"
										class="w-8 h-8 rounded-md object-cover border border-white/[0.07] shrink-0" />
									<div v-else class="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">
										{{ business.name.charAt(0).toUpperCase() }}
									</div>
									<div>
										<p class="text-sm font-medium text-white">{{ business.name }}</p>
										<p class="text-xs text-slate-500">{{ formatDate(business.createdAt) }}</p>
									</div>
								</div>
							</td>

							<td class="px-4 py-3 whitespace-nowrap">
								<p class="text-sm text-slate-300">{{ getOwnerName(business.owner) }}</p>
								<p class="text-xs text-slate-500">{{ business.owner.email }}</p>
							</td>

							<td class="px-4 py-3 whitespace-nowrap">
								<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/[0.05] text-slate-400 border border-white/[0.06]">
									{{ getPlanDisplay(business.subscription) }}
								</span>
							</td>

							<td class="px-4 py-3 whitespace-nowrap">
								<p class="text-xs text-slate-400">
									<span class="text-white font-medium">{{ business.stats.gamesCount }}</span> {{ $t('admin.businesses.games') }}
									· <span class="text-white font-medium">{{ business.stats.playersCount }}</span> {{ $t('admin.businesses.players') }}
								</p>
							</td>

							<td class="px-4 py-3 whitespace-nowrap">
								<span v-if="getStatusClass(business.subscription) === 'active'"
									class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
									{{ getStatusLabel(business.subscription) }}
								</span>
								<span v-else-if="getStatusClass(business.subscription) === 'past_due'"
									class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
									<span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
									{{ getStatusLabel(business.subscription) }}
								</span>
								<span v-else-if="getStatusClass(business.subscription) === 'canceled'"
									class="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
									<span class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
									{{ getStatusLabel(business.subscription) }}
								</span>
								<span v-else class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
									<span class="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0"></span>
									{{ getStatusLabel(business.subscription) }}
								</span>
							</td>

							<td class="px-4 py-3 text-right rtl:text-left">
								<NuxtLink :to="`/admin/businesses/${business.id}`"
									class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors inline-flex"
									@click.stop>
									<Icon name="ph:arrow-right-bold" size="15" class="rtl:rotate-180" />
								</NuxtLink>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Empty State -->
			<div v-if="!loading && businesses.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:storefront-duotone" size="32" class="mb-2" />
				<p class="text-sm">{{ total === 0 && !searchQuery && statusFilter === 'all' ? $t('admin.businesses.no_businesses') : $t('admin.businesses.no_results') }}</p>
			</div>

			<!-- Pagination -->
			<div v-if="!loading && businesses.length > 0 && totalPages > 1"
				class="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
				<p class="text-xs text-slate-500">
					{{ $t('admin.businesses.pagination_showing', { from: ((currentPage - 1) * limit) + 1, to: Math.min(currentPage * limit, total), total }) }}
				</p>
				<div class="flex items-center gap-2">
					<button
						@click="currentPage--"
						:disabled="currentPage === 1"
						class="px-3 py-1.5 rounded text-xs font-medium transition-colors"
						:class="currentPage === 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'">
						{{ $t('admin.businesses.pagination_previous') }}
					</button>
					<span class="text-xs text-slate-500 tabular-nums">{{ currentPage }} / {{ totalPages }}</span>
					<button
						@click="currentPage++"
						:disabled="!hasMore"
						class="px-3 py-1.5 rounded text-xs font-medium transition-colors"
						:class="!hasMore ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'">
						{{ $t('admin.businesses.pagination_next') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
