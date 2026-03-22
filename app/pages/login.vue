<script setup lang="ts">
definePageMeta({
	layout: 'auth'
})
const { t } = useI18n()
const { signIn } = useAuth()
const config = useRuntimeConfig()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)

const route = useRoute()
onMounted(() => {
	if (route.query.error === 'google_not_configured') {
		error.value = t('auth.login.error_google_not_configured')
	}
})

const handleLogin = async () => {
	loading.value = true
	error.value = ''
	try {
		await signIn(email.value, password.value, rememberMe.value)

	} catch (e: any) {
		if (e?.response?.status === 429 || e?.status === 429) {
			error.value = t('auth.login.error_rate_limit')
		} else {
			error.value = t('auth.login.error_invalid_credentials')
		}
	} finally {
		loading.value = false
	}
}

const loginWithGoogle = () => {
	const apiBase = config.public.apiUrl || 'http://localhost:4000'
	window.location.href = `${apiBase}/auth/google`
}
</script>

<template>
	<div class="w-full max-w-sm">
		<div class="mb-10">
			<h3 class="font-display text-3xl font-semibold text-slate-900 mb-2 tracking-tight">{{ $t('auth.login.heading') }}</h3>
			<p class="text-slate-500 text-sm">{{ $t('auth.login.subtitle') }}</p>
		</div>

		<!-- Google Login Button -->
		<button @click="loginWithGoogle" type="button"
			class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 transition-all text-sm font-medium shadow-sm">
			<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
				<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
				<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
				<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
			</svg>
			{{ $t('auth.login.google_button') }}
		</button>

		<!-- Separator -->
		<div class="relative my-6">
			<div class="absolute inset-0 flex items-center">
				<div class="w-full border-t border-slate-200"></div>
			</div>
			<div class="relative flex justify-center text-xs">
				<span class="bg-white px-3 text-slate-400 font-medium uppercase tracking-wide">{{ $t('auth.login.divider') }}</span>
			</div>
		</div>

		<form @submit.prevent="handleLogin" class="space-y-5">
			<!-- Email Input -->
			<div class="space-y-1.5">
				<label for="email" class="block text-sm font-medium text-slate-700">{{ $t('auth.login.email_label') }}</label>
				<div class="relative">
					<div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-slate-400">
						<Icon name="ph:envelope-simple" size="18" />
					</div>
					<input id="email" v-model="email" type="email" required
						class="block w-full pl-10 rtl:pl-3 pr-3 rtl:pr-10 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all sm:text-sm"
						:placeholder="$t('auth.login.email_placeholder')">
				</div>
			</div>

			<!-- Password Input -->
			<div class="space-y-1.5">
				<div class="flex items-center justify-between">
					<label for="password" class="block text-sm font-medium text-slate-700">{{ $t('auth.login.password_label') }}</label>
					<NuxtLink to="/forgot-password" class="text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors">
						{{ $t('auth.login.forgot_password_link') }}
					</NuxtLink>
				</div>
				<div class="relative">
					<div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-slate-400">
						<Icon name="ph:lock-key" size="18" />
					</div>
					<input
						id="password"
						v-model="password"
						:type="showPassword ? 'text' : 'password'"
						required
						class="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all sm:text-sm"
						:placeholder="$t('auth.login.password_placeholder')"
					>
					<button
						type="button"
						@click="showPassword = !showPassword"
						class="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
						:disabled="loading"
					>
						<Icon v-if="showPassword" name="ph:eye-slash-bold" size="18" />
						<Icon v-else name="ph:eye-bold" size="18" />
					</button>
				</div>
			</div>

			<!-- Remember Me -->
			<div class="flex items-center">
				<input id="rememberMe" v-model="rememberMe" type="checkbox"
					class="h-4 w-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer" />
				<label for="rememberMe" class="ml-2 rtl:ml-0 rtl:mr-2 block text-sm text-slate-600 cursor-pointer">{{ $t('auth.login.remember_me_label') }}</label>
			</div>

			<div v-if="error"
				class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
				<Icon name="ph:warning-circle-fill" size="16" class="flex-shrink-0" />
				{{ error }}
			</div>

			<!-- Primary Button -->
			<button type="submit" :disabled="loading"
				class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
				<span v-if="loading" class="flex items-center gap-2">
					<Icon name="ph:spinner-gap" class="animate-spin" size="18" />
					{{ $t('auth.login.submit_loading') }}
				</span>
				<span v-else>{{ $t('auth.login.submit_button') }}</span>
			</button>
		</form>

		<div class="mt-8 text-center">
			<p class="text-sm text-slate-500">
				{{ $t('auth.login.no_account_text') }}
				<NuxtLink to="/register" class="font-medium text-brand-600 hover:text-brand-500 transition-colors">
					{{ $t('auth.login.create_account_link') }}
				</NuxtLink>
			</p>
		</div>
	</div>
</template>
