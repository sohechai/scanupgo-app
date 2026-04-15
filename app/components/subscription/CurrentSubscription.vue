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
		// silently fail — portal not configured
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
	const end = new Date(props.subscription.currentPeriodEnd)
	const now = new Date()
	const diff = end.getTime() - now.getTime()
	return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

const isExpired = computed(() => {
	if (!props.subscription?.cancelledAt) return false
	return daysRemaining.value !== null && daysRemaining.value <= 0
})

const isEndingSoon = computed(() => {
	return daysRemaining.value !== null && daysRemaining.value <= 7 && daysRemaining.value > 0
})

const statusLabel = computed(() => {
	if (isExpired.value) return t('subscription.current.status_expired')
	if (props.subscription?.status === 'active' && !props.subscription?.cancelledAt) return t('subscription.current.status_active')
	if (props.subscription?.cancelledAt) return t('subscription.current.status_ending_soon')
	return props.subscription?.status
})

const statusBadgeClass = computed(() => {
	if (isExpired.value) return 'bg-[#FF3B30]/10 text-[#FF3B30]'
	if (props.subscription?.status === 'active' && !props.subscription?.cancelledAt) return 'bg-[#34C759]/10 text-[#34C759]'
	if (props.subscription?.cancelledAt) return 'bg-[#FF9500]/10 text-[#FF9500]'
	return 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-500'
})
</script>

<template>
	<div class="max-w-2xl mx-auto space-y-4">

		<!-- ── Status card ── -->
		<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 shadow-sm overflow-hidden">

			<!-- Header: plan + price -->
			<div class="px-5 pt-5 pb-4 flex items-start justify-between border-b border-[#E5E5EA] dark:border-slate-700/40">
				<div class="flex-1 min-w-0 pr-4">
					<div class="flex items-center gap-2 mb-1.5 flex-wrap">
						<h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ subscription.plan.name }}</h2>
						<span :class="['px-2.5 py-0.5 rounded-full text-[11px] font-bold', statusBadgeClass]">{{ statusLabel }}</span>
					</div>
					<p class="text-sm text-slate-400 dark:text-slate-500 leading-snug">{{ $te(`subscription.plan_descriptions.${subscription.plan.name}`) ? $t(`subscription.plan_descriptions.${subscription.plan.name}`) : subscription.plan.description }}</p>
				</div>
				<div class="text-right shrink-0">
					<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ subscription.price }}<span class="text-sm font-normal text-slate-400 ml-1">Dhs</span></p>
					<p class="text-[11px] text-slate-400 mt-1">{{ pricePerPeriodLabel }}</p>
				</div>
			</div>

			<!-- Alerts (semantic colors preserved) -->
			<div class="px-5 space-y-2" :class="{ 'pt-4': subscription.pendingPlanId || isExpired || subscription.cancelledAt || isEndingSoon || (subscription.isTrialing && subscription.trialEnd) }">

				<!-- Pending plan change -->
				<div v-if="subscription.pendingPlanId"
					class="flex items-start gap-3 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl px-4 py-3">
					<Icon name="ph:clock-countdown-fill" class="text-[#007AFF] mt-0.5 shrink-0" size="18" />
					<div>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.plan_change_scheduled') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.plan_change_description', {
							planName: subscription.pendingPlan?.name,
							period: pendingPeriodLabel,
							date: formatDate(subscription.pendingChangeDate, { day: 'numeric', month: 'long', year: 'numeric' })
						}) }}</p>
					</div>
				</div>

				<!-- Expired -->
				<div v-if="isExpired"
					class="flex items-start gap-3 bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-xl px-4 py-3">
					<Icon name="ph:x-circle-fill" class="text-[#FF3B30] mt-0.5 shrink-0" size="18" />
					<div>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.expired_title') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.expired_description') }}</p>
					</div>
				</div>

				<!-- Ending (cancelled, still has access) -->
				<div v-else-if="subscription.cancelledAt"
					class="flex items-start gap-3 bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl px-4 py-3">
					<Icon name="ph:warning-fill" class="text-[#FF9500] mt-0.5 shrink-0" size="18" />
					<div>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.ending_on', {
							date: formatDate(subscription.currentPeriodEnd, { day: 'numeric', month: 'long', year: 'numeric' })
						}) }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.ending_on_description') }}</p>
					</div>
				</div>

				<!-- Ending soon (<7 days) -->
				<div v-else-if="isEndingSoon"
					class="flex items-start gap-3 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl px-4 py-3">
					<Icon name="ph:info-fill" class="text-[#007AFF] mt-0.5 shrink-0" size="18" />
					<div>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.renews_in_days', { days: daysRemaining }) }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.renews_in_days_description', {
							date: formatDate(subscription.currentPeriodEnd),
							price: subscription.price
						}) }}</p>
					</div>
				</div>

				<!-- Trial -->
				<div v-else-if="subscription.isTrialing && subscription.trialEnd"
					class="flex items-start gap-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl px-4 py-3">
					<Icon name="ph:gift-fill" class="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" size="18" />
					<div>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.trial_period') }}</p>
						<p class="text-xs text-slate-400 mt-0.5">{{ $t('subscription.current.trial_period_description', {
							date: formatDate(subscription.trialEnd, { day: 'numeric', month: 'long', year: 'numeric' }),
							price: subscription.price
						}) }}</p>
					</div>
				</div>
			</div>

			<!-- Info rows (iOS list) -->
			<div class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40 mt-4">
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon name="ph:calendar-check" class="text-slate-500 dark:text-slate-400" size="15" />
					</div>
					<div>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{{ $t('subscription.current.billing_period') }}</p>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ billingPeriodLabel }}</p>
					</div>
				</div>
				<div v-if="subscription.nextBillingDate && !subscription.cancelledAt" class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon name="ph:arrow-clockwise" class="text-slate-500 dark:text-slate-400" size="15" />
					</div>
					<div>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{{ $t('subscription.current.next_renewal') }}</p>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(subscription.nextBillingDate, { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
					</div>
				</div>
				<div class="flex items-center gap-3.5 px-5 py-3.5">
					<div class="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon name="ph:star-fill" class="text-slate-500 dark:text-slate-400" size="15" />
					</div>
					<div>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{{ $t('subscription.current.member_since') }}</p>
						<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(subscription.startedAt, { month: 'long', year: 'numeric' }) }}</p>
					</div>
				</div>
			</div>

			<!-- Actions footer -->
			<div class="px-5 py-4 bg-[#F2F2F7] dark:bg-[#2C2C2E] flex flex-wrap gap-2 border-t border-[#E5E5EA] dark:border-slate-700/40">

				<!-- Invoices (always visible) -->
				<NuxtLink to="/dashboard/subscription/invoices"
					class="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm shadow-sm transition-colors hover:bg-[#F2F2F7]">
					<Icon name="ph:receipt-bold" size="15" />
					{{ $t('subscription.current.my_invoices') }}
				</NuxtLink>

				<!-- Stripe Billing Portal -->
				<button v-if="subscription.billingPeriod !== 'lifetime'" @click="openBillingPortal" :disabled="portalLoading"
					class="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm shadow-sm transition-colors hover:bg-[#F2F2F7] disabled:opacity-50">
					<Icon v-if="portalLoading" name="ph:spinner-gap-bold" class="animate-spin" size="15" />
					<Icon v-else name="ph:credit-card-bold" size="15" />
					{{ $t('subscription.current.billing_portal') }}
				</button>

				<!-- Expired: choose new plan -->
				<button v-if="isExpired" @click="emit('changePlan')"
					class="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl text-sm shadow-lg shadow-[#007AFF]/25 transition-all">
					<Icon name="ph:arrow-right-bold" size="15" class="rtl:rotate-180" />
					{{ $t('subscription.current.choose_new_plan') }}
				</button>

				<!-- Reactivate (cancelled but not expired) -->
				<button v-else-if="subscription.cancelledAt" @click="emit('reactivate')" :disabled="loading"
					class="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl text-sm shadow-lg shadow-[#007AFF]/25 transition-all disabled:opacity-40">
					<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" size="15" />
					<span>{{ loading ? $t('subscription.current.loading') : $t('subscription.current.reactivate') }}</span>
				</button>

				<!-- Active subscription actions -->
				<template v-if="!subscription.cancelledAt">
					<NuxtLink to="/dashboard"
						class="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm shadow-sm transition-colors hover:bg-[#F2F2F7]">
						{{ $t('subscription.current.back_to_home') }}
					</NuxtLink>
					<button v-if="subscription.billingPeriod !== 'lifetime'" @click="emit('changePlan')"
						class="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-xl text-sm shadow-sm transition-all">
						{{ $t('subscription.current.change_plan') }}
					</button>
					<button v-if="subscription.billingPeriod !== 'lifetime'" @click="emit('cancel')"
						class="px-4 py-2.5 bg-white dark:bg-[#1C1C1E] border border-[#FF3B30]/30 dark:border-[#FF3B30]/20 text-[#FF3B30] font-semibold rounded-xl text-sm transition-colors hover:bg-[#FF3B30]/5">
						{{ $t('subscription.current.cancel') }}
					</button>
				</template>
			</div>
		</div>

		<!-- ── Features widget grid ── -->
		<div class="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl p-1.5">
			<p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 pt-2.5 pb-2">{{ $t('subscription.current.included_features') }}</p>
			<div class="grid grid-cols-3 gap-1.5">

				<!-- Active games -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 flex flex-col shadow-sm">
					<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-3">
						<Icon name="ph:game-controller-bold" class="text-slate-500 dark:text-slate-400" size="17" />
					</div>
					<p class="text-[28px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">{{ subscription.plan.features.max_games }}</p>
					<p class="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mt-1.5">{{ $t('subscription.current.active_games_label') }}</p>
					<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{{ $t('subscription.current.active_games_description') }}</p>
				</div>

				<!-- Players -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 flex flex-col shadow-sm">
					<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-3">
						<Icon name="ph:users-bold" class="text-slate-500 dark:text-slate-400" size="17" />
					</div>
					<p class="text-[28px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">{{ subscription.plan.features.max_players.toLocaleString() }}</p>
					<p class="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mt-1.5">{{ $t('subscription.current.players_label') }}</p>
					<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{{ $t('subscription.current.players_description') }}</p>
				</div>

				<!-- Emails -->
				<div class="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 flex flex-col shadow-sm">
					<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-3">
						<Icon name="ph:envelope-bold" class="text-slate-500 dark:text-slate-400" size="17" />
					</div>
					<p class="text-[28px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">{{ subscription.plan.features.email_credits_per_month.toLocaleString() }}</p>
					<p class="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mt-1.5">{{ $t('subscription.current.emails_per_month_label') }}</p>
					<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{{ $t('subscription.current.emails_per_month_description') }}</p>
				</div>
			</div>
		</div>
	</div>
</template>
