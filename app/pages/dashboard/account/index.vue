<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { user, signOut } = useAuth()
const { $api } = useNuxtApp()
const { show: showToast } = useToast()

// State
const loading = ref(false)
const showDeleteModal = ref(false)
const showPasswordModal = ref(false)
const showEmailModal = ref(false)

// Form state
const form = ref({
	email: '',
	currentPassword: '',
	newPassword: '',
	confirmPassword: ''
})

// Password change
const passwordLoading = ref(false)
const passwordForm = ref({
	currentPassword: '',
	newPassword: '',
	confirmPassword: ''
})

// Email change
const emailLoading = ref(false)
const emailForm = ref({
	newEmail: '',
	password: ''
})

// Profile form
const profileLoading = ref(false)
const profileForm = ref({
	firstName: '',
	lastName: '',
	phone: ''
})

// Computed display name
const displayName = computed(() => {
	if (user.value?.firstName || user.value?.lastName) {
		return `${user.value?.firstName || ''} ${user.value?.lastName || ''}`.trim()
	}
	return null
})

const changePassword = async () => {
	if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
		showToast(t('account.password_mismatch'), 'error')
		return
	}

	if (passwordForm.value.newPassword.length < 8) {
		showToast(t('account.password_too_short'), 'error')
		return
	}

	passwordLoading.value = true
	try {
		await $api('/auth/change-password', {
			method: 'POST',
			body: {
				currentPassword: passwordForm.value.currentPassword,
				newPassword: passwordForm.value.newPassword
			}
		})
		showToast(t('account.password_update_success'), 'success')
		showPasswordModal.value = false
		passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
	} catch (e: any) {
		showToast(e?.data?.message || t('account.password_update_error'), 'error')
	} finally {
		passwordLoading.value = false
	}
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
	} finally {
		profileLoading.value = false
	}
}

const changeEmail = async () => {
	if (!emailForm.value.newEmail || !emailForm.value.password) {
		showToast(t('account.email_update_error'), 'error')
		return
	}

	emailLoading.value = true
	try {
		await $api('/auth/change-email', {
			method: 'POST',
			body: {
				newEmail: emailForm.value.newEmail,
				password: emailForm.value.password
			}
		})
		showToast(t('account.email_update_success'), 'success')
		showEmailModal.value = false
		emailForm.value = { newEmail: '', password: '' }
		// Refresh user data to show the new email
		await fetchUser()
	} catch (e: any) {
		showToast(e?.data?.message || t('account.email_update_error'), 'error')
	} finally {
		emailLoading.value = false
	}
}

// Payment management
const billingPortalLoading = ref(false)

const openBillingPortal = async () => {
	billingPortalLoading.value = true
	try {
		const response = await $api<{ url: string }>('/subscriptions/billing-portal', {
			method: 'POST'
		})
		if (response.url) {
			window.location.href = response.url
		}
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		billingPortalLoading.value = false
	}
}

// Logout all devices
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
	} finally {
		logoutAllLoading.value = false
	}
}

// Export data (RGPD)
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
	} finally {
		exportLoading.value = false
	}
}

// Delete account
const deleteLoading = ref(false)
const deleteConfirmText = ref('')

const deleteAccount = async () => {
	if (deleteConfirmText.value !== t('account.delete_confirm_text_message')) {
		showToast(t('account.delete_confirm_text'), 'error')
		return
	}

	deleteLoading.value = true
	try {
		await $api('/auth/delete-account', {
			method: 'DELETE'
		})
		showToast(t('common.success'), 'success')
		await signOut()
	} catch (e: any) {
		showToast(e?.data?.message || t('common.error'), 'error')
	} finally {
		deleteLoading.value = false
	}
}

onMounted(() => {
	if (user.value) {
		form.value.email = user.value.email || ''
		profileForm.value.firstName = user.value.firstName || ''
		profileForm.value.lastName = user.value.lastName || ''
		profileForm.value.phone = user.value.phone || ''
	}
})

// Watch for user changes to update form
watch(user, (newUser) => {
	if (newUser) {
		profileForm.value.firstName = newUser.firstName || ''
		profileForm.value.lastName = newUser.lastName || ''
		profileForm.value.phone = newUser.phone || ''
	}
}, { immediate: true })
</script>

<template>
	<div class="space-y-8 max-w-3xl">
		<!-- Header -->
		<div>
			<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('account.title') }}</h1>
			<p class="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{{ $t('account.subtitle') }}
			</p>
		</div>

		<!-- Profile Section -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-6 border-b border-slate-100 dark:border-slate-700">
				<h2 class="font-bold text-slate-900 dark:text-white">{{ $t('account.profile_section') }}</h2>
				<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ $t('account.profile_subtitle') }}</p>
			</div>
			<form @submit.prevent="updateProfile" class="p-6 space-y-6">
				<!-- Display Name -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label
							class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.firstname') }}</label>
						<input v-model="profileForm.firstName" type="text" :placeholder="$t('account.firstname_placeholder')"
							class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors" />
					</div>
					<div>
						<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.lastname') }}</label>
						<input v-model="profileForm.lastName" type="text" :placeholder="$t('account.lastname_placeholder')"
							class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors" />
					</div>
				</div>

				<!-- Phone -->
				<div>
					<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.phone') }}</label>
					<input v-model="profileForm.phone" type="tel" :placeholder="$t('account.phone_placeholder')"
						class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors" />
				</div>

				<!-- Save Button -->
				<div class="flex justify-end">
					<button type="submit" :disabled="profileLoading"
						class="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-2">
						<Icon v-if="profileLoading" name="svg-spinners:ring-resize" size="16" />
						<span>{{ profileLoading ? $t('profile.saving') : $t('account.save_button') }}</span>
					</button>
				</div>
			</form>
		</div>

		<!-- Account Info Section -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-6 border-b border-slate-100 dark:border-slate-700">
				<h2 class="font-bold text-slate-900 dark:text-white">{{ $t('account.account_info_section') }}</h2>
				<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ $t('account.account_info_subtitle') }}</p>
			</div>
			<div class="p-6 space-y-6">
				<!-- Username -->
				<div>
					<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.username') }}</label>
					<div class="flex items-center gap-3">
						<div
							class="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-mono">
							{{ user?.username || '—' }}
						</div>
					</div>
					<p class="text-xs text-slate-400 mt-1.5">{{ $t('account.username_hint') }}</p>
				</div>

				<!-- Email -->
				<div>
					<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.email') }}</label>
					<div class="flex items-center gap-3">
						<div
							class="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm">
							{{ user?.email }}
						</div>
						<button @click="showEmailModal = true"
							class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
							{{ $t('account.email_change_button') }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Security Section -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-6 border-b border-slate-100 dark:border-slate-700">
				<h2 class="font-bold text-slate-900 dark:text-white">{{ $t('account.security_section') }}</h2>
				<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ $t('account.security_subtitle') }}</p>
			</div>
			<div class="p-6 space-y-4">
				<!-- Change Password -->
				<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
					<div class="flex items-center gap-4">
						<div
							class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300">
							<Icon name="ph:lock-key-fill" size="20" />
						</div>
						<div>
							<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.password') }}</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.password_change') }}</p>
						</div>
					</div>
					<button @click="showPasswordModal = true"
						class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
						{{ $t('account.password_button') }}
					</button>
				</div>

				<!-- Two-Factor Auth (placeholder) -->
				<div
					class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl opacity-60">
					<div class="flex items-center gap-4">
						<div
							class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300">
							<Icon name="ph:shield-check-fill" size="20" />
						</div>
						<div>
							<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.two_factor') }}
							</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.two_factor_coming') }}</p>
						</div>
					</div>
					<span
						class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-full">
						{{ $t('account.two_factor_coming') }}
					</span>
				</div>

				<!-- Logout All Devices -->
				<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
					<div class="flex items-center gap-4">
						<div
							class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
							<Icon name="ph:devices-fill" size="20" />
						</div>
						<div>
							<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.logout_all') }}</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.logout_all_description') }}</p>
						</div>
					</div>
					<button @click="logoutAllDevices" :disabled="logoutAllLoading"
						class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2">
						<Icon v-if="logoutAllLoading" name="svg-spinners:ring-resize" size="14" />
						<span>{{ $t('account.logout_button') }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Payment Section -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-6 border-b border-slate-100 dark:border-slate-700">
				<h2 class="font-bold text-slate-900 dark:text-white">{{ $t('account.payment_section') }}</h2>
				<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ $t('account.payment_subtitle') }}</p>
			</div>
			<div class="p-6 space-y-4">
				<!-- Payment Methods -->
				<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
					<div class="flex items-center gap-4">
						<div
							class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
							<Icon name="ph:credit-card-fill" size="20" />
						</div>
						<div>
							<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.payment_methods') }}</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.payment_methods_description') }}
							</p>
						</div>
					</div>
					<button @click="openBillingPortal" :disabled="billingPortalLoading"
						class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2">
						<Icon v-if="billingPortalLoading" name="svg-spinners:ring-resize" size="14" />
						<span>{{ $t('account.payment_manage_button') }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Quick Links Section -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-6 border-b border-slate-100 dark:border-slate-700">
				<h2 class="font-bold text-slate-900 dark:text-white">{{ $t('account.shortcuts_section') }}</h2>
				<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ $t('account.shortcuts_subtitle') }}
				</p>
			</div>
			<div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
				<NuxtLink to="/dashboard/profile"
					class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
					<div
						class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
						<Icon name="ph:storefront-fill" size="20" />
					</div>
					<div>
						<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.my_business') }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.my_business_description') }}</p>
					</div>
				</NuxtLink>

				<NuxtLink to="/dashboard/subscription"
					class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
					<div
						class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
						<Icon name="ph:crown-fill" size="20" />
					</div>
					<div>
						<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.my_subscription') }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.my_subscription_description') }}</p>
					</div>
				</NuxtLink>

				<NuxtLink to="/dashboard/subscription/invoices"
					class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
					<div
						class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
						<Icon name="ph:receipt-fill" size="20" />
					</div>
					<div>
						<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.my_invoices') }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.my_invoices_description') }}</p>
					</div>
				</NuxtLink>

				<a href="mailto:support@scanupgo.com"
					class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
					<div
						class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
						<Icon name="ph:lifebuoy-fill" size="20" />
					</div>
					<div>
						<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.support') }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.support_description') }}</p>
					</div>
				</a>
			</div>
		</div>

		<!-- Data & Privacy (RGPD) -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-6 border-b border-slate-100 dark:border-slate-700">
				<h2 class="font-bold text-slate-900 dark:text-white">{{ $t('account.data_privacy_section') }}</h2>
				<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ $t('account.data_privacy_subtitle') }}</p>
			</div>
			<div class="p-6 space-y-4">
				<!-- Export Data -->
				<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
					<div class="flex items-center gap-4">
						<div
							class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
							<Icon name="ph:download-simple-fill" size="20" />
						</div>
						<div>
							<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.export_data') }}</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('account.export_data_description') }}</p>
						</div>
					</div>
					<button @click="exportData" :disabled="exportLoading"
						class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2">
						<Icon v-if="exportLoading" name="svg-spinners:ring-resize" size="14" />
						<span>{{ exportLoading ? 'Export...' : $t('account.export_button') }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Danger Zone -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30 shadow-sm overflow-hidden">
			<div class="p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
				<p class="text-sm text-red-600/70 dark:text-red-400/70 mt-1">{{ $t('account.delete_account_description') }}</p>
			</div>
			<div class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('account.delete_account') }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ $t('account.delete_account_description') }}</p>
					</div>
					<button @click="showDeleteModal = true"
						class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors">
						{{ $t('account.delete_button') }}
					</button>
				</div>
			</div>
		</div>

		<!-- Password Change Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showPasswordModal = false"></div>
					<div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
						<button @click="showPasswordModal = false"
							class="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
							<Icon name="ph:x-bold" size="20" />
						</button>

						<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">{{ $t('account.password_modal_title') }}</h3>

						<form @submit.prevent="changePassword" class="space-y-4">
							<div>
								<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.password_current') }}</label>
								<input v-model="passwordForm.currentPassword" type="password" required
									class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
							</div>
							<div>
								<label
									class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.password_new') }}</label>
								<input v-model="passwordForm.newPassword" type="password" required minlength="8"
									class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
							</div>
							<div>
								<label
									class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.password_confirm') }}</label>
								<input v-model="passwordForm.confirmPassword" type="password" required minlength="8"
									class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
							</div>

							<div class="flex gap-3 pt-4">
								<button type="button" @click="showPasswordModal = false"
									class="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
									{{ $t('account.cancel') }}
								</button>
								<button type="submit" :disabled="passwordLoading"
									class="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
									<span v-if="passwordLoading">{{ $t('common.loading') }}</span>
									<span v-else>{{ $t('account.modify') }}</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- Email Change Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showEmailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showEmailModal = false"></div>
					<div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
						<button @click="showEmailModal = false"
							class="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
							<Icon name="ph:x-bold" size="20" />
						</button>

						<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">{{ $t('account.email_modal_title') }}</h3>

						<form @submit.prevent="changeEmail" class="space-y-4">
							<div>
								<label
									class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.email_current') }}</label>
								<div
									class="px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 text-sm">
									{{ user?.email }}
								</div>
							</div>
							<div>
								<label
									class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.email_new') }}</label>
								<input v-model="emailForm.newEmail" type="email" required
									class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
							</div>
							<div>
								<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ $t('account.email_password') }}</label>
								<input v-model="emailForm.password" type="password" required
									class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" />
							</div>

							<div class="flex gap-3 pt-4">
								<button type="button" @click="showEmailModal = false"
									class="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
									{{ $t('account.cancel') }}
								</button>
								<button type="submit" :disabled="emailLoading"
									class="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
									<span v-if="emailLoading">{{ $t('common.loading') }}</span>
									<span v-else>{{ $t('account.modify') }}</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- Delete Account Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="showDeleteModal = false" />
					<div class="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800">

						<div class="p-8">
							<!-- Close button -->
							<button @click="showDeleteModal = false"
								class="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
								<Icon name="ph:x-bold" size="16" />
							</button>

							<!-- Icon -->
							<div class="flex flex-col items-center text-center mb-6">
								<div class="relative mb-5">
									<div class="w-16 h-16 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center">
										<Icon name="ph:trash-simple-bold" size="30" class="text-red-600 dark:text-red-500" />
									</div>
								</div>
								<h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
									{{ $t('account.delete_confirmation_title') }}
								</h3>
								<p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
									{{ $t('account.delete_confirmation_message') }}
								</p>
							</div>

							<!-- What will be deleted -->
							<div class="bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 mb-6 space-y-2">
								<p class="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-3">{{ $t('account.delete_loses') }}</p>
								<div v-for="item in ['delete_lose_games', 'delete_lose_players', 'delete_lose_orders', 'delete_lose_data']" :key="item"
									class="flex items-center gap-2.5">
									<div class="w-4 h-4 rounded-full bg-red-200 dark:bg-red-900 flex items-center justify-center shrink-0">
										<Icon name="ph:x-bold" size="8" class="text-red-600 dark:text-red-400" />
									</div>
									<span class="text-xs text-red-700 dark:text-red-300">{{ $t(`account.${item}`) }}</span>
								</div>
							</div>

							<!-- Confirm input -->
							<div class="mb-5">
								<label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
									{{ $t('account.delete_confirm_text') }}
								</label>
								<input
									v-model="deleteConfirmText"
									type="text"
									:placeholder="$t('account.delete_confirm_text_message')"
									class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 rounded-xl text-slate-900 dark:text-white outline-none tracking-widest font-mono text-sm transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
									:class="deleteConfirmText === $t('account.delete_confirm_text_message')
										? 'border-red-500 focus:border-red-500 bg-red-50 dark:bg-red-950/20'
										: 'border-slate-200 dark:border-slate-700 focus:border-slate-400'"
								/>
							</div>

							<!-- Actions -->
							<div class="flex gap-3">
								<button
									@click="showDeleteModal = false"
									class="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
									{{ $t('account.cancel') }}
								</button>
								<button
									@click="deleteAccount"
									:disabled="deleteLoading || deleteConfirmText !== $t('account.delete_confirm_text_message')"
									class="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-red-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2">
									<Icon v-if="deleteLoading" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
									<Icon v-else name="ph:trash-simple-bold" size="16" />
									{{ deleteLoading ? $t('common.loading') : $t('account.delete_permanent') }}
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

.modal-enter-from>div:last-child,
.modal-leave-to>div:last-child {
	transform: scale(0.95);
}
</style>
