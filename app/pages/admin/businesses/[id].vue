<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

useHead({ title: 'Commerce' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()

const businessId = route.params.id as string
const business = ref<any>(null)
const loading = ref(true)
const actionLoading = ref(false)
const showSuspendModal = ref(false)
const showReactivateModal = ref(false)

// Credits management
const creditsToSet = ref<number | ''>('')
const creditsToAdd = ref<number | ''>('')
const creditsLoading = ref(false)
const { show: showToast } = useToast()

const setCredits = async () => {
	if (creditsToSet.value === '' || Number(creditsToSet.value) < 0) return
	creditsLoading.value = true
	try {
		const res = await $api(`/admin/businesses/${businessId}/email-credits`, {
			method: 'PATCH',
			body: { credits: Number(creditsToSet.value) },
		})
		business.value.emailCredits = res.emailCredits
		creditsToSet.value = ''
		showToast('Crédits mis à jour', 'success')
	} catch (e: any) {
		showToast(e?.data?.message || 'Erreur', 'error')
	} finally {
		creditsLoading.value = false
	}
}

const addCredits = async () => {
	if (creditsToAdd.value === '' || Number(creditsToAdd.value) <= 0) return
	creditsLoading.value = true
	try {
		const res = await $api(`/admin/businesses/${businessId}/email-credits/add`, {
			method: 'POST',
			body: { credits: Number(creditsToAdd.value) },
		})
		business.value.emailCredits = res.emailCredits
		creditsToAdd.value = ''
		showToast(`+${creditsToAdd.value} crédits ajoutés`, 'success')
	} catch (e: any) {
		showToast(e?.data?.message || 'Erreur', 'error')
	} finally {
		creditsLoading.value = false
	}
}

const fetchBusiness = async () => {
	try {
		business.value = await $api(`/admin/businesses/${businessId}`)
	} catch (error) {
		console.error('Failed to fetch business:', error)
	} finally {
		loading.value = false
	}
}

const suspendBusiness = async () => {
	actionLoading.value = true
	try {
		await $api(`/admin/businesses/${businessId}/suspend`, { method: 'PUT' })
		showSuspendModal.value = false
		await fetchBusiness()
	} catch (error: any) {
		console.error('Failed to suspend:', error)
	} finally {
		actionLoading.value = false
	}
}

const reactivateBusiness = async () => {
	actionLoading.value = true
	try {
		await $api(`/admin/businesses/${businessId}/reactivate`, { method: 'PUT' })
		showReactivateModal.value = false
		await fetchBusiness()
	} catch (error: any) {
		console.error('Failed to reactivate:', error)
	} finally {
		actionLoading.value = false
	}
}

const getBillingLabel = (period: string) => {
	switch (period) {
		case 'monthly': return t('admin.subscriptions.period_monthly')
		case 'annual': return t('admin.subscriptions.period_annual')
		case 'lifetime': return t('admin.subscriptions.period_lifetime')
		default: return period
	}
}

onMounted(fetchBusiness)
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen"></div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen" style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Loading -->
			<div v-if="loading" class="flex items-center justify-center py-32">
				<Icon name="ph:spinner-gap-bold" size="40" class="animate-spin text-slate-400" />
			</div>

			<!-- Not found -->
			<div v-else-if="!business" class="text-center py-32">
				<Icon name="ph:storefront-duotone" size="64" class="mx-auto mb-4 text-slate-500 opacity-50" />
				<p class="text-slate-400 text-lg mb-4">{{ $t('admin.businesses.detail.not_found') }}</p>
				<button @click="router.push('/admin/businesses')" class="px-4 py-2 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all">
					{{ $t('admin.businesses.detail.back') }}
				</button>
			</div>

			<!-- Content -->
			<template v-else>
				<!-- Header -->
				<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<button @click="router.push('/admin/businesses')" class="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
							<Icon name="ph:arrow-left-bold" size="20" class="rtl:rotate-180" />
						</button>
						<div class="flex items-center gap-4">
							<img v-if="business.logo" :src="business.logo" :alt="business.name"
								class="w-14 h-14 rounded-xl object-cover border border-white/10" />
							<div v-else class="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xl text-slate-300">
								{{ business.name.charAt(0).toUpperCase() }}
							</div>
							<div>
								<div class="flex items-center gap-3">
									<h1 class="text-3xl font-bold text-white">{{ business.name }}</h1>
									<span v-if="business.owner.status === 'suspended'" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
										{{ $t('admin.businesses.detail.suspended') }}
									</span>
									<span v-else class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
										{{ $t('admin.businesses.detail.active') }}
									</span>
								</div>
								<p class="text-slate-400 text-sm mt-0.5">{{ $t('admin.businesses.registered_on') }} {{ formatDate(business.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
							</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<button v-if="business.owner.status !== 'suspended'" @click="showSuspendModal = true"
							class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
							<Icon name="ph:prohibit-bold" size="16" />
							{{ $t('admin.businesses.detail.suspend') }}
						</button>
						<button v-else @click="showReactivateModal = true"
							class="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
							<Icon name="ph:check-circle-bold" size="16" />
							{{ $t('admin.businesses.detail.reactivate') }}
						</button>
					</div>
				</div>

				<!-- Info Cards Grid -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Informations generales -->
					<div class="bg-white/5 border border-white/10 rounded-2xl p-6">
						<h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
							<Icon name="ph:storefront-fill" size="20" class="text-brand-400" />
							{{ $t('admin.businesses.detail.info_title') }}
						</h2>
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.info_name') }}</span>
								<span class="text-sm font-bold text-white">{{ business.name }}</span>
							</div>
							<div class="border-t border-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.info_email') }}</span>
								<span class="text-sm font-bold text-white">{{ business.email || '-' }}</span>
							</div>
							<div class="border-t border-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.info_phone') }}</span>
								<span class="text-sm font-bold text-white">{{ business.phone || '-' }}</span>
							</div>
							<div class="border-t border-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.info_address') }}</span>
								<span class="text-sm font-bold text-white">{{ business.address || '-' }}{{ business.city ? `, ${business.city}` : '' }}</span>
							</div>
						</div>
					</div>

					<!-- Proprietaire -->
					<div class="bg-white/5 border border-white/10 rounded-2xl p-6">
						<h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
							<Icon name="ph:user-fill" size="20" class="text-purple-400" />
							{{ $t('admin.businesses.detail.owner_title') }}
						</h2>
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.owner_name') }}</span>
								<span class="text-sm font-bold text-white">{{ business.owner.firstName }} {{ business.owner.lastName }}</span>
							</div>
							<div class="border-t border-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.owner_email') }}</span>
								<span class="text-sm font-bold text-white">{{ business.owner.email }}</span>
							</div>
							<div class="border-t border-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.owner_role') }}</span>
								<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{{ business.owner.role }}</span>
							</div>
							<div class="border-t border-white/5"></div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">{{ $t('admin.businesses.detail.owner_status') }}</span>
								<span v-if="business.owner.status === 'suspended'" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">{{ $t('admin.businesses.detail.suspended') }}</span>
								<span v-else class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{{ $t('admin.businesses.detail.active') }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Abonnement -->
				<div class="bg-white/5 border border-white/10 rounded-2xl p-6">
					<h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
						<Icon name="ph:credit-card-fill" size="20" class="text-emerald-400" />
						{{ $t('admin.businesses.detail.subscription_title') }}
					</h2>
					<div v-if="business.subscription" class="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div>
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_plan') }}</p>
							<p class="text-white font-bold">{{ business.subscription.planName }}</p>
						</div>
						<div>
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_period') }}</p>
							<p class="text-white font-bold">{{ getBillingLabel(business.subscription.billingPeriod) }}</p>
						</div>
						<div>
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_price') }}</p>
							<p class="text-white font-bold">{{ business.subscription.price }} Dhs</p>
						</div>
						<div>
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_status') }}</p>
							<span v-if="business.subscription.status === 'active'" class="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
								<div class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
								{{ $t('admin.businesses.detail.active') }}
							</span>
							<span v-else-if="business.subscription.status === 'canceled'" class="inline-flex items-center gap-1.5 text-red-400 text-xs font-bold">
								<div class="w-1.5 h-1.5 rounded-full bg-red-400"></div>
								{{ $t('admin.businesses.status_canceled') }}
							</span>
							<span v-else class="inline-flex items-center gap-1.5 text-slate-400 text-xs font-bold">
								<div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
								{{ business.subscription.status }}
							</span>
						</div>
						<div v-if="business.subscription.startedAt">
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_start') }}</p>
							<p class="text-slate-300 text-sm">{{ formatDate(business.subscription.startedAt, { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
						</div>
						<div v-if="business.subscription.currentPeriodEnd">
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_end') }}</p>
							<p class="text-slate-300 text-sm">{{ formatDate(business.subscription.currentPeriodEnd, { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
						</div>
						<div v-if="business.subscription.nextBillingDate">
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_next_billing') }}</p>
							<p class="text-slate-300 text-sm">{{ formatDate(business.subscription.nextBillingDate, { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
						</div>
						<div v-if="business.subscription.cancelledAt">
							<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.subscription_canceled_at') }}</p>
							<p class="text-red-400 text-sm font-bold">{{ formatDate(business.subscription.cancelledAt, { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
						</div>
					</div>
					<div v-else class="text-center py-6 text-slate-500">
						<Icon name="ph:credit-card-duotone" size="32" class="mx-auto mb-2 opacity-50" />
						<p class="text-sm">{{ $t('admin.businesses.detail.no_subscription') }}</p>
					</div>
				</div>

				<!-- Crédits email -->
				<div class="bg-white/5 border border-white/10 rounded-2xl p-6">
					<h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
						<Icon name="ph:envelope-simple-fill" size="20" class="text-blue-400" />
						Crédits email marketing
						<span class="ml-auto px-3 py-1 rounded-full text-sm font-bold"
							:class="business.emailCredits > 0 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'">
							{{ business.emailCredits }} crédit{{ business.emailCredits !== 1 ? 's' : '' }}
						</span>
					</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Définir absolument -->
						<div class="bg-white/5 rounded-xl p-4 border border-white/5">
							<p class="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3">Définir le solde</p>
							<div class="flex gap-2">
								<input v-model.number="creditsToSet" type="number" min="0" placeholder="ex. 500"
									class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
								<button @click="setCredits" :disabled="creditsLoading || creditsToSet === ''"
									class="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-sm font-bold transition-all disabled:opacity-40 flex items-center gap-1.5">
									<Icon v-if="creditsLoading" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
									Définir
								</button>
							</div>
							<p class="text-[11px] text-slate-500 mt-2">Remplace le solde actuel</p>
						</div>
						<!-- Ajouter -->
						<div class="bg-white/5 rounded-xl p-4 border border-white/5">
							<p class="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3">Ajouter des crédits</p>
							<div class="flex gap-2">
								<input v-model.number="creditsToAdd" type="number" min="1" placeholder="ex. 100"
									class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
								<button @click="addCredits" :disabled="creditsLoading || !creditsToAdd || Number(creditsToAdd) <= 0"
									class="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm font-bold transition-all disabled:opacity-40 flex items-center gap-1.5">
									<Icon v-if="creditsLoading" name="ph:spinner-gap-bold" size="14" class="animate-spin" />
									<Icon v-else name="ph:plus-bold" size="14" />
									Ajouter
								</button>
							</div>
							<p class="text-[11px] text-slate-500 mt-2">S'additionne au solde existant</p>
						</div>
					</div>
					<p class="text-[11px] text-slate-500 mt-4 flex items-center gap-1.5">
						<Icon name="ph:info-bold" size="12" />
						1 crédit = 1 email envoyé. Les crédits sont décomptés à l'envoi effectif de chaque email.
					</p>
				</div>

				<!-- Stats -->
				<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
					<div class="bg-white/5 border border-white/10 rounded-2xl p-5">
						<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.players_label') }}</p>
						<p class="text-2xl font-bold text-white">{{ business.stats.totalPlayers }}</p>
					</div>
					<div class="bg-white/5 border border-white/10 rounded-2xl p-5">
						<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.games_label') }}</p>
						<p class="text-2xl font-bold text-white">{{ business.stats.totalGames }}</p>
					</div>
					<div class="bg-white/5 border border-white/10 rounded-2xl p-5">
						<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.sessions_label') }}</p>
						<p class="text-2xl font-bold text-white">{{ business.stats.totalSessions }}</p>
					</div>
					<div class="bg-white/5 border border-white/10 rounded-2xl p-5">
						<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.wins_label') }}</p>
						<p class="text-2xl font-bold text-emerald-400">{{ business.stats.totalWins }}</p>
					</div>
					<div class="bg-white/5 border border-white/10 rounded-2xl p-5">
						<p class="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{{ $t('admin.businesses.detail.win_rate_label') }}</p>
						<p class="text-2xl font-bold text-white">{{ business.stats.winRate }}%</p>
					</div>
				</div>

				<!-- Jeux -->
				<div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
					<div class="px-6 py-4 border-b border-white/10 flex items-center gap-2">
						<Icon name="ph:game-controller-fill" size="20" class="text-orange-400" />
						<h2 class="text-lg font-bold text-white">{{ $t('admin.businesses.detail.games_title') }} ({{ business.games.length }})</h2>
					</div>
					<div v-if="business.games.length > 0" class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-white/5 border-b border-white/10">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{{ $t('admin.businesses.detail.games_table_name') }}</th>
									<th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{{ $t('admin.businesses.detail.games_table_status') }}</th>
									<th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{{ $t('admin.businesses.detail.games_table_sessions') }}</th>
									<th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{{ $t('admin.businesses.detail.games_table_created') }}</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								<tr v-for="game in business.games" :key="game.id" class="hover:bg-white/5 transition-colors">
									<td class="px-6 py-3">
										<span class="font-bold text-white text-sm">{{ game.name }}</span>
									</td>
									<td class="px-6 py-3">
										<span v-if="game.active" class="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
											<div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
											{{ $t('admin.businesses.detail.games_active') }}
										</span>
										<span v-else class="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
											<div class="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
											{{ $t('admin.businesses.detail.games_inactive') }}
										</span>
									</td>
									<td class="px-6 py-3">
										<span class="text-sm font-bold text-white">{{ game.sessionsCount }}</span>
									</td>
									<td class="px-6 py-3">
										<span class="text-sm text-slate-400">{{ formatDate(game.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }) }}</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div v-else class="p-8 text-center text-slate-500">
						<Icon name="ph:game-controller-duotone" size="32" class="mx-auto mb-2 opacity-50" />
						<p class="text-sm">{{ $t('admin.businesses.detail.games_none') }}</p>
					</div>
				</div>
			</template>
		</div>

		<!-- Suspend Modal -->
		<Teleport to="body">
			<div v-if="showSuspendModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div class="absolute inset-0 bg-black/60" @click="showSuspendModal = false"></div>
				<div class="relative bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
					<div class="text-center">
						<div class="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
							<Icon name="ph:prohibit-bold" size="28" class="text-red-400" />
						</div>
						<h3 class="text-xl font-bold text-white mb-2">{{ $t('admin.businesses.suspend_modal.title') }}</h3>
						<p class="text-slate-400 text-sm mb-6">
							{{ $t('admin.businesses.suspend_modal.description', { email: business?.owner.email }) }}
						</p>
						<div class="flex gap-3">
							<button @click="showSuspendModal = false" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 transition-all">
								{{ $t('admin.businesses.suspend_modal.cancel') }}
							</button>
							<button @click="suspendBusiness" :disabled="actionLoading"
								class="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
								<Icon v-if="actionLoading" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
								<span>{{ $t('admin.businesses.suspend_modal.confirm') }}</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Reactivate Modal -->
		<Teleport to="body">
			<div v-if="showReactivateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div class="absolute inset-0 bg-black/60" @click="showReactivateModal = false"></div>
				<div class="relative bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
					<div class="text-center">
						<div class="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
							<Icon name="ph:check-circle-bold" size="28" class="text-emerald-400" />
						</div>
						<h3 class="text-xl font-bold text-white mb-2">{{ $t('admin.businesses.reactivate_modal.title') }}</h3>
						<p class="text-slate-400 text-sm mb-6">
							{{ $t('admin.businesses.reactivate_modal.description', { email: business?.owner.email }) }}
						</p>
						<div class="flex gap-3">
							<button @click="showReactivateModal = false" class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 transition-all">
								{{ $t('admin.businesses.reactivate_modal.cancel') }}
							</button>
							<button @click="reactivateBusiness" :disabled="actionLoading"
								class="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
								<Icon v-if="actionLoading" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
								<span>{{ $t('admin.businesses.reactivate_modal.confirm') }}</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>
