<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()
const { show: showToast } = useToast()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

// State
const players = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')
const exporting = ref<'csv' | 'pdf' | null>(null)
const showExportMenu = ref(false)
const showFilters = ref(false)

// Filters
const filterOptinEmail = ref<'all' | 'yes' | 'no'>('all')
const filterOptinSMS = ref<'all' | 'yes' | 'no'>('all')
const filterPeriod = ref<'all' | '7d' | '30d' | '90d' | '12m'>('all')
const filterParticipations = ref<'all' | '1' | '2+' | '5+'>('all')

const activeFilterCount = computed(() => {
	let count = 0
	if (filterOptinEmail.value !== 'all') count++
	if (filterOptinSMS.value !== 'all') count++
	if (filterPeriod.value !== 'all') count++
	if (filterParticipations.value !== 'all') count++
	return count
})

const clearFilters = () => {
	filterOptinEmail.value = 'all'
	filterOptinSMS.value = 'all'
	filterPeriod.value = 'all'
	filterParticipations.value = 'all'
}

// Computed
const stats = computed(() => {
	const total = players.value.length
	const withSessions = players.value.filter(p => p._count.sessions > 0).length
	const totalSessions = players.value.reduce((sum, p) => sum + (p._count.sessions || 0), 0)

	// Calculate loyalty rate (players who played more than once)
	const loyalPlayers = players.value.filter(p => p._count.sessions > 1).length
	const loyaltyRate = total > 0 ? Math.round((loyalPlayers / total) * 100) : 0

	return {
		total,
		loyaltyRate,
		totalSessions
	}
})

const filteredPlayers = computed(() => {
	let result = players.value

	// Text search
	if (searchQuery.value) {
		const query = searchQuery.value.toLowerCase()
		result = result.filter(player =>
			player.firstName?.toLowerCase().includes(query) ||
			player.lastName?.toLowerCase().includes(query) ||
			player.email?.toLowerCase().includes(query) ||
			player.phone?.includes(query)
		)
	}

	// Opt-in email filter
	if (filterOptinEmail.value === 'yes') {
		result = result.filter(p => p.emailOptIn)
	} else if (filterOptinEmail.value === 'no') {
		result = result.filter(p => !p.emailOptIn)
	}

	// Opt-in SMS filter
	if (filterOptinSMS.value === 'yes') {
		result = result.filter(p => p.smsOptIn)
	} else if (filterOptinSMS.value === 'no') {
		result = result.filter(p => !p.smsOptIn)
	}

	// Period filter
	if (filterPeriod.value !== 'all') {
		const now = new Date()
		let cutoff: Date
		switch (filterPeriod.value) {
			case '7d': cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
			case '30d': cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
			case '90d': cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break
			case '12m': cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break
			default: cutoff = new Date(0)
		}
		result = result.filter(p => new Date(p.createdAt) >= cutoff)
	}

	// Participations filter
	if (filterParticipations.value !== 'all') {
		switch (filterParticipations.value) {
			case '1': result = result.filter(p => (p._count?.sessions || 0) === 1); break
			case '2+': result = result.filter(p => (p._count?.sessions || 0) >= 2); break
			case '5+': result = result.filter(p => (p._count?.sessions || 0) >= 5); break
		}
	}

	return result
})

// Fetch players
const fetchPlayers = async () => {
	loading.value = true
	try {
		players.value = await $api('/players')
	} catch (error) {
		console.error('Failed to fetch players:', error)
	} finally {
		loading.value = false
	}
}

// Export to CSV (via backend)
const exportToCSV = async () => {
	exporting.value = 'csv'
	showExportMenu.value = false
	try {
		const config = useRuntimeConfig()
		const response = await fetch(`${config.public.apiBase}/players/export/csv`, {
			credentials: 'include'
		})
		if (!response.ok) throw new Error('Export failed')

		const blob = await response.blob()
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `players_${new Date().toISOString().split('T')[0]}.csv`
		link.click()
		URL.revokeObjectURL(url)
	} catch (error) {
		console.error('CSV export failed:', error)
		showToast(t('players.export_error'), 'error')
	} finally {
		exporting.value = null
	}
}

// Export to PDF (via backend)
const exportToPDF = async () => {
	exporting.value = 'pdf'
	showExportMenu.value = false
	try {
		const config = useRuntimeConfig()
		const response = await fetch(`${config.public.apiBase}/players/export/pdf`, {
			credentials: 'include'
		})
		if (!response.ok) throw new Error('Export failed')

		const blob = await response.blob()
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `players_${new Date().toISOString().split('T')[0]}.pdf`
		link.click()
		URL.revokeObjectURL(url)
	} catch (error) {
		console.error('PDF export failed:', error)
		showToast(t('players.export_pdf_error'), 'error')
	} finally {
		exporting.value = null
	}
}

// Lifecycle
onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchPlayers()
	}
})
</script>

<template>
	<!-- Subscription Required -->
	<SubscriptionGate>
	<div class="space-y-8 relative">
		<!-- Header & Actions -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('players.title') }}</h1>
				<p class="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{{ $t('players.subtitle') }}</p>
			</div>

			<div class="flex items-center gap-3">
				<div class="relative hidden md:block group">
					<Icon name="ph:magnifying-glass"
						class="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-slate-400 group-focus-within:text-brand-500 transition-colors"
						size="16" />
					<input v-model="searchQuery" type="text" :placeholder="$t('players.search_placeholder')"
						class="pl-9 rtl:pl-4 pr-4 rtl:pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none w-64 transition-all placeholder-slate-400 shadow-sm" />
				</div>
				<!-- Filters Toggle -->
				<button @click="showFilters = !showFilters"
					class="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
					:class="{ 'border-brand-300 dark:border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300': activeFilterCount > 0 }">
					<Icon name="ph:funnel-bold" size="16" />
					<span>{{ $t('players.filters_button') }}</span>
					<span v-if="activeFilterCount > 0"
						class="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
						{{ activeFilterCount }}
					</span>
				</button>

				<div class="relative">
					<button @click="showExportMenu = !showExportMenu" :disabled="players.length === 0 || exporting !== null"
						class="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
						<Icon v-if="exporting" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
						<Icon v-else name="ph:export-duotone" size="16" />
						<span>{{ exporting ? 'Export...' : $t('players.export_button') }}</span>
						<Icon name="ph:caret-down" size="14" />
					</button>

					<!-- Export Dropdown -->
					<div v-if="showExportMenu"
						class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
						<button @click="exportToCSV"
							class="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
							<Icon name="ph:file-csv-duotone" size="18" class="text-green-500" />
							{{ $t('players.export_csv') }}
						</button>
						<button @click="exportToPDF"
							class="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
							<Icon name="ph:file-pdf-duotone" size="18" class="text-red-500" />
							{{ $t('players.export_pdf') }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Filters Panel -->
		<Transition name="slide">
			<div v-if="showFilters"
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
						<Icon name="ph:funnel-bold" size="14" />
						{{ $t('players.filters_button') }}
					</h3>
					<button v-if="activeFilterCount > 0" @click="clearFilters"
						class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
						{{ $t('players.clear_filters') }}
					</button>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Opt-in Email -->
					<div>
						<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('players.filters.optin_email') }}</label>
						<div class="flex gap-1.5">
							<button v-for="opt in [{ value: 'all', label: $t('players.filters.all') }, { value: 'yes', label: $t('players.filters.yes') }, { value: 'no', label: $t('players.filters.no') }]"
								:key="opt.value"
								@click="filterOptinEmail = opt.value as any"
								class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
								:class="filterOptinEmail === opt.value
									? 'bg-brand-600 text-white shadow-sm'
									: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'">
								{{ opt.label }}
							</button>
						</div>
					</div>

					<!-- Opt-in SMS -->
					<div>
						<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('players.filters.optin_sms') }}</label>
						<div class="flex gap-1.5">
							<button v-for="opt in [{ value: 'all', label: $t('players.filters.all') }, { value: 'yes', label: $t('players.filters.yes') }, { value: 'no', label: $t('players.filters.no') }]"
								:key="opt.value"
								@click="filterOptinSMS = opt.value as any"
								class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
								:class="filterOptinSMS === opt.value
									? 'bg-brand-600 text-white shadow-sm'
									: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'">
								{{ opt.label }}
							</button>
						</div>
					</div>

					<!-- Period -->
					<div>
						<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('players.filters.period') }}</label>
						<div class="flex gap-1.5 flex-wrap">
							<button v-for="opt in [{ value: 'all', label: $t('players.filters.all') }, { value: '7d', label: $t('players.filters.7days') }, { value: '30d', label: $t('players.filters.30days') }, { value: '90d', label: $t('players.filters.90days') }, { value: '12m', label: $t('players.filters.12months') }]"
								:key="opt.value"
								@click="filterPeriod = opt.value as any"
								class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
								:class="filterPeriod === opt.value
									? 'bg-brand-600 text-white shadow-sm'
									: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'">
								{{ opt.label }}
							</button>
						</div>
					</div>

					<!-- Participations -->
					<div>
						<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('players.filters.participations') }}</label>
						<div class="flex gap-1.5 flex-wrap">
							<button v-for="opt in [{ value: 'all', label: $t('players.filters.all') }, { value: '1', label: $t('players.filters.1x') }, { value: '2+', label: $t('players.filters.2plus') }, { value: '5+', label: $t('players.filters.5plus') }]"
								:key="opt.value"
								@click="filterParticipations = opt.value as any"
								class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
								:class="filterParticipations === opt.value
									? 'bg-brand-600 text-white shadow-sm'
									: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'">
								{{ opt.label }}
							</button>
						</div>
					</div>
				</div>

				<!-- Active Filters Summary -->
				<div v-if="activeFilterCount > 0" class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
					<p class="text-xs text-slate-500 dark:text-slate-400">
						<span class="font-bold text-slate-700 dark:text-slate-200">{{ filteredPlayers.length }}</span>
						joueur{{ filteredPlayers.length > 1 ? 's' : '' }} sur {{ players.length }}
					</p>
				</div>
			</div>
		</Transition>

		<!-- Stats (Text Based) -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-800">
			<div>
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('players.stats.total_players') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-slate-900 dark:text-white">{{ loading ? '...' : stats.total
						}}</span>
				</div>
			</div>
			<div>
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('players.stats.loyalty') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-slate-900 dark:text-white">{{ loading ? '...' :
						stats.loyaltyRate }}%</span>
					<span class="text-xs font-bold text-slate-500 dark:text-slate-400">{{ $t('players.stats.loyalty_return') }}</span>
				</div>
			</div>
			<div>
				<span
					class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('players.stats.participations') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-slate-900 dark:text-white">{{ loading ? '...' :
						stats.totalSessions }}</span>
					<span class="text-xs font-bold text-slate-500 dark:text-slate-400">{{ $t('players.stats.games') }}</span>
				</div>
			</div>
		</div>

		<!-- Content -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden min-h-[400px]">

			<!-- Loading State -->
			<div v-if="loading" class="h-full flex flex-col items-center justify-center py-20">
				<Icon name="ph:spinner-gap-bold" size="32" class="text-slate-300 animate-spin mb-3" />
				<p class="text-sm font-medium text-slate-500">{{ $t('players.loading') }}</p>
			</div>

			<!-- Empty State -->
			<div v-else-if="players.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
				<div
					class="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4 text-slate-300 dark:text-slate-500">
					<Icon name="ph:users-three-duotone" size="32" />
				</div>
				<h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1">{{ $t('players.empty_state') }}</h3>
				<p class="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">{{ $t('players.empty_state_message') }}</p>
				<NuxtLink to="/dashboard/orders"
					class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors text-sm flex items-center gap-2">
					<Icon name="ph:printer-bold" />
					{{ $t('players.print_flyers') }}
				</NuxtLink>
			</div>

			<!-- Table -->
			<div v-else>
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
							<tr>
								<th
									class="px-6 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									{{ $t('players.table.player') }}</th>
								<th
									class="px-6 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									{{ $t('players.table.contact') }}</th>
								<th
									class="px-6 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									{{ $t('players.table.optin') }}</th>
								<th
									class="px-6 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									{{ $t('players.table.participations') }}</th>
								<th
									class="px-6 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
									{{ $t('players.table.date') }}</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-50 dark:divide-slate-700">
							<tr v-for="player in filteredPlayers" :key="player.id"
								class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-3">
										<div
											class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-slate-800 shadow-sm">
											{{ (player.firstName?.[0] || '') + (player.lastName?.[0] || '') }}
										</div>
										<div>
											<div class="font-bold text-slate-900 dark:text-slate-200 text-sm">
												{{ player.firstName }} {{ player.lastName }}
											</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="space-y-0.5">
										<div v-if="player.email"
											class="flex items-center gap-1.5 text-xs font-medium text-slate-500">
											<Icon name="ph:envelope-simple" size="14" class="text-slate-400" />
											{{ player.email }}
										</div>
										<div v-if="player.phone"
											class="flex items-center gap-1.5 text-xs font-medium text-slate-500">
											<Icon name="ph:phone" size="14" class="text-slate-400" />
											{{ player.phone }}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-1.5">
										<span v-if="player.emailOptIn"
											class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
											title="Opt-in Email">
											<Icon name="ph:envelope-simple-fill" size="10" />
											{{ $t('players.optin_email') }}
										</span>
										<span v-if="player.smsOptIn"
											class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20"
											title="Opt-in SMS">
											<Icon name="ph:chat-text-fill" size="10" />
											{{ $t('players.optin_sms') }}
										</span>
										<span v-if="!player.emailOptIn && !player.smsOptIn"
											class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
											<Icon name="ph:x-circle-fill" size="10" />
											{{ $t('players.no_optin') }}
										</span>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-2">
										<span class="font-bold text-slate-900 dark:text-slate-200 text-sm">{{
											player._count.sessions || 0
											}}</span>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-400">
									{{ formatDate(player.createdAt) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- No Search/Filter Results -->
				<div v-if="filteredPlayers.length === 0 && (searchQuery || activeFilterCount > 0)"
					class="p-12 text-center border-t border-slate-50 dark:border-slate-700">
					<p class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('players.no_results') }}</p>
					<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ $t('players.no_results_message') }}</p>
					<button @click="searchQuery = ''; clearFilters()"
						class="mt-4 text-brand-600 dark:text-brand-400 font-bold text-xs hover:text-brand-700 dark:hover:text-brand-300">
						{{ $t('players.clear_search') }}
					</button>
				</div>
			</div>
		</div>

	</div>
	</SubscriptionGate>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
	transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
