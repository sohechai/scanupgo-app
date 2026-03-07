<script setup lang="ts">
interface Prize {
	name: string
	rank?: number
	probability?: number
}

const props = defineProps<{
	game: any
	businessName?: string
	businessLogo?: string | null
	qrCodeUrl?: string | null
	// Smart Text/Color Options
	primaryColor?: string
	accentColor?: string
	buttonColor?: string
	fontFamily?: string
	prizes?: Prize[]
}>()

const flyerRef = ref<HTMLElement>()
const { $api } = useNuxtApp()

// Use props or fallback (safely handle undefined game)
const backgroundColor = computed(() => props.primaryColor || props.game?.primaryColor || '#fb923c')
const accentColor = computed(() => props.accentColor || props.game?.primaryColor || '#fb923c')
const buttonColor = computed(() => props.buttonColor || props.game?.primaryColor || '#fb923c')
const currentFont = computed(() => props.fontFamily || 'Luckiest Guy')

// Computed for logo and other props (for template use)
const displayLogo = computed(() => props.businessLogo)
const displayBusinessName = computed(() => props.businessName)
const displayQrCodeUrl = computed(() => props.qrCodeUrl)

// Helper to create SVG arc path (for display only)
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
	const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
	return {
		x: centerX + (radius * Math.cos(angleInRadians)),
		y: centerY + (radius * Math.sin(angleInRadians))
	}
}

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
	const start = polarToCartesian(x, y, radius, endAngle)
	const end = polarToCartesian(x, y, radius, startAngle)
	const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
	const d = [
		"M", x, y,
		"L", start.x, start.y,
		"A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
		"L", x, y
	].join(" ")
	return d
}

// Generate flyer using backend Puppeteer service (pixel-perfect rendering)
const generateFlyerOnServer = async (): Promise<string | null> => {
	try {
		// Get prizes from props or game object
		const prizesToSend = props.prizes || props.game?.prizes || []

		const result = await $api<{ url: string }>('/flyer-generator/generate', {
			method: 'POST',
			body: {
				businessName: props.businessName,
				businessLogo: props.businessLogo,
				qrCodeUrl: props.qrCodeUrl,
				primaryColor: backgroundColor.value,
				accentColor: accentColor.value,
				buttonColor: buttonColor.value,
				fontFamily: currentFont.value,
				prizes: prizesToSend.map((p: Prize) => ({
					name: p.name,
					rank: p.rank,
					probability: p.probability
				}))
			}
		})
		return result?.url || null
	} catch (e) {
		console.error('Server-side flyer generation failed', e)
		return null
	}
}

// Expose download methods to parent
defineExpose({
	downloadPNG: async () => {
		try {
			const url = await generateFlyerOnServer()
			if (!url) {
				console.error('Failed to generate flyer')
				return
			}

			// Download the image
			const response = await fetch(url)
			const blob = await response.blob()
			const downloadUrl = URL.createObjectURL(blob)

			const link = document.createElement('a')
			link.download = `flyer-${props.game?.slug || 'jeu'}.png`
			link.href = downloadUrl
			link.click()

			URL.revokeObjectURL(downloadUrl)
		} catch (err) {
			console.error('PNG Export failed', err)
		}
	},
	downloadPDF: async () => {
		try {
			// Get prizes from props or game object
			const prizesToSend = props.prizes || props.game?.prizes || []

			const result = await $api<{ url: string }>('/flyer-generator/generate-pdf', {
				method: 'POST',
				body: {
					businessName: props.businessName,
					businessLogo: props.businessLogo,
					qrCodeUrl: props.qrCodeUrl,
					primaryColor: backgroundColor.value,
					accentColor: accentColor.value,
					buttonColor: buttonColor.value,
					fontFamily: currentFont.value,
					prizes: prizesToSend.map((p: Prize) => ({
						name: p.name,
						rank: p.rank,
						probability: p.probability
					}))
				}
			})

			if (!result?.url) {
				console.error('Failed to generate PDF')
				return
			}

			// Download the PDF
			const response = await fetch(result.url)
			const blob = await response.blob()
			const downloadUrl = URL.createObjectURL(blob)

			const link = document.createElement('a')
			link.download = `flyer-${props.game?.slug || 'jeu'}.pdf`
			link.href = downloadUrl
			link.click()

			URL.revokeObjectURL(downloadUrl)
		} catch (err) {
			console.error('PDF Export failed', err)
		}
	},
	exportImage: async (): Promise<string | null> => {
		// Use server-side generation for pixel-perfect rendering
		return await generateFlyerOnServer()
	}
})
</script>

<template>
	<div class="flex justify-center items-center p-4 bg-slate-100 dark:bg-slate-900 rounded-xl min-h-[600px]">
		<!-- Flyer Container - A6 Ratio - Simplified CSS for html2canvas compatibility -->
		<div ref="flyerRef"
			class="w-[420px] h-[595px] relative overflow-hidden shadow-2xl shrink-0"
			:style="{ backgroundColor: backgroundColor }">

			<!-- Background gradient overlay (simplified for html2canvas) -->
			<div class="absolute inset-0" :style="{ background: `linear-gradient(180deg, ${backgroundColor} 0%, #000000 100%)` }"></div>

			<!-- Top LOGO Section -->
			<div class="absolute top-0 left-0 right-0 h-[140px] flex items-center justify-center z-20">
				<img
					v-if="displayLogo"
					:src="displayLogo"
					crossorigin="anonymous"
					class="h-28 object-contain"
					style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"
					@error="(e: Event) => { console.warn('Logo failed to load:', displayLogo); (e.target as HTMLImageElement).style.display = 'none' }"
				/>
				<h2 v-if="!displayLogo" class="text-2xl font-black text-white uppercase tracking-widest">{{ displayBusinessName || 'LOGO' }}</h2>
			</div>

			<!-- Main Title -->
			<div class="absolute top-[140px] left-0 right-0 z-30 text-center">
				<h1 class="font-black text-4xl text-white uppercase leading-none stroke-text-black"
					:style="{ fontFamily: currentFont }">
					SCANNEZ & GAGNEZ
				</h1>
				<h2 class="font-black text-5xl text-white uppercase leading-none mt-1 stroke-text-black"
					:style="{ fontFamily: currentFont }">
					VOTRE <span class="stroke-text-black"
						:style="{ color: accentColor, fontFamily: currentFont }">CADEAU!</span>
				</h2>
			</div>

			<!-- Wheel Background (Dynamic SVG) - Fixed left position instead of translateX -->
			<div class="absolute z-10" style="top: 180px; left: 20px; width: 380px; height: 380px; opacity: 0.9;">
				<svg viewBox="0 0 100 100" class="w-full h-full" style="filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));">
					<circle cx="50" cy="50" r="48" fill="#333" />
					<g transform="rotate(-22.5 50 50)">
						<template v-for="(segment, i) in 8" :key="i">
							<path :d="describeArc(50, 50, 46, i * 45, (i + 1) * 45)"
								:fill="i % 2 === 0 ? '#ffffff' : backgroundColor" stroke="#000"
								stroke-width="0.5" />
							<g :transform="`rotate(${i * 45 + 22.5} 50 50)`">
								<text x="50" y="20" text-anchor="middle" :fill="i % 2 === 0 ? '#000' : '#fff'"
									class="font-display font-black text-[5px] uppercase"
									style="font-family: 'Luckiest Guy', cursive;">
									{{ i % 2 === 0 ? 'GAGNÉ' : 'PERDU' }}
								</text>
							</g>
						</template>
					</g>
					<circle cx="50" cy="50" r="8" fill="#fff" stroke="#000" stroke-width="2" />
					<circle cx="50" cy="50" r="3" fill="#ccc" />
				</svg>
			</div>

			<!-- 3D Gifts (Left) - No transform rotate -->
			<div class="absolute z-20" style="left: -10px; bottom: 160px; width: 192px; height: 192px;">
				<img src="/images/game-gifts-v2.png" class="w-full h-full object-contain" />
			</div>

			<!-- QR Code Card -->
			<div class="absolute z-30 bg-white rounded-xl p-3" style="right: 30px; bottom: 130px; transform: rotate(-5deg); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
				<div class="w-40 h-40 bg-white flex items-center justify-center">
					<img v-if="displayQrCodeUrl" :src="displayQrCodeUrl" crossorigin="anonymous" class="w-full h-full object-contain" />
					<div v-else class="text-slate-300">QR Code</div>
				</div>
			</div>

			<!-- CTA Button - Centered -->
			<div class="absolute z-30 w-full flex justify-center" style="bottom: 100px;">
				<div class="border-2 border-black text-white px-8 py-2 rounded-xl uppercase font-black text-xl tracking-wide"
					:style="{ backgroundColor: buttonColor, fontFamily: currentFont, boxShadow: '4px 4px 0px rgba(0,0,0,1)', marginRight: '4px' }">
					SCANNE POUR JOUER
				</div>
			</div>

			<!-- Bottom Steps - No mix-blend-mode -->
			<div class="absolute bottom-0 left-0 right-0 h-[89px] z-40 flex items-center justify-around px-4"
				:style="{ backgroundColor: backgroundColor }">
				<!-- Dark overlay without mix-blend-mode -->
				<div class="absolute inset-0" style="background-color: rgba(0,0,0,0.1);"></div>

				<div class="z-20 flex flex-col items-center gap-1">
					<!-- Smartphone icon -->
					<svg width="22" height="28" viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M13 1H3C1.89543 1 1 1.89543 1 3V19C1 20.1046 1.89543 21 3 21H13C14.1046 21 15 20.1046 15 19V3C15 1.89543 14.1046 1 13 1Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M8 17H8.01" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					<div class="flex flex-col leading-none text-black text-center">
						<span class="text-xs font-black">1</span>
						<span class="text-[8px] font-bold uppercase">Scanne<br>le code</span>
					</div>
				</div>

				<div class="h-8 w-px z-20" style="background-color: rgba(0,0,0,0.2);"></div>

				<div class="z-20 flex flex-col items-center gap-1">
					<!-- Spinning wheel icon -->
					<svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M17.5438 14.2498C16.3502 16.3168 14.3845 17.8251 12.0789 18.4428M17.5438 14.2498C18.7372 12.1826 19.0606 9.72612 18.4428 7.42056M17.5438 14.2498L11.4818 10.7498M12.0789 18.4428C9.77338 19.0606 7.31686 18.7372 5.24975 17.5438M12.0789 18.4428L10.2673 11.6816M5.24975 17.5438C3.1827 16.3502 1.6744 14.3845 1.05666 12.0789M5.24975 17.5438L8.74975 11.4818M18.4428 7.42056C17.8251 5.11501 16.3168 3.14926 14.2498 1.95575M18.4428 7.42056L11.6816 9.23215M14.2498 1.95575C12.1826 0.762332 9.72612 0.43892 7.42056 1.05666M14.2498 1.95575L10.7498 8.01775M11.4818 10.7498C11.2165 11.2091 10.7797 11.5443 10.2673 11.6816M11.4818 10.7498C11.747 10.2904 11.8188 9.7445 11.6816 9.23215M1.05666 12.0789C0.43892 9.77338 0.762332 7.31686 1.95575 5.24975M1.05666 12.0789L7.81795 10.2673M1.95575 5.24975C3.14926 3.1827 5.11501 1.6744 7.42056 1.05666M1.95575 5.24975L8.01775 8.74975M8.74975 11.4818C9.20911 11.747 9.755 11.8188 10.2673 11.6816M8.74975 11.4818C8.29041 11.2165 7.95523 10.7797 7.81795 10.2673M7.42056 1.05666L9.23215 7.81795M8.01775 8.74975C7.75255 9.20911 7.68068 9.755 7.81795 10.2673M8.01775 8.74975C8.28298 8.29041 8.71981 7.95523 9.23215 7.81795M10.7498 8.01775C11.2091 8.28298 11.5443 8.71981 11.6816 9.23215M10.7498 8.01775C10.2904 7.75255 9.7445 7.68068 9.23215 7.81795" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					<div class="flex flex-col leading-none text-black text-center">
						<span class="text-xs font-black">2</span>
						<span class="text-[8px] font-bold uppercase">Fais tourner<br>la roue</span>
					</div>
				</div>

				<div class="h-8 w-px z-20" style="background-color: rgba(0,0,0,0.2);"></div>

				<div class="z-20 flex flex-col items-center gap-1">
					<!-- Gift/present icon -->
					<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="black">
						<path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80Z"/>
					</svg>
					<div class="flex flex-col leading-none text-black text-center">
						<span class="text-xs font-black">3</span>
						<span class="text-[8px] font-bold uppercase">Découvre<br>ton cadeau</span>
					</div>
				</div>
			</div>

		</div>
	</div>
</template>

<style scoped>
/* Note: Fonts are loaded in the page head and embedded as base64 during export */

.stroke-text-black {
	/* font-family set dynamically via style binding */
	/* Modern stroke that doesn't eat the fill */
	-webkit-text-stroke: 3px black;
	paint-order: stroke fill;
	/* Fallback/Enhancement shadow */
	text-shadow: 4px 4px 0px #000000;
	letter-spacing: 1px;
}
</style>
