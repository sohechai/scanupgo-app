<script setup lang="ts">
// Dashboard "ROI" affiché au commerçant NON-ABONNÉ : ses vraies stats Google +
// une projection de ce que ScanUpGo peut générer. Métriques produit verrouillées.
const props = defineProps<{
	firstName?: string | null
	businessName?: string | null
	businessCity?: string | null
	googleRating?: number | null
	reviewCount?: number | null
	reviewsThisMonth?: number | null
}>()

// Hypothèses moyennes du secteur (cf. brief — hardcodées côté front)
const HYPOTHESES = {
	clientsParJour: 80,
	tauxScan: 0.15,
	tauxRetour: 0.20,
	panierMoyen: 120, // Dhs
	prixAbo: 550, // Dhs/mois
}

const projection = computed(() => {
	const scansJour = Math.round(HYPOTHESES.clientsParJour * HYPOTHESES.tauxScan) // 12
	const avisMois = scansJour * 30 // 360
	const retoursMois = Math.round(avisMois * HYPOTHESES.tauxRetour) // 72
	const caAdditionnel = retoursMois * HYPOTHESES.panierMoyen // 8 640
	// Nouveaux avis "avec ScanUpGo" : conversion d'une fraction des scans en avis
	const nouveauxAvis = Math.round(avisMois * 0.15) // ~54
	const avisNaturels = props.reviewsThisMonth ?? Math.max(1, Math.round((props.reviewCount ?? 0) / 12))
	return {
		nouveauxAvis,
		avisNaturels,
		caAdditionnel,
		roiNet: caAdditionnel - HYPOTHESES.prixAbo,
	}
})

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
</script>

<template>
	<div class="space-y-5">
		<!-- Bannière non-bloquante -->
		<div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
			<p class="flex-1 text-sm text-blue-900 dark:text-blue-200 leading-snug">
				{{ $t('dashboard.roi.banner') }}
			</p>
			<NuxtLink to="/dashboard/subscription"
				class="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-lg transition-all text-sm">
				{{ $t('dashboard.roi.banner_cta') }}
				<Icon name="ph:arrow-right-bold" size="14" class="rtl:rotate-180" />
			</NuxtLink>
		</div>

		<!-- En-tête -->
		<div>
			<h1 class="text-xl font-bold text-slate-900 dark:text-white">
				{{ $t('dashboard.roi.greeting', { name: firstName || '' }) }}
			</h1>
			<p v-if="businessName" class="text-sm text-slate-500 dark:text-slate-400">
				{{ businessName }}<span v-if="businessCity"> · {{ businessCity }}</span>
			</p>
		</div>

		<!-- Situation Google aujourd'hui -->
		<div>
			<p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{{ $t('dashboard.roi.google_title') }}</p>
			<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<!-- Note Google (réelle) -->
				<div class="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
					<p class="text-xs text-slate-500 dark:text-slate-400 mb-1">{{ $t('dashboard.roi.note') }}</p>
					<p class="text-2xl font-black text-slate-900 dark:text-white">
						{{ googleRating != null ? googleRating.toFixed(1) : '—' }} <span class="text-amber-400">★</span>
					</p>
					<p class="text-[11px] text-slate-400 mt-0.5">
						{{ reviewCount != null ? $t('dashboard.roi.reviews_real', { count: reviewCount }) : $t('dashboard.roi.no_google') }}
					</p>
				</div>
				<!-- Avis ce mois -->
				<div class="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
					<p class="text-xs text-slate-500 dark:text-slate-400 mb-1">{{ $t('dashboard.roi.avis_month') }}</p>
					<p class="text-2xl font-black text-slate-900 dark:text-white">{{ projection.avisNaturels }}</p>
					<p class="text-[11px] text-slate-400 mt-0.5">{{ $t('dashboard.roi.natural_pace') }}</p>
				</div>
				<!-- Scans QR (verrouillé) -->
				<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 relative">
					<p class="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
						<Icon name="ph:lock-simple-fill" size="11" /> {{ $t('dashboard.roi.scans') }}
					</p>
					<p class="text-2xl font-black text-slate-300 dark:text-slate-600">—</p>
					<p class="text-[11px] text-slate-400 mt-0.5">{{ $t('dashboard.roi.after_activation') }}</p>
				</div>
				<!-- Fidélisation (verrouillé) -->
				<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 relative">
					<p class="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
						<Icon name="ph:lock-simple-fill" size="11" /> {{ $t('dashboard.roi.loyalty') }}
					</p>
					<p class="text-2xl font-black text-slate-300 dark:text-slate-600">—</p>
					<p class="text-[11px] text-slate-400 mt-0.5">{{ $t('dashboard.roi.after_activation') }}</p>
				</div>
			</div>
		</div>

		<!-- Projection 30 jours -->
		<div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
			<div class="px-4 py-3 bg-gradient-to-r from-[#007AFF] to-blue-500">
				<p class="text-sm font-bold text-white">{{ $t('dashboard.roi.projection_title') }}</p>
			</div>
			<div class="p-4">
				<div class="grid grid-cols-3 gap-2 text-sm">
					<div class="text-xs font-semibold text-slate-400 uppercase tracking-wide"></div>
					<div class="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">{{ $t('dashboard.roi.today') }}</div>
					<div class="text-xs font-semibold text-[#007AFF] uppercase tracking-wide text-center">{{ $t('dashboard.roi.with_scanupgo') }}</div>

					<div class="py-2 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700">{{ $t('dashboard.roi.new_reviews') }}</div>
					<div class="py-2 text-center text-slate-500 border-t border-slate-100 dark:border-slate-700">~{{ projection.avisNaturels }}</div>
					<div class="py-2 text-center font-bold text-emerald-600 border-t border-slate-100 dark:border-slate-700">+{{ projection.nouveauxAvis }}</div>

					<div class="py-2 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700">{{ $t('dashboard.roi.ca_additional') }}</div>
					<div class="py-2 text-center text-slate-400 border-t border-slate-100 dark:border-slate-700">—</div>
					<div class="py-2 text-center font-bold text-emerald-600 border-t border-slate-100 dark:border-slate-700">+{{ fmt(projection.caAdditionnel) }} Dhs</div>
				</div>

				<!-- ROI net -->
				<div class="mt-3 flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
					<span class="text-sm font-bold text-emerald-700 dark:text-emerald-300">{{ $t('dashboard.roi.roi_net') }}</span>
					<span class="text-base font-black text-emerald-700 dark:text-emerald-300">+{{ fmt(projection.roiNet) }} Dhs</span>
				</div>

				<!-- Disclaimer légal obligatoire -->
				<p class="mt-3 text-[10px] text-slate-400 text-center leading-relaxed">
					{{ $t('dashboard.roi.disclaimer') }}
				</p>
			</div>
		</div>
	</div>
</template>
