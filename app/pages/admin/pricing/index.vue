<script setup lang="ts">
interface SubscriptionPlan {
	id: string
	name: string
	description: string | null
	priceMonthly: number
	priceAnnual: number
	priceLifetime: number
	stripePriceIdMonthly: string | null
	stripePriceIdAnnual: string | null
	stripePriceIdLifetime: string | null
	stripeProductId: string | null
	features: any
	active: boolean
	sortOrder: number
	trialDays: number
	isDefault: boolean
	createdAt: string
	updatedAt: string
}

interface FlyerPricing {
	id: string
	productType: string
	dimensions: string
	paperType: string
	minQuantity: number
	maxQuantity: number | null
	unitPrice: number
	currency: string
	active: boolean
	createdAt: string
	updatedAt: string
}

interface CreditPack {
	id: string
	name: string
	description: string | null
	type: string
	creditAmount: number
	price: number
	currency: string
	stripePriceId: string | null
	active: boolean
	sortOrder: number
	createdAt: string
	updatedAt: string
}

definePageMeta({
	layout: 'admin',
	middleware: ['auth', 'admin']
})

const { t } = useI18n()
const { formatNumber } = useLocaleDate()
useHead({ title: t('admin.pricing.title') })

const { $api } = useNuxtApp()
const toast = useToast()

// Tabs
const activeTab = ref('plans')
const tabs = computed(() => [
	{ id: 'plans', label: t('admin.pricing.tab_plans'), icon: 'ph:stack-bold' },
	{ id: 'flyers', label: t('admin.pricing.tab_flyers'), icon: 'ph:files-bold' },
	{ id: 'credits', label: t('admin.pricing.tab_credits'), icon: 'ph:coins-bold' },
])

// Plans
const plans = ref<SubscriptionPlan[]>([])
const loadingPlans = ref(true)
const showPlanModal = ref(false)
const editingPlan = ref<SubscriptionPlan | null>(null)
const planError = ref<string | null>(null)
const featuresTab = ref<'monthly' | 'annual' | 'lifetime'>('monthly')

const defaultFeatures = () => ({ max_games: 1, email_credits_per_month: 100 })
const parseFeatures = (f: any) => ({
	max_games: f?.max_games ?? 1,
	email_credits_per_month: f?.email_credits_per_month ?? 100,
})

const planForm = ref({
	name: '',
	description: '',
	stripePriceIdMonthly: '',
	stripePriceIdAnnual: '',
	stripePriceIdLifetime: '',
	stripeProductId: '',
	featuresMonthly: defaultFeatures(),
	featuresAnnual: defaultFeatures(),
	featuresLifetime: defaultFeatures(),
	trialDays: 0,
	isDefault: false,
	active: true,
})

const fetchPlans = async () => {
	loadingPlans.value = true
	try { plans.value = await $api('/admin/plans') }
	catch { toast.show(t('admin.pricing.loading'), 'error') }
	finally { loadingPlans.value = false }
}

// Snapshot des Price IDs avant édition (pour détecter un changement → avertir l'admin)
const priceIdsBeforeEdit = ref({ monthly: '', annual: '', lifetime: '' })
const showPriceChangeInfo = ref(false)

const openEditPlanModal = (plan: SubscriptionPlan) => {
	editingPlan.value = plan
	featuresTab.value = 'monthly'
	priceIdsBeforeEdit.value = {
		monthly: plan.stripePriceIdMonthly || '',
		annual: plan.stripePriceIdAnnual || '',
		lifetime: plan.stripePriceIdLifetime || '',
	}
	planForm.value = {
		name: plan.name,
		description: plan.description || '',
		stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
		stripePriceIdAnnual: plan.stripePriceIdAnnual || '',
		stripePriceIdLifetime: plan.stripePriceIdLifetime || '',
		stripeProductId: plan.stripeProductId || '',
		featuresMonthly: parseFeatures((plan as any).featuresMonthly ?? plan.features),
		featuresAnnual: parseFeatures((plan as any).featuresAnnual ?? plan.features),
		featuresLifetime: parseFeatures((plan as any).featuresLifetime ?? plan.features),
		trialDays: plan.trialDays,
		isDefault: plan.isDefault,
		active: plan.active,
	}
	planError.value = null
	showPlanModal.value = true
}

const savePlan = async () => {
	try {
		const payload = {
			name: planForm.value.name,
			description: planForm.value.description || undefined,
			stripePriceIdMonthly: planForm.value.stripePriceIdMonthly || undefined,
			stripePriceIdAnnual: planForm.value.stripePriceIdAnnual || undefined,
			stripePriceIdLifetime: planForm.value.stripePriceIdLifetime || undefined,
			stripeProductId: planForm.value.stripeProductId || undefined,
			featuresMonthly: planForm.value.featuresMonthly,
			featuresAnnual: planForm.value.featuresAnnual,
			featuresLifetime: planForm.value.featuresLifetime,
			trialDays: planForm.value.trialDays,
			isDefault: planForm.value.isDefault,
			active: planForm.value.active,
		}
		// Un Price ID a-t-il changé ? (→ avertir : les abonnés existants ne migrent pas auto)
		const priceIdChanged = !!editingPlan.value && (
			(planForm.value.stripePriceIdMonthly || '') !== priceIdsBeforeEdit.value.monthly ||
			(planForm.value.stripePriceIdAnnual || '') !== priceIdsBeforeEdit.value.annual ||
			(planForm.value.stripePriceIdLifetime || '') !== priceIdsBeforeEdit.value.lifetime
		)

		if (editingPlan.value) {
			await $api(`/admin/plans/${editingPlan.value.id}`, { method: 'PUT', body: payload })
			toast.show(t('admin.pricing.modal_save'), 'success')
		}
		showPlanModal.value = false
		await fetchPlans()

		if (priceIdChanged) showPriceChangeInfo.value = true
	} catch (e: any) {
		const msg = e?.data?.message || e?.message
		planError.value = Array.isArray(msg) ? msg.join(' — ') : (msg || t('admin.pricing.modal_save'))
	}
}

const deletePlan = async (plan: SubscriptionPlan) => {
	if (!confirm(`Supprimer le plan "${plan.name}" ?`)) return
	try { await $api(`/admin/plans/${plan.id}`, { method: 'DELETE' }); toast.show(t('admin.pricing.delete'), 'success'); await fetchPlans() }
	catch { toast.show(t('admin.pricing.delete'), 'error') }
}

const stripeProductUrl = (productId: string) => `https://dashboard.stripe.com/test/products/${productId}`
const stripePriceUrl = (priceId: string) => `https://dashboard.stripe.com/test/prices/${priceId}`

// Flyer Packs
interface FlyerPack {
	id: string
	name: string
	quantity: number
	price: number
	currency: string
	image: string | null
	category: string
	active: boolean
	sortOrder: number
}
const packs = ref<FlyerPack[]>([])
const loadingFlyers = ref(true)
const showFlyerModal = ref(false)
const editingPack = ref<FlyerPack | null>(null)
const packForm = ref({ name: '', quantity: 1500, price: 0, currency: 'MAD', image: '' as string | null, active: true })
const flyerError = ref<string | null>(null)
const uploadingImage = ref(false)

const fetchPacks = async () => {
	loadingFlyers.value = true
	try { packs.value = await $api('/flyer-packs/admin?includeInactive=true') }
	catch { toast.show(t('admin.pricing.loading'), 'error') }
	finally { loadingFlyers.value = false }
}

const openNewPackModal = () => {
	editingPack.value = null
	packForm.value = { name: '', quantity: 1500, price: 0, currency: 'MAD', image: '', active: true }
	flyerError.value = null
	showFlyerModal.value = true
}

const openEditPackModal = (p: FlyerPack) => {
	editingPack.value = p
	packForm.value = { name: p.name, quantity: p.quantity, price: Number(p.price), currency: p.currency, image: p.image, active: p.active }
	flyerError.value = null
	showFlyerModal.value = true
}

const onPackImageSelected = async (e: Event) => {
	const file = (e.target as HTMLInputElement).files?.[0]
	if (!file) return
	uploadingImage.value = true
	try {
		const fd = new FormData()
		fd.append('file', file)
		const res = await $api<{ url: string }>('/uploads', { method: 'POST', body: fd })
		packForm.value.image = res.url
	} catch {
		toast.show(t('admin.pricing.image_upload_error'), 'error')
	} finally {
		uploadingImage.value = false
	}
}

const savePack = async () => {
	if (!packForm.value.name.trim()) { flyerError.value = t('admin.pricing.pack_name_required'); return }
	try {
		const body = { ...packForm.value, image: packForm.value.image || undefined }
		if (editingPack.value) { await $api(`/flyer-packs/${editingPack.value.id}`, { method: 'PATCH', body }); toast.show(t('admin.pricing.modal_save'), 'success') }
		else { await $api('/flyer-packs', { method: 'POST', body }); toast.show(t('admin.pricing.modal_create'), 'success') }
		showFlyerModal.value = false
		await fetchPacks()
	} catch (e: any) {
		const msg = e?.data?.message || e?.message
		flyerError.value = Array.isArray(msg) ? msg.join(' — ') : (msg || t('admin.pricing.modal_save'))
	}
}

const deletePack = async (p: FlyerPack) => {
	if (!confirm(`${t('admin.pricing.delete')} « ${p.name} » ?`)) return
	try { await $api(`/flyer-packs/${p.id}`, { method: 'DELETE' }); toast.show(t('admin.pricing.delete'), 'success'); await fetchPacks() }
	catch { toast.show(t('admin.pricing.delete'), 'error') }
}

const togglePackActive = async (p: FlyerPack) => {
	try { await $api(`/flyer-packs/${p.id}`, { method: 'PATCH', body: { active: !p.active } }); await fetchPacks() }
	catch { toast.show('Error', 'error') }
}

// Credit Packs
const creditPacks = ref<CreditPack[]>([])
const loadingCredits = ref(true)
const showCreditModal = ref(false)
const editingCreditPack = ref<CreditPack | null>(null)
const creditTypeFilter = ref('all')
const creditForm = ref({ name: '', description: '', type: 'email', creditAmount: 100, price: 0, currency: 'MAD', stripePriceId: '', active: true })

const fetchCreditPacks = async () => {
	loadingCredits.value = true
	try { creditPacks.value = await $api('/admin/credit-packs') }
	catch { toast.show(t('admin.pricing.loading_credits'), 'error') }
	finally { loadingCredits.value = false }
}

const filteredCreditPacks = computed(() => creditTypeFilter.value === 'all' ? creditPacks.value : creditPacks.value.filter(p => p.type === creditTypeFilter.value))

const openNewCreditModal = () => {
	editingCreditPack.value = null
	creditForm.value = { name: '', description: '', type: 'email', creditAmount: 100, price: 0, currency: 'MAD', stripePriceId: '', active: true }
	showCreditModal.value = true
}

const openEditCreditModal = (pack: CreditPack) => {
	editingCreditPack.value = pack
	creditForm.value = { name: pack.name, description: pack.description || '', type: pack.type, creditAmount: pack.creditAmount, price: Number(pack.price), currency: pack.currency, stripePriceId: pack.stripePriceId || '', active: pack.active }
	showCreditModal.value = true
}

const saveCreditPack = async () => {
	try {
		const payload = { name: creditForm.value.name, description: creditForm.value.description || undefined, type: creditForm.value.type, creditAmount: creditForm.value.creditAmount, price: creditForm.value.price, currency: creditForm.value.currency, stripePriceId: creditForm.value.stripePriceId || undefined, active: creditForm.value.active }
		if (editingCreditPack.value) { await $api(`/admin/credit-packs/${editingCreditPack.value.id}`, { method: 'PUT', body: payload }); toast.show(t('admin.pricing.credits_modal_save'), 'success') }
		else { await $api('/admin/credit-packs', { method: 'POST', body: payload }); toast.show(t('admin.pricing.credits_modal_create'), 'success') }
		showCreditModal.value = false
		await fetchCreditPacks()
	} catch { toast.show(t('admin.pricing.credits_modal_save'), 'error') }
}

const deleteCreditPack = async (pack: CreditPack) => {
	if (!confirm(`${t('admin.pricing.delete')} "${pack.name}" ?`)) return
	try { await $api(`/admin/credit-packs/${pack.id}`, { method: 'DELETE' }); toast.show(t('admin.pricing.delete'), 'success'); await fetchCreditPacks() }
	catch { toast.show(t('admin.pricing.delete'), 'error') }
}

const toggleCreditActive = async (pack: CreditPack) => {
	try { await $api(`/admin/credit-packs/${pack.id}`, { method: 'PUT', body: { active: !pack.active } }); await fetchCreditPacks() }
	catch { toast.show('Error', 'error') }
}

const handleNew = () => {
	if (activeTab.value === 'flyers') openNewPackModal()
	else if (activeTab.value === 'credits') openNewCreditModal()
}
const newButtonLabel = computed(() => {
	if (activeTab.value === 'flyers') return t('admin.pricing.new_button')
	if (activeTab.value === 'credits') return t('admin.pricing.new_button_credit')
	return null
})

onMounted(() => { fetchPlans(); fetchPacks(); fetchCreditPacks() })
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.pricing.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.pricing.description') }}</p>
			</div>
			<button v-if="newButtonLabel" @click="handleNew"
				class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
				<Icon name="ph:plus-bold" size="15" />
				{{ newButtonLabel }}
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg w-fit">
			<button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
				class="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors"
				:class="activeTab === tab.id ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'">
				<Icon :name="tab.icon" size="15" />
				{{ tab.label }}
				<span v-if="tab.id === 'plans' && plans.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ plans.length }}</span>
				<span v-if="tab.id === 'flyers' && packs.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ packs.length }}</span>
				<span v-if="tab.id === 'credits' && creditPacks.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ creditPacks.length }}</span>
			</button>
		</div>

		<!-- ===== TAB: PLANS ===== -->
		<div v-if="activeTab === 'plans'" class="space-y-4">

			<!-- Stripe sync banner -->
			<div class="flex items-center gap-3 bg-violet-500/5 border border-violet-500/20 rounded-lg px-4 py-3">
				<Icon name="ph:lightning-bold" size="16" class="text-violet-400 shrink-0" />
				<p class="text-xs text-slate-400">Prix synchronisés automatiquement depuis Stripe via webhook. <span class="text-slate-500">Modifiez les prix uniquement dans le Dashboard Stripe.</span></p>
			</div>

			<!-- Loading -->
			<div v-if="loadingPlans" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>

			<!-- Empty -->
			<div v-else-if="plans.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:stack-duotone" size="32" class="mb-2" />
				<p class="text-sm font-medium text-slate-400 mb-1">Aucun plan</p>
				<p class="text-xs text-slate-600">Créez un produit Stripe — il apparaîtra ici automatiquement</p>
			</div>

			<!-- Plans list -->
			<div v-else class="space-y-3">
				<div v-for="plan in plans" :key="plan.id"
					class="bg-[#161920] border border-white/[0.07] rounded-lg p-4">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<h3 class="text-sm font-semibold text-white">{{ plan.name }}</h3>
								<span v-if="plan.isDefault" class="px-1.5 py-0.5 bg-brand-500/15 text-brand-400 text-[10px] font-medium rounded border border-brand-500/20">Défaut</span>
								<span class="inline-flex items-center gap-1 text-xs font-medium" :class="plan.active ? 'text-emerald-400' : 'text-slate-500'">
									<span class="w-1.5 h-1.5 rounded-full" :class="plan.active ? 'bg-emerald-400' : 'bg-slate-600'"></span>
									{{ plan.active ? 'Actif' : 'Inactif' }}
								</span>
							</div>
							<p v-if="plan.description" class="text-xs text-slate-500 mb-3">{{ plan.description }}</p>

							<!-- Prices (read-only) -->
							<div class="flex flex-wrap gap-2 mb-3">
								<div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-md">
									<span class="text-xs text-slate-500">Mensuel</span>
									<span class="text-sm font-semibold text-white tabular-nums">{{ Number(plan.priceMonthly).toFixed(2) }}</span>
									<a v-if="plan.stripePriceIdMonthly" :href="stripePriceUrl(plan.stripePriceIdMonthly)" target="_blank"
										class="ml-1 text-violet-400 hover:text-violet-300 transition-colors" title="Modifier sur Stripe">
										<Icon name="ph:arrow-square-out-bold" size="12" />
									</a>
									<span v-else class="ml-1 text-[10px] text-slate-600">non lié</span>
								</div>
								<div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-md">
									<span class="text-xs text-slate-500">Annuel</span>
									<span class="text-sm font-semibold text-white tabular-nums">{{ Number(plan.priceAnnual).toFixed(2) }}</span>
									<a v-if="plan.stripePriceIdAnnual" :href="stripePriceUrl(plan.stripePriceIdAnnual)" target="_blank"
										class="ml-1 text-violet-400 hover:text-violet-300 transition-colors" title="Modifier sur Stripe">
										<Icon name="ph:arrow-square-out-bold" size="12" />
									</a>
									<span v-else class="ml-1 text-[10px] text-slate-600">non lié</span>
								</div>
								<div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-md">
									<span class="text-xs text-slate-500">À vie</span>
									<span class="text-sm font-semibold text-white tabular-nums">{{ Number(plan.priceLifetime).toFixed(2) }}</span>
									<a v-if="plan.stripePriceIdLifetime" :href="stripePriceUrl(plan.stripePriceIdLifetime)" target="_blank"
										class="ml-1 text-violet-400 hover:text-violet-300 transition-colors" title="Modifier sur Stripe">
										<Icon name="ph:arrow-square-out-bold" size="12" />
									</a>
									<span v-else class="ml-1 text-[10px] text-slate-600">non lié</span>
								</div>
								<div v-if="plan.trialDays > 0" class="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-md">
									<Icon name="ph:clock-countdown-bold" size="12" class="text-amber-400" />
									<span class="text-xs text-amber-400">{{ plan.trialDays }}j trial</span>
								</div>
							</div>

							<!-- Stripe IDs -->
							<div v-if="plan.stripeProductId" class="flex items-center gap-1.5 text-xs text-slate-600">
								<Icon name="ph:lightning-bold" size="12" class="text-violet-500" />
								<span class="font-mono">{{ plan.stripeProductId }}</span>
								<a :href="stripeProductUrl(plan.stripeProductId)" target="_blank" class="text-violet-500 hover:text-violet-400 transition-colors">
									<Icon name="ph:arrow-square-out-bold" size="11" />
								</a>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-1 shrink-0">
							<button @click="openEditPlanModal(plan)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors">
								<Icon name="ph:pencil-line-bold" size="14" />
							</button>
							<button @click="deletePlan(plan)" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
								<Icon name="ph:trash-bold" size="14" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ===== TAB: FLYERS ===== -->
		<div v-if="activeTab === 'flyers'" class="space-y-4">

			<!-- Info banner -->
			<div class="flex items-center gap-3 bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<Icon name="ph:info-bold" size="16" class="text-slate-500 shrink-0" />
				<p class="text-xs text-slate-500">{{ $t('admin.pricing.packs_info_description') }}</p>
			</div>

			<!-- Loading -->
			<div v-if="loadingFlyers" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>

			<!-- Empty -->
			<div v-else-if="packs.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:package-duotone" size="32" class="mb-2" />
				<p class="text-sm font-medium text-slate-400 mb-1">{{ $t('admin.pricing.no_packs') }}</p>
				<p class="text-xs text-slate-600 mb-4">{{ $t('admin.pricing.no_packs_description') }}</p>
				<button @click="openNewPackModal"
					class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="14" />
					{{ $t('admin.pricing.create_first_pack') }}
				</button>
			</div>

			<!-- Packs grid -->
			<div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<div v-for="pack in packs" :key="pack.id"
					class="group bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden flex flex-col"
					:class="!pack.active && 'opacity-50'">
					<div class="aspect-[4/3] bg-[#0d0e12] flex items-center justify-center overflow-hidden">
						<img :src="pack.image || '/images/flyer-pack-default.svg'" :alt="pack.name" class="w-full h-full object-cover" />
					</div>
					<div class="p-4 flex-1 flex flex-col">
						<h3 class="text-sm font-semibold text-white leading-snug mb-2">{{ pack.name }}</h3>
						<div class="flex items-baseline gap-2 mb-3">
							<span class="text-lg font-bold text-brand-400">{{ Number(pack.price).toFixed(0) }} {{ pack.currency }}</span>
							<span class="text-xs text-slate-500">· {{ pack.quantity }} {{ $t('admin.pricing.units') }}</span>
						</div>
						<div class="mt-auto flex items-center justify-between">
							<span class="inline-flex items-center gap-1 text-xs font-medium" :class="pack.active ? 'text-emerald-400' : 'text-slate-500'">
								<span class="w-1.5 h-1.5 rounded-full" :class="pack.active ? 'bg-emerald-400' : 'bg-slate-600'"></span>
								{{ pack.active ? $t('admin.pricing.active') : $t('admin.pricing.inactive') }}
							</span>
							<div class="flex items-center gap-1">
								<button @click="togglePackActive(pack)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors" :title="pack.active ? $t('admin.pricing.disable') : $t('admin.pricing.enable')">
									<Icon :name="pack.active ? 'ph:eye-slash-bold' : 'ph:eye-bold'" size="14" />
								</button>
								<button @click="openEditPackModal(pack)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors" :title="$t('admin.pricing.edit')">
									<Icon name="ph:pencil-line-bold" size="14" />
								</button>
								<button @click="deletePack(pack)" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" :title="$t('admin.pricing.delete')">
									<Icon name="ph:trash-bold" size="14" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ===== TAB: CREDITS ===== -->
		<div v-if="activeTab === 'credits'" class="space-y-4">

			<!-- Type filter -->
			<div class="flex gap-1.5">
				<button v-for="f in [{ id: 'all', label: $t('admin.pricing.credits_filter_all') }, { id: 'email', label: $t('admin.pricing.credits_filter_email') }, { id: 'sms', label: $t('admin.pricing.credits_filter_sms') }]"
					:key="f.id" @click="creditTypeFilter = f.id"
					class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors border"
					:class="creditTypeFilter === f.id
						? 'bg-white/[0.1] text-white border-white/[0.15]'
						: 'bg-[#161920] text-slate-400 border-white/[0.07] hover:text-slate-200'">
					{{ f.label }}
				</button>
			</div>

			<!-- Loading -->
			<div v-if="loadingCredits" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>

			<!-- Empty -->
			<div v-else-if="creditPacks.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:coins-duotone" size="32" class="mb-2" />
				<p class="text-sm font-medium text-slate-400 mb-1">{{ $t('admin.pricing.no_credit_packs') }}</p>
				<p class="text-xs text-slate-600 mb-4">{{ $t('admin.pricing.no_credit_packs_description') }}</p>
				<button @click="openNewCreditModal"
					class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="14" />
					{{ $t('admin.pricing.create_pack') }}
				</button>
			</div>

			<!-- Credits table -->
			<div v-else class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/[0.06]">
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.pricing.credits_table_pack') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.pricing.credits_table_type') }}</th>
							<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.pricing.credits_table_credits') }}</th>
							<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.pricing.credits_table_price') }}</th>
							<th class="px-4 py-3 text-center text-xs font-medium text-slate-500">{{ $t('admin.pricing.credits_table_status') }}</th>
							<th class="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/[0.04]">
						<tr v-for="pack in filteredCreditPacks" :key="pack.id" class="group hover:bg-white/[0.03] transition-colors">
							<td class="px-4 py-3">
								<p class="text-sm font-medium text-white">{{ pack.name }}</p>
								<p v-if="pack.description" class="text-xs text-slate-500 mt-0.5 max-w-[180px] truncate">{{ pack.description }}</p>
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border"
									:class="pack.type === 'email' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'">
									<Icon :name="pack.type === 'email' ? 'ph:envelope-bold' : 'ph:chat-circle-text-bold'" size="11" />
									{{ pack.type === 'email' ? $t('admin.pricing.credits_email') : $t('admin.pricing.credits_sms') }}
								</span>
							</td>
							<td class="px-4 py-3 text-right rtl:text-left">
								<span class="text-sm font-semibold text-white tabular-nums">{{ formatNumber(pack.creditAmount) }}</span>
							</td>
							<td class="px-4 py-3 text-right rtl:text-left">
								<span class="text-sm font-semibold text-brand-400 tabular-nums">{{ Number(pack.price).toFixed(2) }}</span>
								<span class="text-xs text-slate-500 ml-1">{{ pack.currency }}</span>
							</td>
							<td class="px-4 py-3 text-center">
								<span class="inline-flex items-center gap-1 text-xs font-medium"
									:class="pack.active ? 'text-emerald-400' : 'text-slate-500'">
									<span class="w-1.5 h-1.5 rounded-full" :class="pack.active ? 'bg-emerald-400' : 'bg-slate-600'"></span>
									{{ pack.active ? $t('admin.pricing.active') : $t('admin.pricing.inactive') }}
								</span>
							</td>
							<td class="px-4 py-3 text-right rtl:text-left">
								<div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button @click="toggleCreditActive(pack)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors" :title="pack.active ? $t('admin.pricing.disable') : $t('admin.pricing.enable')">
										<Icon :name="pack.active ? 'ph:eye-slash-bold' : 'ph:eye-bold'" size="14" />
									</button>
									<button @click="openEditCreditModal(pack)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors" :title="$t('admin.pricing.edit')">
										<Icon name="ph:pencil-line-bold" size="14" />
									</button>
									<button @click="deleteCreditPack(pack)" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" :title="$t('admin.pricing.delete')">
										<Icon name="ph:trash-bold" size="14" />
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- ===== MODAL: PLAN ===== -->
		<Teleport to="body">
			<div v-if="showPlanModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/70" @click="showPlanModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">{{ editingPlan ? 'Modifier le plan' : 'Nouveau plan' }}</h2>
						<button @click="showPlanModal = false" class="p-1.5 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>
					<div class="flex-1 overflow-y-auto p-5 space-y-4">

						<!-- Prix read-only si édition -->
						<div v-if="editingPlan" class="flex items-start gap-3 bg-violet-500/5 border border-violet-500/20 rounded-md px-3 py-2.5">
							<Icon name="ph:lock-bold" size="14" class="text-violet-400 shrink-0 mt-0.5" />
							<div>
								<p class="text-xs font-medium text-violet-300">Prix gérés par Stripe</p>
								<p class="text-[11px] text-slate-500 mt-0.5">Mensuel: <span class="text-white font-mono">{{ Number(editingPlan.priceMonthly).toFixed(2) }}</span> · Annuel: <span class="text-white font-mono">{{ Number(editingPlan.priceAnnual).toFixed(2) }}</span> · À vie: <span class="text-white font-mono">{{ Number(editingPlan.priceLifetime).toFixed(2) }}</span></p>
							</div>
						</div>

						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">Nom</label>
							<input v-model="planForm.name" type="text" required placeholder="Ex: Pro"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>

						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
							<input v-model="planForm.description" type="text" placeholder="Optionnel"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>

						<!-- Stripe IDs -->
						<div class="space-y-3">
							<p class="text-xs font-medium text-slate-400 flex items-center gap-1.5">
								<Icon name="ph:lightning-bold" size="13" class="text-violet-400" />
								Liaisons Stripe
							</p>
							<div>
								<label class="block text-[11px] text-slate-500 mb-1">Product ID</label>
								<input v-model="planForm.stripeProductId" type="text" placeholder="prod_..."
									class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-xs text-white font-mono placeholder-slate-600 focus:border-violet-500/40 focus:outline-none transition-colors" />
							</div>
							<div class="grid grid-cols-3 gap-2">
								<div>
									<label class="block text-[11px] text-slate-500 mb-1">Price mensuel</label>
									<input v-model="planForm.stripePriceIdMonthly" type="text" placeholder="price_..."
										class="w-full px-2 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] text-white font-mono placeholder-slate-600 focus:border-violet-500/40 focus:outline-none transition-colors" />
								</div>
								<div>
									<label class="block text-[11px] text-slate-500 mb-1">Price annuel</label>
									<input v-model="planForm.stripePriceIdAnnual" type="text" placeholder="price_..."
										class="w-full px-2 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] text-white font-mono placeholder-slate-600 focus:border-violet-500/40 focus:outline-none transition-colors" />
								</div>
								<div>
									<label class="block text-[11px] text-slate-500 mb-1">Price à vie</label>
									<input v-model="planForm.stripePriceIdLifetime" type="text" placeholder="price_..."
										class="w-full px-2 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] text-white font-mono placeholder-slate-600 focus:border-violet-500/40 focus:outline-none transition-colors" />
								</div>
							</div>
						</div>

						<div>
							<label class="block text-xs font-medium text-slate-400 mb-2">Features par période</label>
							<div class="flex gap-1 mb-2">
								<button v-for="tab in [{ id: 'monthly', label: 'Mensuel' }, { id: 'annual', label: 'Annuel' }, { id: 'lifetime', label: 'À vie' }]"
									:key="tab.id" type="button" @click="featuresTab = tab.id as any"
									class="px-3 py-1 rounded text-xs font-medium transition-colors border"
									:class="featuresTab === tab.id ? 'bg-white/[0.12] text-white border-white/[0.2]' : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-slate-300'">
									{{ tab.label }}
								</button>
							</div>
							<div class="space-y-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-md">
								<div>
									<label class="block text-[11px] font-medium text-slate-400 mb-1.5">Jeux actifs max</label>
									<input v-if="featuresTab === 'monthly'" v-model.number="planForm.featuresMonthly.max_games" type="number" min="0"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
									<input v-else-if="featuresTab === 'annual'" v-model.number="planForm.featuresAnnual.max_games" type="number" min="0"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
									<input v-else v-model.number="planForm.featuresLifetime.max_games" type="number" min="0"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
								</div>
								<div>
									<label class="block text-[11px] font-medium text-slate-400 mb-1.5">Emails inclus / mois</label>
									<input v-if="featuresTab === 'monthly'" v-model.number="planForm.featuresMonthly.email_credits_per_month" type="number" min="0"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
									<input v-else-if="featuresTab === 'annual'" v-model.number="planForm.featuresAnnual.email_credits_per_month" type="number" min="0"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
									<input v-else v-model.number="planForm.featuresLifetime.email_credits_per_month" type="number" min="0"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
								</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">Jours de trial</label>
								<input v-model.number="planForm.trialDays" type="number" min="0"
									class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
							<div class="flex flex-col justify-end gap-2">
								<label class="flex items-center gap-2 cursor-pointer">
									<div class="relative w-8 h-5">
										<input v-model="planForm.isDefault" type="checkbox" class="sr-only peer" />
										<div class="w-8 h-5 bg-white/[0.08] rounded-full peer-checked:bg-brand-500 transition-colors"></div>
										<div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-3 shadow-sm"></div>
									</div>
									<span class="text-xs text-slate-400">Plan par défaut</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<div class="relative w-8 h-5">
										<input v-model="planForm.active" type="checkbox" class="sr-only peer" />
										<div class="w-8 h-5 bg-white/[0.08] rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
										<div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-3 shadow-sm"></div>
									</div>
									<span class="text-xs text-slate-400">Actif</span>
								</label>
							</div>
						</div>

					</div>
					<div v-if="planError" class="mx-5 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-red-400">
						{{ planError }}
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
						<button @click="showPlanModal = false" class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							Annuler
						</button>
						<button @click="savePlan" class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-md transition-colors">
							{{ editingPlan ? 'Enregistrer' : 'Créer' }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ===== MODAL: FLYER ===== -->
		<Teleport to="body">
			<div v-if="showFlyerModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/70" @click="showFlyerModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">{{ editingPack ? $t('admin.pricing.pack_modal_edit_title') : $t('admin.pricing.pack_modal_add_title') }}</h2>
						<button @click="showFlyerModal = false" class="p-1.5 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>
					<div class="flex-1 overflow-y-auto p-5 space-y-4">
						<!-- Image -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.pack_image') }}</label>
							<div class="flex items-center gap-3">
								<div class="w-20 h-20 rounded-md bg-[#0d0e12] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
									<img :src="packForm.image || '/images/flyer-pack-default.svg'" class="w-full h-full object-cover" />
								</div>
								<label class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 cursor-pointer transition-colors">
									<Icon :name="uploadingImage ? 'svg-spinners:ring-resize' : 'ph:upload-simple-bold'" size="14" />
									{{ uploadingImage ? $t('admin.pricing.pack_image_uploading') : $t('admin.pricing.pack_image_choose') }}
									<input type="file" accept="image/*" class="hidden" @change="onPackImageSelected" :disabled="uploadingImage" />
								</label>
							</div>
						</div>
						<!-- Name -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.pack_name') }}</label>
							<input v-model="packForm.name" type="text" required :placeholder="$t('admin.pricing.pack_name_placeholder')"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>
						<!-- Quantity + Price -->
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.pack_quantity') }}</label>
								<input v-model.number="packForm.quantity" type="number" min="1" required
									class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.pack_price') }}</label>
								<div class="relative">
									<input v-model.number="packForm.price" type="number" min="0" step="0.01" required
										class="w-full pl-3 pr-14 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
									<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">MAD</span>
								</div>
							</div>
						</div>
						<!-- Active toggle -->
						<label class="flex items-center gap-3 cursor-pointer p-3 border border-white/[0.06] rounded-md hover:bg-white/[0.02] transition-colors">
							<div class="relative w-10 h-6 bg-white/[0.08] rounded-full transition-colors">
								<input v-model="packForm.active" type="checkbox" class="sr-only peer" />
								<div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
							</div>
							<div>
								<p class="text-xs font-medium text-white">{{ $t('admin.pricing.modal_active_label') }}</p>
								<p class="text-xs text-slate-500 mt-0.5">{{ packForm.active ? $t('admin.pricing.modal_active_visible') : $t('admin.pricing.modal_active_hidden') }}</p>
							</div>
						</label>
					</div>
					<div v-if="flyerError" class="mx-5 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-red-400">
						{{ flyerError }}
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
						<button @click="showFlyerModal = false" class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							{{ $t('admin.pricing.modal_cancel') }}
						</button>
						<button @click="savePack" class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-md transition-colors">
							{{ editingPack ? $t('admin.pricing.modal_save') : $t('admin.pricing.modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ===== MODAL: CREDIT PACK ===== -->
		<Teleport to="body">
			<div v-if="showCreditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/70" @click="showCreditModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">{{ editingCreditPack ? $t('admin.pricing.credits_modal_edit_title') : $t('admin.pricing.credits_modal_add_title') }}</h2>
						<button @click="showCreditModal = false" class="p-1.5 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>
					<div class="flex-1 overflow-y-auto p-5 space-y-4">
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.credits_modal_name') }}</label>
							<input v-model="creditForm.name" type="text" required :placeholder="$t('admin.pricing.credits_modal_name_placeholder')"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.credits_modal_description') }}</label>
							<textarea v-model="creditForm.description" rows="2" :placeholder="$t('admin.pricing.credits_modal_description_placeholder')"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors resize-none"></textarea>
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.credits_modal_type') }}</label>
							<div class="grid grid-cols-2 gap-2">
								<button type="button" @click="creditForm.type = 'email'"
									class="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors"
									:class="creditForm.type === 'email' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:bg-white/[0.08]'">
									<Icon name="ph:envelope-bold" size="15" />
									{{ $t('admin.pricing.credits_email') }}
								</button>
								<button type="button" @click="creditForm.type = 'sms'"
									class="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors"
									:class="creditForm.type === 'sms' ? 'bg-violet-500/10 text-violet-400 border-violet-500/30' : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:bg-white/[0.08]'">
									<Icon name="ph:chat-circle-text-bold" size="15" />
									{{ $t('admin.pricing.credits_sms') }}
								</button>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.credits_modal_amount') }}</label>
								<input v-model.number="creditForm.creditAmount" type="number" min="1" required
									class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.credits_modal_price') }}</label>
								<input v-model.number="creditForm.price" type="number" min="0" step="0.01" required
									class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-500 mb-1.5">{{ $t('admin.pricing.credits_modal_stripe_id') }}</label>
							<input v-model="creditForm.stripePriceId" type="text" :placeholder="$t('admin.pricing.credits_modal_stripe_placeholder')"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white font-mono placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>
						<label class="flex items-center gap-3 cursor-pointer p-3 border border-white/[0.06] rounded-md hover:bg-white/[0.02] transition-colors">
							<div class="relative w-10 h-6 bg-white/[0.08] rounded-full transition-colors">
								<input v-model="creditForm.active" type="checkbox" class="sr-only peer" />
								<div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm peer-checked:bg-emerald-400"></div>
							</div>
							<div>
								<p class="text-xs font-medium text-white">{{ $t('admin.pricing.credits_modal_active_label') }}</p>
								<p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.pricing.credits_modal_active_visible') }}</p>
							</div>
						</label>
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
						<button @click="showCreditModal = false" class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							{{ $t('admin.pricing.credits_modal_cancel') }}
						</button>
						<button @click="saveCreditPack" class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-md transition-colors">
							{{ editingCreditPack ? $t('admin.pricing.credits_modal_save') : $t('admin.pricing.credits_modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Modal info : changement de Price ID Stripe -->
		<Teleport to="body">
			<div v-if="showPriceChangeInfo" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/70" @click="showPriceChangeInfo = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
						<Icon name="ph:warning-circle-bold" size="18" class="text-amber-400 shrink-0" />
						<h2 class="text-base font-semibold text-white">{{ $t('admin.pricing.price_change_title') }}</h2>
					</div>
					<div class="p-5 space-y-4 text-sm text-slate-300 max-h-[70vh] overflow-y-auto">
						<p>{{ $t('admin.pricing.price_change_intro') }}</p>

						<div class="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-md px-3 py-2.5">
							<p class="text-xs font-semibold text-emerald-400 mb-0.5">{{ $t('admin.pricing.price_change_new_label') }}</p>
							<p class="text-xs text-slate-400">{{ $t('admin.pricing.price_change_new_desc') }}</p>
						</div>

						<div class="bg-amber-500/[0.08] border border-amber-500/20 rounded-md px-3 py-2.5">
							<p class="text-xs font-semibold text-amber-400 mb-0.5">{{ $t('admin.pricing.price_change_existing_label') }}</p>
							<p class="text-xs text-slate-400">{{ $t('admin.pricing.price_change_existing_desc') }}</p>
						</div>

						<div>
							<p class="text-xs font-semibold text-white mb-2">{{ $t('admin.pricing.price_change_steps_title') }}</p>
							<ol class="space-y-1.5 text-xs text-slate-400 list-decimal list-inside">
								<li>{{ $t('admin.pricing.price_change_step1') }}</li>
								<li>{{ $t('admin.pricing.price_change_step2') }}</li>
								<li>{{ $t('admin.pricing.price_change_step3') }}</li>
								<li>{{ $t('admin.pricing.price_change_step4') }}</li>
							</ol>
						</div>
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex justify-end">
						<button @click="showPriceChangeInfo = false" class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-md transition-colors">
							{{ $t('admin.pricing.price_change_understood') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>
