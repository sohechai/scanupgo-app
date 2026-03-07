<script setup lang="ts">
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import FlyerTemplate from './FlyerTemplate.vue'

const props = defineProps<{
	game: any
	business: any
}>()

const config = useRuntimeConfig()

// Flyer state
const selectedTheme = ref('black')
const qrCodeUrl = ref<string>('')
const isGenerating = ref(false)

const themes = [
	{ id: 'black', name: 'Template 1', color: 'bg-slate-900', ring: 'ring-slate-900', preview: '/images/template/template1.png' },
	{ id: 'red', name: 'Template 2', color: 'bg-red-700', ring: 'ring-red-700', preview: '/images/template/template2.png' },
	{ id: 'blue', name: 'Template 3', color: 'bg-blue-600', ring: 'ring-blue-600', preview: '/images/template/template3.png' },
	{ id: 'purple', name: 'Template 4', color: 'bg-purple-600', ring: 'ring-purple-600', preview: '/images/template/template4.png' },
	{ id: 'green', name: 'Template 5', color: 'bg-emerald-600', ring: 'ring-emerald-600', preview: '/images/template/template5.png' },
]

// Compute wheel colors based on game primary color
const wheelStyle = computed(() => {
	const color = props.game.primaryColor || '#000000'
	return {
		color: color,
		opacity: 0.1
	}
})

// Generate QR Code with custom colors and optional logo
const generateQRCode = async () => {
	const gameUrl = `${config.public.siteUrl || window.location.origin}/play/${props.game.slug}`
	const qrColor = props.game.qrCodeColor || props.game.primaryColor || '#000000'
	const qrBgColor = props.game.qrCodeBgColor || '#ffffff'

	// Generate base QR code on canvas
	const canvas = document.createElement('canvas')
	await QRCode.toCanvas(canvas, gameUrl, {
		width: 600,
		margin: 1,
		errorCorrectionLevel: 'H',
		color: {
			dark: qrColor,
			light: qrBgColor
		}
	})

	// If logo is set, overlay it in the center
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
				logo.src = props.game.qrCodeLogoUrl
			})
		}
	}

	qrCodeUrl.value = canvas.toDataURL('image/png')
}

// Generate PDF
const downloadFlyer = async () => {
	isGenerating.value = true

	try {
		// Target specific template ID from component
		const element = document.getElementById(`flyer-preview-${selectedTheme.value}`)
		if (!element) {
			console.error('Element not found:', `flyer-preview-${selectedTheme.value}`)
			return
		}

		const canvas = await html2canvas(element, {
			scale: 2,
			backgroundColor: '#ffffff',
			logging: false,
			useCORS: true
		})

		const imgData = canvas.toDataURL('image/png')
		const pdf = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a6' // Matching the template size logic
		})

		const imgWidth = 105 // A6 width
		const imgHeight = 148 // A6 height

		pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
		pdf.save(`flyer-${props.game.slug}-${selectedTheme.value}.pdf`)
	} catch (error) {
		console.error('Error generating PDF:', error)
		alert('Erreur lors de la génération du PDF')
	} finally {
		isGenerating.value = false
	}
}

// Order flyer (placeholder)
const orderFlyer = () => {
	alert('La commande de flyers sera bientôt disponible !')
}

onMounted(() => {
	generateQRCode()
})

watch(() => props.game.slug, generateQRCode)
watch(() => props.game.primaryColor, generateQRCode)
watch(() => props.game.qrCodeColor, generateQRCode)
watch(() => props.game.qrCodeBgColor, generateQRCode)
watch(() => props.game.qrCodeLogoUrl, generateQRCode)
</script>

<template>
	<div class="space-y-6">
		<!-- Theme Selection -->
		<div>
			<h3 class="text-lg font-display font-bold text-slate-900 mb-4">Choisir un template</h3>
			<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
				<button v-for="theme in themes" :key="theme.id" @click="selectedTheme = theme.id"
					class="flex flex-col items-center gap-2 group relative">
					<!-- Template Preview Image -->
					<div class="w-full aspect-[1/1.41] rounded-lg overflow-hidden shadow-md transition-all duration-300 relative" :class="[
						selectedTheme === theme.id ? 'ring-4 ring-offset-2 ring-brand-600 scale-105' : 'hover:scale-105'
					]">
						<img :src="theme.preview" :alt="theme.name" class="w-full h-full object-cover" />

						<!-- Checkmark overlay when selected -->
						<div v-if="selectedTheme === theme.id"
							class="absolute inset-0 bg-brand-600/20 flex items-center justify-center backdrop-blur-[1px]">
							<div class="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center shadow-lg">
								<Icon name="ph:check-bold" class="text-white" size="24" />
							</div>
						</div>
					</div>
					<span class="text-xs font-bold text-slate-600"
						:class="{ 'text-brand-600': selectedTheme === theme.id }">
						{{ theme.name }}
					</span>
				</button>
			</div>
		</div>

		<!-- Flyer Preview -->
		<div>
			<h3 class="text-lg font-display font-bold text-slate-900 mb-4">Aperçu</h3>

			<div class="bg-slate-100 rounded-xl p-4 md:p-8 flex justify-start md:justify-center overflow-x-auto">
				<!-- Using the Component Component -->
				<div class="shrink-0 shadow-2xl">
					<FlyerTemplate :theme="selectedTheme" :game="game" :qr-code-url="qrCodeUrl"
						:business-name="business?.name" :business-logo="business?.logo" />
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-4">
			<button @click="downloadFlyer" :disabled="isGenerating"
				class="flex-1 px-6 py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-3 text-lg">
				<Icon v-if="isGenerating" name="ph:spinner-gap-bold" class="animate-spin" size="24" />
				<Icon v-else name="ph:download-bold" size="24" />
				{{ isGenerating ? 'Génération du PDF...' : 'Télécharger mon Flyer' }}
			</button>

			<button @click="orderFlyer"
				class="flex-1 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg">
				<Icon name="ph:shopping-cart-bold" size="24" />
				Commander des impressions
			</button>
		</div>
	</div>
</template>

<style scoped>
.animate-slow-spin {
	animation: spin 20s linear infinite;
}

.animate-spin-slow {
	animation: spin 3s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}

	to {
		transform: rotate(360deg);
	}
}
</style>
