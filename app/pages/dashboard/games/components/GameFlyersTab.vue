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
const { hasActiveSubscription } = useSubscription()

// ── Modal d'avertissement avant téléchargement (commerçant non-abonné) ──────
const showDownloadWarning = ref(false)
let pendingDownload: (() => void) | null = null

// Si non-abonné : ouvre la modal de friction. Sinon : télécharge directement.
const guardDownload = (doDownload: () => void) => {
	if (hasActiveSubscription.value) {
		doDownload()
	} else {
		pendingDownload = doDownload
		showDownloadWarning.value = true
	}
}

const proceedDownloadAnyway = () => {
	showDownloadWarning.value = false
	pendingDownload?.()
	pendingDownload = null
}

const goToSubscription = () => {
	showDownloadWarning.value = false
	pendingDownload = null
	navigateTo('/dashboard/subscription')
}

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

// Déclenche le téléchargement PNG du flyer (remplace l'ancien <a download>)
const downloadFlyerPNG = () => {
	if (!props.game.flyerDesignUrl) return
	const link = document.createElement('a')
	link.href = props.game.flyerDesignUrl
	link.download = 'flyer.png'
	document.body.appendChild(link)
	link.click()
	link.remove()
}

// Constantes d'impression (fond perdu + traits de coupe pour imprimeur pro).
const BLEED_MM = 3
const CROP_MARK_LENGTH = 5 // mm
const CROP_MARK_OFFSET = 1 // mm entre le trait et le bord du fond perdu

// Traits de coupe aux 4 coins (hors zone visible — repères pour l'imprimeur).
const drawCropMarks = (pdf: any, bleed: number, pageW: number, pageH: number) => {
	pdf.setDrawColor(0, 0, 0)
	pdf.setLineWidth(0.25)
	const offset = CROP_MARK_OFFSET
	// Haut-gauche
	pdf.line(bleed, 0 + offset, bleed, bleed - offset)
	pdf.line(0 + offset, bleed, bleed - offset, bleed)
	// Haut-droite
	pdf.line(pageW - bleed, 0 + offset, pageW - bleed, bleed - offset)
	pdf.line(pageW - offset, bleed, pageW - bleed + offset, bleed)
	// Bas-gauche
	pdf.line(bleed, pageH - offset, bleed, pageH - bleed + offset)
	pdf.line(0 + offset, pageH - bleed, bleed - offset, pageH - bleed)
	// Bas-droite
	pdf.line(pageW - bleed, pageH - offset, pageW - bleed, pageH - bleed + offset)
	pdf.line(pageW - offset, pageH - bleed, pageW - bleed + offset, pageH - bleed)
}

// Convertit l'URL du flyer enregistré (data: ou http R2) en data URL PNG
// utilisable par jsPDF, même en cas de CORS (passe par le proxy backend).
const flyerUrlToDataUrl = async (url: string): Promise<string> => {
	if (url.startsWith('data:')) return url
	let fetchUrl = url
	try {
		const apiBase = config.public.apiUrl || 'http://localhost:4000'
		fetchUrl = `${apiBase}/uploads/proxy?url=${encodeURIComponent(url)}`
	} catch { /* garde l'URL directe */ }
	const response = await fetch(fetchUrl)
	const blob = await response.blob()
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result as string)
		reader.onerror = reject
		reader.readAsDataURL(blob)
	})
}

// PDF "pour impression" = LE FLYER ENREGISTRÉ (flyerDesignUrl), pas une
// régénération du flyer intelligent. Format A6 + fond perdu 3mm + traits de
// coupe (imprimeur pro). Les traits/bleed sont coupés à l'impression finale.
const downloadFlyerPDF = async () => {
	if (!props.game.flyerDesignUrl) {
		showToast(t('games.detail.flyer_save_error'), 'error')
		return
	}
	downloadingPdf.value = true
	try {
		const dataUrl = await flyerUrlToDataUrl(props.game.flyerDesignUrl)

		const { jsPDF } = await import('jspdf')

		// A6 (105 x 148 mm) + fond perdu 3mm de chaque côté.
		const contentW = 105
		const contentH = 148
		const totalW = contentW + BLEED_MM * 2 // 111mm
		const totalH = contentH + BLEED_MM * 2 // 154mm

		const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [totalW, totalH] })
		// L'image couvre toute la page (déborde dans le fond perdu).
		pdf.addImage(dataUrl, 'PNG', 0, 0, totalW, totalH)
		drawCropMarks(pdf, BLEED_MM, totalW, totalH)
		pdf.save(`flyer-${props.game.slug || 'design'}.pdf`)

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
					<div class="flex-1 min-w-0 w-full space-y-4">
						<div class="min-w-0">
							<h3 class="text-sm font-bold text-slate-900 dark:text-white">QR Code</h3>
							<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono truncate">{{ getGameUrl() }}</p>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
							<div class="min-w-0">
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

					<div class="p-4 sm:p-6 flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
						<div class="mx-auto lg:mx-0">
							<img :src="game.flyerDesignUrl" class="w-52 h-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-md" />
						</div>

						<div class="flex-1 space-y-3">
							<p class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ $t('games.detail.flyers_quick_actions') }}</p>

							<div class="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
								<!-- PNG -->
								<button type="button" @click="guardDownload(downloadFlyerPNG)"
									class="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group text-left">
									<div class="flex items-center gap-3">
										<Icon name="ph:file-png" class="text-slate-400" size="16" />
										<div>
											<p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ $t('games.detail.flyers_download_png') }}</p>
											<p class="text-xs text-slate-400">{{ $t('games.detail.flyers_download_png_desc') }}</p>
										</div>
									</div>
									<Icon name="ph:download-simple" class="text-slate-300 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors" size="16" />
								</button>

								<!-- PDF -->
								<button @click="guardDownload(downloadFlyerPDF)" :disabled="downloadingPdf"
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

		<!-- Modal d'avertissement avant téléchargement (non-abonné) -->
		<Teleport to="body">
			<div v-if="showDownloadWarning" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDownloadWarning = false"></div>
				<div class="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 text-center">
					<div class="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-4">
						<Icon name="ph:warning-bold" size="28" class="text-amber-500" />
					</div>
					<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ $t('games.download_warning.title') }}</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{{ $t('games.download_warning.text') }}</p>
					<div class="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2.5 mb-5 leading-snug">
						{{ $t('games.download_warning.red') }}
					</div>
					<button @click="goToSubscription"
						class="w-full px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-lg transition-colors mb-2">
						{{ $t('games.download_warning.activate') }}
					</button>
					<button @click="proceedDownloadAnyway"
						class="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-1.5">
						{{ $t('games.download_warning.anyway') }}
						<Icon name="ph:download-simple" size="15" />
					</button>
				</div>
			</div>
		</Teleport>
	</div>
</template>
