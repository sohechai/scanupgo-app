<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { show: showToast } = useToast()
import ConfirmModal from '~/components/ConfirmModal.vue'
import RichTextEditor from '~/components/RichTextEditor.vue'

const automations = ref<any[]>([])
const loading = ref(true)

const showModal = ref(false)
const editingAutomation = ref<any>(null)
const saving = ref(false)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)
const previewMode = ref(false)

const form = ref({
	type: 'welcome' as 'welcome' | 'inactivity' | 'post_win',
	name: '',
	subject: '',
	htmlContent: '',
	enabled: false,
	triggerDelayDays: 7,
})

const fieldErrors = ref({ name: '', subject: '', htmlContent: '' })

const automationTypes = computed(() => [
	{
		type: 'welcome',
		label: t('marketing.automations.welcome_type'),
		description: t('marketing.automations.welcome_description'),
		triggerEvent: t('marketing.automations.welcome_trigger_event'),
		triggerResult: t('marketing.automations.welcome_trigger_result'),
		icon: 'ph:hand-waving-fill',
		hasDelay: false,
	},
	{
		type: 'inactivity',
		label: t('marketing.automations.inactivity_type'),
		description: t('marketing.automations.inactivity_description'),
		triggerEvent: t('marketing.automations.inactivity_trigger_event'),
		triggerResult: t('marketing.automations.inactivity_trigger_result'),
		icon: 'ph:clock-clockwise-fill',
		hasDelay: true,
	},
	{
		type: 'post_win',
		label: t('marketing.automations.prize_reminder_type'),
		description: t('marketing.automations.prize_reminder_description'),
		triggerEvent: t('marketing.automations.post_win_trigger_event'),
		triggerResult: t('marketing.automations.post_win_trigger_result'),
		icon: 'ph:gift-fill',
		hasDelay: true,
	},
])

const getAutomationType = (type: string) => automationTypes.value.find(t => t.type === type)

const fetchAutomations = async () => {
	loading.value = true
	try { automations.value = await $api('/marketing/automations') }
	catch (e) { console.error('Error fetching automations:', e) }
	finally { loading.value = false }
}

const getDefaultTemplate = (type: string) => {
	const templates: Record<string, string> = {
		welcome: `<h2 style="color: #1e293b; margin-bottom: 16px;">Bienvenue {{prenom}} !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Merci d'avoir participé à notre jeu chez {{commerce}}. Nous sommes ravis de vous compter parmi nos clients !
</p>
<p style="color: #64748b; line-height: 1.6;">À très bientôt !</p>`,
		inactivity: `<h2 style="color: #1e293b; margin-bottom: 16px;">{{prenom}}, vous nous manquez !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Cela fait un moment que nous ne vous avons pas vu chez {{commerce}}. Revenez vite tenter votre chance à notre jeu !
</p>
<p style="color: #64748b; line-height: 1.6;">Des surprises vous attendent...</p>`,
		post_win: `<h2 style="color: #1e293b; margin-bottom: 16px;">{{prenom}}, n'oubliez pas votre lot !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Vous avez gagné un cadeau chez {{commerce}} et il vous attend toujours !
</p>
<p style="color: #64748b; line-height: 1.6;">À très bientôt !</p>`,
	}
	return templates[type] || ''
}

const previewHtml = computed(() =>
	form.value.htmlContent
		.replace(/\{\{prenom\}\}/g, 'Jean').replace(/\{\{firstName\}\}/g, 'Jean')
		.replace(/\{\{nom\}\}/g, 'Dupont').replace(/\{\{lastName\}\}/g, 'Dupont')
		.replace(/\{\{email\}\}/g, 'jean@exemple.fr')
		.replace(/\{\{commerce\}\}/g, 'Mon Commerce').replace(/\{\{businessName\}\}/g, 'Mon Commerce')
)

const openCreateModal = (type: string) => {
	previewMode.value = false
	const existing = automations.value.find(a => a.type === type)
	if (existing) {
		editingAutomation.value = existing
		form.value = { type: existing.type, name: existing.name, subject: existing.subject, htmlContent: existing.htmlContent, enabled: existing.enabled, triggerDelayDays: existing.triggerDelayDays || 7 }
	} else {
		editingAutomation.value = null
		const typeInfo = getAutomationType(type)
		form.value = { type: type as any, name: typeInfo?.label || '', subject: '', htmlContent: getDefaultTemplate(type), enabled: false, triggerDelayDays: 7 }
	}
	fieldErrors.value = { name: '', subject: '', htmlContent: '' }
	showModal.value = true
}

const saveAutomation = async () => {
	fieldErrors.value = { name: '', subject: '', htmlContent: '' }
	let hasError = false
	if (!form.value.name.trim()) { fieldErrors.value.name = t('marketing.new_campaign.error_name_required'); hasError = true }
	if (!form.value.subject.trim()) { fieldErrors.value.subject = t('marketing.new_campaign.error_subject_required'); hasError = true }
	if (!form.value.htmlContent.trim()) { fieldErrors.value.htmlContent = t('marketing.new_campaign.error_content_required'); hasError = true }
	if (hasError) return

	saving.value = true
	try {
		if (editingAutomation.value) {
			await $api(`/marketing/automations/${editingAutomation.value.id}`, { method: 'PATCH', body: { name: form.value.name, subject: form.value.subject, htmlContent: form.value.htmlContent, enabled: form.value.enabled, triggerDelayDays: form.value.triggerDelayDays } })
			showToast(t('marketing.automations.saved_updated'), 'success')
		} else {
			await $api('/marketing/automations', { method: 'POST', body: form.value })
			showToast(t('marketing.automations.saved'), 'success')
		}
		showModal.value = false
		fetchAutomations()
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		saving.value = false
	}
}

const toggleAutomation = async (automation: any) => {
	try {
		await $api(`/marketing/automations/${automation.id}/toggle`, { method: 'PATCH', body: { enabled: !automation.enabled } })
		automation.enabled = !automation.enabled
		showToast(automation.enabled ? t('marketing.automations.enabled') : t('marketing.automations.disabled'), 'success')
	} catch (e) { showToast(t('common.error'), 'error') }
}

const deleteAutomation = (id: string) => { deleteTargetId.value = id; showDeleteConfirm.value = true }

const confirmDelete = async () => {
	if (!deleteTargetId.value) return
	showDeleteConfirm.value = false
	try {
		await $api(`/marketing/automations/${deleteTargetId.value}`, { method: 'DELETE' })
		automations.value = automations.value.filter(a => a.id !== deleteTargetId.value)
		showToast(t('marketing.automations.delete_button'), 'success')
	} catch (e) { showToast(t('common.error'), 'error') }
	finally { deleteTargetId.value = null }
}

onMounted(() => { fetchAutomations() })
</script>

<template>
	<div class="space-y-5">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<NuxtLink to="/dashboard/marketing"
				class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0">
				<Icon name="ph:arrow-left-bold" size="15" class="rtl:rotate-180" />
			</NuxtLink>
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('marketing.automations.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('marketing.automations.page_subtitle') }}</p>
			</div>
		</div>

		<!-- Explainer banner -->
		<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
			<div class="flex items-start gap-3">
				<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
					<Icon name="ph:lightning-fill" class="text-slate-500 dark:text-slate-400" size="15" />
				</div>
				<div class="flex-1">
					<p class="font-medium text-slate-900 dark:text-white text-sm mb-0.5">{{ $t('marketing.automations.explainer_title') }}</p>
					<p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{{ $t('marketing.automations.explainer_body') }}</p>
				</div>
				<div class="shrink-0 text-right hidden sm:block">
					<p class="text-xs text-slate-400 dark:text-slate-500">{{ $t('marketing.automations.active_count') }}</p>
					<p class="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none mt-0.5">
						{{ automations.filter(a => a.enabled).length }}<span class="text-slate-300 dark:text-slate-600 text-lg">/{{ automationTypes.length }}</span>
					</p>
				</div>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-16">
			<Icon name="ph:spinner-gap-bold" size="28" class="animate-spin text-slate-300" />
		</div>

		<!-- Automation Cards -->
		<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<div v-for="typeInfo in automationTypes" :key="typeInfo.type"
				class="bg-white dark:bg-slate-900 rounded-lg border overflow-hidden flex flex-col transition-all"
				:class="automations.find(a => a.type === typeInfo.type)?.enabled
					? 'border-emerald-200 dark:border-emerald-800/40'
					: 'border-slate-200 dark:border-slate-800'">

				<!-- Active top accent -->
				<div v-if="automations.find(a => a.type === typeInfo.type)?.enabled"
					class="h-0.5 bg-emerald-500 w-full shrink-0"></div>

				<div class="p-4 flex flex-col flex-1">
					<!-- Icon + toggle -->
					<div class="flex items-center justify-between mb-4">
						<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
							<Icon :name="typeInfo.icon" size="15" class="text-slate-500 dark:text-slate-400" />
						</div>
						<template v-if="automations.find(a => a.type === typeInfo.type)">
							<button @click="toggleAutomation(automations.find(a => a.type === typeInfo.type))"
								class="relative w-10 h-5 rounded-full transition-colors shrink-0"
								:class="automations.find(a => a.type === typeInfo.type)?.enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'">
								<span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
									:class="automations.find(a => a.type === typeInfo.type)?.enabled ? 'translate-x-5' : ''"></span>
							</button>
						</template>
					</div>

					<!-- Title + description -->
					<h3 class="font-semibold text-slate-900 dark:text-white text-sm mb-1">{{ typeInfo.label }}</h3>
					<p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-4">{{ typeInfo.description }}</p>

					<!-- Trigger flow -->
					<div class="rounded-md border border-slate-100 dark:border-slate-800 overflow-hidden mb-4">
						<div class="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
							<Icon name="ph:cursor-click-bold" class="text-slate-400 shrink-0" size="12" />
							<p class="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{{ $t('marketing.automations.trigger_label') }}</p>
						</div>
						<p class="text-xs text-slate-600 dark:text-slate-300 px-3 py-2 leading-snug">{{ typeInfo.triggerEvent }}</p>
						<div class="flex items-center gap-1.5 px-3 py-2 border-t border-slate-100 dark:border-slate-800">
							<Icon name="ph:envelope-simple-bold" class="text-[#007AFF] shrink-0" size="12" />
							<p class="text-xs text-[#007AFF] font-medium leading-snug">{{ typeInfo.triggerResult }}</p>
						</div>
					</div>

					<!-- Stats if configured -->
					<div v-if="automations.find(a => a.type === typeInfo.type)"
						class="flex items-center gap-4 mb-4 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-md">
						<div>
							<p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{{ $t('marketing.automations.emails_sent') }}</p>
							<p class="text-base font-semibold text-slate-900 dark:text-white tabular-nums leading-tight">{{ automations.find(a => a.type === typeInfo.type)?.sendCount || 0 }}</p>
						</div>
						<div v-if="typeInfo.hasDelay" class="border-l border-slate-200 dark:border-slate-700 pl-4">
							<p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{{ $t('marketing.automations.delay_days') }}</p>
							<p class="text-base font-semibold text-slate-900 dark:text-white tabular-nums leading-tight">{{ automations.find(a => a.type === typeInfo.type)?.triggerDelayDays || 7 }} j</p>
						</div>
					</div>

					<div class="flex-1"></div>

					<!-- Actions -->
					<template v-if="automations.find(a => a.type === typeInfo.type)">
						<div class="flex gap-2">
							<button @click="openCreateModal(typeInfo.type)"
								class="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md transition-colors text-sm">
								{{ $t('marketing.automations.modify') }}
							</button>
							<button @click="deleteAutomation(automations.find(a => a.type === typeInfo.type)?.id)"
								class="w-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500 text-slate-400 rounded-md transition-colors">
								<Icon name="ph:trash-bold" size="14" />
							</button>
						</div>
					</template>
					<template v-else>
						<button @click="openCreateModal(typeInfo.type)"
							class="w-full py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-md transition-all text-sm flex items-center justify-center gap-2">
							<Icon name="ph:plus-bold" size="13" />
							{{ $t('marketing.automations.configure_button') }}
						</button>
					</template>
				</div>
			</div>
		</div>

		<!-- Modal -->
		<Teleport to="body">
			<div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false"></div>
				<div class="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
					<!-- Header -->
					<div class="sticky top-0 bg-white dark:bg-slate-900 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
						<h2 class="text-base font-semibold text-slate-900 dark:text-white">
							{{ editingAutomation ? $t('marketing.automations.modal_edit_title') : $t('marketing.automations.modal_title') }}
						</h2>
						<button @click="showModal = false" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>

					<!-- Content -->
					<div class="p-5 space-y-4">
						<div>
							<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
								{{ $t('marketing.automations.name') }} <span class="text-red-400">*</span>
							</label>
							<input v-model="form.name" type="text" @input="fieldErrors.name = ''"
								:class="['w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md text-sm text-slate-900 dark:text-white outline-none transition-all', fieldErrors.name ? 'border-red-400 focus:ring-2 focus:ring-red-400/20' : 'border-slate-200 dark:border-slate-700 focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/10']" />
							<p v-if="fieldErrors.name" class="text-xs text-red-500 mt-1 flex items-center gap-1">
								<Icon name="ph:warning-circle-fill" size="12" />{{ fieldErrors.name }}
							</p>
						</div>

						<div>
							<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
								{{ $t('marketing.automations.email_subject') }} <span class="text-red-400">*</span>
							</label>
							<input v-model="form.subject" type="text" :placeholder="$t('marketing.automations.email_subject_placeholder')" @input="fieldErrors.subject = ''"
								:class="['w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all', fieldErrors.subject ? 'border-red-400 focus:ring-2 focus:ring-red-400/20' : 'border-slate-200 dark:border-slate-700 focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/10']" />
							<p v-if="fieldErrors.subject" class="text-xs text-red-500 mt-1 flex items-center gap-1">
								<Icon name="ph:warning-circle-fill" size="12" />{{ fieldErrors.subject }}
							</p>
						</div>

						<div v-if="getAutomationType(form.type)?.hasDelay">
							<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('marketing.automations.delay_label') }}</label>
							<input v-model.number="form.triggerDelayDays" type="number" min="1" max="365"
								class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all" />
							<p class="text-xs text-slate-400 mt-1">{{ form.type === 'inactivity' ? $t('marketing.automations.delay_inactivity') : $t('marketing.automations.delay_prize') }}</p>
						</div>

						<div>
							<div class="flex items-center justify-between mb-2">
								<div>
									<label class="block text-xs font-medium text-slate-500 dark:text-slate-400">
										{{ $t('marketing.automations.html_content') }} <span class="text-red-400">*</span>
									</label>
									<p v-if="fieldErrors.htmlContent" class="text-xs text-red-500 mt-0.5 flex items-center gap-1">
										<Icon name="ph:warning-circle-fill" size="12" />{{ fieldErrors.htmlContent }}
									</p>
								</div>
								<button @click="previewMode = !previewMode"
									class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
									:class="previewMode ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'">
									<Icon :name="previewMode ? 'ph:code-bold' : 'ph:eye-bold'" size="12" />
									{{ previewMode ? $t('marketing.new_campaign.edit') : $t('marketing.new_campaign.preview') }}
								</button>
							</div>
							<div v-if="!previewMode">
								<RichTextEditor v-model="form.htmlContent" @update:modelValue="fieldErrors.htmlContent = ''" />
							</div>
							<div v-else class="bg-slate-50 dark:bg-slate-800 rounded-md p-4 min-h-[200px] border border-slate-200 dark:border-slate-700">
								<div v-html="previewHtml"></div>
							</div>
							<p class="text-xs text-slate-400 mt-1.5">
								Variables :
								<code class="bg-slate-100 dark:bg-slate-800 px-1 rounded mx-0.5">&#123;&#123;prenom&#125;&#125;</code>
								<code class="bg-slate-100 dark:bg-slate-800 px-1 rounded mx-0.5">&#123;&#123;nom&#125;&#125;</code>
								<code class="bg-slate-100 dark:bg-slate-800 px-1 rounded mx-0.5">&#123;&#123;commerce&#125;&#125;</code>
							</p>
						</div>

						<div class="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
							<button @click="form.enabled = !form.enabled"
								class="relative w-10 h-5 rounded-full transition-colors shrink-0"
								:class="form.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'">
								<span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
									:class="form.enabled ? 'translate-x-5' : ''"></span>
							</button>
							<span class="text-sm font-medium text-slate-700 dark:text-slate-200">
								{{ form.enabled ? $t('marketing.automations.enabled') : $t('marketing.automations.disabled') }}
							</span>
						</div>
					</div>

					<!-- Footer -->
					<div class="sticky bottom-0 bg-white dark:bg-slate-900 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
						<button @click="showModal = false"
							class="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
							{{ $t('marketing.automations.cancel') }}
						</button>
						<button @click="saveAutomation" :disabled="saving"
							class="px-5 py-2 bg-[#007AFF] text-white font-medium rounded-md hover:bg-[#0066DD] disabled:opacity-50 transition-colors flex items-center gap-2 text-sm">
							<Icon v-if="saving" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
							{{ $t('marketing.automations.save') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>

	<ConfirmModal v-model="showDeleteConfirm" :title="$t('marketing.automations.delete_confirmation_title')"
		:description="$t('marketing.automations.delete_confirmation_message')"
		:confirm-text="$t('marketing.automations.delete_button')" type="danger" @confirm="confirmDelete" />
</template>
