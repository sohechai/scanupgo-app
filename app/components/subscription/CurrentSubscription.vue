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

// Helper for billing period label
const billingPeriodLabel = computed(() => {
	if (props.subscription?.billingPeriod === 'monthly') return t('subscription.current.monthly')
	if (props.subscription?.billingPeriod === 'annual') return t('subscription.current.annual')
	return t('subscription.current.lifetime')
})

// Helper for pending plan period label
const pendingPeriodLabel = computed(() => {
	if (props.subscription?.pendingPeriod === 'monthly') return t('subscription.current.monthly')
	if (props.subscription?.pendingPeriod === 'annual') return t('subscription.current.annual')
	return t('subscription.current.lifetime')
})

// Helper for price per period label
const pricePerPeriodLabel = computed(() => {
	if (props.subscription?.billingPeriod === 'monthly') return t('subscription.current.per_month')
	if (props.subscription?.billingPeriod === 'annual') return t('subscription.current.per_year')
	return t('subscription.current.one_time_payment')
})

// Calculate days remaining
const daysRemaining = computed(() => {
	if (!props.subscription?.currentPeriodEnd) return null
	const end = new Date(props.subscription.currentPeriodEnd)
	const now = new Date()
	const diff = end.getTime() - now.getTime()
	return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

// Check if subscription has expired (end date is today or in the past)
const isExpired = computed(() => {
	if (!props.subscription?.cancelledAt) return false
	return daysRemaining.value !== null && daysRemaining.value <= 0
})

// Check if subscription is ending soon
const isEndingSoon = computed(() => {
	return daysRemaining.value !== null && daysRemaining.value <= 7 && daysRemaining.value > 0
})
</script>

<template>
	<div class="max-w-4xl mx-auto space-y-6">
		<!-- Subscription Status Card -->
		<div
			class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">

			<!-- Header with Status -->
			<div class="p-8 border-b border-slate-50 dark:border-slate-700">
				<div class="flex items-start justify-between mb-6">
					<div>
						<div class="flex items-center gap-3 mb-2">
							<h2 class="text-2xl font-bold text-slate-900 dark:text-white">{{ subscription.plan.name }}
							</h2>
							<span :class="[
								'px-3 py-1 rounded-full text-xs font-bold border',
								isExpired
									? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
									: subscription.status === 'active' && !subscription.cancelledAt
										? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
										: subscription.status === 'canceled' || subscription.cancelledAt
											? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
											: 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
							]">
								{{
									isExpired ? $t('subscription.current.status_expired') :
										subscription.status === 'active' && !subscription.cancelledAt ? $t('subscription.current.status_active') :
											subscription.cancelledAt ? $t('subscription.current.status_ending_soon') :
												subscription.status
								}}
							</span>
						</div>
						<p class="text-sm text-slate-500 dark:text-slate-400">{{ subscription.plan.description }}</p>
					</div>
					<div class="text-right rtl:text-left">
						<div class="text-3xl font-display font-bold text-slate-900 dark:text-white">
							{{ subscription.price }} <span class="text-lg text-slate-500 dark:text-slate-400">Dhs</span>
						</div>
						<div class="text-xs text-slate-400 mt-1">
							{{ pricePerPeriodLabel }}
						</div>
					</div>
				</div>

				<!-- Pending Plan Change Warning -->
				<div v-if="subscription.pendingPlanId"
					class="mb-6 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
					<div class="flex items-start gap-3">
						<Icon name="ph:clock-countdown-fill" class="text-purple-600 dark:text-purple-400 mt-0.5"
							size="20" />
						<div class="flex-1">
							<p class="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">
								{{ $t('subscription.current.plan_change_scheduled') }}
							</p>
							<p class="text-xs text-purple-700 dark:text-purple-400">
								{{ $t('subscription.current.plan_change_description', {
									planName: subscription.pendingPlan?.name,
									period: pendingPeriodLabel,
									date: formatDate(subscription.pendingChangeDate, { day: 'numeric', month: 'long', year: 'numeric' })
								}) }}
							</p>
						</div>
					</div>
				</div>


				<!-- Expired Warning -->
				<div v-if="isExpired"
					class="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
					<div class="flex items-start gap-3">
						<Icon name="ph:x-circle-fill" class="text-red-600 dark:text-red-500 mt-0.5" size="20" />
						<div class="flex-1">
							<p class="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">
								{{ $t('subscription.current.expired_title') }}
							</p>
							<p class="text-xs text-red-700 dark:text-red-500">
								{{ $t('subscription.current.expired_description') }}
							</p>
						</div>
					</div>
				</div>

				<!-- Cancellation Warning (ending soon, not yet expired) -->
				<div v-else-if="subscription.cancelledAt"
					class="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
					<div class="flex items-start gap-3">
						<Icon name="ph:warning-fill" class="text-amber-600 dark:text-amber-500 mt-0.5" size="20" />
						<div class="flex-1">
							<p class="text-sm font-semibold text-amber-900 dark:text-amber-400 mb-1">
								{{ $t('subscription.current.ending_on', {
									date: formatDate(subscription.currentPeriodEnd, { day: 'numeric', month: 'long', year: 'numeric' })
								}) }}
							</p>
							<p class="text-xs text-amber-700 dark:text-amber-500">
								{{ $t('subscription.current.ending_on_description') }}
							</p>
						</div>
					</div>
				</div>

				<!-- Ending Soon Warning -->
				<div v-else-if="isEndingSoon"
					class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
					<div class="flex items-start gap-3">
						<Icon name="ph:info-fill" class="text-blue-600 dark:text-blue-400 mt-0.5" size="20" />
						<div class="flex-1">
							<p class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
								{{ $t('subscription.current.renews_in_days', { days: daysRemaining }) }}
							</p>
							<p class="text-xs text-blue-700 dark:text-blue-400">
								{{ $t('subscription.current.renews_in_days_description', {
									date: formatDate(subscription.currentPeriodEnd),
									price: subscription.price
								}) }}
							</p>
						</div>
					</div>
				</div>

				<!-- Trial Period Notice -->
				<div v-else-if="subscription.isTrialing && subscription.trialEnd"
					class="mb-6 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
					<div class="flex items-start gap-3">
						<Icon name="ph:gift-fill" class="text-purple-600 dark:text-purple-400 mt-0.5" size="20" />
						<div class="flex-1">
							<p class="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">
								{{ $t('subscription.current.trial_period') }}
							</p>
							<p class="text-xs text-purple-700 dark:text-purple-400">
								{{ $t('subscription.current.trial_period_description', {
									date: formatDate(subscription.trialEnd, { day: 'numeric', month: 'long', year: 'numeric' }),
									price: subscription.price
								}) }}
							</p>
						</div>
					</div>
				</div>

				<!-- Info Grid -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div>
						<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('subscription.current.billing_period') }}</p>
						<p class="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
							<Icon name="ph:calendar-check" class="text-slate-400" />
							{{ billingPeriodLabel }}
						</p>
					</div>
					<div v-if="subscription.nextBillingDate && !subscription.cancelledAt">
						<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('subscription.current.next_renewal') }}</p>
						<p class="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
							<Icon name="ph:arrow-clockwise" class="text-slate-400" />
							{{ formatDate(subscription.nextBillingDate, { day: 'numeric', month: 'long', year: 'numeric' }) }}
						</p>
					</div>
					<div>
						<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{{ $t('subscription.current.member_since') }}</p>
						<p class="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
							<Icon name="ph:star-fill" class="text-slate-400" />
							{{ formatDate(subscription.startedAt, { month: 'long', year: 'numeric' }) }}
						</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="p-6 bg-slate-50/50 dark:bg-slate-700/50 flex flex-wrap gap-3">
				<!-- Factures - toujours visible -->
				<NuxtLink to="/dashboard/subscription/invoices"
					class="flex-1 min-w-[150px] px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-center transition-colors text-sm shadow-sm">
					<Icon name="ph:receipt-bold" class="inline mr-1.5" size="16" />
					{{ $t('subscription.current.my_invoices') }}
				</NuxtLink>

				<!-- Si expiré: bouton pour choisir un nouveau plan -->
				<button v-if="isExpired" @click="emit('changePlan')"
					class="flex-1 min-w-[200px] px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-center transition-colors text-sm shadow-sm">
					<Icon name="ph:arrow-right-bold" class="inline mr-1.5 rtl:rotate-180" size="16" />
					{{ $t('subscription.current.choose_new_plan') }}
				</button>

				<!-- Réactiver si annulé mais pas encore expiré -->
				<button v-else-if="subscription.cancelledAt" @click="emit('reactivate')" :disabled="loading"
					class="flex-1 min-w-[200px] px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-center transition-colors text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
					<span v-if="loading" class="flex items-center justify-center gap-2">
						<Icon name="ph:spinner-gap-bold" class="animate-spin" />
						{{ $t('subscription.current.loading') }}
					</span>
					<span v-else>{{ $t('subscription.current.reactivate') }}</span>
				</button>

				<!-- Actions si abonnement actif -->
				<template v-if="!subscription.cancelledAt">
					<NuxtLink to="/dashboard"
						class="flex-1 min-w-[150px] px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-center transition-colors text-sm shadow-sm">
						{{ $t('subscription.current.back_to_home') }}
					</NuxtLink>
					<button v-if="subscription.billingPeriod !== 'lifetime'" @click="emit('changePlan')"
						class="flex-1 min-w-[150px] px-6 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold rounded-lg text-center transition-colors text-sm shadow-sm">
						{{ $t('subscription.current.change_plan') }}
					</button>
					<button v-if="subscription.billingPeriod !== 'lifetime'" @click="emit('cancel')"
						class="px-6 py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-lg text-center transition-colors text-sm shadow-sm">
						{{ $t('subscription.current.cancel') }}
					</button>
				</template>
			</div>
		</div>

		<!-- Features Card -->
		<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-8">
			<h3 class="font-bold text-slate-900 dark:text-white text-lg mb-6">{{ $t('subscription.current.included_features') }}</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="flex items-start gap-3 text-sm">
					<div class="p-1 bg-brand-100 rounded-lg text-brand-600">
						<Icon name="ph:check-bold" size="16" />
					</div>
					<div>
						<p class="font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.active_games', { count: subscription.plan.features.max_games }) }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('subscription.current.active_games_description') }}</p>
					</div>
				</div>
				<div class="flex items-start gap-3 text-sm">
					<div class="p-1 bg-brand-100 rounded-lg text-brand-600">
						<Icon name="ph:check-bold" size="16" />
					</div>
					<div>
						<p class="font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.players', { count: subscription.plan.features.max_players }) }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('subscription.current.players_description') }}</p>
					</div>
				</div>
				<div class="flex items-start gap-3 text-sm">
					<div class="p-1 bg-brand-100 rounded-lg text-brand-600">
						<Icon name="ph:check-bold" size="16" />
					</div>
					<div>
						<p class="font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.emails_per_month', { count: subscription.plan.features.email_credits_per_month }) }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('subscription.current.emails_per_month_description') }}</p>
					</div>
				</div>
				<div v-if="subscription.plan.features.google_reviews" class="flex items-start gap-3 text-sm">
					<div class="p-1 bg-brand-100 rounded-lg text-brand-600">
						<Icon name="ph:check-bold" size="16" />
					</div>
					<div>
						<p class="font-semibold text-slate-900 dark:text-white">{{ $t('subscription.current.google_reviews_booster') }}</p>
						<p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('subscription.current.google_reviews_booster_description') }}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
