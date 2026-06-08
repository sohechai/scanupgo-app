<script setup lang="ts">
interface Props {
	subscription: any
	loading: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
	cancel: []
	reactivate: []
	changePlan: []
}>()

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const { $api } = useNuxtApp()

const portalLoading = ref(false)
const openBillingPortal = async () => {
	portalLoading.value = true
	try {
		const { url } = await $api<{ url: string }>('/subscriptions/billing-portal', { method: 'POST' })
		window.open(url, '_blank')
	} catch {
		// silently fail
	} finally {
		portalLoading.value = false
	}
}

const pendingPeriodLabel = computed(() => {
	if (props.subscription?.pendingPeriod === 'monthly') return t('subscription.current.monthly')
	if (props.subscription?.pendingPeriod === 'annual') return t('subscription.current.annual')
	return t('subscription.current.lifetime')
})

const pricePerPeriodLabel = computed(() => {
	if (props.subscription?.billingPeriod === 'monthly') return t('subscription.current.per_month')
	if (props.subscription?.billingPeriod === 'annual') return t('subscription.current.per_year')
	return t('subscription.current.one_time_payment')
})

const daysRemaining = computed(() => {
	if (!props.subscription?.currentPeriodEnd) return null
	const diff = new Date(props.subscription.currentPeriodEnd).getTime() - Date.now()
	return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

const isExpired = computed(() => {
	if (!props.subscription?.cancelledAt) return false
	return daysRemaining.value !== null && daysRemaining.value <= 0
})

const isEndingSoon = computed(() => {
	return daysRemaining.value !== null && daysRemaining.value <= 7 && daysRemaining.value > 0
})

const statusInfo = computed(() => {
	if (isExpired.value) return { dot: 'bg-red-500', badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20', label: t('subscription.current.status_expired') }
	if (props.subscription?.cancelledAt) return { dot: 'bg-amber-400', badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20', label: t('subscription.current.status_ending_soon') }
	if (props.subscription?.status === 'active') return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', label: t('subscription.current.status_active') }
	return { dot: 'bg-slate-400', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700', label: props.subscription?.status }
})

// Billing cycle progress
const cycleProgress = computed(() => {
	const start = props.subscription?.currentPeriodStart
	const end = props.subscription?.currentPeriodEnd
	if (!start || !end) return null
	const startMs = new Date(start).getTime()
	const endMs = new Date(end).getTime()
	const nowMs = Date.now()
	const total = endMs - startMs
	if (total <= 0) return null
	const elapsed = Math.min(Math.max(nowMs - startMs, 0), total)
	return Math.round((elapsed / total) * 100)
})

const isLifetime = computed(() => props.subscription?.billingPeriod === 'lifetime')
const canChangePlan = computed(() => !isLifetime.value && !props.subscription?.cancelledAt)
const canCancel = computed(() => !isLifetime.value && !props.subscription?.cancelledAt && !!props.subscription?.stripeSubscriptionId)
</script>

<template>
	<div class="max-w-2xl mx-auto space-y-3">

		<!-- Main card -->
		<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

			<!-- Hero: plan + price + status -->
			<div class="px-6 pt-6 pb-5">
				<div class="flex items-start justify-between gap-4">
					<div>
						<div class="flex items-center gap-2 mb-1">
							<h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ subscription.plan.name }}</h2>
							<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border" :class="statusInfo.badge">
								<span :class="[statusInfo.dot, 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
								{{ statusInfo.label }}
							</span>
						</div>
						<p class="text-sm text-slate-400 dark:text-slate-500">
							{{ $te(`subscription.plan_descriptions.${subscription.plan.name}`) ? $t(`subscription.plan_descriptions.${subscription.plan.name}`) : subscription.plan.description }}
						</p>
					</div>
					<div class="text-right shrink-0">
						<p class="text-3xl font-bold text-slate-900 dark:text-white leading-none tabular-nums">
							{{ subscription.price }}<span class="text-base font-normal text-slate-400 ml-1">Dhs</span>
						</p>
						<p class="text-xs text-slate-400 mt-1">{{ pricePerPeriodLabel }}</p>
					</div>
				</div>

				<!-- Billing cycle progress bar -->
				<div v-if="cycleProgress !== null && !isLifetime && !subscription.cancelledAt" class="mt-5">
					<div class="flex items-center justify-between mb-1.5">
						<span class="text-xs text-slate-400">{{ formatDate(subscription.currentPeriodStart, { day: 'numeric', month: 'short' }) }}</span>
						<span class="text-xs font-semibold" :class="isEndingSoon ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'">
							<template v-if="daysRemaining !== null && daysRemaining > 0">
								{{ $t('subscription.current.days_remaining', { days: daysRemaining }) }}
							</template>
						</span>
						<span class="text-xs text-slate-400">{{ formatDate(subscription.currentPeriodEnd, { day: 'numeric', month: 'short' }) }}</span>
					</div>
					<div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all"
							:class="isEndingSoon ? 'bg-amber-400' : 'bg-[#007AFF]'"
							:style="{ width: `${cycleProgress}%` }"
						></div>
					</div>
				</div>

				<!-- Lifetime label -->
				<div v-else-if="isLifetime" class="mt-4 flex items-center gap-2 text-sm text-slate-400">
					<Icon name="ph:infinity-bold" size="16" class="text-[#007AFF]" />
					<span>{{ $t('subscription.current.lifetime_access') }}</span>
				</div>
			</div>

			<!-- Alerts -->
			<div class="px-6 space-y-2"
				:class="{ 'pb-4': subscription.pendingPlanId || isExpired || subscription.cancelledAt || (subscription.isTrialing && subscription.trialEnd) }">

				<div v-if="subscription.pendingPlanId"
					class="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg px-4 py-3">
					<Icon name="ph:clock-countdown-fill" class="text-[#007AFF] mt-0.5 shrink-0" size="15" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.plan_change_scheduled') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.plan_change_description', {
							planName: subscription.pendingPlan?.name,
							period: pendingPeriodLabel,
							date: formatDate(subscription.pendingChangeDate, { day: 'numeric', month: 'long', year: 'numeric' })
						}) }}</p>
					</div>
				</div>

				<div v-if="isExpired"
					class="flex items-start gap-3 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-lg px-4 py-3">
					<Icon name="ph:x-circle-fill" class="text-red-500 mt-0.5 shrink-0" size="15" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.expired_title') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.expired_description') }}</p>
					</div>
				</div>

				<div v-else-if="subscription.cancelledAt"
					class="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-lg px-4 py-3">
					<Icon name="ph:warning-fill" class="text-amber-500 mt-0.5 shrink-0" size="15" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.ending_on', {
							date: formatDate(subscription.currentPeriodEnd, { day: 'numeric', month: 'long', year: 'numeric' })
						}) }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.ending_on_description') }}</p>
					</div>
				</div>

				<div v-else-if="subscription.isTrialing && subscription.trialEnd"
					class="flex items-start gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3">
					<Icon name="ph:gift-fill" class="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" size="15" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.trial_period') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.trial_period_description', {
							date: formatDate(subscription.trialEnd, { day: 'numeric', month: 'long', year: 'numeric' }),
							price: subscription.price
						}) }}</p>
					</div>
				</div>
			</div>

			<!-- Features row -->
			<div class="grid grid-cols-3 border-t border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
				<div class="px-4 py-4 flex flex-col items-center text-center">
					<Icon name="ph:game-controller-bold" class="text-slate-400 dark:text-slate-500 mb-1.5" size="16" />
					<p class="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{{ subscription.plan.features.max_games ?? '∞' }}</p>
					<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.active_games_label') }}</p>
				</div>
				<div class="px-4 py-4 flex flex-col items-center text-center">
					<Icon name="ph:users-bold" class="text-slate-400 dark:text-slate-500 mb-1.5" size="16" />
					<p class="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{{ subscription.plan.features.max_players != null ? subscription.plan.features.max_players.toLocaleString() : '∞' }}</p>
					<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.players_label') }}</p>
				</div>
				<div class="px-4 py-4 flex flex-col items-center text-center">
					<Icon name="ph:envelope-bold" class="text-slate-400 dark:text-slate-500 mb-1.5" size="16" />
					<p class="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{{ subscription.plan.features.email_credits_per_month != null ? subscription.plan.features.email_credits_per_month.toLocaleString() : '∞' }}</p>
					<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.emails_per_month_label') }}</p>
				</div>
			</div>

			<!-- Actions -->
			<div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 space-y-3">

				<!-- Primary CTA -->
				<button v-if="isExpired" @click="emit('changePlan')"
					class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.99] text-white font-semibold rounded-lg text-sm transition-all">
					<Icon name="ph:arrow-right-bold" size="14" />
					{{ $t('subscription.current.choose_new_plan') }}
				</button>

				<button v-else-if="subscription.cancelledAt" @click="emit('reactivate')" :disabled="loading"
					class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.99] text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-40">
					<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" size="14" />
					<span>{{ loading ? $t('subscription.current.loading') : $t('subscription.current.reactivate') }}</span>
				</button>

				<button v-else-if="canChangePlan" @click="emit('changePlan')"
					class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.99] text-white dark:text-slate-900 font-semibold rounded-lg text-sm transition-all">
					{{ $t('subscription.current.change_plan') }}
				</button>

				<!-- Secondary actions row -->
				<div class="flex items-center gap-2">
					<NuxtLink to="/dashboard/subscription/invoices"
						class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-lg text-sm transition-colors">
						<Icon name="ph:receipt-bold" size="14" />
						{{ $t('subscription.current.my_invoices') }}
					</NuxtLink>

					<button v-if="!isLifetime" @click="openBillingPortal" :disabled="portalLoading"
						class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-lg text-sm transition-colors disabled:opacity-50">
						<Icon v-if="portalLoading" name="ph:spinner-gap-bold" class="animate-spin" size="14" />
						<Icon v-else name="ph:credit-card-bold" size="14" />
						{{ $t('subscription.current.billing_portal') }}
					</button>
				</div>

				<!-- Destructive: cancel as text link -->
				<div v-if="canCancel" class="flex justify-center pt-1">
					<button @click="emit('cancel')"
						class="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors underline underline-offset-2">
						{{ $t('subscription.current.cancel') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
