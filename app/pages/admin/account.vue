<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const toast = useToast()
const { formatDate } = useLocaleDate()

// Profile data
const profile = ref({
	email: '',
	firstName: '',
	lastName: '',
	role: '',
	createdAt: '',
	updatedAt: ''
})

// Loading states
const loading = ref(true)
const savingProfile = ref(false)
const savingPassword = ref(false)

// Form data
const profileForm = ref({
	firstName: '',
	lastName: '',
	email: ''
})

const passwordForm = ref({
	currentPassword: '',
	newPassword: '',
	confirmPassword: ''
})

// Fetch profile
onMounted(async () => {
	try {
		const data = await $api<typeof profile.value>('/admin/profile')
		profile.value = data
		profileForm.value = {
			firstName: data.firstName || '',
			lastName: data.lastName || '',
			email: data.email
		}
	} catch (error) {
		console.error('Failed to fetch profile:', error)
		toast.show('Erreur lors du chargement du profil', 'error')
	} finally {
		loading.value = false
	}
})

// Update profile
const updateProfile = async () => {
	savingProfile.value = true
	try {
		const response = await $api<any>('/admin/profile', {
			method: 'PUT',
			body: profileForm.value
		})

		profile.value = { ...profile.value, ...response.user }
		toast.show(t('admin.account.profile_updated'), 'success')
	} catch (error: any) {
		console.error('Failed to update profile:', error)
		toast.show(error?.data?.message || t('admin.account.profile_updated'), 'error')
	} finally {
		savingProfile.value = false
	}
}

// Update password
const updatePassword = async () => {
	// Validate passwords match
	if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
		toast.show(t('admin.account.passwords_not_match'), 'error')
		return
	}

	// Validate password length
	if (passwordForm.value.newPassword.length < 8) {
		toast.show(t('admin.account.password_too_short'), 'error')
		return
	}

	savingPassword.value = true
	try {
		await $api('/admin/password', {
			method: 'PUT',
			body: {
				currentPassword: passwordForm.value.currentPassword,
				newPassword: passwordForm.value.newPassword
			}
		})

		// Reset form
		passwordForm.value = {
			currentPassword: '',
			newPassword: '',
			confirmPassword: ''
		}

		toast.show(t('admin.account.password_updated'), 'success')
	} catch (error: any) {
		console.error('Failed to update password:', error)
		toast.show(error?.data?.message || t('admin.account.password_updated'), 'error')
	} finally {
		savingPassword.value = false
	}
}
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen animate-pulse-slow">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen animate-pulse-slow"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div>
				<h1
					class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
					{{ $t('admin.account.title') }}</h1>
				<p class="text-slate-400 text-lg">{{ $t('admin.account.description') }}</p>
			</div>

			<!-- Loading State -->
			<div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="h-96 bg-white/5 rounded-2xl border border-white/10 animate-pulse"></div>
				<div class="h-96 bg-white/5 rounded-2xl border border-white/10 animate-pulse"></div>
			</div>

			<!-- Content -->
			<div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
				<!-- Profile Information -->
				<div
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-xl shadow-black/10">
					<div class="flex items-center gap-4 mb-8">
						<div
							class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
							<Icon name="ph:user-bold" size="24" class="text-white" />
						</div>
						<div>
							<h2 class="text-xl font-bold text-white">{{ $t('admin.account.profile_title') }}</h2>
							<p class="text-sm text-slate-400">{{ $t('admin.account.profile_description') }}</p>
						</div>
					</div>

					<form @submit.prevent="updateProfile" class="space-y-6">
						<!-- First Name -->
						<div class="space-y-2">
							<label for="firstName" class="block text-sm font-bold text-slate-300">
								{{ $t('admin.account.firstname_label') }}
							</label>
							<div class="relative group">
								<input id="firstName" v-model="profileForm.firstName" type="text"
									:disabled="savingProfile"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50 group-hover:bg-white/10 pl-10 rtl:pl-4 rtl:pr-10"
									:placeholder="$t('admin.account.firstname_placeholder')" />
								<Icon name="ph:user" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
							</div>
						</div>

						<!-- Last Name -->
						<div class="space-y-2">
							<label for="lastName" class="block text-sm font-bold text-slate-300">
								{{ $t('admin.account.lastname_label') }}
							</label>
							<div class="relative group">
								<input id="lastName" v-model="profileForm.lastName" type="text"
									:disabled="savingProfile"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50 group-hover:bg-white/10 pl-10 rtl:pl-4 rtl:pr-10"
									:placeholder="$t('admin.account.lastname_placeholder')" />
								<Icon name="ph:user" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
							</div>
						</div>

						<!-- Email -->
						<div class="space-y-2">
							<label for="email" class="block text-sm font-bold text-slate-300">
								{{ $t('admin.account.email_label') }}
							</label>
							<div class="relative group">
								<input id="email" v-model="profileForm.email" type="email" required
									:disabled="savingProfile"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50 group-hover:bg-white/10 pl-10 rtl:pl-4 rtl:pr-10"
									:placeholder="$t('admin.account.email_placeholder')" />
								<Icon name="ph:envelope-simple"
									class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
							</div>
						</div>

						<!-- Role (Read-only) -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">
								{{ $t('admin.account.role_label') }}
							</label>
							<div
								class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 flex items-center gap-2">
								<Icon name="ph:shield-check" class="text-slate-500" />
								{{ profile.role }}
							</div>
						</div>

						<!-- Save Button -->
						<div class="flex justify-end pt-4">
							<button type="submit" :disabled="savingProfile"
								class="px-6 py-3 bg-white hover:bg-slate-100 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5 flex items-center gap-2">
								<Icon v-if="savingProfile" name="ph:spinner-gap-bold" class="animate-spin" size="20" />
								<span v-else>{{ $t('admin.account.save_button') }}</span>
							</button>
						</div>
					</form>
				</div>

				<div class="space-y-8">
					<!-- Change Password -->
					<div
						class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-xl shadow-black/10">
						<div class="flex items-center gap-4 mb-8">
							<div
								class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:lock-key-bold" size="24" class="text-white" />
							</div>
							<div>
								<h2 class="text-xl font-bold text-white">{{ $t('admin.account.security_title') }}</h2>
								<p class="text-sm text-slate-400">{{ $t('admin.account.security_description') }}</p>
							</div>
						</div>

						<form @submit.prevent="updatePassword" class="space-y-6">
							<!-- Current Password -->
							<div class="space-y-2">
								<label for="currentPassword" class="block text-sm font-bold text-slate-300">
									{{ $t('admin.account.current_password_label') }}
								</label>
								<div class="relative group">
									<input id="currentPassword" v-model="passwordForm.currentPassword" type="password"
										required :disabled="savingPassword"
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50 group-hover:bg-white/10 pl-10 rtl:pl-4 rtl:pr-10"
										placeholder="••••••••" />
									<Icon name="ph:lock-simple"
										class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
								</div>
							</div>

							<!-- New Password -->
							<div class="space-y-2">
								<label for="newPassword" class="block text-sm font-bold text-slate-300">
									{{ $t('admin.account.new_password_label') }}
								</label>
								<div class="relative group">
									<input id="newPassword" v-model="passwordForm.newPassword" type="password" required
										:disabled="savingPassword"
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50 group-hover:bg-white/10 pl-10 rtl:pl-4 rtl:pr-10"
										placeholder="••••••••" />
									<Icon name="ph:key"
										class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
								</div>
								<p class="text-xs text-slate-500 flex items-center gap-1">
									<Icon name="ph:info" />
									{{ $t('admin.account.new_password_hint') }}
								</p>
							</div>

							<!-- Confirm Password -->
							<div class="space-y-2">
								<label for="confirmPassword" class="block text-sm font-bold text-slate-300">
									{{ $t('admin.account.confirm_password_label') }}
								</label>
								<div class="relative group">
									<input id="confirmPassword" v-model="passwordForm.confirmPassword" type="password"
										required :disabled="savingPassword"
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50 group-hover:bg-white/10 pl-10 rtl:pl-4 rtl:pr-10"
										placeholder="••••••••" />
									<Icon name="ph:check-circle"
										class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
								</div>
							</div>

							<!-- Save Button -->
							<div class="flex justify-end pt-4">
								<button type="submit" :disabled="savingPassword"
									class="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
									<Icon v-if="savingPassword" name="ph:spinner-gap-bold" class="animate-spin"
										size="20" />
									<span v-else>{{ $t('admin.account.change_password_button') }}</span>
								</button>
							</div>
						</form>
					</div>

					<!-- Account Info -->
					<div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
						<div class="flex items-center gap-3 mb-4">
							<Icon name="ph:info-bold" size="20" class="text-slate-400" />
							<h3 class="font-bold text-white">{{ $t('admin.account.account_details') }}</h3>
						</div>

						<div class="space-y-3">
							<div class="flex items-center justify-between py-3 border-b border-white/5">
								<span class="text-sm text-slate-400">{{ $t('admin.account.created_date') }}</span>
								<span class="text-sm font-medium text-white">{{ formatDate(profile.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
							</div>
							<div class="flex items-center justify-between py-3">
								<span class="text-sm text-slate-400">{{ $t('admin.account.last_modified') }}</span>
								<span class="text-sm font-medium text-white">{{ formatDate(profile.updatedAt, { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
