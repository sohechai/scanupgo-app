<script setup lang="ts">
const props = defineProps<{
  show: boolean
  game: any
  business?: any
}>()

const emit = defineEmits<{
  close: []
  done: []
}>()

const REVIEW_TIMER_SECONDS = 45
const internalStep = ref<'steps' | 'timer'>('steps')
const timerSeconds = ref(REVIEW_TIMER_SECONDS)
let timerInterval: ReturnType<typeof setInterval> | null = null

const openGoogleReview = () => {
  if (props.game?.googleReviewUrl) {
    let url = props.game.googleReviewUrl
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    window.open(url, '_blank')
  }
  internalStep.value = 'timer'
  timerSeconds.value = REVIEW_TIMER_SECONDS
  timerInterval = setInterval(() => {
    timerSeconds.value--
    if (timerSeconds.value <= 0) {
      clearInterval(timerInterval!)
      timerInterval = null
      emit('done')
    }
  }, 1000)
}

const skipTimer = () => {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  emit('done')
}

watch(() => props.show, (val) => {
  if (!val) {
    internalStep.value = 'steps'
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  }
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const buttonTextColor = computed(() => {
  const hexColor = props.game?.primaryColor || '#1a1a1a'
  const hex = hexColor.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? '#111111' : '#ffffff'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          @click="internalStep === 'steps' && emit('close')"></div>

        <!-- Centered Modal -->
        <div class="modal-panel relative bg-[#333333] rounded-3xl w-full max-w-sm shadow-2xl mt-8 border-2 border-black">

          <!-- Floating Google Logo -->
          <div class="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-[3px] border-black">
            <svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>

          <!-- ÉTAPE : INSTRUCTIONS -->
          <div v-if="internalStep === 'steps'" class="px-6 pt-14 pb-8 flex flex-col items-center">
            <h2 class="text-[22px] font-black text-white mb-6 text-center tracking-wide">
              {{ $t('play.steps.heading') }}
            </h2>

            <div class="space-y-3 mb-6 w-full">
              <div class="flex items-center gap-4 bg-[#262626] rounded-2xl px-4 py-3.5 shadow-inner">
                <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span class="text-black font-black text-[15px]">1</span>
                </div>
                <span class="font-bold text-white text-[15px]">{{ $t('play.steps.step1') }}</span>
              </div>
              <div class="flex items-center gap-4 bg-[#262626] rounded-2xl px-4 py-3.5 shadow-inner">
                <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span class="text-black font-black text-[15px]">2</span>
                </div>
                <span class="font-bold text-white text-[15px]">{{ $t('play.steps.step2') }}</span>
              </div>
              <div class="flex items-center gap-4 bg-[#262626] rounded-2xl px-4 py-3.5 shadow-inner">
                <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span class="text-black font-black text-[15px]">3</span>
                </div>
                <span class="font-bold text-white text-[15px]">{{ $t('play.steps.step3') }}</span>
              </div>
            </div>

            <!-- 5 étoiles -->
            <div class="flex justify-center gap-1 mb-6">
              <span v-for="i in 5" :key="i" class="text-3xl">⭐</span>
            </div>

            <!-- Bouton Google -->
            <button @click="openGoogleReview"
              class="w-full py-4 rounded-[20px] font-black text-[18px] flex items-center justify-center shadow-lg active:scale-95 transition"
              :style="{ backgroundColor: props.game?.primaryColor || '#1a1a1a', color: buttonTextColor }">
              {{ $t('play.steps.google_button') }}
            </button>

            <!-- Passer si pas d'URL -->
            <button v-if="!game?.googleReviewUrl" @click="emit('done')"
              class="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition text-center underline">
              {{ $t('play.steps.skip') }}
            </button>
          </div>

          <!-- ÉTAPE : TIMER -->
          <div v-else class="px-6 pt-12 pb-10 flex flex-col items-center gap-6">

            <h2 class="text-[22px] font-black text-white text-center">
              {{ $t('play.review_timer.not_done') }}
            </h2>

            <button @click="openGoogleReview"
              class="px-8 py-3 rounded-[20px] font-black text-[16px] flex items-center justify-center shadow-lg active:scale-95 transition"
              :style="{ backgroundColor: props.game?.primaryColor || '#1a1a1a', color: buttonTextColor }">
              {{ $t('play.steps.google_button') }}
            </button>

            <!-- Logo -->
            <div v-if="props.business?.logo" class="my-4 relative w-36 h-36 flex items-center justify-center">
              <img :src="props.business.logo" alt="Logo" class="max-w-full max-h-full object-contain drop-shadow-2xl animate-[spin_4s_linear_infinite]" />
            </div>
            <div v-else class="my-2"></div>

            <p class="text-[15px] font-bold text-white text-center leading-tight">
              {{ $t('play.review_timer.verifying_action') }}
            </p>

            <button v-if="timerSeconds <= 30" @click="skipTimer"
              class="mt-2 text-xs text-slate-400 hover:text-white transition underline">
              {{ $t('play.review_timer.already_reviewed') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.1, 0.64, 1); }
.modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95) translateY(10px); }
.modal-enter-to, .modal-leave-from { opacity: 1; transform: scale(1) translateY(0); }
</style>
