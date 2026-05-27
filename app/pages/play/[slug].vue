<script setup lang="ts">
import QRCode from 'qrcode'

const route = useRoute()
const { $api } = useNuxtApp()
const { t, locale, setLocale } = useI18n()

definePageMeta({ layout: 'public', pageTransition: false })
useHead({ title: 'Jouer' })

// Mobile detection
const isDev = import.meta.dev
const isMobile = ref(true)
const checkMobile = () => {
  if (!import.meta.client) return
  if (isDev) { isMobile.value = true; return }
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i
  isMobile.value = mobileRegex.test(navigator.userAgent) || window.innerWidth <= 768
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  setTimeout(() => { showSplash.value = false }, 1400)
})
onUnmounted(() => { if (import.meta.client) window.removeEventListener('resize', checkMobile) })

// Data
const slug = route.params.slug as string
const error = ref<string | null>(null)
const game = ref<any>(null)
const business = ref<any>(null)

type GameStep = 'intro' | 'form' | 'playing' | 'result'
const step = ref<GameStep>('intro')
const showStepsModal = ref(false)
const showRules = ref(false)
const showSplash = ref(true)

// Game state
const isWin = ref(false)
const wonPrize = ref<any>(null)
const qrCodeDataUrl = ref<string | null>(null)
const isSpinning = ref(false)
const isLoadingResult = ref(false)
const targetPrizeIndex = ref<number | null>(null)
const hasLost = ref(false)
const rateLimitError = ref(false)
const sessionId = ref<string | null>(null)

// Fetch
const { data: gameData, error: fetchError } = await useAsyncData(`game-${slug}`, async () => {
  const gameData = await $api<any>(`/games/slug/${slug}`)
  if (!gameData) throw new Error('Jeu introuvable')
  return { game: gameData, business: gameData.business || null }
})

if (fetchError.value) {
  error.value = t('play.error.game_not_found')
} else if (gameData.value) {
  game.value = gameData.value.game
  business.value = gameData.value.business
  if (!game.value.active) error.value = t('play.error.game_closed')
}

// Analytics
const trackEvent = (eventType: string) => {
  if (!game.value?.business?.id) return
  $api('/stats/collect', { method: 'POST', body: { businessId: game.value.business.id, gameId: game.value.id, eventType } }).catch(() => {})
}

onMounted(() => {
  if (game.value && !error.value) {
    trackEvent('page_visit')
    if (game.value.gameLanguage) switchLocale(game.value.gameLanguage)
  }
})

// Locale
const playerLocales = [{ code: 'fr', flag: '🇫🇷' }, { code: 'en', flag: '🇬🇧' }, { code: 'ar', flag: '🇲🇦' }]
const switchLocale = async (code: string) => {
  await setLocale(code as 'fr' | 'en' | 'ar')
  if (import.meta.client) {
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = code
  }
}

// Colors
const primaryColor = computed(() => game.value?.primaryColor || '#00e5ff')
const getContrastColor = (hex: string) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}
const textColor = computed(() => getContrastColor(primaryColor.value))

// Actions
const onStepsDone = () => {
  showStepsModal.value = false
  step.value = 'form'
}

const submitForm = async (formData: { first_name: string; email: string; phone: string; email_opt_in: boolean; sms_opt_in: boolean }) => {
  trackEvent('game_start')
  step.value = 'playing'
  isLoadingResult.value = true
  isSpinning.value = false
  targetPrizeIndex.value = null
  hasLost.value = false
  error.value = null

  try {
    const response = await $api<any>('/gameplay/play', {
      method: 'POST',
      body: {
        gameId: game.value.id,
        playerName: formData.first_name,
        playerEmail: formData.email || undefined,
        playerPhone: formData.phone || undefined,
        playerEmailOptIn: formData.email_opt_in,
        playerSmsOptIn: formData.sms_opt_in
      }
    })

    if (response.success) {
      sessionId.value = response.session?.id || null
      isWin.value = response.won
      wonPrize.value = response.prize
      if (isWin.value && wonPrize.value) {
        const idx = game.value.prizes.findIndex((p: any) => p.id === wonPrize.value.id)
        targetPrizeIndex.value = idx !== -1 ? idx : 0
        if (wonPrize.value.redemptionCode) {
          try {
            const redeemUrl = `${window.location.origin}/redeem/${wonPrize.value.redemptionCode}`
            qrCodeDataUrl.value = await QRCode.toDataURL(redeemUrl, { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
          } catch {}
        }
      } else {
        hasLost.value = true
      }
    } else {
      throw new Error(t('play.error.unknown'))
    }
  } catch (e: any) {
    if (e?.data?.message?.includes('already played')) {
      rateLimitError.value = true
      error.value = e.data.message
    } else {
      error.value = e?.data?.message || t('play.error.unknown')
    }
    step.value = 'intro'
  } finally {
    isLoadingResult.value = false
  }
}

const startSpin = () => { isSpinning.value = true }
const onSpinEnd = () => {
  isSpinning.value = false
  step.value = 'result'
  if (isWin.value && sessionId.value) {
    $api('/gameplay/notify', { method: 'POST', body: { sessionId: sessionId.value } }).catch(() => {})
  }
}
</script>

<template>
  <!-- Desktop block -->
  <div v-if="!isMobile" class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
    :style="{ backgroundColor: primaryColor, color: textColor }">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute inset-0"
        style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.4&quot;%3E%3Cpath d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')">
      </div>
    </div>
    <div class="relative z-10 text-center p-8 max-w-lg">
      <div class="mb-8 relative">
        <div class="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
        <div class="relative bg-white/10 backdrop-blur-sm w-32 h-32 rounded-3xl mx-auto flex items-center justify-center border border-white/20 shadow-2xl">
          <Icon name="ph:device-mobile-fill" size="64" class="opacity-90" />
        </div>
      </div>
      <h1 class="text-3xl md:text-4xl font-black mb-4">{{ $t('play.desktop.heading') }}</h1>
      <p class="text-lg opacity-80 mb-8 leading-relaxed">
        {{ $t('play.desktop.description_line1') }}<br>{{ $t('play.desktop.description_line2') }}
      </p>
      <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div class="flex items-center justify-center gap-4 text-sm opacity-70">
          <Icon name="ph:qr-code" size="24" />
          <span>{{ $t('play.desktop.qr_hint') }}</span>
        </div>
      </div>
      <div v-if="business?.logo" class="mt-8">
        <img :src="business.logo" class="h-12 mx-auto opacity-60" />
      </div>
    </div>
    <div class="absolute bottom-6 text-xs opacity-40">{{ $t('play.powered_by') }}</div>
  </div>

  <!-- Mobile -->
  <div v-else class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-display"
    :style="{ color: textColor }">
    <div class="absolute inset-0 z-0" :style="{ backgroundColor: primaryColor }"></div>

    <!-- Langue -->
    <div class="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 flex gap-1.5">
      <button v-for="lang in playerLocales" :key="lang.code" @click="switchLocale(lang.code)"
        class="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all"
        :class="locale === lang.code ? 'bg-white/40 shadow-md scale-110' : 'bg-white/10 hover:bg-white/25 opacity-60 hover:opacity-100'">
        {{ lang.flag }}
      </button>
    </div>

    <!-- Contenu selon l'étape -->
    <div class="relative z-10 w-full max-w-md p-6 flex flex-col items-center text-center">

      <!-- Erreur / Loading -->
      <div v-if="error && step === 'intro'" class="bg-red-500/90 text-white p-6 rounded-2xl shadow-xl w-full mb-8">
        <Icon name="ph:warning-circle-bold" size="48" class="mb-4 mx-auto" />
        <h2 class="text-xl font-bold mb-2">{{ $t('play.error.title') }}</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="!game" class="flex flex-col items-center">
        <Icon name="ph:spinner-gap-bold" class="animate-spin mb-4" size="40" />
        <p>{{ $t('play.loading') }}</p>
      </div>

      <!-- Steps -->
      <template v-else>
        <GameStepIntro v-if="step === 'intro'"
          :game="game" :business="business" :primary-color="primaryColor" :error="rateLimitError ? error : null"
          @go-to-steps="showStepsModal = true"
          @show-rules="showRules = true" />

        <div v-else-if="step === 'form'" class="w-full">
          <GameStepForm :game="game" :primary-color="primaryColor" :text-color="textColor"
            @submit="submitForm" @back="showStepsModal = true; step = 'intro'" />
        </div>

        <GameStepPlaying v-else-if="step === 'playing'"
          :game="game" :business="business" :primary-color="primaryColor"
          :target-prize-index="targetPrizeIndex" :is-spinning="isSpinning"
          :has-lost="hasLost" :is-loading-result="isLoadingResult"
          @start-spin="startSpin" @spin-end="onSpinEnd" @show-rules="showRules = true" />

        <GameStepResult v-else-if="step === 'result'"
          :game="game" :business="business" :primary-color="primaryColor"
          :is-win="isWin" :won-prize="wonPrize" :qr-code-data-url="qrCodeDataUrl"
          @restart="step = 'intro'" />
      </template>
    </div>

    <div v-if="step === 'form' || step === 'result'" class="absolute bottom-4 text-[10px] opacity-40 z-10">
      {{ $t('play.powered_by') }}
    </div>
  </div>

  <!-- Modals -->
  <GameStepsModal :show="showStepsModal" :game="game" :business="business"
    @close="showStepsModal = false"
    @done="onStepsDone" />

  <GameRulesModal :show="showRules" :game="game" :business="business"
    @close="showRules = false" />

  <!-- Splash screen -->
  <Transition name="splash">
    <div v-if="showSplash" class="fixed inset-0 z-[500] flex items-center justify-center" style="background: rgba(255,255,255,0.94);">
      <img v-if="business?.logo" :src="business.logo" class="h-32 max-w-[260px] object-contain logo-spin drop-shadow-2xl" />
      <div v-else class="w-20 h-20 rounded-full logo-spin" :style="{ backgroundColor: primaryColor }"></div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes spin-once {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.logo-spin {
  animation: spin-once 1s ease-in-out 1 forwards;
}
.splash-leave-active { transition: opacity 0.5s ease; }
.splash-leave-to { opacity: 0; }
</style>
