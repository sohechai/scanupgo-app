<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const toast = useToast()

const activeTab = ref('general')
const saving = ref(false)
const loading = ref(true)

const settings = ref({
	appName: 'ScanUpGo',
	supportEmail: 'support@scanupgo.com',
	stripeConfigured: false,
	freeTrialEnabled: false,
	freeTrialDays: 14,
})

onMounted(async () => {
	try {
		const data = await $api<any>('/admin/settings')
		settings.value = {
			appName: data.appName,
			supportEmail: data.supportEmail,
			stripeConfigured: data.stripeConfigured ?? false,
			freeTrialEnabled: data.freeTrialEnabled ?? false,
			freeTrialDays: data.freeTrialDays ?? 14,
		}
	} catch (error) {
		console.error('Failed to fetch settings:', error)
		toast.show(t('admin.settings.load_error'), 'error')
	} finally {
		loading.value = false
	}
})

const handleSave = async () => {
	saving.value = true
	try {
		await $api('/admin/settings', {
			method: 'PUT',
			body: {
				appName: settings.value.appName,
				supportEmail: settings.value.supportEmail,
				freeTrialEnabled: settings.value.freeTrialEnabled,
				freeTrialDays: settings.value.freeTrialDays,
			}
		})
		toast.show(t('admin.settings.save_success'), 'success')
	} catch (error: any) {
		toast.show(error?.data?.message || t('admin.settings.save_error'), 'error')
	} finally {
		saving.value = false
	}
}

const tabs = computed(() => [
	{ key: 'general', label: t('admin.settings.general_tab'), icon: 'ph:sliders-bold' },
	{ key: 'billing', label: t('admin.settings.billing_tab'), icon: 'ph:credit-card-bold' },
	{ key: 'notifications', label: t('admin.settings.notifications_tab'), icon: 'ph:bell-simple-bold' },
])
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.settings.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.settings.description') }}</p>
			</div>
			<button @click="handleSave" :disabled="saving"
				class="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 text-sm font-semibold rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
				<Icon v-if="saving" name="svg-spinners:ring-resize" size="13" />
				<Icon v-else name="ph:floppy-disk-bold" size="13" />
				{{ saving ? $t('admin.settings.saving') : $t('admin.settings.save_button') }}
			</button>
		</div>

		<div class="flex flex-col lg:flex-row gap-5">

			<!-- Sidebar nav -->
			<div class="w-full lg:w-52 shrink-0">
				<nav class="bg-[#161920] border border-white/[0.07] rounded-lg p-1 space-y-0.5">
					<button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
						class="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left rtl:text-right"
						:class="activeTab === tab.key ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'">
						<Icon :name="tab.icon" size="15" :class="activeTab === tab.key ? 'text-brand-400' : 'text-slate-600'" />
						{{ tab.label }}
					</button>
				</nav>
			</div>

			<!-- Content -->
			<div class="flex-1 bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">

				<div v-if="loading" class="flex items-center justify-center py-20 text-slate-600">
					<Icon name="svg-spinners:ring-resize" size="28" />
				</div>

				<template v-else>

					<!-- TAB: GENERAL -->
					<div v-if="activeTab === 'general'">
						<div class="px-5 py-4 border-b border-white/[0.06]">
							<h2 class="text-sm font-semibold text-white">{{ $t('admin.settings.platform_info') }}</h2>
						</div>
						<div class="p-5 space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.settings.app_name_label') }}</label>
									<input type="text" v-model="settings.appName"
										class="w-full px-3 py-2 bg-[#0d0e12] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
								</div>
								<div>
									<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.settings.support_email_label') }}</label>
									<input type="email" v-model="settings.supportEmail"
										class="w-full px-3 py-2 bg-[#0d0e12] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
								</div>
							</div>
						</div>
					</div>

					<!-- TAB: BILLING -->
					<div v-if="activeTab === 'billing'">
						<div class="px-5 py-4 border-b border-white/[0.06]">
							<h2 class="text-sm font-semibold text-white">{{ $t('admin.settings.billing_tab') }}</h2>
						</div>
						<div class="divide-y divide-white/[0.04]">

							<!-- Free Trial section -->
							<div class="p-5 space-y-4">
								<h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ $t('admin.settings.billing_trial_title') }}</h3>

								<div class="flex items-center justify-between gap-4">
									<div>
										<p class="text-sm font-medium text-white">{{ $t('admin.settings.billing_trial_enable') }}</p>
										<p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.settings.billing_trial_description') }}</p>
									</div>
									<button type="button" @click="settings.freeTrialEnabled = !settings.freeTrialEnabled"
										:class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none', settings.freeTrialEnabled ? 'bg-emerald-500' : 'bg-white/10']">
										<span :class="['pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200', settings.freeTrialEnabled ? 'translate-x-4' : 'translate-x-0']" />
									</button>
								</div>

								<div v-if="settings.freeTrialEnabled" class="flex items-center gap-3 pt-1">
									<label class="text-xs text-slate-400 shrink-0">{{ $t('admin.settings.billing_trial_duration') }}</label>
									<input v-model.number="settings.freeTrialDays" type="number" min="1" max="90"
										class="w-16 px-2 py-1.5 bg-[#0d0e12] border border-white/[0.07] rounded-md text-sm text-white text-center focus:border-white/20 focus:outline-none transition-colors" />
									<span class="text-xs text-slate-500">{{ $t('admin.settings.billing_trial_days_unit') }}</span>
								</div>

								<div class="flex items-center gap-1.5 text-xs font-medium"
									:class="settings.freeTrialEnabled ? 'text-emerald-400' : 'text-slate-600'">
									<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="settings.freeTrialEnabled ? 'bg-emerald-400' : 'bg-slate-600'"></span>
									{{ settings.freeTrialEnabled ? $t('admin.settings.billing_trial_active', { days: settings.freeTrialDays }) : $t('admin.settings.billing_trial_inactive') }}
								</div>
							</div>

							<!-- Stripe section -->
							<div class="p-5 space-y-3">
								<h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ $t('admin.settings.stripe_config') }}</h3>
								<div class="flex items-start gap-3 p-3 rounded-md border"
									:class="settings.stripeConfigured ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-amber-500/[0.06] border-amber-500/20'">
									<Icon :name="settings.stripeConfigured ? 'ph:check-circle-bold' : 'ph:warning-circle-bold'"
										size="16" class="mt-0.5 shrink-0"
										:class="settings.stripeConfigured ? 'text-emerald-400' : 'text-amber-400'" />
									<div>
										<p class="text-sm font-medium" :class="settings.stripeConfigured ? 'text-emerald-400' : 'text-amber-400'">
											{{ settings.stripeConfigured ? $t('admin.settings.stripe_configured') : $t('admin.settings.stripe_not_configured') }}
										</p>
										<p class="text-xs mt-0.5" :class="settings.stripeConfigured ? 'text-emerald-400/60' : 'text-amber-400/60'">
											{{ settings.stripeConfigured ? $t('admin.settings.stripe_configured_description') : $t('admin.settings.stripe_not_configured_description') }}
										</p>
									</div>
								</div>
							</div>

						</div>
					</div>

					<!-- TAB: NOTIFICATIONS -->
					<div v-if="activeTab === 'notifications'">
						<div class="px-5 py-4 border-b border-white/[0.06]">
							<h2 class="text-sm font-semibold text-white">{{ $t('admin.settings.notifications_tab') }}</h2>
						</div>
						<div class="divide-y divide-white/[0.04]">

							<!-- Quick link -->
							<div class="p-5">
								<h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{{ $t('admin.settings.notifications_send') }}</h3>
								<NuxtLink to="/admin/notifications"
									class="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-md hover:bg-white/[0.06] transition-colors group">
									<div class="w-8 h-8 rounded-md bg-brand-500/10 flex items-center justify-center shrink-0">
										<Icon name="ph:paper-plane-tilt-bold" class="text-brand-400" size="15" />
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">{{ $t('admin.settings.notifications_create') }}</p>
										<p class="text-xs text-slate-500">{{ $t('admin.settings.notifications_description') }}</p>
									</div>
									<Icon name="ph:arrow-right-bold" size="14" class="text-slate-600 group-hover:text-slate-400 transition-colors rtl:rotate-180" />
								</NuxtLink>
							</div>

							<!-- Email templates -->
							<div class="p-5">
								<h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{{ $t('admin.settings.email_templates') }}</h3>
								<div class="space-y-2">
									<div v-for="item in [
										{ icon: 'ph:envelope-simple-open-bold', iconClass: 'text-slate-400', bgClass: 'bg-white/[0.06]', title: $t('admin.settings.email_welcome'), desc: $t('admin.settings.email_welcome_description') },
										{ icon: 'ph:check-circle-bold', iconClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', title: $t('admin.settings.email_payment'), desc: $t('admin.settings.email_payment_description') },
									]" :key="item.title"
										class="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-md">
										<div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0" :class="item.bgClass">
											<Icon :name="item.icon" size="14" :class="item.iconClass" />
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-white">{{ item.title }}</p>
											<p class="text-xs text-slate-500">{{ item.desc }}</p>
										</div>
										<span class="text-xs text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.05]">{{ $t('admin.settings.email_template_auto') }}</span>
									</div>
								</div>
							</div>

						</div>
					</div>

				</template>
			</div>

		</div>
	</div>
</template>
