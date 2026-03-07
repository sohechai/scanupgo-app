<script setup lang="ts">
const { t } = useI18n()
const { $api } = useNuxtApp()
const { formatDate } = useLocaleDate()

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

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

// State
const loading = ref(true)
const invoices = ref<Invoice[]>([])
const error = ref<any>(null)

// Fetch invoices
onMounted(async () => {
	try {
		const data = await $api<Invoice[]>('/subscriptions/invoices')
		invoices.value = data
	} catch (e) {
		console.error('Error fetching invoices:', e)
		error.value = e
	} finally {
		loading.value = false
	}
})

// Get status badge class
const getStatusBadge = (status: string) => {
	switch (status) {
		case 'paid':
			return 'bg-emerald-50 text-emerald-700 border-emerald-200'
		case 'open':
			return 'bg-blue-50 text-blue-700 border-blue-200'
		case 'void':
			return 'bg-slate-50 text-slate-700 border-slate-200'
		case 'uncollectible':
			return 'bg-red-50 text-red-700 border-red-200'
		default:
			return 'bg-slate-50 text-slate-600 border-slate-200'
	}
}

// Get status label
const getStatusLabel = (status: string) => {
	switch (status) {
		case 'paid':
			return t('subscription.invoices.status_paid')
		case 'open':
			return t('subscription.invoices.status_pending')
		case 'void':
			return t('subscription.invoices.status_void')
		case 'uncollectible':
			return t('subscription.invoices.status_uncollectible')
		default:
			return status
	}
}
</script>

<template>
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 tracking-tight mb-2">
					{{ $t('subscription.invoices.title') }}
				</h1>
				<p class="text-slate-500">
					{{ $t('subscription.invoices.subtitle') }}
				</p>
			</div>
			<NuxtLink to="/dashboard/subscription"
				class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors">
				<Icon name="ph:arrow-left-bold" class="inline mr-2 rtl:rotate-180" />
				{{ $t('subscription.invoices.back') }}
			</NuxtLink>
		</div>

		<!-- Loading State -->
		<div v-if="loading" class="text-center py-20">
			<Icon name="ph:spinner-gap-bold" size="32" class="mx-auto text-brand-600 animate-spin mb-3" />
			<p class="text-slate-500 font-medium">{{ $t('subscription.invoices.loading') }}</p>
		</div>

		<!-- Error State -->
		<div v-else-if="error" class="max-w-md mx-auto bg-red-50 border border-red-100 rounded-xl p-6 text-center">
			<Icon name="ph:warning-circle-fill" size="32" class="mx-auto text-red-500 mb-3" />
			<h3 class="font-bold text-red-900 mb-1">{{ $t('subscription.error') }}</h3>
			<p class="text-sm text-red-700">{{ error.message }}</p>
		</div>

		<!-- Empty State -->
		<div v-else-if="!invoices.length"
			class="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center max-w-2xl mx-auto">
			<Icon name="ph:receipt" size="48" class="mx-auto text-slate-300 mb-4" />
			<p class="text-slate-600 font-medium">{{ $t('subscription.invoices.no_invoices') }}</p>
			<p class="text-xs text-slate-400 mt-2">{{ $t('subscription.invoices.no_invoices_message') }}</p>
		</div>

		<!-- Invoices Table -->
		<div v-else class="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="bg-slate-50 border-b border-slate-100">
							<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
								{{ $t('subscription.invoices.number') }}
							</th>
							<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
								{{ $t('subscription.invoices.date') }}
							</th>
							<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
								{{ $t('subscription.invoices.period') }}
							</th>
							<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
								{{ $t('subscription.invoices.amount') }}
							</th>
							<th class="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
								{{ $t('subscription.invoices.status') }}
							</th>
							<th class="px-6 py-4 text-right rtl:text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
								{{ $t('subscription.invoices.actions') }}
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						<tr v-for="invoice in invoices" :key="invoice.id"
							class="hover:bg-slate-50/50 transition-colors">
							<td class="px-6 py-4">
								<span class="text-sm font-medium text-slate-900">
									{{ invoice.number || invoice.id.slice(-8) }}
								</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm text-slate-700">
									{{ formatDate(invoice.created) }}
								</span>
							</td>
							<td class="px-6 py-4">
								<span v-if="invoice.periodStart && invoice.periodEnd" class="text-sm text-slate-700">
									{{ formatDate(invoice.periodStart) }} - {{ formatDate(invoice.periodEnd) }}
								</span>
								<span v-else class="text-sm text-slate-400">-</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm font-semibold text-slate-900">
									{{ invoice.amount }} {{ invoice.currency }}
								</span>
							</td>
							<td class="px-6 py-4">
								<span
									:class="['px-3 py-1 rounded-full text-xs font-bold border', getStatusBadge(invoice.status)]">
									{{ getStatusLabel(invoice.status) }}
								</span>
							</td>
							<td class="px-6 py-4 text-right rtl:text-left">
								<div class="flex items-center justify-end gap-2">
									<a v-if="invoice.hostedInvoiceUrl" :href="invoice.hostedInvoiceUrl" target="_blank"
										class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">
										<Icon name="ph:eye-bold" size="14" />
										{{ $t('subscription.invoices.view') }}
									</a>
									<a v-if="invoice.invoicePdf" :href="invoice.invoicePdf" target="_blank"
										class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors">
										<Icon name="ph:download-bold" size="14" />
										{{ $t('subscription.invoices.download') }}
									</a>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>
