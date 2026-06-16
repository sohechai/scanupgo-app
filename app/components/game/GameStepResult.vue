<script setup lang="ts">
const props = defineProps<{
  game: any
  business: any
  primaryColor: string
  isWin: boolean
  wonPrize: any
  qrCodeDataUrl: string | null
}>()

const emit = defineEmits<{ restart: [] }>()

const isHexColor = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
const isImageBackground = computed(() => {
  const bg = props.game?.backgroundImage
  if (!bg) return false
  return !bg.startsWith('linear-gradient') && !bg.startsWith('radial-gradient') && !isHexColor(bg)
})

const contrastColor = (hexColor: string) => {
  const hex = (hexColor || '').replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return (((r * 299) + (g * 587) + (b * 114)) / 1000) >= 128 ? '#111111' : '#ffffff'
}
const popupColor = computed(() => props.game?.popupColor || '#2a2a2a')
const cardTextColor = computed(() => contrastColor(popupColor.value))

// Confettis générés au montage (écran gagné uniquement)
const CONFETTI_COLORS = ['#fde047', '#f97316', '#ec4899', '#22d3ee', '#a78bfa', '#34d399', '#ffffff']
const confetti = computed(() => {
  if (!props.isWin) return []
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${Math.random() * 0.6}s`,
    duration: `${2.4 + Math.random() * 1.6}s`,
    size: `${6 + Math.random() * 7}px`,
  }))
})
</script>

<template>
  <!-- GAGNÉ -->
  <div v-if="isWin" class="win-screen fixed inset-0 h-[100dvh] flex flex-col overflow-hidden" :style="{ backgroundColor: primaryColor }">

    <!-- Flash lumineux d'ouverture -->
    <div class="win-flash absolute inset-0 z-40 bg-white pointer-events-none"></div>

    <!-- Confettis -->
    <div class="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <span v-for="c in confetti" :key="c.id" class="confetti-piece"
        :style="{ left: c.left, backgroundColor: c.color, animationDelay: c.delay, animationDuration: c.duration, width: c.size, height: c.size }"></span>
    </div>

    <!-- Logo -->
    <div class="relative z-10 flex justify-center pt-6 px-8 shrink-0">
      <img v-if="business?.logo && game?.showLogo !== false" :src="business.logo" class="h-16 max-w-[240px] object-contain drop-shadow-2xl" />
      <h1 v-else-if="!isImageBackground && game?.showLogo !== false" class="text-2xl font-black text-center text-white">{{ game?.title }}</h1>
      <div v-else class="h-16"></div>
    </div>

    <!-- Tagline "FÉLICITATIONS !" -->
    <div class="win-tagline relative z-10 px-5 mt-3 shrink-0 w-full max-w-sm mx-auto">
      <div class="rounded-2xl px-4 py-3 text-center shadow-2xl border border-white/20"
        style="background: linear-gradient(180deg, #e5e5e5 0%, #a3a3a3 100%);">
        <p class="text-[20px] uppercase leading-[1.1]"
          style="font-family: 'Impact', 'Arial Black', sans-serif; color: white; text-shadow: 0px 2px 4px rgba(0,0,0,0.4), 0px 1px 1px rgba(0,0,0,0.8); letter-spacing: 0.5px;">
          {{ $t('play.result.win.title') }}
        </p>
      </div>
    </div>

    <!-- Card résultat — remplit tout l'espace entre tagline et footer -->
    <div class="win-card relative z-10 flex-1 flex flex-col px-4 mt-3 pb-[68px] overflow-hidden min-h-0">
      <div class="rounded-3xl p-4 shadow-2xl flex flex-col items-center justify-center text-center gap-3 flex-1 overflow-y-auto min-h-0"
        :style="{ backgroundColor: popupColor, color: cardTextColor }">

        <!-- Prix gagné -->
        <div class="shrink-0">
          <p class="opacity-60 text-xs font-bold uppercase tracking-widest mb-1">{{ $t('play.result.win.subtitle') }}</p>
          <h2 class="text-xl font-black leading-tight">{{ wonPrize?.name }}</h2>
          <p v-if="wonPrize?.winningMessage" class="opacity-70 text-sm mt-1">{{ wonPrize.winningMessage }}</p>
          <p v-if="wonPrize?.minOrderAmount" class="opacity-60 text-xs mt-1">
            {{ $t('play.result.win.min_order', { amount: Number(wonPrize.minOrderAmount) }) }}
          </p>
        </div>

        <!-- QR Code -->
        <div v-if="qrCodeDataUrl" class="flex flex-col items-center gap-1 shrink-0">
          <img :src="qrCodeDataUrl" alt="QR Code"
            class="w-40 h-40 rounded-2xl border-4 border-white/20 shadow-lg bg-white p-1" />
          <p class="opacity-50 text-xs uppercase tracking-widest">{{ $t('play.result.win.qr_instruction') }}</p>
        </div>

        <!-- Code texte -->
        <div class="w-full bg-[#1a1a1a] rounded-2xl px-4 py-3 shrink-0">
          <p class="text-white/40 text-[10px] uppercase tracking-widest mb-1">{{ $t('play.result.win.code_instruction') }}</p>
          <p class="font-mono text-xl font-black tracking-widest text-white select-all">
            {{ wonPrize?.redemptionCode || 'N/A' }}
          </p>
        </div>

        <!-- Délai de récupération -->
        <div v-if="game?.prizeRedemptionDelayEnabled && game?.prizeRedemptionDelayHours"
          class="flex items-center gap-2 opacity-60 text-xs shrink-0">
          <Icon name="ph:clock-countdown-bold" size="14" />
          <span>{{ $t('play.result.win.expiry_title') }} — {{ game.prizeRedemptionDelayHours }}h</span>
        </div>

        <p class="opacity-40 text-xs shrink-0">{{ $t('play.result.win.save_hint') }}</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="absolute bottom-0 left-0 right-0 h-[60px] bg-[#2a2a2a] flex justify-between items-center px-10 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
      <span class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide">
        {{ $t('play.intro.rules') }}
      </span>
      <a href="https://scanupgo.com/contact" target="_blank"
        class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide">
        {{ $t('play.intro.contact') }}
      </a>
    </div>
  </div>

  <!-- PERDU -->
  <div v-else class="fixed inset-0 h-[100dvh] flex flex-col overflow-hidden" :style="{ backgroundColor: primaryColor }">

    <!-- Logo -->
    <div class="relative z-10 flex justify-center pt-6 px-8 shrink-0">
      <img v-if="business?.logo && game?.showLogo !== false" :src="business.logo" class="h-16 max-w-[240px] object-contain drop-shadow-2xl" />
      <h1 v-else-if="!isImageBackground && game?.showLogo !== false" class="text-2xl font-black text-center text-white">{{ game?.title }}</h1>
      <div v-else class="h-16"></div>
    </div>

    <!-- Tagline "PERDU" -->
    <div class="relative z-10 px-5 mt-3 shrink-0 w-full max-w-sm mx-auto">
      <div class="rounded-2xl px-4 py-3 text-center shadow-2xl border border-white/20"
        style="background: linear-gradient(180deg, #e5e5e5 0%, #a3a3a3 100%);">
        <p class="text-[20px] uppercase leading-[1.1]"
          style="font-family: 'Impact', 'Arial Black', sans-serif; color: white; text-shadow: 0px 2px 4px rgba(0,0,0,0.4); letter-spacing: 0.5px;">
          {{ $t('play.result.lose.title') }}
        </p>
      </div>
    </div>

    <!-- Card résultat perdu — centrée verticalement dans l'espace restant -->
    <div class="relative z-10 flex-1 flex flex-col justify-center px-4 pb-[68px]">
      <div class="rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-5"
        :style="{ backgroundColor: popupColor, color: cardTextColor }">
        <Icon name="ph:smiley-sad-duotone" class="opacity-50" size="64" />
        <div>
          <p class="text-lg font-bold leading-snug">{{ $t('play.result.lose.message') }}</p>
          <p class="opacity-50 text-sm mt-2">{{ $t('play.result.lose.details') }}</p>
        </div>
        <button @click="emit('restart')"
          class="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition border-2"
          :style="{ borderColor: cardTextColor, color: cardTextColor }">
          {{ $t('play.result.lose.home_button') }}
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="absolute bottom-0 left-0 right-0 h-[60px] bg-[#2a2a2a] flex justify-between items-center px-10 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
      <span class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide">
        {{ $t('play.intro.rules') }}
      </span>
      <a href="https://scanupgo.com/contact" target="_blank"
        class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide">
        {{ $t('play.intro.contact') }}
      </a>
    </div>
  </div>
</template>

<style scoped>
/* Écran gagné : entrée qui éclate */
.win-screen {
  animation: win-zoom-in 0.55s cubic-bezier(0.2, 1.2, 0.35, 1) both;
}
@keyframes win-zoom-in {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* Flash blanc d'ouverture */
.win-flash {
  animation: win-flash 0.55s ease-out both;
}
@keyframes win-flash {
  0% { opacity: 0.85; }
  100% { opacity: 0; }
}

/* Tagline FÉLICITATIONS : pop rebondi */
.win-tagline {
  animation: win-pop 0.6s cubic-bezier(0.18, 1.5, 0.4, 1) 0.25s both;
}
@keyframes win-pop {
  0% { transform: scale(0) rotate(-8deg); opacity: 0; }
  70% { transform: scale(1.12) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

/* Carte résultat : montée + fondu */
.win-card {
  animation: win-rise 0.55s cubic-bezier(0.2, 1, 0.3, 1) 0.4s both;
}
@keyframes win-rise {
  0% { transform: translateY(40px) scale(0.95); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

/* Confettis qui tombent */
.confetti-piece {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  opacity: 0;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}
@keyframes confetti-fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(105vh) rotate(720deg); opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
  .win-screen, .win-flash, .win-tagline, .win-card, .confetti-piece { animation: none; opacity: 1; }
  .confetti-piece { display: none; }
}
</style>
