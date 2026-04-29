<script setup lang="ts">
definePageMeta({
	layout: false,
	middleware: []
})

useHead({ title: 'Connexion Admin' })

// On admin subdomain, this route doesn't exist — canonical login is /login
// On localhost (dev), keep this page functional
if (import.meta.client) {
	const host = window.location.hostname
	const isAdminSubdomain = host.startsWith('admin.')
	if (isAdminSubdomain) {
		throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
	}
}

const { t } = useI18n()
const { $api } = useNuxtApp()
const router = useRouter()
const config = useRuntimeConfig()

const loginWithGoogle = () => {
	const apiBase = config.public.apiUrl || 'http://localhost:4000'
	window.location.href = `${apiBase}/auth/google/admin`
}

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const handleLogin = async () => {
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

		await new Promise(resolve => setTimeout(resolve, 100))

		const statusCheck = await $api<{ authenticated: boolean; user: any }>('/auth/status')

		if (!statusCheck.authenticated || statusCheck.user?.role !== 'SUPER_ADMIN') {
			error.value = t('admin.login.session_error')
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
	<div class="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
		<div class="absolute inset-0 bg-gradient-to-br from-black via-slate-950 to-black"></div>
		<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
		<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[128px]"></div>
		<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]"></div>

		<div class="relative w-full max-w-md">
			<div class="text-center mb-8">
				<div class="inline-flex items-center mb-3">
					<img src="/images/scanupgo-logo-transparent-sombre.png" alt="ScanUpGo" class="h-11" />
				</div>
				<p class="text-sm text-slate-400">{{ $t('admin.administration') }}</p>
			</div>

			<div class="bg-slate-950/50 border border-white/10 rounded-2xl p-8 shadow-2xl">
				<h2 class="text-xl font-bold text-white mb-6">{{ $t('admin.login.title') }}</h2>

				<div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
					<p class="text-sm text-red-400">{{ error }}</p>
				</div>

				<form @submit.prevent="handleLogin" class="space-y-5">
					<div>
						<label for="email" class="block text-sm font-medium text-slate-300 mb-2">
							{{ $t('admin.login.email_label') }}
						</label>
						<input
							id="email"
							v-model="email"
							type="email"
							required
							:disabled="loading"
							class="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-50"
							:placeholder="$t('admin.login.email_placeholder')"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-slate-300 mb-2">
							{{ $t('admin.login.password_label') }}
						</label>
						<div class="relative">
							<input
								id="password"
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

				<div class="mt-4 relative flex items-center gap-3">
					<div class="flex-1 h-px bg-white/10"></div>
					<span class="text-xs text-slate-600">ou</span>
					<div class="flex-1 h-px bg-white/10"></div>
				</div>

				<button
					@click="loginWithGoogle"
					type="button"
					class="mt-4 w-full py-3 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all"
				>
					<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
						<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
						<path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
						<path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
						<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
					</svg>
					Continuer avec Google
				</button>
			</div>

			<p class="text-center text-xs text-slate-500 mt-6">
				{{ $t('admin.login.super_admin_only') }}
			</p>
		</div>
	</div>
</template>
