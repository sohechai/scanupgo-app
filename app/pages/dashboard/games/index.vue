<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard',
	pageTransition: false
})
useHead({ title: 'Mes jeux' })

const { t } = useI18n()
const { $api } = useNuxtApp()
const router = useRouter()
const { show: showToast } = useToast()
const { hasActiveSubscription, fetchSubscription } = useSubscription()

const games = ref<any[]>([])
const loading = ref(true)
const togglingId = ref<string | null>(null)

// Filtre par établissement (SUPER_ADMIN uniquement : il voit tous les jeux)
const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.user?.role === 'SUPER_ADMIN')
const selectedBusinessId = ref<string>('all')
const businessOptions = computed(() => {
	const map = new Map<string, string>()
	for (const g of games.value) {
		if (g.business?.id) map.set(g.business.id, g.business.name || g.business.id)
	}
	return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
})
const filteredGames = computed(() =>
	selectedBusinessId.value === 'all'
		? games.value
		: games.value.filter(g => g.business?.id === selectedBusinessId.value)
)

const toggleActive = async (game: any) => {
	if (!hasActiveSubscription.value) return
	if (togglingId.value === game.id) return
	togglingId.value = game.id
	// Optimistic update — toggle immediately, no spinner
	const idx = games.value.findIndex(g => g.id === game.id)
	const newState = !game.active
	if (idx !== -1) games.value[idx] = { ...games.value[idx], active: newState }
	try {
		await $api<any>(`/games/${game.id}`, {
			method: 'PATCH',
			body: { active: newState },
		})
		showToast(newState ? t('games.status_active') : t('games.status_draft'), 'success')
	} catch (e: any) {
		// Rollback on error
		if (idx !== -1) games.value[idx] = { ...games.value[idx], active: !newState }
		showToast(e?.data?.message || t('games.update_error'), 'error')
	} finally {
		togglingId.value = null
	}
}

const showOrderModal = ref(false)
const selectedGameForOrder = ref<any>(null)
const openOrderModal = (game: any) => { selectedGameForOrder.value = game; showOrderModal.value = true }

const showDeleteModal = ref(false)
const gameToDelete = ref<any>(null)
const deleting = ref(false)
const openDeleteModal = (game: any) => { gameToDelete.value = game; showDeleteModal.value = true }

const showQRModal = ref(false)
const selectedQRGame = ref<any>(null)
const qrCodeDataUrl = ref<string | null>(null)
const generatingQR = ref(false)
const config = useRuntimeConfig()

// Personnalisation couleurs + logo de marque du QR directement dans le modal
const showQRCustomize = ref(false)
const qrColor = ref('#000000')
const qrBgColor = ref('#ffffff')
const qrShowLogo = ref(false)
const savingQR = ref(false)
// Logo = celui de la marque (établissement), affiché au centre si activé
const brandLogoUrl = computed<string | null>(() => selectedQRGame.value?.business?.logo || null)
const qrLogoUrl = computed<string | null>(() => (qrShowLogo.value ? brandLogoUrl.value : null))

const getGamePlayUrl = (game: any) => {
	const base = (config.public.siteUrl as string | undefined) || window.location.origin
	return `${base}/play/${game.slug}`
}

const generateQR = async () => {
	if (!selectedQRGame.value) return
	generatingQR.value = true
	try {
		const QRCode = (await import('qrcode')).default
		const canvas = document.createElement('canvas')
		await QRCode.toCanvas(canvas, getGamePlayUrl(selectedQRGame.value), {
			width: 400,
			margin: 2,
			errorCorrectionLevel: 'H',
			color: { dark: qrColor.value || '#000000', light: qrBgColor.value || '#ffffff' },
		})
		// Overlay du logo au centre (cercle), si défini
		if (qrLogoUrl.value) {
			const ctx = canvas.getContext('2d')
			if (ctx) {
				await new Promise<void>((resolve) => {
					const logo = new Image()
					logo.crossOrigin = 'anonymous'
					logo.onload = () => {
						const logoSize = canvas.width * 0.30
						const cx = canvas.width / 2
						const cy = canvas.height / 2
						ctx.beginPath()
						ctx.arc(cx, cy, logoSize / 2 + 8, 0, Math.PI * 2)
						ctx.fillStyle = qrBgColor.value || '#ffffff'
						ctx.fill()
						ctx.save()
						ctx.beginPath()
						ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2)
						ctx.clip()
						ctx.drawImage(logo, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
						ctx.restore()
						resolve()
					}
					logo.onerror = () => resolve()
					logo.src = qrLogoUrl.value as string
				})
			}
		}
		qrCodeDataUrl.value = canvas.toDataURL('image/png')
	} catch (e) {
		console.error('QR generation failed', e)
	} finally {
		generatingQR.value = false
	}
}

const openQRModal = async (game: any) => {
	selectedQRGame.value = game
	qrCodeDataUrl.value = null
	showQRCustomize.value = false
	qrColor.value = game.qrCodeColor || '#000000'
	qrBgColor.value = game.qrCodeBgColor || '#ffffff'
	// Logo activé si le jeu en a un enregistré (= logo de la marque)
	qrShowLogo.value = !!game.qrCodeLogoUrl
	showQRModal.value = true
	await generateQR()
}

// Régénère l'aperçu en direct quand on change couleurs/logo
watch([qrColor, qrBgColor, qrShowLogo], () => { if (showQRModal.value) generateQR() })

const saveQRColors = async () => {
	if (!selectedQRGame.value) return
	savingQR.value = true
	try {
		// On stocke l'URL du logo de marque si activé, sinon null
		const logoToSave = qrShowLogo.value ? brandLogoUrl.value : null
		await $api(`/games/${selectedQRGame.value.id}`, {
			method: 'PATCH',
			body: { qrCodeColor: qrColor.value, qrCodeBgColor: qrBgColor.value, qrCodeLogoUrl: logoToSave },
		})
		const idx = games.value.findIndex(g => g.id === selectedQRGame.value.id)
		if (idx !== -1) games.value[idx] = { ...games.value[idx], qrCodeColor: qrColor.value, qrCodeBgColor: qrBgColor.value, qrCodeLogoUrl: logoToSave }
		showToast(t('games.qr_saved'), 'success')
	} catch (e: any) {
		showToast(e?.data?.message || t('games.update_error'), 'error')
	} finally {
		savingQR.value = false
	}
}

const downloadQRPNG = () => {
	if (!qrCodeDataUrl.value || !selectedQRGame.value) return
	const link = document.createElement('a')
	link.download = `qrcode-${selectedQRGame.value.slug || 'jeu'}.png`
	link.href = qrCodeDataUrl.value
	link.click()
}

// Convertit une image (URL) en data URI base64, pour l'embarquer dans le SVG.
const imageToDataUri = async (src: string): Promise<string | null> => {
	try {
		const res = await fetch(src, { mode: 'cors' })
		const blob = await res.blob()
		return await new Promise((resolve) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = () => resolve(null)
			reader.readAsDataURL(blob)
		})
	} catch {
		return null
	}
}

const downloadQRSVG = async () => {
	if (!selectedQRGame.value?.slug) return
	const QRCode = (await import('qrcode')).default
	let svgString = await QRCode.toString(getGamePlayUrl(selectedQRGame.value), {
		type: 'svg',
		margin: 2,
		errorCorrectionLevel: 'H',
		color: { dark: qrColor.value || '#000000', light: qrBgColor.value || '#ffffff' },
	})

	// Logo au centre : cercle de fond + image base64 (clip circulaire) injectés dans le SVG.
	if (qrLogoUrl.value) {
		const dataUri = await imageToDataUri(qrLogoUrl.value)
		if (dataUri) {
			const vbMatch = svgString.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/)
			const size = vbMatch ? parseFloat(vbMatch[1]) : 100
			const c = size / 2
			const logoR = size * 0.15        // rayon logo = 15% (diamètre 30%)
			const bgR = logoR + size * 0.02   // anneau de fond
			const overlay = `<defs><clipPath id="qrLogoClip"><circle cx="${c}" cy="${c}" r="${logoR}"/></clipPath></defs>` +
				`<circle cx="${c}" cy="${c}" r="${bgR}" fill="${qrBgColor.value || '#ffffff'}"/>` +
				`<image x="${c - logoR}" y="${c - logoR}" width="${logoR * 2}" height="${logoR * 2}" ` +
				`href="${dataUri}" clip-path="url(#qrLogoClip)" preserveAspectRatio="xMidYMid slice"/>`
			svgString = svgString.replace('</svg>', `${overlay}</svg>`)
		}
	}

	const blob = new Blob([svgString], { type: 'image/svg+xml' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.download = `qrcode-${selectedQRGame.value.slug}.svg`
	link.href = url
	link.click()
	URL.revokeObjectURL(url)
}

const deleteGame = async () => {
	if (!gameToDelete.value) return
	try {
		deleting.value = true
		await $api(`/games/${gameToDelete.value.id}`, { method: 'DELETE' })
		games.value = games.value.filter(g => g.id !== gameToDelete.value.id)
		showDeleteModal.value = false
		showToast(t('games.game_deleted'), 'success')
	} catch (e: any) {
		showToast(e?.data?.message || t('games.delete_error'), 'error')
	} finally {
		deleting.value = false
	}
}

const fetchGames = async () => {
	try {
		loading.value = true
		games.value = await $api<any[]>('/games') || []
	} catch (e) { console.error(e) }
	finally { loading.value = false }
}

onMounted(async () => {
	fetchSubscription()
	await fetchGames()
})
</script>

<template>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('games.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('games.subtitle') }}</p>
			</div>
			<div class="flex items-center gap-2">
				<!-- Filtre établissement (SUPER_ADMIN) -->
				<select v-if="isSuperAdmin && businessOptions.length >= 1" v-model="selectedBusinessId"
					class="flex-1 sm:flex-none px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30">
					<option value="all">{{ $t('games.all_businesses') }}</option>
					<option v-for="b in businessOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
				</select>
				<NuxtLink to="/dashboard/games/new"
					class="flex items-center justify-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-medium rounded-md transition-all text-sm whitespace-nowrap">
					<Icon name="ph:plus-bold" size="15" />
					{{ $t('games.create_button') }}
				</NuxtLink>
			</div>
		</div>

		<!-- Bannière activation abonnement -->
		<div v-if="!loading && !hasActiveSubscription"
			class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
			<p class="flex-1 text-sm text-amber-800 dark:text-amber-200 leading-snug">
				🎯 {{ $t('games.activation_banner') }}
			</p>
			<NuxtLink to="/dashboard/subscription"
				class="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-medium rounded-md transition-all text-sm">
				{{ $t('games.activation_cta') }}
				<Icon name="ph:arrow-right-bold" size="14" class="rtl:rotate-180" />
			</NuxtLink>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex justify-center py-20">
			<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-300" size="28" />
		</div>

		<!-- Empty State -->
		<div v-else-if="filteredGames.length === 0"
			class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-14 text-center">
			<div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
				<Icon name="ph:game-controller-duotone" size="24" class="text-slate-400 dark:text-slate-500" />
			</div>
			<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">{{ $t('games.no_games') }}</h3>
			<p class="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mb-5 text-sm">{{ $t('games.no_games_description') }}</p>
			<NuxtLink to="/dashboard/games/new"
				class="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md transition-all text-sm">
				<Icon name="ph:plus-bold" size="14" />
				{{ $t('games.create_first') }}
			</NuxtLink>
		</div>

		<!-- Games Grid -->
		<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			<div v-for="game in filteredGames" :key="game.id"
				class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">

				<!-- Card top — game identity -->
				<div class="p-4 flex items-start gap-3 border-b border-slate-100 dark:border-slate-800">
					<div class="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:game-controller-bold" class="text-slate-400 dark:text-slate-500" size="18" />
					</div>
					<div class="flex-1 min-w-0 pt-0.5">
						<h3 class="font-semibold text-slate-900 dark:text-white text-sm truncate">{{ game.title }}</h3>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">/{{ game.slug }}</p>
						<p v-if="isSuperAdmin && game.business?.name" class="text-[10px] text-[#007AFF] dark:text-blue-400 mt-0.5 truncate flex items-center gap-1">
							<Icon name="ph:storefront-bold" size="10" />{{ game.business.name }}
						</p>
					</div>
					<!-- Toggle actif/inactif -->
					<button
						@click.prevent.stop="toggleActive(game)"
						:disabled="!hasActiveSubscription"
						:title="!hasActiveSubscription
							? $t('games.toggle_locked_tooltip')
							: (game.active ? $t('games.deactivate') : $t('games.activate'))"
						class="shrink-0 flex items-center gap-1.5 mt-0.5"
						:class="!hasActiveSubscription ? 'cursor-not-allowed opacity-50' : ''"
					>
						<span class="text-[11px] font-medium w-16 text-right"
							:class="game.active && hasActiveSubscription ? 'text-emerald-600 dark:text-emerald-400' : (game.active && !hasActiveSubscription ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500')">
							{{ !hasActiveSubscription && game.active
								? $t('games.status_suspended')
								: (game.active ? $t('games.status_active') : $t('games.status_draft')) }}
						</span>
						<div class="relative w-7 h-3.5 rounded-full transition-colors shrink-0"
							:class="game.active && hasActiveSubscription ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'">
							<div class="absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-all"
								:class="game.active ? 'left-[14px]' : 'left-0.5'"></div>
						</div>
					</button>
				</div>

				<!-- Flyer status -->
				<div class="px-4 py-3 flex items-center justify-between">
					<div v-if="game.flyerDesignUrl" class="flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
						<span class="text-xs text-slate-500 dark:text-slate-400">{{ $t('games.flyer_ready') }}</span>
					</div>
					<div v-else class="flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
						<span class="text-xs text-slate-400 dark:text-slate-500">{{ $t('games.flyer_not_configured') }}</span>
					</div>
					<button v-if="game.flyerDesignUrl" @click.stop="openOrderModal(game)"
						class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-md transition-colors">
						<Icon name="ph:shopping-cart-bold" size="11" />
						{{ $t('games.order_flyers') }}
					</button>
				</div>

				<!-- Actions -->
				<div class="px-4 pb-4 mt-auto flex gap-2 items-stretch">
					<NuxtLink :to="`/dashboard/games/${game.id}`"
						class="flex-1 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md text-xs transition-colors flex items-center justify-center gap-1.5">
						<Icon name="ph:gear-six-bold" size="13" />
						{{ $t('games.config_button') }}
					</NuxtLink>
					<button @click.stop="openQRModal(game)"
						class="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md transition-colors shrink-0"
						title="QR Code">
						<Icon name="ph:qr-code-bold" size="14" />
					</button>
					<a :href="`/play/${game.slug}`" target="_blank"
						class="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md transition-colors shrink-0"
						:title="$t('games.preview_button')">
						<Icon name="ph:arrow-square-out-bold" size="14" />
					</a>
					<button @click.stop="openDeleteModal(game)"
						class="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-md transition-colors shrink-0"
						:title="$t('games.delete_button')">
						<Icon name="ph:trash-bold" size="14" />
					</button>
				</div>
			</div>

			<!-- Add New Card -->
			<NuxtLink to="/dashboard/games/new"
				class="bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#007AFF] dark:hover:border-[#007AFF] hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-[#007AFF] min-h-[180px] cursor-pointer group">
				<div class="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-[#007AFF]/10 flex items-center justify-center mb-2.5 transition-colors">
					<Icon name="ph:plus-bold" size="18" />
				</div>
				<span class="font-medium text-sm">{{ $t('games.new_game') }}</span>
			</NuxtLink>
		</div>

		<!-- Modals -->
		<OrdersCreateOrderModal
			v-model="showOrderModal"
			:flyer-design-url="selectedGameForOrder?.flyerDesignUrl || undefined"
			:game-id="selectedGameForOrder?.id"
			@created="showToast(t('games.order_created'), 'success')"
		/>
		<ConfirmModal
			v-model="showDeleteModal"
			:title="$t('games.delete_confirmation_title')"
			:description="$t('games.delete_confirmation_message', { title: gameToDelete?.title })"
			:confirm-text="$t('games.delete_confirmation_button')"
			type="danger"
			:loading="deleting"
			@confirm="deleteGame"
		/>

		<!-- QR Code Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showQRModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4"
					@click.self="showQRModal = false">
					<div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
					<div class="relative bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
						<!-- Header -->
						<div class="flex items-start justify-between">
							<div>
								<h3 class="text-base font-bold text-slate-900 dark:text-white">QR Code</h3>
								<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[220px]">{{ selectedQRGame?.title }}</p>
							</div>
							<button @click="showQRModal = false"
								class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
								<Icon name="ph:x-bold" size="16" />
							</button>
						</div>

						<!-- QR Preview -->
						<div class="flex justify-center">
							<div class="w-44 h-44 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
								<Icon v-if="generatingQR" name="ph:spinner-gap-bold" size="28" class="animate-spin text-slate-300" />
								<img v-else-if="qrCodeDataUrl" :src="qrCodeDataUrl" class="w-full h-full object-contain p-2" />
								<Icon v-else name="ph:qr-code-bold" size="48" class="text-slate-200" />
							</div>
						</div>

						<!-- Game URL -->
						<p v-if="selectedQRGame?.slug" class="text-[11px] text-center text-slate-400 font-mono truncate">
							{{ getGamePlayUrl(selectedQRGame) }}
						</p>

						<!-- Panneau personnalisation couleurs (inline) -->
						<div v-if="showQRCustomize" class="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
							<div class="flex items-center justify-between">
								<label class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ $t('games.qr_color') }}</label>
								<input type="color" v-model="qrColor" class="w-8 h-8 rounded cursor-pointer border border-slate-300 dark:border-slate-600 bg-transparent" />
							</div>
							<div class="flex items-center justify-between">
								<label class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ $t('games.qr_bg_color') }}</label>
								<input type="color" v-model="qrBgColor" class="w-8 h-8 rounded cursor-pointer border border-slate-300 dark:border-slate-600 bg-transparent" />
							</div>
							<!-- Logo de la marque au centre du QR (toggle) -->
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<img v-if="brandLogoUrl" :src="brandLogoUrl" class="w-7 h-7 rounded object-cover border border-slate-300 dark:border-slate-600" />
									<label class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ $t('games.qr_logo_brand') }}</label>
								</div>
								<label v-if="brandLogoUrl" class="relative inline-flex items-center cursor-pointer">
									<input v-model="qrShowLogo" type="checkbox" class="sr-only peer">
									<div class="w-9 h-5 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:bg-[#007AFF] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
								</label>
								<span v-else class="text-[11px] text-slate-400">{{ $t('games.qr_logo_none') }}</span>
							</div>
							<button @click="saveQRColors" :disabled="savingQR"
								class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
								<Icon v-if="savingQR" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
								<Icon v-else name="ph:check-bold" size="14" />
								{{ savingQR ? $t('games.qr_saving') : $t('games.qr_save') }}
							</button>
						</div>

						<!-- Download buttons -->
						<div class="flex gap-2">
							<button @click="downloadQRPNG" :disabled="!qrCodeDataUrl"
								class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40">
								<Icon name="ph:file-png-bold" size="15" class="text-blue-500" />
								PNG
							</button>
							<button @click="downloadQRSVG" :disabled="!selectedQRGame?.slug"
								class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40">
								<Icon name="ph:file-svg-bold" size="15" class="text-orange-500" />
								SVG
							</button>
							<button @click="showQRCustomize = !showQRCustomize"
								class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl transition-colors"
								:class="showQRCustomize ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'">
								<Icon name="ph:palette-bold" size="15" />
								{{ $t('games.qr_customize') }}
							</button>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>
