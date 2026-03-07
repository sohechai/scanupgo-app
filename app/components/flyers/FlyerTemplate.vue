<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
	theme: {
		type: String,
		default: 'black', // 'black' | 'red' | 'blue' | 'purple' | 'green'
	},
	game: {
		type: Object,
		required: true
	},
	qrCodeUrl: {
		type: String,
		required: true
	},
	businessName: {
		type: String,
		default: ''
	},
	businessLogo: {
		type: String, // ID or URL
		default: null
	}
})

const config = useRuntimeConfig()
const getAssetUrl = (id: string) => {
	if (!id) return null
	const baseUrl = config.public.directusUrl || 'http://localhost:8055'
	return `${baseUrl}/assets/${id}`
}

const logoUrl = computed(() => props.businessLogo ? getAssetUrl(props.businessLogo) : null)

// Theme definitions with template images
const themes = {
	black: {
		bgGradient: 'from-slate-900 via-black to-black',
		accent: '#fbbf24', // Amber-400
		textStroke: 'black',
		templateImage: '/images/template/template1.png'
	},
	red: {
		bgGradient: 'from-red-900 via-red-950 to-black',
		accent: '#fca5a5', // Red-300
		textStroke: '#450a0a',
		templateImage: '/images/template/template2.png'
	},
	blue: {
		bgGradient: 'from-blue-900 via-slate-900 to-black',
		accent: '#93c5fd', // Blue-300
		textStroke: '#020617',
		templateImage: '/images/template/template3.png'
	},
	purple: {
		bgGradient: 'from-purple-900 via-slate-900 to-black',
		accent: '#d8b4fe', // Purple-300
		textStroke: '#1e1b4b',
		templateImage: '/images/template/template4.png'
	},
	green: {
		bgGradient: 'from-emerald-900 via-slate-900 to-black',
		accent: '#6ee7b7', // Emerald-300
		textStroke: '#022c22',
		templateImage: '/images/template/template5.png'
	}
}

const currentTheme = computed(() => themes[props.theme as keyof typeof themes] || themes.black)

</script>

<template>
	<!-- Flyer Container (A6 Size Ratio: 105mm x 148mm = 1:1.41) -->
	<!-- Using 500px width for preview -> 705px height -->
	<div class="w-[500px] h-[705px] overflow-hidden relative shadow-2xl select-none" :id="`flyer-preview-${theme}`">

		<!-- Background Template Image -->
		<div class="w-full h-full relative">
			<img :src="currentTheme.templateImage" alt="Template" class="w-full h-full object-cover" />

			<!-- Logo positioned at top center -->
			<div
				class="absolute top-[40px] left-1/2 -translate-x-1/2 z-20 w-[200px] h-[80px] flex items-center justify-center">
				<div v-if="logoUrl" class="w-full h-full flex items-center justify-center">
					<img :src="logoUrl" class="max-h-full max-w-full object-contain drop-shadow-2xl" />
				</div>
				<div v-else class="w-full h-full flex items-center justify-center">
					<div class="bg-white/90 px-6 py-3 rounded-xl shadow-lg border-2 border-slate-200">
						<h3 class="text-lg font-bold font-display uppercase tracking-wider text-slate-900">
							{{ businessName || 'VOTRE LOGO' }}
						</h3>
					</div>
				</div>
			</div>

			<!-- Tagline (Hook) -->
			<div class="absolute top-[140px] w-full px-6 text-center z-20">
				<h2 class="font-display font-black text-white italic text-xl uppercase leading-tight drop-shadow-xl"
					style="-webkit-text-stroke: 0.8px black; text-shadow: 0 4px 4px rgba(0,0,0,0.5);">
					{{ game.tagline || 'PARTICIPEZ À NOTRE JEU ET TENTEZ DE GAGNER UN CADEAU' }}
				</h2>
			</div>

			<!-- QR Code positioned in the white square area -->
			<!-- Adjust these coordinates based on where the white square is in your templates -->
			<div class="absolute left-1/2 z-30"
				style="top: 410px; transform: translateX(-50%) rotate(-10deg); right: 90px;">
				<div class="w-[220px] h-[220px] flex items-center justify-center bg-white/95 rounded-lg p-2">
					<img :src="qrCodeUrl" class="w-full h-full object-contain" />
				</div>
			</div>
		</div>

	</div>
</template>
