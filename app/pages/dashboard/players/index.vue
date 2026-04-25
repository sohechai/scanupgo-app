<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()
const { show: showToast } = useToast()
const { hasActiveSubscription, fetchSubscription } = useSubscription()

const players = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')
const exporting = ref<'csv' | 'pdf' | null>(null)
const showExportMenu = ref(false)
const showFilters = ref(false)

const filterOptinEmail = ref<'all' | 'yes' | 'no'>('all')
const filterPeriod = ref<'all' | '7d' | '30d' | '90d' | '12m'>('all')
const filterParticipations = ref<'all' | '1' | '2+' | '5+'>('all')
const currentPage = ref(1)

const activeFilterCount = computed(() => {
	let count = 0
	if (filterOptinEmail.value !== 'all') count++
	if (filterPeriod.value !== 'all') count++
	if (filterParticipations.value !== 'all') count++
	return count
})

const clearFilters = () => {
	filterOptinEmail.value = 'all'
	filterPeriod.value = 'all'
	filterParticipations.value = 'all'
}

const stats = computed(() => {
	const total = players.value.length
	const loyalPlayers = players.value.filter(p => p._count.sessions > 1).length
	const loyaltyRate = total > 0 ? Math.round((loyalPlayers / total) * 100) : 0
	const totalSessions = players.value.reduce((sum, p) => sum + (p._count.sessions || 0), 0)
	return { total, loyaltyRate, totalSessions }
})

const filteredPlayers = computed(() => {
	let result = players.value
	if (searchQuery.value) {
		const q = searchQuery.value.toLowerCase()
		result = result.filter(p =>
			p.firstName?.toLowerCase().includes(q) || p.lastName?.toLowerCase().includes(q) ||
			p.email?.toLowerCase().includes(q) || p.phone?.includes(q)
		)
	}
	if (filterOptinEmail.value === 'yes') result = result.filter(p => p.emailOptIn)
	else if (filterOptinEmail.value === 'no') result = result.filter(p => !p.emailOptIn)
	if (filterPeriod.value !== 'all') {
		const now = new Date()
		const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 }
		const cutoff = new Date(now.getTime() - daysMap[filterPeriod.value] * 24 * 60 * 60 * 1000)
		result = result.filter(p => new Date(p.createdAt) >= cutoff)
	}
	if (filterParticipations.value === '1') result = result.filter(p => (p._count?.sessions || 0) === 1)
	else if (filterParticipations.value === '2+') result = result.filter(p => (p._count?.sessions || 0) >= 2)
	else if (filterParticipations.value === '5+') result = result.filter(p => (p._count?.sessions || 0) >= 5)
	return result
})

watch([searchQuery, filterOptinEmail, filterPeriod, filterParticipations], () => { currentPage.value = 1 })

const PAGE_SIZE = 20
const totalPages = computed(() => Math.ceil(filteredPlayers.value.length / PAGE_SIZE))
const paginatedPlayers = computed(() => {
	const start = (currentPage.value - 1) * PAGE_SIZE
	return filteredPlayers.value.slice(start, start + PAGE_SIZE)
})

const fetchPlayers = async () => {
	loading.value = true
	try { players.value = await $api('/players') }
	catch (e) { console.error(e) }
	finally { loading.value = false }
}

const exportToCSV = async () => {
	exporting.value = 'csv'; showExportMenu.value = false
	try {
		const config = useRuntimeConfig()
		const response = await fetch(`${config.public.apiUrl}/players/export/csv`, { credentials: 'include' })
		if (!response.ok) throw new Error('Export failed')
		const blob = await response.blob()
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url; link.download = `players_${new Date().toISOString().split('T')[0]}.csv`; link.click()
		URL.revokeObjectURL(url)
	} catch { showToast(t('players.export_error'), 'error') }
	finally { exporting.value = null }
}

const exportToPDF = async () => {
	exporting.value = 'pdf'; showExportMenu.value = false
	try {
		const config = useRuntimeConfig()
		const response = await fetch(`${config.public.apiUrl}/players/export/pdf`, { credentials: 'include' })
		if (!response.ok) throw new Error('Export failed')
		const blob = await response.blob()
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url; link.download = `players_${new Date().toISOString().split('T')[0]}.pdf`; link.click()
		URL.revokeObjectURL(url)
	} catch { showToast(t('players.export_pdf_error'), 'error') }
	finally { exporting.value = null }
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) fetchPlayers()
})
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('players.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('players.subtitle') }}</p>
			</div>
			<div class="flex items-center gap-2">
				<!-- Search -->
				<div class="relative hidden md:block">
					<Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="14" />
					<input v-model="searchQuery" type="text" :placeholder="$t('players.search_placeholder')"
						class="pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-md text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#007AFF]/20 w-52 transition-all" />
				</div>
				<!-- Filters -->
				<button @click="showFilters = !showFilters"
					class="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all"
					:class="activeFilterCount > 0 || showFilters
						? 'bg-[#007AFF] text-white'
						: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'">
					<Icon name="ph:funnel-bold" size="14" />
					{{ $t('players.filters_button') }}
					<span v-if="activeFilterCount > 0" class="w-4 h-4 rounded-full bg-white/30 text-[10px] font-semibold flex items-center justify-center">{{ activeFilterCount }}</span>
				</button>
				<!-- Export -->
				<div class="relative">
					<button @click="showExportMenu = !showExportMenu" :disabled="players.length === 0 || !!exporting"
						class="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-md text-sm transition-all disabled:opacity-40 hover:border-slate-300">
						<Icon v-if="exporting" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
						<Icon v-else name="ph:export-bold" size="14" />
						{{ exporting ? 'Export...' : $t('players.export_button') }}
					</button>
					<div v-if="showExportMenu"
						class="absolute right-0 mt-1.5 w-40 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 overflow-hidden">
						<button @click="exportToCSV"
							class="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors">
							<Icon name="ph:file-csv-duotone" size="15" class="text-emerald-500" />
							{{ $t('players.export_csv') }}
						</button>
						<button @click="exportToPDF"
							class="w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors">
							<Icon name="ph:file-pdf-duotone" size="15" class="text-red-500" />
							{{ $t('players.export_pdf') }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-3 gap-3">
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('players.stats.total_players') }}</p>
				<p class="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">{{ loading ? '—' : stats.total }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('players.stats.loyalty') }}</p>
				<p class="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">{{ loading ? '—' : `${stats.loyaltyRate}%` }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('players.stats.participations') }}</p>
				<p class="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">{{ loading ? '—' : stats.totalSessions }}</p>
			</div>
		</div>

		<!-- Filters panel -->
		<Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
			leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
			<div v-if="showFilters" class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
					<p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ $t('players.filters_button') }}</p>
					<button v-if="activeFilterCount > 0" @click="clearFilters"
						class="text-xs font-medium text-[#007AFF]">{{ $t('players.clear_filters') }}</button>
				</div>
				<div class="divide-y divide-slate-100 dark:divide-slate-800">
					<div v-for="(filterDef, idx) in [
						{ label: $t('players.filters.optin_email'), model: filterOptinEmail, opts: [{ v:'all', l: $t('players.filters.all') }, { v:'yes', l: $t('players.filters.yes') }, { v:'no', l: $t('players.filters.no') }], key: 'email' },
						{ label: $t('players.filters.period'), model: filterPeriod, opts: [{ v:'all', l: $t('players.filters.all') }, { v:'7d', l: $t('players.filters.7days') }, { v:'30d', l: $t('players.filters.30days') }, { v:'90d', l: $t('players.filters.90days') }, { v:'12m', l: $t('players.filters.12months') }], key: 'period' },
						{ label: $t('players.filters.participations'), model: filterParticipations, opts: [{ v:'all', l: $t('players.filters.all') }, { v:'1', l: $t('players.filters.1x') }, { v:'2+', l: $t('players.filters.2plus') }, { v:'5+', l: $t('players.filters.5plus') }], key: 'part' },
					]" :key="filterDef.key" class="flex items-center gap-4 px-4 py-2.5">
						<p class="text-xs font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0">{{ filterDef.label }}</p>
						<div class="flex gap-1.5 flex-wrap">
							<button v-for="opt in filterDef.opts" :key="opt.v"
								@click="idx === 0 ? (filterOptinEmail = opt.v as any) : idx === 1 ? (filterPeriod = opt.v as any) : (filterParticipations = opt.v as any)"
								class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
								:class="filterDef.model === opt.v
									? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
									: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'">
								{{ opt.l }}
							</button>
						</div>
					</div>
				</div>
				<div v-if="activeFilterCount > 0" class="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
					<p class="text-xs text-slate-400">
						<span class="font-semibold text-slate-700 dark:text-slate-200">{{ filteredPlayers.length }}</span> / {{ players.length }} joueurs
					</p>
				</div>
			</div>
		</Transition>

		<!-- Players list -->
		<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">

			<div v-if="loading" class="p-10 flex items-center justify-center">
				<Icon name="ph:spinner-gap-bold" size="28" class="text-slate-300 animate-spin" />
			</div>

			<div v-else-if="players.length === 0" class="p-12 flex flex-col items-center text-center">
				<div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-3">
					<Icon name="ph:users-three-duotone" size="22" class="text-slate-400" />
				</div>
				<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">{{ $t('players.empty_state') }}</h3>
				<p class="text-xs text-slate-400 max-w-xs mb-5">{{ $t('players.empty_state_message') }}</p>
				<NuxtLink to="/dashboard/orders"
					class="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md text-sm transition-all">
					<Icon name="ph:printer-bold" size="14" />
					{{ $t('players.print_flyers') }}
				</NuxtLink>
			</div>

			<div v-else>
				<!-- Table header -->
				<div class="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800">
					<p class="text-xs font-medium text-slate-400">{{ $t('players.table.player') }}</p>
					<p class="text-xs font-medium text-slate-400 text-center">{{ $t('players.table.optin') }}</p>
					<p class="text-xs font-medium text-slate-400 text-right">{{ $t('players.table.sessions') }}</p>
					<p class="text-xs font-medium text-slate-400 text-right">{{ $t('players.table.date') }}</p>
				</div>

				<div class="divide-y divide-slate-100 dark:divide-slate-800">
					<div v-for="player in paginatedPlayers" :key="player.id"
						class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
						<!-- Avatar -->
						<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-xs text-slate-600 dark:text-slate-400 shrink-0">
							{{ (player.firstName?.[0] || '') + (player.lastName?.[0] || '') }}
						</div>
						<!-- Name + contact -->
						<div class="flex-1 min-w-0">
							<p class="font-medium text-slate-900 dark:text-white text-sm">{{ player.firstName }} {{ player.lastName }}</p>
							<div class="flex items-center gap-2 mt-0.5">
								<span v-if="player.email" class="text-xs text-slate-400 truncate max-w-[160px]">{{ player.email }}</span>
								<span v-if="player.phone" class="text-xs text-slate-400">{{ player.phone }}</span>
							</div>
						</div>
						<!-- Opt-in -->
						<div class="flex items-center gap-1 shrink-0">
							<span v-if="player.emailOptIn" class="w-5 h-5 rounded bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center" title="Email opt-in">
								<Icon name="ph:envelope-simple-fill" class="text-emerald-500" size="11" />
							</span>
							<span v-if="player.smsOptIn" class="w-5 h-5 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center" title="SMS opt-in">
								<Icon name="ph:chat-text-fill" class="text-blue-500" size="11" />
							</span>
						</div>
						<!-- Sessions -->
						<div class="text-right shrink-0 w-12">
							<p class="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{{ player._count.sessions || 0 }}</p>
							<p class="text-[10px] text-slate-400">sessions</p>
						</div>
						<!-- Date -->
						<p class="text-xs text-slate-400 shrink-0 w-16 text-right hidden md:block">{{ formatDate(player.createdAt) }}</p>
					</div>
				</div>

				<!-- No results -->
				<div v-if="filteredPlayers.length === 0 && (searchQuery || activeFilterCount > 0)"
					class="p-10 text-center border-t border-slate-100 dark:border-slate-800">
					<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('players.no_results') }}</p>
					<p class="text-xs text-slate-400 mt-1 mb-4">{{ $t('players.no_results_message') }}</p>
					<button @click="searchQuery = ''; clearFilters()" class="text-[#007AFF] font-medium text-xs">{{ $t('players.clear_search') }}</button>
				</div>

				<!-- Pagination -->
				<div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
					<p class="text-xs text-slate-400">
						{{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, filteredPlayers.length) }} / {{ filteredPlayers.length }}
					</p>
					<div class="flex items-center gap-1">
						<button @click="currentPage--" :disabled="currentPage === 1"
							class="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
							<Icon name="ph:caret-left-bold" size="13" />
						</button>
						<span class="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">{{ currentPage }} / {{ totalPages }}</span>
						<button @click="currentPage++" :disabled="currentPage === totalPages"
							class="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
							<Icon name="ph:caret-right-bold" size="13" />
						</button>
					</div>
				</div>
			</div>
		</div>

	</div>
	</SubscriptionGate>
</template>
