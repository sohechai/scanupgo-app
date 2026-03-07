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
			class="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
			<!-- Decorative elements -->
			<div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
			<div class="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -ml-24 -mb-24"></div>

			<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-3">
						<Icon name="ph:crown-simple-fill" size="24" class="text-yellow-300" />
						<span class="text-xs font-bold uppercase tracking-wider text-white/80">{{ $t('dashboard.cta_banner.label') }}</span>
					</div>
					<h2 class="text-2xl md:text-3xl font-display font-bold mb-2">
						{{ $t('dashboard.cta_banner.title') }}
					</h2>
					<p class="text-white/80 text-sm md:text-base max-w-xl">
						{{ $t('dashboard.cta_banner.description') }}
					</p>
				</div>
				<div class="flex flex-col sm:flex-row gap-3">
					<NuxtLink to="/dashboard/subscription"
						class="px-6 py-3 bg-white text-brand-600 font-bold rounded-xl hover:bg-white/90 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2">
						<Icon name="ph:rocket-launch-bold" size="18" />
						{{ $t('dashboard.cta_banner.button') }}
					</NuxtLink>
				</div>
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
						class="appearance-none pl-9 rtl:pl-8 pr-8 rtl:pr-9 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 text-sm font-semibold hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
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
		<!-- 2. STATS ROW (Reference Style)         -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- JOUERS -->
			<div
				class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-lg transition-all duration-300 group">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('dashboard.stats.players') }}</span>
						<span
							class="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
							{{ statsLoading ? '-' : (dashboardStats?.totalPlayers || 0) }}
						</span>
					</div>
					<div
						class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
						<Icon name="ph:users-three-fill" size="20" />
					</div>
				</div>
				<div class="flex items-center gap-2">
					<NuxtLink to="/dashboard/players" class="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
						<Icon name="ph:users-three" size="12" />
						{{ $t('dashboard.stats.view_all') }}
					</NuxtLink>
				</div>
			</div>

			<!-- CONVERSIONS (Participations) -->
			<div
				class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-lg transition-all duration-300 group">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span
							class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('dashboard.stats.participations') }}</span>
						<span
							class="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
							{{ statsLoading ? '-' : (dashboardStats?.totalSessions || 0) }}
						</span>
					</div>
					<div
						class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
						<Icon name="ph:cursor-click-fill" size="20" />
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span v-if="dashboardStats?.winRate" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
						<Icon name="ph:trophy-fill" size="10" />
						{{ dashboardStats.winRate }}{{ $t('dashboard.stats.winners_rate') }}
					</span>
				</div>
			</div>

			<!-- REVENUE (Cadeaux) -->
			<div
				class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-lg transition-all duration-300 group">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('dashboard.stats.prizes_won') }}</span>
						<div class="flex items-baseline gap-1">
							<span
								class="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
								{{ statsLoading ? '-' : (dashboardStats?.totalPrizesWon || 0) }}
							</span>
						</div>
					</div>
					<div
						class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
						<Icon name="ph:gift-fill" size="20" />
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span v-if="dashboardStats?.totalPrizesRedeemed" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
						<Icon name="ph:check-circle-fill" size="10" />
						{{ dashboardStats.totalPrizesRedeemed }} {{ $t('dashboard.stats.prizes_collected') }}
					</span>
					<span v-else class="text-xs text-slate-400 font-medium">{{ $t('dashboard.stats.prizes_collected_zero') }}</span>
				</div>
			</div>

			<!-- LOTS EN ATTENTE -->
			<div
				class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-lg transition-all duration-300 group">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('dashboard.stats.pending_prizes') }}</span>
						<span
							class="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
							{{ statsLoading ? '-' : ((dashboardStats?.totalPrizesWon || 0) - (dashboardStats?.totalPrizesRedeemed || 0)) }}
						</span>
					</div>
					<div
						class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
						<Icon name="ph:clock-countdown-fill" size="20" />
					</div>
				</div>
				<div class="flex items-center gap-2">
					<NuxtLink to="/dashboard/redeem" class="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
						<Icon name="ph:qr-code-bold" size="12" />
						{{ $t('dashboard.stats.validate_prize') }}
					</NuxtLink>
				</div>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- 2.5 ANALYTICS EVENTS (Compact)           -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription && (analyticsEvents.page_visit || analyticsEvents.game_start || analyticsEvents.game_complete || analyticsEvents.prize_claim)"
			class="grid grid-cols-2 sm:grid-cols-4 gap-4">
			<div class="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
					<Icon name="ph:eye-fill" size="16" />
				</div>
				<div>
					<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.page_visit || 0 }}</p>
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ $t('dashboard.analytics.page_views') }}</p>
				</div>
			</div>
			<div class="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-500">
					<Icon name="ph:play-fill" size="16" />
				</div>
				<div>
					<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.game_start || 0 }}</p>
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ $t('dashboard.analytics.games_started') }}</p>
				</div>
			</div>
			<div class="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
					<Icon name="ph:flag-checkered-fill" size="16" />
				</div>
				<div>
					<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.game_complete || 0 }}</p>
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ $t('dashboard.analytics.games_completed') }}</p>
				</div>
			</div>
			<div class="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
					<Icon name="ph:hand-grabbing-fill" size="16" />
				</div>
				<div>
					<p class="text-lg font-bold text-slate-900 dark:text-white">{{ analyticsEvents.prize_claim || 0 }}</p>
					<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ $t('dashboard.analytics.prizes_claimed') }}</p>
				</div>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- 3. MAIN ACTIVITY (Split: Chart & Actions) -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Chart Area -->
			<div
				class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6 relative overflow-hidden">
				<div class="flex items-center justify-between mb-8">
					<div>
						<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('dashboard.activity.title') }}</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{{ $t('dashboard.activity.period_label') }} : {{ periodLabel }}</p>
					</div>
					<!-- Legend -->
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
							<span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">{{ $t('dashboard.activity.participations') }}</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
							<span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">{{ $t('dashboard.activity.wins') }}</span>
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
									<!-- Sessions area gradient -->
									<linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="#6366f1" stop-opacity="0.15" />
										<stop offset="100%" stop-color="#6366f1" stop-opacity="0.02" />
									</linearGradient>
									<!-- Wins area gradient -->
									<linearGradient id="winGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="#10b981" stop-opacity="0.15" />
										<stop offset="100%" stop-color="#10b981" stop-opacity="0.02" />
									</linearGradient>
								</defs>

								<!-- Sessions area fill (behind) -->
								<path :d="lineChartData.sessionArea" fill="url(#sessionGradient)" />

								<!-- Wins area fill -->
								<path :d="lineChartData.winArea" fill="url(#winGradient)" />

								<!-- Sessions line -->
								<polyline :points="lineChartData.sessionLine"
									fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

								<!-- Wins line -->
								<polyline :points="lineChartData.winLine"
									fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

								<!-- Session dots -->
								<g v-for="(p, i) in lineChartData.points" :key="'sd'+i">
									<circle :cx="p.x" :cy="p.sessionY" r="4" fill="#6366f1" stroke="white" stroke-width="2" class="cursor-pointer" />
									<title>{{ p.sessions }} participation(s)</title>
								</g>

								<!-- Win dots -->
								<g v-for="(p, i) in lineChartData.points" :key="'wd'+i">
									<circle :cx="p.x" :cy="p.winY" r="4" fill="#10b981" stroke="white" stroke-width="2" class="cursor-pointer" />
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
				<div
					class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-6">
					<div class="flex items-center gap-3 mb-4">
						<div
							class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
							<Icon name="ph:qr-code-bold" size="20" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('dashboard.quick_validate.title') }}</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('dashboard.quick_validate.subtitle') }}</p>
						</div>
					</div>

					<!-- Success State -->
					<div v-if="redeemResult" class="bg-emerald-50 rounded-lg p-4 border border-emerald-100 mb-2">
						<div class="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
							<Icon name="ph:check-circle-fill" />
							<span>{{ $t('dashboard.quick_validate.success') }}</span>
						</div>
						<p class="text-xs text-emerald-600 mb-3">
							<span class="font-bold">{{ redeemResult.prize?.name }}</span> {{ $t('dashboard.quick_validate.for_player') }} {{
								redeemResult.player?.firstName }}
						</p>
						<button @click="resetRedeem"
							class="text-xs font-bold text-emerald-700 underline hover:text-emerald-800">{{ $t('dashboard.quick_validate.new_validation') }}</button>
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
									class="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all uppercase"
									:class="{ 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-800': redeemError }" />
								<button @click="validatePrize" :disabled="redeemLoading || !redeemCode"
									class="absolute right-1 top-1 bottom-1 aspect-square bg-white dark:bg-slate-800 rounded-md text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-50 transition-all border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center">
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

				<!-- Support Banner -->
				<div
					class="bg-indigo-950 rounded-xl p-6 text-white relative overflow-hidden shadow-lg flex flex-col justify-between group">
					<!-- Decorative Glow -->
					<div
						class="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full blur-[60px] -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity">
					</div>

					<div class="relative z-10">
						<div
							class="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center mb-4 border border-white/10">
							<Icon name="ph:lifebuoy-fill" size="20" />
						</div>
						<h3 class="font-bold text-lg mb-1">{{ $t('dashboard.support.title') }}</h3>
						<p class="text-indigo-200 text-sm leading-relaxed mb-4">{{ $t('dashboard.support.description') }}</p>
					</div>

					<button
						class="w-full py-2.5 bg-white text-indigo-950 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2 relative z-10">
						{{ $t('dashboard.support.button') }}
					</button>
				</div>

				<!-- Quick Links -->
				<div
					class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-4">
					<h4 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">{{ $t('dashboard.quick_links.title') }}</h4>
					<div class="space-y-2">
						<NuxtLink to="/dashboard/games"
							class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group">
							<div
								class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
								<Icon name="ph:game-controller-fill" size="16" />
							</div>
							<span class="text-sm font-bold">{{ $t('dashboard.quick_links.my_games') }}</span>
							<Icon name="ph:caret-right-bold" size="12"
								class="ml-auto rtl:ml-0 rtl:mr-auto text-slate-300 dark:text-slate-600 group-hover:text-brand-400 dark:group-hover:text-brand-400 rtl:rotate-180" />
						</NuxtLink>
						<NuxtLink to="/dashboard/profile"
							class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group">
							<div
								class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
								<Icon name="ph:storefront-fill" size="16" />
							</div>
							<span class="text-sm font-bold">{{ $t('dashboard.quick_links.my_business') }}</span>
							<Icon name="ph:caret-right-bold" size="12"
								class="ml-auto rtl:ml-0 rtl:mr-auto text-slate-300 dark:text-slate-600 group-hover:text-brand-400 dark:group-hover:text-brand-400 rtl:rotate-180" />
						</NuxtLink>
					</div>
				</div>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- 4. TABLE SECTION (Full Width)          -->
		<!-- ========================================== -->
		<div v-if="hasActiveSubscription"
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
			<!-- Table Header -->
			<div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
				<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('dashboard.sessions_table.title') }}</h3>
				<div class="flex gap-2">
					<button @click="sessionFilter = 'all'"
						:class="sessionFilter === 'all' ? 'text-brand-600 bg-brand-50' : 'text-slate-500 hover:text-slate-700'"
						class="text-xs font-bold px-3 py-1.5 rounded-md transition-colors">{{ $t('dashboard.sessions_table.filter_all') }}</button>
					<button @click="sessionFilter = 'won'"
						:class="sessionFilter === 'won' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'"
						class="text-xs font-bold px-3 py-1.5 rounded-md transition-colors">{{ $t('dashboard.sessions_table.filter_won') }}</button>
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
					<thead class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
						<tr>
							<th
								class="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
								{{ $t('dashboard.sessions_table.header_id') }}</th>
							<th
								class="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
								{{ $t('dashboard.sessions_table.header_status') }}
							</th>
							<th
								class="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
								{{ $t('dashboard.sessions_table.header_player') }}
							</th>
							<th
								class="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
								{{ $t('dashboard.sessions_table.header_date') }}
							</th>
							<th
								class="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right rtl:text-left">
								{{ $t('dashboard.sessions_table.header_prize') }}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
						<tr v-for="session in filteredSessions.slice(0, 10)" :key="session.id"
							class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
							<td
								class="px-6 py-4 font-mono text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">
								#{{ session.id.slice(0, 6) }}</td>
							<td class="px-6 py-4">
								<span v-if="session.prize"
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
									<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {{ $t('dashboard.sessions_table.status_won') }}
								</span>
								<span v-else
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
									<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {{ $t('dashboard.sessions_table.status_lost') }}
								</span>
							</td>
							<td class="px-6 py-4">
								<div class="flex items-center gap-2">
									<div
										class="w-6 h-6 rounded-full bg-brand-100/50 text-brand-600 flex items-center justify-center text-[10px] font-bold">
										{{ (session.player?.firstName?.[0] || 'A') }}
									</div>
									<span class="font-bold text-slate-700 dark:text-slate-200">{{
										session.player?.firstName || $t('dashboard.sessions_table.anonymous')
										}}</span>
								</div>
							</td>
							<td class="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
								{{ formatDate(session.createdAt, {
									month: 'short', day: 'numeric', hour: '2-digit',
									minute: '2-digit'
								}) }}
							</td>
							<td class="px-6 py-4 text-right rtl:text-left font-bold text-slate-900 dark:text-white">
								{{ session.prize ? session.prizeName : '-' }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<!-- Footer Link -->
			<div
				class="px-6 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800 text-center">
				<button
					class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 uppercase tracking-wide">
					{{ $t('dashboard.sessions_table.view_history') }}
				</button>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- LIMITED VIEW (No Subscription)         -->
		<!-- ========================================== -->
		<div v-if="!subscriptionLoading && !hasActiveSubscription" class="space-y-6">
			<!-- Features Preview (Blurred/Locked) -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Locked Feature Card: Jeux -->
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
						<div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
							<Icon name="ph:game-controller-fill" size="24" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('dashboard.limited_view.create_games') }}</h3>
							<p class="text-sm text-slate-500">{{ $t('dashboard.limited_view.games_description') }}</p>
						</div>
					</div>
					<div class="h-24 bg-slate-50 dark:bg-slate-700/50 rounded-lg"></div>
				</div>

				<!-- Locked Feature Card: Joueurs -->
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
						<div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
							<Icon name="ph:users-three-fill" size="24" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('dashboard.limited_view.player_database') }}</h3>
							<p class="text-sm text-slate-500">{{ $t('dashboard.limited_view.players_description') }}</p>
						</div>
					</div>
					<div class="h-24 bg-slate-50 dark:bg-slate-700/50 rounded-lg"></div>
				</div>

				<!-- Locked Feature Card: Lots -->
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
						<div class="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600">
							<Icon name="ph:gift-fill" size="24" />
						</div>
						<div>
							<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('dashboard.limited_view.prize_management') }}</h3>
							<p class="text-sm text-slate-500">{{ $t('dashboard.limited_view.prizes_description') }}</p>
						</div>
					</div>
					<div class="h-24 bg-slate-50 dark:bg-slate-700/50 rounded-lg"></div>
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
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<NuxtLink to="/dashboard/profile"
						class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-800 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-all group">
						<div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 group-hover:text-brand-600 transition-colors">
							<Icon name="ph:storefront-fill" size="20" />
						</div>
						<div class="flex-1">
							<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('dashboard.quick_links.my_business') }}</p>
							<p class="text-xs text-slate-500">{{ $t('dashboard.limited_view.available_actions') }}</p>
						</div>
						<Icon name="ph:caret-right-bold" size="16" class="text-slate-300 group-hover:text-brand-500 rtl:rotate-180" />
					</NuxtLink>

					<NuxtLink to="/dashboard/subscription"
						class="flex items-center gap-4 p-4 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-500/5 hover:bg-brand-100/50 dark:hover:bg-brand-500/10 transition-all group">
						<div class="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600">
							<Icon name="ph:crown-simple-fill" size="20" />
						</div>
						<div class="flex-1">
							<p class="font-bold text-brand-700 dark:text-brand-400 text-sm">{{ $t('dashboard.limited_view.subscribe') }}</p>
							<p class="text-xs text-brand-600/70 dark:text-brand-400/70">{{ $t('dashboard.limited_view.unlock_all') }}</p>
						</div>
						<Icon name="ph:arrow-right-bold" size="16" class="text-brand-500 rtl:rotate-180" />
					</NuxtLink>
				</div>
			</div>

			<!-- Support Card -->
			<div class="bg-indigo-950 rounded-xl p-6 text-white relative overflow-hidden shadow-lg">
				<div class="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full blur-[60px] -mr-16 -mt-16 opacity-20"></div>
				<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/10">
							<Icon name="ph:question-fill" size="24" />
						</div>
						<div>
							<h3 class="font-bold text-lg">{{ $t('dashboard.limited_view.have_questions') }}</h3>
							<p class="text-indigo-200 text-sm">{{ $t('dashboard.limited_view.questions_description') }}</p>
						</div>
					</div>
					<a href="mailto:support@scanupgo.com"
						class="px-6 py-2.5 bg-white text-indigo-950 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10">
						{{ $t('dashboard.limited_view.contact_us') }}
					</a>
				</div>
			</div>
		</div>

	</div>
</template>
