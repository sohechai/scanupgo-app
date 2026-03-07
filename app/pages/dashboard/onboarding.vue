<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: 'dashboard'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const user = computed(() => authStore.user)

const business = ref({
	id: undefined as string | undefined,
	name: '',
	email: '',
	phone: '',
	address: '', // Concatenated address for display
	addressStreet: '',
	addressCity: '',
	addressZip: '',
	addressCountry: '',
	website: '',
	primary_color: '#00E5FF',
	primaryColor: '#00E5FF',
	logo: null as string | null
})

const loading = ref(true)
const saving = ref(false)
const config = useRuntimeConfig()
const router = useRouter()

// Helper to get asset URL (for uploaded files)
const getAssetUrl = (url: string) => {
	return url // URL complète depuis S3/R2
}

const fetchBusiness = async () => {
	try {
		if (!user.value?.id) return

		// Call NestJS GET /businesses/me
		const data = await $api<any>('/businesses/me')

		if (data) {
			// Map API response to local state
			business.value = {
				...business.value,
				...data,
				primary_color: data.primaryColor || '#00E5FF',
				address: [data.addressStreet, data.addressCity, data.addressZip, data.addressCountry]
					.filter(Boolean)
					.join(', ')
			}
		}
	} catch (e) {
		console.error('Error fetching business:', e)
	} finally {
		loading.value = false
	}
}

const handleSubmit = async () => {
	if (!business.value.id) return

	saving.value = true
	try {
		// Parse address into components (simple split for now)
		const addressParts = business.value.address.split(',').map(s => s.trim())

		// Call NestJS PATCH /businesses/:id
		await $api(`/businesses/${business.value.id}`, {
			method: 'PATCH',
			body: {
				name: business.value.name,
				email: business.value.email,
				phone: business.value.phone,
				addressStreet: addressParts[0] || '',
				addressCity: addressParts[1] || '',
				addressZip: addressParts[2] || '',
				addressCountry: addressParts[3] || '',
				website: business.value.website,
				primaryColor: business.value.primary_color,
				logo: business.value.logo
			}
		})

		// Redirect to dashboard or games after onboarding
		router.push('/dashboard')
	} catch (e) {
		console.error('Error saving business:', e)
	} finally {
		saving.value = false
	}
}

// Logo upload is now handled by FileUpload component

onMounted(() => {
	fetchBusiness()
})
</script>

<template>
	<div class="max-w-4xl mx-auto py-12">
		<div class="mb-12 text-center">
			<h1 class="text-4xl font-display font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{{ $t('onboarding.title') }}</h1>
			<p class="text-slate-500 dark:text-slate-400 text-xl">{{ $t('onboarding.subtitle') }}</p>
		</div>

		<div v-if="loading" class="flex justify-center py-20">
			<Icon name="ph:spinner-gap" class="animate-spin text-brand-600" size="40" />
		</div>

		<div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Left Column: Identity -->
			<div class="lg:col-span-2 space-y-6">
				<!-- General Info Card -->
				<div
					class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
					<h2
						class="text-xl font-display font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
						<div
							class="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
							<Icon name="ph:storefront-duotone" size="24" />
						</div>
						{{ $t('onboarding.business_info') }}
					</h2>

					<div class="space-y-8">
						<div class="space-y-2">
							<label
								class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ $t('onboarding.business_name') }}</label>
							<input v-model="business.name" type="text"
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 font-bold"
								:placeholder="$t('onboarding.business_name_placeholder')">
						</div>

						<div class="space-y-2">
							<label
								class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ $t('onboarding.website') }}</label>
							<div class="relative group/input">
								<Icon name="ph:globe-duotone"
									class="absolute left-5 top-4 text-slate-400 dark:text-slate-500 group-focus-within/input:text-brand-500 transition-colors"
									size="20" />
								<input v-model="business.website" type="url"
									class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-5 py-3.5 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 font-medium"
									:placeholder="$t('onboarding.website_placeholder')">
							</div>
						</div>

						<div class="space-y-2">
							<label
								class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ $t('onboarding.address') }}</label>
							<textarea v-model="business.address" rows="3"
								class="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 resize-none font-medium leading-relaxed"
								:placeholder="$t('onboarding.address_placeholder')"></textarea>
						</div>
					</div>
				</div>
			</div>

			<!-- Right Column: Branding & Actions -->
			<div class="space-y-6">
				<!-- Branding Card -->
				<div
					class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
					<h2
						class="text-xl font-display font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
						<div
							class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
							<Icon name="ph:palette-duotone" size="24" />
						</div>
						{{ $t('onboarding.visual_identity') }}
					</h2>

					<div class="space-y-8">
						<!-- Logo Upload -->
						<div class="space-y-3">
							<label
								class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ $t('onboarding.logo') }}</label>
							<FileUpload v-model="business.logo" label="" upload-type="logo" :max-size="5"
								:preview="true" accept="image/*" />
							<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{{ $t('onboarding.logo_recommendation') }}</p>
						</div>

						<!-- Colors -->
						<div class="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-700">
							<div class="space-y-2">
								<label
									class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ $t('onboarding.primary_color') }}</label>
								<div
									class="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 p-2 rounded-xl border border-slate-200 dark:border-slate-600">
									<input v-model="business.primary_color" type="color"
										class="w-10 h-10 rounded-lg bg-transparent border-0 cursor-pointer p-0 shadow-sm hover:scale-105 transition-transform">
									<input v-model="business.primary_color" type="text"
										class="flex-1 bg-transparent border-none text-slate-900 dark:text-white font-mono text-sm uppercase font-bold focus:ring-0">
								</div>
							</div>

						</div>
					</div>
				</div>

				<!-- Action Button -->
				<button @click="handleSubmit" :disabled="saving"
					class="group w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] hover:-translate-y-0.5">
					<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" size="20" />
					<span v-else>{{ $t('onboarding.complete_setup') }}</span>
					<div v-if="!saving" class="relative overflow-hidden w-5 h-5 flex items-center justify-center">
						<div
							class="absolute flex items-center justify-center transition-transform duration-300 group-hover:translate-x-[150%]">
							<Icon name="ph:arrow-right-bold" class="rtl:rotate-180" />
						</div>
						<div
							class="absolute flex items-center justify-center -translate-x-[150%] transition-transform duration-300 group-hover:translate-x-0">
							<Icon name="ph:arrow-right-bold" class="rtl:rotate-180" />
						</div>
					</div>
				</button>
			</div>
		</div>
	</div>
</template>
