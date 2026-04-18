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

const billingPeriodLabel = computed(() => {
	if (props.subscription?.billingPeriod === 'monthly') return t('subscription.current.monthly')
	if (props.subscription?.billingPeriod === 'annual') return t('subscription.current.annual')
	return t('subscription.current.lifetime')
})

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
	if (isExpired.value) return { dot: 'bg-red-500', text: 'text-red-600', label: t('subscription.current.status_expired') }
	if (props.subscription?.cancelledAt) return { dot: 'bg-amber-400', text: 'text-amber-600', label: t('subscription.current.status_ending_soon') }
	if (props.subscription?.status === 'active') return { dot: 'bg-emerald-500', text: 'text-emerald-600', label: t('subscription.current.status_active') }
	return { dot: 'bg-slate-400', text: 'text-slate-500', label: props.subscription?.status }
})
</script>

<template>
	<div class="max-w-2xl mx-auto space-y-4">

		<!-- Status card -->
		<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">

			<!-- Header: plan + price -->
			<div class="px-5 py-4 flex items-start justify-between border-b border-slate-100 dark:border-slate-800">
				<div class="flex-1 min-w-0 pr-4">
					<div class="flex items-center gap-2 mb-1.5 flex-wrap">
						<h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ subscription.plan.name }}</h2>
						<span class="inline-flex items-center gap-1.5 text-xs" :class="statusInfo.text">
							<span :class="[statusInfo.dot, 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
							{{ statusInfo.label }}
						</span>
					</div>
					<p class="text-sm text-slate-400 dark:text-slate-500 leading-snug">
						{{ $te(`subscription.plan_descriptions.${subscription.plan.name}`) ? $t(`subscription.plan_descriptions.${subscription.plan.name}`) : subscription.plan.description }}
					</p>
				</div>
				<div class="text-right shrink-0">
					<p class="text-2xl font-semibold text-slate-900 dark:text-white leading-none tabular-nums">
						{{ subscription.price }}<span class="text-sm font-normal text-slate-400 ml-1">Dhs</span>
					</p>
					<p class="text-xs text-slate-400 mt-1">{{ pricePerPeriodLabel }}</p>
				</div>
			</div>

			<!-- Alerts -->
			<div class="px-5 space-y-2"
				:class="{ 'pt-4': subscription.pendingPlanId || isExpired || subscription.cancelledAt || isEndingSoon || (subscription.isTrialing && subscription.trialEnd) }">

				<div v-if="subscription.pendingPlanId"
					class="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-md px-4 py-3">
					<Icon name="ph:clock-countdown-fill" class="text-[#007AFF] mt-0.5 shrink-0" size="16" />
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
					class="flex items-start gap-3 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-md px-4 py-3">
					<Icon name="ph:x-circle-fill" class="text-red-500 mt-0.5 shrink-0" size="16" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.expired_title') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.expired_description') }}</p>
					</div>
				</div>

				<div v-else-if="subscription.cancelledAt"
					class="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-md px-4 py-3">
					<Icon name="ph:warning-fill" class="text-amber-500 mt-0.5 shrink-0" size="16" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.ending_on', {
							date: formatDate(subscription.currentPeriodEnd, { day: 'numeric', month: 'long', year: 'numeric' })
						}) }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.ending_on_description') }}</p>
					</div>
				</div>

				<div v-else-if="isEndingSoon"
					class="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-md px-4 py-3">
					<Icon name="ph:info-fill" class="text-[#007AFF] mt-0.5 shrink-0" size="16" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.renews_in_days', { days: daysRemaining }) }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.renews_in_days_description', {
							date: formatDate(subscription.currentPeriodEnd),
							price: subscription.price
						}) }}</p>
					</div>
				</div>

				<div v-else-if="subscription.isTrialing && subscription.trialEnd"
					class="flex items-start gap-3 bg-slate-50 dark:bg-slate-800 rounded-md px-4 py-3">
					<Icon name="ph:gift-fill" class="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" size="16" />
					<div>
						<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('subscription.current.trial_period') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.trial_period_description', {
							date: formatDate(subscription.trialEnd, { day: 'numeric', month: 'long', year: 'numeric' }),
							price: subscription.price
						}) }}</p>
					</div>
				</div>
			</div>

			<!-- Info rows -->
			<div class="divide-y divide-slate-100 dark:divide-slate-800 mt-4">
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:calendar-check" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div>
						<p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.current.billing_period') }}</p>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ billingPeriodLabel }}</p>
					</div>
				</div>
				<div v-if="subscription.nextBillingDate && !subscription.cancelledAt" class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:arrow-clockwise" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div>
						<p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.current.next_renewal') }}</p>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(subscription.nextBillingDate, { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
					</div>
				</div>
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<Icon name="ph:star-fill" class="text-slate-400 dark:text-slate-500" size="14" />
					</div>
					<div>
						<p class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.current.member_since') }}</p>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(subscription.startedAt, { month: 'long', year: 'numeric' }) }}</p>
					</div>
				</div>
			</div>

			<!-- Actions footer -->
			<div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800">

				<NuxtLink to="/dashboard/subscription/invoices"
					class="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-md text-sm transition-colors hover:bg-slate-50">
					<Icon name="ph:receipt-bold" size="14" />
					{{ $t('subscription.current.my_invoices') }}
				</NuxtLink>

				<button v-if="subscription.billingPeriod !== 'lifetime'" @click="openBillingPortal" :disabled="portalLoading"
					class="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-md text-sm transition-colors hover:bg-slate-50 disabled:opacity-50">
					<Icon v-if="portalLoading" name="ph:spinner-gap-bold" class="animate-spin" size="14" />
					<Icon v-else name="ph:credit-card-bold" size="14" />
					{{ $t('subscription.current.billing_portal') }}
				</button>

				<button v-if="isExpired" @click="emit('changePlan')"
					class="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-medium rounded-md text-sm transition-all">
					<Icon name="ph:arrow-right-bold" size="14" class="rtl:rotate-180" />
					{{ $t('subscription.current.choose_new_plan') }}
				</button>

				<button v-else-if="subscription.cancelledAt" @click="emit('reactivate')" :disabled="loading"
					class="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-medium rounded-md text-sm transition-all disabled:opacity-40">
					<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" size="14" />
					<span>{{ loading ? $t('subscription.current.loading') : $t('subscription.current.reactivate') }}</span>
				</button>

				<template v-if="!subscription.cancelledAt">
					<NuxtLink to="/dashboard"
						class="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-md text-sm transition-colors hover:bg-slate-50">
						{{ $t('subscription.current.back_to_home') }}
					</NuxtLink>
					<button v-if="subscription.billingPeriod !== 'lifetime'" @click="emit('changePlan')"
						class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-md text-sm transition-all">
						{{ $t('subscription.current.change_plan') }}
					</button>
					<button v-if="subscription.billingPeriod !== 'lifetime'" @click="emit('cancel')"
						class="px-3.5 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/30 text-red-500 font-medium rounded-md text-sm transition-colors hover:bg-red-50">
						{{ $t('subscription.current.cancel') }}
					</button>
				</template>
			</div>
		</div>

		<!-- Features grid -->
		<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
			<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
				<p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ $t('subscription.current.included_features') }}</p>
			</div>
			<div class="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">

				<div class="px-5 py-4 flex flex-col">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
						<Icon name="ph:game-controller-bold" class="text-slate-400 dark:text-slate-500" size="15" />
					</div>
					<p class="text-2xl font-semibold text-slate-900 dark:text-white leading-none tabular-nums">{{ subscription.plan.features.max_games }}</p>
					<p class="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1.5">{{ $t('subscription.current.active_games_label') }}</p>
					<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{{ $t('subscription.current.active_games_description') }}</p>
				</div>

				<div class="px-5 py-4 flex flex-col">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
						<Icon name="ph:users-bold" class="text-slate-400 dark:text-slate-500" size="15" />
					</div>
					<p class="text-2xl font-semibold text-slate-900 dark:text-white leading-none tabular-nums">{{ subscription.plan.features.max_players.toLocaleString() }}</p>
					<p class="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1.5">{{ $t('subscription.current.players_label') }}</p>
					<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{{ $t('subscription.current.players_description') }}</p>
				</div>

				<div class="px-5 py-4 flex flex-col">
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
						<Icon name="ph:envelope-bold" class="text-slate-400 dark:text-slate-500" size="15" />
					</div>
					<p class="text-2xl font-semibold text-slate-900 dark:text-white leading-none tabular-nums">{{ subscription.plan.features.email_credits_per_month.toLocaleString() }}</p>
					<p class="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1.5">{{ $t('subscription.current.emails_per_month_label') }}</p>
					<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{{ $t('subscription.current.emails_per_month_description') }}</p>
				</div>

			</div>
		</div>
	</div>
</template>
