<script setup lang="ts">
const { subscription, isAdmin } = useSubscription()

const hasAccess = computed(() => {
	if (isAdmin.value) return true
	if (!subscription.value) return false
	return ['active', 'trialing'].includes(subscription.value.status)
})
</script>

<template>
	<div class="relative">
		<!-- Content (always rendered but blurred when no access) -->
		<div :class="{ 'pointer-events-none select-none': !hasAccess }">
			<slot />
		</div>

		<!-- Overlay when no subscription -->
		<Transition name="fade">
			<div v-if="!hasAccess"
				class="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm bg-slate-900/60">
				<div class="text-center px-6 py-8 max-w-sm">
					<div class="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
						<Icon name="ph:lock-bold" size="28" class="text-brand-400" />
					</div>
					<h3 class="text-lg font-bold text-white mb-2">{{ $t('subscription.gate.title') }}</h3>
					<p class="text-sm text-slate-400 mb-6">{{ $t('subscription.gate.description') }}</p>
					<NuxtLink to="/dashboard/subscription"
						class="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">
						<Icon name="ph:crown-bold" size="18" />
						{{ $t('subscription.gate.cta') }}
					</NuxtLink>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
