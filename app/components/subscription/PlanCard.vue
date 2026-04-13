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
		'relative flex flex-col bg-white dark:bg-slate-800 rounded-xl p-8 transition-all',
		highlighted
			? 'border-2 border-brand-500 shadow-[0_4px_20px_-4px_rgba(6,81,237,0.15)] transform md:-translate-y-4'
			: 'border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg'
	]">
		<!-- Badge for highlighted plan -->
		<div v-if="highlighted"
			class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
			{{ $t('subscription.plan_card.most_popular') }}
		</div>

		<!-- Trial Badge -->
		<div v-if="trialDays && trialDays > 0 && period !== 'lifetime' && !isCurrentPlan"
			class="mb-4 flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2"
			:class="[highlighted && 'mt-2']">
			<Icon name="ph:clock-countdown-bold" class="text-purple-600 dark:text-purple-400 shrink-0" size="16" />
			<span class="text-xs font-bold text-purple-700 dark:text-purple-300">{{ $t('subscription.plan_card.trial_days', { days: trialDays }) }}</span>
		</div>

		<!-- Header -->
		<div :class="['mb-6', highlighted && !trialDays && 'mt-2']">
			<h3 class="font-bold text-slate-900 dark:text-white text-lg mb-4">{{ periodConfig.title }}</h3>
			<div class="flex items-baseline gap-1">
				<span class="text-4xl font-display font-bold text-slate-900 dark:text-white">{{ periodConfig.price
				}}</span>
				<span class="font-bold text-slate-400 text-sm">{{ periodConfig.unit }}</span>
			</div>
			<p :class="[
				'text-xs mt-2',
				period === 'annual' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'
			]">
				{{ periodConfig.description }}
			</p>
		</div>

		<!-- Features -->
		<div class="space-y-4 mb-8 flex-1">
			<template v-if="period === 'annual'">
				<div class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
					<div class="p-0.5 bg-brand-100 rounded-full text-brand-600">
						<Icon name="ph:check-bold" size="12" />
					</div>
					<span>{{ $t('subscription.plan_card.all_monthly_features') }}</span>
				</div>
			</template>

			<template v-else-if="period === 'lifetime'">
				<div class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-brand-500 shrink-0 mt-0.5" />
					<span>{{ $t('subscription.plan_card.one_time_payment_feature') }}</span>
				</div>
				<div class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-brand-500 shrink-0 mt-0.5" />
					<span>{{ $t('subscription.plan_card.lifetime_updates') }}</span>
				</div>
				<div class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-brand-500 shrink-0 mt-0.5" />
					<span>{{ $t('subscription.plan_card.vip_support') }}</span>
				</div>
			</template>

			<template v-else>
				<div class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-brand-500 shrink-0 mt-0.5" />
					<span>{{ $t('subscription.plan_card.active_games', { count: plan.features.max_games }) }}</span>
				</div>
				<div class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-brand-500 shrink-0 mt-0.5" />
					<span>{{ $t('subscription.plan_card.max_players', { count: plan.features.max_players }) }}</span>
				</div>
				<div class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
					<Icon name="ph:check-bold" class="text-brand-500 shrink-0 mt-0.5" />
					<span><strong>{{ plan.features.email_credits_per_month }}</strong> {{ $t('subscription.plan_card.emails_per_month') }}</span>
				</div>
			</template>
		</div>

		<!-- CTA Button -->
		<button @click="emit('subscribe', period)" :disabled="isDisabled" :class="[
			'w-full py-3 font-bold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed',
			isCurrentPlan
				? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500'
				: highlighted
					? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-500/20'
					: period === 'lifetime'
						? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
						: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
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
