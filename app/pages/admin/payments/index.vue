<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { t } = useI18n()
const { formatDate, formatNumber } = useLocaleDate()
const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const toast = useToast()

const loading = ref(true)
const loadingMore = ref(false)
const exporting = ref(false)
const activeTab = ref<'payments' | 'invoices'>('payments')

const subscriptions = ref<any[]>([])
const payments = ref<any[]>([])
const paymentStats = ref<any>(null)
const hasMore = ref(false)
const lastPaymentId = ref<string | null>(null)

const invoices = ref<any[]>([])
const invoicesTotal = ref(0)
const invoicesHasMore = ref(false)
const invoicesOffset = ref(0)
const loadingInvoices = ref(false)
const selectedInvoices = ref<string[]>([])

const invoiceSearch = ref('')
const invoiceStatusFilter = ref('')
const invoiceDateFrom = ref('')
const invoiceDateTo = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

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
	} catch (e) { console.error(e) }
	finally { loading.value = false }
})

watch(activeTab, async (tab) => { if (tab === 'invoices' && invoices.value.length === 0) await fetchInvoices() })
watch(invoiceStatusFilter, () => fetchInvoices())
watch(invoiceDateFrom, () => fetchInvoices())
watch(invoiceDateTo, () => fetchInvoices())
watch(invoiceSearch, () => { if (searchDebounce) clearTimeout(searchDebounce); searchDebounce = setTimeout(() => fetchInvoices(), 400) })

const fetchInvoices = async () => {
	loadingInvoices.value = true
	try {
		const params: any = { limit: 50, offset: 0 }
		if (invoiceSearch.value) params.search = invoiceSearch.value
		if (invoiceStatusFilter.value) params.status = invoiceStatusFilter.value
		if (invoiceDateFrom.value) params.dateFrom = invoiceDateFrom.value
		if (invoiceDateTo.value) params.dateTo = invoiceDateTo.value
		const data = await $api<any>('/admin/invoices', { params })
		invoices.value = data.invoices; invoicesTotal.value = data.total; invoicesHasMore.value = data.hasMore; invoicesOffset.value = data.invoices.length; selectedInvoices.value = []
	} catch (e) { console.error(e) }
	finally { loadingInvoices.value = false }
}

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
		invoices.value = [...invoices.value, ...data.invoices]; invoicesHasMore.value = data.hasMore; invoicesOffset.value += data.invoices.length
	} catch (e) { console.error(e) }
	finally { loadingInvoices.value = false }
}

const clearInvoiceFilters = () => { invoiceSearch.value = ''; invoiceStatusFilter.value = ''; invoiceDateFrom.value = ''; invoiceDateTo.value = '' }
const hasActiveFilters = computed(() => !!(invoiceSearch.value || invoiceStatusFilter.value || invoiceDateFrom.value || invoiceDateTo.value))

const loadMorePayments = async () => {
	if (!hasMore.value || loadingMore.value || !lastPaymentId.value) return
	loadingMore.value = true
	try {
		const data = await $api<any>('/admin/payments', { params: { startingAfter: lastPaymentId.value } })
		payments.value = [...payments.value, ...data.payments]; hasMore.value = data.hasMore; lastPaymentId.value = data.lastId
	} catch (e) { console.error(e) }
	finally { loadingMore.value = false }
}

const stats = computed(() => {
	const active = subscriptions.value.filter(s => s.status === 'active')
	const monthly = active.filter(s => s.billingPeriod === 'monthly').reduce((sum, s) => sum + s.price, 0)
	const annual = active.filter(s => s.billingPeriod === 'annual').reduce((sum, s) => sum + s.price, 0)
	const lifetime = active.filter(s => s.billingPeriod === 'lifetime').reduce((sum, s) => sum + s.price, 0)
	return { totalRevenue: monthly + annual + lifetime, monthlyRevenue: monthly, annualRevenue: annual, lifetimeRevenue: lifetime, activeCount: active.length }
})

const getStatusClasses = (status: string) => {
	switch (status) {
		case 'succeeded': case 'paid': return 'text-emerald-400'
		case 'pending': return 'text-amber-400'
		case 'failed': case 'refunded': return 'text-red-400'
		case 'partial_refund': return 'text-orange-400'
		default: return 'text-slate-500'
	}
}

const getStatusDot = (status: string) => {
	switch (status) {
		case 'succeeded': case 'paid': return 'bg-emerald-400'
		case 'pending': return 'bg-amber-400'
		case 'failed': case 'refunded': return 'bg-red-400'
		case 'partial_refund': return 'bg-orange-400'
		default: return 'bg-slate-600'
	}
}

const getStatusLabel = (status: string) => {
	switch (status) {
		case 'succeeded': case 'paid': return t('admin.payments.payment_status_paid')
		case 'pending': return t('admin.payments.payment_status_pending')
		case 'failed': return t('admin.payments.payment_status_failed')
		case 'refunded': return t('admin.payments.payment_status_refunded')
		case 'partial_refund': return t('admin.payments.payment_status_partial_refund')
		default: return status
	}
}

const markInvoiceAsPaid = async (invoice: any) => {
	if (invoice.status === 'paid') return
	try { await $api(`/admin/invoices/${invoice.id}/status`, { method: 'PATCH', body: { status: 'paid' } }); invoice.status = 'paid'; toast.show(t('admin.payments.invoices_mark_paid'), 'success') }
	catch (error: any) { toast.show(error?.data?.message || t('admin.payments.invoices_mark_paid'), 'error') }
}

const updateInvoiceStatus = async (invoice: any, status: string) => {
	try { await $api(`/admin/invoices/${invoice.id}/status`, { method: 'PATCH', body: { status } }); invoice.status = status; toast.show(t('admin.payments.invoices_mark_paid'), 'success') }
	catch (error: any) { toast.show(error?.data?.message || t('admin.payments.invoices_mark_paid'), 'error') }
}

const downloadInvoice = (invoiceId: string) => window.open(`${config.public.apiUrl}/admin/invoices/${invoiceId}/download`, '_blank')

const toggleInvoiceSelection = (id: string) => {
	const idx = selectedInvoices.value.indexOf(id)
	if (idx === -1) selectedInvoices.value.push(id)
	else selectedInvoices.value.splice(idx, 1)
}

const selectAllInvoices = () => {
	if (selectedInvoices.value.length === invoices.value.length) selectedInvoices.value = []
	else selectedInvoices.value = invoices.value.map(i => i.id)
}

const downloadSelectedInvoices = async () => {
	for (const id of selectedInvoices.value) {
		window.open(`${config.public.apiUrl}/admin/invoices/${id}/download`, '_blank')
		await new Promise(r => setTimeout(r, 500))
	}
}

const exportToCSV = () => {
	exporting.value = true
	try {
		const headers = ['ID', 'Date', 'Client', 'Email', t('admin.payments.table_amount'), t('admin.payments.table_status')]
		const rows = payments.value.map(p => [p.id, formatDate(p.created), p.customerName || '-', p.customerEmail || '-', p.amount, p.currency, getStatusLabel(p.status)])
		const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
		const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`; link.click()
	} finally { exporting.value = false }
}

const exportInvoicesToCSV = () => {
	const headers = ['N° Facture', 'Date', 'Commerce', 'Email', t('admin.payments.table_amount'), t('admin.payments.table_status')]
	const rows = invoices.value.map(i => [i.invoiceNumber, formatDate(i.createdAt), i.businessName, i.businessEmail, i.amount, i.currency, getStatusLabel(i.status)])
	const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
	const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); link.download = `factures_${new Date().toISOString().split('T')[0]}.csv`; link.click()
}
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div>
			<h1 class="text-xl font-semibold text-white">{{ $t('admin.payments.title') }}</h1>
			<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.payments.description') }}</p>
		</div>

		<!-- Stats -->
		<div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div v-for="i in 4" :key="i" class="h-20 bg-[#161920] border border-white/[0.07] rounded-lg animate-pulse"></div>
		</div>
		<div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.payments.subscriptions_revenue') }}</p>
				<p class="text-2xl font-semibold text-white tabular-nums">{{ formatNumber(stats.totalRevenue) }} Dhs</p>
				<p class="text-xs text-slate-600 mt-1">{{ stats.activeCount }} actifs</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.payments.successful_payments') }}</p>
				<p class="text-2xl font-semibold text-emerald-400 tabular-nums">{{ paymentStats?.successfulPayments || 0 }}</p>
				<p class="text-xs text-slate-600 mt-1">{{ $t('admin.payments.last_30_days') }}</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.payments.failed_payments') }}</p>
				<p class="text-2xl font-semibold text-red-400 tabular-nums">{{ paymentStats?.failedPayments || 0 }}</p>
				<p class="text-xs text-slate-600 mt-1">{{ $t('admin.payments.last_30_days') }}</p>
			</div>
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
				<p class="text-xs text-slate-500 mb-1">{{ $t('admin.payments.invoices_generated') }}</p>
				<p class="text-2xl font-semibold text-white tabular-nums">{{ invoicesTotal || 0 }}</p>
				<p class="text-xs text-slate-600 mt-1">{{ $t('admin.payments.total_cumulative') }}</p>
			</div>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg w-fit">
			<button @click="activeTab = 'payments'"
				class="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors"
				:class="activeTab === 'payments' ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'">
				<Icon name="ph:credit-card-bold" size="15" />
				{{ $t('admin.payments.tab_stripe') }}
			</button>
			<button @click="activeTab = 'invoices'"
				class="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors"
				:class="activeTab === 'invoices' ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-300'">
				<Icon name="ph:receipt-bold" size="15" />
				{{ $t('admin.payments.tab_invoices') }}
			</button>
		</div>

		<!-- ===== PAYMENTS TAB ===== -->
		<div v-if="activeTab === 'payments'" class="space-y-4">
			<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
					<div>
						<h2 class="text-sm font-semibold text-white">{{ $t('admin.payments.stripe_history') }}</h2>
						<p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.payments.stripe_description') }}</p>
					</div>
					<button @click="exportToCSV" :disabled="exporting || payments.length === 0"
						class="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-medium rounded-md transition-colors disabled:opacity-50">
						<Icon v-if="exporting" name="svg-spinners:ring-resize" size="13" />
						<Icon v-else name="ph:download-simple-bold" size="13" />
						{{ $t('admin.payments.export_csv') }}
					</button>
				</div>

				<div v-if="!loading && payments.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-600">
					<Icon name="ph:credit-card-duotone" size="28" class="mb-2" />
					<p class="text-sm">{{ $t('admin.payments.no_transactions') }}</p>
				</div>

				<div v-else class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-white/[0.06]">
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.table_date') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.table_client') }}</th>
								<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.table_amount') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.table_status') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.table_refund') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.table_actions') }}</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/[0.04]">
							<tr v-for="payment in payments" :key="payment.id" class="hover:bg-white/[0.03] transition-colors">
								<td class="px-4 py-3">
									<p class="text-sm text-white">{{ formatDate(payment.created) }}</p>
									<p class="text-xs text-slate-600 font-mono mt-0.5">{{ payment.id.slice(0, 18) }}…</p>
								</td>
								<td class="px-4 py-3">
									<p class="text-sm text-white">{{ payment.customerName || '—' }}</p>
									<p class="text-xs text-slate-500">{{ payment.customerEmail || '—' }}</p>
								</td>
								<td class="px-4 py-3 text-right rtl:text-left">
									<p class="text-sm font-semibold text-white tabular-nums">{{ formatNumber(payment.amount) }} {{ payment.currency }}</p>
									<p v-if="payment.description" class="text-xs text-slate-600 truncate max-w-[160px] ml-auto rtl:ml-0 rtl:mr-auto">{{ payment.description }}</p>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="getStatusClasses(payment.status)">
										<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getStatusDot(payment.status)"></span>
										{{ getStatusLabel(payment.status) }}
									</span>
								</td>
								<td class="px-4 py-3">
									<span v-if="payment.refunded" class="text-xs text-amber-400">{{ formatNumber(payment.refundedAmount) }} {{ payment.currency }}</span>
									<span v-else class="text-slate-700">—</span>
								</td>
								<td class="px-4 py-3">
									<a v-if="payment.receiptUrl" :href="payment.receiptUrl" target="_blank"
										class="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.05] border border-white/[0.07] text-xs text-slate-300 hover:text-white hover:bg-white/[0.1] transition-colors">
										<Icon name="ph:receipt-bold" size="12" />
										{{ $t('admin.payments.receipt') }}
									</a>
									<span v-else class="text-slate-700">—</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div v-if="hasMore" class="px-4 py-3 border-t border-white/[0.06] text-center">
					<button @click="loadMorePayments" :disabled="loadingMore"
						class="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto">
						<Icon v-if="loadingMore" name="svg-spinners:ring-resize" size="13" />
						{{ $t('admin.payments.load_more') }}
					</button>
				</div>
			</div>

			<!-- Revenue breakdown -->
			<div v-if="!loading && stats.totalRevenue > 0" class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
				<div class="px-4 py-3 border-b border-white/[0.06]">
					<h3 class="text-sm font-semibold text-white">{{ $t('admin.payments.revenue_breakdown') }}</h3>
				</div>
				<div class="divide-y divide-white/[0.04]">
					<div v-for="row in [
						{ icon: 'ph:calendar-blank-bold', label: $t('admin.payments.monthly_subscriptions'), desc: $t('admin.payments.monthly_subscriptions_description'), value: stats.monthlyRevenue, count: subscriptions.filter(s => s.billingPeriod === 'monthly' && s.status === 'active').length, period: 'monthly' },
						{ icon: 'ph:calendar-check-bold', label: $t('admin.payments.annual_subscriptions'), desc: $t('admin.payments.annual_subscriptions_description'), value: stats.annualRevenue, count: subscriptions.filter(s => s.billingPeriod === 'annual' && s.status === 'active').length, period: 'annual' },
						{ icon: 'ph:infinity-bold', label: $t('admin.payments.lifetime_subscriptions'), desc: $t('admin.payments.lifetime_subscriptions_description'), value: stats.lifetimeRevenue, count: subscriptions.filter(s => s.billingPeriod === 'lifetime' && s.status === 'active').length, period: 'lifetime' },
					]" :key="row.period" class="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
						<div class="flex items-center gap-3">
							<Icon :name="row.icon" size="16" class="text-slate-500 shrink-0" />
							<div>
								<p class="text-sm font-medium text-white">{{ row.label }}</p>
								<p class="text-xs text-slate-500">{{ row.desc }}</p>
							</div>
						</div>
						<div class="text-right rtl:text-left">
							<p class="text-sm font-semibold text-white tabular-nums">{{ formatNumber(row.value) }} Dhs</p>
							<p class="text-xs text-slate-600">{{ $t(`admin.payments.${row.period}_subscriptions_active`, { count: row.count }) }}</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ===== INVOICES TAB ===== -->
		<div v-if="activeTab === 'invoices'" class="space-y-4">
			<!-- Filters -->
			<div class="flex flex-col lg:flex-row gap-3">
				<div class="relative flex-1">
					<Icon name="ph:magnifying-glass-bold" size="15" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
					<input v-model="invoiceSearch" type="text" :placeholder="$t('admin.payments.filters_search')"
						class="w-full pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
				</div>
				<select v-model="invoiceStatusFilter"
					class="px-3 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors appearance-none">
					<option value="" class="bg-[#161920]">{{ $t('admin.payments.filters_all_status') }}</option>
					<option value="paid" class="bg-[#161920]">{{ $t('admin.payments.filters_paid') }}</option>
					<option value="refunded" class="bg-[#161920]">{{ $t('admin.payments.filters_refunded') }}</option>
					<option value="partial_refund" class="bg-[#161920]">{{ $t('admin.payments.filters_partial_refund') }}</option>
				</select>
				<input v-model="invoiceDateFrom" type="date" class="px-3 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
				<input v-model="invoiceDateTo" type="date" class="px-3 py-2 bg-[#161920] border border-white/[0.07] rounded-md text-sm text-white focus:border-white/20 focus:outline-none transition-colors" />
				<button v-if="hasActiveFilters" @click="clearInvoiceFilters" class="px-2 py-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors">
					<Icon name="ph:x-bold" size="14" />
				</button>
			</div>

			<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
					<div>
						<h2 class="text-sm font-semibold text-white">{{ $t('admin.payments.invoices_title') }}</h2>
						<p class="text-xs text-slate-500 mt-0.5">
							<span v-if="hasActiveFilters">{{ $t('admin.payments.filters_results', { count: invoicesTotal }) }}</span>
							<span v-else>{{ $t('admin.payments.invoices_description') }}</span>
						</p>
					</div>
					<div class="flex gap-2">
						<button v-if="selectedInvoices.length > 0" @click="downloadSelectedInvoices"
							class="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium rounded-md hover:bg-brand-500/20 transition-colors">
							<Icon name="ph:download-simple-bold" size="13" />
							{{ $t('admin.payments.invoices_download', { count: selectedInvoices.length }) }}
						</button>
						<button @click="exportInvoicesToCSV" :disabled="invoices.length === 0"
							class="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-medium rounded-md transition-colors disabled:opacity-50">
							<Icon name="ph:file-csv-bold" size="13" />
							{{ $t('admin.payments.invoices_export') }}
						</button>
					</div>
				</div>

				<div v-if="loadingInvoices && invoices.length === 0" class="flex items-center justify-center py-10 text-slate-600">
					<Icon name="svg-spinners:ring-resize" size="28" />
				</div>
				<div v-else-if="!loadingInvoices && invoices.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-600">
					<Icon name="ph:receipt-duotone" size="28" class="mb-2" />
					<p class="text-sm">{{ hasActiveFilters ? $t('admin.payments.invoices_no_results') : $t('admin.payments.invoices_no_invoices') }}</p>
					<button v-if="hasActiveFilters" @click="clearInvoiceFilters" class="mt-3 text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
						{{ $t('admin.payments.filters_clear') }}
					</button>
				</div>

				<div v-else class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-white/[0.06]">
								<th class="px-4 py-3 w-10">
									<input type="checkbox" :checked="selectedInvoices.length === invoices.length && invoices.length > 0"
										@change="selectAllInvoices" class="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-brand-500 cursor-pointer" />
								</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.invoices_table_number') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.invoices_table_date') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.invoices_table_business') }}</th>
								<th class="px-4 py-3 text-right rtl:text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.invoices_table_amount') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.invoices_table_status') }}</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.payments.invoices_table_sent') }}</th>
								<th class="px-4 py-3"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/[0.04]">
							<tr v-for="invoice in invoices" :key="invoice.id" class="hover:bg-white/[0.03] transition-colors group">
								<td class="px-4 py-3">
									<input type="checkbox" :checked="selectedInvoices.includes(invoice.id)" @change="toggleInvoiceSelection(invoice.id)" class="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-brand-500 cursor-pointer" />
								</td>
								<td class="px-4 py-3 font-mono text-sm font-medium text-white">{{ invoice.invoiceNumber }}</td>
								<td class="px-4 py-3 text-sm text-slate-400">{{ formatDate(invoice.createdAt) }}</td>
								<td class="px-4 py-3">
									<p class="text-sm text-white">{{ invoice.businessName }}</p>
									<p class="text-xs text-slate-500">{{ invoice.businessEmail }}</p>
								</td>
								<td class="px-4 py-3 text-right rtl:text-left text-sm font-semibold text-white tabular-nums">{{ formatNumber(Number(invoice.amount)) }} {{ invoice.currency }}</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="getStatusClasses(invoice.status)">
										<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getStatusDot(invoice.status)"></span>
										{{ getStatusLabel(invoice.status) }}
									</span>
								</td>
								<td class="px-4 py-3">
									<div class="flex gap-1">
										<span v-if="invoice.sentToMerchant" class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">{{ $t('admin.payments.invoices_sent_client') }}</span>
										<span v-if="invoice.sentToAdmin" class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">{{ $t('admin.payments.invoices_sent_admin') }}</span>
										<span v-if="!invoice.sentToMerchant && !invoice.sentToAdmin" class="text-slate-700">—</span>
									</div>
								</td>
								<td class="px-4 py-3 text-right rtl:text-left">
									<div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button v-if="invoice.status !== 'paid'" @click="markInvoiceAsPaid(invoice)" class="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors" :title="$t('admin.payments.invoices_mark_paid')">
											<Icon name="ph:check-circle-bold" size="14" />
										</button>
										<button v-if="invoice.status === 'paid'" @click="updateInvoiceStatus(invoice, 'refunded')" class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" :title="$t('admin.payments.invoices_mark_refunded')">
											<Icon name="ph:arrow-counter-clockwise-bold" size="14" />
										</button>
										<button @click="downloadInvoice(invoice.id)" class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors" :title="$t('admin.payments.invoices_download_pdf')">
											<Icon name="ph:download-simple-bold" size="14" />
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div v-if="invoicesHasMore" class="px-4 py-3 border-t border-white/[0.06] text-center">
					<button @click="loadMoreInvoices" :disabled="loadingInvoices"
						class="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto">
						<Icon v-if="loadingInvoices" name="svg-spinners:ring-resize" size="13" />
						{{ $t('admin.payments.load_more') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
