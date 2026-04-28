<script setup lang="ts">
definePageMeta({
	layout: false,
	middleware: []
})

useHead({ title: 'Connexion' })

const { t } = useI18n()
const { signIn } = useAuth()
const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()

// Detect admin subdomain on both server and client (no flash)
const requestURL = useRequestURL()
const isAdminSubdomain = requestURL.hostname.startsWith('admin.')

// Shared state
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

// Regular login state
const rememberMe = ref(false)

// 2FA step state
const twoFactorStep = ref(false)
const twoFactorEmail = ref('')
const otpCode = ref('')
const otpLoading = ref(false)

onMounted(() => {
	if (route.query.error === 'google_not_configured') {
		error.value = t('auth.login.error_google_not_configured')
	}
})

// Regular user login
const handleLogin = async () => {
	loading.value = true
	error.value = ''
	try {
		const result = await signIn(email.value, password.value, rememberMe.value)
		if (result?.requiresTwoFactor) {
			twoFactorEmail.value = result.email
			twoFactorStep.value = true
		}
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

const handleOtpVerify = async () => {
	if (!otpCode.value || otpCode.value.length !== 6) {
		error.value = t('auth.two_factor.error_invalid_code')
		return
	}
	otpLoading.value = true
	error.value = ''
	try {
		const authStore = useAuthStore()
		const response = await $api<{ message: string; user: any }>('/auth/2fa/verify', {
			method: 'POST',
			body: { email: twoFactorEmail.value, code: otpCode.value }
		})
		authStore.user = response.user
		authStore._saveState?.()

		const business = response.user?.business
		const isProfileComplete = business && business.name && business.addressStreet
		await navigateTo(isProfileComplete ? '/dashboard' : '/dashboard/profile')
	} catch (e: any) {
		if (e?.response?.status === 429 || e?.status === 429) {
			error.value = t('auth.login.error_rate_limit')
		} else {
			error.value = e?.data?.message || t('auth.two_factor.error_invalid_code')
		}
	} finally {
		otpLoading.value = false
	}
}

const backToLogin = () => {
	twoFactorStep.value = false
	otpCode.value = ''
	error.value = ''
}

const loginWithGoogle = () => {
	const apiBase = config.public.apiUrl || 'http://localhost:4000'
	window.location.href = `${apiBase}/auth/google`
}

// Admin login
const handleAdminLogin = async () => {
	if (!email.value || !password.value) {
		error.value = t('admin.login.all_fields_required')
		return
	}

	loading.value = true
	error.value = ''

	try {
		const response = await $api<{ message: string; user: any }>('/auth/login', {
			method: 'POST',
			body: {
				email: email.value,
				password: password.value
			}
		})

		if (response.user.role !== 'SUPER_ADMIN') {
			error.value = t('admin.login.unauthorized')
			await $api('/auth/logout', { method: 'POST' })
			loading.value = false
			return
		}

		await router.push('/admin')
	} catch (e: any) {
		error.value = e?.data?.message || t('admin.login.incorrect_credentials')
	} finally {
		loading.value = false
	}
}
</script>

<template>
<div>
	<!-- Admin Login (admin subdomain) -->
	<div v-if="isAdminSubdomain" class="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
		<!-- Gradient Background -->
		<div class="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-black"></div>

		<!-- Grid Pattern -->
		<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>

		<!-- Glow Effects -->
		<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[128px]"></div>
		<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]"></div>

		<!-- Login Card -->
		<div class="relative w-full max-w-md">
			<!-- Logo -->
			<div class="text-center mb-8">
				<div class="inline-flex items-center mb-3">
					<img src="/images/scanupgo-logo-transparent-sombre.png" alt="ScanUpGo" class="h-11" />
				</div>
				<p class="text-sm text-slate-400">{{ $t('admin.administration') }}</p>
			</div>

			<!-- Card -->
			<div class="bg-slate-950/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
				<h2 class="text-xl font-bold text-white mb-6">{{ $t('admin.login.title') }}</h2>

				<!-- Error Message -->
				<div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
					<p class="text-sm text-red-400">{{ error }}</p>
				</div>

				<form @submit.prevent="handleAdminLogin" class="space-y-5">
					<!-- Email -->
					<div>
						<label for="admin-email" class="block text-sm font-medium text-slate-300 mb-2">
							{{ $t('admin.login.email_label') }}
						</label>
						<input
							id="admin-email"
							v-model="email"
							type="email"
							required
							:disabled="loading"
							class="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-50"
							:placeholder="$t('admin.login.email_placeholder')"
						/>
					</div>

					<!-- Password -->
					<div>
						<label for="admin-password" class="block text-sm font-medium text-slate-300 mb-2">
							{{ $t('admin.login.password_label') }}
						</label>
						<div class="relative">
							<input
								id="admin-password"
								v-model="password"
								:type="showPassword ? 'text' : 'password'"
								required
								:disabled="loading"
								class="w-full px-4 py-3 pr-12 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-50"
								:placeholder="$t('admin.login.password_placeholder')"
							/>
							<button
								type="button"
								@click="showPassword = !showPassword"
								class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
								:disabled="loading"
							>
								<Icon v-if="showPassword" name="ph:eye-slash-bold" size="20" />
								<Icon v-else name="ph:eye-bold" size="20" />
							</button>
						</div>
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						:disabled="loading"
						class="w-full py-3 bg-white hover:bg-slate-100 text-black font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5"
					>
						<span v-if="loading" class="flex items-center justify-center gap-2">
							<Icon name="ph:spinner-gap-bold" class="animate-spin" size="20" />
							{{ $t('admin.login.logging_in') }}
						</span>
						<span v-else>{{ $t('admin.login.login_button') }}</span>
					</button>
				</form>
			</div>

			<!-- Bottom Text -->
			<p class="text-center text-xs text-slate-500 mt-6">
				{{ $t('admin.login.super_admin_only') }}
			</p>
		</div>
	</div>

	<!-- Regular User Login (app subdomain / localhost) -->
	<div v-else class="min-h-screen flex font-sans bg-white text-slate-900">
		<!-- Left Side: Brand Experience -->
		<div class="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
			<div class="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-slate-900 pointer-events-none"></div>
			<div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E')"></div>

			<div class="relative z-10">
				<img src="/images/logo-dark.svg" alt="ScanUpGo" class="h-9" />
			</div>

			<div class="relative z-10 max-w-lg">
				<h2 class="text-3xl font-display font-semibold text-white mb-6 tracking-tight">
					{{ $t('auth.hero_title_1') }} <br/>
					{{ $t('auth.hero_title_2') }} <span class="text-brand-400">{{ $t('auth.hero_title_highlight') }}</span>.
				</h2>
				<p class="text-slate-400 text-lg leading-relaxed mb-8">
					{{ $t('auth.hero_description') }}
				</p>

				<div class="flex items-center gap-4 pt-8 border-t border-white/10">
					<div class="flex -space-x-2 rtl:space-x-reverse">
						<div class="w-8 h-8 rounded-full bg-slate-700 border border-slate-900"></div>
						<div class="w-8 h-8 rounded-full bg-slate-600 border border-slate-900"></div>
						<div class="w-8 h-8 rounded-full bg-slate-500 border border-slate-900"></div>
					</div>
					<div class="text-sm text-slate-400">
						{{ $t('auth.trust_badge') }} <span class="text-white font-medium">{{ $t('auth.trust_count') }}</span>
					</div>
				</div>
			</div>

			<div class="absolute bottom-0 right-0 rtl:right-auto rtl:left-0 w-96 h-96 bg-brand-600/20 rounded-full blur-[128px] pointer-events-none"></div>
		</div>

		<!-- Right Side: Form Container -->
		<div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white relative">
			<div class="absolute top-6 right-6 rtl:right-auto rtl:left-6">
				<LanguageSelector />
			</div>

			<div class="w-full max-w-sm">

				<!-- OTP Step -->
				<div v-if="twoFactorStep">
					<div class="mb-10">
						<div class="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
							<Icon name="ph:shield-check-bold" size="24" class="text-brand-600" />
						</div>
						<h3 class="font-display text-3xl font-semibold text-slate-900 mb-2 tracking-tight">{{ $t('auth.two_factor.heading') }}</h3>
						<p class="text-slate-500 text-sm">{{ $t('auth.two_factor.subtitle') }}</p>
					</div>

					<form @submit.prevent="handleOtpVerify" class="space-y-5">
						<div class="space-y-1.5">
							<label for="otp" class="block text-sm font-medium text-slate-700">{{ $t('auth.two_factor.code_label') }}</label>
							<input
								id="otp"
								v-model="otpCode"
								type="text"
								inputmode="numeric"
								maxlength="6"
								autocomplete="one-time-code"
								required
								autofocus
								class="block w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-center text-2xl font-mono tracking-[0.5em]"
								:placeholder="$t('auth.two_factor.code_placeholder')"
							/>
						</div>

						<div v-if="error" class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
							<Icon name="ph:warning-circle-fill" size="16" class="flex-shrink-0" />
							{{ error }}
						</div>

						<button type="submit" :disabled="otpLoading || otpCode.length !== 6"
							class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
							<span v-if="otpLoading" class="flex items-center gap-2">
								<Icon name="ph:spinner-gap" class="animate-spin" size="18" />
								{{ $t('auth.login.submit_loading') }}
							</span>
							<span v-else>{{ $t('auth.two_factor.verify_button') }}</span>
						</button>
					</form>

					<div class="mt-6 text-center">
						<button @click="backToLogin" class="text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors">
							← {{ $t('auth.two_factor.back_to_login') }}
						</button>
					</div>
				</div>

				<!-- Login Step -->
				<div v-else>
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

			</div>
		</div>
	</div>
</div>
</template>
