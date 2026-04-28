<script setup lang="ts">
import type { Order } from '~/composables/useOrders'

definePageMeta({
	layout: 'admin',
	middleware: ['auth', 'admin']
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const { orders, stats, loading, fetchOrders, fetchStats, updateOrderStatus: updateStatus, getStatusLabel, getStatusColor, getPaymentStatusLabel, getPaymentStatusColor, downloadPdf, downloadBulkForPrinting, downloadOrderForPrinting } = useOrders()
const { show: showToast } = useToast()

const showDetailsModal = ref(false)
const selectedOrder = ref<Order | null>(null)
const filterStatus = ref<string>('all')
const searchQuery = ref('')

const selectedOrders = ref<Set<string>>(new Set())
const selectAll = ref(false)

const editingStatusId = ref<string | null>(null)
const updatingStatusId = ref<string | null>(null)
const dropdownPosition = ref({ top: 0, left: 0 })

onMounted(async () => {
	await Promise.all([fetchOrders(), fetchStats()])
	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement
		if (!target.closest('.status-dropdown')) {
			editingStatusId.value = null
		}
	})
})

onUnmounted(() => {
	document.removeEventListener('click', () => { })
})

const filteredOrders = computed(() => {
	let filtered = orders.value
	if (filterStatus.value !== 'all') {
		filtered = filtered.filter(order => order.status === filterStatus.value)
	}
	if (searchQuery.value) {
		const query = searchQuery.value.toLowerCase()
		filtered = filtered.filter(order =>
			order.orderNumber.toLowerCase().includes(query) ||
			order.business?.name.toLowerCase().includes(query) ||
			order.productType.toLowerCase().includes(query) ||
			order.contactName.toLowerCase().includes(query)
		)
	}
	return filtered
})

const isUrgent = (order: Order) => {
	if (order.status !== 'pending') return false
	const hoursDiff = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60)
	return hoursDiff > 24
}

const getDaysSinceCreation = (order: Order) => {
	return Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

const toggleSelectAll = () => {
	if (selectAll.value) {
		selectedOrders.value = new Set()
		selectAll.value = false
	} else {
		selectedOrders.value = new Set(filteredOrders.value.map(o => o.id))
		selectAll.value = true
	}
}

const toggleSelection = (orderId: string) => {
	if (selectedOrders.value.has(orderId)) {
		selectedOrders.value.delete(orderId)
	} else {
		selectedOrders.value.add(orderId)
	}
	selectedOrders.value = new Set(selectedOrders.value)
	selectAll.value = selectedOrders.value.size === filteredOrders.value.length
}

watch([filterStatus, searchQuery], () => {
	selectedOrders.value = new Set()
	selectAll.value = false
})

const openStatusDropdown = (orderId: string, event: MouseEvent) => {
	const button = event.currentTarget as HTMLElement
	const rect = button.getBoundingClientRect()
	dropdownPosition.value = { top: rect.bottom + 4, left: rect.left }
	editingStatusId.value = editingStatusId.value === orderId ? null : orderId
}

const handleInlineStatusChange = async (order: Order, newStatus: string) => {
	if (newStatus === order.status) { editingStatusId.value = null; return }
	updatingStatusId.value = order.id
	try {
		await updateStatus(order.id, { status: newStatus as any })
	} catch {
		showToast('Erreur lors de la mise à jour', 'error')
	} finally {
		updatingStatusId.value = null
		editingStatusId.value = null
	}
}

const bulkUpdating = ref(false)
const bulkUpdateStatus = async (newStatus: string) => {
	if (selectedOrders.value.size === 0) return
	bulkUpdating.value = true
	let successCount = 0, errorCount = 0
	for (const orderId of selectedOrders.value) {
		try { await updateStatus(orderId, { status: newStatus as any }); successCount++ }
		catch { errorCount++ }
	}
	await Promise.all([fetchOrders(), fetchStats()])
	if (errorCount === 0) showToast(`${successCount} commande(s) mise(s) à jour`, 'success')
	else showToast(`${successCount} succès, ${errorCount} erreur(s)`, 'error')
	selectedOrders.value = new Set()
	selectAll.value = false
	bulkUpdating.value = false
}

const viewOrderDetails = (order: Order) => {
	selectedOrder.value = order
	showDetailsModal.value = true
}

const handleDownloadPdf = (order: Order) => downloadPdf(order.id, order.orderNumber)

const bulkDownloading = ref(false)
const handleBulkDownloadForPrinting = async () => {
	if (selectedOrders.value.size === 0) return
	bulkDownloading.value = true
	try { await downloadBulkForPrinting(Array.from(selectedOrders.value), { includeBonCommande: true, includeFlyers: true }) }
	finally { bulkDownloading.value = false }
}

const downloadingProcessing = ref(false)
const handleDownloadProcessingOrders = async () => {
	const processingOrders = orders.value.filter(o => o.status === 'processing')
	if (processingOrders.length === 0) { showToast('Aucune commande "En cours" à télécharger', 'info'); return }
	downloadingProcessing.value = true
	try { await downloadBulkForPrinting(processingOrders.map(o => o.id), { includeBonCommande: true, includeFlyers: true }) }
	finally { downloadingProcessing.value = false }
}

const handleDownloadOrderForPrinting = async (order: Order) => await downloadOrderForPrinting(order)

const statusFilters = computed(() => [
	{ value: 'all', label: t('admin.orders.filter_all'), count: computed(() => stats.value.total), color: null },
	{ value: 'pending', label: t('admin.orders.filter_pending'), count: computed(() => stats.value.pending), color: 'yellow' },
	{ value: 'processing', label: t('admin.orders.filter_processing'), count: computed(() => stats.value.processing), color: 'blue' },
	{ value: 'shipped', label: t('admin.orders.filter_shipped'), count: computed(() => stats.value.shipped), color: 'purple' },
	{ value: 'delivered', label: t('admin.orders.filter_delivered'), count: computed(() => stats.value.delivered), color: 'green' },
	{ value: 'cancelled', label: t('admin.orders.filter_cancelled'), count: computed(() => stats.value.cancelled), color: 'red' },
])

const statusOptions = computed(() => [
	{ value: 'pending', label: t('admin.orders.status_pending'), icon: 'ph:clock-bold', color: 'yellow' },
	{ value: 'processing', label: t('admin.orders.status_processing'), icon: 'ph:gear-bold', color: 'blue' },
	{ value: 'shipped', label: t('admin.orders.status_shipped'), icon: 'ph:truck-bold', color: 'purple' },
	{ value: 'delivered', label: t('admin.orders.status_delivered'), icon: 'ph:check-circle-bold', color: 'green' },
	{ value: 'cancelled', label: t('admin.orders.status_cancelled'), icon: 'ph:x-circle-bold', color: 'red' },
])

const getStatusClasses = (status: string) => {
	switch (getStatusColor(status)) {
		case 'yellow': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
		case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
		case 'purple': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
		case 'green': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
		case 'red': return 'bg-red-500/10 text-red-400 border-red-500/20'
		default: return 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
	}
}

const getNextStatus = (currentStatus: string) => {
	const flow: Record<string, string> = { pending: 'processing', processing: 'shipped', shipped: 'delivered' }
	return flow[currentStatus] || null
}

const getNextStatusLabel = (currentStatus: string): string | null => {
	const next = getNextStatus(currentStatus)
	return next ? (statusOptions.value.find(s => s.value === next)?.label ?? null) : null
}
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.orders.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.orders.total_count', { count: stats.total }) }}</p>
			</div>
			<div class="flex items-center gap-2">
				<span v-if="stats.pending > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
					<span class="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
					{{ $t('admin.orders.pending', { count: stats.pending }) }}
				</span>
				<span v-if="stats.processing > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
					<span class="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
					{{ $t('admin.orders.processing', { count: stats.processing }) }}
				</span>
			</div>
		</div>

		<!-- Print action banner -->
		<div v-if="stats.processing > 0" class="bg-[#161920] border border-blue-500/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="w-9 h-9 bg-blue-500/10 rounded-md flex items-center justify-center shrink-0">
					<Icon name="ph:printer-bold" size="18" class="text-blue-400" />
				</div>
				<div>
					<p class="text-sm font-medium text-white">{{ $t('admin.orders.print_ready_title') }}</p>
					<p class="text-xs text-slate-500">{{ $t('admin.orders.print_ready_description', { count: stats.processing }) }}</p>
				</div>
			</div>
			<button @click="handleDownloadProcessingOrders" :disabled="downloadingProcessing"
				class="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-medium rounded-md transition-colors disabled:opacity-50 shrink-0">
				<Icon v-if="downloadingProcessing" name="svg-spinners:ring-resize" size="15" />
				<Icon v-else name="ph:download-simple-bold" size="15" />
				{{ $t('admin.orders.download_for_printing') }}
			</button>
		</div>

		<!-- Search & Filters -->
		<div class="flex flex-col sm:flex-row gap-3">
			<div class="relative flex-1">
				<Icon name="ph:magnifying-glass" size="16" class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
				<input v-model="searchQuery" type="text" :placeholder="$t('admin.orders.search_placeholder')"
					class="w-full bg-[#161920] border border-white/[0.07] rounded-md pl-9 rtl:pl-3 pr-3 rtl:pr-9 py-2 text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
			</div>
			<div class="flex gap-1.5 overflow-x-auto no-scrollbar">
				<button v-for="filter in statusFilters" :key="filter.value" @click="filterStatus = filter.value"
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap border"
					:class="filterStatus === filter.value
						? 'bg-white text-slate-900 border-white'
						: 'bg-[#161920] text-slate-400 border-white/[0.07] hover:text-slate-200 hover:border-white/[0.14]'">
					<span v-if="filter.color === 'yellow'" class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
					<span v-else-if="filter.color === 'blue'" class="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
					<span v-else-if="filter.color === 'purple'" class="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
					<span v-else-if="filter.color === 'green'" class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
					<span v-else-if="filter.color === 'red'" class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
					{{ filter.label }}
					<span class="tabular-nums" :class="filterStatus === filter.value ? 'text-slate-600' : 'text-slate-600'">{{ filter.count }}</span>
				</button>
			</div>
		</div>

		<!-- Bulk Actions -->
		<Transition
			enter-active-class="transition-all duration-200"
			enter-from-class="opacity-0 -translate-y-2"
			enter-to-class="opacity-100 translate-y-0"
			leave-active-class="transition-all duration-150"
			leave-from-class="opacity-100 translate-y-0"
			leave-to-class="opacity-0 -translate-y-2">
			<div v-if="selectedOrders.size > 0" class="bg-[#161920] border border-white/[0.1] rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<span class="text-sm text-slate-300 font-medium">
					{{ $t('admin.orders.bulk_selected', { count: selectedOrders.size }) }}
				</span>
				<div class="flex items-center gap-2">
					<button @click="handleBulkDownloadForPrinting" :disabled="bulkDownloading"
						class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-md text-xs font-medium transition-colors disabled:opacity-50">
						<Icon v-if="bulkDownloading" name="svg-spinners:ring-resize" size="13" />
						<Icon v-else name="ph:printer-bold" size="13" />
						{{ $t('admin.orders.bulk_download_printing') }}
					</button>
					<div class="w-px h-4 bg-white/[0.08]"></div>
					<span class="text-xs text-slate-600">{{ $t('admin.orders.bulk_status_label') }}</span>
					<button v-for="option in statusOptions.filter(o => o.value !== 'cancelled')" :key="option.value"
						@click="bulkUpdateStatus(option.value)" :disabled="bulkUpdating"
						class="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
						:title="option.label">
						<Icon :name="option.icon" size="15" />
					</button>
					<button @click="bulkUpdateStatus('cancelled')" :disabled="bulkUpdating"
						class="p-1.5 rounded text-red-500 hover:bg-red-500/10 transition-colors"
						:title="$t('admin.orders.status_cancelled')">
						<Icon name="ph:x-circle-bold" size="15" />
					</button>
					<button @click="selectedOrders = new Set(); selectAll = false"
						class="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors">
						<Icon name="ph:x-bold" size="14" />
					</button>
				</div>
			</div>
		</Transition>

		<!-- Table -->
		<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
			<!-- Loading -->
			<div v-if="loading" class="flex items-center justify-center py-16 text-slate-600">
				<Icon name="svg-spinners:ring-resize" size="28" />
			</div>

			<!-- Empty -->
			<div v-else-if="filteredOrders.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-600">
				<Icon name="ph:package-duotone" size="32" class="mb-2" />
				<p class="text-sm">{{ searchQuery ? $t('admin.orders.no_results') : $t('admin.orders.no_results_status') }}</p>
			</div>

			<div v-else class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-white/[0.06]">
							<th class="px-4 py-3 w-10">
								<input type="checkbox" :checked="selectAll" @change="toggleSelectAll"
									class="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-brand-500 cursor-pointer" />
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.orders.table_header_order') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.orders.table_header_client') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.orders.table_header_product') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.orders.table_header_status') }}</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-slate-500">{{ $t('admin.orders.table_header_total') }}</th>
							<th class="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/[0.04]">
						<tr v-for="order in filteredOrders" :key="order.id"
							class="hover:bg-white/[0.03] transition-colors group"
							:class="[
								selectedOrders.has(order.id) ? 'bg-white/[0.03]' : '',
								isUrgent(order) ? 'border-l-2 border-l-amber-500' : ''
							]">

							<td class="px-4 py-3">
								<input type="checkbox" :checked="selectedOrders.has(order.id)"
									@change="toggleSelection(order.id)"
									class="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-brand-500 cursor-pointer" />
							</td>

							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium text-white">#{{ order.orderNumber }}</span>
									<span v-if="isUrgent(order)" class="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium rounded">
										{{ $t('admin.orders.urgent') }}
									</span>
								</div>
								<p class="text-xs text-slate-500 mt-0.5">
									{{ formatDate(order.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
									<span v-if="getDaysSinceCreation(order) > 0"> · {{ $t('admin.orders.days_since', { days: getDaysSinceCreation(order) }) }}</span>
								</p>
							</td>

							<td class="px-4 py-3">
								<p class="text-sm text-white">{{ order.business?.name }}</p>
								<p class="text-xs text-slate-500">{{ order.contactName }}</p>
							</td>

							<td class="px-4 py-3">
								<p class="text-sm text-slate-300">{{ order.quantity }}x {{ order.productType }}</p>
								<span v-if="order.dimensions" class="text-xs text-slate-500">{{ order.dimensions }}</span>
							</td>

							<td class="px-4 py-3">
								<div class="relative status-dropdown">
									<div v-if="updatingStatusId === order.id" class="flex items-center gap-1.5 text-xs text-slate-500">
										<Icon name="svg-spinners:ring-resize" size="13" />
									</div>
									<button v-else @click="openStatusDropdown(order.id, $event)"
										class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-colors hover:opacity-80"
										:class="getStatusClasses(order.status)">
										{{ getStatusLabel(order.status) }}
										<Icon name="ph:caret-down-bold" size="9" class="opacity-50" />
									</button>
								</div>
							</td>

							<td class="px-4 py-3">
								<p v-if="order.totalPrice" class="text-sm font-medium text-white">
									{{ Number(order.totalPrice).toFixed(0) }} {{ order.currency || 'MAD' }}
								</p>
								<p class="text-xs" :class="{
									'text-emerald-400': order.paymentStatus === 'paid',
									'text-rose-400': order.paymentStatus === 'refunded',
									'text-orange-400': order.paymentStatus === 'pending',
									'text-slate-500': !['paid','refunded','pending'].includes(order.paymentStatus || ''),
								}">
									{{ getPaymentStatusLabel(order.paymentStatus) }}
								</p>
							</td>

							<td class="px-4 py-3 text-right rtl:text-left">
								<div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button v-if="getNextStatus(order.status)"
										@click="handleInlineStatusChange(order, getNextStatus(order.status)!)"
										:disabled="updatingStatusId === order.id"
										class="px-2 py-1 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.14] text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
										:title="`→ ${getNextStatusLabel(order.status)}`">
										<Icon name="ph:arrow-right-bold" size="11" class="rtl:rotate-180" />
										<span class="hidden xl:inline">{{ getNextStatusLabel(order.status) }}</span>
									</button>
									<button @click="handleDownloadOrderForPrinting(order)"
										class="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
										:title="$t('admin.orders.download_printing_title')">
										<Icon name="ph:printer-bold" size="14" />
									</button>
									<button @click="viewOrderDetails(order)"
										class="p-1.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
										:title="$t('admin.orders.download_details_title')">
										<Icon name="ph:eye-bold" size="14" />
									</button>
									<button @click="handleDownloadPdf(order)"
										class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
										:title="$t('admin.orders.download_pdf_title')">
										<Icon name="ph:file-pdf-bold" size="14" />
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Order Details Modal -->
		<OrdersOrderDetailsModal v-model="showDetailsModal" :order="selectedOrder" />

		<!-- Status Dropdown -->
		<Teleport to="body">
			<Transition
				enter-active-class="transition ease-out duration-100"
				enter-from-class="opacity-0 scale-95"
				enter-to-class="opacity-100 scale-100"
				leave-active-class="transition ease-in duration-75"
				leave-from-class="opacity-100 scale-100"
				leave-to-class="opacity-0 scale-95">
				<div v-if="editingStatusId"
					:style="{ position: 'fixed', top: dropdownPosition.top + 'px', left: dropdownPosition.left + 'px' }"
					class="z-[9999] w-44 bg-[#1a1f2a] border border-white/[0.1] rounded-lg shadow-xl py-1">
					<button v-for="option in statusOptions" :key="option.value"
						@click="handleInlineStatusChange(filteredOrders.find(o => o.id === editingStatusId)!, option.value)"
						class="w-full px-3 py-2 text-left rtl:text-right text-xs font-medium flex items-center gap-2 transition-colors"
						:class="filteredOrders.find(o => o.id === editingStatusId)?.status === option.value
							? 'bg-white/[0.08] text-white'
							: 'text-slate-400 hover:bg-white/[0.05] hover:text-white'">
						<Icon :name="option.icon" size="13" />
						{{ option.label }}
						<Icon v-if="filteredOrders.find(o => o.id === editingStatusId)?.status === option.value"
							name="ph:check-bold" size="11" class="ml-auto rtl:ml-0 rtl:mr-auto text-emerald-400" />
					</button>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
