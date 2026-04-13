<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

// Stats
const stats = ref<any>(null)
const statsLoading = ref(true)

// Campaigns
const campaigns = ref<any[]>([])
const campaignsLoading = ref(true)

// Automations
const automations = ref<any[]>([])
const automationsLoading = ref(true)

const fetchStats = async () => {
	statsLoading.value = true
	try {
		stats.value = await $api('/marketing/stats')
	} catch (e) {
		console.error('Error fetching marketing stats:', e)
	} finally {
		statsLoading.value = false
	}
}

const fetchCampaigns = async () => {
	campaignsLoading.value = true
	try {
		campaigns.value = await $api('/marketing/campaigns')
	} catch (e) {
		console.error('Error fetching campaigns:', e)
	} finally {
		campaignsLoading.value = false
	}
}

const fetchAutomations = async () => {
	automationsLoading.value = true
	try {
		automations.value = await $api('/marketing/automations')
	} catch (e) {
		console.error('Error fetching automations:', e)
	} finally {
		automationsLoading.value = false
	}
}

const getStatusBadge = (status: string) => {
	const badges: Record<string, { label: string; class: string }> = {
		draft: { label: t('marketing.campaigns.status_draft'), class: 'bg-slate-100 text-slate-600' },
		scheduled: { label: t('marketing.campaigns.status_scheduled'), class: 'bg-blue-100 text-blue-700' },
		sending: { label: t('marketing.campaigns.status_sending'), class: 'bg-yellow-100 text-yellow-700' },
		sent: { label: t('marketing.campaigns.status_sent'), class: 'bg-emerald-100 text-emerald-700' },
		cancelled: { label: t('marketing.campaigns.status_cancelled'), class: 'bg-red-100 text-red-700' },
	}
	return badges[status] || { label: status, class: 'bg-slate-100 text-slate-600' }
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchStats()
		fetchCampaigns()
		fetchAutomations()
	}
})
</script>

<template>
	<!-- Subscription Required -->
	<div v-if="!subscriptionLoading && !hasActiveSubscription" class="flex flex-col items-center justify-center py-20">
		<div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
			<Icon name="ph:lock-simple-fill" size="32" class="text-slate-400" />
		</div>
		<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('marketing.index.premium_feature') }}</h2>
		<p class="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
			{{ $t('marketing.index.premium_description') }}
		</p>
		<NuxtLink to="/dashboard/subscription"
			class="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors">
			{{ $t('marketing.index.see_offers') }}
		</NuxtLink>
	</div>

	<div v-else class="space-y-8">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
					{{ $t('marketing.index.title') }}
				</h1>
				<p class="text-slate-500 dark:text-slate-400 text-sm mt-1">
					{{ $t('marketing.index.subtitle') }}
				</p>
			</div>
			<NuxtLink to="/dashboard/marketing/campaigns/new"
				class="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20">
				<Icon name="ph:plus-bold" size="18" />
				{{ $t('marketing.index.new_campaign') }}
			</NuxtLink>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
			<!-- Total Campaigns -->
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('marketing.index.stats.campaigns') }}</span>
						<span class="text-3xl font-display font-bold text-slate-900 dark:text-white">
							{{ statsLoading ? '-' : (stats?.totalCampaigns || 0) }}
						</span>
					</div>
					<div class="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600">
						<Icon name="ph:envelope-simple-fill" size="20" />
					</div>
				</div>
			</div>

			<!-- Total Sent -->
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('marketing.index.stats.sent') }}</span>
						<span class="text-3xl font-display font-bold text-slate-900 dark:text-white">
							{{ statsLoading ? '-' : (stats?.totalSent || 0) }}
						</span>
					</div>
					<div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
						<Icon name="ph:paper-plane-tilt-fill" size="20" />
					</div>
				</div>
			</div>

			<!-- Open Rate -->
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('marketing.index.stats.open_rate') }}</span>
						<span class="text-3xl font-display font-bold text-slate-900 dark:text-white">
							{{ statsLoading ? '-' : `${stats?.openRate || 0}%` }}
						</span>
					</div>
					<div class="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600">
						<Icon name="ph:eye-fill" size="20" />
					</div>
				</div>
			</div>

			<!-- Active Automations -->
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('marketing.index.stats.automations') }}</span>
						<span class="text-3xl font-display font-bold text-slate-900 dark:text-white">
							{{ statsLoading ? '-' : (stats?.activeAutomations || 0) }}
						</span>
					</div>
					<div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
						<Icon name="ph:lightning-fill" size="20" />
					</div>
				</div>
				<NuxtLink to="/dashboard/marketing/automations" class="text-xs text-brand-500 hover:text-brand-600 font-medium">
					{{ $t('marketing.index.stats.configure') }}
				</NuxtLink>
			</div>

			<!-- Opt-in Players -->
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
				<div class="flex items-start justify-between mb-4">
					<div class="flex flex-col">
						<span class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('marketing.index.stats.optin_players') }}</span>
						<span class="text-3xl font-display font-bold text-slate-900 dark:text-white">
							{{ statsLoading ? '-' : (stats?.optInPlayers || 0) }}
						</span>
					</div>
					<div class="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600">
						<Icon name="ph:users-three-fill" size="20" />
					</div>
				</div>
				<NuxtLink to="/dashboard/players" class="text-xs text-brand-500 hover:text-brand-600 font-medium">
					{{ $t('marketing.index.stats.see_players') }}
				</NuxtLink>
			</div>
		</div>

		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Recent Campaigns -->
			<div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
				<div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
					<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('marketing.index.recent_campaigns') }}</h3>
					<NuxtLink to="/dashboard/marketing/campaigns" class="text-sm text-brand-600 hover:text-brand-700 font-medium">
						{{ $t('marketing.index.see_all') }}
					</NuxtLink>
				</div>

				<!-- Loading -->
				<div v-if="campaignsLoading" class="p-12 text-center">
					<Icon name="ph:spinner-gap-bold" size="32" class="mx-auto text-slate-300 animate-spin" />
				</div>

				<!-- Empty -->
				<div v-else-if="campaigns.length === 0" class="p-12 text-center">
					<div class="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
						<Icon name="ph:envelope-simple" size="32" class="text-slate-400" />
					</div>
					<p class="text-slate-500 dark:text-slate-400 mb-4">{{ $t('marketing.index.no_campaigns') }}</p>
					<NuxtLink to="/dashboard/marketing/campaigns/new"
						class="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-bold rounded-lg text-sm hover:bg-brand-700 transition-colors">
						<Icon name="ph:plus-bold" size="16" />
						{{ $t('marketing.index.create_campaign') }}
					</NuxtLink>
				</div>

				<!-- List -->
				<div v-else class="divide-y divide-slate-100 dark:divide-slate-700">
					<NuxtLink v-for="campaign in campaigns.slice(0, 5)" :key="campaign.id"
						:to="`/dashboard/marketing/campaigns/${campaign.id}`"
						class="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
						<div class="flex-1 min-w-0">
							<p class="font-bold text-slate-900 dark:text-white truncate">{{ campaign.name }}</p>
							<p class="text-sm text-slate-500 dark:text-slate-400 truncate">{{ campaign.subject }}</p>
						</div>
						<div class="flex items-center gap-3">
							<span :class="[getStatusBadge(campaign.status).class, 'text-xs font-bold px-2.5 py-1 rounded-full']">
								{{ getStatusBadge(campaign.status).label }}
							</span>
							<span class="text-xs text-slate-400">{{ formatDate(campaign.createdAt) }}</span>
						</div>
					</NuxtLink>
				</div>
			</div>

			<!-- Automations Sidebar -->
			<div class="space-y-6">
				<!-- Quick Actions -->
				<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
					<h3 class="font-bold text-slate-900 dark:text-white mb-4">{{ $t('marketing.index.quick_actions') }}</h3>
					<div class="space-y-3">
						<NuxtLink to="/dashboard/marketing/campaigns/new"
							class="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
							<div class="w-8 h-8 rounded-md bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600">
								<Icon name="ph:plus-bold" size="16" />
							</div>
							<span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ $t('marketing.index.new_campaign') }}</span>
						</NuxtLink>
						<NuxtLink to="/dashboard/marketing/automations"
							class="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
							<div class="w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600">
								<Icon name="ph:lightning-fill" size="16" />
							</div>
							<span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ $t('marketing.index.automations_link') }}</span>
						</NuxtLink>
						<NuxtLink to="/dashboard/players"
							class="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
							<div class="w-8 h-8 rounded-md bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600">
								<Icon name="ph:users-three-fill" size="16" />
							</div>
							<span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ $t('marketing.index.stats.see_players') }}</span>
						</NuxtLink>
					</div>
				</div>

				<!-- Tips -->
				<div class="bg-gradient-to-br from-brand-600 to-indigo-600 rounded-xl p-6 text-white">
					<div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
						<Icon name="ph:lightbulb-fill" size="20" />
					</div>
					<h4 class="font-bold mb-2">{{ $t('marketing.index.tip_title') }}</h4>
					<p class="text-sm text-white/80 leading-relaxed">
						{{ $t('marketing.index.tip_message') }}
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
