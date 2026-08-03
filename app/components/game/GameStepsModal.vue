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

const ACTION_TIMER_SECONDS = 45

const { t, te } = useI18n()

// Libellés prédéfinis et traduits par type de réseau (le client veut un nom fixe
// par action — ex. Instagram → "Nous suivre" — traduit selon la langue du joueur).
// Le type "other" (lien libre) garde le texte saisi en configuration.
const actionMessage = (a: { type: string; clientMessage: string }) => {
  const key = `play.actions.${a.type}.message`
  return te(key) ? t(key) : (a.clientMessage || '')
}
const actionButton = (a: { type: string; buttonText: string }) => {
  const key = `play.actions.${a.type}.button`
  return te(key) ? t(key) : (a.buttonText || '')
}

interface Action { id: string; type: string; link: string; clientMessage: string; buttonText: string; isPrincipal: boolean }

// Actions du jeu (triées principal d'abord) ; fallback ancien champ Google
const actions = computed<Action[]>(() => {
  const list = props.game?.actions as Action[] | undefined
  if (list && list.length) return list
  if (props.game?.googleReviewUrl) {
    return [{ id: 'google-legacy', type: 'google', link: props.game.googleReviewUrl, clientMessage: 'Laissez-nous un avis Google', buttonText: 'Notez sur Google', isPrincipal: true }]
  }
  return []
})

// Index de l'action affichée + état du timer de l'action courante
const currentIndex = ref(0)
const phase = ref<'idle' | 'pending'>('idle') // idle = pas encore cliqué, pending = timer en cours
const remaining = ref(ACTION_TIMER_SECONDS)
let timer: ReturnType<typeof setInterval> | null = null

const current = computed<Action | undefined>(() => actions.value[currentIndex.value])

const clearTimer = () => { if (timer) { clearInterval(timer); timer = null } }

// Persistance de la progression : sur mobile, ouvrir un réseau navigue hors de la
// page ; au retour, on restaure l'étape pour ne pas tout recommencer.
const storageKey = computed(() => `game-steps-progress-${props.game?.id || props.game?.slug || 'x'}`)

const saveProgress = () => {
  try {
    sessionStorage.setItem(storageKey.value, JSON.stringify({ i: currentIndex.value, p: phase.value }))
  } catch { /* ignore */ }
}
const restoreProgress = () => {
  try {
    const raw = sessionStorage.getItem(storageKey.value)
    if (!raw) return
    const { i, p } = JSON.parse(raw)
    if (typeof i === 'number' && i >= 0 && i < actions.value.length) {
      currentIndex.value = i
      // On reprend toujours en "idle" : le joueur revalide l'action manuellement.
      phase.value = 'idle'
      remaining.value = ACTION_TIMER_SECONDS
    }
  } catch { /* ignore */ }
}
const clearProgress = () => { try { sessionStorage.removeItem(storageKey.value) } catch { /* ignore */ } }

const reset = () => {
  clearTimer()
  currentIndex.value = 0
  phase.value = 'idle'
  remaining.value = ACTION_TIMER_SECONDS
  clearProgress()
}

// Étape suivante (ou fin → débloque la roue)
const goNext = () => {
  clearTimer()
  if (currentIndex.value < actions.value.length - 1) {
    currentIndex.value++
    phase.value = 'idle'
    remaining.value = ACTION_TIMER_SECONDS
    saveProgress()
  } else {
    clearProgress()
    emit('done')
  }
}

// URL de l'action courante, normalisée (ajout du https:// si absent).
// Exposée au template pour être posée dans un vrai <a href>, et non ouverte par
// window.open : un onglet issu de window.open reste marqué comme « popup » par le
// navigateur, et le script d'Instagram le referme quand son app n'est pas
// installée. Un lien cliqué par l'utilisateur produit un onglet ordinaire —
// exactement le cas où coller l'URL à la main fonctionne.
const currentUrl = computed(() => {
  const a = current.value
  if (!a?.link?.trim()) return null
  let url = a.link.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  return /^https?:\/\/.+\..+/i.test(url) ? url : null
})

// Démarre le timer de vérification. Appelé au clic sur le lien : la navigation
// est gérée par le <a> lui-même, on ne fait plus qu'enregistrer la progression.
const openCurrent = () => {
  if (currentUrl.value) saveProgress()
  phase.value = 'pending'
  remaining.value = ACTION_TIMER_SECONDS
  clearTimer()
  timer = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) goNext()
  }, 1000)
}

// Valider manuellement après 30s
const validateNow = () => goNext()

watch(() => props.show, (val) => {
  if (val) {
    // À l'ouverture : reprendre la progression sauvegardée (retour mobile depuis
    // un réseau), sinon repartir de zéro.
    clearTimer()
    currentIndex.value = 0
    phase.value = 'idle'
    remaining.value = ACTION_TIMER_SECONDS
    restoreProgress()
  } else {
    clearTimer()
  }
})
watch(actions, reset)
onUnmounted(clearTimer)

// Les 3 lignes "Suivez les étapes" : action courante + revenir + tourner la roue
const stepLines = computed(() => [
  current.value ? actionMessage(current.value) : '',
  '__comeback__',
  '__spin__',
])

// Couleurs (héritées du jeu)
const contrastColor = (hexColor: string) => {
  const hex = (hexColor || '').replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return ((r * 299 + g * 587 + b * 114) / 1000 >= 128) ? '#111111' : '#ffffff'
}
const popupColor = computed(() => props.game?.popupColor || '#333333')
const buttonColor = computed(() => props.game?.buttonColor || '#facc15')
const cardTextColor = computed(() => contrastColor(popupColor.value))
const buttonTextColor = computed(() => contrastColor(buttonColor.value))
const accent = computed(() => props.game?.buttonColor || '#facc15')

// Pastilles & fond des lignes adaptés au fond de la carte (popupColor) :
// fond sombre -> éléments clairs ; fond clair (jaune…) -> éléments sombres.
const isDarkCard = computed(() => cardTextColor.value === '#ffffff')
const pillBg = computed(() => (isDarkCard.value ? '#ffffff' : '#0f172a'))
const pillText = computed(() => (isDarkCard.value ? '#0f172a' : '#ffffff'))
const stepRowBg = computed(() => (isDarkCard.value ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.12)'))

</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show && current" class="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <!-- Fond NON cliquable pour fermer : c'est la modale du parcours d'actions
             (aller sur le réseau, revenir, tourner la roue). Un clic à côté fermait
             la modale et renvoyait à l'écran principal en perdant la progression. -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

        <div class="modal-panel relative rounded-3xl w-full max-w-sm shadow-2xl mt-8 border-2 border-black"
          :style="{ backgroundColor: popupColor, color: cardTextColor }">

          <!-- Logo du réseau (flottant) -->
          <div class="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-[3px] border-black">
            <GameNetworkIcon :type="current.type" :size="44" />
          </div>

          <div class="px-6 pt-14 pb-7 flex flex-col items-center">
            <!-- Titre -->
            <h2 class="text-[26px] font-black text-center mb-5">{{ $t('play.steps.follow_steps') }}</h2>

            <!-- ====== PHASE IDLE : liste des étapes + bouton action ====== -->
            <template v-if="phase === 'idle'">
              <!-- Compteur d'étapes (si plusieurs actions) -->
              <p v-if="actions.length > 1" class="text-[12px] font-bold opacity-60 mb-3">
                {{ $t('play.steps.action_counter', { current: currentIndex + 1, total: actions.length }) }}
              </p>

              <!-- 3 lignes : action / revenir / tourner -->
              <div class="w-full space-y-3 mb-6">
                <div v-for="(line, idx) in stepLines" :key="idx"
                  class="flex items-center gap-3 rounded-full pr-4 py-2.5 pl-2.5"
                  :style="{ backgroundColor: stepRowBg }">
                  <!-- Pastille adaptée au fond de la carte (claire sur sombre, sombre sur clair) -->
                  <span class="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                    :style="{ backgroundColor: pillBg, color: pillText }">{{ idx + 1 }}</span>
                  <span class="font-bold text-[15px] leading-tight">
                    <template v-if="line === '__comeback__'">{{ $t('play.steps.step_comeback') }}</template>
                    <template v-else-if="line === '__spin__'">{{ $t('play.steps.step_spin') }}</template>
                    <template v-else>{{ line }}</template>
                  </span>
                </div>
              </div>

              <!-- Vrai lien, pas window.open : l'onglet ouvert par un clic
                   utilisateur est un onglet ordinaire, alors qu'un onglet issu de
                   window.open reste marqué « popup » et se fait refermer par le
                   script d'Instagram quand son app n'est pas installée. -->
              <a :href="currentUrl || undefined" target="_blank" rel="noreferrer" @click="openCurrent"
                class="w-full py-4 rounded-[24px] font-black text-[19px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                :style="{ backgroundColor: buttonColor, color: buttonTextColor }">
                {{ actionButton(current) }}
                <Icon name="ph:arrow-up-right-bold" size="16" />
              </a>

              <p class="w-full mt-4 text-center font-extrabold text-[13px] leading-snug opacity-90">
                ⚠️ {{ $t('play.steps.comeback_notice') }}
              </p>
            </template>

            <!-- ====== PHASE PENDING : écran de vérification (logo qui tourne) ====== -->
            <template v-else>
              <h2 class="text-2xl font-black text-center mb-5">{{ $t('play.review_timer.not_done') }}</h2>

              <a :href="currentUrl || undefined" target="_blank" rel="noreferrer" @click="openCurrent"
                class="w-full py-4 rounded-[24px] font-black text-[19px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                :style="{ backgroundColor: buttonColor, color: buttonTextColor }">
                {{ actionButton(current) }}
                <Icon name="ph:arrow-up-right-bold" size="16" />
              </a>

              <!-- Logo de la marque qui tourne -->
              <div v-if="business?.logo" class="relative w-28 h-28 flex items-center justify-center my-5">
                <img :src="business.logo" alt="Logo" class="max-w-full max-h-full object-contain drop-shadow-2xl animate-[spin_4s_linear_infinite]" />
              </div>
              <div v-else class="w-24 h-24 rounded-full flex items-center justify-center animate-[spin_4s_linear_infinite] my-5" :style="{ backgroundColor: accent + '33' }">
                <Icon name="ph:storefront-duotone" size="32" class="text-white/60" />
              </div>

              <p class="text-[15px] font-bold text-center leading-tight mb-3">
                {{ $t('play.review_timer.verifying_action') }}
              </p>

              <!-- Valider manuellement après 30s -->
              <button v-if="remaining <= 30" @click="validateNow"
                class="text-[12px] opacity-60 hover:opacity-100 underline transition">
                {{ $t('play.review_timer.already_reviewed') }}
              </button>
            </template>
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
