<script setup lang="ts">
import FortuneWheel from '~/components/game/FortuneWheel.vue'

defineProps<{
  game: any
  business: any
  primaryColor: string
  targetPrizeIndex: number | null
  isSpinning: boolean
  hasLost: boolean
  isLoadingResult: boolean
}>()

const emit = defineEmits<{
  'start-spin': []
  'spin-end': []
}>()
</script>

<template>
  <div class="fixed inset-0 flex flex-col overflow-hidden" :style="{ backgroundColor: primaryColor }">
    <div class="relative z-10 w-full h-full flex flex-col pt-12">

      <!-- Logo -->
      <div class="flex justify-center px-8 shrink-0">
        <img v-if="business?.logo" :src="business.logo" class="h-20 max-w-[280px] object-contain drop-shadow-2xl" />
        <h1 v-else class="text-3xl font-black text-center text-white">{{ game.title }}</h1>
      </div>

      <!-- Tagline "MERCI, BONNE CHANCE !" -->
      <div class="px-5 mt-6 shrink-0 w-full max-w-sm mx-auto">
        <div class="rounded-2xl px-4 py-3 text-center shadow-2xl border border-white/20"
          style="background: linear-gradient(180deg, #e5e5e5 0%, #a3a3a3 100%);">
          <p class="text-[22px] uppercase leading-[1.1]"
            style="font-family: 'Impact', 'Arial Black', sans-serif; color: white; text-shadow: 0px 2px 4px rgba(0,0,0,0.4), 0px 1px 1px rgba(0,0,0,0.8); letter-spacing: 0.5px;">
            {{ $t('play.playing.merci') }}<br>{{ $t('play.playing.bonne_chance') }}
          </p>
        </div>
      </div>

      <!-- Zone principale : bouton avant spin, roue après -->
      <div class="flex-1 flex flex-col items-center justify-center relative">

        <!-- Roue débordant à gauche (avant le spin) -->
        <template v-if="!isSpinning">
          <div class="absolute top-1/2 -translate-y-1/2 -left-[150px] md:-left-[210px] z-10 w-[380px] md:w-[500px] aspect-square">
            <FortuneWheel :prizes="game.prizes" :primary-color="primaryColor" :target-prize-index="null"
              :is-spinning="false" :preview-mode="true" pointer-position="right" />
          </div>

          <!-- Bouton Jouer (droite, comme l'intro) -->
          <div class="absolute right-5 z-20">
            <button @click="emit('start-spin')" :disabled="isLoadingResult"
              class="bg-white text-black text-[22px] uppercase px-6 py-3 rounded-lg shadow-xl transform transition active:scale-95 disabled:opacity-60"
              style="font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: 0.5px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2);">
              <span v-if="isLoadingResult" class="flex items-center gap-2">
                <Icon name="ph:spinner-gap-bold" class="animate-spin" size="20" />
              </span>
              <span v-else>{{ $t('play.intro.play_button') }}</span>
            </button>
          </div>
        </template>

        <!-- Roue centrée (pendant le spin) -->
        <template v-else>
          <div class="w-full max-w-[360px] mx-auto px-4 animate-fade-in">
            <FortuneWheel :prizes="game.prizes" :primary-color="primaryColor"
              :target-prize-index="targetPrizeIndex" :is-spinning="isSpinning" :has-lost="hasLost"
              @spin-end="emit('spin-end')" />
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
