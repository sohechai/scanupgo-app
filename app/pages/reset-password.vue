<script setup lang="ts">
definePageMeta({
	layout: 'auth'
})
useHead({ title: 'Réinitialisation du mot de passe' })

const { t } = useI18n()
const { $api } = useNuxtApp()
const route = useRoute()

const token = computed(() => route.query.token as string || '')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref(false)
const tokenValid = ref(true)
const checking = ref(true)

const passwordValid = computed(() => password.value.length >= 8)
const passwordsMatch = computed(() => password.value === confirmPassword.value)

// Verify token validity on page load
onMounted(async () => {
	if (!token.value) {
		tokenValid.value = false
		checking.value = false
		return
	}
	try {
		await $api('/auth/verify-reset-token', {
			method: 'POST',
			body: { token: token.value },
		})
		tokenValid.value = true
	} catch {
		tokenValid.value = false
	} finally {
		checking.value = false
	}
})

const handleSubmit = async () => {
	if (!passwordValid.value) {
		error.value = t('auth.reset_password.error_password_too_short')
		return
	}
	if (!passwordsMatch.value) {
		error.value = t('auth.reset_password.error_passwords_mismatch')
		return
	}

	loading.value = true
	error.value = ''
	try {
		await $api('/auth/reset-password', {
			method: 'POST',
			body: {
				token: token.value,
				password: password.value,
			},
		})
		success.value = true
	} catch (e: any) {
		const msg = e?.response?._data?.message || e?.data?.message || ''
		if (msg.includes('invalide') || msg.includes('expiré')) {
			tokenValid.value = false
		} else {
			error.value = msg || t('auth.reset_password.error_generic')
		}
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="w-full max-w-sm">
		<!-- Loading / checking token -->
		<template v-if="checking">
			<div class="text-center py-12">
				<Icon name="ph:spinner-gap" size="32" class="animate-spin text-brand-600 mx-auto mb-4" />
				<p class="text-slate-500 text-sm">{{ $t('auth.reset_password.token_checking') }}</p>
			</div>
		</template>

		<!-- Invalid or expired token -->
		<template v-else-if="!tokenValid">
			<div class="text-center">
				<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<Icon name="ph:warning-circle-bold" size="32" class="text-red-600" />
				</div>
				<h3 class="font-display text-2xl font-semibold text-slate-900 mb-3 tracking-tight">{{ $t('auth.reset_password.invalid_token_heading') }}</h3>
				<p class="text-slate-500 text-sm mb-8">
					{{ $t('auth.reset_password.invalid_token_message') }}
				</p>
				<NuxtLink to="/forgot-password"
					class="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors text-sm">
					{{ $t('auth.reset_password.invalid_token_button') }}
				</NuxtLink>
			</div>
		</template>

		<!-- Success -->
		<template v-else-if="success">
			<div class="text-center">
				<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<Icon name="ph:check-circle-bold" size="32" class="text-emerald-600" />
				</div>
				<h3 class="font-display text-2xl font-semibold text-slate-900 mb-3 tracking-tight">{{ $t('auth.reset_password.success_heading') }}</h3>
				<p class="text-slate-500 text-sm mb-8">
					{{ $t('auth.reset_password.success_message') }}
				</p>
				<NuxtLink to="/login"
					class="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors text-sm">
					{{ $t('auth.reset_password.success_button') }}
				</NuxtLink>
			</div>
		</template>

		<!-- Reset form -->
		<template v-else>
			<div class="mb-10">
				<h3 class="font-display text-3xl font-semibold text-slate-900 mb-2 tracking-tight">{{ $t('auth.reset_password.form_heading') }}</h3>
				<p class="text-slate-500 text-sm">{{ $t('auth.reset_password.form_subtitle') }}</p>
			</div>

			<form @submit.prevent="handleSubmit" class="space-y-5">
				<!-- New Password -->
				<div class="space-y-1.5">
					<label for="password" class="block text-sm font-medium text-slate-700">{{ $t('auth.reset_password.password_label') }}</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-slate-400">
							<Icon name="ph:lock-key" size="18" />
						</div>
						<input id="password" v-model="password"
							:type="showPassword ? 'text' : 'password'" required
							class="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all sm:text-sm"
							:placeholder="$t('auth.reset_password.password_placeholder')">
						<button type="button" @click="showPassword = !showPassword"
							class="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
							<Icon v-if="showPassword" name="ph:eye-slash-bold" size="18" />
							<Icon v-else name="ph:eye-bold" size="18" />
						</button>
					</div>
					<div class="flex items-center gap-2 mt-1.5">
						<div class="flex-1 h-1 rounded-full" :class="password.length === 0 ? 'bg-slate-200' : password.length < 8 ? 'bg-red-400' : password.length < 12 ? 'bg-amber-400' : 'bg-emerald-400'"></div>
						<span class="text-xs text-slate-400">
							{{ password.length === 0 ? '' : password.length < 8 ? $t('auth.reset_password.password_strength_weak') : password.length < 12 ? $t('auth.reset_password.password_strength_medium') : $t('auth.reset_password.password_strength_strong') }}
						</span>
					</div>
				</div>

				<!-- Confirm Password -->
				<div class="space-y-1.5">
					<label for="confirmPassword" class="block text-sm font-medium text-slate-700">{{ $t('auth.reset_password.confirm_password_label') }}</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-slate-400">
							<Icon name="ph:lock-key" size="18" />
						</div>
						<input id="confirmPassword" v-model="confirmPassword" type="password" required
							class="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all sm:text-sm"
							:placeholder="$t('auth.reset_password.confirm_password_placeholder')">
						<div v-if="confirmPassword.length > 0" class="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center">
							<Icon v-if="passwordsMatch" name="ph:check-circle-fill" size="18" class="text-emerald-500" />
							<Icon v-else name="ph:x-circle-fill" size="18" class="text-red-400" />
						</div>
					</div>
				</div>

				<div v-if="error"
					class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
					<Icon name="ph:warning-circle-fill" size="16" class="flex-shrink-0" />
					{{ error }}
				</div>

				<button type="submit" :disabled="loading || !passwordValid || !passwordsMatch"
					class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
					<span v-if="loading" class="flex items-center gap-2">
						<Icon name="ph:spinner-gap" class="animate-spin" size="18" />
						{{ $t('auth.reset_password.submit_loading') }}
					</span>
					<span v-else>{{ $t('auth.reset_password.submit_button') }}</span>
				</button>
			</form>

			<div class="mt-8 text-center">
				<NuxtLink to="/login" class="text-sm text-slate-500 hover:text-brand-600 transition-colors">
					{{ $t('auth.reset_password.back_link') }}
				</NuxtLink>
			</div>
		</template>
	</div>
</template>
