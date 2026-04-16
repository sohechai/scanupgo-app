<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { show: showToast } = useToast()
import ConfirmModal from '~/components/ConfirmModal.vue'
import RichTextEditor from '~/components/RichTextEditor.vue'

const { data: automations, isLoading: loading } = useAutomationsQuery()
const createAutomationMutation = useCreateAutomationMutation()
const saveAutomationMutation = useSaveAutomationMutation()
const deleteAutomationMutation = useDeleteAutomationMutation()
const toggleAutomationMutation = useToggleAutomationMutation()

// Modal state
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

const fieldErrors = ref({
	name: '',
	subject: '',
	htmlContent: '',
})

const automationTypes = computed(() => [
	{
		type: 'welcome',
		label: t('marketing.automations.welcome_type'),
		description: t('marketing.automations.welcome_description'),
		trigger: t('marketing.automations.welcome_trigger'),
		triggerEvent: t('marketing.automations.welcome_trigger_event'),
		triggerResult: t('marketing.automations.welcome_trigger_result'),
		icon: 'ph:hand-waving-fill',
		color: 'emerald',
		hasDelay: false,
	},
	{
		type: 'inactivity',
		label: t('marketing.automations.inactivity_type'),
		description: t('marketing.automations.inactivity_description'),
		trigger: t('marketing.automations.inactivity_trigger'),
		triggerEvent: t('marketing.automations.inactivity_trigger_event'),
		triggerResult: t('marketing.automations.inactivity_trigger_result'),
		icon: 'ph:clock-clockwise-fill',
		color: 'amber',
		hasDelay: true,
	},
	{
		type: 'post_win',
		label: t('marketing.automations.prize_reminder_type'),
		description: t('marketing.automations.prize_reminder_description'),
		trigger: t('marketing.automations.post_win_trigger'),
		triggerEvent: t('marketing.automations.post_win_trigger_event'),
		triggerResult: t('marketing.automations.post_win_trigger_result'),
		icon: 'ph:gift-fill',
		color: 'purple',
		hasDelay: true,
	},
])

const getAutomationType = (type: string) => {
	return automationTypes.value.find(t => t.type === type)
}

const openCreateModal = (type: string) => {
	previewMode.value = false
	const existing = (automations.value ?? []).find(a => a.type === type)
	if (existing) {
		// Edit existing
		editingAutomation.value = existing
		form.value = {
			type: existing.type,
			name: existing.name,
			subject: existing.subject,
			htmlContent: existing.htmlContent,
			enabled: existing.enabled,
			triggerDelayDays: existing.triggerDelayDays || 7,
		}
	} else {
		// Create new
		editingAutomation.value = null
		const typeInfo = getAutomationType(type)
		form.value = {
			type: type as any,
			name: typeInfo?.label || '',
			subject: '',
			htmlContent: getDefaultTemplate(type),
			enabled: false,
			triggerDelayDays: 7,
		}
	}
	fieldErrors.value = { name: '', subject: '', htmlContent: '' }
	showModal.value = true
}

const getDefaultTemplate = (type: string) => {
	const templates: Record<string, string> = {
		welcome: `<h2 style="color: #1e293b; margin-bottom: 16px;">Bienvenue {{prenom}} !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Merci d'avoir participé à notre jeu chez {{commerce}}. Nous sommes ravis de vous compter parmi nos clients !
</p>
<p style="color: #64748b; line-height: 1.6;">
À très bientôt !
</p>`,
		inactivity: `<h2 style="color: #1e293b; margin-bottom: 16px;">{{prenom}}, vous nous manquez !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Cela fait un moment que nous ne vous avons pas vu chez {{commerce}}. Revenez vite tenter votre chance à notre jeu !
</p>
<p style="color: #64748b; line-height: 1.6;">
Des surprises vous attendent...
</p>`,
		post_win: `<h2 style="color: #1e293b; margin-bottom: 16px;">{{prenom}}, n'oubliez pas votre lot !</h2>
<p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">
Vous avez gagné un cadeau chez {{commerce}} et il vous attend toujours ! Passez le récupérer avant qu'il ne soit trop tard.
</p>
<p style="color: #64748b; line-height: 1.6;">
À très bientôt !
</p>`,
	}
	return templates[type] || ''
}

const previewHtml = computed(() => {
	return form.value.htmlContent
		.replace(/\{\{prenom\}\}/g, 'Jean')
		.replace(/\{\{firstName\}\}/g, 'Jean')
		.replace(/\{\{nom\}\}/g, 'Dupont')
		.replace(/\{\{lastName\}\}/g, 'Dupont')
		.replace(/\{\{email\}\}/g, 'jean@exemple.fr')
		.replace(/\{\{commerce\}\}/g, 'Mon Commerce')
		.replace(/\{\{businessName\}\}/g, 'Mon Commerce')
})

const saveAutomation = async () => {
	fieldErrors.value = { name: '', subject: '', htmlContent: '' }

	let hasError = false
	if (!form.value.name.trim()) {
		fieldErrors.value.name = t('marketing.new_campaign.error_name_required')
		hasError = true
	}
	if (!form.value.subject.trim()) {
		fieldErrors.value.subject = t('marketing.new_campaign.error_subject_required')
		hasError = true
	}
	if (!form.value.htmlContent.trim()) {
		fieldErrors.value.htmlContent = t('marketing.new_campaign.error_content_required')
		hasError = true
	}
	if (hasError) return

	saving.value = true
	try {
		if (editingAutomation.value) {
			await saveAutomationMutation.mutateAsync({
				id: editingAutomation.value.id,
				name: form.value.name,
				subject: form.value.subject,
				htmlContent: form.value.htmlContent,
				enabled: form.value.enabled,
				triggerDelayDays: form.value.triggerDelayDays,
			})
			showToast(t('marketing.automations.saved_updated'), 'success')
		} else {
			await createAutomationMutation.mutateAsync(form.value)
			showToast(t('marketing.automations.saved'), 'success')
		}
		showModal.value = false
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		saving.value = false
	}
}

const toggleAutomation = async (automation: any) => {
	try {
		await toggleAutomationMutation.mutateAsync({ id: automation.id, active: !automation.enabled })
		showToast(!automation.enabled ? t('marketing.automations.enabled') : t('marketing.automations.disabled'), 'success')
	} catch (e) {
		showToast(t('common.error'), 'error')
	}
}

const deleteAutomation = (id: string) => {
	deleteTargetId.value = id
	showDeleteConfirm.value = true
}

const confirmDelete = async () => {
	if (!deleteTargetId.value) return
	showDeleteConfirm.value = false
	try {
		await deleteAutomationMutation.mutateAsync(deleteTargetId.value)
		showToast(t('marketing.automations.delete_button'), 'success')
	} catch (e) {
		showToast(t('common.error'), 'error')
	} finally {
		deleteTargetId.value = null
	}
}

const getColorClasses = (_color: string) => {
	return { bg: 'bg-[#F2F2F7] dark:bg-[#2C2C2E]', text: 'text-slate-500 dark:text-slate-400', border: 'border-[#E5E5EA] dark:border-slate-700/40' }
}

</script>

<template>
	<div class="space-y-5">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<NuxtLink to="/dashboard/marketing"
				class="w-9 h-9 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0">
				<Icon name="ph:arrow-left-bold" size="16" class="rtl:rotate-180" />
			</NuxtLink>
			<div>
				<h1 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('marketing.automations.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{{ $t('marketing.automations.page_subtitle') }}</p>
			</div>
		</div>

		<!-- Explainer banner -->
		<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-5">
			<div class="flex items-start gap-4">
				<div class="w-10 h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
					<Icon name="ph:lightning-fill" class="text-slate-500 dark:text-slate-400" size="18" />
				</div>
				<div class="flex-1">
					<p class="font-semibold text-slate-900 dark:text-white text-sm mb-1">{{ $t('marketing.automations.explainer_title') }}</p>
					<p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{{ $t('marketing.automations.explainer_body') }}</p>
				</div>
				<div class="shrink-0 text-right hidden sm:block">
					<p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{{ $t('marketing.automations.active_count') }}</p>
					<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none mt-0.5">
						{{ automations.filter(a => a.enabled).length }}<span class="text-slate-300 dark:text-slate-600">/{{ automationTypes.length }}</span>
					</p>
				</div>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-20">
			<Icon name="ph:spinner-gap-bold" size="32" class="animate-spin text-slate-300" />
		</div>

		<!-- Automation Cards -->
		<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<div v-for="typeInfo in automationTypes" :key="typeInfo.type"
				class="bg-white dark:bg-[#1C1C1E] rounded-2xl border overflow-hidden flex flex-col transition-all"
				:class="automations.find(a => a.type === typeInfo.type)?.enabled
					? 'border-[#34C759]/25 dark:border-[#34C759]/20'
					: 'border-[#E5E5EA] dark:border-slate-700/40'">

				<!-- Top accent line when active -->
				<div v-if="automations.find(a => a.type === typeInfo.type)?.enabled"
					class="h-[3px] bg-[#34C759] w-full shrink-0"></div>

				<!-- Card body -->
				<div class="p-5 flex flex-col flex-1">

					<!-- Icon + toggle row -->
					<div class="flex items-center justify-between mb-4">
						<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
							<Icon :name="typeInfo.icon" size="16" class="text-slate-500 dark:text-slate-400" />
						</div>

						<template v-if="automations.find(a => a.type === typeInfo.type)">
							<button @click="toggleAutomation(automations.find(a => a.type === typeInfo.type))"
								class="relative w-11 h-6 rounded-full transition-colors shrink-0"
								:class="automations.find(a => a.type === typeInfo.type)?.enabled ? 'bg-[#34C759]' : 'bg-slate-200 dark:bg-slate-700'">
								<span class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
									:class="automations.find(a => a.type === typeInfo.type)?.enabled ? 'translate-x-5' : ''"></span>
							</button>
						</template>
					</div>

					<!-- Title + description -->
					<h3 class="font-bold text-slate-900 dark:text-white text-[15px] mb-1.5">{{ typeInfo.label }}</h3>
					<p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-4">{{ typeInfo.description }}</p>

					<!-- Trigger flow — 2-step visual -->
					<div class="rounded-xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden mb-4">
						<div class="flex items-center gap-2.5 px-3 py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E]">
							<Icon name="ph:cursor-click-bold" class="text-slate-400 dark:text-slate-500 shrink-0" size="13" />
							<p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{{ $t('marketing.automations.trigger_label') }}</p>
						</div>
						<p class="text-xs text-slate-600 dark:text-slate-300 px-3 py-2.5 leading-snug">{{ typeInfo.triggerEvent }}</p>
						<div class="flex items-center gap-1.5 px-3 pb-2.5">
							<div class="w-3.5 h-3.5 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
								<Icon name="ph:arrow-down-bold" class="text-[#007AFF]" size="8" />
							</div>
						</div>
						<div class="flex items-center gap-2.5 px-3 pb-3">
							<Icon name="ph:envelope-simple-bold" class="text-[#007AFF] shrink-0" size="13" />
							<p class="text-xs text-[#007AFF] font-semibold leading-snug">{{ typeInfo.triggerResult }}</p>
						</div>
					</div>

					<!-- Stats row if configured -->
					<div v-if="automations.find(a => a.type === typeInfo.type)"
						class="flex items-center gap-4 mb-4 px-3 py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl">
						<div>
							<p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">{{ $t('marketing.automations.emails_sent') }}</p>
							<p class="text-base font-bold text-slate-900 dark:text-white leading-tight">{{ automations.find(a => a.type === typeInfo.type)?.sendCount || 0 }}</p>
						</div>
						<div v-if="typeInfo.hasDelay" class="border-l border-[#E5E5EA] dark:border-slate-700/40 pl-4">
							<p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">{{ $t('marketing.automations.delay_days') }}</p>
							<p class="text-base font-bold text-slate-900 dark:text-white leading-tight">{{ automations.find(a => a.type === typeInfo.type)?.triggerDelayDays || 7 }} j</p>
						</div>
					</div>

					<!-- Spacer to push actions to bottom -->
					<div class="flex-1"></div>

					<!-- Actions -->
					<template v-if="automations.find(a => a.type === typeInfo.type)">
						<div class="flex gap-2">
							<button @click="openCreateModal(typeInfo.type)"
								class="flex-1 py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors text-sm">
								{{ $t('marketing.automations.modify') }}
							</button>
							<button @click="deleteAutomation(automations.find(a => a.type === typeInfo.type)?.id)"
								class="w-10 flex items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] text-slate-400 rounded-xl transition-colors">
								<Icon name="ph:trash-bold" size="15" />
							</button>
						</div>
					</template>
					<template v-else>
						<button @click="openCreateModal(typeInfo.type)"
							class="w-full py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] text-white dark:text-slate-900 font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2">
							<Icon name="ph:plus-bold" size="14" />
							{{ $t('marketing.automations.configure_button') }}
						</button>
					</template>
				</div>
			</div>
		</div>

		<!-- Modal -->
		<Teleport to="body">
			<div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/50" @click="showModal = false"></div>
				<div
					class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
					<!-- Header -->
					<div
						class="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
						<h2 class="text-lg font-bold text-slate-900 dark:text-white">
							{{ editingAutomation ? $t('marketing.automations.modal_edit_title') : $t('marketing.automations.modal_title') }}
						</h2>
						<button @click="showModal = false" class="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
							<Icon name="ph:x-bold" size="20" />
						</button>
					</div>

					<!-- Content -->
					<div class="p-6 space-y-4">
						<div>
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
								{{ $t('marketing.automations.name') }}
								<span class="text-[#FF3B30] ml-0.5">*</span>
							</label>
							<input v-model="form.name" type="text"
								@input="fieldErrors.name = ''"
								:class="[
									'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border rounded-lg text-slate-900 dark:text-white outline-none transition-all',
									fieldErrors.name
										? 'border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
										: 'border-slate-200 dark:border-slate-600 focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/10'
								]" />
							<p v-if="fieldErrors.name" class="text-xs text-[#FF3B30] mt-1.5 flex items-center gap-1">
								<Icon name="ph:warning-circle-fill" size="13" />
								{{ fieldErrors.name }}
							</p>
						</div>

						<div>
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
								{{ $t('marketing.automations.email_subject') }}
								<span class="text-[#FF3B30] ml-0.5">*</span>
							</label>
							<input v-model="form.subject" type="text" :placeholder="$t('marketing.automations.email_subject_placeholder')"
								@input="fieldErrors.subject = ''"
								:class="[
									'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all',
									fieldErrors.subject
										? 'border-[#FF3B30] focus:ring-2 focus:ring-[#FF3B30]/20'
										: 'border-slate-200 dark:border-slate-600 focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/10'
								]" />
							<p v-if="fieldErrors.subject" class="text-xs text-[#FF3B30] mt-1.5 flex items-center gap-1">
								<Icon name="ph:warning-circle-fill" size="13" />
								{{ fieldErrors.subject }}
							</p>
						</div>

						<div v-if="getAutomationType(form.type)?.hasDelay">
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
								{{ $t('marketing.automations.delay_label') }}
							</label>
							<input v-model.number="form.triggerDelayDays" type="number" min="1" max="365"
								class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all" />
							<p class="text-xs text-slate-400 mt-1">
								{{ form.type === 'inactivity' ? $t('marketing.automations.delay_inactivity') :
									$t('marketing.automations.delay_prize') }}
							</p>
						</div>

						<div>
							<div class="flex items-center justify-between mb-2">
								<div>
									<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
										{{ $t('marketing.automations.html_content') }}
										<span class="text-[#FF3B30] ml-0.5">*</span>
									</label>
									<p v-if="fieldErrors.htmlContent" class="text-xs text-[#FF3B30] mt-0.5 flex items-center gap-1">
										<Icon name="ph:warning-circle-fill" size="13" />
										{{ fieldErrors.htmlContent }}
									</p>
								</div>
								<button @click="previewMode = !previewMode"
									class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors"
									:class="previewMode ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
									<Icon :name="previewMode ? 'ph:code-bold' : 'ph:eye-bold'" size="14" />
									{{ previewMode ? $t('marketing.new_campaign.edit') : $t('marketing.new_campaign.preview') }}
								</button>
							</div>
							<div v-if="!previewMode">
								<RichTextEditor v-model="form.htmlContent" @update:modelValue="fieldErrors.htmlContent = ''" />
							</div>
							<div v-else
								class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 min-h-[200px] border border-slate-200 dark:border-slate-600">
								<div v-html="previewHtml"></div>
							</div>
							<p class="text-xs text-slate-400 mt-1">
								Variables :
								<code
									class="bg-slate-100 dark:bg-slate-700 px-1 rounded">&#123;&#123;prenom&#125;&#125;</code>
								<code
									class="bg-slate-100 dark:bg-slate-700 px-1 rounded">&#123;&#123;nom&#125;&#125;</code>
								<code
									class="bg-slate-100 dark:bg-slate-700 px-1 rounded">&#123;&#123;email&#125;&#125;</code>
								<code
									class="bg-slate-100 dark:bg-slate-700 px-1 rounded">&#123;&#123;commerce&#125;&#125;</code>
							</p>
						</div>

						<div class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
							<button @click="form.enabled = !form.enabled"
								class="relative w-12 h-6 rounded-full transition-colors"
								:class="form.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'">
								<span
									class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
									:class="form.enabled ? 'translate-x-6' : ''"></span>
							</button>
							<span class="text-sm font-bold text-slate-700 dark:text-slate-200">
								{{ form.enabled ? $t('marketing.automations.enabled') : $t('marketing.automations.disabled') }}
							</span>
						</div>
					</div>

					<!-- Footer -->
					<div
						class="sticky bottom-0 bg-white dark:bg-slate-800 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
						<button @click="showModal = false"
							class="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
							{{ $t('marketing.automations.cancel') }}
						</button>
						<button @click="saveAutomation" :disabled="saving"
							class="px-4 py-2 bg-[#007AFF] text-white font-bold rounded-lg hover:bg-[#0066DD] disabled:opacity-50 transition-colors flex items-center gap-2">
							<Icon v-if="saving" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
							{{ $t('marketing.automations.save') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>

	<!-- Delete Confirm Modal -->
	<ConfirmModal v-model="showDeleteConfirm" :title="$t('marketing.automations.delete_confirmation_title')"
		:description="$t('marketing.automations.delete_confirmation_message')"
		:confirm-text="$t('marketing.automations.delete_button')" type="danger" @confirm="confirmDelete" />
</template>
