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

definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { formatDate, formatNumber } = useLocaleDate()

useHead({ title: t('admin.subscriptions.title') })

const { $api } = useNuxtApp()
const toast = useToast()

// ============================================
// TABS
// ============================================
const activeTab = ref('subscriptions')
const tabs = computed(() => [
	{ id: 'subscriptions', label: t('admin.subscriptions.tab_subscriptions'), icon: 'ph:crown-bold' },
	{ id: 'plans', label: t('admin.subscriptions.tab_plans'), icon: 'ph:gear-six-bold' },
	{ id: 'manual', label: 'Accès manuels', icon: 'ph:user-circle-gear-bold' },
	{ id: 'promo', label: 'Codes promo', icon: 'ph:tag-bold' },
])

// ============================================
// SUBSCRIPTIONS STATE
// ============================================
const subscriptions = ref<any[]>([])
const loadingSubs = ref(true)
const refundModalOpen = ref(false)
const selectedSubscription = ref<any>(null)
const refundLoading = ref(false)

const fetchSubscriptions = async () => {
	loadingSubs.value = true
	try {
		subscriptions.value = await $api<any[]>('/admin/subscriptions')
	} catch (error) {
		console.error('Failed to fetch subscriptions:', error)
	} finally {
		loadingSubs.value = false
	}
}

const stats = computed(() => ({
	total: subscriptions.value.length,
	active: subscriptions.value.filter(s => s.status === 'active').length,
	monthlyRevenue: subscriptions.value
		.filter(s => s.status === 'active' && s.billingPeriod === 'monthly')
		.reduce((sum, s) => sum + s.price, 0),
	annualRevenue: subscriptions.value
		.filter(s => s.status === 'active' && s.billingPeriod === 'annual')
		.reduce((sum, s) => sum + s.price, 0),
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

const openRefundModal = (subscription: any) => {
	selectedSubscription.value = subscription
	refundModalOpen.value = true
}

const closeRefundModal = () => {
	refundModalOpen.value = false
	selectedSubscription.value = null
}

const confirmRefund = async () => {
	if (!selectedSubscription.value) return

	refundLoading.value = true
	try {
		const response = await $api(`/admin/subscriptions/${selectedSubscription.value.id}/cancel-refund`, {
			method: 'POST'
		})

		if (response.refund) {
			toast.show(`${response.message} - ${t('admin.subscriptions.refund_modal.amount')} ${response.refund.amount / 100} ${response.refund.currency.toUpperCase()}`, 'success')
		} else {
			toast.show(`${response.message}`, 'info')
		}

		const index = subscriptions.value.findIndex(s => s.id === selectedSubscription.value.id)
		if (index !== -1) {
			subscriptions.value[index].status = 'canceled'
			subscriptions.value[index].cancelledAt = new Date()
		}

		closeRefundModal()
	} catch (error: any) {
		toast.show(error.message || t('admin.subscriptions.refund_modal.confirm'), 'error')
	} finally {
		refundLoading.value = false
	}
}

// ============================================
// PLANS STATE
// ============================================
const plans = ref<SubscriptionPlan[]>([])
const loadingPlans = ref(true)
const showPlanModal = ref(false)
const editingPlan = ref<SubscriptionPlan | null>(null)
const showAdvancedPlan = ref(false)

const planForm = ref({
	name: '',
	description: '',
	priceMonthly: 0,
	priceAnnual: 0,
	priceLifetime: 0,
	features: '[]',
	isDefault: false,
	active: true,
	stripePriceIdMonthly: '',
	stripePriceIdAnnual: '',
	stripePriceIdLifetime: '',
})

const fetchPlans = async () => {
	loadingPlans.value = true
	try {
		plans.value = await $api('/admin/plans')
	} catch (error) {
		console.error('Error fetching plans:', error)
		toast.show(t('admin.subscriptions.modal_cancel'), 'error')
	} finally {
		loadingPlans.value = false
	}
}

const openNewPlanModal = () => {
	editingPlan.value = null
	showAdvancedPlan.value = false
	planForm.value = {
		name: '',
		description: '',
		priceMonthly: 0,
		priceAnnual: 0,
		priceLifetime: 0,
		features: '[]',
		isDefault: false,
		active: true,
		stripePriceIdMonthly: '',
		stripePriceIdAnnual: '',
		stripePriceIdLifetime: '',
	}
	showPlanModal.value = true
}

const openEditPlanModal = (plan: SubscriptionPlan) => {
	editingPlan.value = plan
	showAdvancedPlan.value = false
	planForm.value = {
		name: plan.name,
		description: plan.description || '',
		priceMonthly: Number(plan.priceMonthly),
		priceAnnual: Number(plan.priceAnnual),
		priceLifetime: Number(plan.priceLifetime),
		features: JSON.stringify(plan.features, null, 2),
		isDefault: plan.isDefault,
		active: plan.active,
		stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
		stripePriceIdAnnual: plan.stripePriceIdAnnual || '',
		stripePriceIdLifetime: plan.stripePriceIdLifetime || '',
	}
	showPlanModal.value = true
}

const savePlan = async () => {
	try {
		let features: any
		try {
			features = JSON.parse(planForm.value.features)
		} catch {
			toast.show(t('admin.subscriptions.modal_features'), 'error')
			return
		}

		const payload = {
			name: planForm.value.name,
			description: planForm.value.description || undefined,
			priceMonthly: planForm.value.priceMonthly,
			priceAnnual: planForm.value.priceAnnual,
			priceLifetime: planForm.value.priceLifetime,
			features,
			isDefault: planForm.value.isDefault,
			active: planForm.value.active,
			stripePriceIdMonthly: planForm.value.stripePriceIdMonthly || undefined,
			stripePriceIdAnnual: planForm.value.stripePriceIdAnnual || undefined,
			stripePriceIdLifetime: planForm.value.stripePriceIdLifetime || undefined,
		}

		if (editingPlan.value) {
			await $api(`/admin/plans/${editingPlan.value.id}`, { method: 'PUT', body: payload })
			toast.show(t('admin.subscriptions.modal_save'), 'success')
		} else {
			await $api('/admin/plans', { method: 'POST', body: payload })
			toast.show(t('admin.subscriptions.modal_create'), 'success')
		}
		showPlanModal.value = false
		await fetchPlans()
	} catch (error) {
		toast.show(t('admin.subscriptions.modal_save'), 'error')
	}
}

const deletePlan = async (plan: SubscriptionPlan) => {
	if (!confirm(`${t('admin.subscriptions.plans_delete')} "${plan.name}" ?`)) return
	try {
		await $api(`/admin/plans/${plan.id}`, { method: 'DELETE' })
		toast.show(t('admin.subscriptions.plans_delete'), 'success')
		await fetchPlans()
	} catch (error: any) {
		const msg = error?.data?.message || t('admin.subscriptions.plans_delete')
		toast.show(msg, 'error')
	}
}

// ============================================
// NEW BUTTON
// ============================================
const handleNew = () => {
	if (activeTab.value === 'plans') openNewPlanModal()
	if (activeTab.value === 'manual') showGrantModal.value = true
	if (activeTab.value === 'promo') showPromoModal.value = true
}

// ============================================
// MANUAL SUBSCRIPTIONS
// ============================================
const manualSubs = computed(() => subscriptions.value.filter(s => !s.stripeSubscriptionId))

const showGrantModal = ref(false)
const grantLoading = ref(false)
const allBusinesses = ref<any[]>([])
const grantForm = ref({ businessId: '', planId: '', billingPeriod: 'lifetime', expiresAt: '' })

const fetchBusinesses = async () => {
	if (allBusinesses.value.length > 0) return
	try {
		const res = await $api<any>('/admin/businesses?limit=200')
		allBusinesses.value = res.businesses || res
	} catch { /* noop */ }
}

const openGrantModal = () => {
	grantForm.value = { businessId: '', planId: '', billingPeriod: 'lifetime', expiresAt: '' }
	fetchBusinesses()
	showGrantModal.value = true
}

const submitGrant = async () => {
	if (!grantForm.value.businessId || !grantForm.value.planId) return
	grantLoading.value = true
	try {
		await $api('/admin/subscriptions/grant', {
			method: 'POST',
			body: {
				businessId: grantForm.value.businessId,
				planId: grantForm.value.planId,
				billingPeriod: grantForm.value.billingPeriod,
				expiresAt: grantForm.value.expiresAt || undefined,
			}
		})
		toast.show("Accès accordé avec succès", 'success')
		showGrantModal.value = false
		await fetchSubscriptions()
	} catch (e: any) {
		toast.show(e?.data?.message || "Erreur lors de l'attribution de l'accès", 'error')
	} finally {
		grantLoading.value = false
	}
}

const revokeLoading = ref<string | null>(null)
const revokeSubscription = async (sub: any) => {
	if (!confirm(`Révoquer l'accès de "${sub.businessName}" ?`)) return
	revokeLoading.value = sub.id
	try {
		await $api(`/admin/subscriptions/${sub.id}/revoke`, { method: 'POST' })
		toast.show("Accès révoqué", 'success')
		await fetchSubscriptions()
	} catch (e: any) {
		toast.show(e?.data?.message || "Erreur lors de la révocation", 'error')
	} finally {
		revokeLoading.value = null
	}
}

// ============================================
// PROMO CODES
// ============================================
const promoCodes = ref<any[]>([])
const loadingPromos = ref(false)
const showPromoModal = ref(false)
const promoLoading = ref(false)
const deactivateLoadingId = ref<string | null>(null)

const promoForm = ref({
	code: '',
	discountPercent: 10,
	maxRedemptions: '',
	expiresAt: '',
})

const fetchPromoCodes = async () => {
	loadingPromos.value = true
	try {
		promoCodes.value = await $api('/admin/promo-codes')
	} catch (e) {
		console.error('Failed to fetch promo codes:', e)
	} finally {
		loadingPromos.value = false
	}
}

const submitPromo = async () => {
	if (!promoForm.value.code || !promoForm.value.discountPercent) return
	promoLoading.value = true
	try {
		await $api('/admin/promo-codes', {
			method: 'POST',
			body: {
				code: promoForm.value.code.toUpperCase(),
				discountPercent: Number(promoForm.value.discountPercent),
				maxRedemptions: promoForm.value.maxRedemptions ? Number(promoForm.value.maxRedemptions) : undefined,
				expiresAt: promoForm.value.expiresAt || undefined,
			}
		})
		toast.show("Code promo créé avec succès", 'success')
		showPromoModal.value = false
		promoForm.value = { code: '', discountPercent: 10, maxRedemptions: '', expiresAt: '' }
		await fetchPromoCodes()
	} catch (e: any) {
		toast.show(e?.data?.message || "Erreur lors de la création du code promo", 'error')
	} finally {
		promoLoading.value = false
	}
}

const deactivatePromoCode = async (id: string, code: string) => {
	if (!confirm(`Désactiver le code "${code}" ?`)) return
	deactivateLoadingId.value = id
	try {
		await $api(`/admin/promo-codes/${id}`, { method: 'DELETE' })
		toast.show("Code promo désactivé", 'success')
		await fetchPromoCodes()
	} catch (e: any) {
		toast.show(e?.data?.message || "Erreur lors de la désactivation", 'error')
	} finally {
		deactivateLoadingId.value = null
	}
}

// ============================================
// INITIAL LOAD
// ============================================
onMounted(() => {
	fetchSubscriptions()
	fetchPlans()
	fetchPromoCodes()
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
						{{ $t('admin.subscriptions.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.subscriptions.description') }}</p>
				</div>
				<div class="flex gap-3">
					<button v-if="activeTab === 'plans'" @click="handleNew"
						class="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all group">
						<Icon name="ph:plus-bold" class="group-hover:rotate-90 transition-transform duration-300" />
						{{ $t('admin.subscriptions.new_plan_button') }}
					</button>
					<button v-if="activeTab === 'manual'" @click="openGrantModal"
						class="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all group">
						<Icon name="ph:plus-bold" class="group-hover:rotate-90 transition-transform duration-300" />
						Accorder l'accès
					</button>
					<button v-if="activeTab === 'promo'" @click="showPromoModal = true"
						class="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all group">
						<Icon name="ph:plus-bold" class="group-hover:rotate-90 transition-transform duration-300" />
						Créer un code promo
					</button>
					<button v-if="activeTab === 'subscriptions'"
						class="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all">
						<Icon name="ph:download-bold" size="16" />
						{{ $t('admin.subscriptions.export_button') }}
					</button>
				</div>
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
					<span v-if="tab.id === 'subscriptions' && subscriptions.length > 0" :class="[
						'px-2 py-0.5 rounded-md text-[10px] font-bold',
						activeTab === tab.id
							? 'bg-white/10 text-slate-300'
							: 'bg-white/5 text-slate-600'
					]">
						{{ subscriptions.length }}
					</span>
					<span v-if="tab.id === 'plans' && plans.length > 0" :class="[
						'px-2 py-0.5 rounded-md text-[10px] font-bold',
						activeTab === tab.id
							? 'bg-white/10 text-slate-300'
							: 'bg-white/5 text-slate-600'
					]">
						{{ plans.length }}
					</span>
					<span v-if="tab.id === 'manual' && manualSubs.length > 0" :class="[
						'px-2 py-0.5 rounded-md text-[10px] font-bold',
						activeTab === tab.id
							? 'bg-white/10 text-slate-300'
							: 'bg-white/5 text-slate-600'
					]">
						{{ manualSubs.length }}
					</span>
					<span v-if="tab.id === 'promo' && promoCodes.length > 0" :class="[
						'px-2 py-0.5 rounded-md text-[10px] font-bold',
						activeTab === tab.id
							? 'bg-white/10 text-slate-300'
							: 'bg-white/5 text-slate-600'
					]">
						{{ promoCodes.length }}
					</span>
				</button>
			</nav>

			<!-- ============================================ -->
			<!-- TAB: ABONNEMENTS ACTIFS -->
			<!-- ============================================ -->
			<div v-if="activeTab === 'subscriptions'" class="space-y-6">
				<!-- Stats Cards -->
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
						<div class="flex items-center gap-3 mb-4">
							<div
								class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:crown-duotone" size="20" class="text-white" />
							</div>
							<p class="text-sm font-medium text-slate-400">{{ $t('admin.subscriptions.stats_total') }}</p>
						</div>
						<p class="text-3xl font-bold text-white">{{ stats.total }}</p>
					</div>

					<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
						<div class="flex items-center gap-3 mb-4">
							<div
								class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:check-circle-duotone" size="20" class="text-emerald-400" />
							</div>
							<p class="text-sm font-medium text-slate-400">{{ $t('admin.subscriptions.stats_active') }}</p>
						</div>
						<p class="text-3xl font-bold text-emerald-400">{{ stats.active }}</p>
					</div>

					<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
						<div class="flex items-center gap-3 mb-4">
							<div
								class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:currency-dollar-duotone" size="20" class="text-white" />
							</div>
							<p class="text-sm font-medium text-slate-400">{{ $t('admin.subscriptions.stats_monthly_revenue') }}</p>
						</div>
						<p class="text-3xl font-bold text-white">{{ formatNumber(stats.monthlyRevenue) }}
							Dhs</p>
					</div>

					<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
						<div class="flex items-center gap-3 mb-4">
							<div
								class="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:chart-line-duotone" size="20" class="text-white" />
							</div>
							<p class="text-sm font-medium text-slate-400">{{ $t('admin.subscriptions.stats_annual_revenue') }}</p>
						</div>
						<p class="text-3xl font-bold text-white">{{ formatNumber(stats.annualRevenue) }}
							Dhs</p>
					</div>
				</div>

				<!-- Loading -->
				<div v-if="loadingSubs" class="py-24 flex flex-col items-center justify-center gap-4">
					<Icon name="svg-spinners:ring-resize" size="40" class="text-white/50" />
					<p class="text-sm font-bold text-slate-400">{{ $t('admin.payments.invoices_loading') }}</p>
				</div>

				<!-- Empty State -->
				<div v-else-if="subscriptions.length === 0"
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-24 flex flex-col items-center justify-center text-center shadow-xl shadow-black/10 px-4">
					<Icon name="ph:crown-duotone" size="48" class="mx-auto mb-4 opacity-50 text-slate-500" />
					<p class="text-slate-400">{{ $t('admin.subscriptions.no_subscriptions') }}</p>
				</div>

				<!-- Subscriptions Table -->
				<div v-else
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-white/5 border-b border-white/10">
								<tr>
									<th
										class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_business') }}</th>
									<th
										class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_plan') }}</th>
									<th
										class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_period') }}</th>
									<th
										class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_price') }}</th>
									<th
										class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_status') }}</th>
									<th
										class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_start') }}</th>
									<th
										class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_next_billing') }}</th>
									<th
										class="text-right rtl:text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.subscriptions.table_header_actions') }}</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								<tr v-for="sub in subscriptions" :key="sub.id"
									class="hover:bg-white/5 transition-colors">
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div
												class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
												{{ sub.businessName.charAt(0).toUpperCase() }}
											</div>
											<span class="font-medium text-white">{{ sub.businessName }}</span>
										</div>
									</td>
									<td class="px-6 py-4">
										<span
											class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-white/5">
											{{ sub.planName }}
										</span>
									</td>
									<td class="px-6 py-4">
										<span class="text-sm text-slate-300">
											{{ getPeriodLabel(sub.billingPeriod) }}
										</span>
									</td>
									<td class="px-6 py-4">
										<span class="text-sm font-bold text-white">{{
											formatNumber(sub.price) }} Dhs</span>
									</td>
									<td class="px-6 py-4">
										<span :class="['px-2.5 py-1 rounded-lg text-xs font-bold border',
											sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
												sub.status === 'past_due' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
													'bg-white/5 text-slate-400 border-white/5']">
											{{ getStatusLabel(sub.status) }}
										</span>
									</td>
									<td class="px-6 py-4">
										<span class="text-sm text-slate-400">
											{{ formatDate(sub.startedAt) }}
										</span>
									</td>
									<td class="px-6 py-4">
										<span v-if="sub.nextBillingDate" class="text-sm text-slate-400">
											{{ formatDate(sub.nextBillingDate) }}
										</span>
										<span v-else class="text-xs text-slate-600">-</span>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center justify-end gap-2">
											<button
												class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-slate-400 hover:text-white"
												:title="$t('admin.subscriptions.details_title')">
												<Icon name="ph:eye-bold" size="16" />
											</button>
											<button v-if="sub.status === 'active'" @click="openRefundModal(sub)"
												class="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all border border-red-500/20"
												:title="$t('admin.subscriptions.cancel_refund_title')">
												<Icon name="ph:currency-circle-dollar-bold" size="16" />
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- ============================================ -->
			<!-- TAB: PLANS D'ABONNEMENT -->
			<!-- ============================================ -->
			<div v-if="activeTab === 'plans'" class="space-y-6">
				<!-- Loading -->
				<div v-if="loadingPlans" class="py-24 flex flex-col items-center justify-center gap-4">
					<Icon name="svg-spinners:ring-resize" size="40" class="text-white/50" />
					<p class="text-sm font-bold text-slate-400">{{ $t('admin.payments.invoices_loading') }}</p>
				</div>

				<!-- Empty State -->
				<div v-else-if="plans.length === 0"
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-24 flex flex-col items-center justify-center text-center shadow-xl shadow-black/10 px-4">
					<div
						class="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-slate-600 border border-white/5">
						<Icon name="ph:crown-duotone" size="48" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">{{ $t('admin.subscriptions.no_plans') }}</h3>
					<p class="text-slate-400 max-w-sm mx-auto mb-8 text-lg">{{ $t('admin.subscriptions.no_plans_description') }}</p>
					<button @click="openNewPlanModal"
						class="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-white/10">
						{{ $t('admin.subscriptions.create_plan') }}
					</button>
				</div>

				<!-- Plans Cards -->
				<div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
					<div v-for="plan in plans" :key="plan.id"
						class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-black/10 flex flex-col overflow-hidden transition-all hover:border-white/20">

						<!-- Card Header -->
						<div class="px-6 pt-6 pb-5 border-b border-white/10">
							<div class="flex items-start justify-between gap-3">
								<div>
									<div class="flex items-center gap-2 flex-wrap">
										<h3 class="text-xl font-bold text-white">{{ plan.name }}</h3>
										<span v-if="plan.isDefault"
											class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/20">
											{{ $t('admin.subscriptions.plans_default') }}
										</span>
										<span :class="[
											'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
											plan.active
												? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
												: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
										]">
											{{ plan.active ? $t('admin.subscriptions.plans_active') : $t('admin.subscriptions.plans_inactive') }}
										</span>
									</div>
									<p v-if="plan.description" class="text-sm text-slate-400 mt-1">{{ plan.description }}</p>
								</div>
								<div class="flex items-center gap-1 shrink-0">
									<button @click="openEditPlanModal(plan)"
										class="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
										:title="$t('admin.subscriptions.plans_edit')">
										<Icon name="ph:pencil-line-bold" size="16" />
									</button>
									<button @click="deletePlan(plan)"
										class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
										:title="$t('admin.subscriptions.plans_delete')">
										<Icon name="ph:trash-bold" size="16" />
									</button>
								</div>
							</div>

							<!-- Subscribers badge -->
							<div class="mt-4 flex items-center gap-2">
								<Icon name="ph:users-three-bold" size="16" class="text-slate-500" />
								<span class="text-sm text-slate-400">
									<span class="font-bold text-white">{{ plan._count.subscriptions }}</span>
									abonné{{ plan._count.subscriptions !== 1 ? 's' : '' }}
								</span>
							</div>
						</div>

						<!-- Pricing -->
						<div class="px-6 py-5 border-b border-white/10 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('admin.subscriptions.plans_table_monthly') }}</span>
								<div>
									<span class="text-lg font-bold text-white">{{ Number(plan.priceMonthly).toFixed(2) }}</span>
									<span class="text-xs text-slate-500 ml-1">MAD/mois</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('admin.subscriptions.plans_table_annual') }}</span>
								<div>
									<span class="text-lg font-bold text-white">{{ Number(plan.priceAnnual).toFixed(2) }}</span>
									<span class="text-xs text-slate-500 ml-1">MAD/an</span>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('admin.subscriptions.plans_table_lifetime') }}</span>
								<div>
									<span class="text-lg font-bold text-white">{{ Number(plan.priceLifetime).toFixed(2) }}</span>
									<span class="text-xs text-slate-500 ml-1">MAD</span>
								</div>
							</div>
						</div>

						<!-- Features -->
						<div class="px-6 py-5 flex-1">
							<p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{{ $t('admin.subscriptions.modal_features') }}</p>
							<ul class="space-y-2">
								<li v-if="plan.features?.max_games" class="flex items-center gap-2 text-sm text-slate-300">
									<Icon name="ph:game-controller-bold" size="15" class="text-slate-500 shrink-0" />
									<span>{{ plan.features.max_games }} jeu{{ plan.features.max_games !== 1 ? 'x' : '' }} actif{{ plan.features.max_games !== 1 ? 's' : '' }}</span>
								</li>
								<li v-if="plan.features?.max_players" class="flex items-center gap-2 text-sm text-slate-300">
									<Icon name="ph:users-bold" size="15" class="text-slate-500 shrink-0" />
									<span>{{ plan.features.max_players.toLocaleString() }} joueurs max</span>
								</li>
								<li v-if="plan.features?.email_credits_per_month" class="flex items-center gap-2 text-sm text-slate-300">
									<Icon name="ph:envelope-bold" size="15" class="text-slate-500 shrink-0" />
									<span>{{ plan.features.email_credits_per_month }} emails/mois</span>
								</li>
								<li v-if="plan.features?.sms_credits_per_month" class="flex items-center gap-2 text-sm text-slate-300">
									<Icon name="ph:chat-circle-bold" size="15" class="text-slate-500 shrink-0" />
									<span>{{ plan.features.sms_credits_per_month }} SMS/mois</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			<!-- ============================================ -->
			<!-- TAB: ACCÈS MANUELS -->
			<!-- ============================================ -->
			<div v-if="activeTab === 'manual'" class="space-y-6">
				<div v-if="loadingSubs" class="py-24 flex flex-col items-center justify-center gap-4">
					<Icon name="svg-spinners:ring-resize" size="40" class="text-white/50" />
					<p class="text-sm font-bold text-slate-400">Chargement...</p>
				</div>
				<div v-else-if="manualSubs.length === 0"
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-24 flex flex-col items-center justify-center text-center shadow-xl shadow-black/10 px-4">
					<Icon name="ph:user-circle-gear-duotone" size="48" class="mx-auto mb-4 opacity-50 text-slate-500" />
					<h3 class="text-xl font-bold text-white mb-2">Aucun accès manuel</h3>
					<p class="text-slate-400 max-w-sm mx-auto mb-8">Accordez un accès à un business sans passer par Stripe.</p>
					<button @click="openGrantModal"
						class="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-white/10">
						Accorder l'accès
					</button>
				</div>
				<div v-else class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-white/5 border-b border-white/10">
								<tr>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Business</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Période</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Statut</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Expiration</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Accordé le</th>
									<th class="text-right px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								<tr v-for="sub in manualSubs" :key="sub.id" class="hover:bg-white/5 transition-colors">
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
												{{ sub.businessName.charAt(0).toUpperCase() }}
											</div>
											<span class="font-medium text-white">{{ sub.businessName }}</span>
										</div>
									</td>
									<td class="px-6 py-4">
										<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-white/5">{{ sub.planName }}</span>
									</td>
									<td class="px-6 py-4 text-sm text-slate-300">{{ getPeriodLabel(sub.billingPeriod) }}</td>
									<td class="px-6 py-4">
										<span :class="['px-2.5 py-1 rounded-lg text-xs font-bold border',
											sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-400 border-white/5']">
											{{ getStatusLabel(sub.status) }}
										</span>
									</td>
									<td class="px-6 py-4">
										<span v-if="sub.currentPeriodEnd" class="text-sm text-slate-400">{{ formatDate(sub.currentPeriodEnd) }}</span>
										<span v-else class="text-xs text-slate-600">À vie</span>
									</td>
									<td class="px-6 py-4 text-sm text-slate-400">{{ formatDate(sub.startedAt) }}</td>
									<td class="px-6 py-4">
										<div class="flex items-center justify-end gap-2">
											<button v-if="sub.status === 'active'" @click="revokeSubscription(sub)"
												:disabled="revokeLoading === sub.id"
												class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all disabled:opacity-50">
												<Icon v-if="revokeLoading === sub.id" name="ph:spinner-gap-bold" class="animate-spin" size="12" />
												<Icon v-else name="ph:x-bold" size="12" />
												Révoquer
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- ============================================ -->
			<!-- TAB: CODES PROMO -->
			<!-- ============================================ -->
			<div v-if="activeTab === 'promo'" class="space-y-6">
				<div v-if="loadingPromos" class="py-24 flex flex-col items-center justify-center gap-4">
					<Icon name="svg-spinners:ring-resize" size="40" class="text-white/50" />
					<p class="text-sm font-bold text-slate-400">Chargement...</p>
				</div>
				<div v-else-if="promoCodes.length === 0"
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-24 flex flex-col items-center justify-center text-center shadow-xl shadow-black/10 px-4">
					<Icon name="ph:tag-duotone" size="48" class="mx-auto mb-4 opacity-50 text-slate-500" />
					<h3 class="text-xl font-bold text-white mb-2">Aucun code promo actif</h3>
					<p class="text-slate-400 max-w-sm mx-auto mb-8">Créez des codes promo Stripe pour offrir des réductions sur les abonnements.</p>
					<button @click="showPromoModal = true"
						class="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-white/10">
						Créer un code promo
					</button>
				</div>
				<div v-else class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-white/5 border-b border-white/10">
								<tr>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Code</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Réduction</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Utilisations</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Max</th>
									<th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Expiration</th>
									<th class="text-right px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								<tr v-for="promo in promoCodes" :key="promo.id" class="hover:bg-white/5 transition-colors">
									<td class="px-6 py-4">
										<span class="font-mono font-bold text-white text-sm tracking-wider">{{ promo.code }}</span>
									</td>
									<td class="px-6 py-4">
										<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
											-{{ promo.promotion?.coupon?.percent_off ?? '?' }}%
										</span>
									</td>
									<td class="px-6 py-4 text-sm text-slate-300">{{ promo.times_redeemed ?? 0 }}</td>
									<td class="px-6 py-4 text-sm text-slate-400">{{ promo.max_redemptions ?? '∞' }}</td>
									<td class="px-6 py-4 text-sm text-slate-400">
										<span v-if="promo.expires_at">{{ formatDate(new Date(promo.expires_at * 1000).toISOString()) }}</span>
										<span v-else class="text-slate-600">Aucune</span>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center justify-end">
											<button @click="deactivatePromoCode(promo.id, promo.code)"
												:disabled="deactivateLoadingId === promo.id"
												class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all disabled:opacity-50">
												<Icon v-if="deactivateLoadingId === promo.id" name="ph:spinner-gap-bold" class="animate-spin" size="12" />
												<Icon v-else name="ph:trash-bold" size="12" />
												Désactiver
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

		<!-- ============================================ -->
		<!-- MODAL: PLAN -->
		<!-- ============================================ -->
		<Teleport to="body">
			<div v-if="showPlanModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/80 backdrop-blur-md" @click="showPlanModal = false"></div>
				<div
					class="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
					<!-- Header -->
					<div class="px-8 py-6 border-b border-white/10">
						<div class="flex items-center justify-between">
							<h2 class="text-2xl font-bold text-white">
								{{ editingPlan ? $t('admin.subscriptions.modal_edit_title') : $t('admin.subscriptions.modal_add_title') }}
							</h2>
							<button @click="showPlanModal = false"
								class="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
								<Icon name="ph:x-bold" size="20" />
							</button>
						</div>
					</div>

					<!-- Content -->
					<div class="flex-1 overflow-y-auto p-8">
						<form @submit.prevent="savePlan" class="space-y-6">
							<!-- Name -->
							<div class="space-y-2">
								<label class="block text-sm font-bold text-slate-300">{{ $t('admin.subscriptions.modal_name') }}</label>
								<input v-model="planForm.name" type="text" required :placeholder="$t('admin.subscriptions.modal_name_placeholder')"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600" />
							</div>

							<!-- Description -->
							<div class="space-y-2">
								<label class="block text-sm font-bold text-slate-300">{{ $t('admin.subscriptions.modal_description') }}</label>
								<textarea v-model="planForm.description" rows="2" :placeholder="$t('admin.subscriptions.modal_description_placeholder')"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600 resize-none"></textarea>
							</div>

							<!-- Prices -->
							<div class="grid grid-cols-3 gap-4">
								<div class="space-y-2">
									<label class="block text-sm font-bold text-slate-300">{{ $t('admin.subscriptions.modal_monthly') }}</label>
									<input v-model.number="planForm.priceMonthly" type="number" min="0" step="0.01"
										required
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all" />
								</div>
								<div class="space-y-2">
									<label class="block text-sm font-bold text-slate-300">{{ $t('admin.subscriptions.modal_annual') }}</label>
									<input v-model.number="planForm.priceAnnual" type="number" min="0" step="0.01"
										required
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all" />
								</div>
								<div class="space-y-2">
									<label class="block text-sm font-bold text-slate-300">{{ $t('admin.subscriptions.modal_lifetime') }}</label>
									<input v-model.number="planForm.priceLifetime" type="number" min="0" step="0.01"
										required
										class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all" />
								</div>
							</div>

							<!-- Features JSON -->
							<div class="space-y-2">
								<label class="block text-sm font-bold text-slate-300">{{ $t('admin.subscriptions.modal_features') }}</label>
								<textarea v-model="planForm.features" rows="4"
									:placeholder="$t('admin.subscriptions.modal_features_placeholder')"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600 resize-none"></textarea>
							</div>


							<!-- Toggles -->
							<div class="space-y-3">
								<label
									class="flex items-center gap-4 cursor-pointer group p-4 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
									<div
										class="relative w-12 h-7 bg-white/10 rounded-full transition-colors group-has-[:checked]:bg-emerald-500">
										<input v-model="planForm.isDefault" type="checkbox" class="sr-only peer" />
										<div
											class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm">
										</div>
									</div>
									<div>
										<span class="block text-sm font-bold text-white">{{ $t('admin.subscriptions.modal_default') }}</span>
										<span class="block text-xs text-slate-400 mt-0.5">{{ $t('admin.subscriptions.modal_default_description') }}</span>
									</div>
								</label>

								<label
									class="flex items-center gap-4 cursor-pointer group p-4 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
									<div
										class="relative w-12 h-7 bg-white/10 rounded-full transition-colors group-has-[:checked]:bg-emerald-500">
										<input v-model="planForm.active" type="checkbox" class="sr-only peer" />
										<div
											class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm">
										</div>
									</div>
									<div>
										<span class="block text-sm font-bold text-white">{{ $t('admin.subscriptions.modal_active') }}</span>
										<span class="block text-xs text-slate-400 mt-0.5">{{ $t('admin.subscriptions.modal_active_description') }}</span>
									</div>
								</label>
							</div>

							<!-- Advanced: Stripe IDs -->
							<div>
								<button type="button" @click="showAdvancedPlan = !showAdvancedPlan"
									class="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
									<Icon
										:name="showAdvancedPlan ? 'ph:caret-down-bold' : 'ph:caret-right-bold'"
										size="14" class="rtl:rotate-180" />
									{{ $t('admin.subscriptions.modal_stripe_config') }}
								</button>
								<div v-if="showAdvancedPlan" class="mt-4 space-y-4">
									<div class="space-y-2">
										<label class="block text-xs font-bold text-slate-500">{{ $t('admin.subscriptions.modal_stripe_monthly') }}</label>
										<input v-model="planForm.stripePriceIdMonthly" type="text"
											:placeholder="$t('admin.subscriptions.modal_stripe_placeholder')"
											class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600" />
									</div>
									<div class="space-y-2">
										<label class="block text-xs font-bold text-slate-500">{{ $t('admin.subscriptions.modal_stripe_annual') }}</label>
										<input v-model="planForm.stripePriceIdAnnual" type="text"
											:placeholder="$t('admin.subscriptions.modal_stripe_placeholder')"
											class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600" />
									</div>
									<div class="space-y-2">
										<label class="block text-xs font-bold text-slate-500">{{ $t('admin.subscriptions.modal_stripe_lifetime') }}</label>
										<input v-model="planForm.stripePriceIdLifetime" type="text"
											:placeholder="$t('admin.subscriptions.modal_stripe_placeholder')"
											class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-white/20 focus:border-white/20 outline-none transition-all placeholder:text-slate-600" />
									</div>
								</div>
							</div>
						</form>
					</div>

					<!-- Footer -->
					<div class="px-8 py-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
						<button @click="showPlanModal = false"
							class="px-6 py-2.5 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors">
							{{ $t('admin.subscriptions.modal_cancel') }}
						</button>
						<button @click="savePlan"
							class="px-8 py-2.5 bg-white text-slate-900 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10">
							{{ editingPlan ? $t('admin.subscriptions.modal_save') : $t('admin.subscriptions.modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ============================================ -->
		<!-- MODAL: REFUND -->
		<!-- ============================================ -->
		<Teleport to="body">
			<Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
				enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in"
				leave-from-class="opacity-100" leave-to-class="opacity-0">
				<div v-if="refundModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4"
					@click.self="closeRefundModal">
					<div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
					<div class="relative w-full max-w-md bg-[#0f172a] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/[0.07]">

						<!-- Top accent -->
						<div class="h-0.5 w-full bg-gradient-to-r from-red-600 via-red-400 to-orange-500"></div>

						<div class="p-7">
							<!-- Icon + title -->
							<div class="flex flex-col items-center text-center mb-6">
								<div class="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
									<Icon name="ph:arrows-counter-clockwise-bold" class="text-red-400" size="26" />
								</div>
								<h3 class="text-xl font-bold text-white mb-1">{{ $t('admin.subscriptions.refund_modal.title') }}</h3>
								<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
									<div class="w-1.5 h-1.5 rounded-full bg-red-400"></div>
									<p class="text-red-400 text-[11px] font-bold uppercase tracking-wider">{{ $t('admin.subscriptions.refund_modal.irreversible') }}</p>
								</span>
							</div>

							<!-- Receipt -->
							<div v-if="selectedSubscription" class="bg-white/[0.04] border border-white/[0.07] rounded-xl divide-y divide-white/[0.07] mb-5">
								<div class="flex justify-between items-center px-4 py-3 text-sm">
									<span class="text-slate-500">{{ $t('admin.subscriptions.refund_modal.business') }}</span>
									<span class="text-white font-semibold max-w-[200px] truncate text-right">{{ selectedSubscription.businessName }}</span>
								</div>
								<div class="flex justify-between items-center px-4 py-3 text-sm">
									<span class="text-slate-500">{{ $t('admin.subscriptions.refund_modal.plan') }}</span>
									<span class="text-white font-semibold">{{ selectedSubscription.planName }}</span>
								</div>
								<div class="flex justify-between items-center px-4 py-3 text-sm">
									<span class="text-slate-500">{{ $t('admin.subscriptions.refund_modal.amount') }}</span>
									<span class="text-red-400 font-bold text-base">{{ formatNumber(selectedSubscription.price) }} Dhs</span>
								</div>
							</div>

							<!-- Consequences -->
							<div class="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-6">
								<p class="text-[11px] font-bold text-red-400/70 uppercase tracking-wider mb-3">{{ $t('admin.subscriptions.refund_modal.actions') }}</p>
								<ul class="space-y-2.5">
									<li class="flex items-center gap-2.5 text-sm text-slate-400">
										<Icon name="ph:x-circle-fill" class="text-red-500/70 shrink-0" size="15" />
										<span>{{ $t('admin.subscriptions.refund_modal.immediate') }}</span>
									</li>
									<li class="flex items-center gap-2.5 text-sm text-slate-400">
										<Icon name="ph:x-circle-fill" class="text-red-500/70 shrink-0" size="15" />
										<span>{{ $t('admin.subscriptions.refund_modal.full_refund') }}</span>
									</li>
									<li class="flex items-center gap-2.5 text-sm text-slate-400">
										<Icon name="ph:x-circle-fill" class="text-red-500/70 shrink-0" size="15" />
										<span>{{ $t('admin.subscriptions.refund_modal.access_lost') }}</span>
									</li>
								</ul>
							</div>

							<!-- Actions -->
							<div class="flex gap-3">
								<button @click="closeRefundModal"
									class="flex-1 py-3 bg-white/5 border border-white/10 text-slate-300 font-bold rounded-xl hover:bg-white/10 transition-colors text-sm">
									{{ $t('admin.subscriptions.refund_modal.cancel') }}
								</button>
								<button type="button" @click.stop="confirmRefund" :disabled="refundLoading"
									class="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-red-900/30 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
									<Icon v-if="refundLoading" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
									<Icon v-else name="ph:arrows-counter-clockwise-bold" size="16" />
									<span>{{ $t('admin.subscriptions.refund_modal.confirm') }}</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- ============================================ -->
		<!-- MODAL: GRANT MANUAL ACCESS -->
		<!-- ============================================ -->
		<Teleport to="body">
			<div v-if="showGrantModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/80 backdrop-blur-md" @click="showGrantModal = false"></div>
				<div class="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg overflow-hidden flex flex-col">
					<div class="px-8 py-6 border-b border-white/10 flex items-center justify-between">
						<h2 class="text-xl font-bold text-white">Accorder un accès manuel</h2>
						<button @click="showGrantModal = false" class="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
							<Icon name="ph:x-bold" size="20" />
						</button>
					</div>
					<div class="p-8 space-y-5">
						<!-- Business -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Business</label>
							<select v-model="grantForm.businessId" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 outline-none transition-all">
								<option value="" disabled class="bg-slate-900">Sélectionner un business...</option>
								<option v-for="b in allBusinesses" :key="b.id" :value="b.id" class="bg-slate-900">{{ b.name }}</option>
							</select>
						</div>
						<!-- Plan -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Plan d'abonnement</label>
							<select v-model="grantForm.planId" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 outline-none transition-all">
								<option value="" disabled class="bg-slate-900">Sélectionner un plan...</option>
								<option v-for="p in plans" :key="p.id" :value="p.id" class="bg-slate-900">{{ p.name }}</option>
							</select>
						</div>
						<!-- Billing period -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Période</label>
							<select v-model="grantForm.billingPeriod" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 outline-none transition-all">
								<option value="lifetime" class="bg-slate-900">À vie</option>
								<option value="annual" class="bg-slate-900">Annuel</option>
								<option value="monthly" class="bg-slate-900">Mensuel</option>
							</select>
						</div>
						<!-- Expiry date (optional) -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Date d'expiration <span class="text-slate-500 font-normal">(optionnel)</span></label>
							<input v-model="grantForm.expiresAt" type="date"
								class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 outline-none transition-all" />
							<p class="text-xs text-slate-500">Laisser vide pour un accès sans limite de durée.</p>
						</div>
					</div>
					<div class="px-8 py-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
						<button @click="showGrantModal = false" class="px-6 py-2.5 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors">
							Annuler
						</button>
						<button @click="submitGrant" :disabled="grantLoading || !grantForm.businessId || !grantForm.planId"
							class="px-8 py-2.5 bg-white text-slate-900 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
							<Icon v-if="grantLoading" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
							Accorder l'accès
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ============================================ -->
		<!-- MODAL: CREATE PROMO CODE -->
		<!-- ============================================ -->
		<Teleport to="body">
			<div v-if="showPromoModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/80 backdrop-blur-md" @click="showPromoModal = false"></div>
				<div class="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg overflow-hidden flex flex-col">
					<div class="px-8 py-6 border-b border-white/10 flex items-center justify-between">
						<h2 class="text-xl font-bold text-white">Créer un code promo</h2>
						<button @click="showPromoModal = false" class="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
							<Icon name="ph:x-bold" size="20" />
						</button>
					</div>
					<div class="p-8 space-y-5">
						<!-- Code -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Code promo</label>
							<input v-model="promoForm.code" type="text" placeholder="ex: LAUNCH20" maxlength="20"
								class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-bold uppercase tracking-wider focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-slate-600 placeholder:font-normal placeholder:tracking-normal" />
							<p class="text-xs text-slate-500">Le code sera automatiquement mis en majuscules.</p>
						</div>
						<!-- Discount -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Réduction (%)</label>
							<div class="relative">
								<input v-model.number="promoForm.discountPercent" type="number" min="1" max="100"
									class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 outline-none transition-all pr-10" />
								<span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
							</div>
						</div>
						<!-- Max redemptions -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Utilisations max <span class="text-slate-500 font-normal">(optionnel)</span></label>
							<input v-model="promoForm.maxRedemptions" type="number" min="1" placeholder="Illimité"
								class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-slate-600" />
						</div>
						<!-- Expires at -->
						<div class="space-y-2">
							<label class="block text-sm font-bold text-slate-300">Date d'expiration <span class="text-slate-500 font-normal">(optionnel)</span></label>
							<input v-model="promoForm.expiresAt" type="date"
								class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-white/20 outline-none transition-all" />
						</div>
						<div class="bg-white/5 border border-white/10 rounded-xl p-4">
							<p class="text-xs text-slate-400"><span class="font-bold text-slate-300">Note :</span> Le code sera créé sur Stripe et sera disponible sur la page de paiement. La réduction s'applique une seule fois (valeur "once").</p>
						</div>
					</div>
					<div class="px-8 py-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
						<button @click="showPromoModal = false" class="px-6 py-2.5 text-slate-400 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors">
							Annuler
						</button>
						<button @click="submitPromo" :disabled="promoLoading || !promoForm.code || !promoForm.discountPercent"
							class="px-8 py-2.5 bg-white text-slate-900 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
							<Icon v-if="promoLoading" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
							Créer le code
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>
