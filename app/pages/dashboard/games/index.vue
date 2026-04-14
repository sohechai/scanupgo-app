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
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('games.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{{ $t('games.subtitle') }}</p>
			</div>
			<NuxtLink to="/dashboard/games/new"
				class="flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-[#007AFF]/25">
				<Icon name="ph:plus-bold" size="16" />
				{{ $t('games.create_button') }}
			</NuxtLink>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex justify-center py-20">
			<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-300" size="32" />
		</div>

		<!-- Empty State -->
		<div v-else-if="games.length === 0"
			class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-14 text-center shadow-sm">
			<div class="w-16 h-16 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
				<Icon name="ph:game-controller-duotone" size="32" class="text-[#007AFF]" />
			</div>
			<h3 class="text-base font-bold text-slate-900 dark:text-white mb-1.5">{{ $t('games.no_games') }}</h3>
			<p class="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mb-6 text-sm">{{ $t('games.no_games_description') }}</p>
			<NuxtLink to="/dashboard/games/new"
				class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-xl transition-all text-sm shadow-md shadow-[#007AFF]/25">
				<Icon name="ph:plus-bold" size="15" />
				{{ $t('games.create_first') }}
			</NuxtLink>
		</div>

		<!-- Games Grid -->
		<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			<div v-for="game in games" :key="game.id"
				class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

				<!-- Card top — game identity -->
				<div class="p-5 flex items-start gap-4 border-b border-[#E5E5EA] dark:border-slate-700/40">
					<!-- App icon -->
					<div class="w-12 h-12 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon name="ph:game-controller-bold" class="text-slate-400 dark:text-slate-500" size="22" />
					</div>
					<div class="flex-1 min-w-0 pt-0.5">
						<div class="flex items-center gap-2">
							<h3 class="font-bold text-slate-900 dark:text-white text-sm truncate flex-1">{{ game.title }}</h3>
							<span :class="[
								'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold',
								game.active
									? 'bg-[#34C759]/15 text-[#34C759]'
									: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-400 dark:text-slate-500'
							]">
								{{ game.active ? $t('games.status_active') : $t('games.status_draft') }}
							</span>
						</div>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">/{{ game.slug }}</p>
					</div>
				</div>

				<!-- Flyer status -->
				<div class="px-5 py-3 flex items-center justify-between">
					<div v-if="game.flyerDesignUrl" class="flex items-center gap-2">
						<Icon name="ph:check-circle-fill" class="text-[#34C759]" size="14" />
						<span class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ $t('games.flyer_ready') }}</span>
					</div>
					<div v-else class="flex items-center gap-2">
						<Icon name="ph:warning-circle-fill" class="text-[#FF9500]" size="14" />
						<span class="text-xs text-slate-400 dark:text-slate-500 font-medium">{{ $t('games.flyer_not_configured') }}</span>
					</div>
					<button v-if="game.flyerDesignUrl" @click.stop="openOrderModal(game)"
						class="flex items-center gap-1.5 px-2.5 py-1 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-[11px] font-semibold rounded-lg transition-colors">
						<Icon name="ph:shopping-cart-bold" size="11" />
						{{ $t('games.order_flyers') }}
					</button>
				</div>

				<!-- Actions -->
				<div class="px-5 pb-4 mt-auto flex gap-2">
					<NuxtLink :to="`/dashboard/games/${game.id}`"
						class="flex-1 py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
						<Icon name="ph:gear-six-bold" size="14" />
						{{ $t('games.config_button') }}
					</NuxtLink>
					<a :href="`/play/${game.slug}`" target="_blank"
						class="p-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-slate-500 dark:text-slate-400 rounded-xl transition-colors"
						:title="$t('games.preview_button')">
						<Icon name="ph:arrow-square-out-bold" size="15" />
					</a>
					<button @click.stop="openDeleteModal(game)"
						class="p-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#FF3B30]/10 text-slate-400 hover:text-[#FF3B30] dark:text-slate-500 dark:hover:text-[#FF3B30] rounded-xl transition-colors"
						:title="$t('games.delete_button')">
						<Icon name="ph:trash-bold" size="15" />
					</button>
				</div>
			</div>

			<!-- Add New Card -->
			<NuxtLink to="/dashboard/games/new"
				class="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-2xl border-2 border-dashed border-[#C7C7CC] dark:border-slate-600 hover:border-[#007AFF] dark:hover:border-[#007AFF] hover:bg-[#007AFF]/5 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-[#007AFF] min-h-[200px] cursor-pointer group">
				<div class="w-12 h-12 rounded-2xl bg-white dark:bg-[#2C2C2E] shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
					<Icon name="ph:plus-bold" size="22" />
				</div>
				<span class="font-semibold text-sm">{{ $t('games.new_game') }}</span>
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
