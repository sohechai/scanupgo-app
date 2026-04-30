<script setup lang="ts">
defineProps<{
  game: any
  isWin: boolean
  wonPrize: any
  qrCodeDataUrl: string | null
}>()

const emit = defineEmits<{ restart: [] }>()
</script>

<template>
  <!-- GAGNÉ -->
  <div v-if="isWin" class="w-full text-center space-y-6 animate-bounce-in">
    <div class="relative inline-block">
      <div class="absolute inset-0 bg-yellow-400 blur-2xl opacity-50 animate-pulse"></div>
      <Icon name="ph:trophy-fill" class="text-yellow-400 relative z-10 drop-shadow-xl" size="96" />
    </div>

    <div>
      <h2 class="text-4xl font-black mb-2 drop-shadow-md">{{ $t('play.result.win.title') }}</h2>
      <p class="text-xl opacity-90">{{ $t('play.result.win.subtitle') }}</p>
    </div>

    <div class="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl rotate-1 transform transition hover:rotate-0">
      <h3 class="text-3xl font-display font-bold text-brand-600 mb-2">{{ wonPrize?.name }}</h3>
      <p class="text-slate-500 font-medium">{{ wonPrize?.winningMessage || $t('play.result.win.default_message') }}</p>

      <div v-if="qrCodeDataUrl" class="mt-6 pt-6 border-t border-slate-100">
        <p class="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">{{ $t('play.result.win.qr_instruction') }}</p>
        <div class="flex justify-center mb-4">
          <img :src="qrCodeDataUrl" alt="QR Code" class="w-48 h-48 border-4 border-slate-200 rounded-lg shadow-md" />
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-slate-100">
        <p class="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">{{ $t('play.result.win.code_instruction') }}</p>
        <p class="font-mono text-2xl font-bold tracking-widest bg-slate-50 py-3 rounded-lg select-all">
          {{ wonPrize?.redemptionCode || 'N/A' }}
        </p>
      </div>
    </div>

    <div v-if="game?.prizeRedemptionDelayEnabled && game?.prizeRedemptionDelayHours"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-sm border border-white/20">
      <Icon name="ph:clock-countdown-bold" size="13" />
      {{ $t('play.result.win.expiry_title') }} — {{ game.prizeRedemptionDelayHours }}h
    </div>

    <p class="text-xs opacity-60">{{ $t('play.result.win.save_hint') }}</p>
  </div>

  <!-- PERDU -->
  <div v-else class="w-full text-center space-y-8 animate-fade-in-up">
    <Icon name="ph:smiley-sad-duotone" class="opacity-60 mb-4" size="80" />
    <div>
      <h2 class="text-3xl font-bold mb-2">{{ $t('play.result.lose.title') }}</h2>
      <p class="text-lg opacity-80">{{ $t('play.result.lose.message') }}</p>
    </div>
    <div class="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
      <p class="opacity-90">{{ $t('play.result.lose.details') }}</p>
    </div>
    <button @click="emit('restart')"
      class="px-8 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition">
      {{ $t('play.result.lose.home_button') }}
    </button>
  </div>
</template>

<style scoped>
.animate-bounce-in { animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
