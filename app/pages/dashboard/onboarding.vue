<script setup lang="ts">
definePageMeta({
	middleware: 'auth',
	layout: false
})

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
	email: '',
	phone: '',
	address: '',
	addressStreet: '',
	addressCity: '',
	addressZip: '',
	addressCountry: '',
	website: '',
	primary_color: '#00E5FF',
	logo: null as string | null
})

const fetchBusiness = async () => {
	try {
		if (!user.value?.id) return
		const data = await $api<any>('/businesses/me')
		if (data) {
			business.value = {
				...business.value,
				...data,
				primary_color: data.primaryColor || '#00E5FF',
				name: data.name === user.value?.email ? '' : (data.name || ''),
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
				website: business.value.website,
				primaryColor: business.value.primary_color,
				logo: business.value.logo
			}
		})
		router.push('/dashboard')
	} catch (e) {
		console.error('Error saving business:', e)
	} finally {
		saving.value = false
	}
}

const nextStep = () => {
	if (step.value < totalSteps) step.value++
}

const prevStep = () => {
	if (step.value > 1) step.value--
}

const canProceedStep1 = computed(() => business.value.name.trim().length >= 2)

onMounted(() => fetchBusiness())
</script>

<template>
	<div class="min-h-screen bg-slate-50 font-sans flex flex-col">

		<!-- Top bar -->
		<header class="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
					<span class="text-white font-bold text-sm">B.</span>
				</div>
				<span class="font-bold text-slate-900 text-lg tracking-tight">ScanUpGo</span>
			</div>

			<!-- Step indicators -->
			<div class="flex items-center gap-2">
				<div v-for="i in totalSteps" :key="i" class="flex items-center gap-2">
					<div class="flex items-center gap-1.5">
						<div
							class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
							:class="i < step
								? 'bg-emerald-500 text-white'
								: i === step
									? 'bg-slate-900 text-white'
									: 'bg-slate-100 text-slate-400'"
						>
							<Icon v-if="i < step" name="ph:check-bold" size="13" />
							<span v-else>{{ i }}</span>
						</div>
						<span
							class="hidden sm:block text-xs font-medium transition-colors"
							:class="i === step ? 'text-slate-900' : i < step ? 'text-emerald-600' : 'text-slate-400'"
						>
							{{ i === 1 ? 'Établissement' : i === 2 ? 'Coordonnées' : 'Identité visuelle' }}
						</span>
					</div>
					<div v-if="i < totalSteps" class="w-8 h-px bg-slate-200 mx-1 hidden sm:block" />
				</div>
			</div>

			<div class="w-24" /><!-- spacer -->
		</header>

		<!-- Main content -->
		<main class="flex-1 flex items-center justify-center p-6">
			<div v-if="loading" class="flex justify-center py-20">
				<Icon name="ph:spinner-gap" class="animate-spin text-brand-600" size="36" />
			</div>

			<div v-else class="w-full max-w-2xl">

				<!-- Step 1: Nom de l'établissement -->
				<Transition name="slide" mode="out-in">
					<div v-if="step === 1" key="step1">
						<div class="mb-8">
							<div class="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
								<Icon name="ph:storefront-duotone" size="26" class="text-brand-600" />
							</div>
							<h1 class="text-2xl font-bold text-slate-900 mb-2">Bienvenue sur ScanUpGo 👋</h1>
							<p class="text-slate-500">Commençons par le nom de votre établissement. C'est ce que verront vos clients.</p>
						</div>

						<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de l'établissement <span class="text-red-400">*</span></label>
								<input
									v-model="business.name"
									type="text"
									autofocus
									placeholder="Ex: Boulangerie Dupont, Restaurant Le Jardin…"
									class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
								/>
								<p class="text-xs text-slate-400">Ce nom sera affiché sur vos flyers et QR codes.</p>
							</div>
						</div>

						<div class="mt-6 flex justify-end">
							<button
								@click="nextStep"
								:disabled="!canProceedStep1"
								class="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-all"
							>
								Continuer
								<Icon name="ph:arrow-right-bold" size="16" />
							</button>
						</div>
					</div>
				</Transition>

				<!-- Step 2: Coordonnées -->
				<Transition name="slide" mode="out-in">
					<div v-if="step === 2" key="step2">
						<div class="mb-8">
							<div class="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
								<Icon name="ph:map-pin-duotone" size="26" class="text-violet-600" />
							</div>
							<h1 class="text-2xl font-bold text-slate-900 mb-2">Vos coordonnées</h1>
							<p class="text-slate-500">Ces informations permettent à vos clients de vous retrouver facilement.</p>
						</div>

						<div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
									<div class="relative">
										<Icon name="ph:envelope-duotone" class="absolute left-3 top-3.5 text-slate-400" size="16" />
										<input
											v-model="business.email"
											type="email"
											placeholder="contact@monshop.fr"
											class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
										/>
									</div>
								</div>
								<div class="space-y-2">
									<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone</label>
									<div class="relative">
										<Icon name="ph:phone-duotone" class="absolute left-3 top-3.5 text-slate-400" size="16" />
										<input
											v-model="business.phone"
											type="tel"
											placeholder="+33 6 00 00 00 00"
											class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
										/>
									</div>
								</div>
							</div>

							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse</label>
								<input
									v-model="business.addressStreet"
									type="text"
									placeholder="12 rue du Soleil"
									class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
								/>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Ville</label>
									<input
										v-model="business.addressCity"
										type="text"
										placeholder="Casablanca"
										class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
									/>
								</div>
								<div class="space-y-2">
									<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Code postal</label>
									<input
										v-model="business.addressZip"
										type="text"
										placeholder="20000"
										class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
									/>
								</div>
							</div>

							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Pays</label>
								<input
									v-model="business.addressCountry"
									type="text"
									placeholder="Maroc"
									class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
								/>
							</div>

							<div class="space-y-2">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Site web</label>
								<div class="relative">
									<Icon name="ph:globe-duotone" class="absolute left-3 top-3.5 text-slate-400" size="16" />
									<input
										v-model="business.website"
										type="url"
										placeholder="https://monshop.fr"
										class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder-slate-400"
									/>
								</div>
							</div>
						</div>

						<div class="mt-6 flex justify-between">
							<button @click="prevStep" class="flex items-center gap-2 px-5 py-3 text-slate-600 hover:text-slate-900 font-medium rounded-xl hover:bg-slate-100 transition-all">
								<Icon name="ph:arrow-left-bold" size="16" />
								Retour
							</button>
							<button @click="nextStep" class="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all">
								Continuer
								<Icon name="ph:arrow-right-bold" size="16" />
							</button>
						</div>
					</div>
				</Transition>

				<!-- Step 3: Identité visuelle -->
				<Transition name="slide" mode="out-in">
					<div v-if="step === 3" key="step3">
						<div class="mb-6">
							<div class="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
								<Icon name="ph:palette-duotone" size="26" class="text-amber-600" />
							</div>
							<h1 class="text-2xl font-bold text-slate-900 mb-2">Votre identité visuelle</h1>
							<p class="text-slate-500 text-sm">Personnalisez l'apparence de vos flyers et QR codes. Vous pourrez modifier ça plus tard.</p>
						</div>

						<div class="grid lg:grid-cols-2 gap-4">
							<!-- Left: Config -->
							<div class="space-y-4">
								<!-- Logo -->
								<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
									<div class="flex items-center justify-between">
										<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo</label>
										<span class="text-xs text-slate-400">PNG, SVG recommandé</span>
									</div>
									<FileUpload v-model="business.logo" label="" upload-type="logo" :max-size="5" :preview="true" accept="image/*" />
								</div>

								<!-- Couleur -->
								<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
									<label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Couleur principale</label>

									<!-- Swatches -->
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

									<!-- Custom color picker -->
									<div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
										<label class="cursor-pointer">
											<input
												v-model="business.primary_color"
												type="color"
												class="w-9 h-9 rounded-lg border-0 cursor-pointer bg-transparent p-0 block"
											/>
										</label>
										<div class="flex-1">
											<p class="text-sm font-mono font-bold text-slate-900 uppercase">{{ business.primary_color }}</p>
											<p class="text-xs text-slate-400">Couleur personnalisée</p>
										</div>
										<Icon name="ph:eyedropper-duotone" size="18" class="text-slate-400" />
									</div>
								</div>
							</div>

							<!-- Right: Live preview -->
							<div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
								<label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Aperçu</label>

								<!-- Mini flyer mockup -->
								<div class="flex-1 flex items-center justify-center">
									<div class="w-full max-w-[200px] rounded-2xl overflow-hidden shadow-xl" :style="{ backgroundColor: business.primary_color }">
										<!-- Header colored zone -->
										<div class="p-5 flex flex-col items-center gap-3">
											<!-- Logo or placeholder -->
											<div class="w-16 h-16 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden border-2 border-white/30">
												<img v-if="business.logo" :src="business.logo" class="w-full h-full object-contain p-1" />
												<Icon v-else name="ph:storefront-duotone" size="28" class="text-white/70" />
											</div>
											<p class="text-white font-bold text-sm text-center leading-tight">
												{{ business.name || 'Votre établissement' }}
											</p>
										</div>
										<!-- QR code zone -->
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

						<!-- Skip option -->
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
								class="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/20"
							>
								<Icon v-if="saving" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
								<span>{{ saving ? 'Enregistrement…' : 'Accéder à mon espace' }}</span>
								<Icon v-if="!saving" name="ph:arrow-right-bold" size="16" />
							</button>
						</div>
					</div>
				</Transition>

			</div>
		</main>

	</div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
	transition: all 0.25s ease;
}
.slide-enter-from {
	opacity: 0;
	transform: translateX(20px);
}
.slide-leave-to {
	opacity: 0;
	transform: translateX(-20px);
}
</style>
