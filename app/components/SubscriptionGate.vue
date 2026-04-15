<script setup lang="ts">
const { subscription, loading, isAdmin } = useSubscription()

const hasAccess = computed(() => {
	if (isAdmin.value) return true
	// Optimistic: show content while loading to avoid blocking render
	if (loading.value) return true
	if (!subscription.value) return false
	return ['active', 'trialing'].includes(subscription.value.status)
})

const features = [
	{ icon: 'ph:game-controller-fill', color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-500/10', label: 'subscription.gate.feature_games' },
	{ icon: 'ph:users-three-fill', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', label: 'subscription.gate.feature_players' },
	{ icon: 'ph:envelope-fill', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'subscription.gate.feature_marketing' },
]
</script>

<template>
	<div v-if="hasAccess">
		<slot />
	</div>

	<div v-else class="flex flex-col items-center justify-center py-16 px-4">
		<div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_24px_-4px_rgba(6,81,237,0.1)] overflow-hidden">

			<!-- Top accent line -->
			<div class="h-0.5 w-full bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-400" />

			<div class="p-8">
				<!-- Icon -->
				<div class="flex justify-center mb-6">
					<div class="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
						<Icon name="ph:crown-simple-fill" size="28" class="text-brand-600 dark:text-brand-400" />
					</div>
				</div>

				<!-- Text -->
				<div class="text-center mb-7">
					<p class="text-xs font-bold text-brand-500 uppercase tracking-widest mb-2">{{ $t('subscription.gate.label') }}</p>
					<h2 class="text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight mb-2">
						{{ $t('subscription.gate.title') }}
					</h2>
					<p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
						{{ $t('subscription.gate.description') }}
					</p>
				</div>

				<!-- Feature cards (same style as dashboard stat cards) -->
				<div class="grid grid-cols-3 gap-3 mb-7">
					<div v-for="feat in features" :key="feat.label"
						class="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700">
						<div :class="['w-8 h-8 rounded-lg flex items-center justify-center', feat.bg]">
							<Icon :name="feat.icon" size="16" :class="feat.color" />
						</div>
						<span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">{{ $t(feat.label) }}</span>
					</div>
				</div>

				<!-- CTA -->
				<NuxtLink to="/dashboard/subscription"
					class="flex items-center justify-center gap-2 w-full py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-md shadow-brand-500/20 text-sm">
					<Icon name="ph:rocket-launch-bold" size="17" />
					{{ $t('subscription.gate.cta') }}
				</NuxtLink>

				<p class="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
					{{ $t('subscription.gate.hint') }}
				</p>
			</div>
		</div>
	</div>
</template>
