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

	<div v-else
		class="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl min-h-[320px] flex items-center">
		<!-- Decorative blobs -->
		<div class="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />
		<div class="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full blur-2xl -ml-28 -mb-28 pointer-events-none" />

		<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 w-full">
			<!-- Left: text -->
			<div class="flex-1">
				<div class="flex items-center gap-2 mb-3">
					<Icon name="ph:crown-simple-fill" size="22" class="text-yellow-300" />
					<span class="text-xs font-bold uppercase tracking-wider text-white/80">{{ $t('subscription.gate.label') }}</span>
				</div>
				<h2 class="text-2xl md:text-3xl font-display font-bold mb-3">
					{{ $t('subscription.gate.title') }}
				</h2>
				<p class="text-white/80 text-sm md:text-base max-w-md">
					{{ $t('subscription.gate.description') }}
				</p>

				<!-- Feature pills -->
				<div class="flex flex-wrap gap-2 mt-5">
					<span v-for="feat in ['feature_games', 'feature_players', 'feature_marketing']" :key="feat"
						class="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-xs font-semibold text-white border border-white/20">
						<Icon :name="feat === 'feature_games' ? 'ph:game-controller-bold' : feat === 'feature_players' ? 'ph:users-three-bold' : 'ph:envelope-bold'" size="13" />
						{{ $t(`subscription.gate.${feat}`) }}
					</span>
				</div>
			</div>

			<!-- Right: CTA -->
			<div class="flex flex-col items-start md:items-center gap-3 shrink-0">
				<NuxtLink to="/dashboard/subscription"
					class="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-600 font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-lg shadow-black/15 text-sm">
					<Icon name="ph:rocket-launch-bold" size="18" />
					{{ $t('subscription.gate.cta') }}
				</NuxtLink>
				<p class="text-xs text-white/60">{{ $t('subscription.gate.hint') }}</p>
			</div>
		</div>
	</div>
</template>
