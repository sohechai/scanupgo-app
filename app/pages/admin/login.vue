<script setup lang="ts">
definePageMeta({
	layout: false,
	middleware: []
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const router = useRouter()

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
		console.log('🔐 Tentative de connexion admin...')
		const response = await $api<{ message: string; user: any }>('/auth/login', {
			method: 'POST',
			body: {
				email: email.value,
				password: password.value
			}
		})

		console.log('✅ Connexion réussie, rôle:', response.user.role)

		// Vérifier que l'utilisateur est bien un SUPER_ADMIN
		if (response.user.role !== 'SUPER_ADMIN') {
			console.warn('❌ Utilisateur non autorisé, rôle:', response.user.role)
			error.value = t('admin.login.unauthorized')
			// Déconnecter immédiatement
			await $api('/auth/logout', { method: 'POST' })
			loading.value = false
			return
		}

		console.log('✅ Utilisateur SUPER_ADMIN vérifié, vérification de la session...')

		// Vérifier que la session est bien établie avant de rediriger
		await new Promise(resolve => setTimeout(resolve, 100))

		// Vérifier une dernière fois le statut
		const statusCheck = await $api<{ authenticated: boolean; user: any }>('/auth/status')
		console.log('✅ Session vérifiée:', statusCheck.authenticated, 'rôle:', statusCheck.user?.role)

		if (!statusCheck.authenticated || statusCheck.user?.role !== 'SUPER_ADMIN') {
			error.value = t('admin.login.session_error')
			return
		}

		console.log('✅ Redirection vers /admin...')
		// Rediriger vers le dashboard admin
		await router.push('/admin')
	} catch (e: any) {
		console.error('❌ Login failed:', e)
		error.value = e?.data?.message || t('admin.login.incorrect_credentials')
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
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
				<div class="inline-flex items-center gap-3 mb-3">
					<div class="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20">
						<span class="text-white font-bold text-xl">B.</span>
					</div>
					<h1 class="text-2xl font-bold text-white">ScanUpGo</h1>
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

				<form @submit.prevent="handleLogin" class="space-y-5">
					<!-- Email -->
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

					<!-- Password -->
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

				<!-- Footer -->
				<div class="mt-6 pt-6 border-t border-white/5 text-center">
					<NuxtLink to="/login" class="text-sm text-slate-400 hover:text-white transition-colors">
						{{ $t('admin.login.back_to_merchant') }}
					</NuxtLink>
				</div>
			</div>

			<!-- Bottom Text -->
			<p class="text-center text-xs text-slate-500 mt-6">
				{{ $t('admin.login.super_admin_only') }}
			</p>
		</div>
	</div>
</template>
