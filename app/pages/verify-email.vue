<script setup lang="ts">
definePageMeta({
	layout: 'auth'
})

const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
	const token = route.query.token as string

	if (!token) {
		status.value = 'error'
		message.value = t('auth.verify_email.error_missing_token')
		return
	}

	try {
		const config = useRuntimeConfig()
		const apiUrl = config.public.apiUrl || 'http://localhost:4000'
		const response = await fetch(`${apiUrl}/auth/verify-email?token=${token}`)
		const data = await response.json()

		if (response.ok) {
			status.value = 'success'
			message.value = data.message || t('auth.verify_email.success_message_fallback')

			// If user is already logged in, update their state and redirect to dashboard
			if (authStore.user) {
				authStore.user = { ...authStore.user, emailVerified: true }
				authStore._saveState()
				setTimeout(() => {
					navigateTo('/dashboard')
				}, 2000)
			}
		} else {
			status.value = 'error'
			message.value = data.message || t('auth.verify_email.error_message_fallback')
		}
	} catch {
		status.value = 'error'
		message.value = t('auth.verify_email.error_generic_fetch')
	}
})
</script>

<template>
	<div class="w-full max-w-sm">
		<div class="text-center">
			<!-- Loading -->
			<template v-if="status === 'loading'">
				<div class="py-8">
					<Icon name="ph:spinner-gap-bold" size="40" class="text-brand-500 animate-spin mx-auto mb-6" />
					<h3 class="font-display text-xl font-semibold text-slate-900 mb-2">{{ $t('auth.verify_email.loading_message') }}</h3>
					<p class="text-slate-500 text-sm">{{ $t('auth.verify_email.loading_instruction') }}</p>
				</div>
			</template>

			<!-- Success -->
			<template v-else-if="status === 'success'">
				<div class="py-4">
					<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<Icon name="ph:check-circle-bold" size="36" class="text-emerald-600" />
					</div>
					<h3 class="font-display text-2xl font-semibold text-slate-900 mb-3 tracking-tight">{{ $t('auth.verify_email.success_heading') }}</h3>
					<p class="text-slate-500 text-sm mb-8">{{ message }}</p>

					<template v-if="authStore.user">
						<p class="text-sm text-slate-400 mb-4">{{ $t('auth.verify_email.success_redirect') }}</p>
					</template>
					<template v-else>
						<NuxtLink to="/login"
							class="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors text-sm">
							{{ $t('auth.verify_email.success_login_button') }}
						</NuxtLink>
					</template>
				</div>
			</template>

			<!-- Error -->
			<template v-else>
				<div class="py-4">
					<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<Icon name="ph:x-circle-bold" size="36" class="text-red-600" />
					</div>
					<h3 class="font-display text-2xl font-semibold text-slate-900 mb-3 tracking-tight">{{ $t('auth.verify_email.error_heading') }}</h3>
					<p class="text-slate-500 text-sm mb-8">{{ message }}</p>

					<div class="space-y-3">
						<NuxtLink to="/login"
							class="block w-full px-6 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors text-sm text-center">
							{{ $t('auth.verify_email.error_login_button') }}
						</NuxtLink>
						<NuxtLink to="/register"
							class="block w-full px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm text-center">
							{{ $t('auth.verify_email.error_register_button') }}
						</NuxtLink>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>
