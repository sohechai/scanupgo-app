<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

useHead({ title: 'Campagne' })

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { show: showToast } = useToast()
const { getPlanLimit, fetchSubscription } = useSubscription()
import ConfirmModal from '~/components/ConfirmModal.vue'
import RichTextEditor from '~/components/RichTextEditor.vue'

const campaignId = route.params.id as string

const campaign = ref<any>(null)
const loading = ref(true)
const sending = ref(false)
const saving = ref(false)

const emailUsage = ref<{ used: number; limit: number | null; optInPlayers: number } | null>(null)

const fetchEmailUsage = async () => {
	await fetchSubscription()
	const limit = getPlanLimit('email_credits_per_month')
	try {
		const stats = await $api<{ sentThisMonth: number; optInPlayers: number }>('/marketing/email-usage')
		emailUsage.value = { used: stats.sentThisMonth, limit, optInPlayers: stats.optInPlayers }
	} catch {
		emailUsage.value = { used: 0, limit, optInPlayers: 0 }
	}
}

const emailUsagePercent = computed(() => {
	if (!emailUsage.value?.limit) return 0
	return Math.min(100, Math.round((emailUsage.value.used / emailUsage.value.limit) * 100))
})

const emailUsageColor = computed(() => {
	if (emailUsagePercent.value >= 90) return 'bg-red-500'
	if (emailUsagePercent.value >= 70) return 'bg-amber-400'
	return 'bg-[#007AFF]'
})

const editing = ref(false)
const showSendConfirm = ref(false)
const showDeleteConfirm = ref(false)

const form = ref({ name: '', subject: '', htmlContent: '' })

const fetchCampaign = async () => {
	loading.value = true
	try {
		campaign.value = await $api(`/marketing/campaigns/${campaignId}`)
		form.value = {
			name: campaign.value.name,
			subject: campaign.value.subject,
			htmlContent: campaign.value.htmlContent,
		}
	} catch (e) {
		console.error('Error fetching campaign:', e)
		showToast(t('common.error'), 'error')
		router.push('/dashboard/marketing/campaigns')
	} finally {
		loading.value = false
	}
}

const saveCampaign = async () => {
	saving.value = true
	try {
		campaign.value = await $api(`/marketing/campaigns/${campaignId}`, { method: 'PATCH', body: form.value })
		editing.value = false
		showToast(t('marketing.campaign_detail.saved'), 'success')
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		saving.value = false }
}

const sendCampaign = () => { showSendConfirm.value = true }

const confirmSend = async () => {
	showSendConfirm.value = false
	sending.value = true
	try {
		const result = await $api(`/marketing/campaigns/${campaignId}/send`, { method: 'POST' })
		showToast(result.message || t('marketing.campaign_detail.sending_in_progress', { count: result.recipientCount }), 'success')
		await fetchCampaign()
		if (campaign.value?.status === 'sending') pollSendStatus()
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		sending.value = false
	}
}

let pollInterval: ReturnType<typeof setInterval> | null = null
const pollSendStatus = () => {
	if (pollInterval) clearInterval(pollInterval)
	pollInterval = setInterval(async () => {
		await fetchCampaign()
		if (campaign.value?.status !== 'sending') {
			if (pollInterval) clearInterval(pollInterval)
			pollInterval = null
			if (campaign.value?.status === 'sent') showToast(t('common.success'), 'success')
		}
	}, 3000)
}

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })

const deleteCampaign = () => { showDeleteConfirm.value = true }

const confirmDelete = async () => {
	showDeleteConfirm.value = false
	try {
		await $api(`/marketing/campaigns/${campaignId}`, { method: 'DELETE' })
		showToast(t('marketing.campaigns.delete'), 'success')
		router.push('/dashboard/marketing/campaigns')
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

onMounted(async () => {
	await fetchCampaign()
	await fetchEmailUsage()
	if (campaign.value?.status === 'sending') pollSendStatus()
})
</script>

<template>
	<div>
	<!-- Loading -->
	<div v-if="loading" class="flex items-center justify-center py-20">
		<Icon name="ph:spinner-gap-bold" size="28" class="animate-spin text-slate-300" />
	</div>

	<div v-else-if="campaign" class="space-y-5">

		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
			<div class="flex items-start gap-3">
				<NuxtLink to="/dashboard/marketing/campaigns"
					class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0 mt-0.5">
					<Icon name="ph:arrow-left-bold" size="15" class="rtl:rotate-180" />
				</NuxtLink>
				<div>
					<div class="flex items-center gap-2.5 mb-0.5 flex-wrap">
						<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ campaign.name }}</h1>
						<span class="inline-flex items-center gap-1.5 text-xs" :class="getStatus(campaign.status).text">
							<span :class="[getStatus(campaign.status).dot, 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
							{{ getStatus(campaign.status).label }}
						</span>
					</div>
					<p class="text-sm text-slate-400 dark:text-slate-500">
						{{ $t('marketing.campaign_detail.created') }} {{ formatDate(campaign.createdAt) }}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<template v-if="campaign.status === 'draft'">
					<button @click="editing = !editing"
						class="px-3.5 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 text-sm">
						<Icon :name="editing ? 'ph:x-bold' : 'ph:pencil-simple-bold'" size="14" />
						{{ editing ? $t('marketing.campaign_detail.cancel_edit') : $t('marketing.campaign_detail.edit') }}
					</button>

					<!-- Opt-in recipients -->
					<div v-if="emailUsage !== null" class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
						<Icon name="ph:users-bold" size="13" class="text-slate-400" />
						<span class="text-xs text-slate-500 dark:text-slate-400">
							{{ emailUsage.used }}/{{ emailUsage.optInPlayers }}
						</span>
					</div>

					<button @click="sendCampaign" :disabled="sending || (emailUsage?.limit !== null && emailUsage?.used >= (emailUsage?.limit ?? Infinity))"
						class="px-4 py-2 bg-[#007AFF] text-white font-medium rounded-md hover:bg-[#0066DD] disabled:opacity-50 transition-colors flex items-center gap-1.5 text-sm">
						<Icon v-if="sending" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
						<Icon v-else name="ph:paper-plane-tilt-bold" size="14" />
						{{ $t('marketing.campaign_detail.send') }}
					</button>
				</template>

				<button v-if="campaign.status === 'draft'" @click="deleteCampaign"
					class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors">
					<Icon name="ph:trash-bold" size="15" />
				</button>
			</div>
		</div>

		<!-- Sending Progress -->
		<div v-if="campaign.status === 'sending'"
			class="bg-white dark:bg-slate-900 rounded-lg border border-amber-100 dark:border-amber-900/30 p-5">
			<div class="flex items-center gap-2.5 mb-3">
				<Icon name="ph:spinner-gap-bold" size="16" class="animate-spin text-amber-500" />
				<p class="font-medium text-slate-900 dark:text-white text-sm">{{ $t('marketing.campaign_detail.sending') }}</p>
			</div>
			<div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
				<div class="bg-amber-400 h-1.5 rounded-full animate-pulse" style="width: 60%"></div>
			</div>
			<p class="text-xs text-slate-400 mt-2">{{ campaign.recipientCount }} {{ $t('marketing.campaign_detail.recipients').toLowerCase() }}</p>
		</div>

		<!-- Stats (if sent) -->
		<div v-if="campaign.status === 'sent'" class="grid grid-cols-2 md:grid-cols-5 gap-3">
			<div v-for="(val, key) in {
				[$t('marketing.campaign_detail.recipients')]: { value: campaign.recipientCount, color: 'text-slate-900 dark:text-white' },
				[$t('marketing.campaign_detail.sent_count')]: { value: campaign.sentCount, color: 'text-emerald-600' },
				[$t('marketing.campaign_detail.open_count')]: { value: campaign.openCount || 0, color: 'text-[#007AFF]' },
				[$t('marketing.campaign_detail.open_rate')]: { value: (campaign.sentCount > 0 ? Math.round(((campaign.openCount || 0) / campaign.sentCount) * 100) : 0) + '%', color: 'text-violet-600' },
				[$t('marketing.campaign_detail.bounce_count')]: { value: campaign.bounceCount, color: 'text-red-500' },
			}" :key="key"
				class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">{{ key }}</p>
				<p class="text-2xl font-semibold tabular-nums" :class="val.color">{{ val.value }}</p>
			</div>
		</div>

		<!-- Main grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

			<!-- Content -->
			<div class="lg:col-span-2 space-y-4">

				<!-- Edit Mode -->
				<template v-if="editing">
					<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
						<div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
							<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.campaign_detail.edit_title') }}</p>
						</div>
						<div class="p-5 space-y-4">
							<div>
								<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('marketing.campaign_detail.name') }}</label>
								<input v-model="form.name" type="text"
									class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[#007AFF]/10 focus:border-[#007AFF]/40 outline-none transition-all" />
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('marketing.campaign_detail.subject') }}</label>
								<input v-model="form.subject" type="text"
									class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[#007AFF]/10 focus:border-[#007AFF]/40 outline-none transition-all" />
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('marketing.campaign_detail.html_content') }}</label>
								<RichTextEditor v-model="form.htmlContent" />
							</div>
						</div>
						<div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
							<button @click="editing = false"
								class="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-sm">
								{{ $t('marketing.campaign_detail.cancel_edit') }}
							</button>
							<button @click="saveCampaign" :disabled="saving"
								class="px-4 py-2 bg-[#007AFF] text-white font-medium rounded-md hover:bg-[#0066DD] disabled:opacity-50 transition-colors flex items-center gap-2 text-sm">
								<Icon v-if="saving" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
								{{ $t('marketing.campaign_detail.save') }}
							</button>
						</div>
					</div>
				</template>

				<!-- View Mode -->
				<template v-else>
					<!-- Subject -->
					<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-5 py-4">
						<p class="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">{{ $t('marketing.campaign_detail.subject_label') }}</p>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ campaign.subject }}</p>
					</div>

					<!-- Preview -->
					<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
						<div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
							<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.campaign_detail.preview') }}</p>
						</div>
						<div class="p-5"
							v-html="campaign.htmlContent.replace(/\{\{prenom\}\}/g, 'Jean').replace(/\{\{firstName\}\}/g, 'Jean').replace(/\{\{nom\}\}/g, 'Dupont').replace(/\{\{lastName\}\}/g, 'Dupont').replace(/\{\{email\}\}/g, 'jean@exemple.fr').replace(/\{\{commerce\}\}/g, 'Mon Commerce').replace(/\{\{businessName\}\}/g, 'Mon Commerce')">
						</div>
					</div>
				</template>
			</div>

			<!-- Sidebar -->
			<div class="space-y-4">

				<!-- Info -->
				<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
						<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.campaign_detail.information') }}</p>
					</div>
					<div class="divide-y divide-slate-100 dark:divide-slate-800">
						<div class="flex items-center justify-between px-5 py-3">
							<span class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaign_detail.created') }}</span>
							<span class="text-xs font-medium text-slate-900 dark:text-white">{{ formatDate(campaign.createdAt) }}</span>
						</div>
						<div v-if="campaign.sentAt" class="flex items-center justify-between px-5 py-3">
							<span class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaign_detail.sent_date') }}</span>
							<span class="text-xs font-medium text-slate-900 dark:text-white">{{ formatDate(campaign.sentAt) }}</span>
						</div>
						<div class="flex items-center justify-between px-5 py-3">
							<span class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('marketing.campaign_detail.current_status') }}</span>
							<span class="inline-flex items-center gap-1.5 text-xs" :class="getStatus(campaign.status).text">
								<span :class="[getStatus(campaign.status).dot, 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
								{{ getStatus(campaign.status).label }}
							</span>
						</div>
					</div>
				</div>

				<!-- Recent Sends -->
				<div v-if="campaign.sends?.length > 0"
					class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
					<div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
						<p class="text-sm font-semibold text-slate-800 dark:text-white">{{ $t('marketing.campaign_detail.recent_sends') }}</p>
					</div>
					<div class="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
						<div v-for="send in campaign.sends.slice(0, 10)" :key="send.id"
							class="px-5 py-3 flex items-center justify-between">
							<div class="min-w-0">
								<p class="text-sm font-medium text-slate-900 dark:text-white truncate">{{ send.player?.firstName || 'Inconnu' }}</p>
								<p class="text-xs text-slate-400 truncate">{{ send.email }}</p>
							</div>
							<Icon :name="send.status === 'sent' ? 'ph:check-bold' : send.status === 'opened' ? 'ph:eye-bold' : send.status === 'failed' ? 'ph:x-bold' : 'ph:clock-bold'"
								size="14"
								:class="send.status === 'sent' ? 'text-emerald-500' : send.status === 'opened' ? 'text-[#007AFF]' : send.status === 'failed' ? 'text-red-500' : 'text-slate-300'" />
						</div>
					</div>
				</div>

			</div>
		</div>
	</div>

	<!-- Modals -->
	<ConfirmModal v-model="showSendConfirm" :title="$t('marketing.campaign_detail.send_confirmation_title')"
		:description="$t('marketing.campaign_detail.send_confirmation_message')"
		:confirm-text="$t('marketing.campaign_detail.send_button')" type="info" :loading="sending" @confirm="confirmSend" />

	<ConfirmModal v-model="showDeleteConfirm" :title="$t('marketing.campaign_detail.delete_confirmation_title')"
		:description="$t('marketing.campaign_detail.delete_confirmation_message')"
		:confirm-text="$t('marketing.campaigns.delete')" type="danger" @confirm="confirmDelete" />
	</div>
</template>
