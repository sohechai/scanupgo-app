<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { show: showToast } = useToast()
import ConfirmModal from '~/components/ConfirmModal.vue'
import RichTextEditor from '~/components/RichTextEditor.vue'

const campaignId = route.params.id as string

const campaign = ref<any>(null)
const loading = ref(true)
const sending = ref(false)
const saving = ref(false)

const editing = ref(false)
const showSendConfirm = ref(false)
const showDeleteConfirm = ref(false)

const form = ref({
	name: '',
	subject: '',
	htmlContent: '',
})

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
		campaign.value = await $api(`/marketing/campaigns/${campaignId}`, {
			method: 'PATCH',
			body: form.value,
		})
		editing.value = false
		showToast(t('marketing.campaign_detail.saved'), 'success')
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		saving.value = false
	}
}

const sendCampaign = async () => {
	showSendConfirm.value = true
}

const confirmSend = async () => {
	showSendConfirm.value = false

	sending.value = true
	try {
		const result = await $api(`/marketing/campaigns/${campaignId}/send`, {
			method: 'POST',
		})
		showToast(result.message || t('marketing.campaign_detail.sending_in_progress', { count: result.recipientCount }), 'success')
		// Poll for status update since sending is now async
		await fetchCampaign()
		if (campaign.value?.status === 'sending') {
			pollSendStatus()
		}
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
			if (campaign.value?.status === 'sent') {
				showToast(t('common.success'), 'success')
			}
		}
	}, 3000)
}

onUnmounted(() => {
	if (pollInterval) clearInterval(pollInterval)
})

const deleteCampaign = async () => {
	showDeleteConfirm.value = true
}

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

onMounted(async () => {
	await fetchCampaign()
	if (campaign.value?.status === 'sending') {
		pollSendStatus()
	}
})
</script>

<template>
	<!-- Loading -->
	<div v-if="loading" class="flex items-center justify-center py-20">
		<Icon name="ph:spinner-gap-bold" size="40" class="animate-spin text-slate-300" />
	</div>

	<div v-else-if="campaign" class="space-y-6">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
			<div class="flex items-start gap-3">
				<NuxtLink to="/dashboard/marketing/campaigns"
					class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex-shrink-0 mt-1">
					<Icon name="ph:arrow-left-bold" size="20" class="rtl:rotate-180" />
				</NuxtLink>
				<div>
					<div class="flex items-center gap-3 mb-1">
						<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
							{{ campaign.name }}
						</h1>
						<span
							:class="[getStatusBadge(campaign.status).class, 'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full']">
							<Icon :name="getStatusBadge(campaign.status).icon" size="12" />
							{{ getStatusBadge(campaign.status).label }}
						</span>
					</div>
					<p class="text-slate-500 dark:text-slate-400 text-sm">
						{{ $t('marketing.campaign_detail.created') }} {{ formatDate(campaign.createdAt) }}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<template v-if="campaign.status === 'draft'">
					<button @click="editing = !editing"
						class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2">
						<Icon :name="editing ? 'ph:x-bold' : 'ph:pencil-simple-bold'" size="18" />
						{{ editing ? $t('marketing.campaign_detail.cancel_edit') : $t('marketing.campaign_detail.edit') }}
					</button>
					<button @click="sendCampaign" :disabled="sending"
						class="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2">
						<Icon v-if="sending" name="ph:spinner-gap-bold" size="18" class="animate-spin" />
						<Icon v-else name="ph:paper-plane-tilt-bold" size="18" />
						{{ $t('marketing.campaign_detail.send') }}
					</button>
				</template>
				<button v-if="campaign.status === 'draft'" @click="deleteCampaign"
					class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
					<Icon name="ph:trash-bold" size="20" />
				</button>
			</div>
		</div>

		<!-- Sending Progress -->
		<div v-if="campaign.status === 'sending'"
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
			<div class="flex items-center gap-3 mb-3">
				<Icon name="ph:spinner-gap-bold" size="20" class="animate-spin text-amber-500" />
				<p class="font-bold text-slate-900 dark:text-white">{{ $t('marketing.campaign_detail.sending') }}</p>
			</div>
			<div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
				<div class="bg-amber-500 h-2.5 rounded-full animate-pulse" style="width: 60%"></div>
			</div>
			<p class="text-sm text-slate-500 mt-2">
				{{ campaign.recipientCount }} {{ $t('marketing.campaign_detail.recipients').toLowerCase() }}
			</p>
		</div>

		<!-- Stats (if sent) -->
		<div v-if="campaign.status === 'sent'" class="grid grid-cols-2 md:grid-cols-5 gap-4">
			<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
				<p class="text-xs font-bold text-slate-400 uppercase mb-1">{{ $t('marketing.campaign_detail.recipients') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white">{{ campaign.recipientCount }}</p>
			</div>
			<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
				<p class="text-xs font-bold text-slate-400 uppercase mb-1">{{ $t('marketing.campaign_detail.sent_count') }}</p>
				<p class="text-2xl font-bold text-emerald-600">{{ campaign.sentCount }}</p>
			</div>
			<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
				<p class="text-xs font-bold text-slate-400 uppercase mb-1">{{ $t('marketing.campaign_detail.open_count') }}</p>
				<p class="text-2xl font-bold text-brand-600">{{ campaign.openCount || 0 }}</p>
			</div>
			<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
				<p class="text-xs font-bold text-slate-400 uppercase mb-1">{{ $t('marketing.campaign_detail.open_rate') }}</p>
				<p class="text-2xl font-bold text-purple-600">
					{{ campaign.sentCount > 0 ? Math.round(((campaign.openCount || 0) / campaign.sentCount) * 100) : 0
					}}%
				</p>
			</div>
			<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
				<p class="text-xs font-bold text-slate-400 uppercase mb-1">{{ $t('marketing.campaign_detail.bounce_count') }}</p>
				<p class="text-2xl font-bold text-red-600">{{ campaign.bounceCount }}</p>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Edit Mode -->
				<template v-if="editing">
					<div
						class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
						<h3 class="font-bold text-slate-900 dark:text-white mb-4">{{ $t('marketing.campaign_detail.edit_title') }}</h3>
						<div class="space-y-4">
							<div>
								<label
									class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{{ $t('marketing.campaign_detail.name') }}</label>
								<input v-model="form.name" type="text"
									class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
							</div>
							<div>
								<label
									class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{{ $t('marketing.campaign_detail.subject') }}</label>
								<input v-model="form.subject" type="text"
									class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
							</div>
							<div>
								<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{{ $t('marketing.campaign_detail.html_content') }}</label>
								<RichTextEditor v-model="form.htmlContent" />
							</div>
						</div>
						<div class="flex justify-end gap-3 mt-6">
							<button @click="editing = false"
								class="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">
								{{ $t('marketing.campaign_detail.cancel_edit') }}
							</button>
							<button @click="saveCampaign" :disabled="saving"
								class="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2">
								<Icon v-if="saving" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
								{{ $t('marketing.campaign_detail.save') }}
							</button>
						</div>
					</div>
				</template>

				<!-- View Mode -->
				<template v-else>
					<!-- Subject -->
					<div
						class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
						<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('marketing.campaign_detail.subject_label') }}</h3>
						<p class="text-lg font-bold text-slate-900 dark:text-white">{{ campaign.subject }}</p>
					</div>

					<!-- Preview -->
					<div
						class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
						<div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
							<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('marketing.campaign_detail.preview') }}</h3>
						</div>
						<div class="p-6 bg-slate-50 dark:bg-slate-700/50">
							<div class="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm max-w-lg mx-auto"
								v-html="campaign.htmlContent.replace(/\{\{prenom\}\}/g, 'Jean').replace(/\{\{firstName\}\}/g, 'Jean').replace(/\{\{nom\}\}/g, 'Dupont').replace(/\{\{lastName\}\}/g, 'Dupont').replace(/\{\{email\}\}/g, 'jean@exemple.fr').replace(/\{\{commerce\}\}/g, 'Mon Commerce').replace(/\{\{businessName\}\}/g, 'Mon Commerce')">
							</div>
						</div>
					</div>
				</template>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Info -->
				<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6">
					<h3 class="font-bold text-slate-900 dark:text-white mb-4">{{ $t('marketing.campaign_detail.information') }}</h3>
					<dl class="space-y-3 text-sm">
						<div class="flex justify-between">
							<dt class="text-slate-500">{{ $t('marketing.campaign_detail.created') }}</dt>
							<dd class="font-bold text-slate-900 dark:text-white">{{ formatDate(campaign.createdAt) }}
							</dd>
						</div>
						<div v-if="campaign.sentAt" class="flex justify-between">
							<dt class="text-slate-500">{{ $t('marketing.campaign_detail.sent_date') }}</dt>
							<dd class="font-bold text-slate-900 dark:text-white">{{ formatDate(campaign.sentAt) }}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-slate-500">{{ $t('marketing.campaign_detail.current_status') }}</dt>
							<dd>
								<span
									:class="[getStatusBadge(campaign.status).class, 'text-xs font-bold px-2 py-0.5 rounded-full']">
									{{ getStatusBadge(campaign.status).label }}
								</span>
							</dd>
						</div>
					</dl>
				</div>

				<!-- Recent Sends (if sent) -->
				<div v-if="campaign.sends?.length > 0"
					class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
					<div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
						<h3 class="font-bold text-slate-900 dark:text-white">{{ $t('marketing.campaign_detail.recent_sends') }}</h3>
					</div>
					<div class="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
						<div v-for="send in campaign.sends.slice(0, 10)" :key="send.id"
							class="px-6 py-3 flex items-center justify-between">
							<div>
								<p class="font-medium text-slate-900 dark:text-white text-sm">
									{{ send.player?.firstName || 'Inconnu' }}
								</p>
								<p class="text-xs text-slate-400">{{ send.email }}</p>
							</div>
							<span :class="[
								send.status === 'sent' ? 'text-emerald-600' :
									send.status === 'opened' ? 'text-brand-600' :
										send.status === 'failed' ? 'text-red-600' : 'text-slate-400'
							]">
								<Icon :name="send.status === 'sent' ? 'ph:check-bold' :
									send.status === 'opened' ? 'ph:eye-bold' :
										send.status === 'failed' ? 'ph:x-bold' : 'ph:clock-bold'
									" size="16" />
							</span>
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
</template>
