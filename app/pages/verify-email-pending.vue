<script setup lang="ts">
definePageMeta({
	layout: 'auth'
})
useHead({ title: 'Vérification de l\'email' })

const { t } = useI18n()
const { $api } = useNuxtApp()
const authStore = useAuthStore()

const resending = ref(false)
const resent = ref(false)
const error = ref('')

const userEmail = computed(() => authStore.user?.email || '')

const resendEmail = async () => {
	resending.value = true
	error.value = ''
	resent.value = false
	try {
		await $api('/auth/resend-verification', {
			method: 'POST',
			body: { email: userEmail.value },
		})
		resent.value = true
	} catch (e: any) {
		error.value = e?.response?._data?.message || e?.data?.message || t('auth.verify_email_pending.error_resend')
	} finally {
		resending.value = false
	}
}

const checkVerification = async () => {
	try {
		const response = await $api<{ authenticated: boolean; user: any }>('/auth/status')
		if (response.authenticated && response.user?.emailVerified) {
			authStore.user = response.user
			authStore._saveState()
			await navigateTo('/dashboard')
		} else {
			error.value = t('auth.verify_email_pending.error_not_verified')
		}
	} catch {
		error.value = t('auth.verify_email_pending.error_status_check')
	}
}
</script>

<template>
	<div class="w-full max-w-sm">
		<div class="text-center">
			<div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon name="ph:envelope-simple-bold" size="40" class="text-amber-500" />
			</div>

			<h3 class="font-display text-2xl font-semibold text-slate-900 mb-3 tracking-tight">
				{{ $t('auth.verify_email_pending.heading') }}
			</h3>

			<p class="text-slate-500 text-sm mb-2">
				{{ $t('auth.verify_email_pending.message_prefix') }}
			</p>
			<p class="font-medium text-slate-800 mb-6">
				{{ userEmail }}
			</p>

			<p class="text-slate-400 text-xs mb-8">
				{{ $t('auth.verify_email_pending.message_suffix') }}
			</p>

			<!-- Success resent -->
			<div v-if="resent"
				class="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2 border border-emerald-100 mb-4">
				<Icon name="ph:check-circle-fill" size="16" class="flex-shrink-0" />
				{{ $t('auth.verify_email_pending.success_notification') }}
			</div>

			<!-- Error -->
			<div v-if="error"
				class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 mb-4">
				<Icon name="ph:warning-circle-fill" size="16" class="flex-shrink-0" />
				{{ error }}
			</div>

			<div class="space-y-3">
				<!-- Check verification button -->
				<button @click="checkVerification"
					class="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-all">
					{{ $t('auth.verify_email_pending.check_button') }}
				</button>

				<!-- Resend button -->
				<button @click="resendEmail" :disabled="resending"
					class="w-full py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50">
					<span v-if="resending" class="flex items-center justify-center gap-2">
						<Icon name="ph:spinner-gap" class="animate-spin" size="16" />
						{{ $t('auth.verify_email_pending.resend_loading') }}
					</span>
					<span v-else>{{ $t('auth.verify_email_pending.resend_button') }}</span>
				</button>

				<!-- Logout -->
				<button @click="authStore.signOut()"
					class="w-full py-2.5 px-4 text-sm text-slate-400 hover:text-slate-600 transition-colors">
					{{ $t('auth.verify_email_pending.logout_button') }}
				</button>
			</div>
		</div>
	</div>
</template>
