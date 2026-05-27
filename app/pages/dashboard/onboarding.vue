<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: false
})
useHead({ title: 'Configuration' })

const { $api } = useNuxtApp()
const authStore = useAuthStore()
const user = computed(() => authStore.user)
const router = useRouter()

const step = ref(1)
const totalSteps = 3
const loading = ref(true)
const saving = ref(false)

const business = ref({
	id: undefined as string | undefined,
	name: '',
	email: user.value?.email || '',
	phone: '',
	addressStreet: '',
	addressCity: '',
	addressZip: '',
	addressCountry: '',
	googlePlaceId: null as string | null,
	googleReviewUrl: null as string | null,
	primary_color: '#00E5FF',
	logo: null as string | null
})

// Google Places
const sessionToken = ref(crypto.randomUUID())
const searchQuery = ref('')
const predictions = ref<{ placeId: string; description: string; mainText: string; secondaryText: string }[]>([])
const showPredictions = ref(false)
const searchLoading = ref(false)
const placeLoading = ref(false)
const confirmedPlace = ref<{ name: string; address: string; googleReviewUrl: string } | null>(null)
const manualMode = ref(false)
let debounceTimer: ReturnType<typeof setTimeout>

const onSearchInput = () => {
	clearTimeout(debounceTimer)
	confirmedPlace.value = null
	business.value.googlePlaceId = null
	business.value.googleReviewUrl = null
	if (searchQuery.value.trim().length < 2) {
		predictions.value = []
		showPredictions.value = false
		return
	}
	searchLoading.value = true
	debounceTimer = setTimeout(async () => {
		try {
			const res = await $api<any>(`/places/autocomplete?input=${encodeURIComponent(searchQuery.value)}&sessiontoken=${sessionToken.value}`)
			predictions.value = res.predictions || []
			showPredictions.value = predictions.value.length > 0
		} catch {
			predictions.value = []
		} finally {
			searchLoading.value = false
		}
	}, 350)
}

const hidePredictions = () => {
	setTimeout(() => { showPredictions.value = false }, 150)
}

const selectPlace = async (prediction: typeof predictions.value[0]) => {
	showPredictions.value = false
	placeLoading.value = true
	searchQuery.value = prediction.mainText
	try {
		const details = await $api<any>(`/places/details/${prediction.placeId}?sessiontoken=${sessionToken.value}`)
		business.value.name = details.name || prediction.mainText
		business.value.addressStreet = details.addressStreet || ''
		business.value.addressCity = details.addressCity || ''
		business.value.addressZip = details.addressZip || ''
		business.value.addressCountry = details.addressCountry || ''
		business.value.phone = business.value.phone || details.phone || ''
		business.value.googlePlaceId = details.placeId
		business.value.googleReviewUrl = details.googleReviewUrl
		confirmedPlace.value = {
			name: details.name || prediction.mainText,
			address: [details.addressStreet, details.addressCity, details.addressCountry].filter(Boolean).join(', '),
			googleReviewUrl: details.googleReviewUrl,
		}
		sessionToken.value = crypto.randomUUID()
	} catch (e) {
		console.error('Place details error:', e)
	} finally {
		placeLoading.value = false
	}
}

const resetSearch = () => {
	confirmedPlace.value = null
	searchQuery.value = ''
	business.value.googlePlaceId = null
	business.value.googleReviewUrl = null
	predictions.value = []
}

const fetchBusiness = async () => {
	try {
		if (!user.value?.id) return
		const data = await $api<any>('/businesses/me')
		if (data) {
			business.value = {
				...business.value,
				...data,
				phone: data.phone ?? '',
				primary_color: data.primaryColor || '#00E5FF',
				name: data.name === user.value?.email ? '' : (data.name || ''),
				email: data.email || user.value?.email || '',
			}
			if (data.googlePlaceId) {
				confirmedPlace.value = {
					name: data.name || '',
					address: [data.addressStreet, data.addressCity, data.addressCountry].filter(Boolean).join(', '),
					googleReviewUrl: data.googleReviewUrl || '',
				}
				searchQuery.value = data.name || ''
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
		await $api(`/businesses/${business.value.id}`, {
			method: 'PATCH',
			body: {
				name: business.value.name,
				email: business.value.email,
				phone: business.value.phone,
				addressStreet: business.value.addressStreet,
				addressCity: business.value.addressCity,
				addressZip: business.value.addressZip,
				addressCountry: business.value.addressCountry,
				primaryColor: business.value.primary_color,
				logo: business.value.logo,
				...(business.value.googlePlaceId ? {
					googlePlaceId: business.value.googlePlaceId,
					googleReviewUrl: business.value.googleReviewUrl
				} : {})
			}
		})
		const authCache = useState<{ user: any; checkedAt: number }>('_auth_cache')
		if (authCache.value) authCache.value.checkedAt = 0
		router.push('/dashboard')
	} catch (e) {
		console.error('Error saving business:', e)
	} finally {
		saving.value = false
	}
}

const nextStep = () => { if (step.value < totalSteps) step.value++ }
const prevStep = () => { if (step.value > 1) step.value-- }

const canProceedStep1 = computed(() => confirmedPlace.value !== null || manualMode.value)
const canProceedStep2 = computed(() => business.value.name.trim().length >= 2)

onMounted(() => fetchBusiness())
</script>

<template>
	<div class="min-h-screen bg-slate-50 font-sans flex flex-col">

		<!-- Top bar -->
		<header class="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
			<div class="flex items-center">
				<AppLogo variant="light" :size="28" />
			</div>
			<div class="flex items-center gap-2">
				<div v-for="i in totalSteps" :key="i" class="flex items-center gap-2">
					<div class="flex items-center gap-1.5">
						<div
							class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
							:class="i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'"
						>
							<Icon v-if="i < step" name="ph:check-bold" size="13" />
							<span v-else>{{ i }}</span>
						</div>
						<span
							class="hidden sm:block text-xs font-medium transition-colors"
							:class="i === step ? 'text-slate-900' : i < step ? 'text-emerald-600' : 'text-slate-400'"
						>
							{{ i === 1 ? 'Votre établissement' : i === 2 ? 'Coordonnées' : 'Identité visuelle' }}
						</span>
					</div>
					<div v-if="i < totalSteps" class="w-8 h-px bg-slate-200 mx-1 hidden sm:block" />
				</div>
			</div>
			<div class="w-24" />
		</header>

		<!-- Main content -->
		<main class="flex-1 flex items-center justify-center p-6">
			<div v-if="loading" class="flex justify-center py-20">
				<Icon name="ph:spinner-gap" class="animate-spin text-[#007AFF]" size="36" />
			</div>

			<div v-else class="w-full max-w-2xl">

				<!-- Step 1: Trouver l'établissement sur Google -->
				<div v-if="step === 1">
					<div class="mb-8">
						<div class="w-12 h-12 bg-[#007AFF]/5 rounded-2xl flex items-center justify-center mb-4">
							<Icon name="ph:magnifying-glass-duotone" size="26" class="text-[#007AFF]" />
						</div>
						<h1 class="text-2xl font-bold text-slate-900 mb-2">Bienvenue sur ScanUpGo 👋</h1>
						<p class="text-slate-500">Trouvez votre établissement sur Google pour configurer automatiquement votre lien d'avis.</p>
					</div>

					<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">

						<!-- Search bar -->
						<div v-if="!confirmedPlace" class="space-y-2">
							<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Recherchez votre établissement</label>
							<div class="relative">
								<Icon name="ph:magnifying-glass-bold" class="absolute left-3.5 top-3.5 text-slate-400" size="18" />
								<input
									v-model="searchQuery"
									type="text"
									autofocus
									placeholder="Ex: Restaurant Le Jardin, Casablanca…"
									class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-slate-900 font-medium focus:border-[#007AFF]/40 focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400"
									@input="onSearchInput"
									@blur="hidePredictions"
								/>
								<div v-if="searchLoading || placeLoading" class="absolute right-3.5 top-3.5">
									<Icon name="ph:spinner-gap-bold" class="animate-spin text-slate-400" size="18" />
								</div>
								<!-- Dropdown -->
								<div v-if="showPredictions" class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
									<button
										v-for="p in predictions"
										:key="p.placeId"
										type="button"
										class="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
										@mousedown.prevent="selectPlace(p)"
									>
										<Icon name="ph:map-pin-fill" class="text-[#007AFF] shrink-0 mt-0.5" size="16" />
										<div class="min-w-0">
											<p class="text-sm font-semibold text-slate-900 truncate">{{ p.mainText }}</p>
											<p class="text-xs text-slate-400 truncate">{{ p.secondaryText }}</p>
										</div>
									</button>
								</div>
							</div>
						</div>

						<!-- Confirmation card -->
						<div v-if="confirmedPlace" class="space-y-3">
							<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Établissement sélectionné</label>
							<div class="flex items-start gap-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
								<div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
									<Icon name="ph:storefront-fill" size="20" class="text-white" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-bold text-slate-900">{{ confirmedPlace.name }}</p>
									<p class="text-sm text-slate-500 mt-0.5">{{ confirmedPlace.address }}</p>
									<div class="flex items-center gap-1.5 mt-2">
										<Icon name="ph:check-circle-fill" class="text-emerald-500 shrink-0" size="14" />
										<span class="text-xs text-emerald-700 font-medium">Lien Google Avis configuré automatiquement</span>
									</div>
								</div>
								<button type="button" @click="resetSearch" class="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
									<Icon name="ph:x-bold" size="16" />
								</button>
							</div>
						</div>

						<!-- Manual mode toggle -->
						<div v-if="!manualMode && !confirmedPlace" class="pt-1">
							<button type="button" @click="manualMode = true" class="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
								Mon établissement n'est pas sur Google — saisir manuellement
							</button>
						</div>

						<!-- Manual fields -->
						<div v-if="manualMode && !confirmedPlace" class="space-y-3 pt-2 border-t border-slate-100">
							<p class="text-xs text-slate-500 font-medium">Saisie manuelle</p>
							<input
								v-model="business.name"
								type="text"
								placeholder="Nom de votre établissement"
								class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-[#007AFF]/40 focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400"
							/>
						</div>
					</div>

					<div class="mt-6 flex justify-end">
						<button
							@click="nextStep"
							:disabled="!canProceedStep1"
							class="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all"
						>
							C'est mon établissement
							<Icon name="ph:arrow-right-bold" size="16" />
						</button>
					</div>
				</div>

				<!-- Step 2: Coordonnées -->
				<div v-else-if="step === 2">
					<div class="mb-8">
						<div class="w-12 h-12 bg-[#F2F2F7] rounded-2xl flex items-center justify-center mb-4">
							<Icon name="ph:map-pin-duotone" size="26" class="text-slate-400" />
						</div>
						<h1 class="text-2xl font-bold text-slate-900 mb-2">Vérifiez vos coordonnées</h1>
						<p class="text-slate-500">{{ confirmedPlace ? 'Informations importées depuis Google. Vérifiez et corrigez si nécessaire.' : 'Renseignez vos coordonnées.' }}</p>
					</div>

					<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">

						<div class="space-y-2">
							<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de l'établissement <span class="text-red-400">*</span></label>
							<input
								v-model="business.name"
								type="text"
								placeholder="Ex: Boulangerie Dupont"
								class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:border-[#007AFF]/40 focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400"
							/>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
								<div class="relative">
									<Icon name="ph:envelope-duotone" class="absolute left-3 top-3.5 text-slate-400" size="16" />
									<input
										v-model="business.email"
										type="email"
										readonly
										class="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-500 text-sm font-medium outline-none cursor-default select-none"
									/>
								</div>
							</div>
							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone</label>
								<PhoneInput v-model="business.phone" variant="light" placeholder="6 00 00 00 00" />
							</div>
						</div>

						<div class="space-y-2">
							<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse</label>
							<input
								v-model="business.addressStreet"
								type="text"
								placeholder="12 rue du Soleil"
								class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-[#007AFF]/40 focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400"
							/>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Ville</label>
								<input
									v-model="business.addressCity"
									type="text"
									placeholder="Casablanca"
									class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-[#007AFF]/40 focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400"
								/>
							</div>
							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Code postal</label>
								<input
									v-model="business.addressZip"
									type="text"
									placeholder="20000"
									class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-[#007AFF]/40 focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Pays</label>
							<input
								v-model="business.addressCountry"
								type="text"
								placeholder="Maroc"
								class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-[#007AFF]/40 focus:ring-4 focus:ring-[#007AFF]/10 outline-none transition-all placeholder-slate-400"
							/>
						</div>
					</div>

					<div class="mt-6 flex justify-between">
						<button @click="prevStep" class="flex items-center gap-2 px-5 py-3 text-slate-600 hover:text-slate-900 font-medium rounded-xl hover:bg-slate-100 transition-all">
							<Icon name="ph:arrow-left-bold" size="16" />
							Retour
						</button>
						<button
							@click="nextStep"
							:disabled="!canProceedStep2"
							class="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all"
						>
							Continuer
							<Icon name="ph:arrow-right-bold" size="16" />
						</button>
					</div>
				</div>

				<!-- Step 3: Identité visuelle -->
				<div v-else-if="step === 3">
					<div class="mb-6">
						<div class="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
							<Icon name="ph:palette-duotone" size="26" class="text-amber-600" />
						</div>
						<h1 class="text-2xl font-bold text-slate-900 mb-2">Votre identité visuelle</h1>
						<p class="text-slate-500 text-sm">Personnalisez l'apparence de vos flyers et QR codes. Vous pourrez modifier ça plus tard.</p>
					</div>

					<div class="grid lg:grid-cols-2 gap-4">
						<div class="space-y-4">
							<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
								<div class="flex items-center justify-between">
									<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo</label>
									<span class="text-xs text-slate-400">PNG, SVG recommandé</span>
								</div>
								<FileUpload v-model="business.logo" label="" upload-type="logo" :max-size="5" :preview="true" accept="image/*" />
							</div>
							<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Couleur principale</label>
								<div class="flex flex-wrap gap-2">
									<button
										v-for="color in ['#6366F1','#8B5CF6','#EC4899','#EF4444','#F97316','#EAB308','#22C55E','#14B8A6','#0EA5E9','#1D4ED8','#111827','#64748B']"
										:key="color"
										type="button"
										@click="business.primary_color = color"
										class="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
										:style="{ backgroundColor: color }"
										:class="business.primary_color === color ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent'"
									/>
								</div>
								<div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
									<label class="cursor-pointer">
										<input v-model="business.primary_color" type="color" class="w-9 h-9 rounded-lg border-0 cursor-pointer bg-transparent p-0 block" />
									</label>
									<div class="flex-1">
										<p class="text-sm font-mono font-bold text-slate-900 uppercase">{{ business.primary_color }}</p>
										<p class="text-xs text-slate-400">Couleur personnalisée</p>
									</div>
								</div>
							</div>
						</div>

						<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
							<label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Aperçu</label>
							<div class="flex-1 flex items-center justify-center">
								<div class="w-full max-w-[200px] rounded-2xl overflow-hidden shadow-xl" :style="{ backgroundColor: business.primary_color }">
									<div class="p-5 flex flex-col items-center gap-3">
										<div class="w-16 h-16 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden border-2 border-white/30">
											<img v-if="business.logo" :src="business.logo" class="w-full h-full object-contain p-1" />
											<Icon v-else name="ph:storefront-duotone" size="28" class="text-white/70" />
										</div>
										<p class="text-white font-bold text-sm text-center leading-tight">
											{{ business.name || 'Votre établissement' }}
										</p>
									</div>
									<div class="bg-white mx-3 mb-3 rounded-xl p-3 flex flex-col items-center gap-2">
										<div class="w-16 h-16 rounded-lg flex items-center justify-center" :style="{ backgroundColor: business.primary_color + '15' }">
											<Icon name="ph:qr-code-duotone" size="40" :style="{ color: business.primary_color }" />
										</div>
										<p class="text-xs text-slate-500 font-medium">Laissez-nous un avis ⭐</p>
									</div>
								</div>
							</div>
							<p class="text-xs text-slate-400 text-center mt-4">Aperçu simplifié de votre flyer</p>
						</div>
					</div>

					<p class="text-center text-xs text-slate-400 mt-4">
						Vous pouvez aussi
						<button @click="handleSubmit" class="text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors">passer cette étape</button>
						et configurer ça plus tard.
					</p>

					<div class="mt-4 flex justify-between">
						<button @click="prevStep" class="flex items-center gap-2 px-5 py-3 text-slate-600 hover:text-slate-900 font-medium rounded-xl hover:bg-slate-100 transition-all">
							<Icon name="ph:arrow-left-bold" size="16" />
							Retour
						</button>
						<button
							@click="handleSubmit"
							:disabled="saving"
							class="flex items-center gap-2 px-6 py-3 bg-[#007AFF] hover:bg-[#0066DD] disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#007AFF]/20"
						>
							<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
							<span>{{ saving ? 'Enregistrement…' : 'Accéder à mon espace' }}</span>
							<Icon v-if="!saving" name="ph:arrow-right-bold" size="16" />
						</button>
					</div>
				</div>

			</div>
		</main>

	</div>
</template>
