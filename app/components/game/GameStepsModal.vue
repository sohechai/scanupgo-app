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

const NET = {
  google: { color: '#4285F4' },
  instagram: { color: '#E1306C' },
  facebook: { color: '#1877F2' },
  tiktok: { color: '#111111' },
  twitter: { color: '#111111' },
  linkedin: { color: '#0A66C2' },
  whatsapp: { color: '#25D366' },
  snapchat: { color: '#FFFC00' },
  tripadvisor: { color: '#00AA6C' },
  other: { color: '#64748b' },
} as const

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

const openCurrent = () => {
  const a = current.value
  if (!a) return
  if (a.link && a.link.trim()) {
    let url = a.link.trim()
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    if (/^https?:\/\/.+\..+/i.test(url)) {
      // Toujours ouvrir le réseau dans un nouvel onglet (comportement attendu).
      const win = window.open(url, '_blank')
      saveProgress()
      // Cas mobile : si l'app native du réseau prend le relais, l'onglet web
      // ouvert reste un about:blank résiduel. On le ferme UNIQUEMENT si la page
      // jeu redevient visible très vite (retour d'app) sans que l'onglet ait
      // été réellement consulté. Si l'utilisateur reste sur l'onglet web
      // (réseau sans app installée), on n'y touche pas.
      if (win) {
        const openedAt = Date.now()
        let leftPage = false
        const onVisibility = () => {
          if (document.visibilityState === 'hidden') {
            leftPage = true
          } else if (document.visibilityState === 'visible' && leftPage) {
            // De retour sur le jeu rapidement -> l'app native a géré l'ouverture,
            // l'onglet web est inutile : on le ferme.
            if (Date.now() - openedAt < 4000) {
              try { if (!win.closed) win.close() } catch { /* ignore */ }
            }
            cleanup()
          }
        }
        const cleanup = () => document.removeEventListener('visibilitychange', onVisibility)
        document.addEventListener('visibilitychange', onVisibility)
        // Filet : on retire l'écouteur après 12s (onglet web normal conservé).
        setTimeout(cleanup, 12000)
      }
    }
  }
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
  current.value?.clientMessage || '',
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

// Logo du réseau courant : Google et X ont un SVG dédié, sinon icône Phosphor colorée
const isGoogle = computed(() => current.value?.type === 'google')
const isX = computed(() => current.value?.type === 'twitter')
const isInstagram = computed(() => current.value?.type === 'instagram')
const isFacebook = computed(() => current.value?.type === 'facebook')
const isTikTok = computed(() => current.value?.type === 'tiktok')
const isLinkedIn = computed(() => current.value?.type === 'linkedin')
const isWhatsApp = computed(() => current.value?.type === 'whatsapp')
const netIconName = (t: string) => ({
  instagram: 'ph:instagram-logo-fill', facebook: 'ph:facebook-logo-fill', tiktok: 'ph:tiktok-logo-fill',
  twitter: 'ph:x-logo-fill', linkedin: 'ph:linkedin-logo-fill', whatsapp: 'ph:whatsapp-logo-fill',
  snapchat: 'ph:snapchat-logo-fill', tripadvisor: 'ph:bird-fill', other: 'ph:link-bold',
}[t] || 'ph:link-bold')
const netColor = (t: string) => (NET as any)[t]?.color || NET.other.color
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show && current" class="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('close')"></div>

        <div class="modal-panel relative rounded-3xl w-full max-w-sm shadow-2xl mt-8 border-2 border-black"
          :style="{ backgroundColor: popupColor, color: cardTextColor }">

          <!-- Logo du réseau (flottant) -->
          <div class="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-[3px] border-black">
            <svg v-if="isGoogle" width="40" height="40" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path opacity="0.987" fill-rule="evenodd" clip-rule="evenodd" d="M7.20875 1.06075C7.93375 0.97975 8.36275 0.97975 9.14175 1.06075C10.5207 1.26485 11.799 1.90224 12.7918 2.88075C12.1209 3.51489 11.4588 4.15828 10.8058 4.81075C9.55509 3.75075 8.15909 3.50608 6.61775 4.07675C5.48709 4.59675 4.69975 5.43942 4.25575 6.60475C3.53019 6.06458 2.81409 5.51183 2.10775 4.94675C2.05867 4.92091 2.0026 4.91145 1.94775 4.91975C3.06975 2.75642 4.82309 1.46975 7.20775 1.05975" fill="#F44336"/>
              <path opacity="0.997" fill-rule="evenodd" clip-rule="evenodd" d="M1.94576 4.92018C2.00243 4.91151 2.0561 4.92051 2.10676 4.94718C2.8131 5.51226 3.5292 6.06501 4.25476 6.60518C4.14059 7.05924 4.06862 7.52288 4.03976 7.99018C4.06443 8.44218 4.1361 8.88585 4.25476 9.32118L1.99976 11.1162C1.01776 9.06418 0.999764 6.99885 1.94576 4.92018Z" fill="#FFC107"/>
              <path opacity="0.999" fill-rule="evenodd" clip-rule="evenodd" d="M12.6846 13.2897C11.9824 12.6705 11.2474 12.0897 10.4826 11.5497C11.2492 11.0084 11.7146 10.2657 11.8786 9.32174H8.12158V6.71274C10.2882 6.69474 12.4539 6.71308 14.6186 6.76774C15.0292 8.99774 14.5549 11.0084 13.1956 12.7997C13.0339 12.9716 12.8627 13.1351 12.6846 13.2897Z" fill="#448AFF"/>
              <path opacity="0.993" fill-rule="evenodd" clip-rule="evenodd" d="M4.255 9.32129C5.075 11.3593 6.57833 12.3106 8.765 12.1753C9.37883 12.1042 9.96735 11.8898 10.483 11.5493C11.2483 12.0906 11.9823 12.6706 12.685 13.2893C11.5716 14.2897 10.1521 14.8834 8.658 14.9733C8.31854 15.0004 7.97746 15.0004 7.638 14.9733C5.09267 14.6733 3.21333 13.3873 2 11.1153L4.255 9.32129Z" fill="#43A047"/>
            </svg>
            <svg v-else-if="isX" width="36" height="36" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.025 0.65625H13.172L8.482 6.03025L14 13.3442H9.68L6.294 8.90925L2.424 13.3442H0.275L5.291 7.59425L0 0.65725H4.43L7.486 4.71025L11.025 0.65625ZM10.27 12.0562H11.46L3.78 1.87725H2.504L10.27 12.0562Z" fill="black"/>
            </svg>
            <svg v-else-if="isInstagram" width="44" height="44" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.25 0H3.75C1.67893 0 0 1.67893 0 3.75V12.25C0 14.3211 1.67893 16 3.75 16H12.25C14.3211 16 16 14.3211 16 12.25V3.75C16 1.67893 14.3211 0 12.25 0Z" fill="url(#ig_a)"/>
              <path d="M12.25 0H3.75C1.67893 0 0 1.67893 0 3.75V12.25C0 14.3211 1.67893 16 3.75 16H12.25C14.3211 16 16 14.3211 16 12.25V3.75C16 1.67893 14.3211 0 12.25 0Z" fill="url(#ig_b)"/>
              <path d="M8.00056 1.75C6.30319 1.75 6.09013 1.75744 5.4235 1.78775C4.75813 1.81825 4.30394 1.92356 3.90656 2.07812C3.49544 2.23775 3.14675 2.45131 2.79938 2.79881C2.45169 3.14625 2.23813 3.49494 2.078 3.90587C1.923 4.30337 1.81756 4.75775 1.78762 5.42281C1.75781 6.0895 1.75 6.30263 1.75 8.00006C1.75 9.6975 1.7575 9.90987 1.78775 10.5765C1.81838 11.2419 1.92369 11.6961 2.07812 12.0934C2.23787 12.5046 2.45144 12.8533 2.79894 13.2006C3.14625 13.5483 3.49494 13.7624 3.90575 13.922C4.30344 14.0766 4.75769 14.1819 5.42294 14.2124C6.08962 14.2427 6.3025 14.2501 7.99981 14.2501C9.69738 14.2501 9.90975 14.2427 10.5764 14.2124C11.2418 14.1819 11.6964 14.0766 12.0941 13.922C12.5051 13.7624 12.8532 13.5483 13.2005 13.2006C13.5482 12.8533 13.7617 12.5046 13.9219 12.0936C14.0755 11.6961 14.181 11.2417 14.2122 10.5766C14.2422 9.91 14.25 9.6975 14.25 8.00006C14.25 6.30263 14.2422 6.08962 14.2122 5.42294C14.181 4.75756 14.0755 4.30344 13.9219 3.90606C13.7617 3.49494 13.5482 3.14625 13.2005 2.79881C12.8529 2.45119 12.5052 2.23762 12.0938 2.07819C11.6953 1.92356 11.2409 1.81819 10.5755 1.78775C9.90881 1.75744 9.69656 1.75 7.99862 1.75H8.00056ZM7.43988 2.87631C7.60631 2.87606 7.792 2.87631 8.00056 2.87631C9.66938 2.87631 9.86712 2.88231 10.5261 2.91225C11.1355 2.94013 11.4663 3.04194 11.6866 3.1275C11.9783 3.24075 12.1862 3.37619 12.4048 3.595C12.6236 3.81375 12.7589 4.02206 12.8725 4.31375C12.9581 4.53375 13.06 4.8645 13.0878 5.47388C13.1177 6.13275 13.1242 6.33062 13.1242 7.99862C13.1242 9.66662 13.1177 9.86456 13.0878 10.5234C13.0599 11.1327 12.9581 11.4635 12.8725 11.6836C12.7593 11.9752 12.6236 12.1829 12.4048 12.4016C12.1861 12.6203 11.9784 12.7557 11.6866 12.869C11.4665 12.9549 11.1355 13.0565 10.5261 13.0844C9.86725 13.1143 9.66938 13.1208 8.00056 13.1208C6.33169 13.1208 6.13387 13.1143 5.47506 13.0844C4.86569 13.0563 4.53494 12.9544 4.31444 12.8689C4.02281 12.7556 3.81444 12.6202 3.59569 12.4014C3.37694 12.1827 3.24156 11.9749 3.128 11.6831C3.04244 11.463 2.9405 11.1322 2.91275 10.5229C2.88281 9.864 2.87681 9.66613 2.87681 7.99706C2.87681 6.328 2.88281 6.13119 2.91275 5.47231C2.94063 4.86294 3.04244 4.53219 3.128 4.31187C3.24131 4.02019 3.37694 3.81188 3.59575 3.59313C3.81456 3.37438 4.02281 3.23894 4.3145 3.12544C4.53481 3.0395 4.86569 2.93794 5.47506 2.90994C6.05162 2.88387 6.27506 2.87606 7.43988 2.87475V2.87631ZM11.3368 3.91406C10.9228 3.91406 10.5868 4.24969 10.5868 4.66381C10.5868 5.07788 10.9228 5.41381 11.3368 5.41381C11.7509 5.41381 12.0868 5.07788 12.0868 4.66381C12.0868 4.24975 11.7509 3.91381 11.3368 3.91381V3.91406ZM8.00056 4.79038C6.22806 4.79038 4.79094 6.2275 4.79094 8.00006C4.79094 9.77263 6.22806 11.2091 8.00056 11.2091C9.77313 11.2091 11.2098 9.77263 11.2098 8.00006C11.2098 6.22756 9.773 4.79038 8.00044 4.79038H8.00056ZM8.00056 5.91669C9.15113 5.91669 10.0839 6.84938 10.0839 8.00006C10.0839 9.15063 9.15113 10.0834 8.00056 10.0834C6.85 10.0834 5.91725 9.15063 5.91725 8.00006C5.91725 6.84938 6.84994 5.91669 8.00056 5.91669Z" fill="white"/>
              <defs>
                <radialGradient id="ig_a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(4.25 17.2323) rotate(-90) scale(15.8572 14.7484)">
                  <stop stop-color="#FFDD55"/><stop offset="0.1" stop-color="#FFDD55"/><stop offset="0.5" stop-color="#FF543E"/><stop offset="1" stop-color="#C837AB"/>
                </radialGradient>
                <radialGradient id="ig_b" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-2.68005 1.1526) rotate(78.68) scale(7.08825 29.218)">
                  <stop stop-color="#3771C8"/><stop offset="0.128" stop-color="#3771C8"/><stop offset="1" stop-color="#6600FF" stop-opacity="0"/>
                </radialGradient>
              </defs>
            </svg>
            <svg v-else-if="isFacebook" width="44" height="44" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 8C16 3.58175 12.4183 0 8 0C3.58175 0 0 3.58175 0 8C0 11.993 2.9255 15.3027 6.75 15.9028V10.3125H4.71875V8H6.75V6.2375C6.75 4.2325 7.94438 3.125 9.77175 3.125C10.647 3.125 11.5625 3.28125 11.5625 3.28125V5.25H10.5538C9.55994 5.25 9.25 5.86669 9.25 6.49937V8H11.4688L11.1141 10.3125H9.25V15.9028C13.0745 15.3027 16 11.9931 16 8Z" fill="#1877F2"/>
              <path d="M11.1141 10.3125L11.4688 8H9.25V6.49937C9.25 5.86662 9.55994 5.25 10.5538 5.25H11.5625V3.28125C11.5625 3.28125 10.647 3.125 9.77169 3.125C7.94438 3.125 6.75 4.2325 6.75 6.2375V8H4.71875V10.3125H6.75V15.9028C7.16351 15.9676 7.58144 16.0001 8 16C8.41856 16.0001 8.83649 15.9676 9.25 15.9028V10.3125H11.1141Z" fill="white"/>
            </svg>
            <svg v-else-if="isTikTok" width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.6002 5.82C15.9167 5.03953 15.5401 4.0374 15.5402 3H12.4502V15.4C12.4268 16.0712 12.1437 16.7071 11.6605 17.1735C11.1773 17.6399 10.5318 17.9004 9.86016 17.9C8.44016 17.9 7.26016 16.74 7.26016 15.3C7.26016 13.58 8.92016 12.29 10.6302 12.82V9.66C7.18016 9.2 4.16016 11.88 4.16016 15.3C4.16016 18.63 6.92016 21 9.85016 21C12.9902 21 15.5402 18.45 15.5402 15.3V9.01C16.7932 9.90985 18.2975 10.3926 19.8402 10.39V7.3C19.8402 7.3 17.9602 7.39 16.6002 5.82Z" fill="black"/>
            </svg>
            <svg v-else-if="isLinkedIn" width="42" height="42" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.5 0.375058H1.5C1.20504 0.372056 0.920934 0.486188 0.710024 0.692411C0.499114 0.898635 0.378626 1.1801 0.375 1.47506V14.5276C0.379282 14.8221 0.500058 15.1029 0.710896 15.3086C0.921735 15.5143 1.20547 15.6281 1.5 15.6251H14.5C14.795 15.6274 15.0789 15.5129 15.2897 15.3065C15.5005 15.1002 15.621 14.8188 15.625 14.5238V1.47131C15.6197 1.17722 15.4986 0.897091 15.288 0.691815C15.0773 0.486538 14.7941 0.372705 14.5 0.375058Z" fill="#0076B2"/>
              <path d="M2.63264 6.09082H4.89639V13.3746H2.63264V6.09082ZM3.76514 2.46582C4.02478 2.46582 4.27859 2.54283 4.49445 2.6871C4.71032 2.83138 4.87855 3.03644 4.97785 3.27634C5.07715 3.51624 5.10307 3.7802 5.05233 4.03484C5.00158 4.28947 4.87645 4.52333 4.69277 4.70684C4.50909 4.89035 4.27511 5.01525 4.02043 5.06575C3.76574 5.11626 3.5018 5.09008 3.262 4.99055C3.02219 4.89102 2.81729 4.7226 2.67323 4.5066C2.52916 4.29059 2.45239 4.03671 2.45264 3.77707C2.45297 3.42919 2.5914 3.09567 2.8375 2.8498C3.08361 2.60393 3.41726 2.46582 3.76514 2.46582ZM6.31639 6.09082H8.48639V7.09082H8.51639C8.81889 6.51832 9.55639 5.91457 10.6576 5.91457C12.9501 5.90957 13.3751 7.41832 13.3751 9.37457V13.3746H11.1114V9.83082C11.1114 8.98707 11.0964 7.90082 9.93514 7.90082C8.77389 7.90082 8.57639 8.82082 8.57639 9.77582V13.3746H6.31639V6.09082Z" fill="white"/>
            </svg>
            <svg v-else-if="isWhatsApp" width="44" height="44" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.405547 9.38656C0.405102 10.9829 0.825476 12.5417 1.62481 13.9156L0.329102 18.6097L5.17054 17.3501C6.50962 18.0735 8.00996 18.4525 9.5346 18.4526H9.53861C14.5718 18.4526 18.6688 14.3887 18.671 9.3937C18.672 6.97326 17.7229 4.69724 15.9985 2.98488C14.2744 1.27268 11.9814 0.32923 9.53824 0.328125C4.5045 0.328125 0.407699 4.39177 0.405621 9.38656" fill="url(#wa_a)"/>
              <path d="M0.0794141 9.38335C0.0788945 11.0372 0.514336 12.6516 1.34217 14.0747L0 18.9372L5.01504 17.6324C6.39684 18.38 7.95261 18.7741 9.5357 18.7747H9.53978C14.7535 18.7747 18.9978 14.5647 19 9.39086C19.0009 6.88345 18.0176 4.52561 16.2316 2.75191C14.4454 0.978426 12.0704 0.00103101 9.53978 0C4.32517 0 0.0814922 4.20946 0.0794141 9.38335ZM3.06605 13.8296L2.8788 13.5347C2.09163 12.2928 1.67616 10.8576 1.67675 9.38394C1.67838 5.08353 5.20556 1.58481 9.54275 1.58481C11.6431 1.58569 13.6171 2.39812 15.1017 3.87217C16.5863 5.34636 17.4033 7.30602 17.4027 9.39027C17.4008 13.6907 13.8736 17.1898 9.53978 17.1898H9.53666C8.12554 17.1891 6.74159 16.8131 5.53464 16.1025L5.24741 15.9335L2.27139 16.7077L3.06605 13.8296Z" fill="url(#wa_b)"/>
              <path d="M7.17545 5.46052C6.99836 5.06999 6.812 5.06211 6.6436 5.05526C6.5057 5.04937 6.34806 5.04981 6.19057 5.04981C6.03293 5.04981 5.7768 5.10865 5.5603 5.34321C5.34358 5.57798 4.73291 6.14533 4.73291 7.29925C4.73291 8.45317 5.57997 9.56842 5.69805 9.72506C5.81628 9.88141 7.33331 12.3252 9.73592 13.2653C11.7327 14.0466 12.1391 13.8912 12.5724 13.852C13.0059 13.813 13.971 13.2848 14.1679 12.7372C14.3649 12.1895 14.3649 11.7201 14.3059 11.622C14.2468 11.5243 14.0891 11.4656 13.8528 11.3484C13.6164 11.2311 12.4542 10.6636 12.2375 10.5854C12.0208 10.5072 11.8633 10.4681 11.7056 10.703C11.548 10.9375 11.0953 11.4656 10.9573 11.622C10.8195 11.7788 10.6815 11.7983 10.4452 11.681C10.2087 11.5634 9.44743 11.316 8.54427 10.517C7.84156 9.89533 7.36716 9.12759 7.22926 8.89275C7.09136 8.65827 7.21449 8.53116 7.33302 8.41429C7.43922 8.3092 7.56948 8.14041 7.68778 8.0035C7.80564 7.86653 7.84498 7.7688 7.9238 7.61238C8.00269 7.45582 7.96321 7.31884 7.9042 7.20153C7.84498 7.08421 7.38564 5.92425 7.17545 5.46052Z" fill="white"/>
              <defs>
                <linearGradient id="wa_a" x1="9.50005" y1="18.6097" x2="9.50005" y2="0.328125" gradientUnits="userSpaceOnUse"><stop stop-color="#1FAF38"/><stop offset="1" stop-color="#60D669"/></linearGradient>
                <linearGradient id="wa_b" x1="9.5" y1="18.9372" x2="9.5" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="#F9F9F9"/><stop offset="1" stop-color="white"/></linearGradient>
              </defs>
            </svg>
            <Icon v-else :name="netIconName(current.type)" size="42" :style="{ color: netColor(current.type) }" />
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

              <button @click="openCurrent"
                class="w-full py-4 rounded-[24px] font-black text-[19px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                :style="{ backgroundColor: buttonColor, color: buttonTextColor }">
                {{ current.buttonText }}
                <Icon name="ph:arrow-up-right-bold" size="16" />
              </button>

              <p class="w-full mt-4 text-center font-extrabold text-[13px] leading-snug opacity-90">
                ⚠️ {{ $t('play.steps.comeback_notice') }}
              </p>
            </template>

            <!-- ====== PHASE PENDING : écran de vérification (logo qui tourne) ====== -->
            <template v-else>
              <h2 class="text-2xl font-black text-center mb-5">{{ $t('play.review_timer.not_done') }}</h2>

              <button @click="openCurrent"
                class="w-full py-4 rounded-[24px] font-black text-[19px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                :style="{ backgroundColor: buttonColor, color: buttonTextColor }">
                {{ current.buttonText }}
                <Icon name="ph:arrow-up-right-bold" size="16" />
              </button>

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
