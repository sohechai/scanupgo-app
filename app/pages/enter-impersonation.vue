<script setup lang="ts">
// Transition page opened in a NEW tab by the admin's "Infiltrer" button.
// It marks this tab as an impersonation tab, redeems the hand-off token into an
// isolated merchant session, then enters the dashboard. The admin tab that
// opened it is never touched.
definePageMeta({
	layout: false,
	middleware: [],
})

useHead({ title: 'Infiltration…' })

const { $api } = useNuxtApp()
const route = useRoute()

const error = ref('')

onMounted(async () => {
	// Mark this tab BEFORE any API call, so $api sends X-Impersonation on redeem.
	sessionStorage.setItem('impersonation_tab', '1')

	const token = route.query.token as string
	if (!token) {
		error.value = "Jeton d'infiltration manquant."
		return
	}

	try {
		await $api('/admin/impersonation/redeem', {
			method: 'POST',
			body: { token },
		})
		// Enter the merchant dashboard within this isolated session.
		window.location.href = '/dashboard'
	} catch (e: any) {
		sessionStorage.removeItem('impersonation_tab')
		error.value = e?.data?.message || "Impossible de démarrer l'infiltration."
	}
})
</script>

<template>
	<div class="min-h-screen bg-[#0d0e12] flex items-center justify-center text-slate-200">
		<div v-if="!error" class="flex flex-col items-center gap-3">
			<Icon name="ph:spinner-gap-bold" size="28" class="text-red-500 animate-spin" />
			<p class="text-sm text-slate-400">Démarrage de l'infiltration…</p>
		</div>
		<div v-else class="max-w-sm text-center px-6">
			<Icon name="ph:warning-circle-duotone" size="32" class="text-red-400 mb-3" />
			<p class="text-sm text-red-300">{{ error }}</p>
			<button onclick="window.close()" class="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm">Fermer</button>
		</div>
	</div>
</template>
