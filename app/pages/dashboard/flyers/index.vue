<script setup lang="ts">
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import FlyerTemplate from '~/components/flyers/FlyerTemplate.vue'
import FlyerEditor from '~/components/flyers/FlyerEditor.vue'
import QRCodeCustomizer from '~/components/flyers/QRCodeCustomizer.vue'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { user } = useAuth()
const config = useRuntimeConfig()
const { show: showToast } = useToast()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

const loading = ref(true)
const game = ref<any>(null)
const business = ref<any>(null)
const qrCodeUrl = ref<string | null>(null)
const isSavingQrSettings = ref(false)

// Tab Management
const activeTab = ref<'templates' | 'editor' | 'qrcode'>('templates') // templates | editor | qrcode

// Flyer State
const selectedTemplate = ref('modern') // modern | classic
const isGenerating = ref(false)
const savedFlyerUrl = ref<string | null>(null)
const showFlyerEditor = ref(false) // Toggle between preview and editor

// Fetch Active Game
const fetchGame = async () => {
	const userId = user.value?.id
	if (!userId) {
		loading.value = false
		return
	}

	try {
		// 1. Get Business (For Logo & Name on Flyer)
		const businessData = await $api<any>('/businesses/me')

		if (!businessData) {
			loading.value = false
			return
		}

		business.value = businessData

		// 2. Get Active Games (filtered by business on server)
		const allGames = await $api<any[]>('/games')
		const activeGames = (allGames || []).filter((g: any) => g.active === true)

		if (activeGames && activeGames.length > 0) {
			game.value = activeGames[0]
			// Load saved flyer URL from game if exists
			if (game.value.flyerDesignUrl) {
				savedFlyerUrl.value = game.value.flyerDesignUrl
			}
			await generateQRCode()
		}

	} catch (e) {
		console.error('Error fetching game/qr:', e)
	} finally {
		loading.value = false
	}
}

const getGameUrl = () => {
	if (!game.value?.slug) return ''
	const baseUrl = config.public.siteUrl || window.location.origin
	return `${baseUrl}/play/${game.value.slug}`
}

const generateQRCode = async () => {
	if (!game.value) return
	const url = getGameUrl()
	try {
		// Use custom QR code colors if set, otherwise use defaults
		const qrColor = game.value.qrCodeColor || game.value.primaryColor || '#000000'
		const qrBgColor = game.value.qrCodeBgColor || '#ffffff'

		// Generate base QR code
		const canvas = document.createElement('canvas')
		await QRCode.toCanvas(canvas, url, {
			width: 600,
			margin: 2,
			errorCorrectionLevel: 'H',
			color: {
				dark: qrColor,
				light: qrBgColor
			}
		})

		// If logo is set, overlay it
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

						// Draw white background circle for logo
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
					logo.src = game.value.qrCodeLogoUrl
				})
			}
		}

		qrCodeUrl.value = canvas.toDataURL('image/png')
	} catch (err) {
		console.error(err)
	}
}

// Handle QR code customization update
const handleQRCodeUpdate = (data: { qrCodeDataUrl: string }) => {
	qrCodeUrl.value = data.qrCodeDataUrl
}

// Save QR code settings to game
const saveQRCodeSettings = async (settings: { color: string; bgColor: string; logoUrl: string | null }) => {
	if (!game.value) return

	isSavingQrSettings.value = true
	try {
		await $api(`/games/${game.value.id}`, {
			method: 'PATCH',
			body: {
				qrCodeColor: settings.color,
				qrCodeBgColor: settings.bgColor,
				qrCodeLogoUrl: settings.logoUrl
			}
		})

		// Update local game object
		game.value.qrCodeColor = settings.color
		game.value.qrCodeBgColor = settings.bgColor
		game.value.qrCodeLogoUrl = settings.logoUrl

		showToast(t('flyers.save_flyer'), 'success')
	} catch (err) {
		console.error('Error saving QR settings:', err)
		showToast(t('flyers.save_flyer_error'), 'error')
	} finally {
		isSavingQrSettings.value = false
	}
}

const downloadQRCode = () => {
	if (!qrCodeUrl.value || !game.value) return
	const link = document.createElement('a')
	link.download = `qrcode-${game.value.slug}.png`
	link.href = qrCodeUrl.value
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

const copyLink = () => {
	const url = getGameUrl()
	if (url) {
		navigator.clipboard.writeText(url)
	}
}

const generatePDF = async () => {
	isGenerating.value = true
	try {
		const result = await $api<{ url: string }>('/flyer-generator/generate-pdf', {
			method: 'POST',
			body: {
				businessName: business.value?.name,
				businessLogo: business.value?.logo,
				qrCodeUrl: qrCodeUrl.value || undefined,
				primaryColor: game.value?.primaryColor || '#fb923c',
				accentColor: game.value?.primaryColor || '#fb923c',
				buttonColor: game.value?.primaryColor || '#fb923c',
				fontFamily: 'Luckiest Guy',
				prizes: (game.value?.prizes || []).map((p: any) => ({
					name: p.name,
					rank: p.rank,
					probability: p.probability
				}))
			}
		})

		if (!result?.url) {
			showToast(t('flyers.pdf_generation'), 'error')
			return
		}

		const response = await fetch(result.url)
		const blob = await response.blob()
		const downloadUrl = URL.createObjectURL(blob)

		const link = document.createElement('a')
		link.download = `flyer-${game.value?.slug || 'design'}.pdf`
		link.href = downloadUrl
		link.click()

		URL.revokeObjectURL(downloadUrl)
		showToast(t('flyers.pdf_success'), 'success')
	} catch (e) {
		console.error('PDF Generation failed', e)
		showToast(t('flyers.pdf_generation'), 'error')
	} finally {
		isGenerating.value = false
	}
}

const handleFlyerSave = async (imageUrl: string) => {
	if (!game.value) return

	try {
		// Save flyer URL to game in database
		await $api(`/games/${game.value.id}`, {
			method: 'PATCH',
			body: {
				flyerDesignUrl: imageUrl
			}
		})

		// Update local state to show the preview
		savedFlyerUrl.value = imageUrl
		game.value.flyerDesignUrl = imageUrl
		showFlyerEditor.value = false

		showToast(t('flyers.save_flyer'), 'success')
	} catch (err) {
		console.error('Error saving flyer:', err)
		showToast(t('flyers.save_flyer_error'), 'error')
	}
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchGame()
	}
})
</script>

<template>
	<!-- Subscription Required -->
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('flyers.access_required')"
		:description="$t('flyers.access_description')"
		icon="ph:qr-code-fill"
	/>

	<div v-else class="h-full">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
			<div>
				<h1 class="text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('flyers.title') }}</h1>
				<p class="text-slate-500 dark:text-slate-400 text-lg mt-1">{{ $t('flyers.subtitle') }}</p>
			</div>

			<div v-if="game" class="flex gap-3">
				<a :href="getGameUrl()" target="_blank"
					class="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors shadow-sm">
					<Icon name="ph:arrow-square-out-bold" size="18" />
					{{ $t('flyers.test_game') }}
				</a>
			</div>
		</div>

		<!-- Tabs -->
		<div v-if="game"
			class="flex gap-1 mb-8 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl p-1.5 w-fit">
			<button @click="activeTab = 'templates'" type="button"
				:class="activeTab === 'templates'
					? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
					: 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
				class="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">
				<Icon name="ph:files-bold" size="16" />
				{{ $t('flyers.templates_tab') }}
			</button>
			<button @click="activeTab = 'qrcode'" type="button"
				:class="activeTab === 'qrcode'
					? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
					: 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
				class="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">
				<Icon name="ph:qr-code-bold" size="16" />
				{{ $t('flyers.qr_customize_tab') }}
			</button>
			<button @click="activeTab = 'editor'" type="button"
				:class="activeTab === 'editor'
					? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
					: 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
				class="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">
				<Icon name="ph:magic-wand-bold" size="16" />
				{{ $t('flyers.editor_tab') }}
			</button>
		</div>

		<!-- Loading State -->
		<div v-if="loading" class="flex items-center justify-center py-20">
			<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-300" size="48" />
		</div>

		<!-- Content: Templates Tab -->
		<div v-else-if="game && activeTab === 'templates'" class="grid grid-cols-1 xl:grid-cols-2 gap-8">

			<!-- Left Column: Quick Actions & QR -->
			<div class="space-y-8">
				<!-- Quick Link Card -->
				<div
					class="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm">
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-4">
							<div
								class="w-12 h-12 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-slate-500 dark:text-slate-400">
								<Icon name="ph:link-bold" size="24" />
							</div>
							<div>
								<p class="text-xs font-bold text-slate-400 uppercase mb-0.5">{{ $t('flyers.public_link') }}</p>
								<p
									class="text-sm font-mono text-slate-700 dark:text-slate-200 font-medium truncate max-w-[200px]">
									{{ getGameUrl() }}</p>
							</div>
						</div>
						<div class="flex gap-2">
							<button @click="copyLink"
								class="p-2.5 text-slate-400 hover:text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
								title="Copier">
								<Icon name="ph:copy-bold" size="20" />
							</button>
						</div>
					</div>
				</div>

				<!-- QR Code Card -->
				<div
					class="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm text-center">
					<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('flyers.unique_qr') }}</h2>
					<p class="text-slate-500 dark:text-slate-400 mb-8 text-sm">{{ $t('flyers.unique_qr_description') }}</p>

					<div
						class="bg-white dark:bg-[#2C2C2E] inline-block p-4 rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm mb-8">
						<img v-if="qrCodeUrl" :src="qrCodeUrl" class="w-48 h-48 object-contain" />
					</div>

					<button @click="downloadQRCode"
						class="w-full py-4 text-slate-700 dark:text-slate-200 font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] rounded-xl transition-colors flex items-center justify-center gap-2">
						<Icon name="ph:download-simple-bold" />
						{{ $t('flyers.download_qr') }}
					</button>
				</div>
			</div>

			<!-- Right Column: Flyer Generator -->
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm flex flex-col">

				<div class="flex items-center gap-3 mb-6">
					<div class="w-10 h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
						<Icon name="ph:file-pdf-bold" class="text-slate-500 dark:text-slate-400" size="20" />
					</div>
					<h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('flyers.flyer_generator') }}</h2>
				</div>

				<!-- Template Selection -->
				<div class="grid grid-cols-2 gap-3 mb-6">
					<button @click="selectedTemplate = 'modern'"
						class="p-4 rounded-xl border-2 transition-all text-left"
						:class="selectedTemplate === 'modern' ? 'border-[#007AFF] bg-[#007AFF]/5' : 'border-[#E5E5EA] dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600'">
						<span class="text-sm font-bold block mb-1 text-slate-900 dark:text-white">{{ $t('flyers.template_modern') }}</span>
						<span class="text-xs text-slate-400 dark:text-slate-500 block">{{ $t('flyers.template_modern_desc') }}</span>
						<div class="h-1.5 w-full bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-full overflow-hidden mt-3">
							<div class="h-full w-2/3" :class="selectedTemplate === 'modern' ? 'bg-[#007AFF]' : 'bg-slate-300 dark:bg-slate-600'"></div>
						</div>
					</button>

					<button @click="selectedTemplate = 'classic'"
						class="p-4 rounded-xl border-2 transition-all text-left"
						:class="selectedTemplate === 'classic' ? 'border-[#007AFF] bg-[#007AFF]/5' : 'border-[#E5E5EA] dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600'">
						<span class="text-sm font-bold block mb-1 text-slate-900 dark:text-white">{{ $t('flyers.template_classic') }}</span>
						<span class="text-xs text-slate-400 dark:text-slate-500 block">{{ $t('flyers.template_classic_desc') }}</span>
						<div class="h-1.5 w-full bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-full overflow-hidden mt-3">
							<div class="h-full w-2/3" :class="selectedTemplate === 'classic' ? 'bg-[#007AFF]' : 'bg-slate-300 dark:bg-slate-600'"></div>
						</div>
					</button>
				</div>

				<div class="mt-auto">
					<button @click="generatePDF" :disabled="isGenerating"
						class="w-full py-4 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-2xl transition-all text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF]/25 disabled:opacity-40 disabled:cursor-not-allowed">
						<Icon v-if="isGenerating" name="ph:spinner-gap-bold" class="animate-spin" size="18" />
						<Icon v-else name="ph:printer-bold" size="18" />
						{{ isGenerating ? $t('flyers.generating') : $t('flyers.download_pdf') }}
					</button>
					<p class="text-center text-slate-400 dark:text-slate-500 text-xs mt-3">{{ $t('flyers.format_info') }}</p>
				</div>
			</div>

		</div>

		<!-- Content: QR Code Customization Tab -->
		<div v-else-if="game && activeTab === 'qrcode'" class="space-y-8">
			<QRCodeCustomizer :game-url="getGameUrl()"
				:initial-color="game.qrCodeColor || game.primaryColor || '#000000'"
				:initial-bg-color="game.qrCodeBgColor || '#ffffff'" :initial-logo-url="game.qrCodeLogoUrl || ''"
				@update="handleQRCodeUpdate" @save="saveQRCodeSettings" />
		</div>

		<!-- Content: Editor Tab -->
		<div v-else-if="game && activeTab === 'editor'" class="space-y-8">
			<!-- Show Preview if flyer exists and editor is not open -->
			<div v-show="savedFlyerUrl && !showFlyerEditor"
				class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm overflow-hidden">
				<!-- Header -->
				<div class="p-5 border-b border-[#E5E5EA] dark:border-slate-700/40 flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
							<Icon name="ph:check-circle-fill" class="text-[#34C759]" size="20" />
						</div>
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-white">{{ $t('flyers.your_flyer') }}</h3>
							<p class="text-sm text-slate-400 dark:text-slate-500">{{ $t('flyers.flyer_saved') }}</p>
						</div>
					</div>
					<button @click="showFlyerEditor = true"
						class="px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all flex items-center gap-2 text-sm">
						<Icon name="ph:pencil-simple-bold" size="16" />
						{{ $t('flyers.edit_flyer') }}
					</button>
				</div>

				<!-- Preview Content -->
				<div class="p-8 flex flex-col lg:flex-row items-start gap-8">
					<!-- Flyer Image -->
					<div>
						<img :src="savedFlyerUrl"
							class="w-72 h-auto rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm" />
					</div>

					<!-- Actions -->
					<div class="flex-1 space-y-6">
						<div>
							<h4 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ $t('flyers.quick_actions') }}</h4>
							<p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('flyers.download_instructions') }}</p>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<!-- Download PNG -->
							<a :href="savedFlyerUrl" download="flyer.png"
								class="flex items-center gap-4 p-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] rounded-xl transition-colors">
								<div class="w-10 h-10 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
									<Icon name="ph:file-png-bold" class="text-slate-500 dark:text-slate-400" size="20" />
								</div>
								<div>
									<p class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('flyers.download_png') }}</p>
									<p class="text-xs text-slate-400 dark:text-slate-500">{{ $t('flyers.download_png_desc') }}</p>
								</div>
							</a>

							<!-- Open in new tab -->
							<a :href="savedFlyerUrl" target="_blank"
								class="flex items-center gap-4 p-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] rounded-xl transition-colors">
								<div class="w-10 h-10 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
									<Icon name="ph:arrow-square-out-bold" class="text-slate-500 dark:text-slate-400" size="20" />
								</div>
								<div>
									<p class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('flyers.view_large') }}</p>
									<p class="text-xs text-slate-400 dark:text-slate-500">{{ $t('flyers.open_new_tab') }}</p>
								</div>
							</a>
						</div>

						<!-- Order CTA -->
						<div class="p-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl">
							<div class="flex items-center gap-4">
								<div class="w-10 h-10 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
									<Icon name="ph:printer-bold" class="text-slate-500 dark:text-slate-400" size="18" />
								</div>
								<div class="flex-1">
									<p class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('flyers.need_printing') }}</p>
									<p class="text-xs text-slate-400 dark:text-slate-500">{{ $t('flyers.print_description') }}</p>
								</div>
								<button @click="showFlyerEditor = true"
									class="px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-semibold rounded-lg transition-colors">
									{{ $t('flyers.order') }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Show Editor if no flyer saved OR editor is explicitly opened -->
			<div v-show="!savedFlyerUrl || showFlyerEditor">
				<!-- Back button if editing existing flyer -->
				<div v-if="savedFlyerUrl && showFlyerEditor" class="flex items-center gap-4 mb-4">
					<button @click="showFlyerEditor = false"
						class="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] rounded-xl transition-colors">
						<Icon name="ph:arrow-left-bold" size="18" class="rtl:rotate-180" />
						{{ $t('flyers.back_to_preview') }}
					</button>
				</div>

				<FlyerEditor :game-id="game.id" :game="game" :business-logo="business?.logo" :business-name="business?.name"
					:qr-code-url="qrCodeUrl" @save="handleFlyerSave" />
			</div>
		</div>

		<!-- Hidden Template for Generation -->
		<div v-if="game && qrCodeUrl" class="fixed left-[9999px] top-0 pointer-events-none">
			<FlyerTemplate :template="selectedTemplate" :game="game" :qr-code-url="qrCodeUrl"
				:business-name="business?.name" :business-logo="business?.logo" />
		</div>

		<!-- Empty State -->
		<div v-else-if="!loading"
			class="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 rounded-2xl p-12 text-center shadow-sm mt-10">
			<div class="w-14 h-14 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-center mx-auto mb-3">
				<Icon name="ph:warning-circle-bold" size="28" class="text-slate-400" />
			</div>
			<h3 class="text-base font-bold mb-1 text-slate-900 dark:text-white">{{ $t('flyers.no_active_game') }}</h3>
			<NuxtLink to="/dashboard/games/new" class="text-[#007AFF] font-semibold text-sm hover:underline">{{ $t('flyers.create_game') }}</NuxtLink>
		</div>
	</div>
</template>
