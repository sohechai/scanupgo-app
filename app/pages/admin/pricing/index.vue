<script setup lang="ts">
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
const activeTab = ref('flyers')
const tabs = computed(() => [
	{ id: 'flyers', label: t('admin.pricing.tab_flyers'), icon: 'ph:files-bold' },
	{ id: 'credits', label: t('admin.pricing.tab_credits'), icon: 'ph:coins-bold' },
])

// Flyers
const pricings = ref<FlyerPricing[]>([])
const loadingFlyers = ref(true)
const showFlyerModal = ref(false)
const editingPricing = ref<FlyerPricing | null>(null)
const flyerForm = ref({ productType: 'flyers', dimensions: 'A6', paperType: '135g_couche', minQuantity: 100, maxQuantity: null as number | null, unitPrice: 0, currency: 'MAD', active: true })

const fetchPricings = async () => {
	loadingFlyers.value = true
	try { pricings.value = await $api('/flyer-pricing/admin?includeInactive=true') }
	catch { toast.show(t('admin.pricing.loading'), 'error') }
	finally { loadingFlyers.value = false }
}

const groupedPricings = computed(() => {
	const groups: Record<string, Record<string, FlyerPricing[]>> = {}
	for (const pricing of pricings.value) {
		if (!groups[pricing.productType]) groups[pricing.productType] = {}
		const key = `${pricing.dimensions} - ${pricing.paperType}`
		if (!groups[pricing.productType]![key]) groups[pricing.productType]![key] = []
		groups[pricing.productType]![key]!.push(pricing)
	}
	for (const pt in groups) for (const k in groups[pt]) groups[pt]![k]?.sort((a, b) => a.minQuantity - b.minQuantity)
	return groups
})

const openNewFlyerModal = () => {
	editingPricing.value = null
	flyerForm.value = { productType: 'flyers', dimensions: 'A6', paperType: '135g_couche', minQuantity: 100, maxQuantity: null, unitPrice: 0, currency: 'MAD', active: true }
	showFlyerModal.value = true
}

const openEditFlyerModal = (p: FlyerPricing) => {
	editingPricing.value = p
	flyerForm.value = { productType: p.productType, dimensions: p.dimensions, paperType: p.paperType, minQuantity: p.minQuantity, maxQuantity: p.maxQuantity, unitPrice: p.unitPrice, currency: p.currency, active: p.active }
	showFlyerModal.value = true
}

const saveFlyer = async () => {
	try {
		if (editingPricing.value) { await $api(`/flyer-pricing/${editingPricing.value.id}`, { method: 'PATCH', body: flyerForm.value }); toast.show(t('admin.pricing.modal_save'), 'success') }
		else { await $api('/flyer-pricing', { method: 'POST', body: flyerForm.value }); toast.show(t('admin.pricing.modal_create'), 'success') }
		showFlyerModal.value = false
		await fetchPricings()
	} catch (e: any) { toast.show(e?.data?.message || e?.message || t('admin.pricing.modal_save'), 'error') }
}

const deleteFlyer = async (p: FlyerPricing) => {
	if (!confirm(`${t('admin.pricing.delete')} ${p.dimensions} (${p.minQuantity}-${p.maxQuantity || '∞'}) ?`)) return
	try { await $api(`/flyer-pricing/${p.id}`, { method: 'DELETE' }); toast.show(t('admin.pricing.delete'), 'success'); await fetchPricings() }
	catch { toast.show(t('admin.pricing.delete'), 'error') }
}

const toggleFlyerActive = async (p: FlyerPricing) => {
	try { await $api(`/flyer-pricing/${p.id}`, { method: 'PATCH', body: { active: !p.active } }); await fetchPricings() }
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

const handleNew = () => activeTab.value === 'flyers' ? openNewFlyerModal() : openNewCreditModal()
const newButtonLabel = computed(() => activeTab.value === 'flyers' ? t('admin.pricing.new_button') : t('admin.pricing.new_button_credit'))

onMounted(() => { fetchPricings(); fetchCreditPacks() })
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.pricing.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.pricing.description') }}</p>
			</div>
			<button @click="handleNew"
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
				<span v-if="tab.id === 'flyers' && pricings.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ pricings.length }}</span>
				<span v-if="tab.id === 'credits' && creditPacks.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ creditPacks.length }}</span>
			</button>
		</div>

		<!-- ===== TAB: FLYERS ===== -->
		<div v-if="activeTab === 'flyers'" class="space-y-4">

			<!-- Info banner -->
			<div class="flex items-center gap-3 bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<Icon name="ph:info-bold" size="16" class="text-slate-500 shrink-0" />
				<p class="text-xs text-slate-500">{{ $t('admin.pricing.flyers_info_description') }}</p>
			</div>

			<!-- Loading -->
			<div v-if="loadingFlyers" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>

			<!-- Empty -->
			<div v-else-if="pricings.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:tag-duotone" size="32" class="mb-2" />
				<p class="text-sm font-medium text-slate-400 mb-1">{{ $t('admin.pricing.no_pricing') }}</p>
				<p class="text-xs text-slate-600 mb-4">{{ $t('admin.pricing.no_pricing_description') }}</p>
				<button @click="openNewFlyerModal"
					class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="14" />
					{{ $t('admin.pricing.create_first') }}
				</button>
			</div>

			<!-- Pricing groups -->
			<div v-else class="space-y-4">
				<div v-for="(dimensionGroups, productType) in groupedPricings" :key="productType"
					class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
					<div class="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
						<Icon name="ph:package-duotone" size="16" class="text-slate-500" />
						<h2 class="text-sm font-semibold text-white">{{ $t('admin.pricing.flyers_product') }}</h2>
					</div>
					<div class="divide-y divide-white/[0.04]">
						<div v-for="(pricingList, dimensionKey) in dimensionGroups" :key="dimensionKey" class="px-4 py-4">
							<p class="text-xs font-medium text-slate-500 mb-3">{{ dimensionKey }}</p>
							<table class="w-full">
								<thead>
									<tr class="border-b border-white/[0.06]">
										<th class="pb-2 text-left text-xs font-medium text-slate-500">{{ $t('admin.pricing.quantity_range') }}</th>
										<th class="pb-2 text-left text-xs font-medium text-slate-500">{{ $t('admin.pricing.unit_price') }}</th>
										<th class="pb-2 text-center text-xs font-medium text-slate-500">{{ $t('admin.pricing.status') }}</th>
										<th class="pb-2 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.pricing.actions') }}</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-white/[0.04]">
									<tr v-for="pricing in pricingList" :key="pricing.id" class="group hover:bg-white/[0.02] transition-colors">
										<td class="py-3 text-sm font-medium text-white">
											{{ pricing.minQuantity }} <span class="text-slate-600 mx-1">–</span> {{ pricing.maxQuantity || '∞' }}
											<span class="text-xs text-slate-600 ml-1">{{ $t('admin.pricing.units') }}</span>
										</td>
										<td class="py-3">
											<span class="text-sm font-semibold text-brand-400">{{ Number(pricing.unitPrice).toFixed(2) }}</span>
											<span class="text-xs text-slate-500 ml-1">{{ pricing.currency }}</span>
										</td>
										<td class="py-3 text-center">
											<span class="inline-flex items-center gap-1 text-xs font-medium"
												:class="pricing.active ? 'text-emerald-400' : 'text-slate-500'">
												<span class="w-1.5 h-1.5 rounded-full" :class="pricing.active ? 'bg-emerald-400' : 'bg-slate-600'"></span>
												{{ pricing.active ? $t('admin.pricing.active') : $t('admin.pricing.inactive') }}
											</span>
										</td>
										<td class="py-3 text-right rtl:text-left">
											<div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<button @click="toggleFlyerActive(pricing)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors" :title="pricing.active ? $t('admin.pricing.disable') : $t('admin.pricing.enable')">
													<Icon :name="pricing.active ? 'ph:eye-slash-bold' : 'ph:eye-bold'" size="14" />
												</button>
												<button @click="openEditFlyerModal(pricing)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors" :title="$t('admin.pricing.edit')">
													<Icon name="ph:pencil-line-bold" size="14" />
												</button>
												<button @click="deleteFlyer(pricing)" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" :title="$t('admin.pricing.delete')">
													<Icon name="ph:trash-bold" size="14" />
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

		<!-- ===== MODAL: FLYER ===== -->
		<Teleport to="body">
			<div v-if="showFlyerModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/70" @click="showFlyerModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">{{ editingPricing ? $t('admin.pricing.modal_edit_title') : $t('admin.pricing.modal_add_title') }}</h2>
						<button @click="showFlyerModal = false" class="p-1.5 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>
					<div class="flex-1 overflow-y-auto p-5 space-y-4">
						<!-- Product info -->
						<div class="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2.5">
							<Icon name="ph:files-bold" size="16" class="text-brand-400 shrink-0" />
							<div>
								<p class="text-xs font-medium text-white">{{ $t('admin.pricing.modal_product_info') }}</p>
								<p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.pricing.modal_product_description') }}</p>
							</div>
						</div>
						<!-- Quantity Range -->
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.modal_min_quantity') }}</label>
								<input v-model.number="flyerForm.minQuantity" type="number" min="1" required
									class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.modal_max_quantity') }}</label>
								<input v-model.number="flyerForm.maxQuantity" type="number" min="1" :placeholder="$t('admin.pricing.modal_max_quantity_placeholder')"
									class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
							</div>
						</div>
						<!-- Price -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.pricing.modal_unit_price') }}</label>
							<div class="relative">
								<input v-model.number="flyerForm.unitPrice" type="number" min="0" step="0.01" required
									class="w-full pl-3 pr-14 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
								<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">MAD</span>
							</div>
						</div>
						<!-- Active toggle -->
						<label class="flex items-center gap-3 cursor-pointer p-3 border border-white/[0.06] rounded-md hover:bg-white/[0.02] transition-colors">
							<div class="relative w-10 h-6 bg-white/[0.08] rounded-full transition-colors group-has-[:checked]:bg-emerald-500">
								<input v-model="flyerForm.active" type="checkbox" class="sr-only peer" />
								<div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm"></div>
							</div>
							<div>
								<p class="text-xs font-medium text-white">{{ $t('admin.pricing.modal_active_label') }}</p>
								<p class="text-xs text-slate-500 mt-0.5">{{ flyerForm.active ? $t('admin.pricing.modal_active_visible') : $t('admin.pricing.modal_active_hidden') }}</p>
							</div>
						</label>
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
						<button @click="showFlyerModal = false" class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							{{ $t('admin.pricing.modal_cancel') }}
						</button>
						<button @click="saveFlyer" class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-md transition-colors">
							{{ editingPricing ? $t('admin.pricing.modal_save') : $t('admin.pricing.modal_create') }}
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
	</div>
</template>
