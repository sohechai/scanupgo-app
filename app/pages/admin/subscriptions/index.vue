<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { t } = useI18n()
const { formatDate, formatNumber } = useLocaleDate()
useHead({ title: t('admin.subscriptions.title') })

const { $api } = useNuxtApp()
const toast = useToast()

// Tabs
const activeTab = ref('subscriptions')
const tabs = computed(() => [
	{ id: 'subscriptions', label: t('admin.subscriptions.tab_subscriptions'), icon: 'ph:crown-bold' },
	{ id: 'manual', label: 'Accès manuels', icon: 'ph:user-circle-gear-bold' },
])

// Subscriptions
const subscriptions = ref<any[]>([])
const loadingSubs = ref(true)

const fetchSubscriptions = async () => {
	loadingSubs.value = true
	try { subscriptions.value = await $api<any[]>('/admin/subscriptions') }
	catch (e) { console.error(e) }
	finally { loadingSubs.value = false }
}

const stats = computed(() => ({
	total: subscriptions.value.length,
	active: subscriptions.value.filter(s => s.status === 'active').length,
	monthlyRevenue: subscriptions.value.filter(s => s.status === 'active' && s.billingPeriod === 'monthly').reduce((sum, s) => sum + s.price, 0),
	annualRevenue: subscriptions.value.filter(s => s.status === 'active' && s.billingPeriod === 'annual').reduce((sum, s) => sum + s.price, 0),
}))

const getStatusLabel = (status: string) => {
	switch (status) {
		case 'active': return t('admin.subscriptions.status_active')
		case 'past_due': return t('admin.subscriptions.status_past_due')
		case 'canceled': return t('admin.subscriptions.status_canceled')
		case 'expired': return t('admin.subscriptions.status_expired')
		default: return status
	}
}

const getPeriodLabel = (period: string) => {
	switch (period) {
		case 'monthly': return t('admin.subscriptions.period_monthly')
		case 'annual': return t('admin.subscriptions.period_annual')
		case 'lifetime': return t('admin.subscriptions.period_lifetime')
		default: return period
	}
}


// Plans (for grant modal selector only)
const plans = ref<{ id: string; name: string }[]>([])
const fetchPlans = async () => {
	try { plans.value = await $api('/admin/plans') }
	catch { /* silently fail */ }
}

// Manual access
const manualSubs = computed(() => subscriptions.value.filter(s => !s.stripeSubscriptionId))

// Filtres de la liste des abonnements
const subSearch = ref('')
const subStatusFilter = ref('')
const subPeriodFilter = ref('')
const subSourceFilter = ref('')
const hasSubFilters = computed(() => !!(subSearch.value || subStatusFilter.value || subPeriodFilter.value || subSourceFilter.value))
const clearSubFilters = () => { subSearch.value = ''; subStatusFilter.value = ''; subPeriodFilter.value = ''; subSourceFilter.value = '' }
const filteredSubscriptions = computed(() => {
	const q = subSearch.value.trim().toLowerCase()
	return subscriptions.value.filter(s => {
		if (subStatusFilter.value && s.status !== subStatusFilter.value) return false
		if (subPeriodFilter.value && s.billingPeriod !== subPeriodFilter.value) return false
		if (subSourceFilter.value === 'stripe' && !s.stripeSubscriptionId) return false
		if (subSourceFilter.value === 'manual' && s.stripeSubscriptionId) return false
		if (q && !(`${s.businessName} ${s.businessEmail || ''}`.toLowerCase().includes(q))) return false
		return true
	})
})
const showGrantModal = ref(false)
const grantLoading = ref(false)
const businessesLoading = ref(false)
const allBusinesses = ref<any[]>([])
const grantForm = ref({ businessId: '', planId: '', billingPeriod: 'lifetime', expiresAt: '' })

const fetchBusinesses = async () => {
	businessesLoading.value = true
	try {
		const res = await $api<any>('/admin/businesses?limit=500')
		allBusinesses.value = Array.isArray(res) ? res : (res.businesses ?? [])
	} catch (e) {
		console.error('fetchBusinesses error:', e)
		toast.show('Erreur lors du chargement des businesses', 'error')
	} finally {
		businessesLoading.value = false
	}
}

const openGrantModal = () => { grantForm.value = { businessId: '', planId: '', billingPeriod: 'lifetime', expiresAt: '' }; fetchBusinesses(); showGrantModal.value = true }

const submitGrant = async () => {
	if (!grantForm.value.businessId || !grantForm.value.planId) return
	grantLoading.value = true
	try {
		await $api('/admin/subscriptions/grant', { method: 'POST', body: { businessId: grantForm.value.businessId, planId: grantForm.value.planId, billingPeriod: grantForm.value.billingPeriod, expiresAt: grantForm.value.expiresAt || undefined } })
		toast.show("Accès accordé avec succès", 'success')
		showGrantModal.value = false
		await fetchSubscriptions()
	} catch (e: any) {
		if (e?.status === 409) {
			toast.show("Cet utilisateur a déjà un abonnement Stripe actif. Annulez-le depuis le dashboard Stripe avant d'accorder un abonnement manuel.", 'error')
		} else {
			toast.show(e?.data?.message || "Erreur lors de l'attribution", 'error')
		}
	} finally { grantLoading.value = false }
}

const formatDateShort = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
const daysUntil = (d: string | null) => {
	if (!d) return null
	const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
	return diff > 0 ? diff : 0
}

// --- CONFIRM MODAL ---
const showConfirmModal = ref(false)
const confirmConfig = ref({ title: '', message: '', label: '', action: async () => {} })
const confirmLoading = ref(false)

const openConfirm = (title: string, message: string, label: string, action: () => Promise<void>) => {
	confirmConfig.value = { title, message, label, action }
	showConfirmModal.value = true
}

const runConfirm = async () => {
	confirmLoading.value = true
	try { await confirmConfig.value.action(); showConfirmModal.value = false }
	finally { confirmLoading.value = false }
}

const revokeLoading = ref<string | null>(null)
const revokeSubscription = (sub: any) => {
	openConfirm(
		`Révoquer l'accès de "${sub.businessName}" ?`,
		'L\'abonnement sera immédiatement désactivé. Le commerce perdra l\'accès à toutes les fonctionnalités premium.',
		'Révoquer',
		async () => {
			revokeLoading.value = sub.id
			try { await $api(`/admin/subscriptions/${sub.id}/revoke`, { method: 'POST' }); toast.show("Accès révoqué", 'success'); await fetchSubscriptions() }
			catch (e: any) { toast.show(e?.data?.message || "Erreur lors de la révocation", 'error') }
			finally { revokeLoading.value = null }
		}
	)
}

const handleNew = () => { if (activeTab.value === 'manual') openGrantModal() }

onMounted(() => { fetchSubscriptions(); fetchPlans() })
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.subscriptions.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.subscriptions.description') }}</p>
			</div>
			<div class="flex gap-2">
				<button v-if="activeTab === 'subscriptions'"
					class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:download-bold" size="14" />
					{{ $t('admin.subscriptions.export_button') }}
				</button>
<button v-if="activeTab === 'manual'" @click="openGrantModal"
					class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="15" />
					Accorder l'accès
				</button>
			</div>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg w-fit">
			<button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
				class="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors"
				:class="activeTab === tab.id ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'">
				<Icon :name="tab.icon" size="15" />
				{{ tab.label }}
				<span v-if="tab.id === 'subscriptions' && subscriptions.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ subscriptions.length }}</span>
				<span v-if="tab.id === 'manual' && manualSubs.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ manualSubs.length }}</span>
			</button>
		</div>

		<!-- ===== TAB: ABONNEMENTS ===== -->
		<div v-if="activeTab === 'subscriptions'" class="space-y-4">
			<!-- Stats -->
			<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.subscriptions.stats_total') }}</p>
					<p class="text-2xl font-semibold text-white tabular-nums">{{ stats.total }}</p>
				</div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.subscriptions.stats_active') }}</p>
					<p class="text-2xl font-semibold text-emerald-400 tabular-nums">{{ stats.active }}</p>
				</div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.subscriptions.stats_monthly_revenue') }}</p>
					<p class="text-2xl font-semibold text-white tabular-nums">{{ formatNumber(stats.monthlyRevenue) }} Dhs</p>
				</div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.subscriptions.stats_annual_revenue') }}</p>
					<p class="text-2xl font-semibold text-white tabular-nums">{{ formatNumber(stats.annualRevenue) }} Dhs</p>
				</div>
			</div>

			<!-- Filtres -->
			<div v-if="!loadingSubs && subscriptions.length > 0" class="flex flex-col lg:flex-row gap-3">
				<div class="relative flex-1">
					<Icon name="ph:magnifying-glass-bold" size="15" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
					<input v-model="subSearch" type="text" :placeholder="$t('admin.subscriptions.filter_search')"
						class="w-full pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
				</div>
				<div class="relative">
					<select v-model="subStatusFilter" class="w-full pl-3 pr-9 rtl:pl-9 rtl:pr-3 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors appearance-none cursor-pointer">
						<option value="" class="bg-[#161920]">{{ $t('admin.subscriptions.filter_all_status') }}</option>
						<option value="active" class="bg-[#161920]">{{ $t('admin.subscriptions.status_active') }}</option>
						<option value="past_due" class="bg-[#161920]">{{ $t('admin.subscriptions.status_past_due') }}</option>
						<option value="canceled" class="bg-[#161920]">{{ $t('admin.subscriptions.status_canceled') }}</option>
						<option value="expired" class="bg-[#161920]">{{ $t('admin.subscriptions.status_expired') }}</option>
					</select>
					<Icon name="ph:caret-down-bold" size="13" class="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
				</div>
				<div class="relative">
					<select v-model="subPeriodFilter" class="w-full pl-3 pr-9 rtl:pl-9 rtl:pr-3 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors appearance-none cursor-pointer">
						<option value="" class="bg-[#161920]">{{ $t('admin.subscriptions.filter_all_periods') }}</option>
						<option value="monthly" class="bg-[#161920]">{{ $t('admin.subscriptions.period_monthly') }}</option>
						<option value="annual" class="bg-[#161920]">{{ $t('admin.subscriptions.period_annual') }}</option>
						<option value="lifetime" class="bg-[#161920]">{{ $t('admin.subscriptions.period_lifetime') }}</option>
					</select>
					<Icon name="ph:caret-down-bold" size="13" class="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
				</div>
				<div class="relative">
					<select v-model="subSourceFilter" class="w-full pl-3 pr-9 rtl:pl-9 rtl:pr-3 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors appearance-none cursor-pointer">
						<option value="" class="bg-[#161920]">{{ $t('admin.subscriptions.filter_all_sources') }}</option>
						<option value="stripe" class="bg-[#161920]">{{ $t('admin.subscriptions.filter_source_stripe') }}</option>
						<option value="manual" class="bg-[#161920]">{{ $t('admin.subscriptions.filter_source_manual') }}</option>
					</select>
					<Icon name="ph:caret-down-bold" size="13" class="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
				</div>
				<button v-if="hasSubFilters" @click="clearSubFilters" class="px-2 py-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors">
					<Icon name="ph:x-bold" size="14" />
				</button>
			</div>

			<div v-if="loadingSubs" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>
			<div v-else-if="filteredSubscriptions.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:crown-duotone" size="32" class="mb-2" />
				<p class="text-sm">{{ subscriptions.length === 0 ? $t('admin.subscriptions.no_subscriptions') : $t('admin.subscriptions.no_results') }}</p>
				<button v-if="hasSubFilters" @click="clearSubFilters" class="mt-3 text-xs text-slate-500 hover:text-slate-300 underline transition-colors">{{ $t('admin.subscriptions.filter_clear') }}</button>
			</div>
			<div v-else class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-white/[0.06]">
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_business') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_email') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_plan') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_period') }}</th>
								<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_price') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_status') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_start') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_next_billing') }}</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/[0.04]">
							<tr v-for="sub in filteredSubscriptions" :key="sub.id" class="hover:bg-white/[0.03] transition-colors group">
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<div class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">{{ sub.businessName.charAt(0).toUpperCase() }}</div>
										<span class="text-sm font-medium text-white">{{ sub.businessName }}</span>
									</div>
								</td>
								<td class="px-4 py-3 text-sm text-slate-400">{{ sub.businessEmail || '—' }}</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/[0.05] text-slate-400 border border-white/[0.06]">{{ sub.planName }}</span>
								</td>
								<td class="px-4 py-3 text-sm text-slate-400">{{ getPeriodLabel(sub.billingPeriod) }}</td>
								<td class="px-4 py-3 text-right rtl:text-left">
								<p class="text-sm font-semibold text-white tabular-nums">{{ formatNumber(sub.price) }} Dhs</p>
								<span v-if="!sub.stripeSubscriptionId" class="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
									<Icon name="ph:hand-coins-bold" size="11" />
									{{ $t('admin.subscriptions.manual_tag') }}
								</span>
							</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center gap-1.5 text-xs font-medium"
										:class="sub.status === 'active' ? 'text-emerald-400' : sub.status === 'past_due' ? 'text-amber-400' : 'text-slate-500'">
										<span class="w-1.5 h-1.5 rounded-full shrink-0"
											:class="sub.status === 'active' ? 'bg-emerald-400' : sub.status === 'past_due' ? 'bg-amber-400' : 'bg-slate-600'"></span>
										{{ getStatusLabel(sub.status) }}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-slate-500">{{ formatDate(sub.startedAt) }}</td>
								<td class="px-4 py-3 text-sm text-slate-500">
									<span v-if="sub.nextBillingDate">{{ formatDate(sub.nextBillingDate) }}</span>
									<span v-else class="text-slate-700">—</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- ===== TAB: ACCÈS MANUELS ===== -->
		<div v-if="activeTab === 'manual'" class="space-y-4">
			<div v-if="loadingSubs" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>
			<template v-else>
				<!-- Explainer banner -->
				<div class="flex items-start gap-3 bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<Icon name="ph:info-bold" size="15" class="text-slate-500 shrink-0 mt-0.5" />
					<p class="text-xs text-slate-500 leading-relaxed">Accordez un accès abonné à n'importe quel business <span class="text-slate-300 font-medium">sans paiement Stripe</span> — utile pour les partenaires, les tests, ou les accès offerts.</p>
				</div>

				<div v-if="manualSubs.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
					<Icon name="ph:user-circle-gear-duotone" size="32" class="mb-2" />
					<p class="text-sm font-medium text-slate-400 mb-1">Aucun accès manuel accordé</p>
					<p class="text-xs text-slate-600 mb-4">Attribuez un accès à un business sans passer par Stripe.</p>
					<button @click="openGrantModal" class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
						<Icon name="ph:plus-bold" size="14" />
						Accorder un accès
					</button>
				</div>

				<div v-else class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-white/[0.06]">
									<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">Business</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">Plan</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">Période</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">Statut</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">Expiration</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">Accordé le</th>
									<th class="px-4 py-3"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/[0.04]">
								<tr v-for="sub in manualSubs" :key="sub.id" class="hover:bg-white/[0.03] transition-colors">
									<td class="px-4 py-3">
										<div class="flex items-center gap-2">
											<div class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 shrink-0">{{ sub.businessName.charAt(0).toUpperCase() }}</div>
											<span class="text-sm font-medium text-white">{{ sub.businessName }}</span>
										</div>
									</td>
									<td class="px-4 py-3">
										<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/[0.05] text-slate-400 border border-white/[0.06]">{{ sub.planName }}</span>
									</td>
									<td class="px-4 py-3 text-sm text-slate-400">{{ getPeriodLabel(sub.billingPeriod) }}</td>
									<td class="px-4 py-3">
										<span class="inline-flex items-center gap-1.5 text-xs font-medium"
											:class="sub.status === 'active' ? 'text-emerald-400' : 'text-slate-500'">
											<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="sub.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'"></span>
											{{ getStatusLabel(sub.status) }}
										</span>
									</td>
									<td class="px-4 py-3 text-sm text-slate-500">
										<span v-if="sub.currentPeriodEnd">{{ formatDate(sub.currentPeriodEnd) }}</span>
										<span v-else class="text-slate-700">À vie</span>
									</td>
									<td class="px-4 py-3 text-sm text-slate-500">{{ formatDate(sub.startedAt) }}</td>
									<td class="px-4 py-3 text-right rtl:text-left">
										<button v-if="sub.status === 'active'" @click="revokeSubscription(sub)"
											:disabled="revokeLoading === sub.id"
											class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-colors disabled:opacity-50">
											<Icon v-if="revokeLoading === sub.id" name="ph:spinner-gap-bold" class="animate-spin" size="12" />
											<Icon v-else name="ph:x-bold" size="11" />
											Révoquer
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</template>
		</div>


		<!-- MODAL: GRANT ACCESS -->
		<Teleport to="body">
			<div v-if="showGrantModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/70" @click="showGrantModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">Accorder un accès manuel</h2>
						<button @click="showGrantModal = false" class="p-1.5 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>
					<div class="p-5 space-y-4">
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">Business</label>
							<select v-model="grantForm.businessId" :disabled="businessesLoading" class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors disabled:opacity-50">
								<option value="" disabled class="bg-[#111318]">{{ businessesLoading ? 'Chargement...' : allBusinesses.length === 0 ? 'Aucun business trouvé' : 'Sélectionner un business...' }}</option>
								<option v-for="b in allBusinesses" :key="b.id" :value="b.id" class="bg-[#111318]">{{ [b.name, (b.email || b.owner?.email), [b.addressStreet, b.addressCity].filter(Boolean).join(', ')].filter(Boolean).join(' — ') }}</option>
							</select>
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">Plan d'abonnement</label>
							<select v-model="grantForm.planId" class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors">
								<option value="" disabled class="bg-[#111318]">Sélectionner un plan...</option>
								<option v-for="p in plans" :key="p.id" :value="p.id" class="bg-[#111318]">{{ p.name }}</option>
							</select>
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">Période</label>
							<select v-model="grantForm.billingPeriod" class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors">
								<option value="lifetime" class="bg-[#111318]">À vie</option>
								<option value="annual" class="bg-[#111318]">Annuel</option>
								<option value="monthly" class="bg-[#111318]">Mensuel</option>
							</select>
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">Date d'expiration <span class="text-slate-600 font-normal">(optionnel)</span></label>
							<input v-model="grantForm.expiresAt" type="date" class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							<p class="text-xs text-slate-600 mt-1">Laisser vide pour un accès sans limite de durée.</p>
						</div>
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
						<button @click="showGrantModal = false" class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							Annuler
						</button>
						<button @click="submitGrant" :disabled="grantLoading || !grantForm.businessId || !grantForm.planId"
							class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
							<Icon v-if="grantLoading" name="ph:spinner-gap-bold" class="animate-spin" size="14" />
							Accorder l'accès
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- MODAL: CONFIRM -->
		<Teleport to="body">
			<Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
				leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
				<div v-if="showConfirmModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
					<div class="fixed inset-0 bg-black/75" @click="showConfirmModal = false"></div>
					<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-sm shadow-2xl">
						<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
									<Icon name="ph:warning-bold" size="16" class="text-red-400" />
								</div>
								<h2 class="text-sm font-semibold text-white">{{ confirmConfig.title }}</h2>
							</div>
							<button @click="showConfirmModal = false" class="p-1.5 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors">
								<Icon name="ph:x-bold" size="14" />
							</button>
						</div>
						<div class="px-5 py-4">
							<p class="text-sm text-slate-400 leading-relaxed">{{ confirmConfig.message }}</p>
						</div>
						<div class="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2">
							<button @click="showConfirmModal = false"
								class="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
								Annuler
							</button>
							<button @click="runConfirm" :disabled="confirmLoading"
								class="px-4 py-2 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5">
								<Icon v-if="confirmLoading" name="ph:spinner-gap-bold" class="animate-spin" size="12" />
								{{ confirmConfig.label }}
							</button>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>
