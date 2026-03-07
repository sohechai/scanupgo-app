<script setup lang="ts">
definePageMeta({
	layout: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

const handleSubmit = async () => {
	loading.value = true
	error.value = ''
	try {
		await $api('/auth/forgot-password', {
			method: 'POST',
			body: { email: email.value },
		})
		sent.value = true
	} catch (e: any) {
		if (e?.response?.status === 429 || e?.status === 429) {
			error.value = t('auth.forgot_password.error_rate_limit')
		} else {
			error.value = e?.response?._data?.message || e?.data?.message || t('auth.forgot_password.error_generic')
		}
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="w-full max-w-sm">
		<!-- Before sending -->
		<template v-if="!sent">
			<div class="mb-10">
				<NuxtLink to="/login" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6">
					<Icon name="ph:arrow-left-bold" size="16" class="rtl:rotate-180" />
					{{ $t('auth.forgot_password.back_link') }}
				</NuxtLink>
				<h3 class="font-display text-3xl font-semibold text-slate-900 mb-2 tracking-tight">{{ $t('auth.forgot_password.heading') }}</h3>
				<p class="text-slate-500 text-sm">{{ $t('auth.forgot_password.subtitle') }}</p>
			</div>

			<form @submit.prevent="handleSubmit" class="space-y-5">
				<div class="space-y-1.5">
					<label for="email" class="block text-sm font-medium text-slate-700">{{ $t('auth.forgot_password.email_label') }}</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-slate-400">
							<Icon name="ph:envelope-simple" size="18" />
						</div>
						<input id="email" v-model="email" type="email" required
							class="block w-full pl-10 rtl:pl-3 pr-3 rtl:pr-10 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all sm:text-sm"
							:placeholder="$t('auth.forgot_password.email_placeholder')">
					</div>
				</div>

				<div v-if="error"
					class="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
					<Icon name="ph:warning-circle-fill" size="16" class="flex-shrink-0" />
					{{ error }}
				</div>

				<button type="submit" :disabled="loading"
					class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
					<span v-if="loading" class="flex items-center gap-2">
						<Icon name="ph:spinner-gap" class="animate-spin" size="18" />
						{{ $t('auth.forgot_password.submit_loading') }}
					</span>
					<span v-else>{{ $t('auth.forgot_password.submit_button') }}</span>
				</button>
			</form>
		</template>

		<!-- After sending -->
		<template v-else>
			<div class="text-center">
				<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<Icon name="ph:envelope-simple-bold" size="32" class="text-emerald-600" />
				</div>
				<h3 class="font-display text-2xl font-semibold text-slate-900 mb-3 tracking-tight">{{ $t('auth.forgot_password.success_heading') }}</h3>
				<p class="text-slate-500 text-sm mb-2">
					{{ $t('auth.forgot_password.success_message') }} <strong class="text-slate-700">{{ email }}</strong>{{ $t('auth.forgot_password.success_message_end') }}
				</p>
				<p class="text-slate-400 text-xs mb-8">
					{{ $t('auth.forgot_password.success_spam_notice') }}
				</p>

				<div class="space-y-3">
					<button @click="sent = false; email = ''"
						class="w-full py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
						{{ $t('auth.forgot_password.success_resend_button') }}
					</button>
					<NuxtLink to="/login"
						class="block w-full py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 transition-all text-center">
						{{ $t('auth.forgot_password.success_back_link') }}
					</NuxtLink>
				</div>
			</div>
		</template>
	</div>
</template>
