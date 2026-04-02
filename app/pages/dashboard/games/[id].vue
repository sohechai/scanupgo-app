<script setup lang="ts">
import GamePrizes from './components/GamePrizes.vue'
import FlyerEditor from '~/components/flyers/FlyerEditor.vue'

definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { user } = useAuth()
const config = useRuntimeConfig()
const { show: showToast } = useToast()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

const getAssetUrl = (url: string | null | undefined) => {
	if (!url) return undefined
	// Return the full URL from S3/R2
	return url
}

const isNew = route.params.id === 'new'
const loading = ref(true)
const saving = ref(false)
const initialTab = (route.query.tab as string) || 'content'
const activeTab = ref(initialTab) // content, appearance, prizes, flyers

// Wizard steps for new game creation
const wizardSteps = computed(() => [
	{ key: 'content', label: t('games.detail.tab_content'), icon: 'ph:pencil-simple-bold' },
	{ key: 'appearance', label: t('games.detail.tab_appearance'), icon: 'ph:paint-brush-broad-bold' },
	{ key: 'prizes', label: t('games.detail.tab_prizes'), icon: 'ph:gift-bold' }
])
const currentWizardStep = ref(0)

const canGoNext = computed(() => {
	if (currentWizardStep.value === 0) {
		// Content step validation
		return game.value.title && game.value.slug && game.value.googleReviewUrl
	}
	return true
})

const goToNextStep = () => {
	if (currentWizardStep.value < wizardSteps.value.length - 1) {
		currentWizardStep.value++
		activeTab.value = wizardSteps.value[currentWizardStep.value].key
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}
}

const goToPreviousStep = () => {
	if (currentWizardStep.value > 0) {
		currentWizardStep.value--
		activeTab.value = wizardSteps.value[currentWizardStep.value].key
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}
}

const isLastStep = computed(() => currentWizardStep.value === wizardSteps.value.length - 1)

// Google Review Help Modal
const showGoogleHelpModal = ref(false)

const pageTitle = computed(() => isNew ? t('games.detail.title') : t('games.detail.edit_title'))

const game = ref({
	title: '',
	slug: '',
	tagline: 'PARTICIPEZ À NOTRE JEU ET TENTEZ DE GAGNER UN CADEAU',
	description: '',
	primaryColor: '#00e5ff',
	backgroundImage: null as string | null,
	gameLanguage: 'fr',
	active: true,
	winProbability: 50, // Global win probability (50-100%)
	participationFrequencyEnabled: false,
	participationFrequencyHours: 24,
	prizeRedemptionDelayEnabled: false,
	prizeRedemptionDelayHours: 0,
	businessId: '', // Set from fetchBusiness
	// QR Code customization
	qrCodeColor: '#000000',
	qrCodeBgColor: '#ffffff',
	qrCodeLogoUrl: null as string | null,
	// Google Review URL
	googleReviewUrl: '' as string | null,
	// Flyer design
	flyerDesignUrl: null as string | null,
})

const businessLogo = ref<string | null>(null)
const businessObject = ref<any>(null)

const fetchBusiness = async () => {
	if (!user.value?.id) return
	try {
		const business = await $api<any>('/businesses/me')

		if (business) {
			game.value.businessId = business.id
			businessLogo.value = business.logo
			businessObject.value = business

			// For new games, use the business primary color as default
			if (isNew && business.primaryColor) {
				game.value.primaryColor = business.primaryColor
			}
		}
	} catch (e) {
		console.error('Failed to fetch business', e)
	}
}

onMounted(async () => {
	try {
		await fetchSubscription()
		if (!hasActiveSubscription.value) return

		if (user.value) {
			await fetchBusiness()
		}

		if (!isNew) {
			try {
				const item = await $api<any>(`/games/${route.params.id}`)
				game.value = { ...game.value, ...item }
			} catch (e) {
				console.error(e)
			}
		}
	} finally {
		loading.value = false
	}
})

// Scroll to top when tab changes
watch(activeTab, () => {
	window.scrollTo({ top: 0, behavior: 'smooth' })
})


const saveGame = async () => {
	saving.value = true
	try {
		// Ensure businessId is present (for validation only, not sent to server)
		if (!game.value.businessId) {
			alert(t('games.detail.google_review_error'))
			return
		}

		// Validate slug format
		const slugRegex = /^[a-z0-9-]+$/
		if (!slugRegex.test(game.value.slug)) {
			alert(t('games.detail.slug_format'))
			return
		}

		// Validate Google Review URL is required
		if (!game.value.googleReviewUrl) {
			alert(t('games.detail.google_review_required'))
			return
		}

		// Sync tagline to description if needed
		game.value.description = game.value.tagline

		// Prepare payload (exclude fields managed by server)
		const { id, businessId, business, prizes, createdAt, updatedAt, _count, ...payload } = game.value as any

		let gameId = route.params.id as string

		if (isNew) {
			const created = await $api<any>('/games', {
				method: 'POST',
				body: payload
			})
			gameId = created.id
			router.replace(`/dashboard/games/${gameId}?tab=prizes`)
		} else {
			await $api(`/games/${gameId}`, {
				method: 'PATCH',
				body: payload
			})
		}
	} catch (e: any) {
		console.error('Save failed:', e)
		const errorMessage = e?.data?.message || e?.message || 'Une erreur est survenue'
		alert(`Erreur: ${errorMessage}`)
	} finally {
		saving.value = false
	}
}

// QR Code Generation for Flyer Editor
import QRCode from 'qrcode'

const qrCodeUrl = ref<string>('')

const getGameUrl = () => {
	if (!game.value.slug) return ''
	const baseUrl = config.public.siteUrl || window.location.origin
	return `${baseUrl}/play/${game.value.slug}`
}

const generateQRCode = async () => {
	if (!game.value.slug) return

	const url = getGameUrl()
	const qrColor = game.value.qrCodeColor || '#000000'
	const qrBgColor = game.value.qrCodeBgColor || '#ffffff'

	try {
		// Generate base QR code on canvas
		const canvas = document.createElement('canvas')
		await QRCode.toCanvas(canvas, url, {
			width: 600,
			margin: 2,
			errorCorrectionLevel: 'H', // High error correction for logo overlay
			color: {
				dark: qrColor,
				light: qrBgColor
			}
		})

		// If logo is set, overlay it in the center
		if (game.value.qrCodeLogoUrl) {
			const ctx = canvas.getContext('2d')
			if (ctx) {
				const logo = new Image()
				logo.crossOrigin = 'anonymous'

				await new Promise<void>((resolve) => {
					logo.onload = () => {
						const logoSize = canvas.width * 0.30
						const logoX = (canvas.width - logoSize) / 2
						const logoY = (canvas.height - logoSize) / 2

						// Draw background circle for logo
						ctx.beginPath()
						ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 8, 0, Math.PI * 2)
						ctx.fillStyle = qrBgColor
						ctx.fill()

						// Draw logo (circular clip)
						ctx.save()
						ctx.beginPath()
						ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2, 0, Math.PI * 2)
						ctx.clip()
						ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
						ctx.restore()

						resolve()
					}
					logo.onerror = () => resolve()
					logo.src = game.value.qrCodeLogoUrl!
				})
			}
		}

		qrCodeUrl.value = canvas.toDataURL('image/png')
	} catch (err) {
		console.error('QR generation error:', err)
	}
}



const copyLink = () => {
	const url = getGameUrl()
	if (url) {
		navigator.clipboard.writeText(url)
		showToast('Lien copié !', 'success')
	}
}

// Background Image Upload
const bgImageInputRef = ref<HTMLInputElement | null>(null)
const handleBgImageUpload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (input.files && input.files[0]) {
		const file = input.files[0]
		const formData = new FormData()
		formData.append('file', file)

		try {
			const response = await $api<{ url: string }>('/uploads', {
				method: 'POST',
				body: formData
			})
			if (response?.url) {
				game.value.backgroundImage = response.url
				showToast('Image de fond importée', 'success')
			}
		} catch (e) {
			console.error(e)
			showToast("Erreur lors de l'upload", 'error')
		}
	}
}

watch(() => game.value.slug, generateQRCode)
watch(() => game.value.primaryColor, generateQRCode)
watch(() => game.value.qrCodeColor, generateQRCode)
watch(() => game.value.qrCodeBgColor, generateQRCode)
watch(() => game.value.qrCodeLogoUrl, generateQRCode)

onMounted(() => {
	if (game.value.slug) {
		generateQRCode()
	}
})

// Flyer Design Save Handler
const savingFlyer = ref(false)
const showOrderModal = ref(false)
const showFlyerEditor = ref(false)

const handleFlyerSave = async (imageUrl: string) => {
	savingFlyer.value = true
	try {
		// Update game with flyer design URL
		await $api(`/games/${route.params.id}`, {
			method: 'PATCH',
			body: { flyerDesignUrl: imageUrl }
		})
		game.value.flyerDesignUrl = imageUrl
		showFlyerEditor.value = false // Switch to preview mode
		showToast(t('games.detail.flyer_saved'), 'success')
	} catch (error) {
		console.error('Failed to save flyer design:', error)
		showToast(t('games.detail.flyer_save_error'), 'error')
	} finally {
		savingFlyer.value = false
	}
}

const openOrderModal = () => {
	showOrderModal.value = true
}

// Preview flyer in new window
const previewFlyer = () => {
	if (!game.value.flyerDesignUrl) return

	const newWindow = window.open('', '_blank')
	if (!newWindow) {
		showToast('Le navigateur a bloqué l\'ouverture de la fenêtre. Autorisez les popups.', 'error')
		return
	}

	// Create a nice preview page
	newWindow.document.write(`
		<!DOCTYPE html>
		<html>
			<head>
				<title>${t('games.detail.preview_title')} - ${game.value.title || 'Flyer'}</title>
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body {
						min-height: 100vh;
						background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						padding: 2rem;
						font-family: system-ui, -apple-system, sans-serif;
					}
					.container {
						text-align: center;
					}
					h1 {
						color: white;
						font-size: 1.5rem;
						font-weight: 700;
						margin-bottom: 1.5rem;
						opacity: 0.9;
					}
					.flyer-wrapper {
						position: relative;
						display: inline-block;
					}
					.flyer-wrapper::before {
						content: '';
						position: absolute;
						inset: -4px;
						background: linear-gradient(135deg, #f97316, #8b5cf6);
						border-radius: 20px;
						z-index: -1;
						opacity: 0.5;
						filter: blur(20px);
					}
					img {
						max-width: 90vw;
						max-height: 80vh;
						border-radius: 16px;
						box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
					}
					.actions {
						margin-top: 1.5rem;
						display: flex;
						gap: 1rem;
						justify-content: center;
					}
					.btn {
						padding: 0.75rem 1.5rem;
						border-radius: 12px;
						font-weight: 600;
						font-size: 0.875rem;
						cursor: pointer;
						transition: all 0.2s;
						text-decoration: none;
						display: inline-flex;
						align-items: center;
						gap: 0.5rem;
					}
					.btn-primary {
						background: #f97316;
						color: white;
						border: none;
					}
					.btn-primary:hover { background: #ea580c; transform: translateY(-2px); }
					.btn-secondary {
						background: rgba(255,255,255,0.1);
						color: white;
						border: 1px solid rgba(255,255,255,0.2);
					}
					.btn-secondary:hover { background: rgba(255,255,255,0.2); }
				</style>
			</head>
			<body>
				<div class="container">
					<h1>${t('games.detail.preview_title')}</h1>
					<div class="flyer-wrapper">
						<img src="${game.value.flyerDesignUrl}" alt="Flyer" />
					</div>
					<div class="actions">
						<a href="${game.value.flyerDesignUrl}" download="flyer.png" class="btn btn-primary">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
							${t('games.detail.preview_download')}
						</a>
						<button onclick="window.close()" class="btn btn-secondary">${t('games.detail.preview_close')}</button>
					</div>
				</div>
			</body>
		</html>
	`)
	newWindow.document.close()
}

// Download flyer as print-ready PDF (A6 + 3mm bleed + crop marks)
const downloadingPdf = ref(false)
const downloadFlyerPDF = async () => {
	downloadingPdf.value = true
	try {
		const business = user.value?.business
		const result = await $api<{ url: string }>('/flyer-generator/generate-pdf', {
			method: 'POST',
			body: {
				businessName: business?.name,
				businessLogo: business?.logo,
				qrCodeUrl: qrCodeUrl.value || undefined,
				primaryColor: game.value.primaryColor || '#fb923c',
				accentColor: game.value.primaryColor || '#fb923c',
				buttonColor: game.value.primaryColor || '#fb923c',
				fontFamily: 'Luckiest Guy',
				prizes: (game.value.prizes || []).map((p: any) => ({
					name: p.name,
					rank: p.rank,
					probability: p.probability
				}))
			}
		})

		if (!result?.url) {
			showToast(t('games.detail.pdf_error'), 'error')
			return
		}

		const response = await fetch(result.url)
		const blob = await response.blob()
		const downloadUrl = URL.createObjectURL(blob)

		const link = document.createElement('a')
		link.download = `flyer-${game.value.slug || 'design'}.pdf`
		link.href = downloadUrl
		link.click()

		URL.revokeObjectURL(downloadUrl)
		showToast(t('games.detail.pdf_success'), 'success')
	} catch (e) {
		console.error('PDF download failed:', e)
		showToast(t('games.detail.pdf_download_error'), 'error')
	} finally {
		downloadingPdf.value = false
	}
}
</script>

<template>
	<!-- Subscription Required -->
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('games.access_required')"
		:description="$t('games.access_description')"
		icon="ph:game-controller-fill"
	/>

	<div v-else class="space-y-6 relative pb-20">
		<!-- Loading Skeleton -->
		<div v-if="loading" class="animate-pulse space-y-8 max-w-7xl mx-auto w-full">
			<!-- Header Skeleton -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<div class="h-8 w-48 bg-slate-200 rounded-lg"></div>
					<div class="h-6 w-24 bg-slate-200 rounded-full"></div>
				</div>
				<div class="flex items-center gap-3">
					<div class="h-10 w-32 bg-slate-200 rounded-lg"></div>
					<div class="h-10 w-32 bg-slate-200 rounded-lg"></div>
				</div>
			</div>

			<!-- Tabs Skeleton -->
			<div class="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
				<div class="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-t-lg"></div>
				<div class="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-t-lg"></div>
				<div class="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-t-lg"></div>
			</div>

			<!-- Content Grid Skeleton -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Left Column -->
				<div class="lg:col-span-2 space-y-6">
					<div
						class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
						<div class="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
						<div class="space-y-4">
							<div class="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
							<div class="h-24 w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
						</div>
					</div>
				</div>

				<!-- Right Column -->
				<div class="space-y-6">
					<div
						class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
						<div class="flex items-center gap-4">
							<div class="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
							<div class="flex-1 space-y-2">
								<div class="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
								<div class="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div v-else class="space-y-2">
			<!-- Header -->
			<div class="flex flex-col gap-4">
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<div class="flex items-center gap-3">
							<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{
								pageTitle }}
							</h1>
							<span :class="[
								'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm',
								game.active
									? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
									: 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600'
							]">
								{{ game.active ? $t('games.status_active') : $t('games.status_draft') }}
							</span>
						</div>
						<p class="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{{ $t('games.detail.subtitle') }}
						</p>
					</div>
				</div>

				<!-- Wizard Steps for New Game -->
				<div v-if="isNew" class="w-full">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-4">
							<template v-for="(step, index) in wizardSteps" :key="step.key">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
										:class="index <= currentWizardStep
											? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
											: 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'">
										<Icon v-if="index < currentWizardStep" name="ph:check-bold" size="18" />
										<span v-else>{{ index + 1 }}</span>
									</div>
									<div class="hidden md:block">
										<p class="text-sm font-bold"
											:class="index <= currentWizardStep ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'">
											{{ step.label }}
										</p>
									</div>
								</div>
								<div v-if="index < wizardSteps.length - 1" class="w-8 md:w-16 h-0.5 transition-all"
									:class="index < currentWizardStep ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'">
								</div>
							</template>
						</div>
					</div>
				</div>

				<!-- Tabs (Pills) for Existing Game -->
				<div v-else
					class="grid grid-cols-2 md:flex md:w-fit gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 w-full">
					<button @click="activeTab = 'content'"
						class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
						:class="activeTab === 'content' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'">
						<Icon name="ph:pencil-simple-bold" size="16" />
						<span>{{ $t('games.detail.tab_content') }}</span>
					</button>
					<button @click="activeTab = 'appearance'"
						class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
						:class="activeTab === 'appearance' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'">
						<Icon name="ph:paint-brush-broad-bold" size="16" />
						<span>{{ $t('games.detail.tab_appearance') }}</span>
					</button>
					<button @click="activeTab = 'prizes'"
						class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
						:class="activeTab === 'prizes' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'">
						<Icon name="ph:gift-bold" size="16" />
						<span>{{ $t('games.detail.tab_prizes') }}</span>
					</button>
					<button @click="activeTab = 'flyers'"
						class="px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
						:class="activeTab === 'flyers' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'">
						<Icon name="ph:qr-code-bold" size="16" />
						<span>{{ $t('games.detail.tab_flyers') }}</span>
					</button>
				</div>
			</div>

			<div class="flex flex-col xl:flex-row gap-8 items-start">
				<div class="flex-1 w-full min-w-0">
					<!-- Configuration Card -->
					<div
						class="bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 dark:border-slate-700">

						<!-- TAB: CONTENT -->
						<form v-show="activeTab === 'content'" @submit.prevent="saveGame" class="space-y-8">

							<!-- Active Toggle -->
							<div
								class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-600 flex items-center justify-between">
								<div>
									<h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('games.detail.game_state') }}</h3>
									<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ $t('games.detail.make_visible') }}
									</p>
								</div>
								<label class="relative inline-flex items-center cursor-pointer">
									<input v-model="game.active" type="checkbox" class="sr-only peer">
									<div
										class="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500">
									</div>
								</label>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div class="col-span-2">
									<label
										class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{{ $t('games.detail.game_title') }}</label>
									<input v-model="game.title" type="text" required
										class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white font-bold focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-sm"
										:placeholder="$t('games.detail.game_title_placeholder')">
								</div>

								<div>
									<label
										class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{{ $t('games.detail.slug') }}</label>
									<div class="relative group/input">
										<span
											class="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500 font-mono text-sm">/</span>
										<input v-model="game.slug" type="text" required
											class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg pl-7 pr-4 py-2.5 text-slate-900 dark:text-white font-medium focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 font-mono text-sm"
											:placeholder="$t('games.detail.slug_placeholder')">
									</div>
								</div>

								<div>
									<label
										class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{{ $t('games.detail.language') }}</label>
									<select v-model="game.gameLanguage"
										class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white font-bold focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 outline-none appearance-none text-sm cursor-pointer">
										<option value="fr">{{ $t('games.detail.language_french') }}</option>
										<option value="en">{{ $t('games.detail.language_english') }}</option>
										<option value="ar">{{ $t('games.detail.language_arabic') }}</option>
									</select>
								</div>

								<div
									class="col-span-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200/60 dark:border-slate-600">
									<div class="flex justify-between items-center mb-3">
										<label
											class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{{ $t('games.detail.win_probability') }}</label>
										<span
											class="px-2 py-0.5 bg-white dark:bg-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600">
											{{ game.winProbability }}%
										</span>
									</div>

									<input v-model.number="game.winProbability" type="range" min="50" max="100" step="5"
										class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-brand-600 hover:accent-brand-700 transition-all">

									<div
										class="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">
										<span>{{ $t('games.detail.win_probability_minimum') }}</span>
										<span>{{ $t('games.detail.win_probability_generous') }}</span>
										<span>{{ $t('games.detail.win_probability_guaranteed') }}</span>
									</div>
								</div>

								<div class="col-span-2">
									<label
										class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{{ $t('games.detail.tagline') }}</label>
									<textarea v-model="game.tagline" rows="2"
										class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white font-medium focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 resize-none text-sm"
										:placeholder="$t('games.detail.tagline_placeholder')"></textarea>
								</div>

								<div class="col-span-2">
									<label
										class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
										<span class="flex items-center gap-2">
											<Icon name="ph:google-logo-bold" size="14" />
											{{ $t('games.detail.google_review_link') }}
											<span class="text-red-500">*</span>
										</span>
									</label>
									<div class="flex gap-2">
										<input v-model="game.googleReviewUrl" type="url" required
											class="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white font-medium focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-sm"
											:placeholder="$t('games.detail.google_review_placeholder')">
										<button type="button" @click="showGoogleHelpModal = true"
											class="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-2 shrink-0"
											:title="$t('games.detail.google_help_title')">
											<Icon name="ph:question-bold" size="16" />
											<span class="text-xs font-bold hidden sm:inline">{{ $t('games.detail.google_review_help') }}</span>
										</button>
									</div>
									<p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
										{{ $t('games.detail.google_review_description') }}
									</p>
								</div>
							</div>

							<!-- Advanced Settings -->
							<div class="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-6">
								<h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
									<Icon name="ph:sliders-horizontal-bold" size="16" />
									{{ $t('games.detail.advanced_settings') }}
								</h3>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<!-- Frequency -->
									<div
										class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
										<div class="flex items-center justify-between mb-3">
											<span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ $t('games.detail.frequency_label') }}</span>
											<label class="relative inline-flex items-center cursor-pointer">
												<input v-model="game.participationFrequencyEnabled" type="checkbox"
													class="sr-only peer">
												<div
													class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900">
												</div>
											</label>
										</div>
										<div v-if="game.participationFrequencyEnabled" class="flex items-center gap-2">
											<input v-model.number="game.participationFrequencyHours" type="number"
												min="1"
												class="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 focus:border-slate-400 outline-none">
											<span class="text-xs text-slate-500 font-medium">{{ $t('games.detail.frequency_hours') }}</span>
										</div>
									</div>

									<!-- Redemption Delay -->
									<div
										class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
										<div class="flex items-center justify-between mb-3">
											<span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ $t('games.detail.redemption_delay') }}</span>
											<label class="relative inline-flex items-center cursor-pointer">
												<input v-model="game.prizeRedemptionDelayEnabled" type="checkbox"
													class="sr-only peer">
												<div
													class="w-9 h-5 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900 dark:peer-checked:bg-brand-600">
												</div>
											</label>
										</div>
										<div v-if="game.prizeRedemptionDelayEnabled" class="flex items-center gap-2">
											<input v-model.number="game.prizeRedemptionDelayHours" type="number" min="0"
												class="w-20 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-500 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:border-slate-400 outline-none">
											<span
												class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ $t('games.detail.frequency_hours') }}</span>
										</div>
									</div>
								</div>
							</div>

							<!-- Navigation buttons -->
							<div class="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
								<div>
									<!-- Back button for wizard mode -->
									<button v-if="isNew && currentWizardStep > 0" type="button"
										@click="goToPreviousStep"
										class="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-all flex items-center gap-2 text-sm">
										<Icon name="ph:arrow-left-bold" size="16" class="rtl:rotate-180" />
										{{ $t('common.previous') }}
									</button>
								</div>
								<div class="flex gap-3">
									<!-- Next button for wizard mode -->
									<button v-if="isNew" type="button" @click="goToNextStep" :disabled="!canGoNext"
										class="px-6 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-lg shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
										{{ $t('common.next') }}
										<Icon name="ph:arrow-right-bold" size="16" class="rtl:rotate-180" />
									</button>
									<!-- Save button for edit mode -->
									<button v-else type="submit" :disabled="saving"
										class="px-6 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-lg shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
										<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" />
										{{ saving ? $t('common.loading') : $t('games.detail.save_button') }}
									</button>
								</div>
							</div>
						</form>

						<!-- TAB: APPEARANCE -->
						<form v-show="activeTab === 'appearance'" @submit.prevent="saveGame" class="space-y-8">
							<div
								class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50 dark:border-slate-700">
								<div
									class="w-10 h-10 rounded-lg bg-pink-50 dark:bg-pink-900/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
									<Icon name="ph:paint-brush-broad-duotone" size="20" />
								</div>
								<div>
									<h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('games.detail.appearance_title') }}</h2>
									<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ $t('games.detail.appearance_subtitle') }}
									</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div>
									<label
										class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">{{ $t('games.detail.background_color') }}</label>
									<div
										class="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
										<input v-model="game.primaryColor" type="color"
											class="w-10 h-10 rounded-lg bg-transparent border-0 cursor-pointer p-0 overflow-hidden shadow-sm hover:scale-105 transition-transform">
										<div class="flex-1">
											<p class="text-slate-900 dark:text-white font-mono font-bold text-sm">{{
												game.primaryColor
											}}
											</p>
										</div>
									</div>
								</div>
							</div>

							<!-- Background Image -->
							<div>
								<label
									class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">{{ $t('games.detail.background_image') }}</label>
								<div class="flex items-start gap-6">
									<!-- Preview -->
									<div
										class="w-24 h-24 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden relative group/bg">
										<img v-if="game.backgroundImage" :src="game.backgroundImage"
											class="w-full h-full object-cover" />
										<Icon v-else name="ph:image-duotone" class="text-slate-300" size="32" />
										<!-- Remove button -->
										<button v-if="game.backgroundImage" type="button"
											@click="game.backgroundImage = null"
											class="absolute top-1 right-1 p-1.5 bg-white text-red-500 rounded-lg shadow-sm hover:bg-red-50 transition-all opacity-0 group-hover/bg:opacity-100 transform scale-90 hover:scale-100 border border-slate-100"
											:title="$t('games.detail.delete_image')">
											<Icon name="ph:trash-bold" size="14" />
										</button>
									</div>
									<!-- Upload -->
									<div class="flex-1 space-y-2 pt-1">
										<input ref="bgImageInputRef" type="file" @change="handleBgImageUpload"
											accept="image/*" class="hidden" />
										<div class="flex items-center gap-2">
											<button type="button" @click="bgImageInputRef?.click()"
												class="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm">
												<Icon name="ph:upload-simple-bold" size="14" />
												{{ game.backgroundImage ? $t('games.detail.change_image') : $t('games.detail.upload_image') }}
											</button>
											<button v-if="game.backgroundImage" type="button"
												@click="game.backgroundImage = null"
												class="px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm">
												<Icon name="ph:trash-bold" size="14" />
												{{ $t('games.detail.delete_image') }}
											</button>
										</div>
										<p class="text-[11px] text-slate-400 font-medium leading-relaxed">
											{{ $t('games.detail.recommended_format') }}
										</p>
									</div>
								</div>
							</div>

							<!-- Navigation buttons -->
							<div class="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
								<div>
									<button v-if="isNew && currentWizardStep > 0" type="button"
										@click="goToPreviousStep"
										class="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-all flex items-center gap-2 text-sm">
										<Icon name="ph:arrow-left-bold" size="16" class="rtl:rotate-180" />
										{{ $t('common.previous') }}
									</button>
								</div>
								<div class="flex gap-3">
									<button v-if="isNew" type="button" @click="goToNextStep"
										class="px-6 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-lg shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 text-sm">
										{{ $t('common.next') }}
										<Icon name="ph:arrow-right-bold" size="16" class="rtl:rotate-180" />
									</button>
									<button v-else type="submit" :disabled="saving"
										class="px-6 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-lg shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
										<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" />
										{{ saving ? $t('common.loading') : $t('games.detail.save_button') }}
									</button>
								</div>
							</div>
						</form>

						<!-- TAB: PRIZES -->
						<div v-show="activeTab === 'prizes'">
							<div v-if="isNew" class="space-y-8">
								<div
									class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50 dark:border-slate-700">
									<div
										class="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
										<Icon name="ph:gift-duotone" size="20" />
									</div>
									<div>
										<h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('games.detail.prizes_title') }}
										</h2>
										<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ $t('games.detail.prizes_subtitle') }}
										</p>
									</div>
								</div>

								<div
									class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
									<div
										class="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 text-amber-600 dark:text-amber-400">
										<Icon name="ph:info-bold" size="24" />
									</div>
									<h3 class="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">{{ $t('games.detail.prizes_info') }}</h3>
									<p class="text-xs text-amber-700 dark:text-amber-300 mb-4">{{ $t('games.detail.prizes_info_message') }}</p>
								</div>

								<!-- Navigation buttons for wizard -->
								<div class="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
									<button type="button" @click="goToPreviousStep"
										class="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-all flex items-center gap-2 text-sm">
										<Icon name="ph:arrow-left-bold" size="16" class="rtl:rotate-180" />
										{{ $t('common.previous') }}
									</button>
									<button type="button" @click="saveGame" :disabled="saving"
										class="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 text-sm">
										<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" size="18" />
										<Icon v-else name="ph:rocket-launch-bold" size="18" />
										{{ saving ? $t('games.detail.creating') : $t('games.detail.create_game') }}
									</button>
								</div>
							</div>
							<div v-else>
								<div
									class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50 dark:border-slate-700">
									<div
										class="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
										<Icon name="ph:gift-duotone" size="20" />
									</div>
									<div>
										<h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('games.detail.prizes_title') }}
										</h2>
										<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ $t('games.detail.prizes_after_creation') }}
										</p>
									</div>
								</div>
								<GamePrizes :game-id="route.params.id as string" />
								<div class="flex justify-end pt-6 mt-6 border-t border-slate-100 dark:border-slate-700">
									<button type="button" @click="activeTab = 'flyers'"
										class="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
										{{ $t('games.detail.configure_flyer') }}
										<Icon name="ph:arrow-right-bold" size="16" class="rtl:rotate-180" />
									</button>
								</div>
							</div>
						</div>

						<!-- TAB: FLYERS -->
						<div v-if="activeTab === 'flyers'">
							<div v-if="isNew" class="text-center py-12">
								<p class="text-sm font-bold text-slate-500 dark:text-slate-400">{{ $t('games.detail.flyers_no_flyer') }}</p>
							</div>
							<div v-else class="space-y-4">
								<!-- Compact header with link -->
								<div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
									<div class="flex items-center gap-2">
										<Icon name="ph:qr-code-duotone" size="16" class="text-indigo-500 dark:text-indigo-400 shrink-0" />
										<h2 class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('games.detail.flyers_title') }}</h2>
									</div>
									<div class="flex items-center gap-1.5 min-w-0">
										<span class="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden sm:block max-w-[220px] font-mono">{{ getGameUrl() }}</span>
										<button @click="copyLink"
											class="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
											:title="$t('games.detail.flyers_game_link')">
											<Icon name="ph:copy-bold" size="14" />
										</button>
									</div>
								</div>

								<!-- Preview Mode: Show flyer preview if saved and editor is not open -->
								<div v-if="game.flyerDesignUrl && !showFlyerEditor" class="space-y-6">
									<!-- Flyer Preview Card -->
									<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
										<!-- Header -->
										<div class="p-5 border-b border-slate-100 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-between">
											<div class="flex items-center gap-4">
												<div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
													<Icon name="ph:check-circle-fill" class="text-emerald-500" size="24" />
												</div>
												<div>
													<h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('games.detail.flyers_your_flyer') }}</h3>
													<p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('games.detail.flyers_ready') }}</p>
												</div>
											</div>
											<button @click="showFlyerEditor = true"
												class="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/20">
												<Icon name="ph:pencil-simple-bold" size="18" />
												{{ $t('games.detail.flyers_edit') }}
											</button>
										</div>

										<!-- Preview Content -->
										<div class="p-6 flex flex-col lg:flex-row items-start gap-8">
											<!-- Flyer Image -->
											<div class="relative group mx-auto lg:mx-0">
												<div class="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
												<img :src="game.flyerDesignUrl"
													class="relative w-64 h-auto rounded-2xl border-2 border-white dark:border-slate-700 shadow-2xl" />
											</div>

											<!-- Actions -->
											<div class="flex-1 space-y-5">
												<div>
													<h4 class="text-base font-bold text-slate-900 dark:text-white mb-1">{{ $t('games.detail.flyers_quick_actions') }}</h4>
													<p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('games.detail.flyers_download_instructions') }}</p>
												</div>

												<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
													<!-- Download PNG -->
													<a :href="game.flyerDesignUrl" download="flyer.png"
														class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors group">
														<div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
															<Icon name="ph:file-png-bold" class="text-blue-600 dark:text-blue-400" size="20" />
														</div>
														<div>
															<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('games.detail.flyers_download_png') }}</p>
															<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('games.detail.flyers_download_png_desc') }}</p>
														</div>
													</a>

													<!-- Download PDF -->
													<button @click="downloadFlyerPDF" :disabled="downloadingPdf"
														class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors group text-left disabled:opacity-50">
														<div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
															<Icon v-if="downloadingPdf" name="ph:spinner-gap-bold" class="text-red-600 dark:text-red-400 animate-spin" size="20" />
															<Icon v-else name="ph:file-pdf-bold" class="text-red-600 dark:text-red-400" size="20" />
														</div>
														<div>
															<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('games.detail.flyers_download_pdf') }}</p>
															<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('games.detail.flyers_download_pdf_desc') }}</p>
														</div>
													</button>

													<!-- Preview -->
													<button @click="previewFlyer"
														class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors group text-left">
														<div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
															<Icon name="ph:eye-bold" class="text-emerald-600 dark:text-emerald-400" size="20" />
														</div>
														<div>
															<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('games.detail.flyers_preview') }}</p>
															<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('games.detail.flyers_preview_fullscreen') }}</p>
														</div>
													</button>
												</div>

												<!-- Order CTA -->
												<div class="p-4 bg-gradient-to-r from-purple-50 to-brand-50 dark:from-purple-900/20 dark:to-brand-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
													<div class="flex items-center gap-4">
														<div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
															<Icon name="ph:printer-bold" class="text-purple-600 dark:text-purple-400" size="20" />
														</div>
														<div class="flex-1">
															<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('games.detail.flyers_need_printing') }}</p>
															<p class="text-xs text-slate-600 dark:text-slate-400">{{ $t('games.detail.flyers_print_description') }}</p>
														</div>
														<button @click="openOrderModal"
															class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors">
															{{ $t('games.detail.flyers_order') }}
														</button>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Editor Mode: Show editor if no flyer saved OR editor is explicitly opened -->
								<div v-else>
									<!-- Back button if editing existing flyer -->
									<div v-if="game.flyerDesignUrl && showFlyerEditor" class="flex items-center gap-4 mb-4">
										<button @click="showFlyerEditor = false"
											class="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
											<Icon name="ph:arrow-left-bold" size="18" class="rtl:rotate-180" />
											{{ $t('games.detail.flyers_back_to_preview') }}
										</button>
									</div>

									<FlyerEditor :game="game" :business-name="businessObject?.name"
										:business-logo="businessLogo" :qr-code-url="qrCodeUrl"
										@save="handleFlyerSave" />
								</div>
							</div>
						</div>

					</div>
				</div>

				<!-- Preview (Sticky) -->
				<div v-if="['content', 'appearance'].includes(activeTab)" class="hidden xl:block w-[320px] shrink-0">
					<div class="sticky top-24">
						<div class="text-center mb-4">
							<span
								class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700">
								{{ $t('games.detail.mobile_preview') }}
							</span>
						</div>
						<div class="flex justify-center transform hover:scale-[1.02] transition-transform duration-500">
							<GamePreview :title="game.title" :tagline="game.tagline" :primary-color="game.primaryColor"
								:background-image="game.backgroundImage" :logo="businessLogo"
								:prizes="(game as any).prizes"
								:google-review-url="game.googleReviewUrl" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Google Review Help Modal -->
		<Teleport to="body">
			<div v-if="showGoogleHelpModal"
				class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
				@click.self="showGoogleHelpModal = false">
				<div
					class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
					<!-- Header -->
					<div class="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
						<div class="flex items-center gap-3">
							<div
								class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
								<Icon name="ph:google-logo-bold" size="20" />
							</div>
							<h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('games.detail.google_help_title') }}
							</h3>
						</div>
						<button @click="showGoogleHelpModal = false"
							class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors">
							<Icon name="ph:x-bold" size="20" />
						</button>
					</div>

					<!-- Content -->
					<div class="p-6 space-y-6">
						<!-- Method 1 -->
						<div class="space-y-3">
							<h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<span
									class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
								{{ $t('games.detail.google_help_method1') }}
							</h4>
							<ol class="space-y-2 text-sm text-slate-600 dark:text-slate-300 ml-8">
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method1_step1') }}
								</li>
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method1_step2') }}
								</li>
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method1_step3') }}
								</li>
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method1_step4') }}
								</li>
							</ol>
						</div>

						<!-- Method 2 -->
						<div class="space-y-3">
							<h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<span
									class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
								{{ $t('games.detail.google_help_method2') }}
							</h4>
							<ol class="space-y-2 text-sm text-slate-600 dark:text-slate-300 ml-8">
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method2_step1') }}
								</li>
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method2_step2') }}
								</li>
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method2_step3') }}
								</li>
								<li class="flex items-start gap-2">
									<span class="text-slate-400">&#8226;</span>
									{{ $t('games.detail.google_help_method2_step4') }}
								</li>
							</ol>
						</div>

						<!-- Tip -->
						<div
							class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
							<div class="flex items-start gap-3">
								<Icon name="ph:lightbulb-bold" size="20"
									class="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
								<div>
									<p class="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">{{ $t('games.detail.google_help_tip') }}</p>
									<p class="text-xs text-amber-700 dark:text-amber-300">
										{{ $t('games.detail.google_help_tip_message') }}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div class="p-6 border-t border-slate-100 dark:border-slate-700">
						<button @click="showGoogleHelpModal = false"
							class="w-full py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-lg transition-all text-sm">
							{{ $t('games.detail.google_help_understood') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Order Modal -->
		<OrdersCreateOrderModal
			v-model="showOrderModal"
			:flyer-design-url="game.flyerDesignUrl || undefined"
			:game-id="(route.params.id as string)"
			@created="showToast(t('games.order_created'), 'success')"
		/>
	</div>
</template>
