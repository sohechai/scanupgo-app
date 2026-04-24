<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const router = useRouter()
const { show: showToast } = useToast()
const { hasActiveSubscription, fetchSubscription } = useSubscription()

const games = ref<any[]>([])
const loading = ref(true)
const togglingId = ref<string | null>(null)

const toggleActive = async (game: any) => {
	if (togglingId.value === game.id) return
	togglingId.value = game.id
	try {
		const updated = await $api<any>(`/games/${game.id}`, {
			method: 'PATCH',
			body: { active: !game.active },
		})
		const idx = games.value.findIndex(g => g.id === game.id)
		if (idx !== -1) games.value[idx] = { ...games.value[idx], active: updated.active }
	} catch (e: any) {
		showToast(e?.data?.message || t('games.update_error'), 'error')
	} finally {
		togglingId.value = null
	}
}

const showOrderModal = ref(false)
const selectedGameForOrder = ref<any>(null)
const openOrderModal = (game: any) => { selectedGameForOrder.value = game; showOrderModal.value = true }

const showDeleteModal = ref(false)
const gameToDelete = ref<any>(null)
const deleting = ref(false)
const openDeleteModal = (game: any) => { gameToDelete.value = game; showDeleteModal.value = true }

const deleteGame = async () => {
	if (!gameToDelete.value) return
	try {
		deleting.value = true
		await $api(`/games/${gameToDelete.value.id}`, { method: 'DELETE' })
		games.value = games.value.filter(g => g.id !== gameToDelete.value.id)
		showDeleteModal.value = false
		showToast(t('games.game_deleted'), 'success')
	} catch (e: any) {
		showToast(e?.data?.message || t('games.delete_error'), 'error')
	} finally {
		deleting.value = false
	}
}

const fetchGames = async () => {
	try {
		loading.value = true
		games.value = await $api<any[]>('/games') || []
	} catch (e) { console.error(e) }
	finally { loading.value = false }
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) fetchGames()
})
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('games.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('games.subtitle') }}</p>
			</div>
			<NuxtLink to="/dashboard/games/new"
				class="flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-medium rounded-md transition-all text-sm">
				<Icon name="ph:plus-bold" size="15" />
				{{ $t('games.create_button') }}
			</NuxtLink>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex justify-center py-20">
			<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-300" size="28" />
		</div>

		<!-- Empty State -->
		<div v-else-if="games.length === 0"
			class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-14 text-center">
			<div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
				<Icon name="ph:game-controller-duotone" size="24" class="text-slate-400 dark:text-slate-500" />
			</div>
			<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">{{ $t('games.no_games') }}</h3>
			<p class="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mb-5 text-sm">{{ $t('games.no_games_description') }}</p>
			<NuxtLink to="/dashboard/games/new"
				class="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md transition-all text-sm">
				<Icon name="ph:plus-bold" size="14" />
				{{ $t('games.create_first') }}
			</NuxtLink>
		</div>

		<!-- Games Grid -->
		<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			<div v-for="game in games" :key="game.id"
				class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">

				<!-- Card top — game identity -->
				<div class="p-4 flex items-start gap-3 border-b border-slate-100 dark:border-slate-800">
					<div class="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:game-controller-bold" class="text-slate-400 dark:text-slate-500" size="18" />
					</div>
					<div class="flex-1 min-w-0 pt-0.5">
						<h3 class="font-semibold text-slate-900 dark:text-white text-sm truncate">{{ game.title }}</h3>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">/{{ game.slug }}</p>
					</div>
					<!-- Toggle actif/inactif -->
					<button
						@click.prevent.stop="toggleActive(game)"
						:disabled="togglingId === game.id"
						:title="game.active ? $t('games.deactivate') : $t('games.activate')"
						class="shrink-0 flex items-center gap-1.5 mt-0.5"
					>
						<Icon v-if="togglingId === game.id" name="svg-spinners:ring-resize" class="text-slate-400" size="14" />
						<template v-else>
							<div class="relative w-7 h-3.5 rounded-full transition-colors"
								:class="game.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'">
								<div class="absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-all"
									:class="game.active ? 'left-[14px]' : 'left-0.5'"></div>
							</div>
							<span class="text-[11px] font-medium"
								:class="game.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'">
								{{ game.active ? $t('games.status_active') : $t('games.status_draft') }}
							</span>
						</template>
					</button>
				</div>

				<!-- Flyer status -->
				<div class="px-4 py-3 flex items-center justify-between">
					<div v-if="game.flyerDesignUrl" class="flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
						<span class="text-xs text-slate-500 dark:text-slate-400">{{ $t('games.flyer_ready') }}</span>
					</div>
					<div v-else class="flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
						<span class="text-xs text-slate-400 dark:text-slate-500">{{ $t('games.flyer_not_configured') }}</span>
					</div>
					<button v-if="game.flyerDesignUrl" @click.stop="openOrderModal(game)"
						class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-md transition-colors">
						<Icon name="ph:shopping-cart-bold" size="11" />
						{{ $t('games.order_flyers') }}
					</button>
				</div>

				<!-- Actions -->
				<div class="px-4 pb-4 mt-auto flex gap-2 items-stretch">
					<NuxtLink :to="`/dashboard/games/${game.id}`"
						class="flex-1 h-8 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md text-xs transition-colors flex items-center justify-center gap-1.5">
						<Icon name="ph:gear-six-bold" size="13" />
						{{ $t('games.config_button') }}
					</NuxtLink>
					<a :href="`/play/${game.slug}`" target="_blank"
						class="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md transition-colors shrink-0"
						:title="$t('games.preview_button')">
						<Icon name="ph:arrow-square-out-bold" size="14" />
					</a>
					<button @click.stop="openDeleteModal(game)"
						class="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-md transition-colors shrink-0"
						:title="$t('games.delete_button')">
						<Icon name="ph:trash-bold" size="14" />
					</button>
				</div>
			</div>

			<!-- Add New Card -->
			<NuxtLink to="/dashboard/games/new"
				class="bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#007AFF] dark:hover:border-[#007AFF] hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-[#007AFF] min-h-[180px] cursor-pointer group">
				<div class="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-[#007AFF]/10 flex items-center justify-center mb-2.5 transition-colors">
					<Icon name="ph:plus-bold" size="18" />
				</div>
				<span class="font-medium text-sm">{{ $t('games.new_game') }}</span>
			</NuxtLink>
		</div>

		<!-- Modals -->
		<OrdersCreateOrderModal
			v-model="showOrderModal"
			:flyer-design-url="selectedGameForOrder?.flyerDesignUrl || undefined"
			:game-id="selectedGameForOrder?.id"
			@created="showToast(t('games.order_created'), 'success')"
		/>
		<ConfirmModal
			v-model="showDeleteModal"
			:title="$t('games.delete_confirmation_title')"
			:description="$t('games.delete_confirmation_message', { title: gameToDelete?.title })"
			:confirm-text="$t('games.delete_confirmation_button')"
			type="danger"
			:loading="deleting"
			@confirm="deleteGame"
		/>
	</div>
	</SubscriptionGate>
</template>
