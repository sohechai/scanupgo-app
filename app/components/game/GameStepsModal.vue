<script setup lang="ts">
const props = defineProps<{
  show: boolean
  game: any
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
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="fixed inset-0 z-[150] flex items-end justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="internalStep === 'steps' && emit('close')"></div>

        <!-- Bottom sheet -->
        <div class="sheet-panel relative bg-white rounded-t-3xl w-full max-w-lg shadow-2xl">

          <!-- ÉTAPE : INSTRUCTIONS -->
          <div v-if="internalStep === 'steps'" class="px-6 pt-4 pb-8">
            <div class="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5"></div>

            <h2 class="text-xl font-black text-slate-900 mb-5 text-center">
              {{ $t('play.steps.heading') }}
            </h2>

            <div class="space-y-3 mb-6">
              <div class="flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-3.5">
                <div class="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <span class="text-white font-black text-sm">1</span>
                </div>
                <span class="font-semibold text-slate-800 text-sm">{{ $t('play.steps.step1') }}</span>
              </div>
              <div class="flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-3.5">
                <div class="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <span class="text-white font-black text-sm">2</span>
                </div>
                <span class="font-semibold text-slate-800 text-sm">{{ $t('play.steps.step2') }}</span>
              </div>
              <div class="flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-3.5">
                <div class="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <span class="text-white font-black text-sm">3</span>
                </div>
                <span class="font-semibold text-slate-800 text-sm">{{ $t('play.steps.step3') }}</span>
              </div>
            </div>

            <!-- 5 étoiles -->
            <div class="flex justify-center gap-1 mb-5">
              <span v-for="i in 5" :key="i" class="text-3xl">⭐</span>
            </div>

            <!-- Bouton Google -->
            <button @click="openGoogleReview"
              class="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-3 shadow-lg active:scale-95 transition"
              style="background: #1a1a1a;">
              <Icon name="ph:google-logo-bold" size="22" />
              {{ $t('play.steps.google_button') }}
            </button>

            <!-- Passer si pas d'URL -->
            <button v-if="!game?.googleReviewUrl" @click="emit('done')"
              class="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition text-center underline">
              {{ $t('play.steps.skip') }}
            </button>
          </div>

          <!-- ÉTAPE : TIMER -->
          <div v-else class="px-6 pt-4 pb-8 flex flex-col items-center gap-5">
            <div class="w-10 h-1 rounded-full bg-slate-200"></div>

            <div class="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Icon name="ph:google-logo-fill" size="32" class="text-slate-700" />
            </div>

            <div class="text-center space-y-1">
              <h2 class="text-lg font-black text-slate-900">{{ $t('play.review_timer.title') }}</h2>
              <p class="text-sm text-slate-500 leading-relaxed px-2">{{ $t('play.review_timer.subtitle') }}</p>
            </div>

            <!-- Cercle de progression -->
            <div class="relative w-28 h-28">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="8" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a1a" stroke-width="8"
                  stroke-linecap="round" :stroke-dasharray="`${2 * Math.PI * 50}`"
                  :stroke-dashoffset="`${2 * Math.PI * 50 * (1 - timerSeconds / REVIEW_TIMER_SECONDS)}`"
                  style="transition: stroke-dashoffset 1s linear" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-black tabular-nums text-slate-900">{{ timerSeconds }}</span>
                <span class="text-xs text-slate-400 uppercase tracking-wide">{{ $t('play.review_timer.seconds') }}</span>
              </div>
            </div>

            <!-- Mini steps -->
            <div class="w-full space-y-2">
              <div class="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-2.5">
                <Icon name="ph:check-circle-fill" size="18" class="text-green-500 shrink-0" />
                <span class="text-sm font-medium text-slate-700">{{ $t('play.review_timer.step_opened') }}</span>
              </div>
              <div class="flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-2.5">
                <Icon name="ph:pencil-line-bold" size="18" class="text-slate-500 shrink-0" />
                <span class="text-sm font-medium text-slate-700">{{ $t('play.review_timer.step_review') }}</span>
              </div>
              <div class="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 opacity-40">
                <Icon name="ph:arrow-u-up-left-bold" size="18" class="text-slate-500 shrink-0" />
                <span class="text-sm font-medium text-slate-700">{{ $t('play.review_timer.step_return') }}</span>
              </div>
            </div>

            <button v-if="timerSeconds <= 30" @click="skipTimer"
              class="text-xs text-slate-400 hover:text-slate-600 transition underline">
              {{ $t('play.review_timer.already_reviewed') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active { transition: opacity 0.25s ease; }
.sheet-enter-active .sheet-panel { transition: transform 0.3s cubic-bezier(0.34, 1.1, 0.64, 1); }
.sheet-leave-active { transition: opacity 0.2s ease; }
.sheet-leave-active .sheet-panel { transition: transform 0.2s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel, .sheet-leave-to .sheet-panel { transform: translateY(100%); }
</style>
