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
	phone: '',
	addressStreet: '',
	addressCity: '',
	addressZip: '',
	addressCountry: '',
	website: '',
	primaryColor: '#00E5FF',
	logo: null as string | null,
})

const loading = ref(true)
const saving = ref(false)
const isEditing = ref(false)

const isProfileComplete = computed(() => {
	// Profile is complete if name and logo are present
	// We also check if name is not empty string
	return !!(business.value.name && business.value.name.trim() !== '' && business.value.logo)
})

const canEdit = computed(() => {
	// Can edit if user clicked "Modifier" OR if profile is not complete
	return isEditing.value || !isProfileComplete.value
})

// Helper to get asset URL
const getAssetUrl = (url: string) => {
	return url // Full URL from S3/R2
}

const fetchBusiness = async () => {
	try {
		const data = await $api<any>('/businesses/me')
		if (data) {
			// If name defaults to email (from registration), clear it to force user input
			let cleanName = data.name
			if (user.value?.email && cleanName === user.value.email) {
				cleanName = ''
			}

			business.value = {
				...business.value,
				...data,
				name: cleanName,
				primaryColor: data.primaryColor || '#00E5FF',
				addressStreet: data.addressStreet || '',
				phone: data.phone || '',
			}
		}
	} catch (e) {
		console.error(e)
	} finally {
		loading.value = false
	}
}

const handleSave = async () => {
	saving.value = true
	try {
		const payload: any = {
			name: business.value.name,
			addressStreet: business.value.addressStreet,
			primaryColor: business.value.primaryColor,
			logo: business.value.logo,
		}

		if (business.value.phone) payload.phone = business.value.phone
		if (business.value.website) payload.website = business.value.website
		if (business.value.addressCity) payload.addressCity = business.value.addressCity
		if (business.value.addressZip) payload.addressZip = business.value.addressZip
		if (business.value.addressCountry) payload.addressCountry = business.value.addressCountry

		if (business.value.id) {
			await $api(`/businesses/${business.value.id}`, {
				method: 'PATCH',
				body: payload
			})
			useToast().show(t('profile.success_message'), 'success')
		} else {
			console.warn('No business ID found to update')
		}
		await fetchBusiness()
		isEditing.value = false
	} catch (e) {
		console.error(e)
		useToast().show(t('profile.error_message'), 'error')
	} finally {
		saving.value = false
	}
}

const fileInputRef = ref<HTMLInputElement | null>(null)
const triggerFileInput = () => {
	fileInputRef.value?.click()
}
const handleLogoUpload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (input.files && input.files[0]) {
		const file = input.files[0]
		const formData = new FormData()
		formData.append('file', file)

		try {
			const response = await $api<{ url: string }>('/uploads/logo', {
				method: 'POST',
				body: formData
			})
			if (response?.url) {
				business.value.logo = response.url
				useToast().show(t('profile.upload_success'), 'success')
			}
		} catch (e) {
			console.error(e)
			useToast().show(t('profile.upload_error'), 'error')
		}
	}
}

onMounted(() => {
	if (user.value) {
		fetchBusiness()
	}
})
</script>

<template>
	<div class="space-y-5 relative">

		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('profile.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-400 text-sm mt-0.5">{{ $t('profile.subtitle') }}</p>
			</div>

			<!-- Actions -->
			<div v-if="!loading" class="flex items-center gap-2">
				<button v-if="isProfileComplete && !isEditing" @click="isEditing = true"
					class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-700/40 text-slate-600 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#2C2C2E] transition-colors">
					<Icon name="ph:pencil-simple-bold" size="14" />
					<span>{{ $t('profile.edit_button') }}</span>
				</button>

				<button v-if="canEdit" @click="handleSave" :disabled="saving"
					class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-md text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
					<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" size="14" />
					<Icon v-else name="ph:floppy-disk-bold" size="14" />
					<span>{{ saving ? $t('profile.saving') : $t('profile.save_button') }}</span>
				</button>
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="loading" class="flex justify-center py-20 text-slate-300">
			<Icon name="svg-spinners:ring-resize" size="28" />
		</div>

		<!-- Incomplete Profile Warning -->
		<div v-else-if="!isProfileComplete"
			class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3.5 flex items-start gap-3">
			<Icon name="ph:warning-circle-fill" class="text-amber-500 mt-0.5 shrink-0" size="16" />
			<div>
				<p class="text-sm font-semibold text-amber-800 dark:text-amber-400">{{ $t('profile.incomplete_warning') }}</p>
				<p class="text-xs text-amber-600 dark:text-amber-500 mt-0.5">{{ $t('profile.incomplete_message') }}</p>
			</div>
		</div>

		<!-- Main Grid -->
		<div v-if="!loading" class="grid grid-cols-1 xl:grid-cols-2 gap-5">

			<!-- SECTION 1: Informations (Left Column) -->
			<div class="bg-white dark:bg-[#1C1C1E] rounded-lg border border-slate-200 dark:border-slate-700/40 overflow-hidden">
				<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700/40">
					<h2 class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('profile.information_section') }}</h2>
					<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('profile.information_subtitle') }}</p>
				</div>
				<div class="p-5">

				<div class="space-y-4">
					<!-- Name -->
					<div>
						<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('profile.business_name') }}</label>
						<input v-model="business.name" type="text" required :disabled="!canEdit"
							class="w-full bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 rounded-md px-3 py-2 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
							:placeholder="$t('profile.business_name_placeholder')">
					</div>

					<!-- Phone -->
					<div>
						<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('profile.phone') }}</label>
						<div class="relative">
							<Icon name="ph:phone-bold" size="15" class="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-slate-400" />
							<input v-model="business.phone" type="tel" :disabled="!canEdit"
								class="w-full bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 rounded-md pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
								:placeholder="$t('profile.phone_placeholder')">
						</div>
					</div>

					<!-- Website -->
					<div>
						<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('profile.website') }}</label>
						<div class="relative">
							<Icon name="ph:globe-simple-bold" size="15" class="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-slate-400" />
							<input v-model="business.website" type="url" :disabled="!canEdit"
								class="w-full bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 rounded-md pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
								:placeholder="$t('profile.website_placeholder')">
						</div>
					</div>

					<!-- Address -->
					<div>
						<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('profile.address') }}</label>
						<div class="relative">
							<Icon name="ph:map-pin-bold" size="15" class="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-slate-400" />
							<input v-model="business.addressStreet" :disabled="!canEdit"
								class="w-full bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 rounded-md pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
								:placeholder="$t('profile.address_placeholder')">
						</div>
					</div>

					<!-- City + Zip -->
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('profile.city') }}</label>
							<input v-model="business.addressCity" :disabled="!canEdit"
								class="w-full bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 rounded-md px-3 py-2 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
								:placeholder="$t('profile.city_placeholder')">
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('profile.postal_code') }}</label>
							<input v-model="business.addressZip" :disabled="!canEdit"
								class="w-full bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 rounded-md px-3 py-2 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
								:placeholder="$t('profile.postal_code_placeholder')">
						</div>
					</div>

					<!-- Country -->
					<div>
						<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{{ $t('profile.country') }}</label>
						<input v-model="business.addressCountry" :disabled="!canEdit"
							class="w-full bg-slate-50 dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 rounded-md px-3 py-2 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
							:placeholder="$t('profile.country_placeholder')">
					</div>
				</div>
				</div>
			</div>

			<!-- SECTION 2: Marque & Visuel (Right Column) -->
			<div class="bg-white dark:bg-[#1C1C1E] rounded-lg border border-slate-200 dark:border-slate-700/40 overflow-hidden">
				<div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700/40">
					<h2 class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('profile.visual_identity') }}</h2>
					<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('profile.visual_identity_subtitle') }}</p>
				</div>

				<div class="p-5 space-y-6">

					<!-- Logo Section -->
					<div>
						<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">{{ $t('profile.logo') }}</label>
						<div class="flex items-start gap-4">
							<!-- Logo Preview -->
							<div class="w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-600/50 bg-slate-50 dark:bg-[#2C2C2E] flex items-center justify-center p-2 relative group/logo overflow-hidden transition-colors hover:bg-white">
								<img v-if="business.logo" :src="getAssetUrl(business.logo)" class="w-full h-full object-contain" />
								<Icon v-else name="ph:storefront-duotone" class="text-slate-300" size="28" />
								<button v-if="business.logo && canEdit" @click="business.logo = null"
									class="absolute top-1 right-1 p-1 bg-white text-red-500 rounded-md shadow-sm hover:bg-red-50 transition-all opacity-0 group-hover/logo:opacity-100 border border-slate-100"
									:title="$t('profile.delete_logo')">
									<Icon name="ph:trash-bold" size="12" />
								</button>
							</div>

							<!-- Upload Actions -->
							<div v-if="canEdit" class="flex-1 space-y-2 pt-1">
								<input ref="fileInputRef" type="file" @change="handleLogoUpload" accept="image/*" class="hidden" />
								<button type="button" @click="triggerFileInput"
									class="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-600/50 hover:bg-slate-50 dark:hover:bg-[#3A3A3C] text-slate-600 dark:text-slate-200 text-xs font-medium rounded-md transition-colors">
									<Icon name="ph:upload-simple-bold" size="13" />
									{{ $t('profile.upload_logo') }}
								</button>
								<p class="text-[11px] text-slate-400 leading-relaxed">{{ $t('profile.logo_recommendation') }}</p>
							</div>
						</div>
					</div>

					<div class="h-px bg-slate-100 dark:bg-slate-700/40"></div>

					<!-- Colors Section -->
					<div>
						<label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">{{ $t('profile.brand_color') }}</label>
						<div class="flex items-center gap-2 bg-slate-50 dark:bg-[#2C2C2E] px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600/50">
							<div class="relative w-7 h-7 rounded overflow-hidden border border-slate-200 cursor-pointer"
								:class="{ 'opacity-50 cursor-not-allowed': !canEdit }">
								<input v-model="business.primaryColor" type="color" :disabled="!canEdit"
									class="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer disabled:cursor-not-allowed" />
							</div>
							<input v-model="business.primaryColor" type="text" :disabled="!canEdit"
								class="bg-transparent font-mono text-slate-700 dark:text-slate-200 outline-none w-full text-xs uppercase disabled:opacity-50"
								maxlength="7">
						</div>
					</div>

				</div>
			</div>

		</div>
	</div>
</template>
