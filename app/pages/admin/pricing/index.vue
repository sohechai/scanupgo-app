<script setup lang="ts">
// ============================================
// TYPES
// ============================================
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

// ============================================
// TABS
// ============================================
const activeTab = ref('flyers')
const tabs = computed(() => [
	{ id: 'flyers', label: t('admin.pricing.tab_flyers'), icon: 'ph:files-bold' },
	{ id: 'credits', label: t('admin.pricing.tab_credits'), icon: 'ph:coins-bold' },
])

// ============================================
// FLYERS STATE
// ============================================
const pricings = ref<FlyerPricing[]>([])
const loadingFlyers = ref(true)
const showFlyerModal = ref(false)
const editingPricing = ref<FlyerPricing | null>(null)

const flyerForm = ref({
	productType: 'flyers',
	dimensions: 'A6',
	paperType: '135g_couche',
	minQuantity: 100,
	maxQuantity: null as number | null,
	unitPrice: 0,
	currency: 'MAD',
	active: true
})

const fetchPricings = async () => {
	loadingFlyers.value = true
	try {
		pricings.value = await $api('/flyer-pricing/admin?includeInactive=true')
	} catch (error) {
		console.error('Error fetching pricings:', error)
		toast.show(t('admin.pricing.loading'), 'error')
	} finally {
		loadingFlyers.value = false
	}
}

const groupedPricings = computed(() => {
	const groups: Record<string, Record<string, FlyerPricing[]>> = {}
	for (const pricing of pricings.value) {
		if (!groups[pricing.productType]) groups[pricing.productType] = {}
		const productGroup = groups[pricing.productType]!
		const key = `${pricing.dimensions} - ${pricing.paperType}`
		if (!productGroup[key]) productGroup[key] = []
		productGroup[key]!.push(pricing)
	}
	for (const productType in groups) {
		const productGroup = groups[productType]
		if (productGroup) {
			for (const key in productGroup) {
				productGroup[key]?.sort((a, b) => a.minQuantity - b.minQuantity)
			}
		}
	}
	return groups
})

const openNewFlyerModal = () => {
	editingPricing.value = null
	flyerForm.value = {
		productType: 'flyers',
		dimensions: 'A6',
		paperType: '135g_couche',
		minQuantity: 100,
		maxQuantity: null,
		unitPrice: 0,
		currency: 'MAD',
		active: true
	}
	showFlyerModal.value = true
}

const openEditFlyerModal = (pricing: FlyerPricing) => {
	editingPricing.value = pricing
	flyerForm.value = {
		productType: pricing.productType,
		dimensions: pricing.dimensions,
		paperType: pricing.paperType,
		minQuantity: pricing.minQuantity,
		maxQuantity: pricing.maxQuantity,
		unitPrice: pricing.unitPrice,
		currency: pricing.currency,
		active: pricing.active
	}
	showFlyerModal.value = true
}

const saveFlyer = async () => {
	try {
		if (editingPricing.value) {
			await $api(`/flyer-pricing/${editingPricing.value.id}`, { method: 'PATCH', body: flyerForm.value })
			toast.show(t('admin.pricing.modal_save'), 'success')
		} else {
			await $api('/flyer-pricing', { method: 'POST', body: flyerForm.value })
			toast.show(t('admin.pricing.modal_create'), 'success')
		}
		showFlyerModal.value = false
		await fetchPricings()
	} catch (error) {
		toast.show(t('admin.pricing.modal_save'), 'error')
	}
}

const deleteFlyer = async (pricing: FlyerPricing) => {
	if (!confirm(`${t('admin.pricing.delete')} ${pricing.dimensions} (${pricing.minQuantity}-${pricing.maxQuantity || '∞'}) ?`)) return
	try {
		await $api(`/flyer-pricing/${pricing.id}`, { method: 'DELETE' })
		toast.show(t('admin.pricing.delete'), 'success')
		await fetchPricings()
	} catch (error) {
		toast.show(t('admin.pricing.delete'), 'error')
	}
}

const toggleFlyerActive = async (pricing: FlyerPricing) => {
	try {
		await $api(`/flyer-pricing/${pricing.id}`, { method: 'PATCH', body: { active: !pricing.active } })
		await fetchPricings()
	} catch (error) {
		toast.show('Error', 'error')
	}
}

// ============================================
// CREDIT PACKS STATE
// ============================================
const creditPacks = ref<CreditPack[]>([])
const loadingCredits = ref(true)
const showCreditModal = ref(false)
const editingCreditPack = ref<CreditPack | null>(null)
const creditTypeFilter = ref('all')

const creditForm = ref({
	name: '',
	description: '',
	type: 'email',
	creditAmount: 100,
	price: 0,
	currency: 'MAD',
	stripePriceId: '',
	active: true,
})

const fetchCreditPacks = async () => {
	loadingCredits.value = true
	try {
		creditPacks.value = await $api('/admin/credit-packs')
	} catch (error) {
		console.error('Error fetching credit packs:', error)
		toast.show(t('admin.pricing.loading_credits'), 'error')
	} finally {
		loadingCredits.value = false
	}
}

const filteredCreditPacks = computed(() => {
	if (creditTypeFilter.value === 'all') return creditPacks.value
	return creditPacks.value.filter(p => p.type === creditTypeFilter.value)
})

const openNewCreditModal = () => {
	editingCreditPack.value = null
	creditForm.value = {
		name: '',
		description: '',
		type: 'email',
		creditAmount: 100,
		price: 0,
		currency: 'MAD',
		stripePriceId: '',
		active: true,
	}
	showCreditModal.value = true
}

const openEditCreditModal = (pack: CreditPack) => {
	editingCreditPack.value = pack
	creditForm.value = {
		name: pack.name,
		description: pack.description || '',
		type: pack.type,
		creditAmount: pack.creditAmount,
		price: Number(pack.price),
		currency: pack.currency,
		stripePriceId: pack.stripePriceId || '',
		active: pack.active,
	}
	showCreditModal.value = true
}

const saveCreditPack = async () => {
	try {
		const payload = {
			name: creditForm.value.name,
			description: creditForm.value.description || undefined,
			type: creditForm.value.type,
			creditAmount: creditForm.value.creditAmount,
			price: creditForm.value.price,
			currency: creditForm.value.currency,
			stripePriceId: creditForm.value.stripePriceId || undefined,
			active: creditForm.value.active,
		}

		if (editingCreditPack.value) {
			await $api(`/admin/credit-packs/${editingCreditPack.value.id}`, { method: 'PUT', body: payload })
			toast.show(t('admin.pricing.credits_modal_save'), 'success')
		} else {
			await $api('/admin/credit-packs', { method: 'POST', body: payload })
			toast.show(t('admin.pricing.credits_modal_create'), 'success')
		}
		showCreditModal.value = false
		await fetchCreditPacks()
	} catch (error) {
		toast.show(t('admin.pricing.credits_modal_save'), 'error')
	}
}

const deleteCreditPack = async (pack: CreditPack) => {
	if (!confirm(`${t('admin.pricing.delete')} "${pack.name}" ?`)) return
	try {
		await $api(`/admin/credit-packs/${pack.id}`, { method: 'DELETE' })
		toast.show(t('admin.pricing.delete'), 'success')
		await fetchCreditPacks()
	} catch (error) {
		toast.show(t('admin.pricing.delete'), 'error')
	}
}

const toggleCreditActive = async (pack: CreditPack) => {
	try {
		await $api(`/admin/credit-packs/${pack.id}`, { method: 'PUT', body: { active: !pack.active } })
		await fetchCreditPacks()
	} catch (error) {
		toast.show('Error', 'error')
	}
}

// ============================================
// NEW BUTTON HANDLER
// ============================================
const handleNew = () => {
	if (activeTab.value === 'flyers') openNewFlyerModal()
	else if (activeTab.value === 'credits') openNewCreditModal()
}

const newButtonLabel = computed(() => {
	if (activeTab.value === 'flyers') return t('admin.pricing.new_button')
	return t('admin.pricing.new_button_credit')
})

// ============================================
// INITIAL LOAD
// ============================================
onMounted(() => {
	fetchPricings()
	fetchCreditPacks()
})
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen animate-pulse-slow">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen animate-pulse-slow"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.pricing.title') }}</h1>
					<p class="text-slate-400 text-lg">
						{{ $t('admin.pricing.description') }}
					</p>
				</div>
				<button @click="handleNew"
					class="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all group">
					<Icon name="ph:plus-bold" class="group-hover:rotate-90 transition-transform duration-300" />
					{{ newButtonLabel }}
				</button>
			</div>

			<!-- Navbar Tabs -->
			<nav class="flex gap-2 p-1.5 bg-white/[0.03] rounded-2xl border border-white/10">
				<button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
					'flex items-center gap-3 px-5 py-3 rounded-xl text-sm transition-all duration-200 flex-1 justify-center',
					activeTab === tab.id
						? 'bg-white/10 text-white font-semibold shadow-sm ring-1 ring-white/10'
						: 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
				]">
					<Icon :name="tab.icon" size="18" :class="[
						'transition-colors',
						activeTab === tab.id ? 'text-white' : 'text-slate-500'
					]" />
					<span>{{ tab.label }}</span>
					<!-- Count badge -->
					<span v-if="tab.id === 'flyers' && pricings.length > 0" :class="[
						'px-2 py-0.5 rounded-md text-[10px] font-bold',
						activeTab === tab.id
							? 'bg-white/10 text-slate-300'
							: 'bg-white/5 text-slate-600'
					]">
						{{ pricings.length }}
					</span>
					<span v-if="tab.id === 'credits' && creditPacks.length > 0" :class="[
						'px-2 py-0.5 rounded-md text-[10px] font-bold',
						activeTab === tab.id
							? 'bg-white/10 text-slate-300'
							: 'bg-white/5 text-slate-600'
					]">
						{{ creditPacks.length }}
					</span>
				</button>
			</nav>

			<!-- ============================================ -->
			<!-- TAB: TARIFS FLYERS -->
			<!-- ============================================ -->
			<div v-if="activeTab === 'flyers'" class="space-y-6">
				<!-- Info Banner -->
				<div
					class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-white shadow-lg shadow-black/5">
					<div class="flex items-center gap-4">
						<div
							class="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
							<Icon name="ph:files-bold" size="28" />
						</div>
						<div>
							<h4 class="font-bold text-lg mb-1">{{ $t('admin.pricing.flyers_info_title') }}</h4>
							<p class="text-slate-400">{{ $t('admin.pricing.flyers_info_description') }}</p>
						</div>
					</div>
				</div>

				<!-- Loading -->
				<div v-if="loadingFlyers" class="py-24 flex flex-col items-center justify-center gap-4">
					<Icon name="svg-spinners:ring-resize" size="40" class="text-white/50" />
					<p class="text-sm font-bold text-slate-400">{{ $t('admin.pricing.loading') }}</p>
				</div>

				<!-- Empty State -->
				<div v-else-if="pricings.length === 0"
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-24 flex flex-col items-center justify-center text-center shadow-xl shadow-black/10 px-4">
					<div
						class="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-slate-600 border border-white/5">
						<Icon name="ph:tag-duotone" size="48" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">{{ $t('admin.pricing.no_pricing') }}</h3>
					<p class="text-slate-400 max-w-sm mx-auto mb-8 text-lg">
						{{ $t('admin.pricing.no_pricing_description') }}
					</p>
					<button @click="openNewFlyerModal"
						class="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-white/10">
						{{ $t('admin.pricing.create_first') }}
					</button>
				</div>

				<!-- Pricing Groups -->
				<div v-else class="space-y-8">
					<div v-for="(dimensionGroups, productType) in groupedPricings" :key="productType"
						class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
						<div class="bg-white/5 px-8 py-6 border-b border-white/10">
							<h2 class="text-xl font-bold text-white flex items-center gap-3">
								<Icon name="ph:package-duotone" size="24" class="text-slate-400" />
								{{ $t('admin.pricing.flyers_product') }}
							</h2>
						</div>
						<div class="divide-y divide-white/5">
							<div v-for="(pricingList, dimensionKey) in dimensionGroups" :key="dimensionKey"
								class="p-8">
								<h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">
									{{ dimensionKey }}
								</h3>
								<div class="overflow-x-auto">
									<table class="w-full">
										<thead>
											<tr
												class="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left border-b border-white/5">
												<th class="pb-4 pl-4">{{ $t('admin.pricing.quantity_range') }}</th>
												<th class="pb-4">{{ $t('admin.pricing.unit_price') }}</th>
												<th class="pb-4 text-center">{{ $t('admin.pricing.status') }}</th>
												<th class="pb-4 text-right rtl:text-left pr-4">{{ $t('admin.pricing.actions') }}</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-white/5">
											<tr v-for="pricing in pricingList" :key="pricing.id"
												class="group transition-colors hover:bg-white/5">
												<td class="py-5 pl-4 text-sm font-bold text-white">
													{{ pricing.minQuantity }} <span
														class="text-slate-500 mx-2">→</span>
													{{ pricing.maxQuantity || '∞' }}
													<span
														class="text-[10px] text-slate-500 uppercase ml-1">{{ $t('admin.pricing.units') }}</span>
												</td>
												<td class="py-5">
													<span class="text-lg font-bold text-brand-400">
														{{ Number(pricing.unitPrice).toFixed(2) }}
													</span>
													<span class="text-xs font-bold text-slate-500 uppercase ml-1">{{
														pricing.currency }}</span>
												</td>
												<td class="py-5">
													<div class="flex justify-center">
														<span :class="[
															'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
															pricing.active
																? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
																: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
														]">
															{{ pricing.active ? $t('admin.pricing.active') : $t('admin.pricing.inactive') }}
														</span>
													</div>
												</td>
												<td class="py-5 pr-4 text-right rtl:text-left">
													<div
														class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<button @click="toggleFlyerActive(pricing)"
															class="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
															:title="pricing.active ? $t('admin.pricing.disable') : $t('admin.pricing.enable')">
															<Icon
																:name="pricing.active ? 'ph:eye-slash-bold' : 'ph:eye-bold'"
																size="18" />
														</button>
														<button @click="openEditFlyerModal(pricing)"
															class="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
															:title="$t('admin.pricing.edit')">
															<Icon name="ph:pencil-line-bold" size="18" />
														</button>
														<button @click="deleteFlyer(pricing)"
															class="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
															:title="$t('admin.pricing.delete')">
															<Icon name="ph:trash-bold" size="18" />
														</button>
													</div>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ============================================ -->
			<!-- TAB: PACKS DE CREDITS -->
			<!-- ============================================ -->
			<div v-if="activeTab === 'credits'" class="space-y-6">
				<!-- Filter by type -->
				<div class="flex gap-2">
					<button
						v-for="f in [{ id: 'all', label: $t('admin.pricing.credits_filter_all') }, { id: 'email', label: $t('admin.pricing.credits_filter_email') }, { id: 'sms', label: $t('admin.pricing.credits_filter_sms') }]"
						:key="f.id" @click="creditTypeFilter = f.id" :class="[
							'px-4 py-2 rounded-lg text-sm font-bold transition-all border',
							creditTypeFilter === f.id
								? 'bg-white/10 text-white border-white/20'
								: 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
						]">
						{{ f.label }}
					</button>
				</div>

				<!-- Loading -->
				<div v-if="loadingCredits" class="py-24 flex flex-col items-center justify-center gap-4">
					<Icon name="svg-spinners:ring-resize" size="40" class="text-white/50" />
					<p class="text-sm font-bold text-slate-400">{{ $t('admin.pricing.loading_credits') }}</p>
				</div>

				<!-- Empty State -->
				<div v-else-if="creditPacks.length === 0"
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-24 flex flex-col items-center justify-center text-center shadow-xl shadow-black/10 px-4">
					<div
						class="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-slate-600 border border-white/5">
						<Icon name="ph:coins-duotone" size="48" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">{{ $t('admin.pricing.no_credit_packs') }}</h3>
					<p class="text-slate-400 max-w-sm mx-auto mb-8 text-lg">{{ $t('admin.pricing.no_credit_packs_description') }}
					</p>
					<button @click="openNewCreditModal"
						class="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-white/10">
						{{ $t('admin.pricing.create_pack') }}
					</button>
				</div>

				<!-- Credit Packs Table -->
				<div v-else
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-white/5 border-b border-white/10">
								<tr>
									<th
										class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.pricing.credits_table_pack') }}</th>
									<th
										class="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.pricing.credits_table_type') }}</th>
									<th
										class="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.pricing.credits_table_credits') }}</th>
									<th
										class="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.pricing.credits_table_price') }}</th>
									<th
										class="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.pricing.credits_table_status') }}</th>
									<th
										class="px-6 py-4 text-right rtl:text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.pricing.credits_table_actions') }}</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								<tr v-for="pack in filteredCreditPacks" :key="pack.id"
									class="group transition-colors hover:bg-white/5">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="font-bold text-white">{{ pack.name }}</div>
										<div v-if="pack.description"
											class="text-xs text-slate-500 mt-1 max-w-[200px] truncate">
											{{ pack.description }}
										</div>
									</td>
									<td class="px-6 py-4 text-center whitespace-nowrap">
										<span :class="[
											'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border',
											pack.type === 'email'
												? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
												: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
										]">
											{{ pack.type === 'email' ? $t('admin.pricing.credits_email') : $t('admin.pricing.credits_sms') }}
										</span>
									</td>
									<td class="px-6 py-4 text-center whitespace-nowrap">
										<span class="text-lg font-bold text-white">{{
											formatNumber(pack.creditAmount) }}</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="text-lg font-bold text-brand-400">{{
											Number(pack.price).toFixed(2) }}</span>
										<span class="text-xs font-bold text-slate-500 uppercase ml-1">{{ pack.currency
										}}</span>
									</td>
									<td class="px-6 py-4 text-center whitespace-nowrap">
										<span :class="[
											'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
											pack.active
												? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
												: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
										]">
											{{ pack.active ? $t('admin.pricing.active') : $t('admin.pricing.inactive') }}
										</span>
									</td>
									<td class="px-6 py-4 text-right rtl:text-left whitespace-nowrap">
										<div
											class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<button @click="toggleCreditActive(pack)"
												class="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
												:title="pack.active ? $t('admin.pricing.disable') : $t('admin.pricing.enable')">
												<Icon :name="pack.active ? 'ph:eye-slash-bold' : 'ph:eye-bold'"
													size="18" />
											</button>
											<button @click="openEditCreditModal(pack)"
												class="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
												:title="$t('admin.pricing.edit')">
												<Icon name="ph:pencil-line-bold" size="18" />
											</button>
											<button @click="deleteCreditPack(pack)"
												class="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
												:title="$t('admin.pricing.delete')">
												<Icon name="ph:trash-bold" size="18" />
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>

		<!-- ============================================ -->
		<!-- MODAL: FLYER PRICING -->
		<!-- ============================================ -->
		<Teleport to="body">
			<div v-if="showFlyerModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/80 backdrop-blur-md" @click="showFlyerModal = false"></div>
				<div
					class="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
					<!-- Header -->
					<div class="px-8 py-6 border-b border-white/10">
						<div class="flex items-center justify-between">
							<h2 class="text-2xl font-bold text-white">
								{{ editingPricing ? $t('admin.pricing.modal_edit_title') : $t('admin.pricing.modal_add_title') }}
							</h2>
							<button @click="showFlyerModal = false"
								class="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
								<Icon name="ph:x-bold" size="20" />
							</button>
						</div>
					</div>

					<!-- Content -->
					<div class="flex-1 overflow-y-auto p-8">
						<form @submit.prevent="saveFlyer" class="space-y-8">
							<!-- Fixed Product Info -->
							<div class="bg-white/5 rounded-xl p-5 border border-white/10">
								<div class="flex items-center gap-4">
									<Icon name="ph:files-bold" size="26" class="text-brand-400" />
									<div>
										<p class="font-bold text-white text-lg">{{ $t('admin.pricing.modal_product_info') }}</p>
										<p class="text-xs text-slate-400 mt-1">{{ $t('admin.pricing.modal_product_description') }}</p>
									</div>
								</div>
							</div>

							<!-- Quantity Range -->
							<div class="grid grid-cols-2 gap-6">
								<div class="space-y-2">
									<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.modal_min_quantity') }}</label>
									<input v-model.number="flyerForm.minQuantity" type="number" min="1" required
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all" />
								</div>
								<div class="space-y-2">
									<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.modal_max_quantity') }}</label>
									<input v-model.number="flyerForm.maxQuantity" type="number" min="1"
										:placeholder="$t('admin.pricing.modal_max_quantity_placeholder')"
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600" />
								</div>
							</div>

							<!-- Price -->
							<div class="space-y-2">
								<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.modal_unit_price') }}</label>
								<div class="relative">
									<input v-model.number="flyerForm.unitPrice" type="number" min="0" step="0.01"
										required
										class="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-lg font-bold text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all" />
									<div
										class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
										MAD</div>
								</div>
							</div>

							<!-- Active -->
							<label
								class="flex items-center gap-4 cursor-pointer group p-4 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
								<div
									class="relative w-12 h-7 bg-white/10 rounded-full transition-colors group-has-[:checked]:bg-emerald-500">
									<input v-model="flyerForm.active" type="checkbox" class="sr-only peer" />
									<div
										class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm">
									</div>
								</div>
								<div>
									<span class="block text-sm font-bold text-white">{{ $t('admin.pricing.modal_active_label') }}</span>
									<span class="block text-xs text-slate-400 mt-0.5" v-if="flyerForm.active">{{ $t('admin.pricing.modal_active_visible') }}</span>
									<span class="block text-xs text-slate-400 mt-0.5" v-else>{{ $t('admin.pricing.modal_active_hidden') }}</span>
								</div>
							</label>
						</form>
					</div>

					<!-- Footer -->
					<div class="px-8 py-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
						<button @click="showFlyerModal = false"
							class="px-6 py-2.5 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors">
							{{ $t('admin.pricing.modal_cancel') }}
						</button>
						<button @click="saveFlyer"
							class="px-8 py-2.5 bg-white text-slate-900 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
							{{ editingPricing ? $t('admin.pricing.modal_save') : $t('admin.pricing.modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ============================================ -->
		<!-- MODAL: CREDIT PACK -->
		<!-- ============================================ -->
		<Teleport to="body">
			<div v-if="showCreditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/80 backdrop-blur-md" @click="showCreditModal = false"></div>
				<div
					class="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
					<!-- Header -->
					<div class="px-8 py-6 border-b border-white/10">
						<div class="flex items-center justify-between">
							<h2 class="text-2xl font-bold text-white">
								{{ editingCreditPack ? $t('admin.pricing.credits_modal_edit_title') : $t('admin.pricing.credits_modal_add_title') }}
							</h2>
							<button @click="showCreditModal = false"
								class="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
								<Icon name="ph:x-bold" size="20" />
							</button>
						</div>
					</div>

					<!-- Content -->
					<div class="flex-1 overflow-y-auto p-8">
						<form @submit.prevent="saveCreditPack" class="space-y-6">
							<!-- Name -->
							<div class="space-y-2">
								<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.credits_modal_name') }}</label>
								<input v-model="creditForm.name" type="text" required :placeholder="$t('admin.pricing.credits_modal_name_placeholder')"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600" />
							</div>

							<!-- Description -->
							<div class="space-y-2">
								<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.credits_modal_description') }}</label>
								<textarea v-model="creditForm.description" rows="2"
									:placeholder="$t('admin.pricing.credits_modal_description_placeholder')"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600 resize-none"></textarea>
							</div>

							<!-- Type -->
							<div class="space-y-2">
								<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.credits_modal_type') }}</label>
								<div class="grid grid-cols-2 gap-3">
									<button type="button" @click="creditForm.type = 'email'" :class="[
										'flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border transition-all',
										creditForm.type === 'email'
											? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
											: 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
									]">
										<Icon name="ph:envelope-bold" size="18" />
										{{ $t('admin.pricing.credits_email') }}
									</button>
									<button type="button" @click="creditForm.type = 'sms'" :class="[
										'flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border transition-all',
										creditForm.type === 'sms'
											? 'bg-violet-500/10 text-violet-400 border-violet-500/30'
											: 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
									]">
										<Icon name="ph:chat-circle-text-bold" size="18" />
										{{ $t('admin.pricing.credits_sms') }}
									</button>
								</div>
							</div>

							<!-- Credits + Price -->
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.credits_modal_amount') }}</label>
									<input v-model.number="creditForm.creditAmount" type="number" min="1" required
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all" />
								</div>
								<div class="space-y-2">
									<label class="block text-sm font-bold text-slate-300">{{ $t('admin.pricing.credits_modal_price') }}</label>
									<input v-model.number="creditForm.price" type="number" min="0" step="0.01" required
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all" />
								</div>
							</div>

							<!-- Stripe Price ID -->
							<div class="space-y-2">
								<label class="block text-xs font-bold text-slate-500">{{ $t('admin.pricing.credits_modal_stripe_id') }}</label>
								<input v-model="creditForm.stripePriceId" type="text" :placeholder="$t('admin.pricing.credits_modal_stripe_placeholder')"
									class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600" />
							</div>

							<!-- Active -->
							<label
								class="flex items-center gap-4 cursor-pointer group p-4 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
								<div
									class="relative w-12 h-7 bg-white/10 rounded-full transition-colors group-has-[:checked]:bg-emerald-500">
									<input v-model="creditForm.active" type="checkbox" class="sr-only peer" />
									<div
										class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm">
									</div>
								</div>
								<div>
									<span class="block text-sm font-bold text-white">{{ $t('admin.pricing.credits_modal_active_label') }}</span>
									<span class="block text-xs text-slate-400 mt-0.5">{{ $t('admin.pricing.credits_modal_active_visible') }}</span>
								</div>
							</label>
						</form>
					</div>

					<!-- Footer -->
					<div class="px-8 py-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
						<button @click="showCreditModal = false"
							class="px-6 py-2.5 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors">
							{{ $t('admin.pricing.credits_modal_cancel') }}
						</button>
						<button @click="saveCreditPack"
							class="px-8 py-2.5 bg-white text-slate-900 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
							{{ editingCreditPack ? $t('admin.pricing.credits_modal_save') : $t('admin.pricing.credits_modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>
