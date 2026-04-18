<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()
const { show: showToast } = useToast()

const campaigns = ref<any[]>([])
const loading = ref(true)

const fetchCampaigns = async () => {
	loading.value = true
	try {
		campaigns.value = await $api('/marketing/campaigns')
	} catch (e) {
		console.error('Error fetching campaigns:', e)
	} finally {
		loading.value = false
	}
}

const deleteCampaign = async (id: string) => {
	if (!confirm(t('marketing.campaign_detail.delete_confirmation_message'))) return
	try {
		await $api(`/marketing/campaigns/${id}`, { method: 'DELETE' })
		campaigns.value = campaigns.value.filter(c => c.id !== id)
		showToast(t('marketing.campaigns.delete'), 'success')
	} catch (e) {
		showToast(t('common.error'), 'error')
	}
}

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
	draft:     { label: t('marketing.campaigns.status_draft'),     dot: 'bg-slate-400',   text: 'text-slate-500' },
	scheduled: { label: t('marketing.campaigns.status_scheduled'), dot: 'bg-blue-500',    text: 'text-blue-600' },
	sending:   { label: t('marketing.campaigns.status_sending'),   dot: 'bg-amber-400',   text: 'text-amber-600' },
	sent:      { label: t('marketing.campaigns.status_sent'),      dot: 'bg-emerald-500', text: 'text-emerald-600' },
	cancelled: { label: t('marketing.campaigns.status_cancelled'), dot: 'bg-red-500',     text: 'text-red-600' },
}
const getStatus = (s: string) => statusConfig[s] || statusConfig.draft

onMounted(() => {
	fetchCampaigns()
})
</script>

<template>
	<div class="space-y-5">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<NuxtLink to="/dashboard/marketing"
					class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
					<Icon name="ph:arrow-left-bold" size="15" class="rtl:rotate-180" />
				</NuxtLink>
				<div>
					<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('marketing.campaigns.title') }}</h1>
					<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
						{{ campaigns.length }} {{ $t('marketing.campaigns.campaigns_count') }}{{ campaigns.length > 1 ? 's' : '' }}
					</p>
				</div>
			</div>
			<NuxtLink to="/dashboard/marketing/campaigns/new"
				class="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white font-medium rounded-md hover:bg-[#0066DD] transition-colors text-sm">
				<Icon name="ph:plus-bold" size="15" />
				{{ $t('marketing.index.new_campaign') }}
			</NuxtLink>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-16">
			<Icon name="ph:spinner-gap-bold" size="28" class="animate-spin text-slate-300" />
		</div>

		<!-- Empty -->
		<div v-else-if="campaigns.length === 0"
			class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center">
			<div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
				<Icon name="ph:envelope-simple" size="22" class="text-slate-400" />
			</div>
			<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">{{ $t('marketing.campaigns.no_campaigns') }}</h3>
			<p class="text-sm text-slate-400 dark:text-slate-500 mb-5 max-w-sm mx-auto">{{ $t('marketing.campaigns.no_campaigns_description') }}</p>
			<NuxtLink to="/dashboard/marketing/campaigns/new"
				class="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white font-medium rounded-md hover:bg-[#0066DD] transition-colors text-sm">
				<Icon name="ph:plus-bold" size="14" />
				{{ $t('marketing.index.new_campaign') }}
			</NuxtLink>
		</div>

		<!-- Table -->
		<div v-else class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
			<table class="w-full">
				<thead>
					<tr class="border-b border-slate-100 dark:border-slate-800">
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaigns.campaign') }}</th>
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaigns.status') }}</th>
						<th class="px-5 py-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaigns.sent') }}</th>
						<th class="px-5 py-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaigns.opened') }}</th>
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaigns.date') }}</th>
						<th class="px-5 py-3 text-right text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaigns.actions') }}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
					<tr v-for="campaign in campaigns" :key="campaign.id"
						class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
						<td class="px-5 py-3.5">
							<NuxtLink :to="`/dashboard/marketing/campaigns/${campaign.id}`" class="block">
								<p class="font-medium text-slate-900 dark:text-white hover:text-[#007AFF] transition-colors text-sm">{{ campaign.name }}</p>
								<p class="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs mt-0.5">{{ campaign.subject }}</p>
							</NuxtLink>
						</td>
						<td class="px-5 py-3.5">
							<span class="inline-flex items-center gap-1.5 text-xs" :class="getStatus(campaign.status).text">
								<span :class="[getStatus(campaign.status).dot, 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
								{{ getStatus(campaign.status).label }}
							</span>
						</td>
						<td class="px-5 py-3.5 text-center">
							<span class="font-medium text-slate-900 dark:text-white text-sm tabular-nums">{{ campaign.sentCount || 0 }}</span>
							<span class="text-slate-400 text-xs">/{{ campaign.recipientCount || 0 }}</span>
						</td>
						<td class="px-5 py-3.5 text-center">
							<span class="font-medium text-slate-900 dark:text-white text-sm tabular-nums">{{ campaign.openCount || 0 }}</span>
						</td>
						<td class="px-5 py-3.5 text-xs text-slate-400 dark:text-slate-500">{{ formatDate(campaign.createdAt) }}</td>
						<td class="px-5 py-3.5 text-right">
							<div class="flex items-center justify-end gap-1">
								<NuxtLink :to="`/dashboard/marketing/campaigns/${campaign.id}`"
									class="p-1.5 text-slate-400 hover:text-[#007AFF] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
									<Icon name="ph:eye-bold" size="15" />
								</NuxtLink>
								<button v-if="campaign.status === 'draft'" @click="deleteCampaign(campaign.id)"
									class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors">
									<Icon name="ph:trash-bold" size="15" />
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
