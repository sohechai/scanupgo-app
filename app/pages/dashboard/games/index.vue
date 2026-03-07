<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const router = useRouter()
const { show: showToast } = useToast()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

const games = ref<any[]>([])
const loading = ref(true)

// Order Modal State
const showOrderModal = ref(false)
const selectedGameForOrder = ref<any>(null)

const openOrderModal = (game: any) => {
	selectedGameForOrder.value = game
	showOrderModal.value = true
}

// Delete Game State
const showDeleteModal = ref(false)
const gameToDelete = ref<any>(null)
const deleting = ref(false)

const openDeleteModal = (game: any) => {
	gameToDelete.value = game
	showDeleteModal.value = true
}

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
		const data = await $api<any[]>('/games')
		games.value = data || []
	} catch (e) {
		console.error('Error fetching games:', e)
	} finally {
		loading.value = false
	}
}

const getAssetUrl = (url: string | null) => {
	if (!url) return undefined
	return url
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchGames()
	}
})
</script>

<template>
	<!-- Subscription Required -->
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('games.access_required')"
		:description="$t('games.access_description')"
		icon="ph:game-controller-fill"
	/>

	<div v-else class="space-y-8 relative">

		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('games.title') }}</h1>
				<p class="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{{ $t('games.subtitle') }}</p>
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-3">
				<NuxtLink to="/dashboard/games/new"
					class="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 shadow-md shadow-slate-900/10 transition-all">
					<Icon name="ph:plus-bold" size="16" />
					<span>{{ $t('games.create_button') }}</span>
				</NuxtLink>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex justify-center py-20">
			<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-300" size="32" />
		</div>

		<!-- Empty State -->
		<div v-else-if="games.length === 0"
			class="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
			<div
				class="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4 text-slate-300 dark:text-slate-500">
				<Icon name="ph:game-controller-duotone" size="32" />
			</div>
			<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ $t('games.no_games') }}</h3>
			<p class="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 text-sm">{{ $t('games.no_games_description') }}</p>
			<NuxtLink to="/dashboard/games/new"
				class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors text-sm">
				{{ $t('games.create_first') }}
			</NuxtLink>
		</div>

		<!-- Games Grid -->
		<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
			<div v-for="game in games" :key="game.id"
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col">

				<!-- Card Header / Preview -->
				<div
					class="h-32 bg-slate-100 dark:bg-slate-700 relative overflow-hidden group-hover:opacity-90 transition-opacity">
					<div
						class="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-700 relative overflow-hidden">
						<!-- Pattern -->
						<div
							class="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-100 to-transparent">
						</div>
						<Icon name="ph:game-controller-duotone" size="48" class="text-slate-200 dark:text-slate-500" />
					</div>

					<!-- Status Badge -->
					<div class="absolute top-3 right-3">
						<span :class="[
							'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm backdrop-blur-md',
							game.active ? 'bg-emerald-500/90 text-white border-transparent' : 'bg-white/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
						]">
							{{ game.active ? $t('games.status_active') : $t('games.status_draft') }}
						</span>
					</div>
				</div>

				<!-- Card Body -->
				<div class="p-5 flex-1 flex flex-col">
					<div class="mb-4">
						<h3
							class="font-bold text-slate-900 dark:text-white text-lg mb-1 line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
							{{ game.title }}</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono truncate">/{{
							game.slug }}</p>
					</div>

					<!-- Flyer Status -->
					<div class="pt-3 border-t border-slate-50 dark:border-slate-700 mb-4">
						<div v-if="game.flyerDesignUrl" class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Icon name="ph:check-circle-fill" class="text-emerald-500" size="16" />
								<span class="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{{ $t('games.flyer_ready') }}</span>
							</div>
							<button @click.stop="openOrderModal(game)"
								class="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold rounded-md transition-colors flex items-center gap-1">
								<Icon name="ph:shopping-cart-bold" size="12" />
								{{ $t('games.order_flyers') }}
							</button>
						</div>
						<div v-else class="flex items-center gap-2">
							<Icon name="ph:warning-circle-fill" class="text-amber-500" size="16" />
							<span class="text-xs text-amber-700 dark:text-amber-400 font-medium">{{ $t('games.flyer_not_configured') }}</span>
						</div>
					</div>

					<div class="mt-auto pt-4 flex gap-3">
						<NuxtLink :to="`/dashboard/games/${game.id}`"
							class="flex-1 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600">
							<Icon name="ph:gear-six-bold" />
							{{ $t('games.config_button') }}
						</NuxtLink>
						<a :href="`/play/${game.slug}`" target="_blank"
							class="py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500 rounded-lg transition-colors"
							:title="$t('games.preview_button')">
							<Icon name="ph:arrow-square-out-bold" />
						</a>
						<button @click.stop="openDeleteModal(game)"
							class="py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 rounded-lg transition-colors"
							:title="$t('games.delete_button')">
							<Icon name="ph:trash-bold" />
						</button>
					</div>
				</div>
			</div>

			<!-- Add New Card (at end of grid) -->
			<NuxtLink to="/dashboard/games/new"
				class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-all duration-300 flex flex-col items-center justify-center text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 h-full min-h-[300px] cursor-pointer group">
				<div
					class="w-12 h-12 rounded-full bg-white dark:bg-indigo-500/10 shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
					<Icon name="ph:plus-bold" size="24" />
				</div>
				<span class="font-bold text-sm">{{ $t('games.new_game') }}</span>
			</NuxtLink>
		</div>

		<!-- Order Modal -->
		<OrdersCreateOrderModal
			v-model="showOrderModal"
			:flyer-design-url="selectedGameForOrder?.flyerDesignUrl || undefined"
			:game-id="selectedGameForOrder?.id"
			@created="showToast(t('games.order_created'), 'success')"
		/>

		<!-- Delete Confirmation Modal -->
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
</template>
