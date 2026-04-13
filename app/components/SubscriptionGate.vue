<script setup lang="ts">
const { subscription, isAdmin } = useSubscription()

const hasAccess = computed(() => {
	if (isAdmin.value) return true
	if (!subscription.value) return false
	return ['active', 'trialing'].includes(subscription.value.status)
})
</script>

<template>
	<div v-if="hasAccess">
		<slot />
	</div>

	<div v-else class="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
		<!-- Background decorations -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
			<div class="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
			<div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
		</div>

		<div class="relative text-center max-w-md w-full">
			<!-- Icon -->
			<div class="relative inline-flex mb-8">
				<div class="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center shadow-xl shadow-brand-500/10">
					<Icon name="ph:crown-duotone" size="44" class="text-brand-500" />
				</div>
				<div class="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg">
					<Icon name="ph:lock-simple-fill" size="16" class="text-amber-900" />
				</div>
			</div>

			<!-- Text -->
			<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">
				{{ $t('subscription.gate.title') }}
			</h2>
			<p class="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
				{{ $t('subscription.gate.description') }}
			</p>

			<!-- Features teaser -->
			<div class="grid grid-cols-3 gap-3 mb-8">
				<div class="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-3 text-center">
					<Icon name="ph:game-controller-duotone" size="22" class="text-brand-500 mx-auto mb-1.5" />
					<p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ $t('subscription.gate.feature_games') }}</p>
				</div>
				<div class="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-3 text-center">
					<Icon name="ph:users-three-duotone" size="22" class="text-purple-500 mx-auto mb-1.5" />
					<p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ $t('subscription.gate.feature_players') }}</p>
				</div>
				<div class="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-3 text-center">
					<Icon name="ph:envelope-duotone" size="22" class="text-emerald-500 mx-auto mb-1.5" />
					<p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ $t('subscription.gate.feature_marketing') }}</p>
				</div>
			</div>

			<!-- CTA -->
			<NuxtLink to="/dashboard/subscription"
				class="inline-flex items-center gap-2.5 px-8 py-3.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 active:scale-95 transition-all shadow-lg shadow-brand-500/25 text-sm">
				<Icon name="ph:crown-bold" size="18" />
				{{ $t('subscription.gate.cta') }}
			</NuxtLink>

			<p class="mt-4 text-xs text-slate-400 dark:text-slate-500">
				{{ $t('subscription.gate.hint') }}
			</p>
		</div>
	</div>
</template>
