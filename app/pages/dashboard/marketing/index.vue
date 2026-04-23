<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()
const { hasActiveSubscription, fetchSubscription } = useSubscription()
const route = useRoute()
const toast = useToast()

const stats = ref<any>(null)
const statsLoading = ref(true)
const campaigns = ref<any[]>([])
const campaignsLoading = ref(true)
const automations = ref<any[]>([])
const automationsLoading = ref(true)
const creditPacks = ref<any[]>([])
const buyingPackId = ref<string | null>(null)

const emailCredits = computed(() => stats.value?.emailCredits ?? 0)
const creditsExhausted = computed(() => !statsLoading.value && emailCredits.value === 0)

const fetchStats = async () => {
	statsLoading.value = true
	try { stats.value = await $api('/marketing/stats') }
	catch (e) { console.error(e) }
	finally { statsLoading.value = false }
}

const fetchCampaigns = async () => {
	campaignsLoading.value = true
	try { campaigns.value = await $api('/marketing/campaigns') }
	catch (e) { console.error(e) }
	finally { campaignsLoading.value = false }
}

const fetchAutomations = async () => {
	automationsLoading.value = true
	try { automations.value = await $api('/marketing/automations') }
	catch (e) { console.error(e) }
	finally { automationsLoading.value = false }
}

const fetchCreditPacks = async () => {
	try { creditPacks.value = await $api('/subscriptions/credit-packs') }
	catch (e) { console.error(e) }
}

const buyCreditPack = async (packId: string) => {
	buyingPackId.value = packId
	try {
		const { url } = await $api(`/subscriptions/buy-credits/${packId}`, { method: 'POST' })
		if (url) window.location.href = url
	} catch (e) {
		console.error(e)
		toast.show(t('common.error'), 'error')
	} finally {
		buyingPackId.value = null
	}
}

const statusConfig = computed(() => ({
	draft:     { label: t('marketing.campaigns.status_draft'),     dot: 'bg-slate-400',   text: 'text-slate-500' },
	scheduled: { label: t('marketing.campaigns.status_scheduled'), dot: 'bg-blue-500',    text: 'text-blue-600' },
	sending:   { label: t('marketing.campaigns.status_sending'),   dot: 'bg-amber-400',   text: 'text-amber-600' },
	sent:      { label: t('marketing.campaigns.status_sent'),      dot: 'bg-emerald-500', text: 'text-emerald-600' },
	cancelled: { label: t('marketing.campaigns.status_cancelled'), dot: 'bg-red-500',     text: 'text-red-600' },
}))

const getStatus = (s: string) => statusConfig.value[s] || statusConfig.value.draft

const automationsList = computed(() => [
	{ type: 'welcome',    label: t('marketing.automations.welcome_type'),        icon: 'ph:hand-waving-fill',     configured: !!automations.value.find(a => a.type === 'welcome'),    enabled: automations.value.find(a => a.type === 'welcome')?.enabled },
	{ type: 'inactivity', label: t('marketing.automations.inactivity_type'),     icon: 'ph:clock-clockwise-fill', configured: !!automations.value.find(a => a.type === 'inactivity'), enabled: automations.value.find(a => a.type === 'inactivity')?.enabled },
	{ type: 'post_win',   label: t('marketing.automations.prize_reminder_type'), icon: 'ph:gift-fill',            configured: !!automations.value.find(a => a.type === 'post_win'),   enabled: automations.value.find(a => a.type === 'post_win')?.enabled },
])

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchStats()
		fetchCampaigns()
		fetchAutomations()
		fetchCreditPacks()
	}

	if (route.query.credits_success === 'true') {
		toast.show(t('marketing.credits.purchase_success'), 'success')
		await fetchStats()
	} else if (route.query.credits_canceled === 'true') {
		toast.show(t('marketing.credits.purchase_canceled'), 'info')
	}
})
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('marketing.index.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('marketing.index.subtitle') }}</p>
			</div>
			<NuxtLink to="/dashboard/marketing/campaigns/new"
				:class="[
					'flex items-center gap-2 px-4 py-2 font-medium rounded-md transition-all text-sm whitespace-nowrap',
					creditsExhausted
						? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed pointer-events-none'
						: 'bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white'
				]">
				<Icon name="ph:plus-bold" size="15" />
				{{ $t('marketing.index.new_campaign') }}
			</NuxtLink>
		</div>

		<!-- Credits exhausted banner -->
		<div v-if="creditsExhausted" class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
			<!-- Top accent line -->
			<div class="h-0.5 w-full bg-amber-400" />

			<div class="p-5">
				<!-- Header -->
				<div class="flex items-start gap-3 mb-5">
					<div class="w-9 h-9 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
						<Icon name="ph:coins-fill" class="text-amber-500" size="16" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('marketing.credits.empty_title') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{{ $t('marketing.credits.empty_desc') }}</p>
					</div>
				</div>

				<!-- Packs list -->
				<div v-if="creditPacks.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-md overflow-hidden">
					<button
						v-for="pack in creditPacks"
						:key="pack.id"
						@click="buyCreditPack(pack.id)"
						:disabled="buyingPackId !== null"
						class="w-full flex items-center gap-3.5 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed">
						<div class="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
							<Icon name="ph:envelope-simple-bold" class="text-slate-400 dark:text-slate-500" size="13" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ pack.creditAmount }} {{ $t('marketing.credits.credits') }}</p>
							<p class="text-xs text-slate-400 dark:text-slate-500">{{ pack.name }}</p>
						</div>
						<div class="shrink-0 flex items-center gap-2.5">
							<span class="text-sm font-semibold text-slate-900 dark:text-white">{{ pack.price }} {{ pack.currency }}</span>
							<Icon v-if="buyingPackId === pack.id" name="ph:spinner-gap-bold" class="animate-spin text-slate-400" size="13" />
							<span v-else class="text-xs font-medium text-[#007AFF] bg-[#007AFF]/8 dark:bg-[#007AFF]/15 px-2 py-0.5 rounded">{{ $t('marketing.credits.buy') }}</span>
						</div>
					</button>
				</div>

				<!-- No packs empty state -->
				<div v-else class="flex items-center gap-3 px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-100 dark:border-slate-800">
					<Icon name="ph:info-bold" class="text-slate-400 shrink-0" size="15" />
					<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('marketing.credits.no_packs') }}</p>
				</div>
			</div>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
			<div v-for="(val, key) in {
				[t('marketing.index.stats.campaigns')]: statsLoading ? '—' : (stats?.totalCampaigns || 0),
				[t('marketing.index.stats.sent')]: statsLoading ? '—' : (stats?.totalSent || 0),
				[t('marketing.index.stats.open_rate')]: statsLoading ? '—' : `${stats?.openRate || 0}%`,
				[t('marketing.index.stats.automations')]: statsLoading ? '—' : (stats?.activeAutomations || 0),
				[t('marketing.index.stats.optin_players')]: statsLoading ? '—' : (stats?.optInPlayers || 0),
			}" :key="key" class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ key }}</p>
				<p class="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">{{ val }}</p>
			</div>

			<!-- Email credits stat card -->
			<div :class="[
				'bg-white dark:bg-slate-900 rounded-lg border px-4 py-3',
				creditsExhausted ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-800'
			]">
				<p class="text-xs mb-1" :class="creditsExhausted ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'">
					{{ $t('marketing.credits.title') }}
				</p>
				<div class="flex items-baseline gap-1">
					<p class="text-2xl font-semibold tabular-nums leading-none" :class="creditsExhausted ? 'text-red-500' : 'text-slate-900 dark:text-white'">
						{{ statsLoading ? '—' : emailCredits }}
					</p>
					<Icon v-if="creditsExhausted" name="ph:warning-fill" class="text-red-500 mb-0.5" size="14" />
				</div>
			</div>
		</div>

		<!-- Main grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

			<!-- Recent campaigns -->
			<div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
					<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.index.recent_campaigns') }}</p>
					<NuxtLink to="/dashboard/marketing/campaigns" class="text-xs font-medium text-[#007AFF] hover:text-[#0066DD] transition-colors">
						{{ $t('marketing.index.see_all') }} →
					</NuxtLink>
				</div>

				<div v-if="campaignsLoading" class="p-10 flex items-center justify-center">
					<Icon name="ph:spinner-gap-bold" size="24" class="text-slate-300 animate-spin" />
				</div>

				<div v-else-if="campaigns.length === 0" class="p-10 text-center">
					<div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mx-auto mb-3">
						<Icon name="ph:envelope-simple" size="18" class="text-slate-400" />
					</div>
					<p class="text-slate-400 text-sm mb-4">{{ $t('marketing.index.no_campaigns') }}</p>
					<NuxtLink to="/dashboard/marketing/campaigns/new"
						:class="[
							'inline-flex items-center gap-2 px-4 py-2 font-medium rounded-md text-sm',
							creditsExhausted ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 pointer-events-none' : 'bg-[#007AFF] text-white'
						]">
						<Icon name="ph:plus-bold" size="13" />
						{{ $t('marketing.index.create_campaign') }}
					</NuxtLink>
				</div>

				<div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
					<NuxtLink
						v-for="campaign in campaigns.slice(0, 5)" :key="campaign.id"
						:to="`/dashboard/marketing/campaigns/${campaign.id}`"
						class="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
						<div class="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
							<span :class="[getStatus(campaign.status).dot, 'w-2 h-2 rounded-full']"></span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-slate-900 dark:text-white truncate text-sm">{{ campaign.name }}</p>
							<p class="text-xs text-slate-400 truncate mt-0.5">{{ campaign.subject }}</p>
						</div>
						<div class="flex flex-col items-end gap-1 shrink-0">
							<span class="inline-flex items-center gap-1.5 text-xs" :class="getStatus(campaign.status).text">
								<span :class="[getStatus(campaign.status).dot, 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
								{{ getStatus(campaign.status).label }}
							</span>
							<span class="text-xs text-slate-400">{{ formatDate(campaign.createdAt) }}</span>
						</div>
						<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />
					</NuxtLink>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-3">

				<!-- Recharge credits (discreet, when credits > 0) -->
				<div v-if="!statsLoading && !creditsExhausted && creditPacks.length > 0"
					class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Icon name="ph:coins-fill" class="text-amber-500" size="15" />
							<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.credits.recharge') }}</p>
						</div>
						<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
							{{ emailCredits }} {{ $t('marketing.credits.credits') }}
						</span>
					</div>
					<div class="divide-y divide-slate-100 dark:divide-slate-800">
						<button
							v-for="pack in creditPacks.slice(0, 3)"
							:key="pack.id"
							@click="buyCreditPack(pack.id)"
							:disabled="buyingPackId !== null"
							class="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left disabled:opacity-50">
							<div class="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
								<Icon name="ph:envelope-simple-fill" class="text-amber-500" size="13" />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ pack.creditAmount }} {{ $t('marketing.credits.credits') }}</p>
								<p class="text-xs text-slate-400">{{ pack.name }}</p>
							</div>
							<div class="shrink-0 flex items-center gap-2">
								<span class="text-sm font-semibold text-slate-900 dark:text-white">{{ pack.price }} {{ pack.currency }}</span>
								<Icon v-if="buyingPackId === pack.id" name="ph:spinner-gap-bold" class="animate-spin text-slate-400" size="13" />
								<Icon v-else name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 rtl:rotate-180" />
							</div>
						</button>
					</div>
				</div>

				<!-- Quick actions -->
				<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
						<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.index.quick_actions') }}</p>
					</div>
					<div class="divide-y divide-slate-100 dark:divide-slate-800">
						<NuxtLink to="/dashboard/marketing/campaigns/new"
							:class="[
								'flex items-center gap-3 px-5 py-3 transition-colors',
								creditsExhausted ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
							]">
							<div class="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
								<Icon name="ph:plus-bold" class="text-slate-500 dark:text-slate-400" size="14" />
							</div>
							<span class="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{{ $t('marketing.index.new_campaign') }}</span>
							<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 rtl:rotate-180" />
						</NuxtLink>
						<NuxtLink to="/dashboard/players"
							class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
							<div class="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
								<Icon name="ph:users-three-fill" class="text-slate-500 dark:text-slate-400" size="14" />
							</div>
							<span class="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{{ $t('marketing.index.stats.see_players') }}</span>
							<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 rtl:rotate-180" />
						</NuxtLink>
					</div>
				</div>

				<!-- Automations -->
				<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div class="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
						<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.index.automations_link') }}</p>
						<NuxtLink to="/dashboard/marketing/automations"
							class="text-xs font-medium text-[#007AFF] hover:text-[#0066DD] transition-colors">
							{{ $t('marketing.index.manage') }} →
						</NuxtLink>
					</div>

					<div v-if="automationsLoading" class="p-5 flex items-center justify-center">
						<Icon name="ph:spinner-gap-bold" size="18" class="text-slate-300 animate-spin" />
					</div>

					<div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
						<NuxtLink v-for="auto in automationsList" :key="auto.type"
							to="/dashboard/marketing/automations"
							class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
							<div class="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
								<Icon :name="auto.icon" class="text-slate-400 dark:text-slate-500" size="12" />
							</div>
							<span class="text-sm text-slate-700 dark:text-slate-300 flex-1">{{ auto.label }}</span>
							<span class="inline-flex items-center gap-1 text-xs" :class="auto.enabled ? 'text-emerald-600' : auto.configured ? 'text-slate-400' : 'text-amber-500'">
								<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="auto.enabled ? 'bg-emerald-500' : auto.configured ? 'bg-slate-300' : 'bg-amber-400'"></span>
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
