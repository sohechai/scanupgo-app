<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'

definePageMeta({
	layout: 'dashboard',
	pageTransition: false,
	middleware: 'auth'
})
useHead({ title: 'Tableau de bord' })

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

// --- STATE: GOOGLE STATS ---
const googleStats = ref<{
  rating: number | null
  reviewCount: number | null
  reviewCountAtTrackingStart: number | null
  trackingStartedAt: string | null
  reviewUrl: string | null
} | null>(null)

const googleReviewsSinceTracking = computed(() => {
  if (!googleStats.value) return null
  if (googleStats.value.reviewCount == null || googleStats.value.reviewCountAtTrackingStart == null) return null
  return googleStats.value.reviewCount - googleStats.value.reviewCountAtTrackingStart
})

const trackingStartLabel = computed(() => {
  if (!googleStats.value?.trackingStartedAt) return null
  return formatDate(new Date(googleStats.value.trackingStartedAt), { day: 'numeric', month: 'long' })
})

const fetchGoogleStats = async () => {
  try {
    const data = await $api<any>('/businesses/me')
    googleStats.value = {
      rating: data.googleRating ?? null,
      reviewCount: data.googleReviewCount ?? null,
      reviewCountAtTrackingStart: data.googleReviewCountAtTrackingStart ?? null,
      trackingStartedAt: data.googleTrackingStartedAt ?? null,
      reviewUrl: data.googleReviewUrl ?? null,
    }
  } catch { /* silently fail */ }
}

// --- STATE: CHART TOOLTIP ---
const hoveredIdx = ref<number | null>(null)

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

const sessionsPage = ref(1)
const SESSIONS_PAGE_SIZE = 20
const sessionsTotalPages = computed(() => Math.ceil(filteredSessions.value.length / SESSIONS_PAGE_SIZE))
const paginatedSessions = computed(() => {
	const start = (sessionsPage.value - 1) * SESSIONS_PAGE_SIZE
	return filteredSessions.value.slice(start, start + SESSIONS_PAGE_SIZE)
})
watch([sessionFilter], () => { sessionsPage.value = 1 })

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
		analyticsEvents.value = await $api(`/stats/activity?startDate=${startDate}&endDate=${endDate}`)
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

// Recent activity feed from sessions
const recentActivity = computed(() =>
	[...sessions.value]
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 8)
		.map(s => {
			const hasEmail = !!(s.player?.email)
			const hasPrize = !!(s.prize)
			const type = hasPrize ? 'won' : hasEmail ? 'contact' : 'played'
			const detail = hasPrize
				? `A joué et gagné ${s.prizeName || s.prize?.name || 'un lot'}`
				: hasEmail
					? `Nouveau contact — ${s.player.email}`
					: 'A participé au jeu'
			return {
				id: s.id,
				name: [s.player?.firstName, s.player?.lastName].filter(Boolean).join(' ') || 'Anonyme',
				initials: (s.player?.firstName?.[0] || 'A').toUpperCase(),
				type,
				detail,
				date: s.createdAt,
			}
		})
)

// Lifecycle
onMounted(() => {
	fetchSubscription() // non-blocking

	// If the cache already tells us the user is not subscribed (loading=false, no active sub),
	// skip the heavy data calls — the gate will hide the content anyway.
	if (!subscriptionLoading.value && !hasActiveSubscription.value) {
		sessionsLoading.value = false
		statsLoading.value = false
		playersLoading.value = false
		return
	}

	fetchSessions()
	fetchPlayers()
	fetchDashboardStats()
	fetchAnalyticsEvents()
	fetchGoogleStats()
})
</script>

<template>
	<div class="space-y-6 relative">

		<!-- 1. HEADER -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 tracking-tight">Bonjour, {{ user?.firstName || 'vous' }} 👋</h1>
				<p class="text-slate-400 text-sm mt-0.5">{{ formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
			</div>
			<div v-if="hasActiveSubscription" class="flex items-center gap-3">
				<div class="relative flex items-center">
					<Icon name="ph:calendar-blank" size="16" class="absolute left-3 rtl:left-auto rtl:right-3 text-slate-400 pointer-events-none z-10" />
					<select v-model="selectedPeriod"
						class="appearance-none pl-9 rtl:pl-8 pr-8 rtl:pr-9 py-1.5 bg-white border border-slate-200 rounded-md text-slate-600 text-sm font-semibold shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#007AFF]/10 focus:border-[#007AFF]/40 transition-all">
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

		<!-- 2. HERO — Google Avis -->
		<div v-if="hasActiveSubscription"
			class="relative overflow-hidden rounded-lg bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] px-5 py-4 text-white">
			<div class="relative flex items-center justify-between gap-4">
				<div class="flex-1 min-w-0">
					<p class="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-1">
						Nouveaux avis Google{{ trackingStartLabel ? ` depuis le ${trackingStartLabel}` : '' }}
					</p>
					<div class="flex items-baseline gap-3">
						<p class="text-3xl font-bold tabular-nums leading-none">
							{{ googleReviewsSinceTracking != null ? `+${googleReviewsSinceTracking}` : '—' }}
						</p>
					</div>
					<p class="text-blue-200 text-xs mt-1.5 truncate">
						{{ user?.business?.name }}
						<span class="mx-1 opacity-50">·</span>
						QR code actif
						<span class="mx-1 opacity-50">·</span>
						{{ analyticsEvents.page_visit || 0 }} scans ce mois
					</p>
				</div>
				<a v-if="googleStats?.reviewUrl" :href="googleStats.reviewUrl" target="_blank" rel="noopener noreferrer"
					class="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all">
					<Icon name="ph:arrow-square-out-bold" size="13" />
					Voir mes avis
				</a>
			</div>
		</div>

		<!-- 3. KPI CARDS -->
		<div v-if="hasActiveSubscription" class="grid grid-cols-2 lg:grid-cols-4 gap-2">
			<div class="bg-white px-3 py-3 rounded-lg border border-slate-200">
				<div class="flex items-center justify-between mb-1">
					<p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Note Google</p>
					<div class="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
						<Icon name="ph:star-fill" size="12" class="text-amber-400" />
					</div>
				</div>
				<div class="flex items-baseline gap-1.5">
					<p class="text-xl font-semibold text-slate-900 tabular-nums">
						{{ googleStats?.rating != null ? googleStats.rating.toFixed(1) : '—' }}
					</p>
					<Icon v-if="googleStats?.rating != null" name="ph:star-fill" class="text-yellow-400 mb-0.5" size="11" />
				</div>
				<p class="text-[10px] text-slate-400 mt-1">sur 5.0</p>
			</div>
			<div class="bg-white px-3 py-3 rounded-lg border border-slate-200">
				<div class="flex items-center justify-between mb-1">
					<p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Scans QR</p>
					<div class="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
						<Icon name="ph:qr-code-bold" size="12" class="text-[#007AFF]" />
					</div>
				</div>
				<p class="text-xl font-semibold text-slate-900 tabular-nums">
					{{ statsLoading ? '—' : (analyticsEvents.page_visit || 0) }}
				</p>
				<p class="text-[10px] text-slate-400 mt-1">{{ periodLabel }}</p>
			</div>
			<div class="bg-white px-3 py-3 rounded-lg border border-slate-200">
				<div class="flex items-center justify-between mb-1">
					<p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Emails captés</p>
					<div class="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
						<Icon name="ph:envelope-bold" size="12" class="text-emerald-500" />
					</div>
				</div>
				<p class="text-xl font-semibold text-slate-900 tabular-nums">
					{{ statsLoading ? '—' : (dashboardStats?.totalPlayers || 0) }}
				</p>
				<NuxtLink to="/dashboard/players" class="text-[10px] text-[#007AFF] font-medium mt-1 inline-block">Voir tout →</NuxtLink>
			</div>
			<div class="bg-white px-3 py-3 rounded-lg border border-slate-200">
				<div class="flex items-center justify-between mb-1">
					<p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Fidélisation</p>
					<div class="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
						<Icon name="ph:chart-line-up-bold" size="12" class="text-purple-500" />
					</div>
				</div>
				<p class="text-xl font-semibold text-slate-900 tabular-nums">
					{{ playersLoading ? '—' : `${playerStats.loyaltyRate}%` }}
				</p>
				<p class="text-[10px] text-slate-400 mt-1">joueurs fidèles</p>
			</div>
		</div>

		<!-- 4. CHART + ACTIVITÉ RÉCENTE -->
		<div v-if="hasActiveSubscription" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- Chart -->
			<div class="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 relative overflow-hidden">
				<div class="flex items-center justify-between mb-6">
					<div>
						<h3 class="font-bold text-slate-900 text-sm">{{ $t('dashboard.activity.title') }}</h3>
						<p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ periodLabel }}</p>
					</div>
					<div class="flex gap-0.5 p-0.5 bg-slate-100 rounded-md">
						<button @click="selectedPeriod = '7d'"
							:class="selectedPeriod === '7d' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'"
							class="px-2.5 py-1 rounded text-xs font-medium transition-all">7j</button>
						<button @click="selectedPeriod = '30d'"
							:class="selectedPeriod === '30d' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'"
							class="px-2.5 py-1 rounded text-xs font-medium transition-all">30j</button>
						<button @click="selectedPeriod = '90d'"
							:class="selectedPeriod === '90d' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'"
							class="px-2.5 py-1 rounded text-xs font-medium transition-all">3 mois</button>
					</div>
				</div>
				<div v-if="statsLoading" class="h-64 w-full flex items-center justify-center">
					<Icon name="ph:spinner-gap-bold" size="32" class="animate-spin text-slate-300" />
				</div>
				<div v-else-if="!dashboardStats?.chartData?.length" class="h-64 w-full flex flex-col items-center justify-center text-slate-400">
					<Icon name="ph:chart-bar-duotone" size="48" class="mb-2 opacity-50" />
					<p class="text-sm font-medium">{{ $t('dashboard.activity.no_data') }}</p>
					<p class="text-xs">{{ $t('dashboard.activity.no_data_hint') }}</p>
				</div>
				<template v-else-if="lineChartData">
					<div class="h-64 w-full px-2 relative" @mouseleave="hoveredIdx = null">
						<svg :viewBox="`0 0 ${lineChartData.w} ${lineChartData.h}`" class="w-full h-full">
							<line v-for="i in 4" :key="'grid'+i"
								:x1="20" :x2="780"
								:y1="lineChartData.padY + (i - 1) * (lineChartData.usableH / 3)"
								:y2="lineChartData.padY + (i - 1) * (lineChartData.usableH / 3)"
								stroke="currentColor" stroke-width="0.5" class="text-slate-100" />
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
							<g v-for="(p, i) in lineChartData.points" :key="'pt'+i" @mouseenter="hoveredIdx = i" style="cursor:pointer">
								<rect
									:x="i === 0 ? 0 : (lineChartData.points[i-1].x + p.x) / 2"
									y="0"
									:width="i === 0
										? (lineChartData.points.length > 1 ? (lineChartData.points[1].x + p.x) / 2 : lineChartData.w)
										: (i === lineChartData.points.length - 1 ? lineChartData.w - (lineChartData.points[i-1].x + p.x) / 2 : ((lineChartData.points[i+1]?.x ?? p.x) + p.x) / 2 - (lineChartData.points[i-1].x + p.x) / 2)"
									:height="lineChartData.h" fill="transparent" />
								<circle :cx="p.x" :cy="p.sessionY" :r="hoveredIdx === i ? 5 : 3.5" fill="#007AFF" stroke="white" stroke-width="1.5" />
								<circle :cx="p.x" :cy="p.winY" :r="hoveredIdx === i ? 5 : 3.5" fill="#8E8E93" stroke="white" stroke-width="1.5" />
								<line v-if="hoveredIdx === i"
									:x1="p.x" :x2="p.x" :y1="lineChartData.padY" :y2="lineChartData.padY + lineChartData.usableH"
									stroke="#007AFF" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
							</g>
						</svg>
						<div v-if="hoveredIdx !== null && lineChartData.points[hoveredIdx]"
							class="absolute top-0 pointer-events-none z-10"
							:style="{
								left: `${(lineChartData.points[hoveredIdx].x / lineChartData.w) * 100}%`,
								transform: (lineChartData.points[hoveredIdx].x / lineChartData.w) > 0.75 ? 'translateX(-100%)' : (lineChartData.points[hoveredIdx].x / lineChartData.w) < 0.25 ? 'translateX(0%)' : 'translateX(-50%)'
							}">
							<div class="bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-white/10 whitespace-nowrap">
								<p class="font-semibold text-slate-300 mb-1">{{ dashboardStats.chartData[hoveredIdx]?.label }}</p>
								<div class="flex items-center gap-1.5 mb-0.5">
									<span class="w-2 h-2 rounded-full bg-[#007AFF] shrink-0"></span>
									<span>{{ lineChartData.points[hoveredIdx].sessions }} participation(s)</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
									<span>{{ lineChartData.points[hoveredIdx].wins }} gain(s)</span>
								</div>
							</div>
						</div>
					</div>
					<div class="flex justify-between mt-4 px-2 text-xs font-bold text-slate-400 uppercase">
						<span v-for="(day, index) in dashboardStats.chartData" :key="index" class="text-center flex-1">{{ day.label }}</span>
					</div>
				</template>
			</div>

			<!-- Activité récente -->
			<div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div class="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
					<h3 class="font-medium text-slate-900 text-sm">Activité récente</h3>
					<NuxtLink to="/dashboard/players" class="text-xs text-[#007AFF] font-medium hover:opacity-70">Voir tout →</NuxtLink>
				</div>
				<div v-if="sessionsLoading" class="p-8 flex justify-center">
					<Icon name="ph:spinner-gap-bold" size="24" class="animate-spin text-slate-300" />
				</div>
				<div v-else-if="recentActivity.length === 0" class="p-8 text-center text-slate-400 text-sm">
					Aucune activité récente
				</div>
				<div v-else class="divide-y divide-slate-100">
					<div v-for="item in recentActivity" :key="item.id"
						class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
						<div class="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
							:class="{
								'bg-purple-400': item.type === 'won',
								'bg-emerald-400': item.type === 'contact',
								'bg-slate-400': item.type === 'played',
							}">
							{{ item.initials }}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm text-slate-700 font-medium truncate">{{ item.name }}</p>
							<p class="text-[11px] text-slate-400 truncate">{{ item.detail }}</p>
						</div>
						<span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded"
							:class="{
								'bg-purple-50 text-purple-600': item.type === 'won',
								'bg-emerald-50 text-emerald-600': item.type === 'contact',
								'bg-slate-100 text-slate-500': item.type === 'played',
							}">
							{{ item.type === 'won' ? 'Récompense' : item.type === 'contact' ? 'Nouveau contact' : 'Joué' }}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- ========================================== -->
		<!-- DASHBOARD PREVIEW (No Subscription)     -->
		<!-- ========================================== -->
		<div v-if="!subscriptionLoading && !hasActiveSubscription">

			<!-- ── Fake dashboard skeleton (grayed, behind overlay) ── -->
			<div class="pointer-events-none select-none space-y-8 opacity-40">

				<!-- Fake stats row -->
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
					<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-lg border border-slate-200 dark:border-slate-700/40">
						<p class="text-[11px] text-slate-400 font-medium mb-2">{{ $t('dashboard.stats.players') }}</p>
						<div class="h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
						<div class="h-2.5 w-14 bg-slate-100 dark:bg-slate-800 rounded"></div>
					</div>
					<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-lg border border-slate-200 dark:border-slate-700/40">
						<p class="text-[11px] text-slate-400 font-medium mb-2">{{ $t('dashboard.stats.participations') }}</p>
						<div class="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
						<div class="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
					</div>
					<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-lg border border-slate-200 dark:border-slate-700/40">
						<p class="text-[11px] text-slate-400 font-medium mb-2">{{ $t('dashboard.stats.prizes_won') }}</p>
						<div class="h-7 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
						<div class="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
					</div>
					<div class="bg-white dark:bg-[#1C1C1E] p-4 rounded-lg border border-slate-200 dark:border-slate-700/40">
						<p class="text-[11px] text-slate-400 font-medium mb-2">{{ $t('dashboard.stats.pending_prizes') }}</p>
						<div class="h-7 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
						<div class="h-2.5 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
					</div>
				</div>

				<!-- Fake chart + right column -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
					<div class="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-lg border border-slate-200 dark:border-slate-700/40 p-5">
						<div class="flex items-center justify-between mb-6">
							<div class="space-y-1.5">
								<div class="h-3.5 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div>
								<div class="h-2.5 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
							</div>
						</div>
						<div class="h-48 flex items-end gap-2.5 px-1">
							<div class="flex-1 h-[45%] bg-slate-200 dark:bg-slate-700 rounded-t-md"></div>
							<div class="flex-1 h-[70%] bg-slate-200 dark:bg-slate-700 rounded-t-md"></div>
							<div class="flex-1 h-[38%] bg-slate-200 dark:bg-slate-700 rounded-t-md"></div>
							<div class="flex-1 h-[85%] bg-slate-200 dark:bg-slate-700 rounded-t-md"></div>
							<div class="flex-1 h-[55%] bg-slate-200 dark:bg-slate-700 rounded-t-md"></div>
							<div class="flex-1 h-[65%] bg-slate-200 dark:bg-slate-700 rounded-t-md"></div>
							<div class="flex-1 h-[30%] bg-slate-200 dark:bg-slate-700 rounded-t-md"></div>
						</div>
					</div>
					<div class="space-y-4">
						<div class="bg-white dark:bg-[#1C1C1E] rounded-lg border border-slate-200 dark:border-slate-700/40 p-5 h-48">
							<div class="flex items-center gap-3 mb-4">
								<div class="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
								<div class="space-y-1.5">
									<div class="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
									<div class="h-2.5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
								</div>
							</div>
							<div class="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
						</div>
					</div>
				</div>

				<!-- Fake table -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-lg border border-slate-200 dark:border-slate-700/40 overflow-hidden">
					<div class="px-5 py-4 border-b border-[#E5E5EA] dark:border-slate-700/40 flex items-center justify-between">
						<div class="h-3.5 w-36 bg-slate-200 dark:bg-slate-700 rounded"></div>
					</div>
					<div v-for="i in 4" :key="i" class="px-5 py-4 border-b border-[#E5E5EA]/60 dark:border-slate-700/20 flex items-center gap-6">
						<div class="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
						<div class="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
						<div class="flex items-center gap-2">
							<div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700"></div>
							<div class="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
						</div>
						<div class="h-2.5 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div>
					</div>
				</div>

			</div>

			<!-- ── Overlay fixe centré sur la zone de contenu (après sidebar + header) ── -->
			<Teleport to="body">
				<div class="fixed top-14 left-0 lg:left-60 right-0 bottom-0 z-10 flex items-center justify-center p-4 pointer-events-none">
					<div class="relative z-10 w-full max-w-md pointer-events-auto">
						<div class="bg-white dark:bg-[#1C1C1E] rounded-lg border border-slate-200 dark:border-slate-700/40 shadow-lg overflow-hidden">
							<div class="h-0.5 w-full bg-[#007AFF]" />
							<div class="p-7 text-center">
								<div class="flex justify-center mb-5">
									<div class="w-12 h-12 rounded-lg bg-[#007AFF]/10 dark:bg-[#007AFF]/15 flex items-center justify-center">
										<Icon name="ph:crown-simple-fill" size="24" class="text-[#007AFF]" />
									</div>
								</div>
								<p class="text-xs font-semibold text-[#007AFF] uppercase tracking-widest mb-1.5">{{ $t('subscription.gate.label') }}</p>
								<h2 class="text-lg font-semibold text-slate-900 dark:text-white tracking-tight mb-2">{{ $t('subscription.gate.title') }}</h2>
								<p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">{{ $t('subscription.gate.description') }}</p>
								<div class="grid grid-cols-3 gap-2 mb-5">
									<div class="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-[#2C2C2E] rounded-md">
										<Icon name="ph:chart-line-up-bold" size="15" class="text-[#007AFF]" />
										<span class="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">{{ $t('subscription.gate.feature_games') }}</span>
									</div>
									<div class="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-[#2C2C2E] rounded-md">
										<Icon name="ph:users-three-bold" size="15" class="text-indigo-500" />
										<span class="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">{{ $t('subscription.gate.feature_players') }}</span>
									</div>
									<div class="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-[#2C2C2E] rounded-md">
										<Icon name="ph:envelope-bold" size="15" class="text-emerald-500" />
										<span class="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">{{ $t('subscription.gate.feature_marketing') }}</span>
									</div>
								</div>
								<NuxtLink to="/dashboard/subscription"
									class="flex items-center justify-center gap-2 w-full py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-md transition-colors text-sm">
									<Icon name="ph:rocket-launch-bold" size="15" />
									{{ $t('subscription.gate.cta') }}
								</NuxtLink>
								<p class="text-xs text-slate-400 dark:text-slate-500 mt-3">{{ $t('subscription.gate.hint') }}</p>
							</div>
						</div>
					</div>
				</div>
			</Teleport>

		</div>

	</div>
</template>
