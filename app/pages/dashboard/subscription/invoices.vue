<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()

interface Invoice {
	id: string
	number: string
	status: string
	amount: number
	currency: string
	created: string
	periodStart: string | null
	periodEnd: string | null
	invoicePdf: string | null
	hostedInvoiceUrl: string | null
	paid: boolean
	description: string
}

const loading = ref(true)
const invoices = ref<Invoice[]>([])
const error = ref<any>(null)

onMounted(async () => {
	try {
		invoices.value = (await $api<Invoice[]>('/subscriptions/invoices')) || []
	} catch (e) {
		console.error('Error fetching invoices:', e)
		error.value = e
	} finally {
		loading.value = false
	}
})

const statusConfig: Record<string, { dot: string; text: string; label: () => string }> = {
	paid:          { dot: 'bg-emerald-500', text: 'text-emerald-600', label: () => t('subscription.invoices.status_paid') },
	open:          { dot: 'bg-amber-400',   text: 'text-amber-600',   label: () => t('subscription.invoices.status_pending') },
	void:          { dot: 'bg-slate-400',   text: 'text-slate-500',   label: () => t('subscription.invoices.status_void') },
	uncollectible: { dot: 'bg-red-500',     text: 'text-red-600',     label: () => t('subscription.invoices.status_uncollectible') },
}
const getStatus = (s: string) => statusConfig[s] || statusConfig.void
</script>

<template>
	<div class="space-y-5">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<NuxtLink to="/dashboard/subscription"
				class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
				<Icon name="ph:arrow-left-bold" size="15" class="rtl:rotate-180" />
			</NuxtLink>
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('subscription.invoices.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('subscription.invoices.subtitle') }}</p>
			</div>
		</div>

		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-20">
			<Icon name="ph:spinner-gap-bold" size="28" class="text-slate-300 animate-spin" />
		</div>

		<!-- Error -->
		<div v-else-if="error" class="max-w-md mx-auto bg-red-50 border border-red-100 rounded-lg p-6 text-center">
			<Icon name="ph:warning-circle-fill" size="28" class="mx-auto text-red-500 mb-3" />
			<h3 class="font-semibold text-slate-900 mb-1">{{ $t('subscription.error') }}</h3>
			<p class="text-sm text-red-600">{{ error.message }}</p>
		</div>

		<!-- Empty -->
		<div v-else-if="!invoices.length"
			class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center max-w-2xl mx-auto">
			<Icon name="ph:receipt" size="40" class="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
			<p class="text-slate-600 dark:text-slate-300 font-medium text-sm">{{ $t('subscription.invoices.no_invoices') }}</p>
			<p class="text-xs text-slate-400 mt-2">{{ $t('subscription.invoices.no_invoices_message') }}</p>
		</div>

		<!-- Table -->
		<div v-else class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
			<table class="w-full">
				<thead>
					<tr class="border-b border-slate-100 dark:border-slate-800">
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.invoices.number') }}</th>
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.invoices.date') }}</th>
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.invoices.period') }}</th>
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.invoices.amount') }}</th>
						<th class="px-5 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.invoices.status') }}</th>
						<th class="px-5 py-3 text-right text-xs font-medium text-slate-400 dark:text-slate-500">{{ $t('subscription.invoices.actions') }}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
					<tr v-for="invoice in invoices" :key="invoice.id"
						class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
						<td class="px-5 py-3.5">
							<span class="text-sm font-medium text-slate-900 dark:text-white">
								{{ invoice.number || invoice.id.slice(-8) }}
							</span>
						</td>
						<td class="px-5 py-3.5">
							<span class="text-sm text-slate-500 dark:text-slate-400">{{ formatDate(invoice.created) }}</span>
						</td>
						<td class="px-5 py-3.5">
							<span v-if="invoice.periodStart && invoice.periodEnd" class="text-sm text-slate-500 dark:text-slate-400">
								{{ formatDate(invoice.periodStart) }} — {{ formatDate(invoice.periodEnd) }}
							</span>
							<span v-else class="text-sm text-slate-300">—</span>
						</td>
						<td class="px-5 py-3.5">
							<span class="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
								{{ invoice.amount }} {{ invoice.currency }}
							</span>
						</td>
						<td class="px-5 py-3.5">
							<span class="inline-flex items-center gap-1.5 text-xs" :class="getStatus(invoice.status).text">
								<span :class="[getStatus(invoice.status).dot, 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
								{{ getStatus(invoice.status).label() }}
							</span>
						</td>
						<td class="px-5 py-3.5 text-right">
							<div class="flex items-center justify-end gap-1">
								<a v-if="invoice.hostedInvoiceUrl" :href="invoice.hostedInvoiceUrl" target="_blank"
									class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-md transition-colors">
									<Icon name="ph:eye-bold" size="13" />
									{{ $t('subscription.invoices.view') }}
								</a>
								<a v-if="invoice.invoicePdf" :href="invoice.invoicePdf" target="_blank"
									class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-xs font-medium rounded-md transition-colors">
									<Icon name="ph:download-bold" size="13" />
									{{ $t('subscription.invoices.download') }}
								</a>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
