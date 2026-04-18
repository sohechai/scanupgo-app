<script setup lang="ts">
import CurrentSubscription from '~/components/subscription/CurrentSubscription.vue'
import PlanCard from '~/components/subscription/PlanCard.vue'
import CancelModal from '~/components/subscription/CancelModal.vue'

const { t } = useI18n()
const { $api } = useNuxtApp()
const toast = useToast()
const { fetchSubscription: refreshSharedSubscription, subscription: sharedSubscription } = useSubscription()

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const loading = ref(false)
const plans = ref<any[]>([])
const planLoading = ref(true)
const planError = ref<any>(null)
const currentSubscription = ref<any>(null)
const subscriptionLoading = ref(true)
const showPlanSelector = ref(false)
const showCancelModal = ref(false)
const showUpgradeModal = ref(false)
const pendingUpgrade = ref<{ planId: string; period: 'monthly' | 'annual' | 'lifetime'; plan: any } | null>(null)
const trialInfo = ref<{ eligible: boolean; days: number }>({ eligible: false, days: 0 })

const isCurrentPlan = (planId: string, period: 'monthly' | 'annual' | 'lifetime') => {
	if (!currentSubscription.value || currentSubscription.value.status === 'canceled') return false
	return currentSubscription.value.planId === planId && currentSubscription.value.billingPeriod === period
}

const getPriceForPeriod = (plan: any, period: 'monthly' | 'annual' | 'lifetime') => {
	switch (period) {
		case 'monthly': return plan.priceMonthly
		case 'annual': return plan.priceAnnual
		case 'lifetime': return plan.priceLifetime
	}
}

const getPeriodLabel = (period: 'monthly' | 'annual' | 'lifetime') => {
	switch (period) {
		case 'monthly': return t('subscription.period.monthly')
		case 'annual': return t('subscription.period.annual')
		case 'lifetime': return t('subscription.period.lifetime')
	}
}

const wasImmediatelyCancelled = computed(() => {
	if (!currentSubscription.value) return false
	if (currentSubscription.value.status !== 'canceled') return false
	if (!currentSubscription.value.cancelledAt) return false
	if (!currentSubscription.value.currentPeriodEnd) return true
	return new Date(currentSubscription.value.currentPeriodEnd) > new Date()
})

const cleanUrlParams = () => {
	const router = useRouter()
	router.replace({ query: {} })
}

onMounted(async () => {
	try {
		const route = useRoute()
		if (route.query.success === 'true') {
			loading.value = true
			try {
				const isLifetime = route.query.lifetime === 'true'
				await $api('/subscriptions/sync', { method: 'POST', body: { isLifetime } })
			} catch (e) { console.error('Sync failed:', e) } finally { loading.value = false }
			cleanUrlParams()
		} else if (route.query.canceled === 'true') {
			cleanUrlParams()
		}
		const [subscription, rawPlans, trial] = await Promise.all([
			refreshSharedSubscription(true),
			$api<any[]>('/subscriptions/plans'),
			$api<{ eligible: boolean; days: number }>('/subscriptions/trial-info'),
		])
		currentSubscription.value = subscription
		plans.value = rawPlans || []
		trialInfo.value = trial || { eligible: false, days: 0 }
	} catch (error) {
		console.error('Error fetching subscription:', error)
		planError.value = error
	} finally {
		planLoading.value = false
		subscriptionLoading.value = false
	}
})

const handlePlanSelect = (planId: string, period: 'monthly' | 'annual' | 'lifetime') => {
	if (!currentSubscription.value || currentSubscription.value.status === 'canceled') {
		subscribe(planId, period)
		return
	}
	if (isCurrentPlan(planId, period)) return
	const plan = plans.value.find(p => p.id === planId)
	pendingUpgrade.value = { planId, period, plan }
	showUpgradeModal.value = true
}

const confirmUpgrade = async () => {
	if (!pendingUpgrade.value) return
	showUpgradeModal.value = false
	await subscribe(pendingUpgrade.value.planId, pendingUpgrade.value.period)
	pendingUpgrade.value = null
}

const cancelUpgrade = () => {
	showUpgradeModal.value = false
	pendingUpgrade.value = null
}

const subscribe = async (planId: string, period: 'monthly' | 'annual' | 'lifetime') => {
	if (!plans.value.length) { toast.show(t('subscription.plan_not_available'), 'error'); return }
	loading.value = true
	try {
		let response
		if (currentSubscription.value && currentSubscription.value.status !== 'canceled') {
			response = await $api<{ url?: string; action: string; message: string }>('/subscriptions/change-plan', {
				method: 'POST', body: { planId, period }
			})
			if (response.action === 'upgraded') { toast.show(response.message, 'success'); setTimeout(reloadClean, 1500) }
			else if (response.action === 'scheduled') { toast.show(response.message, 'info'); setTimeout(reloadClean, 1500) }
			else if (response.url) { window.location.href = response.url }
		} else {
			response = await $api<{ url: string }>('/subscriptions/create-checkout', {
				method: 'POST', body: { planId, period }
			})
			if (response.url) { window.location.href = response.url }
		}
	} catch (e: any) {
		console.error('Subscription error:', e)
		toast.show(t('common.error') + ' : ' + (e?.data?.message || t('common.error')), 'error')
		loading.value = false
	}
}

const reloadClean = () => { window.location.href = '/dashboard/subscription' }

const cancelSubscription = async (reason?: string) => {
	loading.value = true
	try {
		const response = await $api<{ success: boolean; message: string }>('/subscriptions/cancel', {
			method: 'POST', body: { reason: reason || 'Annulation par le commerçant' }
		})
		if (response.success) {
			if ((response as any).subscription) sharedSubscription.value = (response as any).subscription
			toast.show(response.message, 'success')
			showCancelModal.value = false
			setTimeout(reloadClean, 1500)
		}
	} catch (e: any) {
		toast.show(t('common.error') + ' : ' + (e?.data?.message || t('common.error')), 'error')
	} finally { loading.value = false }
}

const reactivateSubscription = async () => {
	loading.value = true
	try {
		const response = await $api<{ success: boolean; message: string }>('/subscriptions/reactivate', { method: 'POST' })
		if (response.success) { toast.show(response.message, 'success'); setTimeout(reloadClean, 1500) }
	} catch (e: any) {
		toast.show(t('common.error') + ' : ' + (e?.data?.message || t('common.error')), 'error')
		loading.value = false
	}
}

const openPlanSelector = () => { showPlanSelector.value = true }
const closePlanSelector = () => { showPlanSelector.value = false }

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl || config.public.apiBase || ''
const isDev = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1') || process.dev
const resettingSubscription = ref(false)

const resetSubscriptionForTesting = async () => {
	if (!confirm('Êtes-vous sûr de vouloir réinitialiser votre abonnement ? Cette action est irréversible.')) return
	resettingSubscription.value = true
	try {
		const response = await $api<{ success: boolean; message: string }>('/subscriptions/reset-for-testing', { method: 'POST' })
		if (response.success) { toast.show(response.message, 'success'); setTimeout(reloadClean, 1000) }
		else toast.show(response.message, 'error')
	} catch (e: any) {
		toast.show(t('common.error') + ': ' + (e?.data?.message || t('common.error')), 'error')
	} finally { resettingSubscription.value = false }
}
</script>

<template>
	<div class="space-y-6 relative pb-20">

		<!-- Header -->
		<div>
			<h1 class="text-xl font-semibold text-slate-900 dark:text-white">
				{{ currentSubscription ? $t('subscription.title') : $t('subscription.choose_plan') }}
			</h1>
			<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
				{{ currentSubscription ? $t('subscription.subtitle') : $t('subscription.choose_subtitle') }}
			</p>
		</div>

		<!-- Loading -->
		<div v-if="subscriptionLoading" class="flex items-center justify-center py-20">
			<Icon name="ph:spinner-gap-bold" size="28" class="text-slate-300 animate-spin" />
		</div>

		<!-- Error -->
		<div v-else-if="planError"
			class="max-w-md mx-auto bg-red-50 border border-red-100 rounded-lg p-6 text-center">
			<Icon name="ph:warning-circle-fill" size="28" class="mx-auto text-red-500 mb-3" />
			<h3 class="font-semibold text-slate-900 dark:text-white mb-1">{{ $t('subscription.error') }}</h3>
			<p class="text-sm text-slate-500">{{ planError.message }}</p>
		</div>

		<!-- Admin Cancellation Notice -->
		<div v-else-if="wasImmediatelyCancelled && !showPlanSelector" class="max-w-2xl mx-auto">
			<div class="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-lg p-5">
				<div class="flex items-start gap-3">
					<div class="w-9 h-9 rounded-md bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
						<Icon name="ph:x-circle-fill" class="text-red-500" size="18" />
					</div>
					<div class="flex-1">
						<h3 class="font-semibold text-slate-900 dark:text-white text-sm mb-1">
							{{ $t('subscription.cancelled') }}
						</h3>
						<p class="text-slate-400 text-sm mb-4">{{ $t('subscription.cancelled_description') }}</p>
						<div class="flex flex-wrap gap-2">
							<NuxtLink to="/dashboard"
								class="px-4 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-md text-sm transition-colors">
								{{ $t('subscription.back_to_dashboard') }}
							</NuxtLink>
							<button @click="showPlanSelector = true"
								class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-md text-sm transition-colors">
								{{ $t('subscription.see_plans') }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Current Subscription -->
		<CurrentSubscription v-else-if="currentSubscription && !showPlanSelector" :subscription="currentSubscription"
			:loading="loading" @cancel="showCancelModal = true" @reactivate="reactivateSubscription"
			@change-plan="openPlanSelector" />

		<!-- Plan Selection -->
		<div v-else-if="plans.length && (showPlanSelector || !currentSubscription || wasImmediatelyCancelled)"
			class="max-w-6xl mx-auto space-y-5">

			<!-- Back button -->
			<div v-if="(currentSubscription && showPlanSelector) || wasImmediatelyCancelled">
				<button @click="closePlanSelector"
					class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium transition-colors">
					<Icon name="ph:arrow-left-bold" size="14" class="rtl:rotate-180" />
					{{ wasImmediatelyCancelled ? $t('common.back') : $t('subscription.back_to_subscription') }}
				</button>
			</div>

			<!-- Free Trial Banner -->
			<div v-if="trialInfo.eligible"
				class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-5 py-4 flex items-center gap-4">
				<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
					<Icon name="ph:gift-bold" class="text-slate-500 dark:text-slate-400" size="16" />
				</div>
				<div>
					<h3 class="font-semibold text-slate-900 dark:text-white text-sm">
						{{ $t('subscription.trial.title', { days: trialInfo.days }) }}
					</h3>
					<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('subscription.trial.description') }}</p>
				</div>
			</div>

			<!-- Plans Grid -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
				<template v-for="plan in plans" :key="plan.id">
					<PlanCard :plan="plan" period="monthly" :loading="loading"
						:is-current-plan="isCurrentPlan(plan.id, 'monthly')"
						:trial-days="trialInfo.eligible ? trialInfo.days : 0"
						@subscribe="(p) => handlePlanSelect(plan.id, p)" />
					<PlanCard :plan="plan" period="annual" :highlighted="true" :loading="loading"
						:is-current-plan="isCurrentPlan(plan.id, 'annual')"
						:trial-days="trialInfo.eligible ? trialInfo.days : 0"
						@subscribe="(p) => handlePlanSelect(plan.id, p)" />
					<PlanCard :plan="plan" period="lifetime" :loading="loading"
						:is-current-plan="isCurrentPlan(plan.id, 'lifetime')"
						@subscribe="(p) => handlePlanSelect(plan.id, p)" />
				</template>
			</div>
		</div>

		<!-- Empty State -->
		<div v-else-if="!plans.length && !currentSubscription"
			class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center max-w-2xl mx-auto">
			<Icon name="ph:warning-circle" size="40" class="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
			<p class="text-slate-600 dark:text-slate-300 font-medium text-sm">{{ $t('subscription.no_plans') }}</p>
			<p class="text-xs text-slate-400 mt-2">{{ $t('subscription.contact_support') }}</p>
		</div>

		<!-- Cancel Modal -->
		<CancelModal :show="showCancelModal" :subscription="currentSubscription" :loading="loading"
			@close="showCancelModal = false" @confirm="cancelSubscription" />

		<!-- [DEV ONLY] Reset Button -->
		<div v-if="isDev && currentSubscription" class="fixed bottom-4 right-4 z-40">
			<button @click="resetSubscriptionForTesting" :disabled="resettingSubscription"
				class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md flex items-center gap-2 disabled:opacity-50">
				<Icon v-if="resettingSubscription" name="ph:spinner-gap-bold" class="animate-spin" size="15" />
				<Icon v-else name="ph:trash-bold" size="15" />
				Reset Subscription (DEV)
			</button>
		</div>

		<!-- Upgrade Confirmation Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showUpgradeModal && pendingUpgrade"
					class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cancelUpgrade"></div>

					<div class="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5">
						<!-- Header -->
						<div class="flex items-center gap-3">
							<div class="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
								<Icon name="ph:arrows-clockwise-bold" size="16" class="text-slate-500 dark:text-slate-400" />
							</div>
							<div>
								<h3 class="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
									{{ $t('subscription.confirm_change') }}
								</h3>
								<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('subscription.confirm_change_subtitle') }}</p>
							</div>
						</div>

						<!-- Content -->
						<div class="space-y-3">
							<!-- Current plan -->
							<div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-md">
								<p class="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">{{ $t('subscription.current_plan') }}</p>
								<p class="font-semibold text-slate-900 dark:text-white text-sm">
									{{ currentSubscription?.plan?.name }} — {{ getPeriodLabel(currentSubscription?.billingPeriod) }}
								</p>
							</div>

							<div class="flex justify-center">
								<Icon name="ph:arrow-down-bold" size="20" class="text-slate-300" />
							</div>

							<!-- New plan -->
							<div class="p-4 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded-md border border-[#007AFF]/30">
								<p class="text-xs font-medium text-[#007AFF] mb-1">{{ $t('subscription.new_plan') }}</p>
								<p class="font-semibold text-slate-900 dark:text-white text-sm">
									{{ pendingUpgrade.plan?.name }} — {{ getPeriodLabel(pendingUpgrade.period) }}
								</p>
								<p class="text-base font-semibold text-[#007AFF] mt-1">
									{{ getPriceForPeriod(pendingUpgrade.plan, pendingUpgrade.period) }} Dhs
									<span class="text-sm font-normal text-slate-400">
										{{ pendingUpgrade.period === 'monthly' ? '/mois' : pendingUpgrade.period === 'annual' ? '/an' : '' }}
									</span>
								</p>
							</div>

							<!-- Info message -->
							<div class="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800 rounded-md px-4 py-3">
								<Icon name="ph:info" class="text-slate-400 mt-0.5 shrink-0" size="14" />
								<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
									<template v-if="pendingUpgrade.period === 'lifetime' || (pendingUpgrade.period === 'annual' && currentSubscription?.billingPeriod === 'monthly')">
										{{ $t('subscription.prorated_message') }}
									</template>
									<template v-else>
										{{ $t('subscription.billing_period_message') }}
									</template>
								</p>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex gap-3 pt-1">
							<button @click="cancelUpgrade"
								class="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">
								{{ $t('common.cancel') }}
							</button>
							<button @click="confirmUpgrade" :disabled="loading"
								class="flex-1 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-medium rounded-md transition-all disabled:opacity-40 text-sm">
								<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin mr-2" size="14" />
								{{ $t('subscription.confirm_change') }}
							</button>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>
