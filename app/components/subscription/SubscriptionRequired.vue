<script setup lang="ts">
interface Props {
	title?: string
	description?: string
	icon?: string
}

const props = defineProps<Props>()
const { t } = useI18n()

const displayTitle = computed(() => props.title || t('components.subscription_required.default_title'))
const displayDescription = computed(() => props.description || t('components.subscription_required.default_description'))
const displayIcon = computed(() => props.icon || 'ph:lock-simple-fill')
</script>

<template>
	<div class="min-h-[60vh] flex items-center justify-center p-6">
		<div class="max-w-lg w-full text-center">
			<!-- Icon -->
			<div class="w-20 h-20 bg-gradient-to-br from-brand-100 to-indigo-100 dark:from-brand-500/20 dark:to-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/10">
				<Icon :name="displayIcon" size="40" class="text-brand-600 dark:text-brand-400" />
			</div>

			<!-- Title -->
			<h2 class="text-2xl font-display font-bold text-slate-900 dark:text-white mb-3">
				{{ displayTitle }}
			</h2>

			<!-- Description -->
			<p class="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
				{{ displayDescription }}
			</p>

			<!-- Features teaser -->
			<div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 mb-8 text-left rtl:text-right">
				<h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
					<Icon name="ph:sparkle-fill" size="16" class="text-brand-500" />
					{{ $t('components.subscription_required.with_subscription') }}
				</h3>
				<ul class="space-y-3">
					<li class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
						<Icon name="ph:check-circle-fill" size="18" class="text-emerald-500 shrink-0 mt-0.5" />
						<span>{{ $t('components.subscription_required.feature_games') }}</span>
					</li>
					<li class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
						<Icon name="ph:check-circle-fill" size="18" class="text-emerald-500 shrink-0 mt-0.5" />
						<span>{{ $t('components.subscription_required.feature_players') }}</span>
					</li>
					<li class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
						<Icon name="ph:check-circle-fill" size="18" class="text-emerald-500 shrink-0 mt-0.5" />
						<span>{{ $t('components.subscription_required.feature_prizes') }}</span>
					</li>
					<li class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
						<Icon name="ph:check-circle-fill" size="18" class="text-emerald-500 shrink-0 mt-0.5" />
						<span>{{ $t('components.subscription_required.feature_flyers') }}</span>
					</li>
				</ul>
			</div>

			<!-- CTA Buttons -->
			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				<NuxtLink to="/dashboard/subscription"
					class="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2">
					<Icon name="ph:crown-simple-fill" size="18" />
					{{ $t('components.subscription_required.see_plans') }}
				</NuxtLink>
				<NuxtLink to="/dashboard"
					class="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
					<Icon name="ph:arrow-left-bold" size="18" class="rtl:rotate-180" />
					{{ $t('components.subscription_required.back_to_dashboard') }}
				</NuxtLink>
			</div>
		</div>
	</div>
</template>
