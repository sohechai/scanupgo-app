<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t, locale, setLocale } = useI18n()
const { user, signOut } = useAuth()

const languages = [
	{ code: 'fr', label: 'Français', flag: '🇫🇷' },
	{ code: 'ar', label: 'العربية', flag: '🇲🇦' },
	{ code: 'en', label: 'English', flag: '🇬🇧' },
]

const changeLanguage = async (code: string) => {
	await setLocale(code as any)
	try {
		await $api('/auth/update-language', { method: 'POST', body: { preferredLanguage: code } })
	} catch (e) { console.error('Failed to save language preference:', e) }
}

const { $api } = useNuxtApp()
const { show: showToast } = useToast()

const loading = ref(false)
const showDeleteModal = ref(false)
const showPasswordModal = ref(false)
const showEmailModal = ref(false)

const form = ref({ email: '', currentPassword: '', newPassword: '', confirmPassword: '' })

const passwordLoading = ref(false)
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })

const emailLoading = ref(false)
const emailForm = ref({ newEmail: '', password: '' })

const profileLoading = ref(false)
const profileForm = ref({ firstName: '', lastName: '', phone: '' })

const displayName = computed(() => {
	if (user.value?.firstName || user.value?.lastName) {
		return `${user.value?.firstName || ''} ${user.value?.lastName || ''}`.trim()
	}
	return null
})

const changePassword = async () => {
	if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
		showToast(t('account.password_mismatch'), 'error'); return
	}
	if (passwordForm.value.newPassword.length < 8) {
		showToast(t('account.password_too_short'), 'error'); return
	}
	passwordLoading.value = true
	try {
		await $api('/auth/change-password', {
			method: 'POST',
			body: { currentPassword: passwordForm.value.currentPassword, newPassword: passwordForm.value.newPassword }
		})
		showToast(t('account.password_update_success'), 'success')
		showPasswordModal.value = false
		passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
	} catch (e: any) {
		showToast(e?.data?.message || t('account.password_update_error'), 'error')
	} finally { passwordLoading.value = false }
}

const { fetchUser } = useAuth()

const updateProfile = async () => {
	profileLoading.value = true
	try {
		await $api('/auth/update-profile', {
			method: 'POST',
			body: {
				firstName: profileForm.value.firstName || undefined,
				lastName: profileForm.value.lastName || undefined,
				phone: profileForm.value.phone || undefined
			}
		})
		showToast(t('account.profile_update_success'), 'success')
		await fetchUser()
	} catch (e: any) {
		showToast(e?.data?.message || t('account.profile_update_error'), 'error')
	} finally { profileLoading.value = false }
}

const changeEmail = async () => {
	if (!emailForm.value.newEmail || !emailForm.value.password) {
		showToast(t('account.email_update_error'), 'error'); return
	}
	emailLoading.value = true
	try {
		await $api('/auth/change-email', {
			method: 'POST',
			body: { newEmail: emailForm.value.newEmail, password: emailForm.value.password }
		})
		showToast(t('account.email_update_success'), 'success')
		showEmailModal.value = false
		emailForm.value = { newEmail: '', password: '' }
		await fetchUser()
	} catch (e: any) {
		showToast(e?.data?.message || t('account.email_update_error'), 'error')
	} finally { emailLoading.value = false }
}

const billingPortalLoading = ref(false)
const openBillingPortal = async () => {
	billingPortalLoading.value = true
	try {
		const response = await $api<{ url: string }>('/subscriptions/billing-portal', { method: 'POST' })
		if (response.url) window.location.href = response.url
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally { billingPortalLoading.value = false }
}

const logoutAllLoading = ref(false)
const logoutAllDevices = async () => {
	if (!confirm(t('account.logout_all') + ' ?')) return
	logoutAllLoading.value = true
	try {
		await $api('/auth/logout-all', { method: 'POST' })
		showToast(t('account.logout_all_success'), 'success')
		await signOut()
	} catch (e: any) {
		showToast(e?.data?.message || t('account.logout_all_error'), 'error')
	} finally { logoutAllLoading.value = false }
}

const exportLoading = ref(false)
const exportData = async () => {
	exportLoading.value = true
	try {
		const data = await $api('/auth/export-data')
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.download = `scanupgo-export-${new Date().toISOString().split('T')[0]}.json`
		link.href = url
		link.click()
		URL.revokeObjectURL(url)
		showToast(t('account.export_success'), 'success')
	} catch (e: any) {
		showToast(e?.data?.message || t('account.export_error'), 'error')
	} finally { exportLoading.value = false }
}

const deleteLoading = ref(false)
const deleteConfirmText = ref('')
const deleteAccount = async () => {
	if (deleteConfirmText.value !== t('account.delete_confirm_text_message')) {
		showToast(t('account.delete_confirm_text'), 'error'); return
	}
	deleteLoading.value = true
	try {
		await $api('/auth/delete-account', { method: 'DELETE' })
		showToast(t('common.success'), 'success')
		await signOut()
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally { deleteLoading.value = false }
}

onMounted(() => {
	if (user.value) {
		form.value.email = user.value.email || ''
		profileForm.value.firstName = user.value.firstName || ''
		profileForm.value.lastName = user.value.lastName || ''
		profileForm.value.phone = user.value.phone || ''
	}
})

watch(user, (newUser) => {
	if (newUser) {
		profileForm.value.firstName = newUser.firstName || ''
		profileForm.value.lastName = newUser.lastName || ''
		profileForm.value.phone = newUser.phone || ''
	}
}, { immediate: true })
</script>

<template>
	<div class="space-y-5 max-w-3xl">

		<!-- Header -->
		<div class="flex items-center gap-3">
			<div class="w-11 h-11 rounded-md bg-[#007AFF]/10 flex items-center justify-center shrink-0">
				<span class="text-[#007AFF] text-base font-semibold">
					{{ (user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase() }}
				</span>
			</div>
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">
					{{ displayName || user?.username || $t('account.title') }}
				</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ user?.email }}</p>
			</div>
		</div>

		<!-- Profile Section -->
		<div>
			<p class="text-xs font-medium text-slate-400 dark:text-slate-500 px-1 mb-2">{{ $t('account.profile_section') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<form @submit.prevent="updateProfile" class="divide-y divide-slate-100 dark:divide-slate-800">
					<div class="flex items-center gap-4 px-5 py-3.5">
						<p class="text-sm text-slate-400 dark:text-slate-500 w-28 shrink-0">{{ $t('account.firstname') }}</p>
						<input v-model="profileForm.firstName" type="text" :placeholder="$t('account.firstname_placeholder')"
							class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none text-right" />
					</div>
					<div class="flex items-center gap-4 px-5 py-3.5">
						<p class="text-sm text-slate-400 dark:text-slate-500 w-28 shrink-0">{{ $t('account.lastname') }}</p>
						<input v-model="profileForm.lastName" type="text" :placeholder="$t('account.lastname_placeholder')"
							class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none text-right" />
					</div>
					<div class="flex items-center gap-4 px-5 py-3.5">
						<p class="text-sm text-slate-400 dark:text-slate-500 w-28 shrink-0">{{ $t('account.phone') }}</p>
						<input v-model="profileForm.phone" type="tel" :placeholder="$t('account.phone_placeholder')"
							class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none text-right" />
					</div>
					<div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex justify-end border-t border-slate-100 dark:border-slate-800">
						<button type="submit" :disabled="profileLoading"
							class="flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md text-sm transition-all disabled:opacity-50">
							<Icon v-if="profileLoading" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
							<span>{{ profileLoading ? $t('profile.saving') : $t('account.save_button') }}</span>
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Language Section -->
		<div>
			<p class="text-xs font-medium text-slate-400 dark:text-slate-500 px-1 mb-2">{{ $t('account.language_section') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
				<div class="flex gap-2">
					<button v-for="lang in languages" :key="lang.code" @click="changeLanguage(lang.code)"
						class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all"
						:class="locale === lang.code
							? 'bg-[#007AFF] text-white'
							: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'">
						<span class="text-base">{{ lang.flag }}</span>
						<span>{{ lang.label }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Account Info Section -->
		<div>
			<p class="text-xs font-medium text-slate-400 dark:text-slate-500 px-1 mb-2">{{ $t('account.account_info_section') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:at-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<p class="text-sm font-medium text-slate-900 dark:text-white flex-1">{{ $t('account.username') }}</p>
					<p class="text-sm text-slate-400 dark:text-slate-500 font-mono">{{ user?.username || '—' }}</p>
				</div>
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:envelope-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<p class="text-sm font-medium text-slate-900 dark:text-white flex-1">{{ $t('account.email') }}</p>
					<div class="flex items-center gap-2">
						<p class="text-sm text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{{ user?.email }}</p>
						<button @click="showEmailModal = true"
							class="text-[#007AFF] text-xs font-medium hover:opacity-70 transition-opacity shrink-0">
							{{ $t('account.email_change_button') }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Security Section -->
		<div>
			<p class="text-xs font-medium text-slate-400 dark:text-slate-500 px-1 mb-2">{{ $t('account.security_section') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:lock-key-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.password') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.password_change') }}</p>
					</div>
					<button @click="showPasswordModal = true"
						class="text-[#007AFF] text-xs font-medium hover:opacity-70 transition-opacity shrink-0">
						{{ $t('account.password_button') }}
					</button>
				</div>

				<div class="flex items-center gap-3.5 px-5 py-3.5 opacity-50">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:shield-check-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.two_factor') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.two_factor_coming') }}</p>
					</div>
					<span class="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-1 rounded shrink-0">
						{{ $t('account.two_factor_coming') }}
					</span>
				</div>

				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:devices-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.logout_all') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.logout_all_description') }}</p>
					</div>
					<button @click="logoutAllDevices" :disabled="logoutAllLoading"
						class="text-red-500 text-xs font-medium hover:opacity-70 transition-opacity disabled:opacity-30 shrink-0 flex items-center gap-1">
						<Icon v-if="logoutAllLoading" name="ph:spinner-gap-bold" size="12" class="animate-spin" />
						<span>{{ $t('account.logout_button') }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Payment Section -->
		<div>
			<p class="text-xs font-medium text-slate-400 dark:text-slate-500 px-1 mb-2">{{ $t('account.payment_section') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:credit-card-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.payment_methods') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.payment_methods_description') }}</p>
					</div>
					<button @click="openBillingPortal" :disabled="billingPortalLoading"
						class="text-[#007AFF] text-xs font-medium hover:opacity-70 transition-opacity disabled:opacity-30 shrink-0 flex items-center gap-1">
						<Icon v-if="billingPortalLoading" name="ph:spinner-gap-bold" size="12" class="animate-spin" />
						<span>{{ $t('account.payment_manage_button') }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Quick Links Section -->
		<div>
			<p class="text-xs font-medium text-slate-400 dark:text-slate-500 px-1 mb-2">{{ $t('account.shortcuts_section') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
				<NuxtLink to="/dashboard/profile"
					class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:storefront-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.my_business') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.my_business_description') }}</p>
					</div>
					<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />
				</NuxtLink>

				<NuxtLink to="/dashboard/subscription"
					class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:crown-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.my_subscription') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.my_subscription_description') }}</p>
					</div>
					<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />
				</NuxtLink>

				<NuxtLink to="/dashboard/subscription/invoices"
					class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:receipt-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.my_invoices') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.my_invoices_description') }}</p>
					</div>
					<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />
				</NuxtLink>

				<a href="mailto:support@scanupgo.com"
					class="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:lifebuoy-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.support') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.support_description') }}</p>
					</div>
					<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />
				</a>
			</div>
		</div>

		<!-- Data & Privacy -->
		<div>
			<p class="text-xs font-medium text-slate-400 dark:text-slate-500 px-1 mb-2">{{ $t('account.data_privacy_section') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:download-simple-bold" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.export_data') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.export_data_description') }}</p>
					</div>
					<button @click="exportData" :disabled="exportLoading"
						class="text-[#007AFF] text-xs font-medium hover:opacity-70 transition-opacity disabled:opacity-30 shrink-0 flex items-center gap-1">
						<Icon v-if="exportLoading" name="ph:spinner-gap-bold" size="12" class="animate-spin" />
						<span>{{ exportLoading ? 'Export...' : $t('account.export_button') }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Danger Zone -->
		<div>
			<p class="text-xs font-medium text-red-400 px-1 mb-2">{{ $t('account.delete_account') }}</p>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-red-100 dark:border-red-900/30 overflow-hidden">
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
						<Icon name="ph:trash-bold" class="text-red-400" size="14" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('account.delete_account') }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('account.delete_account_description') }}</p>
					</div>
					<button @click="showDeleteModal = true"
						class="text-red-500 text-xs font-medium hover:opacity-70 transition-opacity shrink-0">
						{{ $t('account.delete_button') }}
					</button>
				</div>
			</div>
		</div>

		<!-- Password Change Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showPasswordModal" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showPasswordModal = false" />
					<div class="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
						<div class="h-0.5 w-full bg-[#007AFF]" />
						<div class="p-6">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-9 h-9 rounded-md bg-[#007AFF]/10 flex items-center justify-center shrink-0">
									<Icon name="ph:lock-key-bold" class="text-[#007AFF]" size="16" />
								</div>
								<h3 class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('account.password_modal_title') }}</h3>
							</div>
							<form @submit.prevent="changePassword" class="space-y-3">
								<div class="bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
									<div class="flex items-center px-4 py-3">
										<label class="text-sm text-slate-400 dark:text-slate-500 w-32 shrink-0">{{ $t('account.password_current') }}</label>
										<input v-model="passwordForm.currentPassword" type="password" required
											class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none text-right" />
									</div>
									<div class="flex items-center px-4 py-3">
										<label class="text-sm text-slate-400 dark:text-slate-500 w-32 shrink-0">{{ $t('account.password_new') }}</label>
										<input v-model="passwordForm.newPassword" type="password" required minlength="8"
											class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none text-right" />
									</div>
									<div class="flex items-center px-4 py-3">
										<label class="text-sm text-slate-400 dark:text-slate-500 w-32 shrink-0">{{ $t('account.password_confirm') }}</label>
										<input v-model="passwordForm.confirmPassword" type="password" required minlength="8"
											class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none text-right" />
									</div>
								</div>
								<div class="flex flex-col gap-2 pt-1">
									<button type="submit" :disabled="passwordLoading"
										class="w-full py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
										<Icon v-if="passwordLoading" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
										<span>{{ passwordLoading ? $t('common.loading') : $t('account.modify') }}</span>
									</button>
									<button type="button" @click="showPasswordModal = false"
										class="w-full py-2.5 text-slate-500 dark:text-slate-400 font-medium text-sm hover:opacity-70 transition-opacity">
										{{ $t('account.cancel') }}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- Email Change Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showEmailModal" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showEmailModal = false" />
					<div class="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
						<div class="h-0.5 w-full bg-[#007AFF]" />
						<div class="p-6">
							<div class="flex items-center gap-3 mb-5">
								<div class="w-9 h-9 rounded-md bg-[#007AFF]/10 flex items-center justify-center shrink-0">
									<Icon name="ph:envelope-bold" class="text-[#007AFF]" size="16" />
								</div>
								<h3 class="font-semibold text-slate-900 dark:text-white text-sm">{{ $t('account.email_modal_title') }}</h3>
							</div>
							<form @submit.prevent="changeEmail" class="space-y-3">
								<div class="bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
									<div class="flex items-center px-4 py-3">
										<label class="text-sm text-slate-400 dark:text-slate-500 w-28 shrink-0">{{ $t('account.email_current') }}</label>
										<p class="flex-1 text-sm text-slate-400 dark:text-slate-500 text-right truncate">{{ user?.email }}</p>
									</div>
									<div class="flex items-center px-4 py-3">
										<label class="text-sm text-slate-400 dark:text-slate-500 w-28 shrink-0">{{ $t('account.email_new') }}</label>
										<input v-model="emailForm.newEmail" type="email" required
											class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none text-right" />
									</div>
									<div class="flex items-center px-4 py-3">
										<label class="text-sm text-slate-400 dark:text-slate-500 w-28 shrink-0">{{ $t('account.email_password') }}</label>
										<input v-model="emailForm.password" type="password" required
											class="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none text-right" />
									</div>
								</div>
								<div class="flex flex-col gap-2 pt-1">
									<button type="submit" :disabled="emailLoading"
										class="w-full py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
										<Icon v-if="emailLoading" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
										<span>{{ emailLoading ? $t('common.loading') : $t('account.modify') }}</span>
									</button>
									<button type="button" @click="showEmailModal = false"
										class="w-full py-2.5 text-slate-500 dark:text-slate-400 font-medium text-sm hover:opacity-70 transition-opacity">
										{{ $t('account.cancel') }}
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- Delete Account Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDeleteModal = false" />
					<div class="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
						<div class="h-0.5 w-full bg-red-500" />
						<div class="p-6">
							<div class="flex items-start gap-3 mb-5">
								<div class="w-9 h-9 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
									<Icon name="ph:trash-simple-bold" size="16" class="text-red-500" />
								</div>
								<div>
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white">
										{{ $t('account.delete_confirmation_title') }}
									</h3>
									<p class="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
										{{ $t('account.delete_confirmation_message') }}
									</p>
								</div>
							</div>

							<div class="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md px-4 py-3 mb-5">
								<Icon name="ph:warning-circle-fill" size="15" class="text-red-500 mt-0.5 shrink-0" />
								<p class="text-xs text-red-600 dark:text-red-400 leading-relaxed">
									{{ $t('account.delete_warning') }}
								</p>
							</div>

							<div class="mb-5">
								<label class="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
									{{ $t('account.delete_confirm_text') }}
								</label>
								<input
									v-model="deleteConfirmText"
									type="text"
									:placeholder="$t('account.delete_confirm_text_message')"
									class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-md text-slate-900 dark:text-white outline-none tracking-widest font-mono text-sm transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
									:class="deleteConfirmText === $t('account.delete_confirm_text_message')
										? 'border-red-400 ring-2 ring-red-400/20'
										: 'border-slate-200 dark:border-slate-700'"
								/>
							</div>

							<div class="flex gap-3">
								<button @click="showDeleteModal = false"
									class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">
									{{ $t('account.cancel') }}
								</button>
								<button @click="deleteAccount"
									:disabled="deleteLoading || deleteConfirmText !== $t('account.delete_confirm_text_message')"
									class="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
									<Icon v-if="deleteLoading" name="ph:spinner-gap" size="14" class="animate-spin" />
									<Icon v-else name="ph:trash-simple-bold" size="14" />
									<span>{{ deleteLoading ? $t('common.loading') : $t('account.delete_permanent') }}</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
	transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
	transform: scale(0.95);
}
</style>
