<script setup lang="ts">
definePageMeta({ layout: false, middleware: [] })

const route = useRoute()
const { $api } = useNuxtApp()
const code = route.params.code as string

const info = ref<any>(null)
const loading = ref(true)
const error = ref('')
const validating = ref(false)
const validated = ref(false)

onMounted(async () => {
	try {
		info.value = await $api(`/gameplay/redeem/public/${code}`)
	} catch (e: any) {
		error.value = e?.data?.message || 'Code invalide ou expiré'
	} finally {
		loading.value = false
	}
})

const validate = async () => {
	validating.value = true
	error.value = ''
	try {
		await $api('/gameplay/redeem/public', { method: 'POST', body: { redemptionCode: code } })
		validated.value = true
	} catch (e: any) {
		error.value = e?.data?.message || 'Erreur lors de la validation'
	} finally {
		validating.value = false
	}
}
</script>

<template>
	<div class="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
		<div class="w-full max-w-sm">

			<div class="text-center mb-6">
				<AppLogo variant="light" :size="32" />
			</div>

			<!-- Loading -->
			<div v-if="loading" class="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/70 text-center">
				<Icon name="ph:spinner-gap-bold" size="32" class="animate-spin text-slate-300 mx-auto" />
			</div>

			<!-- Déjà validé -->
			<div v-else-if="!error && info?.redeemed && !validated"
				class="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/70 text-center space-y-3">
				<div class="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
					<Icon name="ph:check-circle-duotone" size="32" class="text-slate-400" />
				</div>
				<p class="font-semibold text-slate-800">Lot déjà récupéré</p>
				<p class="text-sm text-slate-400">Ce lot a déjà été validé.</p>
			</div>

			<!-- Erreur -->
			<div v-else-if="error && !validated"
				class="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/70 text-center space-y-3">
				<div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
					<Icon name="ph:warning-circle-duotone" size="32" class="text-red-400" />
				</div>
				<p class="font-semibold text-slate-800">Code invalide</p>
				<p class="text-sm text-slate-400">{{ error }}</p>
			</div>

			<!-- Succès validation -->
			<div v-else-if="validated"
				class="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/70 text-center space-y-4">
				<div class="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
					<Icon name="ph:check-circle-fill" size="36" class="text-green-500" />
				</div>
				<div>
					<p class="text-lg font-bold text-slate-900">Lot validé !</p>
					<p class="text-sm text-slate-500 mt-1">
						<span class="font-medium text-slate-700">{{ info?.prize?.name }}</span>
						remis à
						<span class="font-medium text-slate-700">{{ info?.player?.firstName }} {{ info?.player?.lastName }}</span>
					</p>
				</div>
			</div>

			<!-- Info lot + bouton valider -->
			<div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
				<!-- Header business -->
				<div class="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
					<img v-if="info?.business?.logo" :src="info.business.logo" class="w-9 h-9 rounded-lg object-cover" />
					<div v-else class="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
						{{ info?.business?.name?.charAt(0) || '?' }}
					</div>
					<p class="font-semibold text-slate-800 text-sm">{{ info?.business?.name }}</p>
				</div>

				<div class="p-6 space-y-5">
					<!-- Prize info -->
					<div class="text-center space-y-1">
						<p class="text-xs font-medium text-slate-400 uppercase tracking-wide">Lot à remettre</p>
						<p class="text-2xl font-bold text-slate-900">{{ info?.prize?.name }}</p>
						<p class="text-sm text-slate-500">
							pour <span class="font-medium text-slate-700">{{ info?.player?.firstName }} {{ info?.player?.lastName }}</span>
						</p>
					</div>

					<!-- Code -->
					<div class="bg-slate-50 rounded-xl px-4 py-3 text-center">
						<p class="text-xs text-slate-400 mb-1">Code</p>
						<p class="font-mono font-bold text-slate-700 tracking-widest">{{ code }}</p>
					</div>

					<!-- Erreur validation -->
					<p v-if="error" class="text-sm text-red-500 text-center font-medium">{{ error }}</p>

					<!-- Bouton -->
					<button @click="validate" :disabled="validating"
						class="w-full py-3.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
						<Icon v-if="validating" name="ph:spinner-gap-bold" class="animate-spin" size="18" />
						<Icon v-else name="ph:check-bold" size="18" />
						{{ validating ? 'Validation...' : 'Valider le lot' }}
					</button>

					<p class="text-xs text-slate-400 text-center">Cette action est irréversible</p>
				</div>
			</div>

		</div>
	</div>
</template>
