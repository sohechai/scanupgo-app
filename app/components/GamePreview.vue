<script setup lang="ts">
import FortuneWheel from '~/components/game/FortuneWheel.vue'

const props = defineProps<{
	title: string;
	tagline?: string;
	description?: string;
	primaryColor: string;
	backgroundImage?: string | null;
	showPrize?: boolean;
	winningMessage?: string;
	logo?: string | null;
	prizes?: any[];
	googleReviewUrl?: string | null;
}>()

const { t } = useI18n()

// Current preview step
type PreviewStep = 'intro' | 'steps' | 'form' | 'playing' | 'result'
const currentStep = ref<PreviewStep>('intro')

const steps = computed<{ key: PreviewStep; label: string }[]>(() => [
	{ key: 'intro', label: t('components.game_preview.step_intro') },
	{ key: 'steps', label: t('components.game_preview.step_steps') },
	{ key: 'form', label: t('components.game_preview.step_form') },
	{ key: 'playing', label: t('components.game_preview.step_playing') },
	{ key: 'result', label: t('components.game_preview.step_result') }
])

// Wheel State for Preview
const isSpinning = ref(false)
const targetPrizeIndex = ref<number | null>(null)
const hasLost = ref(false)

const startPreviewSpin = () => {
	if (currentStep.value !== 'playing') return
	isSpinning.value = true
	targetPrizeIndex.value = 0 // Just for preview
	hasLost.value = false
}

watch(currentStep, (newStep) => {
	if (newStep === 'playing') {
		setTimeout(startPreviewSpin, 500)
	} else {
		isSpinning.value = false
	}
})

const onSpinEnd = () => {
	isSpinning.value = false
}

// Handle logo URL
const logoUrl = computed(() => {
	if (!props.logo) return null
	return props.logo
})

const displayTitle = computed(() => props.title || t('components.game_preview.default_title'))
const displayTagline = computed(() => props.tagline || t('components.game_preview.default_tagline'))

const imgError = ref(false)
watch(() => props.logo, () => {
	imgError.value = false
})

// Calculate text color
const getContrastColor = (hexColor: string): string => {
	const hex = hexColor.replace('#', '')
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
	return luminance > 0.5 ? '#1e293b' : '#ffffff'
}

const textColor = computed(() => getContrastColor(props.primaryColor || '#00e5ff'))
const buttonTextColor = computed(() => getContrastColor(props.primaryColor || '#00e5ff'))

// Fake prizes
const previewPrizes = computed(() => {
	if (props.prizes && props.prizes.length > 0) {
		return props.prizes
	}
	return [
		{ id: '1', name: '-10%', probability: 30 },
		{ id: '2', name: '-20%', probability: 20 },
		{ id: '3', name: 'Cadeau', probability: 10 }
	]
})
</script>

<template>
	<div class="flex flex-col items-center">
		<!-- Step Navigation Tabs -->
		<div class="flex gap-1 mb-4 bg-slate-800 rounded-lg p-1">
			<button v-for="step in steps" :key="step.key" @click="currentStep = step.key"
				class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
				:class="currentStep === step.key ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'">
				{{ step.label }}
			</button>
		</div>

		<!-- Phone Mockup -->
		<div
			class="mockup-phone border-slate-900 border-[14px] rounded-[2.5rem] h-[580px] w-[290px] bg-slate-950 relative overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
			<!-- Phone Hardware -->
			<div class="h-[32px] w-[3px] bg-slate-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
			<div class="h-[46px] w-[3px] bg-slate-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
			<div class="h-[46px] w-[3px] bg-slate-800 absolute -end-[17px] top-[124px] rounded-e-lg"></div>

			<!-- Screen -->
			<div class="rounded-[2rem] overflow-hidden w-full h-full relative font-display transition-colors duration-500"
				:style="{ backgroundColor: primaryColor || '#00e5ff' }">
				<!-- Background Image -->
				<img v-if="backgroundImage" :src="backgroundImage"
					class="absolute inset-0 w-full h-full object-cover z-0" />

				<!-- Fake Status Bar -->
				<div class="absolute top-0 w-full h-8 px-5 flex justify-between items-center z-20 text-[10px] font-bold tracking-widest opacity-80"
					:style="{ color: textColor }">
					<span>9:41</span>
					<div class="flex gap-1.5">
						<Icon name="ph:cell-signal-full" size="10" />
						<Icon name="ph:wifi-high" size="10" />
						<Icon name="ph:battery-full" size="10" />
					</div>
				</div>

				<!-- STEP 1: INTRO -->
				<div v-if="currentStep === 'intro'"
					class="relative z-10 h-full flex flex-col items-center p-4 pt-10 overflow-hidden"
					:style="{ color: textColor }">

					<!-- Logo -->
					<div v-if="logoUrl && !imgError"
						class="w-14 h-14 bg-white rounded-xl p-1 shadow-lg flex items-center justify-center overflow-hidden mb-2 z-10 shrink-0">
						<img :src="logoUrl" @error="() => { console.log('Logo image error'); imgError = true }"
							@load="() => console.log('Logo loaded successfully')"
							class="w-full h-full object-contain max-w-full max-h-full" />
					</div>
					<div v-else
						class="w-20 h-7 bg-white/30 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center overflow-hidden mb-2 z-10 shrink-0">
					</div>

					<!-- Title -->
					<h1 class="text-sm font-black tracking-tight text-center mb-1 z-10">{{ displayTitle }}</h1>

					<!-- Tagline -->
					<div class="text-center mb-3 z-10">
						<p class="text-[8px] uppercase tracking-wide opacity-90 font-bold px-3 leading-tight">{{
							displayTagline }}</p>
					</div>

					<!-- Button -->
					<div class="w-full px-4 mb-2 z-20">
						<div
							class="bg-slate-900 text-white py-2.5 rounded-full font-black text-[9px] uppercase tracking-wider text-center shadow-lg">
							{{ $t('play.intro.play_button') }}
						</div>
					</div>

					<!-- Wheel (positioned below button) -->
					<div class="wheel-preview-container-intro">
						<FortuneWheel :prizes="previewPrizes" :primary-color="primaryColor || '#00e5ff'"
							:target-prize-index="null" :is-spinning="false" :has-lost="false" :preview-mode="true" />
					</div>

					<!-- Footer -->
					<div class="absolute bottom-2 left-0 right-0 z-10">
						<p class="text-[6px] uppercase tracking-widest opacity-40 text-center">
							{{ $t('play.intro.powered_by') }}
						</p>
					</div>
				</div>

				<!-- STEP 2: STEPS -->
				<div v-else-if="currentStep === 'steps'"
					class="relative z-10 h-full flex flex-col items-center p-4 pt-12" :style="{ color: textColor }">
					<h2 class="text-sm font-bold mb-4">{{ $t('play.steps.heading') }}</h2>

					<div class="space-y-3 w-full">
						<div
							class="bg-white/90 flex items-center gap-3 backdrop-blur-md rounded-xl p-3 border border-white/20">
							<div
								class="border border-black/10 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]">
								1</div>
							<span class="font-medium text-[10px] text-slate-900">{{ $t('play.steps.step1') }}</span>
						</div>

						<div
							class="bg-white/90 flex items-center gap-3 backdrop-blur-md rounded-xl p-3 border border-white/20">
							<div
								class="border border-black/10 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]">
								2</div>
							<span class="font-medium text-[10px] text-slate-900">{{ $t('play.steps.step2') }}</span>
						</div>

						<div
							class="bg-white/90 flex items-center gap-3 backdrop-blur-md rounded-xl p-3 border border-white/20">
							<div
								class="border border-black/10 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]">
								3</div>
							<span class="font-medium text-[10px] text-slate-900">{{ $t('play.steps.step3') }}</span>
						</div>
					</div>

					<div class="w-full mt-auto pb-6">
						<div
							class="bg-black/90 text-white w-full py-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-2">
							<Icon name="ph:google-logo-bold" size="16" />
							{{ $t('play.steps.google_button') }}
						</div>
					</div>
				</div>

				<!-- STEP 3: FORM -->
				<div v-else-if="currentStep === 'form'"
					class="relative z-10 h-full flex flex-col items-center p-4 pt-12" :style="{ color: textColor }">
					<div class="text-center mb-6">
						<h2 class="text-base font-bold">{{ $t('play.form.heading') }}</h2>
						<p class="text-[10px] opacity-80">{{ $t('play.form.subtitle') }}</p>
					</div>

					<div class="space-y-3 w-full">
						<div
							class="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-[10px] opacity-60">
							{{ $t('play.form.first_name_placeholder') }}</div>
						<div
							class="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-[10px] opacity-60">
							{{ $t('play.form.email_placeholder') }}</div>
						<div
							class="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-[10px] opacity-60">
							{{ $t('play.form.phone_placeholder') }}</div>

						<div class="flex items-start gap-3 pt-1">
							<div class="w-4 h-4 border-2 border-white/40 rounded bg-transparent"></div>
							<span class="text-[9px] opacity-80 leading-tight">{{ $t('play.form.email_optin') }}</span>
						</div>
					</div>

					<div class="w-full mt-auto pb-6">
						<div
							class="bg-black/90 text-white w-full py-3 text-[11px] font-bold rounded-xl shadow-lg text-center">
							{{ $t('play.form.submit') }}
						</div>
					</div>
				</div>

				<!-- STEP 4: PLAYING -->
				<div v-else-if="currentStep === 'playing'"
					class="relative z-10 h-full flex flex-col items-center justify-center p-4"
					:style="{ color: textColor }">
					<div class="text-center mb-4">
						<p class="text-[10px] uppercase tracking-widest opacity-60 mb-1">{{ $t('play.playing.spinning') }}</p>
						<h2 class="text-lg font-black italic">{{ $t('play.playing.good_luck_prefix') }}✨{{ $t('play.playing.good_luck_suffix') }}</h2>
					</div>

					<div class="flex-1 flex items-center justify-center overflow-hidden w-full">
						<div class="wheel-preview-container-playing">
							<FortuneWheel :prizes="previewPrizes" :primary-color="primaryColor || '#00e5ff'"
								:target-prize-index="targetPrizeIndex" :is-spinning="isSpinning" :has-lost="hasLost"
								@spin-end="onSpinEnd" />
						</div>
					</div>

					<div class="mt-4 flex items-center gap-2 opacity-70">
						<span class="text-base">🤞</span>
						<span class="text-[10px] font-medium">{{ $t('play.playing.fingers_crossed') }}</span>
					</div>
				</div>

				<!-- STEP 5: RESULT -->
				<div v-else-if="currentStep === 'result'"
					class="relative z-10 h-full flex flex-col items-center justify-center p-4"
					:style="{ color: textColor }">
					<div class="relative mb-6">
						<div class="absolute inset-0 bg-yellow-400 blur-2xl opacity-50"></div>
						<Icon name="ph:trophy-fill" class="text-yellow-400 relative z-10" size="64" />
					</div>

					<h2 class="text-2xl font-black mb-1">{{ $t('play.result.win.title') }}</h2>
					<p class="text-xs opacity-90 mb-6">{{ $t('play.result.win.subtitle') }}</p>

					<div class="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl w-full text-center rotate-1">
						<h3 class="text-2xl font-display font-bold text-brand-600 mb-2">
							{{ previewPrizes[0]?.name || '-10%' }}
						</h3>
						<p class="text-slate-500 text-[10px] mb-4">
							{{ winningMessage || $t('play.result.win.default_message') }}
						</p>

						<div class="pt-4 border-t border-slate-100">
							<div
								class="w-24 h-24 bg-slate-50 border-2 border-slate-200 rounded-lg mx-auto mb-3 flex items-center justify-center opacity-30">
								<Icon name="ph:qr-code" size="48" class="text-slate-400" />
							</div>
							<p class="text-[8px] uppercase font-bold text-slate-400 tracking-wider mb-1">CODE</p>
							<p class="font-mono text-sm font-bold tracking-widest bg-slate-50 py-2 rounded">ABCD-1234
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.wheel-preview-container-intro {
	transform: scale(0.58);
	transform-origin: top center;
	z-index: 1;
	margin-top: 20px;
}

.wheel-preview-container-playing {
	transform: scale(0.45);
	transform-origin: center center;
}

.animate-fade-in-up {
	animation: fadeInUp 0.5s ease-out forwards;
}

@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateY(10px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
