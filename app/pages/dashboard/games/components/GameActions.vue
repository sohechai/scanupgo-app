<script setup lang="ts">
const props = defineProps<{
	gameId: string
	googleReviewUrl?: string | null
}>()

const { $api } = useNuxtApp()
const { show: showToast } = useToast()

interface GameAction {
	id: string
	type: string
	link: string
	clientMessage: string
	buttonText: string
}

const actions = ref<GameAction[]>([])
const loading = ref(false)

// Réseaux disponibles dans le modal (icônes : composant GameNetworkIcon)
const NETWORKS = [
	{ type: 'google', label: 'Google' },
	{ type: 'instagram', label: 'Instagram' },
	{ type: 'facebook', label: 'Facebook' },
	{ type: 'tiktok', label: 'TikTok' },
	{ type: 'twitter', label: 'Twitter/X' },
	{ type: 'linkedin', label: 'LinkedIn' },
	{ type: 'whatsapp', label: 'WhatsApp' },
	{ type: 'snapchat', label: 'Snapchat' },
	{ type: 'tripadvisor', label: 'Tripadvisor' },
	{ type: 'other', label: 'Autre lien' },
]
const DEFAULTS: Record<string, { msg: string; btn: string }> = {
	google: { msg: 'Laissez-nous un avis Google', btn: 'Notez sur Google' },
	instagram: { msg: 'Suivez-nous sur Instagram', btn: 'Nous suivre' },
	facebook: { msg: 'Aimez notre page Facebook', btn: 'Aimer la page' },
	tiktok: { msg: 'Suivez-nous sur TikTok', btn: 'Nous suivre' },
	twitter: { msg: 'Suivez-nous sur X', btn: 'Nous suivre' },
	linkedin: { msg: 'Suivez-nous sur LinkedIn', btn: 'Nous suivre' },
	whatsapp: { msg: 'Rejoignez notre communauté', btn: 'Rejoindre' },
	snapchat: { msg: 'Ajoutez-nous sur Snapchat', btn: 'Nous ajouter' },
	tripadvisor: { msg: 'Laissez-nous un avis Tripadvisor', btn: 'Noter sur Tripadvisor' },
	other: { msg: 'Suivez-nous', btn: 'Découvrir' },
}
const networkLabel = (type: string) => NETWORKS.find(n => n.type === type)?.label || type

const fetchActions = async () => {
	if (!props.gameId || props.gameId === 'new') return
	loading.value = true
	try {
		actions.value = await $api<GameAction[]>(`/games/${props.gameId}/actions`)
	} catch (e) {
		console.error('Failed to fetch actions', e)
	} finally {
		loading.value = false
	}
}
onMounted(fetchActions)

// ── Modal ajout / édition ──────────────────────────────────────────────────
const showModal = ref(false)
const editingId = ref<string | null>(null)
const modalStep = ref<1 | 2>(1)
const form = ref({ type: 'google', link: '', clientMessage: '', buttonText: '' })
const saving = ref(false)

const openAdd = () => {
	editingId.value = null
	modalStep.value = 1
	form.value = { type: 'google', link: '', clientMessage: '', buttonText: '' }
	showModal.value = true
}
const openEdit = (a: GameAction) => {
	editingId.value = a.id
	// On démarre sur la grille des réseaux pour permettre d'en changer.
	modalStep.value = 1
	form.value = { type: a.type, link: a.link, clientMessage: a.clientMessage, buttonText: a.buttonText }
	showModal.value = true
}
const selectNetwork = (type: string) => {
	// On n'écrase le message/bouton (et le lien) que si le réseau change
	// réellement — sinon en édition on perdrait les textes personnalisés.
	const changed = form.value.type !== type
	form.value.type = type
	if (changed) {
		const d = DEFAULTS[type] || DEFAULTS.other
		form.value.clientMessage = d.msg
		form.value.buttonText = d.btn
		// Le lien Google n'a de sens que pour Google : on pré-remplit pour Google
		// (si configuré), sinon on laisse vide pour tous les autres réseaux.
		form.value.link = type === 'google' ? (props.googleReviewUrl || '') : ''
	}
	modalStep.value = 2
}

// Sélection d'un établissement via la recherche Google Places : on remplit le
// lien d'avis Google.
const onPlaceSelect = (details: { googleReviewUrl: string }) => {
	if (details?.googleReviewUrl) form.value.link = details.googleReviewUrl
}

const saveAction = async () => {
	if (!form.value.link.trim()) { showToast('Le lien est requis', 'error'); return }
	saving.value = true
	try {
		if (editingId.value) {
			await $api(`/games/${props.gameId}/actions/${editingId.value}`, { method: 'PATCH', body: form.value })
		} else {
			await $api(`/games/${props.gameId}/actions`, { method: 'POST', body: form.value })
		}
		showModal.value = false
		await fetchActions()
	} catch (e: any) {
		showToast(e?.data?.message || 'Erreur lors de l\'enregistrement', 'error')
	} finally {
		saving.value = false
	}
}

// Confirmation de suppression (modal propre)
const deleteTarget = ref<GameAction | null>(null)
const deleting = ref(false)

const askRemove = (a: GameAction) => { deleteTarget.value = a }

const confirmRemove = async () => {
	if (!deleteTarget.value) return
	deleting.value = true
	try {
		await $api(`/games/${props.gameId}/actions/${deleteTarget.value.id}`, { method: 'DELETE' })
		deleteTarget.value = null
		await fetchActions()
	} catch (e: any) {
		showToast(e?.data?.message || 'Vous devez avoir au moins une action.', 'error')
	} finally {
		deleting.value = false
	}
}
</script>

<template>
	<div class="col-span-2">
		<div class="flex items-center justify-between mb-3">
			<label class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Action avant de jouer</label>
			<button v-if="actions.length === 0 && gameId !== 'new'" type="button" @click="openAdd"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-xs font-semibold rounded-lg transition-colors">
				<Icon name="ph:plus-bold" size="13" /> Ajouter l'action
			</button>
		</div>

		<p v-if="gameId === 'new'" class="text-xs text-slate-400 italic">Enregistrez d'abord le jeu pour configurer les actions.</p>

		<div v-else-if="loading" class="text-xs text-slate-400">Chargement…</div>

		<div v-else class="space-y-2">
			<div v-for="a in actions" :key="a.id" class="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
				<div class="flex items-center gap-2 mb-2">
					<GameNetworkIcon :type="a.type" :size="20" />
					<span class="font-bold text-sm text-slate-800 dark:text-white">{{ networkLabel(a.type) }}</span>
				</div>
				<p v-if="a.link" class="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1.5 font-mono">{{ a.link }}</p>
				<p v-else class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded px-1.5 py-0.5 mb-1.5">
					<Icon name="ph:warning-circle-fill" size="12" />
					Lien non défini — à compléter
				</p>
				<p class="text-xs text-slate-600 dark:text-slate-300"><span class="text-slate-400">Message :</span> {{ a.clientMessage }} · <span class="text-slate-400">Bouton :</span> {{ a.buttonText }}</p>
				<div class="flex items-center gap-2 mt-3">
					<button type="button" @click="openEdit(a)"
						class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF] hover:text-white ring-1 ring-inset ring-[#007AFF]/25 transition-colors">
						<Icon name="ph:arrows-clockwise-bold" size="14" />
						Modifier / changer de réseau
					</button>
				</div>
			</div>
		</div>

		<!-- Modal ajout/édition -->
		<Teleport to="body">
			<div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showModal = false"></div>
				<div class="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto">
					<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
						<h3 class="font-bold text-slate-900 dark:text-white">{{ editingId ? 'Modifier l\'action' : 'Ajouter une action' }}</h3>
						<button @click="showModal = false" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Icon name="ph:x-bold" size="16" /></button>
					</div>

					<!-- Étape 1 : choisir le réseau -->
					<div v-if="modalStep === 1" class="p-5">
						<p class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Choisir le réseau</p>
						<div class="grid grid-cols-2 gap-2">
							<button v-for="n in NETWORKS" :key="n.type" type="button" @click="selectNetwork(n.type)"
								:class="['flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors', form.type === n.type ? 'border-[#007AFF] bg-blue-50 dark:bg-slate-700 ring-1 ring-[#007AFF]' : 'border-slate-200 dark:border-slate-600 hover:border-[#007AFF] hover:bg-blue-50 dark:hover:bg-slate-700']">
								<GameNetworkIcon :type="n.type" :size="28" />
								<span class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ n.label }}</span>
							</button>
						</div>
					</div>

					<!-- Étape 2 : remplir -->
					<div v-else class="p-5 space-y-4">
						<div class="flex items-center gap-2 pb-2">
							<GameNetworkIcon :type="form.type" :size="22" />
							<span class="font-bold text-slate-800 dark:text-white">{{ networkLabel(form.type) }}</span>
						</div>
						<!-- Recherche d'établissement Google (uniquement pour Google) -->
						<div v-if="form.type === 'google'">
							<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Rechercher votre établissement</label>
							<GooglePlacesSearch @select="onPlaceSelect" placeholder="Nom de votre établissement…" />
							<p class="text-[11px] text-slate-400 mt-1">Sélectionnez votre établissement pour générer automatiquement le lien d'avis Google.</p>
						</div>
						<div>
							<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Lien</label>
							<input v-model="form.link" type="url" placeholder="https://..."
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-[#007AFF]/40 outline-none" />
						</div>
						<div>
							<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Message affiché au client</label>
							<input v-model="form.clientMessage" type="text"
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-[#007AFF]/40 outline-none" />
						</div>
						<div>
							<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Texte du bouton</label>
							<input v-model="form.buttonText" type="text"
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-[#007AFF]/40 outline-none" />
						</div>
					</div>

					<div v-if="modalStep === 2" class="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
						<button @click="modalStep = 1" class="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Changer de réseau</button>
						<button @click="saveAction" :disabled="saving" class="px-4 py-1.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-sm font-semibold rounded-lg disabled:opacity-50">{{ editingId ? 'Enregistrer' : 'Ajouter' }}</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Modal confirmation suppression (style sobre) -->
		<Teleport to="body">
			<Transition name="da-fade">
				<div v-if="deleteTarget" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
					<div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="deleteTarget = null"></div>
					<div class="relative w-full max-w-[400px] bg-white dark:bg-slate-800 rounded-xl shadow-[0_15px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
						<div class="p-6">
							<h3 class="text-[15px] font-semibold text-slate-900 dark:text-white">Supprimer l'action {{ networkLabel(deleteTarget.type) }}</h3>
							<p class="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
								Cette action sera définitivement retirée du jeu. Vos clients ne la verront plus dans le parcours.
							</p>
						</div>
						<div class="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
							<button @click="deleteTarget = null"
								class="px-3.5 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Annuler</button>
							<button @click="confirmRemove" :disabled="deleting"
								class="px-3.5 py-2 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
								<Icon v-if="deleting" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
								Supprimer
							</button>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<style scoped>
.da-fade-enter-active,
.da-fade-leave-active { transition: opacity 0.18s ease; }
.da-fade-enter-from,
.da-fade-leave-to { opacity: 0; }
.da-fade-enter-active > div:last-child,
.da-fade-leave-active > div:last-child { transition: transform 0.18s ease, opacity 0.18s ease; }
.da-fade-enter-from > div:last-child { transform: translateY(8px) scale(0.98); opacity: 0; }
</style>
