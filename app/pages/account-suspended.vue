<script setup lang="ts">
definePageMeta({
	layout: 'auth'
})

const { $api } = useNuxtApp()
const authStore = useAuthStore()

onMounted(async () => {
	try {
		const response = await $api<{ authenticated: boolean; user: any }>('/auth/status')
		if (response.authenticated && response.user?.status !== 'suspended') {
			authStore.user = response.user
			authStore._saveState()
			await navigateTo('/dashboard')
		}
	} catch {}
})
</script>

<template>
	<div class="w-full max-w-sm">
		<div class="text-center">
			<div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon name="ph:prohibit-bold" size="40" class="text-red-500" />
			</div>

			<h3 class="font-display text-2xl font-semibold text-slate-900 mb-3 tracking-tight">
				{{ $t('auth.account_suspended.heading') }}
			</h3>

			<p class="text-slate-500 text-sm mb-2">
				{{ $t('auth.account_suspended.message') }}
			</p>

			<p class="text-slate-400 text-xs mb-8">
				{{ $t('auth.account_suspended.details') }}
			</p>

			<div class="space-y-3">
				<a href="mailto:support@scanupgo.com"
					class="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-all flex items-center justify-center gap-2">
					<Icon name="ph:envelope-simple-bold" size="16" />
					{{ $t('auth.account_suspended.support_button') }}
				</a>

				<button @click="authStore.signOut()"
					class="w-full py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
					{{ $t('auth.account_suspended.logout_button') }}
				</button>
			</div>
		</div>
	</div>
</template>
