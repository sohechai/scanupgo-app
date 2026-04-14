<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { formatDate, formatNumber } = useLocaleDate()
const { user } = useAuth()
const { $api } = useNuxtApp()
const { hasActiveSubscription, loading: subscriptionLoading, fetchSubscription, isAdmin } = useSubscription()

// --- STATE: SESSIONS & PRIZES ---
const sessions = ref<any[]>([])
const sessionsLoading = ref(true)
const sessionFilter = ref<'all' | 'won' | 'lost'>('all')

// --- STATE: DASHBOARD STATS ---
const dashboardStats = ref<any>(null)
const statsLoading = ref(true)
const selectedPeriod = ref('30d')

// --- STATE: ANALYTICS EVENTS ---
const analyticsEvents = ref<Record<string, number>>({})

// --- STATE: PLAYERS ---
const players = ref<any[]>([])
const playersLoading = ref(true)
const playerSearchQuery = ref('')

// --- COMPUTED: SESSIONS STATS ---
const sessionStats = computed(() => {
	const wonSessions = sessions.value.filter(s => s.prize !== null)
	const totalDistributed = wonSessions.length
	const pending = wonSessions.filter(s => !s.prizeClaimed).length

	return {
		totalDistributed,
		pending
	}
})

// --- COMPUTED: CHART DATA (Last 30 days grouped by week) ---
const chartData = computed(() => {
	const now = new Date()
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

	// Create 6 periods (5 days each for 30 days)
	const periods: { start: Date; end: Date; label: string; count: number }[] = []
	for (let i = 0; i < 6; i++) {
		const periodStart = new Date(thirtyDaysAgo.getTime() + i * 5 * 24 * 60 * 60 * 1000)
		const periodEnd = new Date(periodStart.getTime() + 5 * 24 * 60 * 60 * 1000)
		periods.push({
			start: periodStart,
			end: periodEnd,
			label: formatDate(periodStart, { day: '2-digit', month: 'short' }),
			count: 0
		})
	}

	// Count sessions per period
	sessions.value.forEach(session => {
		const sessionDate = new Date(session.createdAt)
		if (sessionDate >= thirtyDaysAgo) {
			for (const period of periods) {
				if (sessionDate >= period.start && sessionDate < period.end) {
					period.count++
					break
				}
			}
		}
	})

	// Calculate max for percentage
	const maxCount = Math.max(...periods.map(p => p.count), 1)

	return {
		periods: periods.map(p => ({
			...p,
			percentage: Math.max((p.count / maxCount) * 100, 5) // Min 5% for visibility
		})),
		maxCount
	}
})

const filteredSessions = computed(() => {
	if (sessionFilter.value === 'won') {
		return sessions.value.filter(s => s.prize !== null)
	}
	if (sessionFilter.value === 'lost') {
		return sessions.value.filter(s => s.prize === null)
	}
	return sessions.value
})

// --- COMPUTED: PLAYERS STATS ---
const playerStats = computed(() => {
	const total = players.value.length
	const totalSessions = players.value.reduce((sum, p) => sum + (p._count?.sessions || 0), 0)
	const loyalPlayers = players.value.filter(p => (p._count?.sessions || 0) > 1).length
	const loyaltyRate = total > 0 ? Math.round((loyalPlayers / total) * 100) : 0

	return {
		total,
		loyaltyRate,
		totalSessions
	}
})

const filteredPlayers = computed(() => {
	if (!playerSearchQuery.value) return players.value

	const query = playerSearchQuery.value.toLowerCase()
	return players.value.filter(player => {
		return (
			player.firstName?.toLowerCase().includes(query) ||
			player.lastName?.toLowerCase().includes(query) ||
			player.email?.toLowerCase().includes(query) ||
			player.phone?.includes(query)
		)
	})
})

// --- COMPUTED: PERIOD LABEL ---
const periodLabel = computed(() => {
	switch (selectedPeriod.value) {
		case '7d': return t('dashboard.period_label.7d')
		case '30d': return t('dashboard.period_label.30d')
		case 'this_month': return t('dashboard.period_label.this_month')
		case '90d': return t('dashboard.period_label.90d')
		case 'this_year': return t('dashboard.period_label.this_year')
		default: return t('dashboard.period_label.30d')
	}
})

// --- COMPUTED: LINE CHART DATA ---
const lineChartData = computed(() => {
	const data = dashboardStats.value?.chartData || []
	if (!data.length) return null

	const maxCount = Math.max(...data.map((d: any) => Math.max(d.sessions, d.wins)), 1)
	const w = 800
	const h = 256
	const padX = 20
	const padY = 20
	const usableW = w - padX * 2
	const usableH = h - padY * 2

	const points = data.map((d: any, i: number) => {
		const x = data.length > 1 ? padX + (i / (data.length - 1)) * usableW : w / 2
		return {
			x,
			sessionY: padY + usableH - (d.sessions / maxCount) * usableH,
			winY: padY + usableH - (d.wins / maxCount) * usableH,
			sessions: d.sessions,
			wins: d.wins
		}
	})

	const baseline = padY + usableH

	// Build area fill paths
	const sessionArea = `M${points[0].x},${baseline} ` +
		points.map((p: any) => `L${p.x},${p.sessionY}`).join(' ') +
		` L${points[points.length - 1].x},${baseline} Z`

	const winArea = `M${points[0].x},${baseline} ` +
		points.map((p: any) => `L${p.x},${p.winY}`).join(' ') +
		` L${points[points.length - 1].x},${baseline} Z`

	return {
		points,
		sessionLine: points.map((p: any) => `${p.x},${p.sessionY}`).join(' '),
		winLine: points.map((p: any) => `${p.x},${p.winY}`).join(' '),
		sessionArea,
		winArea,
		w,
		h,
		padY,
		usableH
	}
})

// --- STATE: QUICK VALIDATE ---
const redeemCode = ref('')
const redeemLoading = ref(false)
const redeemResult = ref<any>(null)
const redeemError = ref<string | null>(null)
const showScanner = ref(false)
const scanning = ref(false)
const stream = ref<MediaStream | null>(null)

// --- ACTIONS: QR SCANNER ---
const startScanning = async () => {
	showScanner.value = true
	scanning.value = true
	redeemError.value = null

	try {
		stream.value = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: 'environment' }
		})

		const video = document.getElementById('qr-video') as HTMLVideoElement
		if (video && stream.value) {
			video.srcObject = stream.value
		}
	} catch (err) {
		redeemError.value = t('dashboard.quick_validate.error')
		scanning.value = false
		showScanner.value = false
	}
}

const stopScanning = () => {
	if (stream.value) {
		stream.value.getTracks().forEach(track => track.stop())
		stream.value = null
	}
	scanning.value = false
	showScanner.value = false
}

const scanQRCode = async () => {
	const video = document.getElementById('qr-video') as HTMLVideoElement
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')

	if (!video || !context) return

	canvas.width = video.videoWidth
	canvas.height = video.videoHeight
	context.drawImage(video, 0, 0, canvas.width, canvas.height)

	const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

	if (typeof window !== 'undefined' && (window as any).jsQR) {
		const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height)

		if (code) {
			stopScanning()
			redeemCode.value = code.data
			validatePrize()
		}
	}
}

const onVideoPlay = () => {
	const scanInterval = setInterval(() => {
		if (!scanning.value) {
			clearInterval(scanInterval)
			return
		}
		scanQRCode()
	}, 300)
}

// --- ACTIONS: QUICK VALIDATE ---
const validatePrize = async () => {
	if (!redeemCode.value || redeemCode.value.length < 3) {
		redeemError.value = t('dashboard.quick_validate.code_too_short')
		return
	}

	redeemLoading.value = true
	redeemError.value = null
	redeemResult.value = null

	try {
		const response = await $api('/gameplay/redeem', {
			method: 'POST',
			body: {
				redemptionCode: redeemCode.value.toUpperCase()
			}
		})
		redeemResult.value = response
		redeemCode.value = ''
		// Refresh stats
		fetchSessions()
	} catch (err: any) {
		redeemError.value = err?.data?.message || t('dashboard.quick_validate.invalid_code')
	} finally {
		redeemLoading.value = false
	}
}

const resetRedeem = () => {
	redeemResult.value = null
	redeemError.value = null
	redeemCode.value = ''
	stopScanning()
}

// Cleanup
onUnmounted(() => {
	stopScanning()
})

// --- ACTIONS ---

// Fetch sessions
const fetchSessions = async () => {
	sessionsLoading.value = true
	try {
		sessions.value = await $api('/gameplay/sessions')
	} catch (error) {
		console.error('Failed to fetch sessions:', error)
	} finally {
		sessionsLoading.value = false
	}
}

// Fetch players
const fetchPlayers = async () => {
	playersLoading.value = true
	try {
		players.value = await $api('/players')
	} catch (error) {
		console.error('Failed to fetch players:', error)
	} finally {
		playersLoading.value = false
	}
}

// Date range helper for period filter
const getDateRange = () => {
	const now = new Date()
	let start: Date
	switch (selectedPeriod.value) {
		case '7d':
			start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
			break
		case '30d':
			start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
			break
		case 'this_month':
			start = new Date(now.getFullYear(), now.getMonth(), 1)
			break
		case '90d':
			start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
			break
		case 'this_year':
			start = new Date(now.getFullYear(), 0, 1)
			break
		default:
			start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
	}
	return {
		startDate: start.toISOString(),
		endDate: now.toISOString()
	}
}

// Fetch dashboard stats from backend
const fetchDashboardStats = async () => {
	statsLoading.value = true
	try {
		const { startDate, endDate } = getDateRange()
		dashboardStats.value = await $api(`/games/stats/dashboard?startDate=${startDate}&endDate=${endDate}`)
	} catch (error) {
		console.error('Failed to fetch dashboard stats:', error)
	} finally {
		statsLoading.value = false
	}
}

// Fetch analytics events
const fetchAnalyticsEvents = async () => {
	try {
		const { startDate, endDate } = getDateRange()
		analyticsEvents.value = await $api(`/analytics/events?startDate=${startDate}&endDate=${endDate}`)
	} catch (error) {
		console.error('Failed to fetch analytics events:', error)
	}
}

// Watch period changes
watch(selectedPeriod, () => {
	fetchDashboardStats()
	fetchAnalyticsEvents()
})

// Export Players to CSV
const exportPlayersCSV = () => {
	const headers = [t('players.first_name'), t('players.last_name'), 'Email', t('players.phone'), 'Optin', t('players.sessions'), t('players.registration_date')]
	const rows = players.value.map(p => [
		p.firstName || '',
		p.lastName || '',
		p.email || '',
		p.phone || '',
		p.optin ? t('common.yes') : t('common.no'),
		p._count.sessions || 0,
		formatDate(p.createdAt)
	])

	const csv = [
		headers.join(','),
		...rows.map(row => row.map(cell => `"${cell}"`).join(','))
	].join('\n')

	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `players_${new Date().toISOString().split('T')[0]}.csv`
	link.click()
	document.body.removeChild(link)
}

// Lifecycle
onMounted(() => {
	fetchSubscription()
	fetchSessions()
	fetchPlayers()
	fetchDashboardStats()
	fetchAnalyticsEvents()
})
</script>

<template>
	<div class="space-y-8 relative">

		<!-- ========================================== -->
		<!-- SUBSCRIPTION CTA BANNER (No Active Sub)   -->
		<!-- ========================================== -->
		<div v-if="!subscriptionLoading && !hasActiveSubscription"
			class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm overflow-hidden">
			<div class="h-0.5 w-full bg-[#007AFF]" />
			<div class="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
				<div class="flex items-center gap-3 flex-1">
					<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon name="ph:crown-simple-bold" size="18" class="text-slate-500 dark:text-slate-400" />
					</div>
					<div>
						<p class="text-xs font-semibold text-[#007AFF] uppercase tracking-widest mb-0.5">{{ $t('dashboard.cta_banner.label') }}</p>
						<h2 class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('dashboard.cta_banner.title') }}</h2>
					</div>
				</div>
				<NuxtLink to="/dashboard/subscription"
					class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm shadow-md shadow-[#007AFF]/25 shrink-0">
					<Icon name="ph:rocket-launch-bold" size="15" />
					{{ $t('dashboard.cta_banner.button') }}
				</NuxtLink>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- 1. HEADER (Minimal)                    -->
		<!-- ========================================== -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('dashboard.title') }}
				</h1>
				<p class="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{{ formatDate(new Date(), {
						weekday:
							'long', year: 'numeric', month: 'long', day: 'numeric'
					}) }}</p>
			</div>
			<div v-if="hasActiveSubscription" class="flex items-center gap-3">
				<!-- Period Selector -->
				<div class="relative flex items-center">
					<Icon name="ph:calendar-blank" size="16" class="absolute left-3 rtl:left-auto rtl:right-3 text-slate-400 pointer-events-none z-10" />
					<select v-model="selectedPeriod"
						class="appearance-none pl-9 rtl:pl-8 pr-8 rtl:pr-9 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 text-sm font-semibold hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10 focus:border-[#007AFF]/40">
						<option value="7d">{{ $t('dashboard.period_label.7d') }}</option>
						<option value="30d">{{ $t('dashboard.period_label.30d') }}</option>
						<option value="this_month">{{ $t('dashboard.period_label.this_month') }}</option>
						<option value="90d">{{ $t('dashboard.period_label.90d') }}</option>
						<option value="this_year">{{ $t('dashboard.period_label.this_year') }}</option>
					</select>
					<Icon name="ph:caret-down-bold" size="12" class="absolute right-2 text-slate-400 pointer-events-none" />
				</div>
				</div>
		</div>

		<!-- ========================================== -->
		<!-- 2. STATS ROW                            -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
			<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[11px] text-slate-400 font-medium mb-1">{{ $t('dashboard.stats.players') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white">{{ statsLoading ? '—' : (dashboardStats?.totalPlayers || 0) }}</p>
				<NuxtLink to="/dashboard/players" class="text-[11px] text-[#007AFF] font-semibold mt-1 inline-block">{{ $t('dashboard.stats.view_all') }}</NuxtLink>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[11px] text-slate-400 font-medium mb-1">{{ $t('dashboard.stats.participations') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white">{{ statsLoading ? '—' : (dashboardStats?.totalSessions || 0) }}</p>
				<p v-if="dashboardStats?.winRate" class="text-[11px] text-slate-400 mt-1">{{ dashboardStats.winRate }}{{ $t('dashboard.stats.winners_rate') }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[11px] text-slate-400 font-medium mb-1">{{ $t('dashboard.stats.prizes_won') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white">{{ statsLoading ? '—' : (dashboardStats?.totalPrizesWon || 0) }}</p>
				<p class="text-[11px] text-slate-400 mt-1">{{ dashboardStats?.totalPrizesRedeemed || 0 }} {{ $t('dashboard.stats.prizes_collected') }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[11px] text-slate-400 font-medium mb-1">{{ $t('dashboard.stats.pending_prizes') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white">{{ statsLoading ? '—' : ((dashboardStats?.totalPrizesWon || 0) - (dashboardStats?.totalPrizesRedeemed || 0)) }}</p>
				<NuxtLink to="/dashboard/redeem" class="text-[11px] text-[#007AFF] font-semibold mt-1 inline-block">{{ $t('dashboard.stats.validate_prize') }}</NuxtLink>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- 2.5 ANALYTICS EVENTS (Compact)           -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription && (analyticsEvents.page_visit || analyticsEvents.game_start || analyticsEvents.game_complete || analyticsEvents.prize_claim)"
			class="grid grid-cols-2 sm:grid-cols-4 gap-3">
			<div class="bg-white dark:bg-[#1C1C1E] px-4 py-3 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{{ $t('dashboard.analytics.page_views') }}</p>
				<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.page_visit || 0 }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] px-4 py-3 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{{ $t('dashboard.analytics.games_started') }}</p>
				<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.game_start || 0 }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] px-4 py-3 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{{ $t('dashboard.analytics.games_completed') }}</p>
				<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.game_complete || 0 }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] px-4 py-3 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
				<p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{{ $t('dashboard.analytics.prizes_claimed') }}</p>
				<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.prize_claim || 0 }}</p>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- 3. MAIN ACTIVITY (Split: Chart & Actions) -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Chart Area -->
			<div class="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm p-5 relative overflow-hidden">
				<div class="flex items-center justify-between mb-6">
					<div>
						<h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.activity.title') }}</h3>
						<p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ periodLabel }}</p>
					</div>
					<!-- Legend -->
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-1.5">
							<span class="w-2 h-2 rounded-full bg-[#007AFF]"></span>
							<span class="text-[11px] text-slate-500 dark:text-slate-400">{{ $t('dashboard.activity.participations') }}</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
							<span class="text-[11px] text-slate-500 dark:text-slate-400">{{ $t('dashboard.activity.wins') }}</span>
						</div>
					</div>
				</div>

				<!-- Loading state -->
				<div v-if="statsLoading" class="h-64 w-full flex items-center justify-center">
					<Icon name="ph:spinner-gap-bold" size="32" class="animate-spin text-slate-300" />
				</div>

				<!-- Empty state -->
				<div v-else-if="!dashboardStats?.chartData?.length" class="h-64 w-full flex flex-col items-center justify-center text-slate-400">
					<Icon name="ph:chart-bar-duotone" size="48" class="mb-2 opacity-50" />
					<p class="text-sm font-medium">{{ $t('dashboard.activity.no_data') }}</p>
					<p class="text-xs">{{ $t('dashboard.activity.no_data_hint') }}</p>
				</div>

				<!-- Chart Visualization -->
				<template v-else>
					<!-- Line Chart -->
					<template v-if="lineChartData">
						<div class="h-64 w-full px-2">
							<svg :viewBox="`0 0 ${lineChartData.w} ${lineChartData.h}`" class="w-full h-full">
								<!-- Grid lines -->
								<line v-for="i in 4" :key="'grid'+i"
									:x1="20" :x2="780"
									:y1="lineChartData.padY + (i - 1) * (lineChartData.usableH / 3)"
									:y2="lineChartData.padY + (i - 1) * (lineChartData.usableH / 3)"
									stroke="currentColor" stroke-width="0.5" class="text-slate-100 dark:text-slate-700" />

								<defs>
									<linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="#007AFF" stop-opacity="0.12" />
										<stop offset="100%" stop-color="#007AFF" stop-opacity="0.01" />
									</linearGradient>
									<linearGradient id="winGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="#8E8E93" stop-opacity="0.10" />
										<stop offset="100%" stop-color="#8E8E93" stop-opacity="0.01" />
									</linearGradient>
								</defs>

								<path :d="lineChartData.sessionArea" fill="url(#sessionGradient)" />
								<path :d="lineChartData.winArea" fill="url(#winGradient)" />

								<polyline :points="lineChartData.sessionLine"
									fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
								<polyline :points="lineChartData.winLine"
									fill="none" stroke="#8E8E93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

								<g v-for="(p, i) in lineChartData.points" :key="'sd'+i">
									<circle :cx="p.x" :cy="p.sessionY" r="3.5" fill="#007AFF" stroke="white" stroke-width="1.5" class="cursor-pointer" />
									<title>{{ p.sessions }} participation(s)</title>
								</g>
								<g v-for="(p, i) in lineChartData.points" :key="'wd'+i">
									<circle :cx="p.x" :cy="p.winY" r="3.5" fill="#8E8E93" stroke="white" stroke-width="1.5" class="cursor-pointer" />
									<title>{{ p.wins }} gain(s)</title>
								</g>
							</svg>
						</div>
					</template>

					<!-- Labels -->
					<div class="flex justify-between mt-4 px-2 text-xs font-bold text-slate-400 uppercase">
						<span v-for="(day, index) in dashboardStats.chartData" :key="index" class="text-center flex-1">
							{{ day.label }}
						</span>
					</div>
				</template>
			</div>

			<!-- Quick Actions / Support -->
			<div class="space-y-6">
				<!-- Quick Validate Widget -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm p-5">
					<div class="flex items-center gap-3 mb-4">
						<div class="w-9 h-9 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
							<Icon name="ph:qr-code-bold" size="17" class="text-slate-500 dark:text-slate-400" />
						</div>
						<div>
							<h3 class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.quick_validate.title') }}</h3>
							<p class="text-[11px] text-slate-400 dark:text-slate-500">{{ $t('dashboard.quick_validate.subtitle') }}</p>
						</div>
					</div>

					<!-- Success State -->
					<div v-if="redeemResult" class="bg-[#34C759]/10 rounded-xl p-4 border border-[#34C759]/20 mb-2">
						<div class="flex items-center gap-2 text-[#34C759] font-semibold text-sm mb-1">
							<Icon name="ph:check-circle-fill" />
							<span>{{ $t('dashboard.quick_validate.success') }}</span>
						</div>
						<p class="text-xs text-slate-600 dark:text-slate-400 mb-3">
							<span class="font-semibold">{{ redeemResult.prize?.name }}</span> {{ $t('dashboard.quick_validate.for_player') }} {{ redeemResult.player?.firstName }}
						</p>
						<button @click="resetRedeem" class="text-xs font-semibold text-[#007AFF] hover:opacity-70 transition-opacity">{{ $t('dashboard.quick_validate.new_validation') }}</button>
					</div>

					<!-- Scanner State -->
					<div v-else-if="showScanner" class="relative rounded-lg overflow-hidden bg-black aspect-video mb-4">
						<video id="qr-video" autoplay playsinline @play="onVideoPlay"
							class="w-full h-full object-cover opacity-80"></video>
						<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div class="w-32 h-32 border-2 border-white/50 rounded-lg relative">
								<div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white"></div>
								<div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white"></div>
								<div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white"></div>
								<div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white"></div>
							</div>
						</div>
						<button @click="stopScanning"
							class="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm z-10">
							<Icon name="ph:x-bold" size="14" />
						</button>
						<p class="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/80 font-medium">
							{{ $t('dashboard.quick_validate.position_qr') }}</p>
					</div>

					<!-- Form -->
					<div v-else>
						<div class="relative flex items-center gap-2">
							<div class="relative flex-grow">
								<input v-model="redeemCode" @keyup.enter="validatePrize" type="text"
									:placeholder="$t('dashboard.quick_validate.code_placeholder')"
									class="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all uppercase"
									:class="{ 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-800': redeemError }" />
								<button @click="validatePrize" :disabled="redeemLoading || !redeemCode"
									class="absolute right-1 top-1 bottom-1 aspect-square bg-white dark:bg-slate-800 rounded-md text-[#007AFF] dark:text-slate-400 hover:text-[#007AFF] hover:bg-[#007AFF]/5 dark:hover:bg-[#007AFF]/50/10 disabled:opacity-50 transition-all border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center">
									<Icon v-if="redeemLoading" name="ph:spinner-gap-bold" class="animate-spin" />
									<Icon v-else name="ph:arrow-right-bold" class="rtl:rotate-180" />
								</button>
							</div>
							<button @click="startScanning"
								class="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 transition-colors flex-shrink-0"
								:title="$t('dashboard.quick_validate.position_qr')">
								<Icon name="ph:qr-code-bold" size="20" />
							</button>
						</div>
						<p v-if="redeemError" class="text-xs text-red-500 font-bold mt-2 ml-1 flex items-center gap-1">
							<Icon name="ph:warning-circle-fill" /> {{ redeemError }}
						</p>
					</div>
				</div>

				<!-- Quick Links -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm overflow-hidden">
					<p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest px-5 pt-4 pb-2">{{ $t('dashboard.quick_links.title') }}</p>
					<div class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
						<NuxtLink to="/dashboard/games"
							class="flex items-center gap-3.5 px-5 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors group">
							<div class="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
								<Icon name="ph:game-controller-bold" size="15" class="text-slate-500 dark:text-slate-400" />
							</div>
							<span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{{ $t('dashboard.quick_links.my_games') }}</span>
							<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600" />
						</NuxtLink>
						<NuxtLink to="/dashboard/profile"
							class="flex items-center gap-3.5 px-5 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors group">
							<div class="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
								<Icon name="ph:storefront-bold" size="15" class="text-slate-500 dark:text-slate-400" />
							</div>
							<span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{{ $t('dashboard.quick_links.my_business') }}</span>
							<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600" />
						</NuxtLink>
					</div>
				</div>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- 4. TABLE SECTION (Full Width)          -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription"
			class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm overflow-hidden">
			<!-- Table Header -->
			<div class="px-5 py-4 border-b border-[#E5E5EA] dark:border-slate-700/40 flex items-center justify-between">
				<h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.sessions_table.title') }}</h3>
				<div class="flex gap-1.5">
					<button @click="sessionFilter = 'all'"
						:class="sessionFilter === 'all' ? 'bg-[#007AFF] text-white' : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-500 dark:text-slate-400'"
						class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">{{ $t('dashboard.sessions_table.filter_all') }}</button>
					<button @click="sessionFilter = 'won'"
						:class="sessionFilter === 'won' ? 'bg-[#007AFF] text-white' : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-500 dark:text-slate-400'"
						class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">{{ $t('dashboard.sessions_table.filter_won') }}</button>
				</div>
			</div>

			<!-- Loading / Empty -->
			<div v-if="sessionsLoading" class="p-12 text-center">
				<Icon name="ph:spinner-gap-bold" size="32" class="mx-auto text-slate-300 animate-spin" />
			</div>

			<div v-else-if="filteredSessions.length === 0" class="p-12 text-center text-slate-500 text-sm">
				{{ $t('dashboard.sessions_table.no_sessions') }}
			</div>

			<!-- Table Content -->
			<div v-else class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-[#E5E5EA] dark:border-slate-700/40">
						<tr>
							<th class="px-5 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">{{ $t('dashboard.sessions_table.header_id') }}</th>
							<th class="px-5 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">{{ $t('dashboard.sessions_table.header_status') }}</th>
							<th class="px-5 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">{{ $t('dashboard.sessions_table.header_player') }}</th>
							<th class="px-5 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">{{ $t('dashboard.sessions_table.header_date') }}</th>
							<th class="px-5 py-3 font-semibold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider text-right rtl:text-left">{{ $t('dashboard.sessions_table.header_prize') }}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
						<tr v-for="session in filteredSessions.slice(0, 10)" :key="session.id"
							class="hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors">
							<td class="px-5 py-3.5 font-mono text-xs text-slate-400">#{{ session.id.slice(0, 6) }}</td>
							<td class="px-5 py-3.5">
								<span v-if="session.prize"
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759]">
									<span class="w-1.5 h-1.5 rounded-full bg-[#34C759]"></span>{{ $t('dashboard.sessions_table.status_won') }}
								</span>
								<span v-else
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-400">
									<span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{{ $t('dashboard.sessions_table.status_lost') }}
								</span>
							</td>
							<td class="px-5 py-3.5">
								<div class="flex items-center gap-2">
									<div class="w-6 h-6 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[10px] font-bold text-slate-500">
										{{ (session.player?.firstName?.[0] || 'A') }}
									</div>
									<span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ session.player?.firstName || $t('dashboard.sessions_table.anonymous') }}</span>
								</div>
							</td>
							<td class="px-5 py-3.5 text-slate-400 text-[11px]">{{ formatDate(session.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</td>
							<td class="px-5 py-3.5 text-right rtl:text-left font-semibold text-sm text-slate-900 dark:text-white">{{ session.prize ? session.prizeName : '—' }}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div class="px-5 py-3 border-t border-[#E5E5EA] dark:border-slate-700/40 text-center">
				<NuxtLink to="/dashboard/prizes" class="text-xs font-semibold text-[#007AFF] hover:opacity-70 transition-opacity uppercase tracking-wide">
					{{ $t('dashboard.sessions_table.view_history') }}
				</NuxtLink>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- LIMITED VIEW (No Subscription)         -->
		<!-- ========================================== -->
		<div v-if="!subscriptionLoading && !hasActiveSubscription" class="space-y-4">
			<!-- Features Preview (Blurred/Locked) -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Locked Feature Card: Jeux -->
				<div class="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-5 overflow-hidden shadow-sm">
					<div class="absolute inset-0 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
						<div class="text-center">
							<div class="w-10 h-10 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl flex items-center justify-center mx-auto mb-2">
								<Icon name="ph:lock-simple-bold" size="18" class="text-slate-400" />
							</div>
							<p class="text-sm font-semibold text-slate-600 dark:text-slate-300">{{ $t('dashboard.limited_view.no_subscription') }}</p>
						</div>
					</div>
					<div class="flex items-center gap-3 mb-3">
						<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
							<Icon name="ph:game-controller-bold" size="17" class="text-slate-400" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.limited_view.create_games') }}</h3>
							<p class="text-[11px] text-slate-400">{{ $t('dashboard.limited_view.games_description') }}</p>
						</div>
					</div>
					<div class="h-20 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl"></div>
				</div>

				<!-- Locked Feature Card: Joueurs -->
				<div class="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-5 overflow-hidden shadow-sm">
					<div class="absolute inset-0 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
						<div class="text-center">
							<div class="w-10 h-10 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl flex items-center justify-center mx-auto mb-2">
								<Icon name="ph:lock-simple-bold" size="18" class="text-slate-400" />
							</div>
							<p class="text-sm font-semibold text-slate-600 dark:text-slate-300">{{ $t('dashboard.limited_view.no_subscription') }}</p>
						</div>
					</div>
					<div class="flex items-center gap-3 mb-3">
						<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
							<Icon name="ph:users-three-bold" size="17" class="text-slate-400" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.limited_view.player_database') }}</h3>
							<p class="text-[11px] text-slate-400">{{ $t('dashboard.limited_view.players_description') }}</p>
						</div>
					</div>
					<div class="h-20 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl"></div>
				</div>

				<!-- Locked Feature Card: Lots -->
				<div class="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-5 overflow-hidden shadow-sm">
					<div class="absolute inset-0 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
						<div class="text-center">
							<div class="w-10 h-10 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl flex items-center justify-center mx-auto mb-2">
								<Icon name="ph:lock-simple-bold" size="18" class="text-slate-400" />
							</div>
							<p class="text-sm font-semibold text-slate-600 dark:text-slate-300">{{ $t('dashboard.limited_view.no_subscription') }}</p>
						</div>
					</div>
					<div class="flex items-center gap-3 mb-3">
						<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
							<Icon name="ph:gift-bold" size="17" class="text-slate-400" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.limited_view.prize_management') }}</h3>
							<p class="text-[11px] text-slate-400">{{ $t('dashboard.limited_view.prizes_description') }}</p>
						</div>
					</div>
					<div class="h-20 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl"></div>
				</div>

				<!-- Locked Feature Card: Validation -->
				<div class="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6 overflow-hidden">
					<div class="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
						<div class="text-center">
							<div class="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
								<Icon name="ph:lock-simple-fill" size="24" class="text-slate-400" />
							</div>
							<p class="text-sm font-bold text-slate-600 dark:text-slate-300">{{ $t('dashboard.limited_view.no_subscription') }}</p>
							<p class="text-xs text-slate-400 mt-1">{{ $t('dashboard.limited_view.unlock_features') }}</p>
						</div>
					</div>
					<div class="flex items-center gap-4 mb-4">
						<div class="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600">
							<Icon name="ph:qr-code-fill" size="24" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('dashboard.limited_view.qr_validation') }}</h3>
							<p class="text-sm text-slate-500">{{ $t('dashboard.limited_view.qr_description') }}</p>
						</div>
					</div>
					<div class="h-24 bg-slate-50 dark:bg-slate-700/50 rounded-lg"></div>
				</div>
			</div>

			<!-- Available Actions -->
			<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
				<h3 class="font-bold text-slate-900 dark:text-white mb-4">{{ $t('dashboard.limited_view.available_actions') }}</h3>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<NuxtLink to="/dashboard/profile"
						class="flex items-center gap-3.5 p-4 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-all">
						<div class="w-9 h-9 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
							<Icon name="ph:storefront-bold" size="17" class="text-slate-500 dark:text-slate-400" />
						</div>
						<div class="flex-1">
							<p class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.quick_links.my_business') }}</p>
							<p class="text-[11px] text-slate-400">{{ $t('dashboard.limited_view.available_actions') }}</p>
						</div>
						<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600" />
					</NuxtLink>

					<NuxtLink to="/dashboard/subscription"
						class="flex items-center gap-3.5 p-4 rounded-2xl border border-[#007AFF]/30 bg-[#007AFF]/5 hover:bg-[#007AFF]/10 transition-all">
						<div class="w-9 h-9 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
							<Icon name="ph:crown-simple-bold" size="17" class="text-[#007AFF]" />
						</div>
						<div class="flex-1">
							<p class="font-semibold text-[#007AFF] text-sm">{{ $t('dashboard.limited_view.subscribe') }}</p>
							<p class="text-[11px] text-[#007AFF]/70">{{ $t('dashboard.limited_view.unlock_all') }}</p>
						</div>
						<Icon name="ph:arrow-right-bold" size="13" class="text-[#007AFF]" />
					</NuxtLink>
				</div>
			</div>

			<!-- Support Card -->
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
				<div class="flex items-center gap-3 flex-1">
					<div class="w-9 h-9 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon name="ph:question-bold" size="17" class="text-slate-500 dark:text-slate-400" />
					</div>
					<div>
						<p class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.limited_view.have_questions') }}</p>
						<p class="text-[11px] text-slate-400">{{ $t('dashboard.limited_view.questions_description') }}</p>
					</div>
				</div>
				<a href="mailto:support@scanupgo.com"
					class="px-4 py-2 bg-[#007AFF] text-white rounded-xl text-sm font-semibold hover:bg-[#0066DD] transition-colors shadow-md shadow-[#007AFF]/25 shrink-0">
					{{ $t('dashboard.limited_view.contact_us') }}
				</a>
			</div>
		</div>

	</div>
</template>
