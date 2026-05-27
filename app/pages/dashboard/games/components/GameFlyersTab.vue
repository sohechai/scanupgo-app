<script setup lang="ts">
import QRCode from 'qrcode'
import FlyerEditor from '~/components/flyers/FlyerEditor.vue'

const props = defineProps<{
	game: any
	businessLogo: string | null
	businessObject: any
	wizardMode: boolean
	gameId: string
}>()

const emit = defineEmits<{
	'flyer-saved': []
}>()

const config = useRuntimeConfig()
const { $api } = useNuxtApp()
const { user } = useAuth()
const { t } = useI18n()
const { show: showToast } = useToast()

// ── QR Code ───────────────────────────────────────────────────────────────

const qrCodeUrl = ref<string>('')

const getGameUrl = () => {
	if (!props.game.slug) return ''
	const configured = config.public.siteUrl as string | undefined
	const baseUrl = (configured && !configured.includes('localhost')) ? configured : window.location.origin
	return `${baseUrl}/play/${props.game.slug}`
}

const generateQRCode = async () => {
	if (!props.game.slug) return

	const url = getGameUrl()
	const qrColor = props.game.qrCodeColor || '#000000'
	const qrBgColor = props.game.qrCodeBgColor || '#ffffff'

	try {
		const canvas = document.createElement('canvas')
		await QRCode.toCanvas(canvas, url, {
			width: 600,
			margin: 2,
			errorCorrectionLevel: 'H',
			color: { dark: qrColor, light: qrBgColor }
		})

		if (props.game.qrCodeLogoUrl) {
			const ctx = canvas.getContext('2d')
			if (ctx) {
				const logo = new Image()
				logo.crossOrigin = 'anonymous'
				await new Promise<void>((resolve) => {
					logo.onload = () => {
						const logoSize = canvas.width * 0.30
						const logoX = (canvas.width - logoSize) / 2
						const logoY = (canvas.height - logoSize) / 2
						ctx.beginPath()
						ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 8, 0, Math.PI * 2)
						ctx.fillStyle = qrBgColor
						ctx.fill()
						ctx.save()
						ctx.beginPath()
						ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2, 0, Math.PI * 2)
						ctx.clip()
						ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
						ctx.restore()
						resolve()
					}
					logo.onerror = () => resolve()
					logo.src = props.game.qrCodeLogoUrl!
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

const downloadQRCode = () => {
	if (!qrCodeUrl.value) return
	const link = document.createElement('a')
	link.download = `qrcode-${props.game.slug || 'jeu'}.png`
	link.href = qrCodeUrl.value
	link.click()
}

const downloadQRCodeSVG = async () => {
	if (!props.game.slug) return
	const QRCodeLib = (await import('qrcode')).default
	const svgString = await QRCodeLib.toString(getGameUrl(), {
		type: 'svg',
		margin: 2,
		errorCorrectionLevel: 'H',
		color: {
			dark: props.game.qrCodeColor || '#000000',
			light: props.game.qrCodeBgColor || '#ffffff',
		}
	})
	const blob = new Blob([svgString], { type: 'image/svg+xml' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.download = `qrcode-${props.game.slug || 'jeu'}.svg`
	link.href = url
	link.click()
	URL.revokeObjectURL(url)
}

watch(() => props.game.slug, generateQRCode)
watch(() => props.game.primaryColor, generateQRCode)
watch(() => props.game.qrCodeColor, generateQRCode)
watch(() => props.game.qrCodeBgColor, generateQRCode)
watch(() => props.game.qrCodeLogoUrl, generateQRCode)

onMounted(() => { if (props.game.slug) generateQRCode() })

// ── Flyer ─────────────────────────────────────────────────────────────────

const savingFlyer = ref(false)
const showFlyerEditor = ref(false)
const showOrderModal = ref(false)
const downloadingPdf = ref(false)

const handleFlyerSave = async (imageUrl: string, canvasJson?: Record<string, any>) => {
	savingFlyer.value = true
	try {
		const body: Record<string, any> = { flyerDesignUrl: imageUrl }
		if (canvasJson) body.flyerDesignJson = canvasJson
		await $api(`/games/${props.gameId}`, { method: 'PATCH', body })
		props.game.flyerDesignUrl = imageUrl
		if (canvasJson) props.game.flyerDesignJson = canvasJson
		showFlyerEditor.value = false
		showToast(t('games.detail.flyer_saved'), 'success')
		emit('flyer-saved')
	} catch (error) {
		console.error('Failed to save flyer design:', error)
		showToast(t('games.detail.flyer_save_error'), 'error')
	} finally {
		savingFlyer.value = false
	}
}

const previewFlyer = () => {
	if (!props.game.flyerDesignUrl) return
	const newWindow = window.open('', '_blank')
	if (!newWindow) {
		showToast('Le navigateur a bloqué l\'ouverture de la fenêtre. Autorisez les popups.', 'error')
		return
	}
	newWindow.document.write(`
		<!DOCTYPE html>
		<html>
			<head>
				<title>${t('games.detail.preview_title')} - ${props.game.title || 'Flyer'}</title>
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body { min-height: 100vh; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; font-family: system-ui, -apple-system, sans-serif; }
					.container { text-align: center; }
					h1 { color: white; font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; opacity: 0.9; }
					.flyer-wrapper { position: relative; display: inline-block; }
					.flyer-wrapper::before { content: ''; position: absolute; inset: -4px; background: linear-gradient(135deg, #f97316, #8b5cf6); border-radius: 20px; z-index: -1; opacity: 0.5; filter: blur(20px); }
					img { max-width: 90vw; max-height: 80vh; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
					.actions { margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; }
					.btn { padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; }
					.btn-primary { background: #f97316; color: white; border: none; }
					.btn-primary:hover { background: #ea580c; transform: translateY(-2px); }
					.btn-secondary { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
					.btn-secondary:hover { background: rgba(255,255,255,0.2); }
				</style>
			</head>
			<body>
				<div class="container">
					<h1>${t('games.detail.preview_title')}</h1>
					<div class="flyer-wrapper">
						<img src="${props.game.flyerDesignUrl}" alt="Flyer" />
					</div>
					<div class="actions">
						<a href="${props.game.flyerDesignUrl}" download="flyer.png" class="btn btn-primary">
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
				primaryColor: props.game.primaryColor || '#fb923c',
				accentColor: props.game.primaryColor || '#fb923c',
				buttonColor: props.game.primaryColor || '#fb923c',
				fontFamily: 'Luckiest Guy',
				prizes: (props.game.prizes || []).map((p: any) => ({
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
		link.download = `flyer-${props.game.slug || 'design'}.pdf`
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
	<div>
		<div v-if="wizardMode" class="text-center py-12">
			<p class="text-sm font-bold text-slate-500 dark:text-slate-400">{{ $t('games.detail.flyers_no_flyer') }}</p>
		</div>
		<div v-else class="space-y-4">
			<!-- QR Code Card (only shown when flyer is configured and editor is closed) -->
			<div v-if="game.flyerDesignUrl && !showFlyerEditor" class="bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
				<div class="flex flex-col sm:flex-row items-start gap-6">
					<!-- QR Preview -->
					<div class="shrink-0 flex flex-col items-center gap-3">
						<div class="w-36 h-36 bg-white rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center overflow-hidden">
							<img v-if="qrCodeUrl" :src="qrCodeUrl" class="w-full h-full object-contain p-1" />
							<Icon v-else name="ph:qr-code-bold" size="48" class="text-slate-200" />
						</div>
						<div class="flex gap-2">
							<button @click="downloadQRCode" type="button" :disabled="!qrCodeUrl"
								class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-40">
								<Icon name="ph:file-png-bold" size="14" class="text-blue-500" />
								PNG
							</button>
							<button @click="downloadQRCodeSVG" type="button" :disabled="!game.slug"
								class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-40">
								<Icon name="ph:file-svg-bold" size="14" class="text-orange-500" />
								SVG
							</button>
						</div>
					</div>

					<!-- QR Customization -->
					<div class="flex-1 space-y-4">
						<div>
							<h3 class="text-sm font-bold text-slate-900 dark:text-white">QR Code</h3>
							<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono truncate">{{ getGameUrl() }}</p>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">Couleur QR</label>
								<div class="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5">
									<input v-model="game.qrCodeColor" type="color" class="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent" />
									<span class="text-xs font-mono text-slate-600 dark:text-slate-300">{{ game.qrCodeColor }}</span>
								</div>
							</div>
							<div>
								<label class="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">Fond</label>
								<div class="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5">
									<input v-model="game.qrCodeBgColor" type="color" class="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent" />
									<span class="text-xs font-mono text-slate-600 dark:text-slate-300">{{ game.qrCodeBgColor }}</span>
								</div>
							</div>
						</div>

						<button @click="copyLink" type="button"
							class="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
							<Icon name="ph:copy-bold" size="13" />
							Copier le lien du jeu
						</button>
					</div>
				</div>
			</div>

			<!-- Compact header with link -->
			<div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
				<div class="flex items-center gap-2">
					<Icon name="ph:qr-code-duotone" size="16" class="text-slate-500 dark:text-slate-400 shrink-0" />
					<h2 class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('games.detail.flyers_title') }}</h2>
				</div>
				<div class="flex items-center gap-1.5 min-w-0">
					<span class="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden sm:block max-w-[220px] font-mono">{{ getGameUrl() }}</span>
					<button @click="copyLink"
						class="p-1.5 text-slate-400 hover:text-[#007AFF] dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
						:title="$t('games.detail.flyers_game_link')">
						<Icon name="ph:copy-bold" size="14" />
					</button>
				</div>
			</div>

			<!-- Preview Mode: Show flyer preview if saved and editor is not open -->
			<div v-if="game.flyerDesignUrl && !showFlyerEditor" class="space-y-6">
				<div class="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
					<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
							<div>
								<h3 class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('games.detail.flyers_your_flyer') }}</h3>
								<p class="text-xs text-slate-400 dark:text-slate-500">{{ $t('games.detail.flyers_ready') }}</p>
							</div>
						</div>
						<button @click="showFlyerEditor = true"
							class="px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md transition-colors flex items-center gap-2 text-sm">
							<Icon name="ph:pencil-simple-bold" size="15" />
							{{ $t('games.detail.flyers_edit') }}
						</button>
					</div>

					<div class="p-6 flex flex-col lg:flex-row items-start gap-8">
						<div class="mx-auto lg:mx-0">
							<img :src="game.flyerDesignUrl" class="w-52 h-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-md" />
						</div>

						<div class="flex-1 space-y-3">
							<p class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ $t('games.detail.flyers_quick_actions') }}</p>

							<div class="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
								<!-- PNG -->
								<a :href="game.flyerDesignUrl" download="flyer.png"
									class="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
									<div class="flex items-center gap-3">
										<Icon name="ph:file-png" class="text-slate-400" size="16" />
										<div>
											<p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ $t('games.detail.flyers_download_png') }}</p>
											<p class="text-xs text-slate-400">{{ $t('games.detail.flyers_download_png_desc') }}</p>
										</div>
									</div>
									<Icon name="ph:download-simple" class="text-slate-300 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors" size="16" />
								</a>

								<!-- PDF -->
								<button @click="downloadFlyerPDF" :disabled="downloadingPdf"
									class="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group disabled:opacity-40 text-left">
									<div class="flex items-center gap-3">
										<Icon name="ph:file-pdf" class="text-slate-400" size="16" />
										<div>
											<p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ $t('games.detail.flyers_download_pdf') }}</p>
											<p class="text-xs text-slate-400">{{ $t('games.detail.flyers_download_pdf_desc') }}</p>
										</div>
									</div>
									<Icon v-if="downloadingPdf" name="ph:spinner-gap-bold" class="text-slate-300 animate-spin" size="16" />
									<Icon v-else name="ph:download-simple" class="text-slate-300 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors" size="16" />
								</button>

								<!-- Preview -->
								<button @click="previewFlyer"
									class="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group text-left">
									<div class="flex items-center gap-3">
										<Icon name="ph:eye" class="text-slate-400" size="16" />
										<div>
											<p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ $t('games.detail.flyers_preview') }}</p>
											<p class="text-xs text-slate-400">{{ $t('games.detail.flyers_preview_fullscreen') }}</p>
										</div>
									</div>
									<Icon name="ph:arrow-square-out" class="text-slate-300 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors" size="16" />
								</button>
							</div>

							<!-- Order CTA -->
							<div class="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
								<div class="flex items-center gap-3">
									<Icon name="ph:printer" class="text-slate-400" size="16" />
									<div>
										<p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ $t('games.detail.flyers_need_printing') }}</p>
										<p class="text-xs text-slate-400">{{ $t('games.detail.flyers_print_description') }}</p>
									</div>
								</div>
								<button @click="showOrderModal = true"
									class="px-3 py-1.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-xs font-semibold rounded-md transition-colors shrink-0">
									{{ $t('games.detail.flyers_order') }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Editor Mode -->
			<div v-else>
				<div v-if="game.flyerDesignUrl && showFlyerEditor" class="flex items-center gap-4 mb-4">
					<button @click="showFlyerEditor = false"
						class="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors">
						<Icon name="ph:arrow-left-bold" size="18" class="rtl:rotate-180" />
						{{ $t('games.detail.flyers_back_to_preview') }}
					</button>
				</div>

				<FlyerEditor :game="game" :business-name="businessObject?.name"
					:business-logo="businessLogo" :qr-code-url="qrCodeUrl"
					:saving="savingFlyer"
					@save="handleFlyerSave" />
			</div>
		</div>

		<!-- Order Modal -->
		<OrdersCreateOrderModal
			v-model="showOrderModal"
			:flyer-design-url="game.flyerDesignUrl || undefined"
			:game-id="gameId"
			@created="showToast(t('games.order_created'), 'success')"
		/>
	</div>
</template>
