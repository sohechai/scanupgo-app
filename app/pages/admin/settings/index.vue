<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const toast = useToast()

const activeTab = ref('general') // 'general', 'billing', 'notifications'
const saving = ref(false)
const loading = ref(true)

// Settings data
const settings = ref({
	appName: 'ScanUpGo',
	supportEmail: 'support@scanupgo.com',
	stripeConfigured: false,
	freeTrialEnabled: false,
	freeTrialDays: 14,
})

// Fetch settings
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
		const payload: any = {
			appName: settings.value.appName,
			supportEmail: settings.value.supportEmail,
			freeTrialEnabled: settings.value.freeTrialEnabled,
			freeTrialDays: settings.value.freeTrialDays,
		}

		const response: any = await $api('/admin/settings', {
			method: 'PUT',
			body: payload
		})

		toast.show(t('admin.settings.save_success'), 'success')
	} catch (error: any) {
		console.error('Failed to save settings:', error)
		toast.show(error?.data?.message || t('admin.settings.save_error'), 'error')
	} finally {
		saving.value = false
	}
}
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.settings.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.settings.description') }}</p>
				</div>
				<button @click="handleSave" :disabled="saving"
					class="px-6 py-2.5 bg-white hover:bg-slate-100 text-black rounded-xl font-bold transition-all shadow-lg shadow-white/5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
					<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" />
					<Icon v-else name="ph:floppy-disk-bold" />
					{{ saving ? $t('admin.settings.saving') : $t('admin.settings.save_button') }}
				</button>
			</div>

			<div class="flex flex-col lg:flex-row gap-8">
				<!-- Sidebar Navigation -->
				<div class="w-full lg:w-72 flex-shrink-0 space-y-2">
					<div
						class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-lg shadow-black/10">
						<button @click="activeTab = 'general'"
							:class="['w-full text-left rtl:text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors', activeTab === 'general' ? 'bg-white/10 text-white shadow-inner shadow-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5']">
							<Icon name="ph:toggle-left-bold" size="20" />
							{{ $t('admin.settings.general_tab') }}
						</button>
						<button @click="activeTab = 'billing'"
							:class="['w-full text-left rtl:text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors', activeTab === 'billing' ? 'bg-white/10 text-white shadow-inner shadow-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5']">
							<Icon name="ph:credit-card-bold" size="20" />
							{{ $t('admin.settings.billing_tab') }}
						</button>
						<button @click="activeTab = 'notifications'"
							:class="['w-full text-left rtl:text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors', activeTab === 'notifications' ? 'bg-white/10 text-white shadow-inner shadow-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5']">
							<Icon name="ph:bell-simple-bold" size="20" />
							{{ $t('admin.settings.notifications_tab') }}
						</button>
					</div>
				</div>

				<!-- Content Area -->
				<div
					class="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 min-h-[500px] shadow-xl shadow-black/10">

					<!-- TAB: GENERAL -->
					<div v-if="activeTab === 'general'" class="space-y-8 animate-fade-in">
						<div v-if="loading" class="flex items-center justify-center py-12">
							<Icon name="ph:spinner-gap-bold" size="32" class="text-white animate-spin" />
						</div>
						<div v-else>
							<h2 class="text-xl font-bold text-white mb-6">{{ $t('admin.settings.platform_info') }}</h2>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div class="space-y-2">
									<label class="text-sm font-bold text-slate-400">{{ $t('admin.settings.app_name_label') }}</label>
									<input type="text" v-model="settings.appName"
										class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/20 outline-none transition-all placeholder-slate-600" />
								</div>
								<div class="space-y-2">
									<label class="text-sm font-bold text-slate-400">{{ $t('admin.settings.support_email_label') }}</label>
									<input type="email" v-model="settings.supportEmail"
										class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/20 outline-none transition-all placeholder-slate-600" />
								</div>
							</div>
						</div>
					</div>

					<!-- TAB: BILLING -->
					<div v-if="activeTab === 'billing'" class="space-y-8 animate-fade-in">
						<div v-if="loading" class="flex items-center justify-center py-12">
							<Icon name="ph:spinner-gap-bold" size="32" class="text-white animate-spin" />
						</div>
						<div v-else>
							<!-- Free Trial Toggle -->
							<div class="mb-8">
								<h2 class="text-xl font-bold text-white mb-6">{{ $t('admin.settings.billing_trial_title') }}</h2>
								<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
									<!-- Toggle row -->
									<div class="flex items-center justify-between gap-4">
										<div>
											<p class="font-semibold text-white text-sm">{{ $t('admin.settings.billing_trial_enable') }}</p>
											<p class="text-slate-400 text-xs mt-0.5">{{ $t('admin.settings.billing_trial_description') }}</p>
										</div>
										<button
											type="button"
											@click="settings.freeTrialEnabled = !settings.freeTrialEnabled"
											:class="[
												'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
												settings.freeTrialEnabled ? 'bg-emerald-500' : 'bg-white/10'
											]">
											<span
												:class="[
													'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
													settings.freeTrialEnabled ? 'translate-x-5' : 'translate-x-0'
												]" />
										</button>
									</div>

									<!-- Days input -->
									<div v-if="settings.freeTrialEnabled" class="flex items-center gap-4 pt-2 border-t border-white/10">
										<label class="text-sm text-slate-400 shrink-0">{{ $t('admin.settings.billing_trial_duration') }}</label>
										<div class="flex items-center gap-2">
											<input
												v-model.number="settings.freeTrialDays"
												type="number"
												min="1"
												max="90"
												class="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-center font-bold outline-none focus:border-white/30 transition-all"
											/>
											<span class="text-slate-400 text-sm">{{ $t('admin.settings.billing_trial_days_unit') }}</span>
										</div>
									</div>

									<!-- Status badge -->
									<div :class="[
										'flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit',
										settings.freeTrialEnabled
											? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
											: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
									]">
										<Icon :name="settings.freeTrialEnabled ? 'ph:check-circle-bold' : 'ph:x-circle-bold'" size="14" />
										{{ settings.freeTrialEnabled ? $t('admin.settings.billing_trial_active', { days: settings.freeTrialDays }) : $t('admin.settings.billing_trial_inactive') }}
									</div>
								</div>
							</div>

							<!-- Stripe Status -->
							<div>
								<h2 class="text-xl font-bold text-white mb-6">{{ $t('admin.settings.stripe_config') }}</h2>
								<div
									:class="['rounded-xl p-5 flex items-start gap-4', settings.stripeConfigured ? 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20' : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20']">
									<div
										:class="['w-10 h-10 rounded-lg flex items-center justify-center shrink-0', settings.stripeConfigured ? 'bg-emerald-500/20' : 'bg-amber-500/20']">
										<Icon :name="settings.stripeConfigured ? 'ph:check-circle-bold' : 'ph:warning-circle-bold'"
											:class="settings.stripeConfigured ? 'text-emerald-400' : 'text-amber-500'" size="20" />
									</div>
									<div>
										<h4 :class="['font-bold text-sm mb-1', settings.stripeConfigured ? 'text-emerald-400' : 'text-amber-500']">
											{{ settings.stripeConfigured ? $t('admin.settings.stripe_configured') : $t('admin.settings.stripe_not_configured') }}
										</h4>
										<p :class="['text-sm', settings.stripeConfigured ? 'text-emerald-200/70' : 'text-amber-200/70']">
											{{ settings.stripeConfigured
												? $t('admin.settings.stripe_configured_description')
												: $t('admin.settings.stripe_not_configured_description') }}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- TAB: NOTIFICATIONS -->
					<div v-if="activeTab === 'notifications'" class="space-y-8 animate-fade-in">
						<!-- Quick Action: Send Notification -->
						<div>
							<h2 class="text-xl font-bold text-white mb-6">{{ $t('admin.settings.notifications_send') }}</h2>
							<NuxtLink to="/admin/notifications"
								class="block bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all group">
								<div class="flex items-center gap-4">
									<div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
										<Icon name="ph:paper-plane-tilt-bold" class="text-blue-400" size="24" />
									</div>
									<div class="flex-1">
										<div class="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
											{{ $t('admin.settings.notifications_create') }}
										</div>
										<div class="text-sm text-slate-400">
											{{ $t('admin.settings.notifications_description') }}
										</div>
									</div>
									<Icon name="ph:arrow-right-bold" class="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all rtl:rotate-180" size="20" />
								</div>
							</NuxtLink>
						</div>

						<!-- Email Templates -->
						<div>
							<h2 class="text-xl font-bold text-white mb-6">{{ $t('admin.settings.email_templates') }}</h2>
							<div class="space-y-4">
								<div class="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4">
									<div class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
										<Icon name="ph:envelope-simple-open-bold" class="text-slate-300" size="20" />
									</div>
									<div class="flex-1">
										<div class="font-bold text-white mb-1">{{ $t('admin.settings.email_welcome') }}</div>
										<div class="text-xs text-slate-500">{{ $t('admin.settings.email_welcome_description') }}</div>
									</div>
									<span class="text-xs text-slate-600 bg-white/5 px-2 py-1 rounded-lg border border-white/5">{{ $t('admin.settings.email_template_auto') }}</span>
								</div>
								<div class="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4">
									<div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
										<Icon name="ph:check-circle-bold" class="text-emerald-400" size="20" />
									</div>
									<div class="flex-1">
										<div class="font-bold text-white mb-1">{{ $t('admin.settings.email_payment') }}</div>
										<div class="text-xs text-slate-500">{{ $t('admin.settings.email_payment_description') }}</div>
									</div>
									<span class="text-xs text-slate-600 bg-white/5 px-2 py-1 rounded-lg border border-white/5">{{ $t('admin.settings.email_template_auto') }}</span>
								</div>
							</div>
						</div>
					</div>

				</div>
			</div>
		</div>
	</div>
</template>
