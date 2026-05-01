<script setup lang="ts">
defineProps<{
  game: any
  business: any
  primaryColor: string
  isWin: boolean
  wonPrize: any
  qrCodeDataUrl: string | null
}>()

const emit = defineEmits<{ restart: [] }>()
</script>

<template>
  <!-- GAGNÉ -->
  <div v-if="isWin" class="fixed inset-0 flex flex-col overflow-hidden" :style="{ backgroundColor: primaryColor }">

    <!-- Logo -->
    <div class="relative z-10 flex justify-center pt-6 px-8 shrink-0">
      <img v-if="business?.logo" :src="business.logo" class="h-16 max-w-[240px] object-contain drop-shadow-2xl" />
      <h1 v-else class="text-2xl font-black text-center text-white">{{ game?.title }}</h1>
    </div>

    <!-- Tagline "FÉLICITATIONS !" -->
    <div class="relative z-10 px-5 mt-3 shrink-0 w-full max-w-sm mx-auto">
      <div class="rounded-2xl px-4 py-3 text-center shadow-2xl border border-white/20"
        style="background: linear-gradient(180deg, #e5e5e5 0%, #a3a3a3 100%);">
        <p class="text-[20px] uppercase leading-[1.1]"
          style="font-family: 'Impact', 'Arial Black', sans-serif; color: white; text-shadow: 0px 2px 4px rgba(0,0,0,0.4), 0px 1px 1px rgba(0,0,0,0.8); letter-spacing: 0.5px;">
          {{ $t('play.result.win.title') }}
        </p>
      </div>
    </div>

    <!-- Card résultat — remplit tout l'espace entre tagline et footer -->
    <div class="relative z-10 flex-1 flex flex-col px-4 mt-3 pb-[68px] overflow-hidden min-h-0">
      <div class="bg-[#2a2a2a] rounded-3xl p-4 shadow-2xl flex flex-col items-center text-center gap-3 flex-1 overflow-y-auto min-h-0">

        <!-- Prix gagné -->
        <div class="shrink-0">
          <p class="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">{{ $t('play.result.win.subtitle') }}</p>
          <h2 class="text-white text-xl font-black leading-tight">{{ wonPrize?.name }}</h2>
          <p v-if="wonPrize?.winningMessage" class="text-white/70 text-sm mt-1">{{ wonPrize.winningMessage }}</p>
        </div>

        <!-- QR Code -->
        <div v-if="qrCodeDataUrl" class="flex flex-col items-center gap-1 shrink-0">
          <img :src="qrCodeDataUrl" alt="QR Code"
            class="w-40 h-40 rounded-2xl border-4 border-white/20 shadow-lg bg-white p-1" />
          <p class="text-white/50 text-xs uppercase tracking-widest">{{ $t('play.result.win.qr_instruction') }}</p>
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
          class="flex items-center gap-2 text-white/60 text-xs shrink-0">
          <Icon name="ph:clock-countdown-bold" size="14" />
          <span>{{ $t('play.result.win.expiry_title') }} — {{ game.prizeRedemptionDelayHours }}h</span>
        </div>

        <p class="text-white/40 text-xs shrink-0">{{ $t('play.result.win.save_hint') }}</p>
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
  <div v-else class="fixed inset-0 flex flex-col overflow-hidden" :style="{ backgroundColor: primaryColor }">

    <!-- Logo -->
    <div class="relative z-10 flex justify-center pt-6 px-8 shrink-0">
      <img v-if="business?.logo" :src="business.logo" class="h-16 max-w-[240px] object-contain drop-shadow-2xl" />
      <h1 v-else class="text-2xl font-black text-center text-white">{{ game?.title }}</h1>
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
      <div class="bg-[#2a2a2a] rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-5">
        <Icon name="ph:smiley-sad-duotone" class="text-white/50" size="64" />
        <div>
          <p class="text-white text-lg font-bold leading-snug">{{ $t('play.result.lose.message') }}</p>
          <p class="text-white/50 text-sm mt-2">{{ $t('play.result.lose.details') }}</p>
        </div>
        <button @click="emit('restart')"
          class="w-full py-4 rounded-2xl font-black text-base text-white active:scale-95 transition"
          style="background: rgba(255,255,255,0.15);">
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
