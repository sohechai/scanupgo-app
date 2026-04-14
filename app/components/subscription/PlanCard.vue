<script setup lang="ts">
interface Props {
	plan: any
	period: 'monthly' | 'annual' | 'lifetime'
	highlighted?: boolean
	loading?: boolean
	isCurrentPlan?: boolean
	disabled?: boolean
	trialDays?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
	subscribe: [period: 'monthly' | 'annual' | 'lifetime']
}>()

const { t } = useI18n()
const isDisabled = computed(() => props.loading || props.isCurrentPlan || props.disabled)

const periodConfig = computed(() => {
	switch (props.period) {
		case 'monthly':
			return {
				title: t('subscription.period.monthly'),
				price: props.plan.priceMonthly,
				unit: t('subscription.plan_card.monthly_unit'),
				description: t('subscription.plan_card.monthly_desc'),
			}
		case 'annual':
			return {
				title: t('subscription.period.annual'),
				price: props.plan.priceAnnual,
				unit: t('subscription.plan_card.annual_unit'),
				description: t('subscription.plan_card.annual_save', { percent: Math.round((1 - (Number(props.plan.priceAnnual) / (Number(props.plan.priceMonthly) * 12))) * 100) }),
			}
		case 'lifetime':
			return {
				title: t('subscription.period.lifetime'),
				price: props.plan.priceLifetime,
				unit: t('subscription.plan_card.lifetime_unit'),
				description: t('subscription.plan_card.lifetime_desc'),
			}
	}
})
</script>

<template>
	<div :class="[
		'relative flex flex-col rounded-2xl p-6 transition-all',
		highlighted
			? 'bg-white dark:bg-[#1C1C1E] border-2 border-[#007AFF] shadow-xl shadow-[#007AFF]/10 md:-translate-y-3'
			: 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
	]">
		<!-- Most popular badge -->
		<div v-if="highlighted"
			class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#007AFF] text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
			{{ $t('subscription.plan_card.most_popular') }}
		</div>

		<!-- Trial badge -->
		<div v-if="trialDays && trialDays > 0 && period !== 'lifetime' && !isCurrentPlan"
			class="mb-4 flex items-center gap-2 bg-[#007AFF]/10 rounded-xl px-3 py-2"
			:class="[highlighted && 'mt-2']">
			<Icon name="ph:clock-countdown-bold" class="text-[#007AFF] shrink-0" size="14" />
			<span class="text-xs font-semibold text-[#007AFF]">{{ $t('subscription.plan_card.trial_days', { days: trialDays }) }}</span>
		</div>

		<!-- Period label + price -->
		<div :class="['mb-5', highlighted && !trialDays && 'mt-2']">
			<p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">{{ periodConfig.title }}</p>
			<div class="flex items-baseline gap-1">
				<span class="text-4xl font-bold text-slate-900 dark:text-white">{{ periodConfig.price }}</span>
				<span class="font-semibold text-slate-400 text-sm">{{ periodConfig.unit }}</span>
			</div>
			<p :class="['text-xs mt-2', period === 'annual' ? 'text-[#34C759] font-semibold' : 'text-slate-400']">
				{{ periodConfig.description }}
			</p>
		</div>

		<!-- Features list -->
		<div class="space-y-3 mb-6 flex-1">
			<template v-if="period === 'annual'">
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span>{{ $t('subscription.plan_card.active_games', { count: plan.features.max_games }) }}</span>
				</div>
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span>{{ $t('subscription.plan_card.max_players', { count: plan.features.max_players }) }}</span>
				</div>
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span><strong>{{ plan.features.email_credits_per_month }}</strong> {{ $t('subscription.plan_card.emails_per_month') }}</span>
				</div>
				<div class="flex items-start gap-2.5 text-sm text-[#34C759]">
					<Icon name="ph:seal-percent-bold" class="shrink-0 mt-0.5" size="15" />
					<span class="font-semibold">{{ $t('subscription.plan_card.annual_save', { percent: Math.round((1 - (Number(plan.priceAnnual) / (Number(plan.priceMonthly) * 12))) * 100) }) }}</span>
				</div>
			</template>

			<template v-else-if="period === 'lifetime'">
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span>{{ $t('subscription.plan_card.one_time_payment_feature') }}</span>
				</div>
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span>{{ $t('subscription.plan_card.lifetime_updates') }}</span>
				</div>
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span>{{ $t('subscription.plan_card.vip_support') }}</span>
				</div>
			</template>

			<template v-else>
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span>{{ $t('subscription.plan_card.active_games', { count: plan.features.max_games }) }}</span>
				</div>
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span>{{ $t('subscription.plan_card.max_players', { count: plan.features.max_players }) }}</span>
				</div>
				<div class="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-[#007AFF] shrink-0 mt-0.5" size="15" />
					<span><strong>{{ plan.features.email_credits_per_month }}</strong> {{ $t('subscription.plan_card.emails_per_month') }}</span>
				</div>
			</template>
		</div>

		<!-- CTA button -->
		<button @click="emit('subscribe', period)" :disabled="isDisabled" :class="[
			'w-full py-3 font-semibold rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed',
			isCurrentPlan
				? 'bg-[#34C759]/10 text-[#34C759] border-2 border-[#34C759] cursor-default'
				: highlighted
					? 'bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white shadow-lg shadow-[#007AFF]/25'
					: period === 'lifetime'
						? 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
						: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] text-slate-700 dark:text-slate-200 border border-[#E5E5EA] dark:border-slate-700/40'
		]">
			<template v-if="isCurrentPlan">
				<Icon name="ph:check-circle-fill" class="inline mr-1.5" size="16" />
				{{ $t('subscription.plan_card.current_plan_badge') }}
			</template>
			<template v-else-if="trialDays && trialDays > 0 && period !== 'lifetime'">
				{{ loading ? '...' : $t('subscription.plan_card.try_free', { days: trialDays }) }}
			</template>
			<template v-else>
				{{ loading ? '...' : $t('subscription.plan_card.choose', { period: periodConfig?.title }) }}
			</template>
		</button>
	</div>
</template>
