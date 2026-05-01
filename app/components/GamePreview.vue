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
				<div class="absolute top-0 w-full h-8 px-5 flex justify-between items-center z-30 text-[10px] font-bold tracking-widest opacity-80"
					:style="{ color: textColor }">
					<span>9:41</span>
					<div class="flex gap-1.5">
						<Icon name="ph:cell-signal-full" size="10" />
						<Icon name="ph:wifi-high" size="10" />
						<Icon name="ph:battery-full" size="10" />
					</div>
				</div>

				<!-- Fake Language Flags -->
				<div class="absolute top-9 right-4 z-20 flex gap-1.5">
					<div class="w-6 h-6 rounded-full flex items-center justify-center text-[12px] bg-white/40 shadow-sm scale-110">🇫🇷</div>
					<div class="w-6 h-6 rounded-full flex items-center justify-center text-[12px] bg-white/10 opacity-60">🇬🇧</div>
					<div class="w-6 h-6 rounded-full flex items-center justify-center text-[12px] bg-white/10 opacity-60">🇲🇦</div>
				</div>

				<!-- STEP 1: INTRO -->
				<div v-if="currentStep === 'intro'" class="relative h-full overflow-hidden flex flex-col">

					<!-- Logo -->
					<div class="relative z-10 flex justify-center pt-7 px-3 shrink-0">
						<img v-if="logoUrl && !imgError" :src="logoUrl" @error="() => { imgError = true }"
							class="h-14 max-w-[180px] object-contain drop-shadow-xl" />
						<h1 v-else class="text-[14px] font-black text-center text-white">{{ displayTitle }}</h1>
					</div>

					<!-- Tagline -->
					<div class="relative z-10 px-4 mt-4 shrink-0 mx-auto w-full max-w-[90%]">
						<div class="rounded-xl px-3 py-2.5 text-center shadow-xl border border-white/20"
							style="background: linear-gradient(180deg, #e5e5e5 0%, #a3a3a3 100%);">
							<p class="text-[12px] uppercase leading-[1.1]"
								style="font-family: 'Impact', 'Arial Black', sans-serif; color: white; text-shadow: 0px 1px 2px rgba(0,0,0,0.4), 0px 1px 1px rgba(0,0,0,0.8); letter-spacing: 0.3px;">
								{{ displayTagline }}
							</p>
						</div>
					</div>

					<!-- Bouton Jouer -->
					<div class="relative z-20 w-full flex justify-end px-4 mt-6 shrink-0">
						<div class="bg-white text-black text-[18px] uppercase px-5 py-3 rounded-lg font-black shadow-lg transform transition active:scale-95 animate-wizz"
							style="font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: 0.3px;">
							{{ $t('play.intro.play_button') }}
						</div>
					</div>

					<!-- Roue débordant à gauche -->
					<div class="absolute top-[60%] -translate-y-1/2 -left-[110px] z-10 w-[280px] aspect-square">
						<FortuneWheel :prizes="previewPrizes" :primary-color="primaryColor || '#00e5ff'"
							:target-prize-index="null" :is-spinning="false" :has-lost="false" :preview-mode="true"
							pointer-position="right" />
					</div>

					<!-- Footer bar -->
					<div class="absolute bottom-0 left-0 right-0 h-[45px] bg-[#2a2a2a] flex justify-between items-center px-8 z-30 shadow-[0_-3px_8px_rgba(0,0,0,0.4)]">
						<span class="text-[11px] font-extrabold text-white underline underline-offset-[3px] decoration-2 tracking-wide">{{ $t('play.intro.rules') }}</span>
						<span class="text-[11px] font-extrabold text-white underline underline-offset-[3px] decoration-2 tracking-wide">{{ $t('play.intro.contact') }}</span>
					</div>
				</div>

				<!-- STEP 2: STEPS -->
				<div v-else-if="currentStep === 'steps'"
					class="relative z-10 h-full flex flex-col items-center justify-center p-4">
					<!-- Backdrop -->
					<div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

					<!-- Centered Modal -->
					<div class="relative bg-[#333333] rounded-3xl w-full max-w-sm shadow-2xl mt-8">
						<!-- Floating Google Logo -->
						<div class="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-[6px] border-[#333333]">
							<svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
								<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
								<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
								<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
								<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
							</svg>
						</div>

						<!-- ÉTAPE : INSTRUCTIONS -->
						<div class="px-5 pt-14 pb-6 flex flex-col items-center">
							<h2 class="text-[20px] font-black text-white mb-5 text-center tracking-wide leading-tight">
								{{ $t('play.steps.heading') }}
							</h2>

							<div class="space-y-3 mb-5 w-full">
								<div class="flex items-center gap-3 bg-[#262626] rounded-2xl px-3 py-3 shadow-inner">
									<div class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
										<span class="text-black font-black text-[13px]">1</span>
									</div>
									<span class="font-bold text-white text-[13px]">{{ $t('play.steps.step1') }}</span>
								</div>
								<div class="flex items-center gap-3 bg-[#262626] rounded-2xl px-3 py-3 shadow-inner">
									<div class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
										<span class="text-black font-black text-[13px]">2</span>
									</div>
									<span class="font-bold text-white text-[13px]">{{ $t('play.steps.step2') }}</span>
								</div>
								<div class="flex items-center gap-3 bg-[#262626] rounded-2xl px-3 py-3 shadow-inner">
									<div class="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
										<span class="text-black font-black text-[13px]">3</span>
									</div>
									<span class="font-bold text-white text-[13px]">{{ $t('play.steps.step3') }}</span>
								</div>
							</div>

							<!-- 5 étoiles -->
							<div class="flex justify-center gap-1 mb-5">
								<span v-for="i in 5" :key="i" class="text-3xl">⭐</span>
							</div>

							<!-- Bouton Google -->
							<button
								class="w-full py-3.5 rounded-[20px] font-black text-[16px] flex items-center justify-center shadow-lg"
								:style="{ backgroundColor: primaryColor || '#1a1a1a', color: buttonTextColor }">
								{{ $t('play.steps.google_button') }}
							</button>
						</div>
					</div>
				</div>

				<!-- STEP 3: FORM -->
				<div v-else-if="currentStep === 'form'"
					class="relative z-10 w-full h-full flex flex-col justify-center items-center p-4">
					<div class="bg-[#333333] rounded-[24px] p-6 shadow-2xl w-full text-center flex flex-col items-center">
						<div class="mb-5">
							<h2 class="text-lg font-black text-white leading-tight">{{ $t('play.form.heading') }}</h2>
							<p class="text-[11px] font-bold text-white mt-1.5">{{ $t('play.form.subtitle') }}</p>
						</div>

						<div class="space-y-3 w-full text-left rtl:text-right">
							<div class="w-full bg-[#262626] border border-[#444] rounded-xl px-3 py-2.5 text-[11px] font-bold text-gray-400">
								{{ $t('play.form.first_name_placeholder') }}
							</div>
							<div class="w-full bg-[#262626] border border-[#444] rounded-xl px-3 py-2.5 text-[11px] font-bold text-gray-400">
								{{ $t('play.form.email_placeholder') }}
							</div>
							<div class="w-full bg-[#262626] border border-[#444] rounded-xl px-3 py-2.5 text-[11px] font-bold text-gray-400">
								{{ $t('play.form.phone_placeholder') }}
							</div>

							<div class="flex items-start gap-2 pt-1">
								<div class="w-3.5 h-3.5 rounded-sm border border-[#666] mt-0.5 shrink-0 bg-transparent"></div>
								<p class="text-[9px] font-bold text-white leading-tight">{{ $t('play.form.email_optin') }}</p>
							</div>

							<button
								class="w-full py-3 mt-4 rounded-[20px] font-black text-[14px] flex items-center justify-center shadow-lg"
								:style="{ backgroundColor: primaryColor || '#d63d4a', color: buttonTextColor }">
								{{ $t('play.form.submit') }}
							</button>
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
.wheel-preview-container-playing {
	transform: scale(0.38);
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
