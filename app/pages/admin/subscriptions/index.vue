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
	features: any
	active: boolean
	sortOrder: number
	isDefault: boolean
	createdAt: string
	updatedAt: string
	_count: { subscriptions: number }
}

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
	{ id: 'plans', label: t('admin.subscriptions.tab_plans'), icon: 'ph:gear-six-bold' },
	{ id: 'manual', label: 'Accès manuels', icon: 'ph:user-circle-gear-bold' },
])

// Subscriptions
const subscriptions = ref<any[]>([])
const loadingSubs = ref(true)
const refundModalOpen = ref(false)
const selectedSubscription = ref<any>(null)
const refundLoading = ref(false)

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

const openRefundModal = (sub: any) => { selectedSubscription.value = sub; refundModalOpen.value = true }
const closeRefundModal = () => { refundModalOpen.value = false; selectedSubscription.value = null }

const confirmRefund = async () => {
	if (!selectedSubscription.value) return
	refundLoading.value = true
	try {
		const response = await $api(`/admin/subscriptions/${selectedSubscription.value.id}/cancel-refund`, { method: 'POST' })
		if (response.refund) toast.show(`${response.message} - ${t('admin.subscriptions.refund_modal.amount')} ${response.refund.amount / 100} ${response.refund.currency.toUpperCase()}`, 'success')
		else toast.show(`${response.message}`, 'info')
		const idx = subscriptions.value.findIndex(s => s.id === selectedSubscription.value.id)
		if (idx !== -1) { subscriptions.value[idx].status = 'canceled'; subscriptions.value[idx].cancelledAt = new Date() }
		closeRefundModal()
	} catch (error: any) {
		toast.show(error.message || t('admin.subscriptions.refund_modal.confirm'), 'error')
	} finally { refundLoading.value = false }
}

// Plans
const plans = ref<SubscriptionPlan[]>([])
const loadingPlans = ref(true)
const showPlanModal = ref(false)
const editingPlan = ref<SubscriptionPlan | null>(null)
const showAdvancedPlan = ref(false)

const planForm = ref({ name: '', description: '', priceMonthly: 0, priceAnnual: 0, priceLifetime: 0, features: '[]', isDefault: false, active: true, stripePriceIdMonthly: '', stripePriceIdAnnual: '', stripePriceIdLifetime: '' })

const fetchPlans = async () => {
	loadingPlans.value = true
	try { plans.value = await $api('/admin/plans') }
	catch { toast.show(t('admin.subscriptions.modal_cancel'), 'error') }
	finally { loadingPlans.value = false }
}

const openNewPlanModal = () => {
	editingPlan.value = null; showAdvancedPlan.value = false
	planForm.value = { name: '', description: '', priceMonthly: 0, priceAnnual: 0, priceLifetime: 0, features: '[]', isDefault: false, active: true, stripePriceIdMonthly: '', stripePriceIdAnnual: '', stripePriceIdLifetime: '' }
	showPlanModal.value = true
}

const openEditPlanModal = (plan: SubscriptionPlan) => {
	editingPlan.value = plan; showAdvancedPlan.value = false
	planForm.value = { name: plan.name, description: plan.description || '', priceMonthly: Number(plan.priceMonthly), priceAnnual: Number(plan.priceAnnual), priceLifetime: Number(plan.priceLifetime), features: JSON.stringify(plan.features, null, 2), isDefault: plan.isDefault, active: plan.active, stripePriceIdMonthly: plan.stripePriceIdMonthly || '', stripePriceIdAnnual: plan.stripePriceIdAnnual || '', stripePriceIdLifetime: plan.stripePriceIdLifetime || '' }
	showPlanModal.value = true
}

const savePlan = async () => {
	try {
		let features: any
		try { features = JSON.parse(planForm.value.features) } catch { toast.show(t('admin.subscriptions.modal_features'), 'error'); return }
		const payload = { name: planForm.value.name, description: planForm.value.description || undefined, priceMonthly: planForm.value.priceMonthly, priceAnnual: planForm.value.priceAnnual, priceLifetime: planForm.value.priceLifetime, features, isDefault: planForm.value.isDefault, active: planForm.value.active, stripePriceIdMonthly: planForm.value.stripePriceIdMonthly || undefined, stripePriceIdAnnual: planForm.value.stripePriceIdAnnual || undefined, stripePriceIdLifetime: planForm.value.stripePriceIdLifetime || undefined }
		if (editingPlan.value) { await $api(`/admin/plans/${editingPlan.value.id}`, { method: 'PUT', body: payload }); toast.show(t('admin.subscriptions.modal_save'), 'success') }
		else { await $api('/admin/plans', { method: 'POST', body: payload }); toast.show(t('admin.subscriptions.modal_create'), 'success') }
		showPlanModal.value = false
		await fetchPlans()
	} catch { toast.show(t('admin.subscriptions.modal_save'), 'error') }
}

const deletePlan = async (plan: SubscriptionPlan) => {
	if (!confirm(`${t('admin.subscriptions.plans_delete')} "${plan.name}" ?`)) return
	try { await $api(`/admin/plans/${plan.id}`, { method: 'DELETE' }); toast.show(t('admin.subscriptions.plans_delete'), 'success'); await fetchPlans() }
	catch (error: any) { toast.show(error?.data?.message || t('admin.subscriptions.plans_delete'), 'error') }
}

// Manual access
const manualSubs = computed(() => subscriptions.value.filter(s => !s.stripeSubscriptionId))
const showGrantModal = ref(false)
const grantLoading = ref(false)
const allBusinesses = ref<any[]>([])
const grantForm = ref({ businessId: '', planId: '', billingPeriod: 'lifetime', expiresAt: '' })

const fetchBusinesses = async () => {
	if (allBusinesses.value.length > 0) return
	try { const res = await $api<any>('/admin/businesses?limit=200'); allBusinesses.value = res.businesses || res }
	catch { /* noop */ }
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
	} catch (e: any) { toast.show(e?.data?.message || "Erreur lors de l'attribution", 'error') }
	finally { grantLoading.value = false }
}

const revokeLoading = ref<string | null>(null)
const revokeSubscription = async (sub: any) => {
	if (!confirm(`Révoquer l'accès de "${sub.businessName}" ?`)) return
	revokeLoading.value = sub.id
	try { await $api(`/admin/subscriptions/${sub.id}/revoke`, { method: 'POST' }); toast.show("Accès révoqué", 'success'); await fetchSubscriptions() }
	catch (e: any) { toast.show(e?.data?.message || "Erreur lors de la révocation", 'error') }
	finally { revokeLoading.value = null }
}

const handleNew = () => { if (activeTab.value === 'plans') openNewPlanModal(); if (activeTab.value === 'manual') openGrantModal() }

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
				<button v-if="activeTab === 'plans'" @click="openNewPlanModal"
					class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="15" />
					{{ $t('admin.subscriptions.new_plan_button') }}
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
				<span v-if="tab.id === 'plans' && plans.length > 0" class="text-xs tabular-nums" :class="activeTab === tab.id ? 'text-slate-400' : 'text-slate-600'">{{ plans.length }}</span>
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

			<div v-if="loadingSubs" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>
			<div v-else-if="subscriptions.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:crown-duotone" size="32" class="mb-2" />
				<p class="text-sm">{{ $t('admin.subscriptions.no_subscriptions') }}</p>
			</div>
			<div v-else class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-white/[0.06]">
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_business') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_plan') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_period') }}</th>
								<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_price') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_status') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_start') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.subscriptions.table_header_next_billing') }}</th>
								<th class="px-4 py-3"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/[0.04]">
							<tr v-for="sub in subscriptions" :key="sub.id" class="hover:bg-white/[0.03] transition-colors group">
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
								<td class="px-4 py-3 text-right rtl:text-left text-sm font-semibold text-white tabular-nums">{{ formatNumber(sub.price) }} Dhs</td>
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
								<td class="px-4 py-3 text-right rtl:text-left">
									<div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button v-if="sub.status === 'active'" @click="openRefundModal(sub)"
											class="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
											:title="$t('admin.subscriptions.cancel_refund_title')">
											<Icon name="ph:currency-circle-dollar-bold" size="15" />
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- ===== TAB: PLANS ===== -->
		<div v-if="activeTab === 'plans'" class="space-y-4">
			<div v-if="loadingPlans" class="flex items-center justify-center py-12 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>
			<div v-else-if="plans.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:crown-duotone" size="32" class="mb-2" />
				<p class="text-sm font-medium text-slate-400 mb-1">{{ $t('admin.subscriptions.no_plans') }}</p>
				<p class="text-xs text-slate-600 mb-4">{{ $t('admin.subscriptions.no_plans_description') }}</p>
				<button @click="openNewPlanModal" class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="14" />
					{{ $t('admin.subscriptions.create_plan') }}
				</button>
			</div>
			<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				<div v-for="plan in plans" :key="plan.id"
					class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden flex flex-col hover:border-white/[0.14] transition-colors">
					<!-- Header -->
					<div class="px-4 pt-4 pb-3 border-b border-white/[0.06]">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<h3 class="text-sm font-semibold text-white">{{ plan.name }}</h3>
									<span v-if="plan.isDefault" class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-500/15 text-brand-400 border border-brand-500/20">
										{{ $t('admin.subscriptions.plans_default') }}
									</span>
									<span class="inline-flex items-center gap-1 text-[10px] font-medium"
										:class="plan.active ? 'text-emerald-400' : 'text-slate-500'">
										<span class="w-1.5 h-1.5 rounded-full" :class="plan.active ? 'bg-emerald-400' : 'bg-slate-600'"></span>
										{{ plan.active ? $t('admin.subscriptions.plans_active') : $t('admin.subscriptions.plans_inactive') }}
									</span>
								</div>
								<p v-if="plan.description" class="text-xs text-slate-500 mt-0.5 truncate">{{ plan.description }}</p>
							</div>
							<div class="flex items-center gap-0.5 shrink-0">
								<button @click="openEditPlanModal(plan)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors">
									<Icon name="ph:pencil-line-bold" size="14" />
								</button>
								<button @click="deletePlan(plan)" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
									<Icon name="ph:trash-bold" size="14" />
								</button>
							</div>
						</div>
						<div class="flex items-center gap-1.5 mt-2">
							<Icon name="ph:users-three-bold" size="13" class="text-slate-600" />
							<span class="text-xs text-slate-500"><span class="text-white font-medium">{{ plan._count.subscriptions }}</span> abonné{{ plan._count.subscriptions !== 1 ? 's' : '' }}</span>
						</div>
					</div>
					<!-- Pricing -->
					<div class="px-4 py-3 border-b border-white/[0.06] space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-xs text-slate-500">{{ $t('admin.subscriptions.plans_table_monthly') }}</span>
							<span class="text-sm font-semibold text-white tabular-nums">{{ Number(plan.priceMonthly).toFixed(2) }} <span class="text-xs font-normal text-slate-500">MAD</span></span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-xs text-slate-500">{{ $t('admin.subscriptions.plans_table_annual') }}</span>
							<span class="text-sm font-semibold text-white tabular-nums">{{ Number(plan.priceAnnual).toFixed(2) }} <span class="text-xs font-normal text-slate-500">MAD</span></span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-xs text-slate-500">{{ $t('admin.subscriptions.plans_table_lifetime') }}</span>
							<span class="text-sm font-semibold text-white tabular-nums">{{ Number(plan.priceLifetime).toFixed(2) }} <span class="text-xs font-normal text-slate-500">MAD</span></span>
						</div>
					</div>
					<!-- Features -->
					<div class="px-4 py-3 flex-1">
						<p class="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-2">{{ $t('admin.subscriptions.modal_features') }}</p>
						<ul class="space-y-1.5">
							<li v-if="plan.features?.max_games" class="flex items-center gap-2 text-xs text-slate-400">
								<Icon name="ph:game-controller-bold" size="12" class="text-slate-600 shrink-0" />
								{{ plan.features.max_games }} jeu{{ plan.features.max_games !== 1 ? 'x' : '' }} actif{{ plan.features.max_games !== 1 ? 's' : '' }}
							</li>
							<li v-if="plan.features?.max_players" class="flex items-center gap-2 text-xs text-slate-400">
								<Icon name="ph:users-bold" size="12" class="text-slate-600 shrink-0" />
								{{ plan.features.max_players.toLocaleString() }} joueurs max
							</li>
							<li v-if="plan.features?.email_credits_per_month" class="flex items-center gap-2 text-xs text-slate-400">
								<Icon name="ph:envelope-bold" size="12" class="text-slate-600 shrink-0" />
								{{ plan.features.email_credits_per_month }} emails/mois
							</li>
							<li v-if="plan.features?.sms_credits_per_month" class="flex items-center gap-2 text-xs text-slate-400">
								<Icon name="ph:chat-circle-bold" size="12" class="text-slate-600 shrink-0" />
								{{ plan.features.sms_credits_per_month }} SMS/mois
							</li>
						</ul>
					</div>
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

		<!-- MODAL: PLAN -->
		<Teleport to="body">
			<div v-if="showPlanModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/70" @click="showPlanModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">{{ editingPlan ? $t('admin.subscriptions.modal_edit_title') : $t('admin.subscriptions.modal_add_title') }}</h2>
						<button @click="showPlanModal = false" class="p-1.5 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>
					<div class="flex-1 overflow-y-auto p-5 space-y-4">
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.subscriptions.modal_name') }}</label>
							<input v-model="planForm.name" type="text" required :placeholder="$t('admin.subscriptions.modal_name_placeholder')"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.subscriptions.modal_description') }}</label>
							<textarea v-model="planForm.description" rows="2" :placeholder="$t('admin.subscriptions.modal_description_placeholder')"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors resize-none"></textarea>
						</div>
						<div class="grid grid-cols-3 gap-3">
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.subscriptions.modal_monthly') }}</label>
								<input v-model.number="planForm.priceMonthly" type="number" min="0" step="0.01" required class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.subscriptions.modal_annual') }}</label>
								<input v-model.number="planForm.priceAnnual" type="number" min="0" step="0.01" required class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.subscriptions.modal_lifetime') }}</label>
								<input v-model.number="planForm.priceLifetime" type="number" min="0" step="0.01" required class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
							</div>
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.subscriptions.modal_features') }}</label>
							<textarea v-model="planForm.features" rows="4" :placeholder="$t('admin.subscriptions.modal_features_placeholder')"
								class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white font-mono placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors resize-none"></textarea>
						</div>
						<div class="space-y-2">
							<label class="flex items-center gap-3 cursor-pointer p-3 border border-white/[0.06] rounded-md hover:bg-white/[0.02] transition-colors">
								<div class="relative w-10 h-6 bg-white/[0.08] rounded-full">
									<input v-model="planForm.isDefault" type="checkbox" class="sr-only peer" />
									<div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm peer-checked:bg-brand-400"></div>
								</div>
								<div>
									<p class="text-xs font-medium text-white">{{ $t('admin.subscriptions.modal_default') }}</p>
									<p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.subscriptions.modal_default_description') }}</p>
								</div>
							</label>
							<label class="flex items-center gap-3 cursor-pointer p-3 border border-white/[0.06] rounded-md hover:bg-white/[0.02] transition-colors">
								<div class="relative w-10 h-6 bg-white/[0.08] rounded-full">
									<input v-model="planForm.active" type="checkbox" class="sr-only peer" />
									<div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm peer-checked:bg-emerald-400"></div>
								</div>
								<div>
									<p class="text-xs font-medium text-white">{{ $t('admin.subscriptions.modal_active') }}</p>
									<p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.subscriptions.modal_active_description') }}</p>
								</div>
							</label>
						</div>
						<!-- Stripe IDs -->
						<div>
							<button type="button" @click="showAdvancedPlan = !showAdvancedPlan"
								class="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors">
								<Icon :name="showAdvancedPlan ? 'ph:caret-down-bold' : 'ph:caret-right-bold'" size="12" class="rtl:rotate-180" />
								{{ $t('admin.subscriptions.modal_stripe_config') }}
							</button>
							<div v-if="showAdvancedPlan" class="mt-3 space-y-3">
								<div>
									<label class="block text-xs font-medium text-slate-500 mb-1.5">{{ $t('admin.subscriptions.modal_stripe_monthly') }}</label>
									<input v-model="planForm.stripePriceIdMonthly" type="text" :placeholder="$t('admin.subscriptions.modal_stripe_placeholder')"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-xs text-white font-mono placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
								</div>
								<div>
									<label class="block text-xs font-medium text-slate-500 mb-1.5">{{ $t('admin.subscriptions.modal_stripe_annual') }}</label>
									<input v-model="planForm.stripePriceIdAnnual" type="text" :placeholder="$t('admin.subscriptions.modal_stripe_placeholder')"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-xs text-white font-mono placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
								</div>
								<div>
									<label class="block text-xs font-medium text-slate-500 mb-1.5">{{ $t('admin.subscriptions.modal_stripe_lifetime') }}</label>
									<input v-model="planForm.stripePriceIdLifetime" type="text" :placeholder="$t('admin.subscriptions.modal_stripe_placeholder')"
										class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-xs text-white font-mono placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
								</div>
							</div>
						</div>
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
						<button @click="showPlanModal = false" class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							{{ $t('admin.subscriptions.modal_cancel') }}
						</button>
						<button @click="savePlan" class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-md transition-colors">
							{{ editingPlan ? $t('admin.subscriptions.modal_save') : $t('admin.subscriptions.modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- MODAL: REFUND -->
		<Teleport to="body">
			<Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
				<div v-if="refundModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4" @click.self="closeRefundModal">
					<div class="absolute inset-0 bg-black/70"></div>
					<div class="relative w-full max-w-md bg-[#111318] border border-white/[0.09] rounded-xl shadow-2xl overflow-hidden">
						<div class="h-0.5 w-full bg-gradient-to-r from-red-600 to-orange-500"></div>
						<div class="p-6">
							<div class="flex flex-col items-center text-center mb-5">
								<div class="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
									<Icon name="ph:arrows-counter-clockwise-bold" class="text-red-400" size="22" />
								</div>
								<h3 class="text-base font-semibold text-white mb-1">{{ $t('admin.subscriptions.refund_modal.title') }}</h3>
								<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
									<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
									<p class="text-red-400 text-[10px] font-medium uppercase tracking-wider">{{ $t('admin.subscriptions.refund_modal.irreversible') }}</p>
								</span>
							</div>
							<div v-if="selectedSubscription" class="bg-white/[0.03] border border-white/[0.06] rounded-lg divide-y divide-white/[0.06] mb-4">
								<div class="flex justify-between items-center px-3 py-2.5 text-sm">
									<span class="text-slate-500">{{ $t('admin.subscriptions.refund_modal.business') }}</span>
									<span class="text-white font-medium max-w-[160px] truncate text-right">{{ selectedSubscription.businessName }}</span>
								</div>
								<div class="flex justify-between items-center px-3 py-2.5 text-sm">
									<span class="text-slate-500">{{ $t('admin.subscriptions.refund_modal.plan') }}</span>
									<span class="text-white font-medium">{{ selectedSubscription.planName }}</span>
								</div>
								<div class="flex justify-between items-center px-3 py-2.5 text-sm">
									<span class="text-slate-500">{{ $t('admin.subscriptions.refund_modal.amount') }}</span>
									<span class="text-red-400 font-semibold">{{ formatNumber(selectedSubscription.price) }} Dhs</span>
								</div>
							</div>
							<div class="bg-red-500/[0.05] border border-red-500/10 rounded-lg p-3 mb-5">
								<p class="text-[10px] font-medium text-red-400/60 uppercase tracking-wider mb-2">{{ $t('admin.subscriptions.refund_modal.actions') }}</p>
								<ul class="space-y-1.5">
									<li v-for="key in ['immediate', 'full_refund', 'access_lost']" :key="key" class="flex items-center gap-2 text-xs text-slate-400">
										<Icon name="ph:x-circle-fill" class="text-red-500/60 shrink-0" size="13" />
										{{ $t(`admin.subscriptions.refund_modal.${key}`) }}
									</li>
								</ul>
							</div>
							<div class="flex gap-2">
								<button @click="closeRefundModal" class="flex-1 py-2 bg-white/[0.04] border border-white/[0.08] text-slate-300 font-medium rounded-md hover:bg-white/[0.08] transition-colors text-sm">
									{{ $t('admin.subscriptions.refund_modal.cancel') }}
								</button>
								<button type="button" @click.stop="confirmRefund" :disabled="refundLoading"
									class="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50">
									<Icon v-if="refundLoading" name="ph:spinner-gap-bold" class="animate-spin" size="15" />
									<Icon v-else name="ph:arrows-counter-clockwise-bold" size="15" />
									{{ $t('admin.subscriptions.refund_modal.confirm') }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>

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
							<select v-model="grantForm.businessId" class="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors">
								<option value="" disabled class="bg-[#111318]">Sélectionner un business...</option>
								<option v-for="b in allBusinesses" :key="b.id" :value="b.id" class="bg-[#111318]">{{ b.name }}</option>
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
	</div>
</template>
