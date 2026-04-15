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

// State
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

// Check if a plan/period combination is the current subscription
const isCurrentPlan = (planId: string, period: 'monthly' | 'annual' | 'lifetime') => {
	if (!currentSubscription.value || currentSubscription.value.status === 'canceled') return false
	return currentSubscription.value.planId === planId && currentSubscription.value.billingPeriod === period
}

// Get price for a period
const getPriceForPeriod = (plan: any, period: 'monthly' | 'annual' | 'lifetime') => {
	switch (period) {
		case 'monthly': return plan.priceMonthly
		case 'annual': return plan.priceAnnual
		case 'lifetime': return plan.priceLifetime
	}
}

// Get period label
const getPeriodLabel = (period: 'monthly' | 'annual' | 'lifetime') => {
	switch (period) {
		case 'monthly': return t('subscription.period.monthly')
		case 'annual': return t('subscription.period.annual')
		case 'lifetime': return t('subscription.period.lifetime')
	}
}

// Check if subscription was immediately cancelled (cooling-off refund or admin cancellation)
// Detected when status='canceled' but currentPeriodEnd is still in the future
const wasImmediatelyCancelled = computed(() => {
	if (!currentSubscription.value) return false
	if (currentSubscription.value.status !== 'canceled') return false
	if (!currentSubscription.value.cancelledAt) return false
	// If no period end, it's a lifetime cancellation
	if (!currentSubscription.value.currentPeriodEnd) return true
	// If period end is still in the future, it was an immediate cancellation (not a natural expiration)
	const periodEnd = new Date(currentSubscription.value.currentPeriodEnd)
	return periodEnd > new Date()
})

// Clean URL query params after payment redirect
const cleanUrlParams = () => {
	const router = useRouter()
	router.replace({ query: {} })
}

// Fetch current subscription and plans
onMounted(async () => {
	try {
		const route = useRoute()

		// Sync with Stripe if returning from payment
		if (route.query.success === 'true') {
			loading.value = true
			try {
				const isLifetime = route.query.lifetime === 'true'
				await $api('/subscriptions/sync', {
					method: 'POST',
					body: { isLifetime }
				})
			} catch (e) {
				console.error('Sync failed:', e)
			} finally {
				loading.value = false
			}
			// Clean URL to avoid re-triggering sync on reload
			cleanUrlParams()
		} else if (route.query.canceled === 'true') {
			cleanUrlParams()
		}

		// Fetch current subscription, plans and trial info in parallel
		// Use refreshSharedSubscription so SubscriptionGate lifts immediately after subscribing
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

// Handle plan selection - show confirmation if changing existing subscription
const handlePlanSelect = (planId: string, period: 'monthly' | 'annual' | 'lifetime') => {
	// If no current subscription or canceled, proceed directly
	if (!currentSubscription.value || currentSubscription.value.status === 'canceled') {
		subscribe(planId, period)
		return
	}

	// If selecting current plan, do nothing (button should be disabled anyway)
	if (isCurrentPlan(planId, period)) {
		return
	}

	// Show confirmation modal for plan changes
	const plan = plans.value.find(p => p.id === planId)
	pendingUpgrade.value = { planId, period, plan }
	showUpgradeModal.value = true
}

// Confirm and execute the plan change
const confirmUpgrade = async () => {
	if (!pendingUpgrade.value) return
	showUpgradeModal.value = false
	await subscribe(pendingUpgrade.value.planId, pendingUpgrade.value.period)
	pendingUpgrade.value = null
}

// Cancel upgrade modal
const cancelUpgrade = () => {
	showUpgradeModal.value = false
	pendingUpgrade.value = null
}

// Subscribe to a plan via Stripe
const subscribe = async (planId: string, period: 'monthly' | 'annual' | 'lifetime') => {
	if (!plans.value.length) {
		toast.show(t('subscription.plan_not_available'), 'error')
		return
	}

	loading.value = true

	try {
		let response

		// If subscription is canceled, treat as new subscription
		if (currentSubscription.value && currentSubscription.value.status !== 'canceled') {
			// Change plan logic (for active subscriptions only)
			response = await $api<{ url?: string; action: string; message: string }>('/subscriptions/change-plan', {
				method: 'POST',
				body: { planId, period }
			})

			if (response.action === 'upgraded') {
				toast.show(response.message, 'success')
				setTimeout(reloadClean, 1500)
			} else if (response.action === 'scheduled') {
				toast.show(response.message, 'info')
				setTimeout(reloadClean, 1500)
			} else if (response.url) {
				window.location.href = response.url
			}
		} else {
			// New subscription logic (for no subscription or canceled subscription)
			response = await $api<{ url: string }>('/subscriptions/create-checkout', {
				method: 'POST',
				body: { planId, period }
			})

			if (response.url) {
				window.location.href = response.url
			}
		}
	} catch (e: any) {
		console.error('Subscription error:', e)
		toast.show(t('common.error') + ' : ' + (e?.data?.message || t('common.error')), 'error')
		loading.value = false
	}
}

// Reload page with clean URL (no query params)
const reloadClean = () => {
	window.location.href = '/dashboard/subscription'
}

// Cancel subscription
const cancelSubscription = async (reason?: string) => {
	loading.value = true

	try {
		const response = await $api<{ success: boolean; message: string }>('/subscriptions/cancel', {
			method: 'POST',
			body: { reason: reason || 'Annulation par le commerçant' }
		})

		if (response.success) {
			// Immediately update shared subscription state so SubscriptionGate blocks access at once
			if ((response as any).subscription) {
				sharedSubscription.value = (response as any).subscription
			}
			toast.show(response.message, 'success')
			showCancelModal.value = false
			setTimeout(reloadClean, 1500)
		}
	} catch (e: any) {
		console.error('Cancel error:', e)
		toast.show(t('common.error') + ' : ' + (e?.data?.message || t('common.error')), 'error')
	} finally {
		loading.value = false
	}
}

// Reactivate subscription
const reactivateSubscription = async () => {
	loading.value = true

	try {
		const response = await $api<{ success: boolean; message: string }>('/subscriptions/reactivate', {
			method: 'POST'
		})

		if (response.success) {
			toast.show(response.message, 'success')
			setTimeout(reloadClean, 1500)
		}
	} catch (e: any) {
		console.error('Reactivate error:', e)
		toast.show(t('common.error') + ' : ' + (e?.data?.message || t('common.error')), 'error')
		loading.value = false
	}
}

const openPlanSelector = () => {
	showPlanSelector.value = true
}

const closePlanSelector = () => {
	showPlanSelector.value = false
}

// [DEV ONLY] Reset subscription for testing
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl || config.public.apiBase || ''
const isDev = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1') || process.dev
const resettingSubscription = ref(false)

const resetSubscriptionForTesting = async () => {
	if (!confirm('Êtes-vous sûr de vouloir réinitialiser votre abonnement ? Cette action est irréversible.')) {
		return
	}

	resettingSubscription.value = true
	try {
		const response = await $api<{ success: boolean; message: string }>('/subscriptions/reset-for-testing', {
			method: 'POST'
		})
		if (response.success) {
			toast.show(response.message, 'success')
			setTimeout(reloadClean, 1000)
		} else {
			toast.show(response.message, 'error')
		}
	} catch (e: any) {
		toast.show(t('common.error') + ': ' + (e?.data?.message || t('common.error')), 'error')
	} finally {
		resettingSubscription.value = false
	}
}
</script>

<template>
	<div class="space-y-8 relative pb-20">

		<!-- Header -->
		<div>
			<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
				{{ currentSubscription ? $t('subscription.title') : $t('subscription.choose_plan') }}
			</h1>
			<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
				{{ currentSubscription ? $t('subscription.subtitle') : $t('subscription.choose_subtitle') }}
			</p>
		</div>

		<!-- Loading State -->
		<div v-if="subscriptionLoading" class="text-center py-20">
			<Icon name="ph:spinner-gap-bold" size="32" class="mx-auto text-slate-300 animate-spin mb-3" />
			<p class="text-slate-500 font-medium">{{ $t('subscription.loading') }}</p>
		</div>

		<!-- Error State -->
		<div v-else-if="planError" class="max-w-md mx-auto bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-2xl p-6 text-center">
			<Icon name="ph:warning-circle-fill" size="32" class="mx-auto text-[#FF3B30] mb-3" />
			<h3 class="font-bold text-slate-900 dark:text-white mb-1">{{ $t('subscription.error') }}</h3>
			<p class="text-sm text-slate-500">{{ planError.message }}</p>
		</div>

		<!-- Admin Cancellation Notice -->
		<div v-else-if="wasImmediatelyCancelled && !showPlanSelector" class="max-w-2xl mx-auto">
			<div class="bg-white dark:bg-[#1C1C1E] border border-[#FF3B30]/20 rounded-2xl p-6 shadow-sm">
				<div class="flex items-start gap-4">
					<div class="w-11 h-11 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center shrink-0">
						<Icon name="ph:x-circle-fill" class="text-[#FF3B30]" size="22" />
					</div>
					<div class="flex-1">
						<h3 class="font-bold text-slate-900 dark:text-white text-base mb-1">
							{{ $t('subscription.cancelled') }}
						</h3>
						<p class="text-slate-400 text-sm mb-4">
							{{ $t('subscription.cancelled_description') }}
						</p>
						<div class="flex flex-wrap gap-2">
							<NuxtLink to="/dashboard"
								class="px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-xl text-sm transition-colors">
								{{ $t('subscription.back_to_dashboard') }}
							</NuxtLink>
							<button @click="showPlanSelector = true"
								class="px-4 py-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition-colors">
								{{ $t('subscription.see_plans') }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Current Subscription View -->
		<CurrentSubscription v-else-if="currentSubscription && !showPlanSelector" :subscription="currentSubscription"
			:loading="loading" @cancel="showCancelModal = true" @reactivate="reactivateSubscription"
			@change-plan="openPlanSelector" />

		<!-- Plan Selection View -->
		<div v-else-if="plans.length && (showPlanSelector || !currentSubscription || wasImmediatelyCancelled)"
			class="max-w-6xl mx-auto space-y-6">

			<!-- Back button if changing plan or viewing after cancellation -->
			<div v-if="(currentSubscription && showPlanSelector) || wasImmediatelyCancelled"
				class="flex items-center gap-4">
				<button @click="closePlanSelector"
					class="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium">
					<Icon name="ph:arrow-left-bold" class="rtl:rotate-180" />
					{{ wasImmediatelyCancelled ? $t('common.back') : $t('subscription.back_to_subscription') }}
				</button>
			</div>

			<!-- Free Trial Banner -->
			<div v-if="trialInfo.eligible"
				class="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
				<div class="w-10 h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
					<Icon name="ph:gift-bold" class="text-slate-500 dark:text-slate-400" size="20" />
				</div>
				<div>
					<h3 class="font-bold text-slate-900 dark:text-white text-sm">
						{{ $t('subscription.trial.title', { days: trialInfo.days }) }}
					</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400">
						{{ $t('subscription.trial.description') }}
					</p>
				</div>
			</div>

			<!-- Plans Grid -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pt-6">
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

		<!-- Empty State Fallback -->
		<div v-else-if="!plans.length && !currentSubscription"
			class="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm">
			<Icon name="ph:warning-circle" size="48" class="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
			<p class="text-slate-600 dark:text-slate-300 font-medium">{{ $t('subscription.no_plans') }}</p>
			<p class="text-xs text-slate-400 mt-2">{{ $t('subscription.contact_support') }}</p>
		</div>

		<!-- Cancel Modal -->
		<CancelModal :show="showCancelModal" :subscription="currentSubscription" :loading="loading"
			@close="showCancelModal = false" @confirm="cancelSubscription" />

		<!-- [DEV ONLY] Reset Button -->
		<div v-if="isDev && currentSubscription" class="fixed bottom-4 right-4 z-40">
			<button @click="resetSubscriptionForTesting" :disabled="resettingSubscription"
				class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50">
				<Icon v-if="resettingSubscription" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
				<Icon v-else name="ph:trash-bold" size="16" />
				Reset Subscription (DEV)
			</button>
		</div>

		<!-- Upgrade Confirmation Modal -->
		<Teleport to="body">
			<Transition name="modal">
				<div v-if="showUpgradeModal && pendingUpgrade"
					class="fixed inset-0 z-50 flex items-center justify-center p-4">
					<!-- Backdrop -->
					<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cancelUpgrade"></div>

					<!-- Modal -->
					<div
						class="relative bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
						<!-- Header -->
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
								<Icon name="ph:arrows-clockwise-bold" size="18" class="text-slate-500 dark:text-slate-400" />
							</div>
							<div>
								<h3 class="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
									{{ $t('subscription.confirm_change') }}
								</h3>
								<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('subscription.confirm_change_subtitle') }}</p>
							</div>
						</div>

						<!-- Content -->
						<div class="space-y-4">
							<!-- Current plan -->
							<div class="p-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl">
								<p class="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">{{ $t('subscription.current_plan') }}</p>
								<p class="font-bold text-slate-900 dark:text-white">
									{{ currentSubscription?.plan?.name }} - {{
										getPeriodLabel(currentSubscription?.billingPeriod) }}
								</p>
							</div>

							<!-- Arrow -->
							<div class="flex justify-center">
								<Icon name="ph:arrow-down-bold" size="24" class="text-slate-400" />
							</div>

							<!-- New plan -->
							<div class="p-4 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded-xl border-2 border-[#007AFF]">
								<p class="text-xs text-[#007AFF] uppercase font-bold mb-1">{{ $t('subscription.new_plan') }}</p>
								<p class="font-bold text-slate-900 dark:text-white">
									{{ pendingUpgrade.plan?.name }} - {{ getPeriodLabel(pendingUpgrade.period) }}
								</p>
								<p class="text-lg font-bold text-[#007AFF] mt-1">
									{{ getPriceForPeriod(pendingUpgrade.plan, pendingUpgrade.period) }} Dhs
									<span class="text-sm font-normal text-slate-500">
										{{ pendingUpgrade.period === 'monthly' ? '/mois' : pendingUpgrade.period ===
											'annual' ?
										'/an' : '' }}
									</span>
								</p>
							</div>

							<!-- Info message -->
							<div class="flex items-start gap-2.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl px-4 py-3">
								<Icon name="ph:info" class="text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" size="14" />
								<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
									<template v-if="pendingUpgrade.period === 'lifetime' ||
										(pendingUpgrade.period === 'annual' && currentSubscription?.billingPeriod === 'monthly')">
										{{ $t('subscription.prorated_message') }}
									</template>
									<template v-else>
										{{ $t('subscription.billing_period_message') }}
									</template>
								</p>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex gap-3 pt-2">
							<button @click="cancelUpgrade"
								class="flex-1 px-4 py-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors">
								{{ $t('common.cancel') }}
							</button>
							<button @click="confirmUpgrade" :disabled="loading"
								class="flex-1 px-4 py-3 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all disabled:opacity-40">
								<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin mr-2" />
								{{ $t('subscription.confirm_change') }}
							</button>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>
