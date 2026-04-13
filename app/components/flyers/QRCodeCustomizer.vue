<script setup lang="ts">
import QRCode from 'qrcode'

interface Props {
	gameUrl: string
	initialColor?: string
	initialBgColor?: string
	initialLogoUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
	initialColor: '#000000',
	initialBgColor: '#ffffff',
	initialLogoUrl: ''
})

const emit = defineEmits<{
	update: [{ qrCodeDataUrl: string; color: string; bgColor: string; logoUrl: string | null }]
	save: [{ color: string; bgColor: string; logoUrl: string | null }]
}>()

const { $api } = useNuxtApp()
const { t } = useI18n()
const { show: showToast } = useToast()

// State
const qrColor = ref(props.initialColor)
const qrBgColor = ref(props.initialBgColor)
const qrLogoUrl = ref<string | null>(props.initialLogoUrl || null)
const qrCodeDataUrl = ref<string | null>(null)
const isGenerating = ref(false)
const isUploading = ref(false)

// Preset colors
const presetColors = [
	{ name: 'Noir', color: '#000000' },
	{ name: 'Bleu', color: '#1e40af' },
	{ name: 'Rouge', color: '#dc2626' },
	{ name: 'Vert', color: '#16a34a' },
	{ name: 'Violet', color: '#7c3aed' },
	{ name: 'Orange', color: '#ea580c' },
	{ name: 'Rose', color: '#db2777' },
	{ name: 'Cyan', color: '#0891b2' },
]

const presetBgColors = [
	{ name: 'Blanc', color: '#ffffff' },
	{ name: 'Gris clair', color: '#f1f5f9' },
	{ name: 'Crème', color: '#fef3c7' },
	{ name: 'Bleu clair', color: '#dbeafe' },
	{ name: 'Rose clair', color: '#fce7f3' },
	{ name: 'Vert clair', color: '#dcfce7' },
]

// Generate QR code with current settings
const generateQRCode = async () => {
	if (!props.gameUrl) return

	isGenerating.value = true
	try {
		// Generate base QR code
		const canvas = document.createElement('canvas')
		await QRCode.toCanvas(canvas, props.gameUrl, {
			width: 400,
			margin: 2,
			errorCorrectionLevel: 'H', // High error correction for logo overlay
			color: {
				dark: qrColor.value,
				light: qrBgColor.value
			}
		})

		// If logo is provided, overlay it in the center
		if (qrLogoUrl.value) {
			const ctx = canvas.getContext('2d')
			if (ctx) {
				const logo = new Image()
				logo.crossOrigin = 'anonymous'

				await new Promise<void>((resolve, reject) => {
					logo.onload = () => {
						// Calculate logo size (30% of QR code)
						const logoSize = canvas.width * 0.30
						const logoX = (canvas.width - logoSize) / 2
						const logoY = (canvas.height - logoSize) / 2

						// Draw white background circle for logo
						ctx.beginPath()
						ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 8, 0, Math.PI * 2)
						ctx.fillStyle = qrBgColor.value
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
					logo.onerror = () => {
						console.error('Failed to load logo')
						resolve() // Continue without logo
					}
					logo.src = qrLogoUrl.value!
				})
			}
		}

		qrCodeDataUrl.value = canvas.toDataURL('image/png')

		// Emit update event
		emit('update', {
			qrCodeDataUrl: qrCodeDataUrl.value,
			color: qrColor.value,
			bgColor: qrBgColor.value,
			logoUrl: qrLogoUrl.value
		})

	} catch (err) {
		console.error('Error generating QR code:', err)
	} finally {
		isGenerating.value = false
	}
}

// Handle logo upload
const handleLogoUpload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (!input.files || input.files.length === 0) return

	const file = input.files[0]

	// Validate file type
	if (!file) return

	if (!file.type.startsWith('image/')) {
		showToast(t('components.qr_customizer.alert_image_only'), 'error')
		return
	}

	// Validate file size (max 2MB)
	if (file.size > 2 * 1024 * 1024) {
		showToast(t('components.qr_customizer.alert_too_large'), 'error')
		return
	}

	isUploading.value = true

	try {
		// Upload to cloud storage
		const formData = new FormData()
		formData.append('file', file)

		const response = await $api<{ url: string }>('/uploads', {
			method: 'POST',
			body: formData
		})

		if (response.url) {
			qrLogoUrl.value = response.url
			await generateQRCode()
		}
	} catch (err) {
		console.error('Error uploading logo:', err)
		showToast(t('components.qr_customizer.error_upload_logo'), 'error')
	} finally {
		isUploading.value = false
	}
}

// Remove logo
const removeLogo = () => {
	qrLogoUrl.value = null
	generateQRCode()
}

// Save settings
const saveSettings = () => {
	emit('save', {
		color: qrColor.value,
		bgColor: qrBgColor.value,
		logoUrl: qrLogoUrl.value
	})
}

// Download QR code as PNG
const downloadQRCode = () => {
	if (!qrCodeDataUrl.value) return

	const link = document.createElement('a')
	link.download = 'qrcode-personnalise.png'
	link.href = qrCodeDataUrl.value
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

// Download QR code as SVG
const downloadQRCodeSVG = async () => {
	if (!props.gameUrl) return

	try {
		const svgString = await QRCode.toString(props.gameUrl, {
			type: 'svg',
			width: 400,
			margin: 2,
			errorCorrectionLevel: 'H',
			color: {
				dark: qrColor.value,
				light: qrBgColor.value
			}
		})

		const blob = new Blob([svgString], { type: 'image/svg+xml' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.download = 'qrcode-personnalise.svg'
		link.href = url
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	} catch (err) {
		console.error('Error generating SVG QR code:', err)
	}
}

// Watch for prop changes
watch(() => props.initialColor, (val) => {
	qrColor.value = val
	generateQRCode()
})

watch(() => props.initialBgColor, (val) => {
	qrBgColor.value = val
	generateQRCode()
})

watch(() => props.initialLogoUrl, (val) => {
	qrLogoUrl.value = val || null
	generateQRCode()
})

// Watch for color changes
watch([qrColor, qrBgColor], () => {
	generateQRCode()
}, { immediate: false })

// Watch for gameUrl changes (important for initial load)
watch(() => props.gameUrl, (newUrl) => {
	if (newUrl) {
		generateQRCode()
	}
}, { immediate: true })

// Generate on mount with nextTick to ensure DOM is ready
onMounted(async () => {
	await nextTick()
	if (props.gameUrl) {
		generateQRCode()
	}
})
</script>

<template>
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- Left: Controls -->
		<div class="space-y-6">
			<!-- QR Code Color -->
			<div>
				<label class="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
					{{ $t('components.qr_customizer.qr_color_label') }}
				</label>
				<div class="flex flex-wrap gap-2 mb-3">
					<button v-for="preset in presetColors" :key="preset.color" @click="qrColor = preset.color"
						:title="preset.name" class="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
						:class="qrColor === preset.color ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 dark:border-slate-600'"
						:style="{ backgroundColor: preset.color }" />
				</div>
				<div class="flex items-center gap-3">
					<input type="color" v-model="qrColor"
						class="w-12 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600" />
					<input type="text" v-model="qrColor" placeholder="#000000"
						class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
				</div>
			</div>

			<!-- Background Color -->
			<div>
				<label class="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
					{{ $t('components.qr_customizer.bg_color_label') }}
				</label>
				<div class="flex flex-wrap gap-2 mb-3">
					<button v-for="preset in presetBgColors" :key="preset.color" @click="qrBgColor = preset.color"
						:title="preset.name" class="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
						:class="qrBgColor === preset.color ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 dark:border-slate-600'"
						:style="{ backgroundColor: preset.color }" />
				</div>
				<div class="flex items-center gap-3">
					<input type="color" v-model="qrBgColor"
						class="w-12 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600" />
					<input type="text" v-model="qrBgColor" placeholder="#ffffff"
						class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
				</div>
			</div>

			<!-- Logo Upload -->
			<div>
				<label class="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
					{{ $t('components.qr_customizer.logo_label') }}
				</label>

				<div v-if="qrLogoUrl" class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl mb-3">
					<img :src="qrLogoUrl"
						class="w-16 h-16 object-contain rounded-lg border border-slate-200 dark:border-slate-600 bg-white" />
					<div class="flex-1">
						<p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ $t('components.qr_customizer.logo_added') }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('components.qr_customizer.logo_click_replace') }}</p>
					</div>
					<button @click="removeLogo"
						class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
						title="Supprimer le logo">
						<Icon name="ph:trash-bold" size="20" />
					</button>
				</div>

				<label
					class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/10 transition-colors">
					<div v-if="isUploading" class="flex flex-col items-center">
						<Icon name="ph:spinner-gap-bold" class="animate-spin text-brand-500 mb-2" size="24" />
						<span class="text-sm text-slate-500 dark:text-slate-400">{{ $t('components.qr_customizer.uploading') }}</span>
					</div>
					<div v-else class="flex flex-col items-center">
						<Icon name="ph:upload-simple-bold" class="text-slate-400 mb-2" size="24" />
						<span class="text-sm text-slate-500 dark:text-slate-400">
							{{ qrLogoUrl ? $t('components.qr_customizer.replace_logo') : $t('components.qr_customizer.add_logo') }}
						</span>
						<span class="text-xs text-slate-400 mt-1">PNG, JPG (max 2 Mo)</span>
					</div>
					<input type="file" accept="image/*" class="hidden" @change="handleLogoUpload"
						:disabled="isUploading" />
				</label>

				<p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
					<Icon name="ph:info" class="inline" size="14" />
					{{ $t('components.qr_customizer.logo_hint') }}
				</p>
			</div>
		</div>

		<!-- Right: Preview -->
		<div class="flex flex-col items-center">
			<div class="mb-4 text-center">
				<span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ $t('components.qr_customizer.preview_label') }}</span>
			</div>

			<div class="p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-xl mb-6 bg-white"
				:style="{ backgroundColor: qrBgColor || '#ffffff' }">
				<div v-if="isGenerating" class="w-48 h-48 flex items-center justify-center bg-white rounded-lg">
					<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-400" size="32" />
				</div>
				<img v-else-if="qrCodeDataUrl" :src="qrCodeDataUrl" class="w-48 h-48 object-contain"
					alt="QR Code" />
				<div v-else class="w-48 h-48 flex items-center justify-center bg-white rounded-lg">
					<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-400" size="32" />
				</div>
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-3 w-full max-w-xs">
				<div class="grid grid-cols-2 gap-2">
					<button @click="downloadQRCode" :disabled="!qrCodeDataUrl || isGenerating"
						class="py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
						<Icon name="ph:download-simple-bold" size="16" />
						PNG
					</button>
					<button @click="downloadQRCodeSVG" :disabled="!props.gameUrl || isGenerating"
						class="py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
						<Icon name="ph:download-simple-bold" size="16" />
						SVG
					</button>
				</div>

				<button @click="saveSettings" :disabled="isGenerating"
					class="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
					<Icon name="ph:plus-circle-bold" size="18" />
					{{ $t('components.qr_customizer.add_to_flyer') }}
				</button>
			</div>
		</div>
	</div>
</template>
