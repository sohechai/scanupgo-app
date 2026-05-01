<script setup lang="ts">
import FortuneWheel from '~/components/game/FortuneWheel.vue'

const props = defineProps<{
  game: any
  business: any
  primaryColor: string
  error: string | null
}>()

const emit = defineEmits<{
  'go-to-steps': []
  'show-rules': []
}>()

const buttonColor = computed(() => props.game?.buttonColor || '#ffffff')

const backgroundStyle = computed(() => {
  const bg = props.game?.backgroundImage
  if (!bg) return { backgroundColor: props.primaryColor }
  if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) return { background: bg }
  return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
})

const buttonTextColor = computed(() => {
  const hex = buttonColor.value.replace('#', '')
  if (hex.length !== 6) return '#000000'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? '#111111' : '#ffffff'
})
</script>

<template>
  <div class="fixed inset-0 flex flex-col overflow-hidden" :style="backgroundStyle">
    <div v-if="game?.backgroundImage" class="absolute inset-0 bg-black/30 z-0" />
    <!-- Error banner -->
    <div v-if="error" class="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white text-sm text-center px-4 py-3 font-semibold">
      {{ error }}
    </div>

    <div class="relative z-10 w-full h-full flex flex-col pt-12">
      <!-- Logo -->
      <div class="flex justify-center px-8 shrink-0">
        <img v-if="business?.logo" :src="business.logo" class="h-20 max-w-[280px] object-contain drop-shadow-2xl" />
        <h1 v-else class="text-3xl font-black text-center text-white">{{ game.title }}</h1>
      </div>

      <!-- Tagline -->
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
        <button @click="emit('go-to-steps')"
          class="text-[22px] uppercase px-6 py-3 rounded-lg shadow-xl transform transition active:scale-95 animate-wizz"
          :style="{ backgroundColor: buttonColor, color: buttonTextColor, fontFamily: `'Impact', 'Arial Black', sans-serif`, letterSpacing: '0.5px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2)' }">
          {{ $t('play.intro.play_button') }}
        </button>
      </div>

      <!-- Roue débordant à gauche -->
      <div class="absolute top-1/2 -translate-y-1/2 -left-[150px] md:-left-[210px] z-10 w-[380px] md:w-[500px] aspect-square">
        <FortuneWheel :prizes="game.prizes" :primary-color="primaryColor" :target-prize-index="null"
          :wheel-lost-color="game.wheelLostColor" :wheel-prize-color="game.wheelPrizeColor" :wheel-border-color="game.wheelBorderColor" :wheel-pointer-color="game.wheelPointerColor"
          :is-spinning="false" :preview-mode="true" pointer-position="right" />
      </div>
    </div>

    <!-- Footer -->
    <div class="absolute bottom-0 left-0 right-0 h-[60px] bg-[#2a2a2a] flex justify-between items-center px-10 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
      <button @click="emit('show-rules')"
        class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide opacity-90 hover:opacity-100 transition">
        {{ $t('play.intro.rules') }}
      </button>
      <a href="https://scanupgo.com/contact" target="_blank"
        class="text-[15px] font-extrabold text-white underline underline-offset-[5px] decoration-2 tracking-wide opacity-90 hover:opacity-100 transition">
        {{ $t('play.intro.contact') }}
      </a>
    </div>
  </div>
</template>
