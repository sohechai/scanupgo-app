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

const getStatusBadge = (status: string) => {
	const badges: Record<string, { label: string; class: string; icon: string }> = {
		draft: { label: t('marketing.campaigns.status_draft'), class: 'bg-slate-100 text-slate-600', icon: 'ph:pencil-simple' },
		scheduled: { label: t('marketing.campaigns.status_scheduled'), class: 'bg-blue-100 text-blue-700', icon: 'ph:clock' },
		sending: { label: t('marketing.campaigns.status_sending'), class: 'bg-yellow-100 text-yellow-700', icon: 'ph:spinner-gap' },
		sent: { label: t('marketing.campaigns.status_sent'), class: 'bg-emerald-100 text-emerald-700', icon: 'ph:check-circle' },
		cancelled: { label: t('marketing.campaigns.status_cancelled'), class: 'bg-red-100 text-red-700', icon: 'ph:x-circle' },
	}
	return badges[status] || { label: status, class: 'bg-slate-100 text-slate-600', icon: 'ph:question' }
}

onMounted(() => {
	fetchCampaigns()
})
</script>

<template>
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<NuxtLink to="/dashboard/marketing"
					class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
					<Icon name="ph:arrow-left-bold" size="20" class="rtl:rotate-180" />
				</NuxtLink>
				<div>
					<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
						{{ $t('marketing.campaigns.title') }}
					</h1>
					<p class="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
						{{ campaigns.length }} {{ $t('marketing.campaigns.campaigns_count') }}{{ campaigns.length > 1 ? 's' : '' }}
					</p>
				</div>
			</div>
			<NuxtLink to="/dashboard/marketing/campaigns/new"
				class="flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] text-white font-bold rounded-xl hover:bg-[#0066DD] transition-colors shadow-lg shadow-[#007AFF]/20">
				<Icon name="ph:plus-bold" size="18" />
				{{ $t('marketing.index.new_campaign') }}
			</NuxtLink>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-20">
			<Icon name="ph:spinner-gap-bold" size="40" class="animate-spin text-slate-300" />
		</div>

		<!-- Empty -->
		<div v-else-if="campaigns.length === 0"
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-12 text-center">
			<div class="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon name="ph:envelope-simple" size="40" class="text-slate-400" />
			</div>
			<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ $t('marketing.campaigns.no_campaigns') }}</h3>
			<p class="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
				{{ $t('marketing.campaigns.no_campaigns_description') }}
			</p>
			<NuxtLink to="/dashboard/marketing/campaigns/new"
				class="inline-flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-white font-bold rounded-xl hover:bg-[#0066DD] transition-colors">
				<Icon name="ph:plus-bold" size="18" />
				{{ $t('marketing.index.new_campaign') }}
			</NuxtLink>
		</div>

		<!-- List -->
		<div v-else class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
			<table class="w-full">
				<thead class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							{{ $t('marketing.campaigns.campaign') }}
						</th>
						<th class="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							{{ $t('marketing.campaigns.status') }}
						</th>
						<th class="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							{{ $t('marketing.campaigns.sent') }}
						</th>
						<th class="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							{{ $t('marketing.campaigns.opened') }}
						</th>
						<th class="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							{{ $t('marketing.campaigns.date') }}
						</th>
						<th class="px-6 py-3 text-right rtl:text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							{{ $t('marketing.campaigns.actions') }}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-700">
					<tr v-for="campaign in campaigns" :key="campaign.id"
						class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
						<td class="px-6 py-4">
							<NuxtLink :to="`/dashboard/marketing/campaigns/${campaign.id}`" class="block">
								<p class="font-bold text-slate-900 dark:text-white hover:text-[#007AFF] transition-colors">
									{{ campaign.name }}
								</p>
								<p class="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">
									{{ campaign.subject }}
								</p>
							</NuxtLink>
						</td>
						<td class="px-6 py-4">
							<span :class="[getStatusBadge(campaign.status).class, 'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full']">
								<Icon :name="getStatusBadge(campaign.status).icon" size="12" />
								{{ getStatusBadge(campaign.status).label }}
							</span>
						</td>
						<td class="px-6 py-4 text-center">
							<span class="font-bold text-slate-900 dark:text-white">{{ campaign.sentCount || 0 }}</span>
							<span class="text-slate-400">/{{ campaign.recipientCount || 0 }}</span>
						</td>
						<td class="px-6 py-4 text-center">
							<span class="font-bold text-slate-900 dark:text-white">{{ campaign.openCount || 0 }}</span>
						</td>
						<td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
							{{ formatDate(campaign.createdAt) }}
						</td>
						<td class="px-6 py-4 text-right rtl:text-left">
							<div class="flex items-center justify-end gap-2">
								<NuxtLink :to="`/dashboard/marketing/campaigns/${campaign.id}`"
									class="p-2 text-slate-400 hover:text-[#007AFF] hover:bg-[#007AFF]/5 dark:hover:bg-[#007AFF]/50/10 rounded-lg transition-colors"
									:title="$t('marketing.campaigns.view')">
									<Icon name="ph:eye-bold" size="18" />
								</NuxtLink>
								<button v-if="campaign.status === 'draft'" @click="deleteCampaign(campaign.id)"
									class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
									:title="$t('marketing.campaigns.delete')">
									<Icon name="ph:trash-bold" size="18" />
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
