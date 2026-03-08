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

// Modal state
const showModal = ref(false)
const editingAutomation = ref<any>(null)
const saving = ref(false)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)
const previewMode = ref(false)

const form = ref({
	type: 'inactivity' as 'inactivity' | 'post_win',
	name: '',
	subject: '',
	htmlContent: '',
	enabled: false,
	triggerDelayDays: 7,
})

const automationTypes = computed(() => [
	{
		type: 'inactivity',
		label: t('marketing.automations.inactivity_type'),
		description: t('marketing.automations.inactivity_description'),
		icon: 'ph:clock-clockwise-fill',
		color: 'amber',
		hasDelay: true,
	},
	{
		type: 'post_win',
		label: t('marketing.automations.prize_reminder_type'),
		description: t('marketing.automations.prize_reminder_description'),
		icon: 'ph:gift-fill',
		color: 'purple',
		hasDelay: true,
	},
])

const getAutomationType = (type: string) => {
	return automationTypes.value.find(t => t.type === type)
}

const fetchAutomations = async () => {
	loading.value = true
	try {
		automations.value = await $api('/marketing/automations')
	} catch (e) {
		console.error('Error fetching automations:', e)
	} finally {
		loading.value = false
	}
}

const openCreateModal = (type: string) => {
	previewMode.value = false
	const existing = automations.value.find(a => a.type === type)
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
	showModal.value = true
}

const getDefaultTemplate = (type: string) => {
	const templates: Record<string, string> = {
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
	if (!form.value.name || !form.value.subject || !form.value.htmlContent) {
		showToast(t('common.error'), 'error')
		return
	}

	saving.value = true
	try {
		if (editingAutomation.value) {
			// Update
			await $api(`/marketing/automations/${editingAutomation.value.id}`, {
				method: 'PATCH',
				body: {
					name: form.value.name,
					subject: form.value.subject,
					htmlContent: form.value.htmlContent,
					enabled: form.value.enabled,
					triggerDelayDays: form.value.triggerDelayDays,
				},
			})
			showToast(t('marketing.automations.saved_updated'), 'success')
		} else {
			// Create
			await $api('/marketing/automations', {
				method: 'POST',
				body: form.value,
			})
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
		await $api(`/marketing/automations/${automation.id}/toggle`, {
			method: 'PATCH',
			body: { enabled: !automation.enabled },
		})
		automation.enabled = !automation.enabled
		showToast(automation.enabled ? t('marketing.automations.enabled') : t('marketing.automations.disabled'), 'success')
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
		await $api(`/marketing/automations/${deleteTargetId.value}`, { method: 'DELETE' })
		automations.value = automations.value.filter(a => a.id !== deleteTargetId.value)
		showToast(t('marketing.automations.delete_button'), 'success')
	} catch (e) {
		showToast(t('common.error'), 'error')
	} finally {
		deleteTargetId.value = null
	}
}

const getColorClasses = (color: string) => {
	const colors: Record<string, { bg: string; text: string; border: string }> = {
		emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-500/20' },
		amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200 dark:border-amber-500/20' },
		purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-200 dark:border-purple-500/20' },
	}
	return colors[color] || colors.emerald
}

onMounted(() => {
	fetchAutomations()
})
</script>

<template>
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<NuxtLink to="/dashboard/marketing"
				class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
				<Icon name="ph:arrow-left-bold" size="20" class="rtl:rotate-180" />
			</NuxtLink>
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
					{{ $t('marketing.automations.title') }}
				</h1>
				<p class="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
					{{ $t('marketing.automations.configure') }}
				</p>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-20">
			<Icon name="ph:spinner-gap-bold" size="40" class="animate-spin text-slate-300" />
		</div>

		<!-- Automation Cards -->
		<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div v-for="typeInfo in automationTypes" :key="typeInfo.type"
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
				<!-- Header -->
				<div class="p-6 border-b border-slate-100 dark:border-slate-700">
					<div class="flex items-start justify-between">
						<div
							:class="[getColorClasses(typeInfo.color).bg, 'w-12 h-12 rounded-xl flex items-center justify-center mb-4']">
							<Icon :name="typeInfo.icon" size="24" :class="getColorClasses(typeInfo.color).text" />
						</div>
						<!-- Toggle if exists -->
						<template v-if="automations.find(a => a.type === typeInfo.type)">
							<button @click="toggleAutomation(automations.find(a => a.type === typeInfo.type))"
								class="relative w-12 h-6 rounded-full transition-colors"
								:class="automations.find(a => a.type === typeInfo.type)?.enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'">
								<span
									class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
									:class="automations.find(a => a.type === typeInfo.type)?.enabled ? 'translate-x-6' : ''"></span>
							</button>
						</template>
					</div>
					<h3 class="font-bold text-slate-900 dark:text-white mb-1">{{ typeInfo.label }}</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400">{{ typeInfo.description }}</p>
				</div>

				<!-- Content -->
				<div class="p-6">
					<template v-if="automations.find(a => a.type === typeInfo.type)">
						<div class="space-y-3 mb-4">
							<div class="flex items-center justify-between text-sm">
								<span class="text-slate-500">{{ $t('marketing.automations.status') }}</span>
								<span
									:class="automations.find(a => a.type === typeInfo.type)?.enabled ? 'text-emerald-600 font-bold' : 'text-slate-400'">
									{{automations.find(a => a.type === typeInfo.type)?.enabled ? $t('marketing.automations.active') : $t('marketing.automations.inactive')}}
								</span>
							</div>
							<div class="flex items-center justify-between text-sm">
								<span class="text-slate-500">{{ $t('marketing.automations.emails_sent') }}</span>
								<span class="font-bold text-slate-900 dark:text-white">
									{{automations.find(a => a.type === typeInfo.type)?.sendCount || 0}}
								</span>
							</div>
							<div v-if="typeInfo.hasDelay" class="flex items-center justify-between text-sm">
								<span class="text-slate-500">{{ $t('marketing.automations.delay_days') }}</span>
								<span class="font-bold text-slate-900 dark:text-white">
									{{automations.find(a => a.type === typeInfo.type)?.triggerDelayDays || 7}} jours
								</span>
							</div>
						</div>
						<div class="flex gap-2">
							<button @click="openCreateModal(typeInfo.type)"
								class="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm">
								{{ $t('marketing.automations.modify') }}
							</button>
							<button @click="deleteAutomation(automations.find(a => a.type === typeInfo.type)?.id)"
								class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
								<Icon name="ph:trash-bold" size="18" />
							</button>
						</div>
					</template>
					<template v-else>
						<p class="text-sm text-slate-400 mb-4">{{ $t('marketing.automations.not_configured') }}</p>
						<button @click="openCreateModal(typeInfo.type)"
							class="w-full px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-colors text-sm flex items-center justify-center gap-2">
							<Icon name="ph:plus-bold" size="16" />
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
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{{ $t('marketing.automations.name') }}</label>
							<input v-model="form.name" type="text"
								class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
						</div>

						<div>
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{{ $t('marketing.automations.email_subject') }}</label>
							<input v-model="form.subject" type="text" :placeholder="$t('marketing.automations.email_subject_placeholder')"
								class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
						</div>

						<div v-if="getAutomationType(form.type)?.hasDelay">
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
								{{ $t('marketing.automations.delay_label') }}
							</label>
							<input v-model.number="form.triggerDelayDays" type="number" min="1" max="365"
								class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
							<p class="text-xs text-slate-400 mt-1">
								{{ form.type === 'inactivity' ? $t('marketing.automations.delay_inactivity') :
									$t('marketing.automations.delay_prize') }}
							</p>
						</div>

						<div>
							<div class="flex items-center justify-between mb-2">
								<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">{{ $t('marketing.automations.html_content') }}</label>
								<button @click="previewMode = !previewMode"
									class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors"
									:class="previewMode ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
									<Icon :name="previewMode ? 'ph:code-bold' : 'ph:eye-bold'" size="14" />
									{{ previewMode ? $t('marketing.new_campaign.edit') : $t('marketing.new_campaign.preview') }}
								</button>
							</div>
							<div v-if="!previewMode">
								<RichTextEditor v-model="form.htmlContent" />
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
							class="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2">
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
