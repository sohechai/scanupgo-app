<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()

const { data: stats, isLoading: statsLoading } = useMarketingStatsQuery()
const { data: campaigns, isLoading: campaignsLoading } = useCampaignsQuery()
const { data: automations, isLoading: automationsLoading } = useAutomationsQuery()

const statusConfig = computed(() => ({
	draft:     { label: t('marketing.campaigns.status_draft'),     dot: 'bg-slate-400',  bg: 'bg-slate-100 dark:bg-slate-700',  text: 'text-slate-500 dark:text-slate-300' },
	scheduled: { label: t('marketing.campaigns.status_scheduled'), dot: 'bg-[#007AFF]',  bg: 'bg-[#007AFF]/10',                 text: 'text-[#007AFF]' },
	sending:   { label: t('marketing.campaigns.status_sending'),   dot: 'bg-[#FF9500]',  bg: 'bg-[#FF9500]/10',                 text: 'text-[#FF9500]' },
	sent:      { label: t('marketing.campaigns.status_sent'),      dot: 'bg-[#34C759]',  bg: 'bg-[#34C759]/10',                 text: 'text-[#34C759]' },
	cancelled: { label: t('marketing.campaigns.status_cancelled'), dot: 'bg-[#FF3B30]',  bg: 'bg-[#FF3B30]/10',                 text: 'text-[#FF3B30]' },
}))

const getStatus = (s: string) => statusConfig.value[s] || statusConfig.value.draft

const automationsList = computed(() => {
	const list = automations.value ?? []
	return [
		{ type: 'welcome',    label: t('marketing.automations.welcome_type'),        icon: 'ph:hand-waving-fill',    configured: !!list.find(a => a.type === 'welcome'),    enabled: list.find(a => a.type === 'welcome')?.enabled },
		{ type: 'inactivity', label: t('marketing.automations.inactivity_type'),     icon: 'ph:clock-clockwise-fill', configured: !!list.find(a => a.type === 'inactivity'), enabled: list.find(a => a.type === 'inactivity')?.enabled },
		{ type: 'post_win',   label: t('marketing.automations.prize_reminder_type'), icon: 'ph:gift-fill',           configured: !!list.find(a => a.type === 'post_win'),   enabled: list.find(a => a.type === 'post_win')?.enabled },
	]
})
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-5">

		<!-- ── Header ── -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('marketing.index.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{{ $t('marketing.index.subtitle') }}</p>
			</div>
			<NuxtLink to="/dashboard/marketing/campaigns/new"
				class="flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-[#007AFF]/25 whitespace-nowrap">
				<Icon name="ph:plus-bold" size="15" />
				{{ $t('marketing.index.new_campaign') }}
			</NuxtLink>
		</div>

		<!-- ── Stats strip ── -->
		<div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 dark:text-slate-500 mb-1 font-medium">{{ $t('marketing.index.stats.campaigns') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ statsLoading ? '—' : (stats?.totalCampaigns || 0) }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 dark:text-slate-500 mb-1 font-medium">{{ $t('marketing.index.stats.sent') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ statsLoading ? '—' : (stats?.totalSent || 0) }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 dark:text-slate-500 mb-1 font-medium">{{ $t('marketing.index.stats.open_rate') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ statsLoading ? '—' : `${stats?.openRate || 0}%` }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 dark:text-slate-500 mb-1 font-medium">{{ $t('marketing.index.stats.automations') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ statsLoading ? '—' : (stats?.activeAutomations || 0) }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 dark:text-slate-500 mb-1 font-medium">{{ $t('marketing.index.stats.optin_players') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ statsLoading ? '—' : (stats?.optInPlayers || 0) }}</p>
			</div>
		</div>

		<!-- ── Main grid ── -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

			<!-- Recent campaigns -->
			<div class="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden shadow-sm">
				<!-- Header -->
				<div class="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA] dark:border-slate-700/40">
					<p class="text-sm font-bold text-slate-800 dark:text-white">{{ $t('marketing.index.recent_campaigns') }}</p>
					<NuxtLink to="/dashboard/marketing/campaigns" class="text-xs font-semibold text-[#007AFF] hover:text-[#0066DD] transition-colors">
						{{ $t('marketing.index.see_all') }} →
					</NuxtLink>
				</div>

				<!-- Loading -->
				<div v-if="campaignsLoading" class="p-10 flex items-center justify-center">
					<Icon name="ph:spinner-gap-bold" size="28" class="text-slate-300 animate-spin" />
				</div>

				<!-- Empty -->
				<div v-else-if="campaigns.length === 0" class="p-10 text-center">
					<div class="w-14 h-14 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-center mx-auto mb-3">
						<Icon name="ph:envelope-simple" size="26" class="text-slate-400" />
					</div>
					<p class="text-slate-500 dark:text-slate-400 text-sm mb-4">{{ $t('marketing.index.no_campaigns') }}</p>
					<NuxtLink to="/dashboard/marketing/campaigns/new"
						class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] text-white font-semibold rounded-xl text-sm shadow-md shadow-[#007AFF]/25">
						<Icon name="ph:plus-bold" size="14" />
						{{ $t('marketing.index.create_campaign') }}
					</NuxtLink>
				</div>

				<!-- List -->
				<div v-else class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
					<NuxtLink
						v-for="campaign in campaigns.slice(0, 5)" :key="campaign.id"
						:to="`/dashboard/marketing/campaigns/${campaign.id}`"
						class="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors group">
						<!-- Status dot accent -->
						<div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
							:class="getStatus(campaign.status).bg">
							<span :class="[getStatus(campaign.status).dot, 'w-2.5 h-2.5 rounded-full']"></span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-slate-900 dark:text-white truncate text-sm">{{ campaign.name }}</p>
							<p class="text-xs text-slate-400 truncate mt-0.5">{{ campaign.subject }}</p>
						</div>
						<div class="flex flex-col items-end gap-1 shrink-0">
							<span :class="[getStatus(campaign.status).bg, getStatus(campaign.status).text]"
								class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold">
								{{ getStatus(campaign.status).label }}
							</span>
							<span class="text-[11px] text-slate-400">{{ formatDate(campaign.createdAt) }}</span>
						</div>
						<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0" />
					</NuxtLink>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-3">

				<!-- Quick actions -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden shadow-sm">
					<div class="px-5 py-3.5 border-b border-[#E5E5EA] dark:border-slate-700/40">
						<p class="text-sm font-bold text-slate-800 dark:text-white">{{ $t('marketing.index.quick_actions') }}</p>
					</div>
					<div class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
						<NuxtLink to="/dashboard/marketing/campaigns/new"
							class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors group">
							<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
								<Icon name="ph:plus-bold" class="text-slate-500 dark:text-slate-400" size="16" />
							</div>
							<span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{{ $t('marketing.index.new_campaign') }}</span>
							<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600" />
						</NuxtLink>
						<NuxtLink to="/dashboard/players"
							class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors group">
							<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
								<Icon name="ph:users-three-fill" class="text-slate-500 dark:text-slate-400" size="16" />
							</div>
							<span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{{ $t('marketing.index.stats.see_players') }}</span>
							<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600" />
						</NuxtLink>
					</div>
				</div>

				<!-- Automations card -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden shadow-sm">
					<div class="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5EA] dark:border-slate-700/40">
						<div class="flex items-center gap-2">
							<Icon name="ph:lightning-fill" class="text-slate-400 dark:text-slate-500" size="14" />
							<p class="text-sm font-bold text-slate-800 dark:text-white">{{ $t('marketing.index.automations_link') }}</p>
						</div>
						<NuxtLink to="/dashboard/marketing/automations"
							class="text-xs font-semibold text-[#007AFF] hover:text-[#0066DD] transition-colors">
							{{ $t('marketing.index.manage') }} →
						</NuxtLink>
					</div>

					<!-- Loading -->
					<div v-if="automationsLoading" class="p-5 flex items-center justify-center">
						<Icon name="ph:spinner-gap-bold" size="20" class="text-slate-300 animate-spin" />
					</div>

					<div v-else class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
						<NuxtLink v-for="auto in automationsList" :key="auto.type"
							to="/dashboard/marketing/automations"
							class="flex items-center gap-3 px-5 py-3 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors">
							<div class="w-7 h-7 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
								<Icon :name="auto.icon" class="text-slate-400 dark:text-slate-500" size="13" />
							</div>
							<span class="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{{ auto.label }}</span>
							<span :class="auto.enabled
									? 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20'
									: auto.configured
										? 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-400 border-[#E5E5EA] dark:border-slate-700/40'
										: 'bg-[#FF9500]/8 text-[#FF9500] border-[#FF9500]/20'"
								class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border">
								{{ auto.enabled ? $t('marketing.automations.active') : auto.configured ? $t('marketing.automations.inactive') : $t('marketing.index.to_configure') }}
							</span>
						</NuxtLink>
					</div>
				</div>

			</div>
		</div>
	</div>
	</SubscriptionGate>
</template>
