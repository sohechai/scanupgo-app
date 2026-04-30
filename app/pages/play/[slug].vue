<script setup lang="ts">
import FortuneWheel from '~/components/game/FortuneWheel.vue'
import QRCode from 'qrcode'

const route = useRoute()
const { $api } = useNuxtApp()
const { t, locale, setLocale } = useI18n()

// Page Meta
definePageMeta({
	layout: 'public'
})

useHead({ title: 'Jouer' })

// Mobile detection - block desktop users (disabled in dev mode)
const isDev = import.meta.dev
const isMobile = ref(true) // Default to true for SSR

const checkMobile = () => {
	if (import.meta.client) {
		// In dev mode, always allow access
		if (isDev) {
			isMobile.value = true
			return
		}

		const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
		// Check for mobile devices
		const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i
		// Also check screen width as fallback
		const isSmallScreen = window.innerWidth <= 768
		isMobile.value = mobileRegex.test(userAgent) || isSmallScreen
	}
}

// Check on mount and resize
onMounted(() => {
	checkMobile()
	window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
	if (import.meta.client) {
		window.removeEventListener('resize', checkMobile)
	}
	if (timerInterval) clearInterval(timerInterval)
})

const slug = route.params.slug as string
const error = ref<string | null>(null)
const game = ref<any>(null)
const business = ref<any>(null)

// Game State - Nouveau flux: intro -> steps -> review_timer -> form -> playing -> result
type GameStep = 'intro' | 'steps' | 'review_timer' | 'form' | 'playing' | 'result'
const step = ref<GameStep>('intro')

// Timer Google Review
const REVIEW_TIMER_SECONDS = 45
const timerSeconds = ref(REVIEW_TIMER_SECONDS)
let timerInterval: ReturnType<typeof setInterval> | null = null

const startReviewTimer = () => {
	timerSeconds.value = REVIEW_TIMER_SECONDS
	timerInterval = setInterval(() => {
		timerSeconds.value--
		if (timerSeconds.value <= 0) {
			clearInterval(timerInterval!)
			timerInterval = null
			step.value = 'form'
		}
	}, 1000)
}

const skipTimer = () => {
	if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
	step.value = 'form'
}
const isWin = ref(false)
const wonPrize = ref<any>(null)
const rateLimitError = ref(false)
const qrCodeDataUrl = ref<string | null>(null)
const showRules = ref(false)


// Wheel State
const isSpinning = ref(false)
const targetPrizeIndex = ref<number | null>(null)
const hasLost = ref(false)

// Form Data
const form = reactive({
	first_name: '',
	email: '',
	phone: '',
	email_opt_in: false,
	sms_opt_in: false
})

// Validation
const canSubmit = computed(() => {
	return form.first_name.length > 1 && (form.email.length > 5 || form.phone.length > 8)
})

// Fetch Game Data
const { data: gameData, error: fetchError } = await useAsyncData(`game-${slug}`, async () => {
	try {
		const gameData = await $api<any>(`/games/slug/${slug}`)

		if (!gameData) {
			throw new Error('Jeu introuvable')
		}

		return {
			game: gameData,
			business: gameData.business || null
		}
	} catch (e: any) {
		console.error('Fetch error:', e)
		throw new Error(e.message || 'Erreur de chargement')
	}
})

if (fetchError.value) {
	error.value = t('play.error.game_not_found')
} else if (gameData.value) {
	game.value = gameData.value.game
	business.value = gameData.value.business
	if (!game.value.active) {
		error.value = t('play.error.game_closed')
	}
}

// Analytics tracking helper
const trackEvent = (eventType: string) => {
	if (!game.value?.business?.id) return
	$api('/stats/collect', {
		method: 'POST',
		body: {
			businessId: game.value.business.id,
			gameId: game.value.id,
			eventType
		}
	}).catch(() => { }) // silent fail
}

// Track page visit on mount
onMounted(() => {
	if (game.value && !error.value) {
		trackEvent('page_visit')
		// Set locale to game's configured language
		if (game.value.gameLanguage) {
			switchLocale(game.value.gameLanguage)
		}
	}
})

// Actions
const goToSteps = () => {
	step.value = 'steps'
}

const openGoogleReview = () => {
	if (game.value?.googleReviewUrl) {
		let url = game.value.googleReviewUrl
		if (!/^https?:\/\//i.test(url)) {
			url = 'https://' + url
		}
		window.open(url, '_blank')
		step.value = 'review_timer'
		startReviewTimer()
	} else {
		step.value = 'form'
	}
}

const submitForm = async () => {
	if (!canSubmit.value) return

	// Track game start
	trackEvent('game_start')

	// Show wheel and start spinning
	step.value = 'playing'
	isSpinning.value = true
	targetPrizeIndex.value = null
	hasLost.value = false
	error.value = null

	try {
		const response = await $api<any>('/gameplay/play', {
			method: 'POST',
			body: {
				gameId: game.value.id,
				playerName: form.first_name,
				playerEmail: form.email || undefined,
				playerPhone: form.phone || undefined,
				playerEmailOptIn: form.email_opt_in,
				playerSmsOptIn: form.sms_opt_in
			}
		})

		// Minimum spin time for effect
		await new Promise(resolve => setTimeout(resolve, 1500))

		if (response.success) {
			isWin.value = response.won
			wonPrize.value = response.prize

			if (isWin.value && wonPrize.value) {
				const index = game.value.prizes.findIndex((p: any) => p.id === wonPrize.value.id)
				if (index !== -1) {
					targetPrizeIndex.value = index
				} else {
					targetPrizeIndex.value = 0
				}

				// Generate QR code for redemption
				if (wonPrize.value.redemptionCode) {
					try {
						qrCodeDataUrl.value = await QRCode.toDataURL(wonPrize.value.redemptionCode, {
							width: 300,
							margin: 2,
							color: {
								dark: '#000000',
								light: '#FFFFFF'
							}
						})
					} catch (err) {
						console.error('Failed to generate QR code:', err)
					}
				}
			} else {
				hasLost.value = true
			}

		} else {
			throw new Error(t('play.error.unknown'))
		}

	} catch (e: any) {
		console.error('Play Error:', e)
		isSpinning.value = false

		if (e?.data?.message?.includes('already played')) {
			rateLimitError.value = true
			error.value = e.data.message
			step.value = 'intro'
		} else {
			error.value = e?.data?.message || t('play.error.unknown')
			step.value = 'intro'
		}
	}
}

const onSpinEnd = () => {
	isSpinning.value = false
	step.value = 'result'
}

// Language selector for players
const playerLocales = [
	{ code: 'fr', flag: '🇫🇷' },
	{ code: 'en', flag: '🇬🇧' },
	{ code: 'ar', flag: '🇲🇦' },
]

const switchLocale = async (code: string) => {
	await setLocale(code as 'fr' | 'en' | 'ar')
	if (import.meta.client) {
		document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
		document.documentElement.lang = code
	}
}

// Styles
const primaryColor = computed(() => game.value?.primaryColor || '#00e5ff')

// Fonction pour calculer la luminosité d'une couleur
const getContrastColor = (hexColor: string): string => {
	const hex = hexColor.replace('#', '')
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
	return luminance > 0.5 ? '#1e293b' : '#ffffff'
}

const buttonTextColor = computed(() => getContrastColor(primaryColor.value))
const textColor = computed(() => getContrastColor(primaryColor.value))

</script>

<template>
	<!-- Desktop Blocking Screen -->
	<div v-if="!isMobile" class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
		:style="{ backgroundColor: primaryColor, color: textColor }">

		<!-- Background pattern -->
		<div class="absolute inset-0 opacity-10">
			<div class="absolute inset-0"
				style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.4&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')">
			</div>
		</div>

		<div class="relative z-10 text-center p-8 max-w-lg">
			<!-- Phone icon -->
			<div class="mb-8 relative">
				<div class="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
				<div
					class="relative bg-white/10 backdrop-blur-sm w-32 h-32 rounded-3xl mx-auto flex items-center justify-center border border-white/20 shadow-2xl">
					<Icon name="ph:device-mobile-fill" size="64" class="opacity-90" />
				</div>
			</div>

			<!-- Message -->
			<h1 class="text-3xl md:text-4xl font-black mb-4">
				{{ $t('play.desktop.heading') }}
			</h1>
			<p class="text-lg opacity-80 mb-8 leading-relaxed">
				{{ $t('play.desktop.description_line1') }}<br>
				{{ $t('play.desktop.description_line2') }}
			</p>

			<!-- Visual hint -->
			<div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
				<div class="flex items-center justify-center gap-4 text-sm opacity-70">
					<Icon name="ph:qr-code" size="24" />
					<span>{{ $t('play.desktop.qr_hint') }}</span>
				</div>
			</div>

			<!-- Business logo if available -->
			<div v-if="business?.logo" class="mt-8">
				<img :src="business.logo" class="h-12 mx-auto opacity-60" />
			</div>
		</div>

		<!-- Footer -->
		<div class="absolute bottom-6 text-xs opacity-40">
			{{ $t('play.powered_by') }}
		</div>
	</div>

	<!-- Mobile Game Content -->
	<div v-else class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-display"
		:style="{ color: textColor }">

		<!-- Background Layer -->
		<div class="absolute inset-0 z-0" :style="{ backgroundColor: primaryColor }"></div>

		<!-- Language Selector -->
		<div class="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 flex gap-1.5">
			<button v-for="lang in playerLocales" :key="lang.code" @click="switchLocale(lang.code)"
				class="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all"
				:class="locale === lang.code ? 'bg-white/40 shadow-md scale-110' : 'bg-white/10 hover:bg-white/25 opacity-60 hover:opacity-100'">
				{{ lang.flag }}
			</button>
		</div>

		<!-- Content Container -->
		<div class="relative z-10 w-full max-w-md p-6 flex flex-col items-center text-center">

			<!-- Error State -->
			<div v-if="error" class="bg-red-500/90 text-white p-6 rounded-2xl shadow-xl w-full mb-8">
				<Icon name="ph:warning-circle-bold" size="48" class="mb-4 mx-auto" />
				<h2 class="text-xl font-bold mb-2">{{ $t('play.error.title') }}</h2>
				<p>{{ error }}</p>
			</div>

			<!-- Loading State -->
			<div v-else-if="!game" class="flex flex-col items-center">
				<Icon name="ph:spinner-gap-bold" class="animate-spin mb-4" size="40" />
				<p>{{ $t('play.loading') }}</p>
			</div>

			<!-- ÉTAPE 1: INTRO -->
			<div v-else-if="step === 'intro'" class="fixed inset-0 flex flex-col overflow-hidden text-white"
				:style="{ backgroundColor: primaryColor }">

				<!-- Content -->
				<div class="relative z-10 w-full h-full flex flex-col pt-12">
					<!-- Logo -->
					<div class="flex justify-center px-8 shrink-0">
						<img v-if="business?.logo" :src="business.logo"
							class="h-20 max-w-[280px] object-contain drop-shadow-2xl" />
						<h1 v-else class="text-3xl font-black text-center text-white">{{ game.title }}</h1>
					</div>

					<!-- Tagline Box -->
					<div class="px-5 mt-6 shrink-0 w-full max-w-sm mx-auto">
						<div class="rounded-2xl px-4 py-3 text-center shadow-2xl border border-white/20"
							style="background: linear-gradient(180deg, #e5e5e5 0%, #a3a3a3 100%);">
							<p class="text-[22px] uppercase leading-[1.1]"
								style="font-family: 'Impact', 'Arial Black', sans-serif; color: white; text-shadow: 0px 2px 4px rgba(0,0,0,0.4), 0px 1px 1px rgba(0,0,0,0.8); letter-spacing: 0.5px;">
								<template v-if="game.tagline">{{ game.tagline }}</template>
								<template v-else>PARTICIPEZ À NOTRE JEU ET<br>TENTEZ DE GAGNER UN CADEAU !</template>
							</p>
						</div>
					</div>

					<!-- Bouton Jouer -->
					<div class="w-full flex justify-end px-5 mt-6 shrink-0 z-20">
						<button @click="goToSteps"
							class="bg-white text-black text-[22px] uppercase px-6 py-3 rounded-lg shadow-xl transform transition active:scale-95 animate-wizz"
							style="font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: 0.5px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);">
							{{ $t('play.intro.play_button') }}
						</button>
					</div>

					<!-- Roue (débordant à gauche) -->
					<div class="absolute top-1/2 -translate-y-1/2 -left-[150px] md:-left-[210px] z-10 w-[380px] md:w-[500px] aspect-square">
						<FortuneWheel :prizes="game.prizes" :primary-color="primaryColor" :target-prize-index="null"
							:is-spinning="false" :preview-mode="true" pointer-position="right" />
					</div>

				</div>

				<!-- Footer fixe -->
				<div
					class="absolute bottom-0 left-0 right-0 h-[60px] bg-[#2a2a2a] flex justify-between items-center px-10 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
					<button @click="showRules = true"
						class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide opacity-90 hover:opacity-100 transition">
						{{ $t('play.intro.rules') }}
					</button>
					<a href="https://scanupgo.com/contact" target="_blank"
						class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide opacity-90 hover:opacity-100 transition">
						{{ $t('play.intro.contact') }}
					</a>
				</div>
			</div>

			<!-- ÉTAPE 2: DESCRIPTION DES ÉTAPES + BOUTON GOOGLE REVIEW -->
			<div v-else-if="step === 'steps'" class="space-y-6 animate-fade-in-up w-full">
				<h2 class="text-2xl font-bold">{{ $t('play.steps.heading') }}</h2>

				<!-- Liste des étapes -->
				<div class="space-y-4 text-left rtl:text-right">
					<div
						class="bg-white/90 flex items-center gap-4 backdrop-blur-md rounded-xl p-4 border border-white/20">
						<div
							class="border border-black/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
							1
						</div>
						<span class="font-medium">{{ $t('play.steps.step1') }}</span>
					</div>

					<div
						class="bg-white/90 flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
						<div
							class="border border-black/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
							2
						</div>
						<span class="font-medium">{{ $t('play.steps.step2') }}</span>
					</div>

					<div
						class="bg-white/90 flex items-center gap-4 backdrop-blur-md rounded-xl p-4 border border-white/20">
						<div
							class="border border-black/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
							3
						</div>
						<span class="font-medium">{{ $t('play.steps.step3') }}</span>
					</div>
				</div>

				<!-- Bouton Noter sur Google -->
				<button @click="openGoogleReview"
					class="bg-black/90 text-white w-full py-4 text-lg font-bold rounded-xl shadow-lg transform transition active:scale-95 hover:shadow-2xl flex items-center justify-center gap-3">
					<Icon name="ph:google-logo-bold" size="24" />
					{{ $t('play.steps.google_button') }}
				</button>

				<!-- Lien pour passer directement au formulaire si pas de Google Review URL -->
				<button v-if="!game.googleReviewUrl" @click="step = 'form'"
					class="text-sm opacity-60 hover:opacity-100 transition underline">
					{{ $t('play.steps.skip') }}
				</button>

				<button @click="step = 'intro'" class="text-sm opacity-60 hover:opacity-100 transition underline">
					{{ $t('play.steps.back') }}
				</button>
			</div>

			<!-- ÉTAPE 2b: TIMER AVIS GOOGLE -->
			<div v-else-if="step === 'review_timer'"
				class="w-full flex flex-col items-center gap-8 animate-fade-in-up py-6">

				<!-- Icône Google animée -->
				<div class="relative">
					<div class="absolute inset-0 bg-white/20 blur-2xl rounded-full animate-pulse"></div>
					<div
						class="relative w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 shadow-xl">
						<Icon name="ph:google-logo-fill" size="44" class="text-white" />
					</div>
				</div>

				<!-- Texte -->
				<div class="text-center space-y-2">
					<h2 class="text-2xl font-black">{{ $t('play.review_timer.title') }}</h2>
					<p class="text-sm opacity-80 leading-relaxed px-4" style="white-space: pre-line">{{
						$t('play.review_timer.subtitle') }}</p>
				</div>

				<!-- Cercle de progression -->
				<div class="relative w-32 h-32">
					<svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
						<!-- Track -->
						<circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8" />
						<!-- Progress -->
						<circle cx="60" cy="60" r="50" fill="none" stroke="white" stroke-width="8"
							stroke-linecap="round" :stroke-dasharray="`${2 * Math.PI * 50}`"
							:stroke-dashoffset="`${2 * Math.PI * 50 * (1 - timerSeconds / REVIEW_TIMER_SECONDS)}`"
							style="transition: stroke-dashoffset 1s linear" />
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-3xl font-black tabular-nums">{{ timerSeconds }}</span>
						<span class="text-xs opacity-70 uppercase tracking-wide">{{ $t('play.review_timer.seconds')
						}}</span>
					</div>
				</div>

				<!-- Étapes mini -->
				<div class="w-full space-y-2 px-2">
					<div class="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
						<Icon name="ph:check-circle-fill" size="20" class="text-green-300 shrink-0" />
						<span class="text-sm font-medium">{{ $t('play.review_timer.step_opened') }}</span>
					</div>
					<div class="flex items-center gap-3 bg-white/25 rounded-xl px-4 py-3 border border-white/30">
						<Icon name="ph:pencil-line-bold" size="20" class="opacity-80 shrink-0" />
						<span class="text-sm font-medium">{{ $t('play.review_timer.step_review') }}</span>
					</div>
					<div class="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 opacity-50">
						<Icon name="ph:arrow-u-up-left-bold" size="20" class="shrink-0" />
						<span class="text-sm font-medium">{{ $t('play.review_timer.step_return') }}</span>
					</div>
				</div>

				<!-- Lien passer (visible après 15s) -->
				<button v-if="timerSeconds <= 30" @click="skipTimer"
					class="text-xs opacity-50 hover:opacity-80 transition underline">
					{{ $t('play.review_timer.already_reviewed') }}
				</button>
			</div>

			<!-- ÉTAPE 3: FORMULAIRE DE COLLECTE DE DONNÉES -->
			<div v-else-if="step === 'form'" class="w-full space-y-6 animate-fade-in-up">
				<div class="text-center mb-4">
					<h2 class="text-2xl font-bold">{{ $t('play.form.heading') }}</h2>
					<p class="text-sm opacity-80">{{ $t('play.form.subtitle') }}</p>
				</div>

				<form @submit.prevent="submitForm" class="space-y-4 text-left rtl:text-right">
					<div class="space-y-1">
						<input v-model="form.first_name" type="text"
							class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:bg-white/20 focus:outline-none focus:border-white/50 transition"
							:style="{ color: textColor }" :placeholder="$t('play.form.first_name_placeholder')">
					</div>

					<div class="space-y-1">
						<input v-model="form.email" type="email"
							class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:bg-white/20 focus:outline-none focus:border-white/50 transition"
							:style="{ color: textColor }" :placeholder="$t('play.form.email_placeholder')">
					</div>

					<div class="space-y-1">
						<input v-model="form.phone" type="tel"
							class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:bg-white/20 focus:outline-none focus:border-white/50 transition"
							:style="{ color: textColor }" :placeholder="$t('play.form.phone_placeholder')">
					</div>

					<div class="pt-2">
						<label class="flex items-start gap-3 cursor-pointer group">
							<div class="relative flex items-center">
								<input v-model="form.email_opt_in" type="checkbox" class="peer sr-only">
								<div class="w-5 h-5 border-2 border-white/40 rounded bg-transparent peer-checked:border-white/80 transition"
									:class="{ 'bg-white/20': form.email_opt_in }">
								</div>
								<Icon name="ph:check-bold" size="12"
									class="absolute left-1 opacity-0 peer-checked:opacity-100 transition"
									:style="{ color: textColor }" />
							</div>
							<span class="text-xs opacity-80 leading-tight pt-0.5">
								{{ $t('play.form.email_optin') }}
							</span>
						</label>
					</div>

					<button type="submit" :disabled="!canSubmit"
						class="bg-black/90 text-white w-full py-4 mt-4 text-lg font-bold rounded-xl shadow-lg transform transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
						{{ $t('play.form.submit') }}
					</button>
				</form>

				<button @click="step = 'steps'" class="text-sm opacity-60 hover:opacity-100 transition underline">
					{{ $t('play.form.back') }}
				</button>
			</div>

			<!-- ÉTAPE 4: ANIMATION DE LA ROUE QUI TOURNE -->
			<div v-else-if="step === 'playing'"
				class="flex flex-col items-center justify-center py-4 animate-fade-in w-full relative">

				<div class="text-center mb-6 animate-fade-in-up">
					<p class="text-sm uppercase tracking-widest opacity-60 mb-1">{{ $t('play.playing.spinning') }}</p>
					<h2 class="text-3xl md:text-4xl font-black drop-shadow-lg">
						{{ $t('play.playing.good_luck_prefix') }}<span class="text-yellow-300">{{ form.first_name
						}}</span>{{ $t('play.playing.good_luck_suffix') }}
					</h2>
				</div>

				<div class="relative">
					<FortuneWheel :prizes="game.prizes" :primary-color="primaryColor"
						:target-prize-index="targetPrizeIndex" :is-spinning="isSpinning" :has-lost="hasLost"
						@spin-end="onSpinEnd" />
				</div>

				<div class="mt-6 flex items-center gap-2 opacity-70">
					<span class="text-2xl">🤞</span>
					<span class="text-sm font-medium">{{ $t('play.playing.fingers_crossed') }}</span>
					<span class="text-2xl">🤞</span>
				</div>
			</div>

			<!-- ÉTAPE 5: RÉSULTAT - GAGNÉ -->
			<div v-else-if="step === 'result' && isWin" class="w-full text-center space-y-6 animate-bounce-in">
				<div class="relative inline-block">
					<div class="absolute inset-0 bg-yellow-400 blur-2xl opacity-50 animate-pulse"></div>
					<Icon name="ph:trophy-fill" class="text-yellow-400 relative z-10 drop-shadow-xl" size="96" />
				</div>

				<div>
					<h2 class="text-4xl font-black mb-2 drop-shadow-md">{{ $t('play.result.win.title') }}</h2>
					<p class="text-xl opacity-90">{{ $t('play.result.win.subtitle') }}</p>
				</div>

				<div
					class="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl rotate-1 transform transition hover:rotate-0">
					<h3 class="text-3xl font-display font-bold text-brand-600 mb-2">{{ wonPrize?.name }}</h3>
					<p class="text-slate-500 font-medium">
						{{ wonPrize?.winningMessage || $t('play.result.win.default_message') }}
					</p>

					<div v-if="qrCodeDataUrl" class="mt-6 pt-6 border-t border-slate-100">
						<p class="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">{{
							$t('play.result.win.qr_instruction') }}</p>
						<div class="flex justify-center mb-4">
							<img :src="qrCodeDataUrl" alt="QR Code"
								class="w-48 h-48 border-4 border-slate-200 rounded-lg shadow-md" />
						</div>
					</div>

					<div class="mt-4 pt-4 border-t border-slate-100">
						<p class="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">{{
							$t('play.result.win.code_instruction') }}</p>
						<p class="font-mono text-2xl font-bold tracking-widest bg-slate-50 py-3 rounded-lg select-all">
							{{ wonPrize?.redemptionCode || 'N/A' }}
						</p>
					</div>
				</div>


				<!-- Redemption delay badge -->
				<div v-if="game?.prizeRedemptionDelayEnabled && game?.prizeRedemptionDelayHours"
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-sm border border-white/20">
					<Icon name="ph:clock-countdown-bold" size="13" />
					{{ $t('play.result.win.expiry_title') }} — {{ game.prizeRedemptionDelayHours }}h
				</div>

				<p class="text-xs opacity-60">{{ $t('play.result.win.save_hint') }}</p>
			</div>

			<!-- ÉTAPE 5: RÉSULTAT - PERDU -->
			<div v-else-if="step === 'result' && !isWin" class="w-full text-center space-y-8 animate-fade-in-up">
				<Icon name="ph:smiley-sad-duotone" class="opacity-60 mb-4" size="80" />

				<div>
					<h2 class="text-3xl font-bold mb-2">{{ $t('play.result.lose.title') }}</h2>
					<p class="text-lg opacity-80">{{ $t('play.result.lose.message') }}</p>
				</div>

				<div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
					<p class="opacity-90">{{ $t('play.result.lose.details') }}</p>
				</div>

				<button @click="step = 'intro'"
					class="px-8 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition">
					{{ $t('play.result.lose.home_button') }}
				</button>
			</div>

		</div>

		<!-- Footer (masqué sur l'intro car intégré dedans) -->
		<div v-if="step !== 'intro'" class="absolute bottom-4 text-[10px] opacity-40 z-10">
			{{ $t('play.powered_by') }}
		</div>
	</div>

	<!-- Modal Règlement -->
	<Teleport to="body">
		<Transition name="modal">
			<div v-if="showRules" class="fixed inset-0 z-[200] flex items-end justify-center"
				@click.self="showRules = false">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showRules = false"></div>
				<div class="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
					<!-- Header -->
					<div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
						<h2 class="text-base font-black text-slate-900 uppercase tracking-wide">Règlement du jeu</h2>
						<button @click="showRules = false"
							class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
							<Icon name="ph:x-bold" size="15" />
						</button>
					</div>
					<!-- Content -->
					<div class="overflow-y-auto px-6 py-5 text-sm text-slate-700 space-y-5 leading-relaxed">
						<p class="text-xs text-slate-400 uppercase tracking-widest font-semibold">En vigueur pendant
							toute la durée d'activation du jeu</p>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 1 — Organisateurs</h3>
							<p>Le jeu-concours sans obligation d'achat est organisé par :</p>
							<ul class="list-disc list-inside mt-1 space-y-1">
								<li><strong>{{ business?.name || 'Le commerçant' }}</strong> (ci-après « l'Organisateur
									»), établissement situé au Royaume du Maroc, responsable de l'opération commerciale
									et des lots ;</li>
								<li><strong>ScanUpGo</strong>, auto-entreprise de droit français (ci-après « la
									Plateforme »), intervenant exclusivement en qualité de prestataire technique pour la
									mise en œuvre numérique du jeu.</li>
							</ul>
							<p class="mt-1">Toute réclamation relative aux lots doit être adressée directement à
								l'Organisateur. ScanUpGo ne peut être tenu responsable des engagements commerciaux de
								l'Organisateur.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 2 — Objet et durée</h3>
							<p>Le présent règlement régit le jeu-concours intitulé <strong>« {{ game?.title }}
									»</strong>, proposé par l'Organisateur à titre promotionnel, sans obligation d'achat
								ni contrepartie financière d'aucune sorte. Le jeu est actif pendant la période définie
								par l'Organisateur sur la Plateforme ; il peut être suspendu ou arrêté à tout moment par
								l'Organisateur.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 3 — Conditions de participation</h3>
							<p>Le jeu est ouvert à toute personne physique majeure (18 ans ou plus), résidant au Royaume
								du Maroc, à l'exclusion :</p>
							<ul class="list-disc list-inside mt-1 space-y-0.5">
								<li>des salariés, collaborateurs et gérants de l'Organisateur ;</li>
								<li>des membres de leur famille directe (conjoint, ascendants, descendants) ;</li>
								<li>des collaborateurs de ScanUpGo.</li>
							</ul>
							<p class="mt-1">La participation est limitée à <strong>une (1) tentative par
									personne</strong> sur la durée du jeu. Toute tentative multiple détectée sera
								automatiquement invalidée sans recours possible.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 4 — Modalités de participation</h3>
							<p>Pour participer, le joueur doit :</p>
							<ol class="list-decimal list-inside mt-1 space-y-1">
								<li>Scanner le QR code mis à disposition par l'Organisateur ;</li>
								<li>Laisser un avis sur Google (étape facultative — aucune note minimale n'est imposée ;
									le joueur peut passer cette étape) ;</li>
								<li>Renseigner les informations demandées (prénom, e-mail ou numéro de téléphone) ;</li>
								<li>Faire tourner la roue de la fortune pour découvrir son résultat.</li>
							</ol>
							<p class="mt-1">Le résultat est déterminé de façon aléatoire par la Plateforme selon les
								probabilités configurées par l'Organisateur. ScanUpGo ne peut être tenu responsable de
								la politique de gains retenue par l'Organisateur.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 5 — Dotations</h3>
							<p>Les lots sont définis, fournis et remis exclusivement par l'Organisateur. La liste et la
								valeur indicative des lots sont disponibles sur demande auprès de l'Organisateur.
								ScanUpGo n'assume aucune responsabilité quant à la nature, la qualité, la disponibilité
								ou la remise des lots. Les lots sont strictement personnels : ils ne sont ni
								échangeables, ni remboursables, ni cessibles à un tiers.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 6 — Remise des lots</h3>
							<p>En cas de gain, un code unique ou un QR code est remis au joueur via la Plateforme. Ce
								justificatif doit être présenté à l'Organisateur dans les délais affichés sur la page de
								résultat. Passé ce délai, le gain est définitivement perdu et ne pourra faire l'objet
								d'aucune réclamation. L'Organisateur se réserve le droit de vérifier l'identité du
								gagnant avant toute remise de lot.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 7 — Responsabilité</h3>
							<p>L'Organisateur et ScanUpGo ne sauraient être tenus responsables de tout incident lié à
								une connexion internet défaillante, à un appareil incompatible, ou à toute circonstance
								indépendante de leur volonté. ScanUpGo se réserve le droit de suspendre, modifier ou
								annuler le jeu en cas de fraude avérée, d'abus, de force majeure ou de problème
								technique majeur, sans qu'aucune indemnité ne soit due aux participants.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 8 — Protection des données personnelles
							</h3>
							<p>Les données collectées (prénom, e-mail, téléphone) sont traitées par l'Organisateur en
								qualité de responsable de traitement, aux fins de gestion du jeu et, sous réserve du
								consentement explicite du participant, à des fins de communication commerciale.</p>
							<p class="mt-1">Conformément à la <strong>loi n° 09-08 relative à la protection des
									personnes physiques à l'égard du traitement des données à caractère
									personnel</strong> (Maroc / CNDP), le participant dispose d'un droit d'accès, de
								rectification et de suppression de ses données en contactant directement l'Organisateur.
							</p>
							<p class="mt-1">ScanUpGo, en tant qu'entité de droit français traitant des données pour le
								compte de l'Organisateur, intervient en qualité de sous-traitant au sens de l'article 28
								du <strong>Règlement Général sur la Protection des Données (RGPD)</strong> et s'engage à
								traiter les données conformément aux instructions de l'Organisateur.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 9 — Litiges et droit applicable</h3>
							<p>Tout litige relatif aux lots ou à l'opération commerciale est soumis au droit marocain et
								relève de la compétence des juridictions du lieu du siège de l'Organisateur au Maroc.
							</p>
							<p class="mt-1">Tout litige relatif à la Plateforme ScanUpGo est soumis au droit français et
								relève de la compétence des juridictions françaises.</p>
							<p class="mt-1">Toute réclamation doit être adressée par écrit à l'Organisateur dans un
								délai de <strong>30 jours</strong> suivant la fin du jeu.</p>
						</section>

						<section>
							<h3 class="font-black text-slate-900 mb-1">Article 10 — Contact</h3>
							<p>Pour toute question relative à ce jeu, contactez l'Organisateur directement en
								établissement ou ScanUpGo via <a href="https://scanupgo.com/contact" target="_blank"
									class="text-blue-600 underline">scanupgo.com/contact</a>.</p>
						</section>

						<p class="text-xs text-slate-400 pt-2 border-t border-slate-100">Plateforme technique fournie
							par ScanUpGo (auto-entreprise, France) — <a href="https://scanupgo.com" target="_blank"
								class="underline">scanupgo.com</a></p>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.animate-fade-in-up {
	animation: fadeInUp 0.5s ease-out forwards;
}

.animate-bounce-in {
	animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

.animate-fade-in {
	animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateY(20px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes bounceIn {
	0% {
		opacity: 0;
		transform: scale(0.3);
	}

	50% {
		opacity: 1;
		transform: scale(1.05);
	}

	70% {
		transform: scale(0.9);
	}

	100% {
		transform: scale(1);
	}
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}



@media (min-width: 400px) {
	.wheel-left-preview {
		left: -35%;
		bottom: 2%;
		transform: scale(1);
	}
}

/* Desktop: roue centrée */
@media (min-width: 768px) {
	.wheel-left-preview {
		position: relative;
		left: auto;
		bottom: auto;
		transform: scale(0.85);
	}

	.wheel-left-preview:hover {
		transform: scale(0.87);
	}
}
</style>
