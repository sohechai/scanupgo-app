<script setup lang="ts">
definePageMeta({ layout: 'dashboard', pageTransition: false, middleware: 'auth' })
useHead({ title: 'Mes Lots' })

const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()

const sessions = ref<any[]>([])
const loading = ref(true)
const filter = ref<'all' | 'pending' | 'redeemed'>('all')

const actionLoading = ref(false)
const actionError = ref('')
const modal = ref<{ type: 'validate' | 'unredeem'; session: any } | null>(null)

const fetchSessions = async () => {
	loading.value = true
	try {
		const all = await $api('/gameplay/sessions')
		sessions.value = (all as any[]).filter((s: any) => s.prizeWon)
	} catch {}
	finally { loading.value = false }
}

onMounted(fetchSessions)

const prizes = computed(() => {
	if (filter.value === 'pending') return sessions.value.filter(s => !s.redeemed)
	if (filter.value === 'redeemed') return sessions.value.filter(s => s.redeemed)
	return sessions.value
})

const stats = computed(() => ({
	total: sessions.value.length,
	pending: sessions.value.filter(s => !s.redeemed).length,
	redeemed: sessions.value.filter(s => s.redeemed).length,
}))

const openModal = (type: 'validate' | 'unredeem', session: any) => {
	actionError.value = ''
	modal.value = { type, session }
}

const closeModal = () => {
	if (actionLoading.value) return
	modal.value = null
	actionError.value = ''
}

const confirm = async () => {
	if (!modal.value) return
	const { type, session } = modal.value
	actionLoading.value = true
	actionError.value = ''
	try {
		if (type === 'validate') {
			await $api('/gameplay/redeem', { method: 'POST', body: { redemptionCode: session.redemptionCode } })
			session.redeemed = true
			session.redeemedAt = new Date().toISOString()
		} else {
			await $api(`/gameplay/sessions/${session.id}/unredeem`, { method: 'PATCH' })
			session.redeemed = false
			session.redeemedAt = null
		}
		modal.value = null
	} catch (e: any) {
		actionError.value = e?.data?.message || 'Erreur'
	} finally {
		actionLoading.value = false
	}
}
</script>

<template>
	<div class="space-y-5">

		<!-- Header -->
		<div>
			<h1 class="text-xl font-semibold text-slate-900 dark:text-white">Mes Lots</h1>
			<p class="text-sm text-slate-400 mt-0.5">Suivez et gérez les lots gagnés par vos joueurs</p>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-3 gap-3">
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Total gagnés</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{{ stats.total }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/40 px-4 py-3">
				<p class="text-[10px] font-medium text-amber-500 uppercase tracking-wide mb-1">En attente</p>
				<p class="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{{ stats.pending }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-green-200 dark:border-green-900/40 px-4 py-3">
				<p class="text-[10px] font-medium text-green-500 uppercase tracking-wide mb-1">Récupérés</p>
				<p class="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{{ stats.redeemed }}</p>
			</div>
		</div>

		<!-- Table card -->
		<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">

			<!-- Filters -->
			<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
				<div class="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md w-fit">
					<button v-for="f in [{ key: 'all', label: 'Tous' }, { key: 'pending', label: 'En attente' }, { key: 'redeemed', label: 'Récupérés' }]"
						:key="f.key"
						@click="filter = f.key as any"
						:class="filter === f.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'"
						class="text-xs font-medium px-2.5 py-1 rounded transition-all">
						{{ f.label }}
						<span v-if="f.key === 'pending' && stats.pending > 0"
							class="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
							{{ stats.pending }}
						</span>
					</button>
				</div>
			</div>

			<!-- Loading -->
			<div v-if="loading" class="p-12 text-center">
				<Icon name="ph:spinner-gap-bold" size="28" class="animate-spin text-slate-300 mx-auto" />
			</div>

			<!-- Empty -->
			<div v-else-if="prizes.length === 0" class="p-12 text-center text-slate-400">
				<Icon name="ph:gift-duotone" size="40" class="mx-auto mb-3 opacity-40" />
				<p class="text-sm font-medium">Aucun lot {{ filter === 'pending' ? 'en attente' : filter === 'redeemed' ? 'récupéré' : 'gagné' }}</p>
			</div>

			<!-- Table -->
			<div v-else class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-slate-100 dark:border-slate-800">
						<tr>
							<th class="px-5 py-3 text-xs font-medium text-slate-400">Joueur</th>
							<th class="px-5 py-3 text-xs font-medium text-slate-400">Lot</th>
							<th class="px-5 py-3 text-xs font-medium text-slate-400">Gagné le</th>
							<th class="px-5 py-3 text-xs font-medium text-slate-400">Statut</th>
							<th class="px-5 py-3 text-xs font-medium text-slate-400">Récupéré le</th>
							<th class="px-5 py-3 text-xs font-medium text-slate-400 text-right">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
						<tr v-for="session in prizes" :key="session.id"
							class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
							<td class="px-5 py-3">
								<div class="flex items-center gap-2">
									<div class="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-slate-500 shrink-0">
										{{ session.player?.firstName?.[0] || '?' }}
									</div>
									<div>
										<p class="text-sm font-medium text-slate-800 dark:text-slate-200">
											{{ session.player?.firstName }} {{ session.player?.lastName }}
										</p>
										<p v-if="session.player?.phone" class="text-[10px] text-slate-400">{{ session.player.phone }}</p>
									</div>
								</div>
							</td>
							<td class="px-5 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{{ session.prizeName }}</td>
							<td class="px-5 py-3 text-xs text-slate-400">
								{{ formatDate(session.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
							</td>
							<td class="px-5 py-3">
								<span v-if="session.redeemed"
									class="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full">
									<span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>Récupéré
								</span>
								<span v-else
									class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-full">
									<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>En attente
								</span>
							</td>
							<td class="px-5 py-3 text-xs text-slate-400">
								{{ session.redeemedAt ? formatDate(session.redeemedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' }}
							</td>
							<td class="px-5 py-3 text-right">
								<button v-if="!session.redeemed"
									@click="openModal('validate', session)"
									class="text-xs font-medium text-[#007AFF] hover:underline">
									Valider
								</button>
								<button v-else
									@click="openModal('unredeem', session)"
									class="text-xs text-slate-400 hover:text-red-500 transition-colors">
									Annuler
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Modal confirmation -->
		<Teleport to="body">
			<Transition
				enter-active-class="transition duration-150 ease-out"
				enter-from-class="opacity-0"
				enter-to-class="opacity-100"
				leave-active-class="transition duration-100 ease-in"
				leave-from-class="opacity-100"
				leave-to-class="opacity-0">
				<div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" @click.self="closeModal">
					<div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">

						<!-- Icône -->
						<div class="flex justify-center">
							<div :class="modal.type === 'validate' ? 'bg-[#007AFF]/10' : 'bg-red-50 dark:bg-red-900/20'"
								class="w-12 h-12 rounded-full flex items-center justify-center">
								<Icon
									:name="modal.type === 'validate' ? 'ph:check-circle-duotone' : 'ph:arrow-counter-clockwise-bold'"
									:class="modal.type === 'validate' ? 'text-[#007AFF]' : 'text-red-500'"
									size="24" />
							</div>
						</div>

						<!-- Texte -->
						<div class="text-center space-y-1">
							<p class="font-semibold text-slate-900 dark:text-white">
								{{ modal.type === 'validate' ? 'Valider le lot' : 'Annuler la validation' }}
							</p>
							<p class="text-sm text-slate-500 dark:text-slate-400">
								<template v-if="modal.type === 'validate'">
									Confirmez la remise de <strong class="text-slate-700 dark:text-slate-200">{{ modal.session.prizeName }}</strong> à <strong class="text-slate-700 dark:text-slate-200">{{ modal.session.player?.firstName }}</strong>.<br/>
									<span class="text-xs text-slate-400">Cette action est irréversible.</span>
								</template>
								<template v-else>
									Remettre le lot <strong class="text-slate-700 dark:text-slate-200">{{ modal.session.prizeName }}</strong> en statut "En attente" ?
								</template>
							</p>
						</div>

						<!-- Erreur -->
						<p v-if="actionError" class="text-xs text-red-500 text-center font-medium">{{ actionError }}</p>

						<!-- Boutons -->
						<div class="flex gap-2 pt-1">
							<button @click="closeModal" :disabled="actionLoading"
								class="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
								Annuler
							</button>
							<button @click="confirm" :disabled="actionLoading"
								:class="modal.type === 'validate' ? 'bg-[#007AFF] hover:bg-[#0066DD]' : 'bg-red-500 hover:bg-red-600'"
								class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
								<Icon v-if="actionLoading" name="ph:spinner-gap-bold" class="animate-spin" size="15" />
								{{ actionLoading ? '...' : (modal.type === 'validate' ? 'Confirmer' : 'Oui, annuler') }}
							</button>
						</div>

					</div>
				</div>
			</Transition>
		</Teleport>

	</div>
</template>
