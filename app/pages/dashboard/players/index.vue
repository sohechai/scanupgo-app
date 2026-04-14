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
	if (filterOptinSMS.value === 'yes') result = result.filter(p => p.smsOptIn)
	else if (filterOptinSMS.value === 'no') result = result.filter(p => !p.smsOptIn)
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
		const response = await fetch(`${config.public.apiBase}/players/export/csv`, { credentials: 'include' })
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
		const response = await fetch(`${config.public.apiBase}/players/export/pdf`, { credentials: 'include' })
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
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('players.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{{ $t('players.subtitle') }}</p>
			</div>
			<div class="flex items-center gap-2">
				<!-- Search -->
				<div class="relative hidden md:block">
					<Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="15" />
					<input v-model="searchQuery" type="text" :placeholder="$t('players.search_placeholder')"
						class="pl-9 pr-4 py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] border-0 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#007AFF]/40 w-56 transition-all" />
				</div>
				<!-- Filters -->
				<button @click="showFilters = !showFilters"
					class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
					:class="activeFilterCount > 0 || showFilters
						? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
						: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300'">
					<Icon name="ph:funnel-bold" size="15" />
					{{ $t('players.filters_button') }}
					<span v-if="activeFilterCount > 0" class="w-4 h-4 rounded-full bg-white/30 text-[10px] font-bold flex items-center justify-center">{{ activeFilterCount }}</span>
				</button>
				<!-- Export -->
				<div class="relative">
					<button @click="showExportMenu = !showExportMenu" :disabled="players.length === 0 || !!exporting"
						class="flex items-center gap-2 px-4 py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all disabled:opacity-40">
						<Icon v-if="exporting" name="ph:spinner-gap-bold" size="15" class="animate-spin" />
						<Icon v-else name="ph:export-bold" size="15" />
						{{ exporting ? 'Export...' : $t('players.export_button') }}
					</button>
					<div v-if="showExportMenu"
						class="absolute right-0 mt-2 w-44 bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-xl border border-[#E5E5EA] dark:border-slate-700/40 py-1 z-50 overflow-hidden">
						<button @click="exportToCSV"
							class="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] flex items-center gap-3 transition-colors">
							<Icon name="ph:file-csv-duotone" size="17" class="text-[#34C759]" />
							{{ $t('players.export_csv') }}
						</button>
						<button @click="exportToPDF"
							class="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] flex items-center gap-3 transition-colors">
							<Icon name="ph:file-pdf-duotone" size="17" class="text-[#FF3B30]" />
							{{ $t('players.export_pdf') }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Stats — iOS widgets -->
		<div class="grid grid-cols-3 gap-3">
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<div class="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-3">
					<Icon name="ph:users-bold" class="text-slate-400 dark:text-slate-500" size="15" />
				</div>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ loading ? '—' : stats.total }}</p>
				<p class="text-[11px] text-slate-400 mt-1 font-medium">{{ $t('players.stats.total_players') }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<div class="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-3">
					<Icon name="ph:repeat-bold" class="text-slate-400 dark:text-slate-500" size="15" />
				</div>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ loading ? '—' : `${stats.loyaltyRate}%` }}</p>
				<p class="text-[11px] text-slate-400 mt-1 font-medium">{{ $t('players.stats.loyalty') }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<div class="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-3">
					<Icon name="ph:game-controller-bold" class="text-slate-400 dark:text-slate-500" size="15" />
				</div>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ loading ? '—' : stats.totalSessions }}</p>
				<p class="text-[11px] text-slate-400 mt-1 font-medium">{{ $t('players.stats.participations') }}</p>
			</div>
		</div>

		<!-- Filters panel — iOS grouped style -->
		<Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
			leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
			<div v-if="showFilters" class="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl p-1.5">
				<div class="flex items-center justify-between px-3 pt-2 pb-1.5">
					<p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ $t('players.filters_button') }}</p>
					<button v-if="activeFilterCount > 0" @click="clearFilters"
						class="text-[11px] font-semibold text-[#007AFF]">{{ $t('players.clear_filters') }}</button>
				</div>
				<div class="bg-white dark:bg-[#2C2C2E] rounded-xl divide-y divide-[#E5E5EA] dark:divide-slate-700/40 overflow-hidden">
					<!-- Filter rows -->
					<div v-for="(filterDef, idx) in [
						{ label: $t('players.filters.optin_email'), model: filterOptinEmail, opts: [{ v:'all', l: $t('players.filters.all') }, { v:'yes', l: $t('players.filters.yes') }, { v:'no', l: $t('players.filters.no') }], key: 'email' },
						{ label: $t('players.filters.optin_sms'), model: filterOptinSMS, opts: [{ v:'all', l: $t('players.filters.all') }, { v:'yes', l: $t('players.filters.yes') }, { v:'no', l: $t('players.filters.no') }], key: 'sms' },
						{ label: $t('players.filters.period'), model: filterPeriod, opts: [{ v:'all', l: $t('players.filters.all') }, { v:'7d', l: $t('players.filters.7days') }, { v:'30d', l: $t('players.filters.30days') }, { v:'90d', l: $t('players.filters.90days') }, { v:'12m', l: $t('players.filters.12months') }], key: 'period' },
						{ label: $t('players.filters.participations'), model: filterParticipations, opts: [{ v:'all', l: $t('players.filters.all') }, { v:'1', l: $t('players.filters.1x') }, { v:'2+', l: $t('players.filters.2plus') }, { v:'5+', l: $t('players.filters.5plus') }], key: 'part' },
					]" :key="filterDef.key" class="flex items-center gap-4 px-4 py-3">
						<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 w-28 shrink-0">{{ filterDef.label }}</p>
						<div class="flex gap-1.5 flex-wrap">
							<button v-for="opt in filterDef.opts" :key="opt.v"
								@click="idx === 0 ? (filterOptinEmail = opt.v as any) : idx === 1 ? (filterOptinSMS = opt.v as any) : idx === 2 ? (filterPeriod = opt.v as any) : (filterParticipations = opt.v as any)"
								class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
								:class="filterDef.model === opt.v
									? 'bg-[#007AFF] text-white shadow-sm'
									: 'bg-[#F2F2F7] dark:bg-[#3A3A3C] text-slate-600 dark:text-slate-300'">
								{{ opt.l }}
							</button>
						</div>
					</div>
				</div>
				<p v-if="activeFilterCount > 0" class="text-[11px] text-slate-400 px-3 py-2">
					<span class="font-bold text-slate-700 dark:text-slate-200">{{ filteredPlayers.length }}</span> / {{ players.length }} joueurs
				</p>
			</div>
		</Transition>

		<!-- Players list — iOS grouped -->
		<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden shadow-sm">

			<div v-if="loading" class="p-10 flex items-center justify-center">
				<Icon name="ph:spinner-gap-bold" size="28" class="text-slate-300 animate-spin" />
			</div>

			<div v-else-if="players.length === 0" class="p-12 flex flex-col items-center text-center">
				<div class="w-14 h-14 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-center mb-3">
					<Icon name="ph:users-three-duotone" size="28" class="text-slate-400" />
				</div>
				<h3 class="text-sm font-bold text-slate-900 dark:text-white mb-1">{{ $t('players.empty_state') }}</h3>
				<p class="text-xs text-slate-400 max-w-xs mb-5">{{ $t('players.empty_state_message') }}</p>
				<NuxtLink to="/dashboard/orders"
					class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] text-white font-semibold rounded-xl text-sm shadow-md shadow-[#007AFF]/25">
					<Icon name="ph:printer-bold" size="15" />
					{{ $t('players.print_flyers') }}
				</NuxtLink>
			</div>

			<div v-else>
				<div class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
					<div v-for="player in filteredPlayers" :key="player.id"
						class="flex items-center gap-4 px-5 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors">
						<!-- Avatar -->
						<div class="w-9 h-9 rounded-full bg-[#007AFF] flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm shadow-[#007AFF]/25">
							{{ (player.firstName?.[0] || '') + (player.lastName?.[0] || '') }}
						</div>
						<!-- Name + contact -->
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-slate-900 dark:text-white text-sm">{{ player.firstName }} {{ player.lastName }}</p>
							<div class="flex items-center gap-3 mt-0.5">
								<span v-if="player.email" class="text-[11px] text-slate-400 truncate max-w-[160px]">{{ player.email }}</span>
								<span v-if="player.phone" class="text-[11px] text-slate-400">{{ player.phone }}</span>
							</div>
						</div>
						<!-- Opt-in badges -->
						<div class="flex items-center gap-1 shrink-0">
							<span v-if="player.emailOptIn" class="w-6 h-6 rounded-lg bg-[#34C759]/15 flex items-center justify-center" title="Email opt-in">
								<Icon name="ph:envelope-simple-fill" class="text-[#34C759]" size="12" />
							</span>
							<span v-if="player.smsOptIn" class="w-6 h-6 rounded-lg bg-[#007AFF]/15 flex items-center justify-center" title="SMS opt-in">
								<Icon name="ph:chat-text-fill" class="text-[#007AFF]" size="12" />
							</span>
						</div>
						<!-- Participations -->
						<div class="text-right shrink-0">
							<p class="text-sm font-bold text-slate-900 dark:text-white">{{ player._count.sessions || 0 }}</p>
							<p class="text-[10px] text-slate-400">sessions</p>
						</div>
						<!-- Date -->
						<p class="text-[11px] text-slate-400 shrink-0 w-16 text-right hidden md:block">{{ formatDate(player.createdAt) }}</p>
					</div>
				</div>

				<!-- No results -->
				<div v-if="filteredPlayers.length === 0 && (searchQuery || activeFilterCount > 0)"
					class="p-10 text-center border-t border-[#E5E5EA] dark:border-slate-700/40">
					<p class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('players.no_results') }}</p>
					<p class="text-xs text-slate-400 mt-1 mb-4">{{ $t('players.no_results_message') }}</p>
					<button @click="searchQuery = ''; clearFilters()" class="text-[#007AFF] font-semibold text-xs">{{ $t('players.clear_search') }}</button>
				</div>
			</div>
		</div>

	</div>
	</SubscriptionGate>
</template>
