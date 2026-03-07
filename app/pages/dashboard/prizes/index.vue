<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()
const { formatDate } = useLocaleDate()

const sessions = ref<any[]>([])
const loading = ref(true)
const filter = ref<'all' | 'won' | 'lost'>('all')

const fetchSessions = async () => {
	loading.value = true
	try {
		sessions.value = await $api('/gameplay/sessions')
	} catch (error) {
		console.error('Failed to fetch sessions:', error)
	} finally {
		loading.value = false
	}
}

const filteredSessions = computed(() => {
	if (filter.value === 'won') {
		return sessions.value.filter(s => s.prize !== null)
	}
	if (filter.value === 'lost') {
		return sessions.value.filter(s => s.prize === null)
	}
	return sessions.value
})

const stats = computed(() => {
	const total = sessions.value.length
	const won = sessions.value.filter(s => s.prize !== null).length
	const lost = total - won
	return { total, won, lost }
})

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchSessions()
	}
})
</script>

<template>
	<!-- Subscription Required -->
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('prizes.access_required')"
		:description="$t('prizes.access_description')"
		icon="ph:gift-fill"
	/>

	<div v-else class="space-y-8">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="font-display text-3xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">{{ $t('prizes.title') }}</h1>
				<p class="text-slate-500 dark:text-slate-400 font-medium">{{ $t('prizes.subtitle') }}</p>
			</div>

			<!-- Stats Cards (Mini) -->
			<div class="flex gap-4">
				<div
					class="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center min-w-[100px]">
					<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{{ $t('prizes.stats.won') }}</span>
					<span class="text-xl font-display font-bold text-brand-600 dark:text-brand-400">{{ stats.won
					}}</span>
				</div>
				<div
					class="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center min-w-[100px]">
					<span class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{{ $t('prizes.stats.lost') }}</span>
					<span class="text-xl font-display font-bold text-slate-600 dark:text-slate-200">{{ stats.lost
					}}</span>
				</div>
			</div>
		</div>

		<!-- Filter Tabs -->
		<div
			class="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
			<button v-for="f in ['all', 'won', 'lost']" :key="f" @click="filter = f as any"
				class="px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize"
				:class="filter === f ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'">
				{{ f === 'all' ? $t('prizes.filter_all') : f === 'won' ? $t('prizes.filter_won') : $t('prizes.filter_lost') }}
			</button>
		</div>

		<!-- Sessions List -->
		<div
			class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
			<div v-if="loading" class="p-12 text-center">
				<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-300 dark:text-slate-600 mx-auto"
					size="32" />
			</div>

			<div v-else-if="filteredSessions.length === 0" class="p-12 text-center">
				<div
					class="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
					<Icon name="ph:gift-duotone" size="32" />
				</div>
				<p class="text-slate-500 dark:text-slate-400 font-medium">{{ $t('prizes.no_sessions') }}</p>
			</div>

			<table v-else class="w-full text-left">
				<thead class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
					<tr>
						<th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{{ $t('prizes.table.player') }}</th>
						<th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{{ $t('prizes.table.game_result') }}</th>
						<th class="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right rtl:text-left">
							{{ $t('prizes.table.date') }}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
					<tr v-for="session in filteredSessions" :key="session.id"
						class="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
						<td class="px-6 py-4">
							<div class="font-bold text-slate-900 dark:text-white">{{ session.player?.firstName ||
								$t('prizes.anonymous') }}
								{{ session.player?.lastName || '' }}
							</div>
							<div class="text-xs text-slate-500 dark:text-slate-400">
								{{ session.player?.email || $t('prizes.no_email') }}
							</div>
						</td>
						<td class="px-6 py-4">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
									:class="session.prize ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300'">
									<Icon :name="session.prize ? 'ph:trophy-fill' : 'ph:smiley-sad-duotone'"
										size="20" />
								</div>
								<div>
									<div class="font-bold text-sm"
										:class="session.prize ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'">
										{{ session.prize ? session.prizeName : $t('prizes.lost_status') }}
									</div>
									<div class="text-xs text-slate-400 dark:text-slate-500">{{ session.game?.title ||
										$t('prizes.unknown_game') }}</div>
								</div>
							</div>
						</td>
						<td class="px-6 py-4 text-right rtl:text-left text-sm text-slate-500 dark:text-slate-400 tabular-nums">
							{{ formatDate(session.createdAt) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
