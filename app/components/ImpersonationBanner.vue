<script setup lang="ts">
// Persistent red banner shown across the whole dashboard while an admin is
// impersonating a merchant. Fetches its own state so it works on any page.
const { info, refresh, stop } = useImpersonation()
const { t } = useI18n()

const stopping = ref(false)

onMounted(refresh)

const onStop = async () => {
	stopping.value = true
	await stop()
}
</script>

<template>
	<div
		v-if="info?.active"
		class="sticky top-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 bg-red-600 text-white text-sm font-medium shadow-lg">
		<Icon name="ph:eye-duotone" size="18" class="shrink-0" />
		<span class="text-center">
			{{ t('impersonation.banner_prefix') }}
			<strong class="font-bold">{{ info.targetEmail }}</strong>
		</span>
		<button
			:disabled="stopping"
			@click="onStop"
			class="ml-2 rtl:ml-0 rtl:mr-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors font-semibold disabled:opacity-60">
			<Icon :name="stopping ? 'ph:spinner-gap-bold' : 'ph:sign-out-bold'" size="14" :class="stopping ? 'animate-spin' : ''" />
			{{ t('impersonation.banner_exit') }}
		</button>
	</div>
</template>
