<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { hasActiveSubscription, fetchSubscription } = useSubscription()
const { formatDate } = useLocaleDate()

const sessions = ref<any[]>([])
const loading = ref(true)
const filter = ref<'all' | 'won' | 'lost'>('all')

const fetchSessions = async () => {
	loading.value = true
	try { sessions.value = await $api('/gameplay/sessions') }
	catch (error) { console.error('Failed to fetch sessions:', error) }
	finally { loading.value = false }
}

const filteredSessions = computed(() => {
	if (filter.value === 'won') return sessions.value.filter(s => s.prize !== null)
	if (filter.value === 'lost') return sessions.value.filter(s => s.prize === null)
	return sessions.value
})

const stats = computed(() => {
	const total = sessions.value.length
	const won = sessions.value.filter(s => s.prize !== null).length
	return { total, won, lost: total - won }
})

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) fetchSessions()
})
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('prizes.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{{ $t('prizes.subtitle') }}</p>
			</div>
		</div>

		<!-- Stats iOS widgets -->
		<div class="grid grid-cols-3 gap-3">
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('prizes.filter_all') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ loading ? '—' : stats.total }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('prizes.stats.won') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ loading ? '—' : stats.won }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('prizes.stats.lost') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ loading ? '—' : stats.lost }}</p>
			</div>
		</div>

		<!-- Filter pills — iOS segmented style -->
		<div class="flex gap-2">
			<button
				v-for="f in ['all', 'won', 'lost']" :key="f"
				@click="filter = f as any"
				class="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
				:class="filter === f
					? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
					: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300 hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]'">
				{{ f === 'all' ? $t('prizes.filter_all') : f === 'won' ? $t('prizes.filter_won') : $t('prizes.filter_lost') }}
			</button>
		</div>

		<!-- Sessions list — iOS grouped -->
		<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden shadow-sm">

			<div v-if="loading" class="p-10 flex items-center justify-center">
				<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-300" size="28" />
			</div>

			<div v-else-if="filteredSessions.length === 0" class="p-12 text-center">
				<div class="w-14 h-14 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-center mx-auto mb-3">
					<Icon name="ph:gift-duotone" size="28" class="text-slate-400" />
				</div>
				<p class="text-slate-500 dark:text-slate-400 text-sm font-medium">{{ $t('prizes.no_sessions') }}</p>
			</div>

			<div v-else class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
				<div
					v-for="session in filteredSessions" :key="session.id"
					class="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors">
					<!-- Result icon -->
					<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
						:class="session.prize ? 'bg-[#FF9500]/15 shadow-sm' : 'bg-[#F2F2F7] dark:bg-[#2C2C2E]'">
						<Icon
							:name="session.prize ? 'ph:trophy-fill' : 'ph:smiley-sad-fill'"
							:class="session.prize ? 'text-[#FF9500]' : 'text-slate-400'"
							size="19" />
					</div>
					<!-- Content -->
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-slate-900 dark:text-white text-sm truncate">
							{{ session.player?.firstName || $t('prizes.anonymous') }} {{ session.player?.lastName || '' }}
						</p>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
							{{ session.player?.email || $t('prizes.no_email') }}
						</p>
					</div>
					<!-- Prize / game -->
					<div class="text-right shrink-0">
						<p class="text-sm font-semibold"
							:class="session.prize ? 'text-[#FF9500]' : 'text-slate-400 dark:text-slate-500'">
							{{ session.prize ? session.prizeName : $t('prizes.lost_status') }}
						</p>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{{ session.game?.title || $t('prizes.unknown_game') }}</p>
					</div>
					<!-- Date -->
					<p class="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 w-20 text-right">{{ formatDate(session.createdAt) }}</p>
				</div>
			</div>
		</div>

	</div>
	</SubscriptionGate>
</template>
