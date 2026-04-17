<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { formatDate, formatNumber } = useLocaleDate()
const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const toast = useToast()

const loading = ref(true)
const loadingMore = ref(false)
const exporting = ref(false)
const activeTab = ref<'payments' | 'invoices'>('payments')

// Payments data
const subscriptions = ref<any[]>([])
const payments = ref<any[]>([])
const paymentStats = ref<{
	totalRevenue: number
	totalRefunded: number
	successfulPayments: number
	failedPayments: number
	currency: string
} | null>(null)
const hasMore = ref(false)
const lastPaymentId = ref<string | null>(null)

// Invoices data
const invoices = ref<any[]>([])
const invoicesTotal = ref(0)
const invoicesHasMore = ref(false)
const invoicesOffset = ref(0)
const loadingInvoices = ref(false)
const selectedInvoices = ref<string[]>([])

// Invoice filters
const invoiceSearch = ref('')
const invoiceStatusFilter = ref('')
const invoiceDateFrom = ref('')
const invoiceDateTo = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

// Fetch subscriptions and payments
onMounted(async () => {
	try {
		const [subsData, paymentsData, statsData] = await Promise.all([
			$api<any[]>('/admin/subscriptions'),
			$api<any>('/admin/payments'),
			$api<any>('/admin/payments/stats')
		])
		subscriptions.value = subsData
		payments.value = paymentsData.payments
		hasMore.value = paymentsData.hasMore
		lastPaymentId.value = paymentsData.lastId
		paymentStats.value = statsData
	} catch (error) {
		console.error('Failed to fetch data:', error)
	} finally {
		loading.value = false
	}
})

// Load invoices when tab changes
watch(activeTab, async (newTab) => {
	if (newTab === 'invoices' && invoices.value.length === 0) {
		await fetchInvoices()
	}
})

// Watch filters
watch(invoiceStatusFilter, () => fetchInvoices())
watch(invoiceDateFrom, () => fetchInvoices())
watch(invoiceDateTo, () => fetchInvoices())
watch(invoiceSearch, () => {
	if (searchDebounce) clearTimeout(searchDebounce)
	searchDebounce = setTimeout(() => fetchInvoices(), 400)
})

// Fetch invoices with filters
const fetchInvoices = async () => {
	loadingInvoices.value = true
	try {
		const params: any = { limit: 50, offset: 0 }
		if (invoiceSearch.value) params.search = invoiceSearch.value
		if (invoiceStatusFilter.value) params.status = invoiceStatusFilter.value
		if (invoiceDateFrom.value) params.dateFrom = invoiceDateFrom.value
		if (invoiceDateTo.value) params.dateTo = invoiceDateTo.value

		const data = await $api<any>('/admin/invoices', { params })
		invoices.value = data.invoices
		invoicesTotal.value = data.total
		invoicesHasMore.value = data.hasMore
		invoicesOffset.value = data.invoices.length
		selectedInvoices.value = []
	} catch (error) {
		console.error('Failed to fetch invoices:', error)
	} finally {
		loadingInvoices.value = false
	}
}

// Load more invoices
const loadMoreInvoices = async () => {
	if (!invoicesHasMore.value || loadingInvoices.value) return

	loadingInvoices.value = true
	try {
		const params: any = { limit: 50, offset: invoicesOffset.value }
		if (invoiceSearch.value) params.search = invoiceSearch.value
		if (invoiceStatusFilter.value) params.status = invoiceStatusFilter.value
		if (invoiceDateFrom.value) params.dateFrom = invoiceDateFrom.value
		if (invoiceDateTo.value) params.dateTo = invoiceDateTo.value

		const data = await $api<any>('/admin/invoices', { params })
		invoices.value = [...invoices.value, ...data.invoices]
		invoicesHasMore.value = data.hasMore
		invoicesOffset.value += data.invoices.length
	} catch (error) {
		console.error('Failed to load more invoices:', error)
	} finally {
		loadingInvoices.value = false
	}
}

// Clear all filters
const clearInvoiceFilters = () => {
	invoiceSearch.value = ''
	invoiceStatusFilter.value = ''
	invoiceDateFrom.value = ''
	invoiceDateTo.value = ''
}

const hasActiveFilters = computed(() => {
	return invoiceSearch.value || invoiceStatusFilter.value || invoiceDateFrom.value || invoiceDateTo.value
})

// Load more payments
const loadMorePayments = async () => {
	if (!hasMore.value || loadingMore.value || !lastPaymentId.value) return

	loadingMore.value = true
	try {
		const data = await $api<any>('/admin/payments', {
			params: { startingAfter: lastPaymentId.value }
		})
		payments.value = [...payments.value, ...data.payments]
		hasMore.value = data.hasMore
		lastPaymentId.value = data.lastId
	} catch (error) {
		console.error('Failed to load more payments:', error)
	} finally {
		loadingMore.value = false
	}
}

// Calculate revenue from subscriptions
const stats = computed(() => {
	const activeSubscriptions = subscriptions.value.filter(s => s.status === 'active')

	const monthlyRevenue = activeSubscriptions
		.filter(s => s.billingPeriod === 'monthly')
		.reduce((sum, s) => sum + s.price, 0)

	const annualRevenue = activeSubscriptions
		.filter(s => s.billingPeriod === 'annual')
		.reduce((sum, s) => sum + s.price, 0)

	const lifetimeRevenue = activeSubscriptions
		.filter(s => s.billingPeriod === 'lifetime')
		.reduce((sum, s) => sum + s.price, 0)

	const totalRevenue = monthlyRevenue + annualRevenue + lifetimeRevenue

	return {
		totalRevenue,
		monthlyRevenue,
		annualRevenue,
		lifetimeRevenue,
		activeCount: activeSubscriptions.length,
		totalCount: subscriptions.value.length
	}
})

// Get status badge classes
const getStatusClasses = (status: string) => {
	switch (status) {
		case 'succeeded':
		case 'paid':
			return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
		case 'pending':
			return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
		case 'failed':
		case 'refunded':
			return 'bg-red-500/10 text-red-400 border-red-500/20'
		case 'partial_refund':
			return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
		default:
			return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
	}
}

// Get status label
const getStatusLabel = (status: string) => {
	switch (status) {
		case 'succeeded':
		case 'paid':
			return t('admin.payments.payment_status_paid')
		case 'pending':
			return t('admin.payments.payment_status_pending')
		case 'failed':
			return t('admin.payments.payment_status_failed')
		case 'refunded':
			return t('admin.payments.payment_status_refunded')
		case 'partial_refund':
			return t('admin.payments.payment_status_partial_refund')
		default:
			return status
	}
}

// Mark invoice as paid
const markInvoiceAsPaid = async (invoice: any) => {
	if (invoice.status === 'paid') return

	try {
		await $api(`/admin/invoices/${invoice.id}/status`, {
			method: 'PATCH',
			body: { status: 'paid' }
		})
		invoice.status = 'paid'
		toast.show(t('admin.payments.invoices_mark_paid'), 'success')
	} catch (error: any) {
		toast.show(error?.data?.message || t('admin.payments.invoices_mark_paid'), 'error')
	}
}

// Update invoice status
const updateInvoiceStatus = async (invoice: any, status: string) => {
	try {
		await $api(`/admin/invoices/${invoice.id}/status`, {
			method: 'PATCH',
			body: { status }
		})
		invoice.status = status
		toast.show(t('admin.payments.invoices_mark_paid'), 'success')
	} catch (error: any) {
		toast.show(error?.data?.message || t('admin.payments.invoices_mark_paid'), 'error')
	}
}

// Download single invoice
const downloadInvoice = (invoiceId: string) => {
	window.open(`${config.public.apiBase}/admin/invoices/${invoiceId}/download`, '_blank')
}

// Toggle invoice selection
const toggleInvoiceSelection = (invoiceId: string) => {
	const index = selectedInvoices.value.indexOf(invoiceId)
	if (index === -1) {
		selectedInvoices.value.push(invoiceId)
	} else {
		selectedInvoices.value.splice(index, 1)
	}
}

// Select all invoices
const selectAllInvoices = () => {
	if (selectedInvoices.value.length === invoices.value.length) {
		selectedInvoices.value = []
	} else {
		selectedInvoices.value = invoices.value.map(i => i.id)
	}
}

// Download selected invoices
const downloadSelectedInvoices = async () => {
	if (selectedInvoices.value.length === 0) return

	// Download each invoice
	for (const invoiceId of selectedInvoices.value) {
		window.open(`${config.public.apiBase}/admin/invoices/${invoiceId}/download`, '_blank')
		await new Promise(resolve => setTimeout(resolve, 500)) // Delay between downloads
	}
}

// Export payments to CSV
const exportToCSV = () => {
	exporting.value = true

	try {
		const headers = ['ID', 'Date', 'Client', 'Email', t('admin.payments.table_amount'), t('admin.payments.table_status')]
		const rows = payments.value.map(p => [
			p.id,
			formatDate(p.created),
			p.customerName || '-',
			p.customerEmail || '-',
			p.amount,
			p.currency,
			getStatusLabel(p.status),
			p.refunded ? t('common.yes') : t('common.no'),
			p.refundedAmount || 0
		])

		const csvContent = [
			headers.join(','),
			...rows.map(row => row.map(cell => `"${cell}"`).join(','))
		].join('\n')

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`
		link.click()
	} finally {
		exporting.value = false
	}
}

// Export invoices to CSV
const exportInvoicesToCSV = () => {
	const headers = ['N° Facture', 'Date', 'Commerce', 'Email', t('admin.payments.table_amount'), t('admin.payments.table_status')]
	const rows = invoices.value.map(i => [
		i.invoiceNumber,
		formatDate(i.createdAt),
		i.businessName,
		i.businessEmail,
		i.amount,
		i.currency,
		getStatusLabel(i.status)
	])

	const csvContent = [
		headers.join(','),
		...rows.map(row => row.map(cell => `"${cell}"`).join(','))
	].join('\n')

	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `factures_${new Date().toISOString().split('T')[0]}.csv`
	link.click()
}
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.payments.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.payments.description') }}</p>
				</div>
			</div>

			<!-- Loading State -->
			<div v-if="loading" class="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div v-for="i in 4" :key="i" class="h-32 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
				</div>
			</div>

			<!-- Summary Cards -->
			<div v-else class="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div
					class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/10">
					<div class="flex items-center gap-4 mb-4">
						<div
							class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
							<Icon name="ph:currency-dollar-bold" size="24" class="text-white" />
						</div>
						<div class="text-slate-400 text-sm font-bold">{{ $t('admin.payments.subscriptions_revenue') }}</div>
					</div>
					<div class="text-3xl font-bold text-white">{{ formatNumber(stats.totalRevenue) }} Dhs
					</div>
					<div class="flex items-center gap-2 mt-2">
						<span
							class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 text-xs font-bold">
							{{ stats.activeCount }} actifs
						</span>
					</div>
				</div>

				<div
					class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/10">
					<div class="flex items-center gap-4 mb-4">
						<div
							class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
							<Icon name="ph:check-circle-bold" size="24" class="text-emerald-400" />
						</div>
						<div class="text-slate-400 text-sm font-bold">{{ $t('admin.payments.successful_payments') }}</div>
					</div>
					<div class="text-3xl font-bold text-white">{{ paymentStats?.successfulPayments || 0 }}
					</div>
					<div class="text-slate-500 text-xs font-medium mt-2">
						{{ $t('admin.payments.last_30_days') }}
					</div>
				</div>

				<div
					class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/10">
					<div class="flex items-center gap-4 mb-4">
						<div
							class="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
							<Icon name="ph:x-circle-bold" size="24" class="text-red-400" />
						</div>
						<div class="text-slate-400 text-sm font-bold">{{ $t('admin.payments.failed_payments') }}</div>
					</div>
					<div class="text-3xl font-bold text-white">{{ paymentStats?.failedPayments || 0 }}
					</div>
					<div class="text-slate-500 text-xs font-medium mt-2">
						{{ $t('admin.payments.last_30_days') }}
					</div>
				</div>

				<div
					class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/10">
					<div class="flex items-center gap-4 mb-4">
						<div
							class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
							<Icon name="ph:receipt-bold" size="24" class="text-purple-400" />
						</div>
						<div class="text-slate-400 text-sm font-bold">{{ $t('admin.payments.invoices_generated') }}</div>
					</div>
					<div class="text-3xl font-bold text-white">{{ invoicesTotal || 0 }}
					</div>
					<div class="text-slate-500 text-xs font-medium mt-2">
						{{ $t('admin.payments.total_cumulative') }}
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<div class="flex gap-2">
				<button @click="activeTab = 'payments'" :class="[
					'px-4 py-2 rounded-xl font-bold text-sm transition-all',
					activeTab === 'payments'
						? 'bg-white text-slate-900'
						: 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
				]">
					<Icon name="ph:credit-card-bold" size="16" class="mr-2" />
					{{ $t('admin.payments.tab_stripe') }}
				</button>
				<button @click="activeTab = 'invoices'" :class="[
					'px-4 py-2 rounded-xl font-bold text-sm transition-all',
					activeTab === 'invoices'
						? 'bg-white text-slate-900'
						: 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
				]">
					<Icon name="ph:receipt-bold" size="16" class="mr-2" />
					{{ $t('admin.payments.tab_invoices') }}
				</button>
			</div>

			<!-- Payments Tab -->
			<div v-if="activeTab === 'payments'"
				class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
				<div class="p-6 border-b border-white/10 flex items-center justify-between">
					<div>
						<h2 class="text-xl font-bold text-white">{{ $t('admin.payments.stripe_history') }}</h2>
						<p class="text-slate-400 text-sm mt-1">{{ $t('admin.payments.stripe_description') }}</p>
					</div>
					<button @click="exportToCSV" :disabled="exporting || payments.length === 0"
						class="px-4 py-2 bg-white/5 text-white rounded-xl font-bold border border-white/10 flex items-center gap-2 hover:bg-white/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
						<Icon v-if="exporting" name="svg-spinners:ring-resize" size="16" />
						<Icon v-else name="ph:download-simple-bold" />
						{{ $t('admin.payments.export_csv') }}
					</button>
				</div>

				<!-- Empty State -->
				<div v-if="!loading && payments.length === 0" class="p-12 text-center">
					<div
						class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
						<Icon name="ph:credit-card-duotone" size="32" class="text-slate-400" />
					</div>
					<h3 class="text-lg font-bold text-white mb-2">{{ $t('admin.payments.no_transactions') }}</h3>
					<p class="text-slate-400">{{ $t('admin.payments.no_transactions_description') }}</p>
				</div>

				<!-- Table -->
				<div v-else class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-white/5">
							<tr>
								<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.payments.table_date') }}</th>
								<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.payments.table_client') }}</th>
								<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.payments.table_amount') }}</th>
								<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.payments.table_status') }}</th>
								<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.payments.table_refund') }}</th>
								<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.payments.table_actions') }}</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/5">
							<tr v-for="payment in payments" :key="payment.id"
								class="hover:bg-white/5 transition-colors">
								<td class="py-4 px-6">
									<div class="text-sm font-medium text-white">{{ formatDate(payment.created) }}</div>
									<div class="text-xs text-slate-500 font-mono">{{ payment.id.slice(0, 20) }}...</div>
								</td>
								<td class="py-4 px-6">
									<div class="text-sm font-medium text-white">{{ payment.customerName || '-' }}</div>
									<div class="text-xs text-slate-400">{{ payment.customerEmail || '-' }}</div>
								</td>
								<td class="py-4 px-6">
									<div class="text-sm font-bold text-white">{{ formatNumber(payment.amount) }}
										{{ payment.currency }}</div>
									<div v-if="payment.description" class="text-xs text-slate-500 truncate max-w-[200px]">
										{{ payment.description }}</div>
								</td>
								<td class="py-4 px-6">
									<span :class="[
										'px-2.5 py-1 rounded-lg text-xs font-bold border',
										getStatusClasses(payment.status)
									]">
										{{ getStatusLabel(payment.status) }}
									</span>
								</td>
								<td class="py-4 px-6">
									<div v-if="payment.refunded" class="flex items-center gap-2">
										<span
											class="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
											{{ $t('admin.payments.refunded') }}
										</span>
										<span class="text-xs text-slate-400">{{ formatNumber(payment.refundedAmount) }} {{ payment.currency }}</span>
									</div>
									<span v-else class="text-xs text-slate-500">-</span>
								</td>
								<td class="py-4 px-6">
									<a v-if="payment.receiptUrl" :href="payment.receiptUrl" target="_blank"
										class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-colors">
										<Icon name="ph:receipt-bold" size="14" />
										{{ $t('admin.payments.receipt') }}
									</a>
									<span v-else class="text-xs text-slate-500">-</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Load More -->
				<div v-if="hasMore" class="p-6 border-t border-white/10 text-center">
					<button @click="loadMorePayments" :disabled="loadingMore"
						class="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-colors disabled:opacity-50">
						<span v-if="loadingMore" class="flex items-center gap-2">
							<Icon name="svg-spinners:ring-resize" size="16" />
							{{ $t('admin.payments.invoices_loading') }}
						</span>
						<span v-else>{{ $t('admin.payments.load_more') }}</span>
					</button>
				</div>
			</div>

			<!-- Invoices Tab -->
			<div v-if="activeTab === 'invoices'" class="space-y-6">

				<!-- Filters Bar -->
				<div
					class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg shadow-black/5">
					<div class="flex flex-col lg:flex-row gap-3">
						<!-- Search -->
						<div class="flex-1 relative">
							<Icon name="ph:magnifying-glass-bold" size="16"
								class="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
							<input v-model="invoiceSearch" type="text"
								:placeholder="$t('admin.payments.filters_search')"
								class="w-full pl-10 rtl:pl-4 pr-4 rtl:pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-white/20 outline-none transition-all placeholder-slate-600" />
						</div>

						<!-- Status Filter -->
						<select v-model="invoiceStatusFilter"
							class="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-white/20 outline-none transition-all appearance-none cursor-pointer min-w-[160px]">
							<option value="" class="bg-[#0f172a]">{{ $t('admin.payments.filters_all_status') }}</option>
							<option value="paid" class="bg-[#0f172a]">{{ $t('admin.payments.filters_paid') }}</option>
							<option value="refunded" class="bg-[#0f172a]">{{ $t('admin.payments.filters_refunded') }}</option>
							<option value="partial_refund" class="bg-[#0f172a]">{{ $t('admin.payments.filters_partial_refund') }}</option>
						</select>

						<!-- Date From -->
						<input v-model="invoiceDateFrom" type="date"
							class="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-white/20 outline-none transition-all" />

						<!-- Date To -->
						<input v-model="invoiceDateTo" type="date"
							class="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-white/20 outline-none transition-all" />

						<!-- Clear Filters -->
						<button v-if="hasActiveFilters" @click="clearInvoiceFilters"
							class="px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
							:title="$t('admin.payments.filters_clear')">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>

					<!-- Active filters summary -->
					<div v-if="hasActiveFilters" class="mt-3 flex items-center gap-2 text-xs text-slate-400">
						<Icon name="ph:funnel-bold" size="14" />
						<span>{{ $t('admin.payments.filters_results', { count: invoicesTotal }) }}</span>
					</div>
				</div>

				<!-- Invoices Table Card -->
				<div
					class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
					<div class="p-6 border-b border-white/10 flex items-center justify-between">
						<div>
							<h2 class="text-xl font-bold text-white">{{ $t('admin.payments.invoices_title') }}</h2>
							<p class="text-slate-400 text-sm mt-1">{{ $t('admin.payments.invoices_description') }}</p>
						</div>
						<div class="flex gap-3">
							<button v-if="selectedInvoices.length > 0" @click="downloadSelectedInvoices"
								class="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 transition-colors text-sm">
								<Icon name="ph:download-simple-bold" size="16" />
								{{ $t('admin.payments.invoices_download', { count: selectedInvoices.length }) }}
							</button>
							<button @click="exportInvoicesToCSV" :disabled="invoices.length === 0"
								class="px-4 py-2 bg-white/5 text-white rounded-xl font-bold border border-white/10 flex items-center gap-2 hover:bg-white/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
								<Icon name="ph:file-csv-bold" size="16" />
								{{ $t('admin.payments.invoices_export') }}
							</button>
						</div>
					</div>

					<!-- Loading State -->
					<div v-if="loadingInvoices && invoices.length === 0" class="p-12 text-center">
						<Icon name="svg-spinners:ring-resize" size="32" class="text-slate-400" />
					</div>

					<!-- Empty State -->
					<div v-else-if="!loadingInvoices && invoices.length === 0" class="p-12 text-center">
						<div
							class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
							<Icon name="ph:receipt-duotone" size="32" class="text-slate-400" />
						</div>
						<h3 class="text-lg font-bold text-white mb-2">
							{{ hasActiveFilters ? $t('admin.payments.invoices_no_results') : $t('admin.payments.invoices_no_invoices') }}
						</h3>
						<p class="text-slate-400">
							{{ hasActiveFilters
								? $t('admin.payments.invoices_no_match')
								: $t('admin.payments.invoices_auto_generated') }}
						</p>
						<button v-if="hasActiveFilters" @click="clearInvoiceFilters"
							class="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold hover:bg-white/10 transition-colors">
							{{ $t('admin.payments.filters_clear') }}
						</button>
					</div>

					<!-- Table -->
					<div v-else class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-white/5">
								<tr>
									<th class="text-left py-4 px-4 w-12">
										<input type="checkbox" :checked="selectedInvoices.length === invoices.length && invoices.length > 0"
											@change="selectAllInvoices"
											class="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500" />
									</th>
									<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.payments.invoices_table_number') }}</th>
									<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.payments.invoices_table_date') }}</th>
									<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.payments.invoices_table_business') }}</th>
									<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.payments.invoices_table_amount') }}</th>
									<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.payments.invoices_table_status') }}</th>
									<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.payments.invoices_table_sent') }}</th>
									<th class="text-left py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
										{{ $t('admin.payments.invoices_table_actions') }}</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-white/5">
								<tr v-for="invoice in invoices" :key="invoice.id"
									class="hover:bg-white/5 transition-colors">
									<td class="py-4 px-4">
										<input type="checkbox" :checked="selectedInvoices.includes(invoice.id)"
											@change="toggleInvoiceSelection(invoice.id)"
											class="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500" />
									</td>
									<td class="py-4 px-6">
										<div class="text-sm font-bold text-white font-mono">{{ invoice.invoiceNumber }}</div>
									</td>
									<td class="py-4 px-6">
										<div class="text-sm font-medium text-white">{{ formatDate(invoice.createdAt) }}</div>
									</td>
									<td class="py-4 px-6">
										<div class="text-sm font-medium text-white">{{ invoice.businessName }}</div>
										<div class="text-xs text-slate-400">{{ invoice.businessEmail }}</div>
									</td>
									<td class="py-4 px-6">
										<div class="text-sm font-bold text-white">{{ formatNumber(Number(invoice.amount)) }}
											{{ invoice.currency }}</div>
									</td>
									<td class="py-4 px-6">
										<span :class="[
											'px-2.5 py-1 rounded-lg text-xs font-bold border',
											getStatusClasses(invoice.status)
										]">
											{{ getStatusLabel(invoice.status) }}
										</span>
									</td>
									<td class="py-4 px-6">
										<div class="flex items-center gap-2">
											<span v-if="invoice.sentToMerchant"
												class="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400">
												{{ $t('admin.payments.invoices_sent_client') }}
											</span>
											<span v-if="invoice.sentToAdmin"
												class="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400">
												{{ $t('admin.payments.invoices_sent_admin') }}
											</span>
											<span v-if="!invoice.sentToMerchant && !invoice.sentToAdmin"
												class="text-xs text-slate-500">-</span>
										</div>
									</td>
									<td class="py-4 px-6">
										<div class="flex items-center gap-1">
											<!-- Mark as Paid -->
											<button v-if="invoice.status !== 'paid'"
												@click="markInvoiceAsPaid(invoice)"
												class="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
												:title="$t('admin.payments.invoices_mark_paid')">
												<Icon name="ph:check-circle-bold" size="16" />
											</button>
											<!-- Change to Refunded -->
											<button v-if="invoice.status === 'paid'"
												@click="updateInvoiceStatus(invoice, 'refunded')"
												class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
												:title="$t('admin.payments.invoices_mark_refunded')">
												<Icon name="ph:arrow-counter-clockwise-bold" size="16" />
											</button>
											<!-- Download PDF -->
											<button @click="downloadInvoice(invoice.id)"
												class="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
												:title="$t('admin.payments.invoices_download_pdf')">
												<Icon name="ph:download-simple-bold" size="16" />
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Load More -->
					<div v-if="invoicesHasMore" class="p-6 border-t border-white/10 text-center">
						<button @click="loadMoreInvoices" :disabled="loadingInvoices"
							class="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-colors disabled:opacity-50">
							<span v-if="loadingInvoices" class="flex items-center gap-2">
								<Icon name="svg-spinners:ring-resize" size="16" />
								{{ $t('admin.payments.invoices_loading') }}
							</span>
							<span v-else>{{ $t('admin.payments.load_more') }}</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Breakdown by Period -->
			<div v-if="!loading && stats.totalRevenue > 0"
				class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl shadow-black/10">
				<h3 class="text-xl font-bold mb-6 text-white">{{ $t('admin.payments.revenue_breakdown') }}</h3>
				<div class="space-y-4">
					<div
						class="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
						<div class="flex items-center gap-4">
							<div
								class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:calendar-blank-bold" size="20" class="text-slate-300" />
							</div>
							<div>
								<div class="text-base font-bold text-white">{{ $t('admin.payments.monthly_subscriptions') }}</div>
								<div class="text-sm text-slate-500">{{ $t('admin.payments.monthly_subscriptions_description') }}</div>
							</div>
						</div>
						<div class="text-right rtl:text-left">
							<div class="text-lg font-bold text-white">{{ formatNumber(stats.monthlyRevenue) }}
								Dhs
							</div>
							<div class="text-sm text-slate-500">{{ $t('admin.payments.monthly_subscriptions_active', { count: subscriptions.filter(s => s.billingPeriod === 'monthly' && s.status === 'active').length }) }}</div>
						</div>
					</div>

					<div
						class="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
						<div class="flex items-center gap-4">
							<div
								class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:calendar-check-bold" size="20" class="text-slate-300" />
							</div>
							<div>
								<div class="text-base font-bold text-white">{{ $t('admin.payments.annual_subscriptions') }}</div>
								<div class="text-sm text-slate-500">{{ $t('admin.payments.annual_subscriptions_description') }}</div>
							</div>
						</div>
						<div class="text-right rtl:text-left">
							<div class="text-lg font-bold text-white">{{ formatNumber(stats.annualRevenue) }}
								Dhs
							</div>
							<div class="text-sm text-slate-500">{{ $t('admin.payments.annual_subscriptions_active', { count: subscriptions.filter(s => s.billingPeriod === 'annual' && s.status === 'active').length }) }}</div>
						</div>
					</div>

					<div
						class="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
						<div class="flex items-center gap-4">
							<div
								class="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
								<Icon name="ph:infinity-bold" size="20" class="text-slate-300" />
							</div>
							<div>
								<div class="text-base font-bold text-white">{{ $t('admin.payments.lifetime_subscriptions') }}</div>
								<div class="text-sm text-slate-500">{{ $t('admin.payments.lifetime_subscriptions_description') }}</div>
							</div>
						</div>
						<div class="text-right rtl:text-left">
							<div class="text-lg font-bold text-white">{{ formatNumber(stats.lifetimeRevenue)
								}}
								Dhs</div>
							<div class="text-sm text-slate-500">{{ $t('admin.payments.lifetime_subscriptions_active', { count: subscriptions.filter(s => s.billingPeriod === 'lifetime' && s.status === 'active').length }) }}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
