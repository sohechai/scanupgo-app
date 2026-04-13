<script setup lang="ts">
const props = defineProps<{
	gameId: string
}>()

const { t } = useI18n()
const { $api } = useNuxtApp()
const { show: showToast } = useToast()

interface Prize {
	id?: string
	name: string
	description?: string
	imageUrl?: string // Used to store emoji
	rank: number
	quantity: number
	probability: number
	winningMessage: string
	status: string
}

// Emoji categories for prizes
const emojiCategories = computed(() => [
	{
		name: t('games.prizes.food_category'),
		emojis: ['☕', '🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍜', '🍣', '🍰', '🧁', '🍩', '🍪', '🍦', '🥤', '🍺', '🍷', '🥐', '🥖', '🍫']
	},
	{
		name: t('games.prizes.discount_category'),
		emojis: ['💰', '🏷️', '💵', '💸', '🎫', '🎟️', '💳', '🪙', '💎', '⭐', '🌟', '✨', '🔥', '💯', '🎁', '🎀', '🏆', '🥇', '👑', '💝']
	}
])

const prizes = ref<Prize[]>([])
const loading = ref(false)
const modalOpen = ref(false)
const deleteModalOpen = ref(false)
const editingPrize = ref<Prize | null>(null)
const prizeToDelete = ref<string | null>(null)
const saving = ref(false)
const deleting = ref(false)
const showEmojiPicker = ref(false)

const form = ref<Prize>({
	name: '',
	description: '',
	imageUrl: '',
	rank: 1,
	quantity: 10,
	probability: 20,
	winningMessage: t('games.prizes.default_message'),
	status: 'active'
})

const fetchPrizes = async () => {
	if (!props.gameId) return
	loading.value = true
	try {
		const items = await $api<Prize[]>(`/prizes?gameId=${props.gameId}`)
		prizes.value = items
	} catch (e) {
		console.error('Error fetching prizes:', e)
	} finally {
		loading.value = false
	}
}

const openModal = (prize?: Prize) => {
	if (prize) {
		editingPrize.value = prize
		form.value = { ...prize }
	} else {
		editingPrize.value = null
		// Auto-increment rank logic
		const nextRank = prizes.value.length + 1
		form.value = {
			name: '',
			description: '',
			imageUrl: '',
			rank: nextRank <= 3 ? nextRank : 3,
			quantity: 10,
			probability: 20,
			winningMessage: t('games.prizes.default_message'),
			status: 'active'
		}
	}
	showEmojiPicker.value = false
	modalOpen.value = true
}

const closeModal = () => {
	modalOpen.value = false
	editingPrize.value = null
	showEmojiPicker.value = false
}

const selectEmoji = (emoji: string) => {
	form.value.imageUrl = emoji
	showEmojiPicker.value = false
}

const removeEmoji = () => {
	form.value.imageUrl = ''
}

const savePrize = async () => {
	saving.value = true
	try {
		// Only send allowed fields from DTO
		const payload = {
			name: form.value.name,
			description: form.value.description || null,
			imageUrl: form.value.imageUrl || null,
			rank: form.value.rank,
			quantity: form.value.quantity,
			probability: form.value.probability,
			winningMessage: form.value.winningMessage,
			status: form.value.status,
			gameId: props.gameId
		}

		if (editingPrize.value?.id) {
			await $api(`/prizes/${editingPrize.value.id}`, {
				method: 'PATCH',
				body: payload
			})
		} else {
			await $api('/prizes', {
				method: 'POST',
				body: payload
			})
		}

		await fetchPrizes()
		closeModal()
	} catch (e: any) {
		console.error('Error saving prize:', e)
		const errorMsg = e?.data?.message || 'Erreur lors de la sauvegarde du lot.'
		showToast(errorMsg, 'error')
	} finally {
		saving.value = false
	}
}

const confirmDelete = (id: string) => {
	prizeToDelete.value = id
	deleteModalOpen.value = true
}

const closeDeleteModal = () => {
	deleteModalOpen.value = false
	prizeToDelete.value = null
}

const deletePrizeItem = async () => {
	if (!prizeToDelete.value) return
	deleting.value = true
	try {
		await $api(`/prizes/${prizeToDelete.value}`, {
			method: 'DELETE'
		})
		await fetchPrizes()
		closeDeleteModal()
	} catch (e) {
		console.error('Error deleting prize:', e)
	} finally {
		deleting.value = false
	}
}

onMounted(() => {
	if (props.gameId && props.gameId !== 'new') {
		fetchPrizes()
	}
})

watch(() => props.gameId, (newId) => {
	if (newId && newId !== 'new') {
		fetchPrizes()
	}
})
</script>

<template>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-display font-bold text-slate-900 dark:text-white">{{ $t('games.prizes.modal_title') }}</h3>
			<button @click="openModal()"
				class="text-sm font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-4 py-2 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors flex items-center gap-2">
				<Icon name="ph:plus-bold" />
				{{ $t('games.prizes.add_button') }}
			</button>
		</div>

		<div v-if="loading" class="flex justify-center py-12">
			<Icon name="ph:spinner-gap-bold" class="animate-spin text-brand-500" size="32" />
		</div>

		<div v-else-if="prizes.length === 0"
			class="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600">
			<div
				class="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
				<Icon name="ph:gift-duotone" size="24" />
			</div>
			<p class="text-slate-500 dark:text-slate-400 font-medium">{{ $t('games.prizes.no_prizes') }}</p>
		</div>

		<div v-else class="grid gap-4">
			<div v-for="prize in prizes" :key="prize.id"
				class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow group">
				<!-- Prize Emoji or Rank -->
				<div v-if="prize.imageUrl"
					class="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl shrink-0">
					{{ prize.imageUrl }}
				</div>
				<div v-else
					class="w-12 h-12 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500 font-bold font-display text-lg shrink-0">
					{{ prize.rank }}
				</div>

				<div class="flex-1 min-w-0">
					<h4 class="font-bold text-slate-900 dark:text-white truncate">{{ prize.name }}</h4>
					<div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
						<span class="flex items-center gap-1">
							<Icon name="ph:stack-duotone" />
							{{ prize.quantity }} {{ $t('games.prizes.ex_count') }}
						</span>
						<span class="flex items-center gap-1">
							<Icon name="ph:percent-duotone" />
							{{ prize.probability }}%
						</span>
					</div>
				</div>

				<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<button @click="openModal(prize)"
						class="p-2 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors">
						<Icon name="ph:pencil-simple-bold" />
					</button>
					<button @click="confirmDelete(prize.id!)"
						class="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
						<Icon name="ph:trash-bold" />
					</button>
				</div>
			</div>
		</div>

		<!-- Edit Modal -->
		<div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeModal"></div>
			<div
				class="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
				<div
					class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-700/30 sticky top-0 z-10">
					<h3 class="font-display font-bold text-lg text-slate-900 dark:text-white">
						{{ editingPrize ? $t('games.prizes.modal_title_edit') : $t('games.prizes.modal_title_new') }}
					</h3>
					<button @click="closeModal"
						class="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
						<Icon name="ph:x-bold" size="20" />
					</button>
				</div>

				<div class="p-6 space-y-4">
					<div class="grid grid-cols-4 gap-4">
						<div class="col-span-1">
							<label
								class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{{ $t('games.prizes.rank') }}</label>
							<input v-model.number="form.rank" type="number" min="1" max="10"
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-center font-bold text-slate-900 dark:text-white focus:border-brand-500 outline-none">
						</div>
						<div class="col-span-3">
							<label
								class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{{ $t('games.prizes.name') }}</label>
							<input v-model="form.name" type="text" :placeholder="$t('games.prizes.name_placeholder')" required
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:border-brand-500 outline-none placeholder-slate-400 dark:placeholder-slate-500">
						</div>
					</div>

					<!-- Emoji Selection -->
					<div>
						<label
							class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
							{{ $t('games.prizes.icon') }}
						</label>

						<!-- Selected Emoji Display -->
						<div v-if="form.imageUrl && !showEmojiPicker" class="flex items-center gap-3">
							<div
								class="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-4xl shrink-0">
								{{ form.imageUrl }}
							</div>
							<div class="flex-1">
								<p class="text-sm text-slate-600 dark:text-slate-300">{{ $t('games.prizes.icon_selected') }}</p>
								<div class="flex gap-2 mt-1">
									<button type="button" @click="showEmojiPicker = true"
										class="text-xs text-brand-600 dark:text-brand-400 hover:underline">
										{{ $t('games.prizes.icon_change') }}
									</button>
									<button type="button" @click="removeEmoji"
										class="text-xs text-red-500 hover:underline">
										{{ $t('games.prizes.icon_remove') }}
									</button>
								</div>
							</div>
						</div>

						<!-- Emoji Picker -->
						<div v-else
							class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
							<div v-for="category in emojiCategories" :key="category.name" class="mb-4 last:mb-0">
								<p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
									{{ category.name }}
								</p>
								<div class="flex flex-wrap gap-2">
									<button v-for="emoji in category.emojis" :key="emoji" type="button"
										@click="selectEmoji(emoji)"
										class="w-10 h-10 text-2xl rounded-lg hover:bg-white dark:hover:bg-slate-600 hover:shadow-md transition-all flex items-center justify-center"
										:class="{ 'bg-brand-100 dark:bg-brand-500/20 ring-2 ring-brand-500': form.imageUrl === emoji }">
										{{ emoji }}
									</button>
								</div>
							</div>

							<button v-if="form.imageUrl" type="button" @click="showEmojiPicker = false"
								class="mt-3 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
								{{ $t('games.prizes.return_link') }}
							</button>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label
								class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{{ $t('games.prizes.quantity') }}</label>
							<input v-model.number="form.quantity" type="number" min="0"
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:border-brand-500 outline-none">
						</div>
						<div>
							<label
								class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{{ $t('games.prizes.probability') }}</label>
							<div class="relative">
								<input v-model.number="form.probability" type="number" min="0" max="100" step="0.1"
									class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:border-brand-500 outline-none">
								<span
									class="absolute right-4 top-2 text-slate-400 dark:text-slate-500 text-sm font-bold">%</span>
							</div>
						</div>
					</div>

					<div>
						<label
							class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{{ $t('games.prizes.message') }}</label>
						<textarea v-model="form.winningMessage" rows="2"
							class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:border-brand-500 outline-none resize-none"></textarea>
					</div>
				</div>

				<div class="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 flex justify-end gap-3 sticky bottom-0">
					<button @click="closeModal"
						class="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
						{{ $t('games.prizes.modal_cancel') }}
					</button>
					<button @click="savePrize" :disabled="saving"
						class="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center gap-2">
						<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" />
						{{ saving ? $t('games.prizes.modal_saving') : $t('games.prizes.modal_save') }}
					</button>
				</div>
			</div>
		</div>

		<!-- Delete Confirmation Modal -->
		<div v-if="deleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeDeleteModal"></div>
			<div
				class="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
				<div class="p-6 text-center">
					<div
						class="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
						<Icon name="ph:trash-bold" size="32" />
					</div>
					<h3 class="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">{{ $t('games.prizes.delete_title') }}
					</h3>
					<p class="text-slate-500 dark:text-slate-400 mb-6 text-sm">
						{{ $t('games.prizes.delete_message') }}
					</p>

					<div class="flex gap-3 justify-center">
						<button @click="closeDeleteModal"
							class="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
							{{ $t('games.prizes.delete_cancel') }}
						</button>
						<button @click="deletePrizeItem" :disabled="deleting"
							class="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 flex items-center gap-2 disabled:opacity-50">
							<Icon v-if="deleting" name="ph:spinner-gap-bold" class="animate-spin" />
							{{ deleting ? $t('games.prizes.delete_deleting') : $t('games.prizes.delete_confirm') }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
