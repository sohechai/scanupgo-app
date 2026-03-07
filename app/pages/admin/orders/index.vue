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

// Selection for bulk actions
const selectedOrders = ref<Set<string>>(new Set())
const selectAll = ref(false)

// Inline status editing
const editingStatusId = ref<string | null>(null)
const updatingStatusId = ref<string | null>(null)
const dropdownPosition = ref({ top: 0, left: 0 })

onMounted(async () => {
	await Promise.all([fetchOrders(), fetchStats()])

	// Close dropdown when clicking outside
	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement
		if (!target.closest('.status-dropdown')) {
			editingStatusId.value = null
		}
	})
})

onUnmounted(() => {
	// Clean up event listener
	document.removeEventListener('click', () => { })
})

const filteredOrders = computed(() => {
	let filtered = orders.value

	// Filter by status
	if (filterStatus.value !== 'all') {
		filtered = filtered.filter(order => order.status === filterStatus.value)
	}

	// Filter by search query
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

// Check if order is urgent (pending for more than 24h)
const isUrgent = (order: Order) => {
	if (order.status !== 'pending') return false
	const createdAt = new Date(order.createdAt)
	const now = new Date()
	const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
	return hoursDiff > 24
}

// Get days since order creation
const getDaysSinceCreation = (order: Order) => {
	const createdAt = new Date(order.createdAt)
	const now = new Date()
	return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
}

// Handle select all
const toggleSelectAll = () => {
	if (selectAll.value) {
		selectedOrders.value = new Set()
		selectAll.value = false
	} else {
		selectedOrders.value = new Set(filteredOrders.value.map(o => o.id))
		selectAll.value = true
	}
}

// Handle individual selection
const toggleSelection = (orderId: string) => {
	if (selectedOrders.value.has(orderId)) {
		selectedOrders.value.delete(orderId)
	} else {
		selectedOrders.value.add(orderId)
	}
	// Force reactivity
	selectedOrders.value = new Set(selectedOrders.value)
	selectAll.value = selectedOrders.value.size === filteredOrders.value.length
}

// Clear selection when filters change
watch([filterStatus, searchQuery], () => {
	selectedOrders.value = new Set()
	selectAll.value = false
})

// Inline status update
const openStatusDropdown = (orderId: string, event: MouseEvent) => {
	const button = event.currentTarget as HTMLElement
	const rect = button.getBoundingClientRect()
	// Use viewport coordinates for fixed positioning
	dropdownPosition.value = {
		top: rect.bottom + 4,
		left: rect.left
	}
	editingStatusId.value = editingStatusId.value === orderId ? null : orderId
}

const startEditingStatus = (orderId: string) => {
	editingStatusId.value = orderId
}

const cancelEditingStatus = () => {
	editingStatusId.value = null
}

const handleInlineStatusChange = async (order: Order, newStatus: string) => {
	if (newStatus === order.status) {
		editingStatusId.value = null
		return
	}

	updatingStatusId.value = order.id
	try {
		await updateStatus(order.id, { status: newStatus as any })
	} catch (error) {
		showToast('Erreur lors de la mise à jour', 'error')
	} finally {
		updatingStatusId.value = null
		editingStatusId.value = null
	}
}

// Bulk actions
const bulkUpdating = ref(false)

const bulkUpdateStatus = async (newStatus: string) => {
	if (selectedOrders.value.size === 0) return

	bulkUpdating.value = true
	let successCount = 0
	let errorCount = 0

	for (const orderId of selectedOrders.value) {
		try {
			await updateStatus(orderId, { status: newStatus as any })
			successCount++
		} catch {
			errorCount++
		}
	}

	await Promise.all([fetchOrders(), fetchStats()])

	if (errorCount === 0) {
		showToast(`${successCount} commande(s) mise(s) à jour`, 'success')
	} else {
		showToast(`${successCount} succès, ${errorCount} erreur(s)`, 'error')
	}

	selectedOrders.value = new Set()
	selectAll.value = false
	bulkUpdating.value = false
}

const viewOrderDetails = (order: Order) => {
	selectedOrder.value = order
	showDetailsModal.value = true
}

const handleDownloadPdf = (order: Order) => {
	downloadPdf(order.id, order.orderNumber)
}

// Bulk download for printing
const bulkDownloading = ref(false)
const bulkDownloadOptions = ref({ includeBonCommande: true, includeFlyers: true })

const handleBulkDownloadForPrinting = async () => {
	if (selectedOrders.value.size === 0) return

	bulkDownloading.value = true
	try {
		await downloadBulkForPrinting(
			Array.from(selectedOrders.value),
			bulkDownloadOptions.value
		)
	} finally {
		bulkDownloading.value = false
	}
}

// Quick download all "processing" orders
const downloadingProcessing = ref(false)
const handleDownloadProcessingOrders = async () => {
	const processingOrders = orders.value.filter(o => o.status === 'processing')
	if (processingOrders.length === 0) {
		showToast('Aucune commande "En cours" à télécharger', 'info')
		return
	}

	downloadingProcessing.value = true
	try {
		await downloadBulkForPrinting(
			processingOrders.map(o => o.id),
			{ includeBonCommande: true, includeFlyers: true }
		)
	} finally {
		downloadingProcessing.value = false
	}
}

// Single order download for printing
const handleDownloadOrderForPrinting = async (order: Order) => {
	await downloadOrderForPrinting(order)
}

const statusFilters = computed(() => [
	{ value: 'all', label: t('admin.orders.filter_all'), count: computed(() => stats.value.total) },
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
	const color = getStatusColor(status)
	switch (color) {
		case 'yellow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
		case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
		case 'purple': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
		case 'green': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
		case 'red': return 'bg-red-500/10 text-red-400 border-red-500/20'
		default: return 'bg-white/5 text-slate-400 border-white/5'
	}
}

const getPaymentStatusClasses = (status: string) => {
	const color = getPaymentStatusColor(status)
	switch (color) {
		case 'green': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
		case 'yellow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
		case 'red': return 'bg-red-500/10 text-red-400 border-red-500/20'
		default: return 'bg-white/5 text-slate-400 border-white/5'
	}
}

// Next logical status for quick action
const getNextStatus = (currentStatus: string) => {
	const flow: Record<string, string> = {
		pending: 'processing',
		processing: 'shipped',
		shipped: 'delivered',
	}
	return flow[currentStatus] || null
}

const getNextStatusLabel = (currentStatus: string): string | null => {
	const next = getNextStatus(currentStatus)
	if (!next) return null
	const option = statusOptions.value.find(s => s.value === next)
	return option ? option.label : null
}
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen animate-pulse-slow">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen animate-pulse-slow"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.orders.title') }}</h1>
					<p class="text-slate-400 text-lg">
						{{ $t('admin.orders.total_count', { count: stats.total }) }}
					</p>
				</div>

				<!-- Quick Stats Pills -->
				<div class="flex items-center gap-2 flex-wrap">
					<div v-if="stats.pending > 0"
						class="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold shadow-lg shadow-yellow-500/5">
						<span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
						{{ $t('admin.orders.pending', { count: stats.pending }) }}
					</div>
					<div v-if="stats.processing > 0"
						class="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold shadow-lg shadow-blue-500/5">
						{{ $t('admin.orders.processing', { count: stats.processing }) }}
					</div>
				</div>
			</div>

			<!-- Imprimerie Quick Action Card -->
			<div v-if="stats.processing > 0"
				class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-blue-500/10 relative overflow-hidden group">
				<div
					class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all duration-700">
				</div>

				<div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
					<div class="flex items-center gap-5">
						<div
							class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner border border-white/20">
							<Icon name="ph:printer-bold" size="28" class="text-white" />
						</div>
						<div>
							<h3 class="font-bold text-xl text-white mb-1">{{ $t('admin.orders.print_ready_title') }}</h3>
							<p class="text-blue-100">{{ $t('admin.orders.print_ready_description', { count: stats.processing }) }}</p>
						</div>
					</div>
					<button @click="handleDownloadProcessingOrders" :disabled="downloadingProcessing"
						class="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2 shadow-lg disabled:opacity-70 group/btn">
						<Icon v-if="downloadingProcessing" name="svg-spinners:ring-resize" size="20" />
						<Icon v-else name="ph:download-simple-bold" size="20"
							class="group-hover/btn:-translate-y-0.5 transition-transform" />
						<span>{{ $t('admin.orders.download_for_printing') }}</span>
					</button>
				</div>
				<p class="text-xs text-blue-200 mt-4 flex items-center gap-2 relative">
					<Icon name="ph:info-bold" size="14" />
					{{ $t('admin.orders.print_description') }}
				</p>
			</div>

			<!-- Search & Filters Bar -->
			<div class="flex flex-col gap-4">
				<div class="flex flex-col lg:flex-row gap-4">
					<!-- Search -->
					<div class="flex-1 relative">
						<Icon name="ph:magnifying-glass" size="20"
							class="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-500" />
						<input v-model="searchQuery" type="text" :placeholder="$t('admin.orders.search_placeholder')"
							class="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl pl-10 rtl:pl-4 pr-4 rtl:pr-10 py-3 text-white placeholder-slate-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all shadow-lg shadow-black/5 hover:bg-white/10" />
					</div>

					<!-- Status Filter Pills -->
					<div class="flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
						<button v-for="filter in statusFilters" :key="filter.value" @click="filterStatus = filter.value"
							:class="[
								'px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 border',
								filterStatus === filter.value
									? 'bg-white text-slate-900 border-white shadow-lg shadow-white/10'
									: 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
							]">
							<span v-if="filter.color === 'yellow'"
								class="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>
							<span v-else-if="filter.color === 'blue'"
								class="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
							<span v-else-if="filter.color === 'purple'"
								class="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
							<span v-else-if="filter.color === 'green'"
								class="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
							<span v-else-if="filter.color === 'red'"
								class="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
							{{ filter.label }}
							<span class="px-1.5 py-0.5 rounded-md bg-white/10 text-xs"
								:class="filterStatus === filter.value ? 'bg-slate-200 text-slate-900' : ''">{{
									filter.count }}</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Bulk Actions Bar -->
			<Transition enter-active-class="transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
				enter-from-class="opacity-0 -translate-y-4 scale-95"
				enter-to-class="opacity-100 translate-y-0 scale-100"
				leave-active-class="transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)"
				leave-from-class="opacity-100 translate-y-0 scale-100"
				leave-to-class="opacity-0 -translate-y-4 scale-95">
				<div v-if="selectedOrders.size > 0"
					class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl shadow-black/20">
					<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
						<div class="flex items-center gap-3">
							<div
								class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
								<span class="text-lg font-bold text-white">{{ selectedOrders.size }}</span>
							</div>
							<span class="text-sm font-medium text-slate-300">{{ $t('admin.orders.bulk_selected', { count: selectedOrders.size }) }}</span>
						</div>

						<div class="flex flex-wrap items-center gap-2">
							<!-- Download for printing button -->
							<button @click="handleBulkDownloadForPrinting" :disabled="bulkDownloading"
								class="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-50 shadow-lg shadow-emerald-500/20">
								<Icon v-if="bulkDownloading" name="svg-spinners:ring-resize" size="16" />
								<Icon v-else name="ph:printer-bold" size="16" />
								<span class="hidden sm:inline">{{ $t('admin.orders.bulk_download_printing') }}</span>
								<span class="sm:hidden">{{ $t('admin.orders.bulk_download_printing_short') }}</span>
							</button>

							<div class="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

							<!-- Status change buttons -->
							<span class="text-xs text-slate-400 mr-1 hidden lg:inline">{{ $t('admin.orders.bulk_status_label') }}</span>
							<button v-for="option in statusOptions.filter(o => o.value !== 'cancelled')"
								:key="option.value" @click="bulkUpdateStatus(option.value)" :disabled="bulkUpdating"
								class="p-2 rounded-lg transition-all hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-50 border border-transparent hover:border-white/10"
								:title="option.label">
								<Icon :name="option.icon" size="18" />
							</button>
							<div class="w-px h-6 bg-white/10 mx-1"></div>
							<button @click="bulkUpdateStatus('cancelled')" :disabled="bulkUpdating"
								class="p-2 rounded-lg transition-all hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-transparent hover:border-red-500/20"
								:title="$t('admin.orders.status_cancelled')">
								<Icon name="ph:x-circle-bold" size="18" />
							</button>
							<button @click="selectedOrders = new Set(); selectAll = false"
								class="ml-2 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
								:title="$t('admin.orders.bulk_deselect')">
								<Icon name="ph:x-bold" size="18" />
							</button>
						</div>
					</div>
				</div>
			</Transition>

			<!-- Orders Table -->
			<div
				class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
				<!-- Loading State -->
				<div v-if="loading" class="py-24 flex flex-col items-center justify-center gap-4">
					<Icon name="svg-spinners:ring-resize" size="40" class="text-white/50" />
					<p class="text-sm font-bold text-slate-400">{{ $t('admin.orders.loading') }}</p>
				</div>

				<!-- Empty State -->
				<div v-else-if="filteredOrders.length === 0"
					class="py-24 flex flex-col items-center justify-center text-center px-4">
					<Icon name="ph:package-duotone" size="64" class="mb-4 text-slate-600" />
					<h3 class="text-lg font-bold text-white mb-2">{{ $t('admin.orders.no_orders') }}</h3>
					<p class="text-slate-400 max-w-xs">
						{{ searchQuery ? $t('admin.orders.no_results') : $t('admin.orders.no_results_status') }}
					</p>
				</div>

				<!-- Orders Table -->
				<div v-else class="overflow-x-auto overflow-y-visible">
					<table class="w-full">
						<thead class="bg-white/5 border-b border-white/10">
							<tr class="text-left">
								<th class="px-6 py-4 w-10">
									<input type="checkbox" :checked="selectAll" @change="toggleSelectAll"
										class="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 checked:bg-brand-500 cursor-pointer transition-all" />
								</th>
								<th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.orders.table_header_order') }}</th>
								<th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.orders.table_header_client') }}</th>
								<th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.orders.table_header_product') }}</th>
								<th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.orders.table_header_total') }}</th>
								<th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.orders.table_header_status') }}</th>
								<th
									class="px-6 py-4 text-right rtl:text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
									{{ $t('admin.orders.table_header_actions') }}</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/5">
							<tr v-for="order in filteredOrders" :key="order.id" :class="[
								'transition-all group hover:bg-white/5',
								selectedOrders.has(order.id) ? 'bg-white/5' : '',
								isUrgent(order) ? 'border-l-2 border-l-yellow-500' : 'border-l-2 border-l-transparent'
							]">
								<!-- Checkbox -->
								<td class="px-6 py-4">
									<input type="checkbox" :checked="selectedOrders.has(order.id)"
										@change="toggleSelection(order.id)"
										class="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500 checked:bg-brand-500 cursor-pointer transition-all" />
								</td>

								<!-- Order Info -->
								<td class="px-6 py-4">
									<div class="flex items-center gap-3">
										<div>
											<div class="flex items-center gap-2">
												<span class="text-sm font-bold text-white">
													#{{ order.orderNumber }}
												</span>
												<span v-if="isUrgent(order)"
													class="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded uppercase shadow-sm shadow-yellow-500/10"
													:title="$t('admin.orders.urgent_title')">
													{{ $t('admin.orders.urgent') }}
												</span>
											</div>
											<span class="text-xs text-slate-500 flex items-center gap-1 mt-1">
												<Icon name="ph:clock-bold" size="12" />
												{{ formatDate(order.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
												<span v-if="getDaysSinceCreation(order) > 0" class="text-slate-400">
													({{ $t('admin.orders.days_since', { days: getDaysSinceCreation(order) }) }})
												</span>
											</span>
										</div>
									</div>
								</td>

								<!-- Client -->
								<td class="px-6 py-4">
									<div>
										<span class="text-sm font-semibold text-slate-200 block mb-0.5">
											{{ order.business?.name }}
										</span>
										<span class="text-xs text-slate-500">{{ order.contactName }}</span>
									</div>
								</td>

								<!-- Product -->
								<td class="px-6 py-4">
									<div class="flex items-center gap-2">
										<span class="text-sm text-slate-300">
											{{ order.quantity }}x {{ order.productType }}
										</span>
										<span v-if="order.dimensions"
											class="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold rounded">
											{{ order.dimensions }}
										</span>
									</div>
								</td>

								<!-- Total -->
								<td class="px-6 py-4">
									<div class="flex flex-col">
										<span v-if="order.totalPrice" class="text-sm font-bold text-white">
											{{ Number(order.totalPrice).toFixed(0) }} {{ order.currency || 'MAD' }}
										</span>
										<span :class="[
											'text-[10px] font-bold uppercase mt-0.5',
											order.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-slate-500'
										]">
											{{ getPaymentStatusLabel(order.paymentStatus) }}
										</span>
									</div>
								</td>

								<!-- Status (Inline Editable) -->
								<td class="px-6 py-4">
									<div class="relative status-dropdown">
										<!-- Updating Spinner -->
										<div v-if="updatingStatusId === order.id"
											class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-400 flex items-center gap-2">
											<Icon name="svg-spinners:ring-resize" size="14" />
										</div>

										<!-- Status Button -->
										<button v-else @click="openStatusDropdown(order.id, $event)" :class="[
											'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 hover:bg-white/5',
											getStatusClasses(order.status)
										]">
											{{ getStatusLabel(order.status) }}
											<Icon name="ph:caret-down-bold" size="10" class="opacity-50" />
										</button>
									</div>
								</td>

								<!-- Actions -->
								<td class="px-6 py-4 text-right rtl:text-left">
									<div
										class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<!-- Quick Next Status Button -->
										<button v-if="getNextStatus(order.status)"
											@click="handleInlineStatusChange(order, getNextStatus(order.status)!)"
											:disabled="updatingStatusId === order.id"
											class="px-2.5 py-1.5 text-xs font-bold bg-white text-slate-900 rounded-lg hover:bg-brand-50 transition-all disabled:opacity-50 flex items-center gap-1 shadow-lg shadow-white/5"
											:title="`Passer à: ${getNextStatusLabel(order.status)}`">
											<Icon name="ph:arrow-right-bold" size="12" class="rtl:rotate-180" />
											<span class="hidden xl:inline">{{ getNextStatusLabel(order.status) }}</span>
										</button>

										<!-- Download for Printing (ZIP with BC + Flyer) -->
										<button @click="handleDownloadOrderForPrinting(order)"
											class="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
											:title="$t('admin.orders.download_printing_title')">
											<Icon name="ph:printer-bold" size="16" />
										</button>

										<!-- View Details -->
										<button @click="viewOrderDetails(order)"
											class="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
											:title="$t('admin.orders.download_details_title')">
											<Icon name="ph:eye-bold" size="16" />
										</button>

										<!-- Download PDF only -->
										<button @click="handleDownloadPdf(order)"
											class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
											:title="$t('admin.orders.download_pdf_title')">
											<Icon name="ph:file-pdf-bold" size="16" />
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Order Details Modal -->
		<OrdersOrderDetailsModal v-model="showDetailsModal" :order="selectedOrder" />

		<!-- Teleported Status Dropdown -->
		<Teleport to="body">
			<Transition enter-active-class="transition ease-out duration-100"
				enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
				leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
				leave-to-class="transform opacity-0 scale-95">
				<div v-if="editingStatusId"
					:style="{ position: 'fixed', top: dropdownPosition.top + 'px', left: dropdownPosition.left + 'px' }"
					class="z-[9999] w-48 bg-[#0f172a] rounded-xl shadow-2xl border border-white/10 py-1 backdrop-blur-xl">
					<button v-for="option in statusOptions" :key="option.value"
						@click="handleInlineStatusChange(filteredOrders.find(o => o.id === editingStatusId)!, option.value)"
						:class="[
							'w-full px-3 py-2 text-left rtl:text-right text-xs font-bold flex items-center gap-2 transition-colors',
							filteredOrders.find(o => o.id === editingStatusId)?.status === option.value
								? 'bg-white/10 text-white'
								: 'text-slate-400 hover:bg-white/5 hover:text-white'
						]">
						<Icon :name="option.icon" size="14" />
						{{ option.label }}
						<Icon v-if="filteredOrders.find(o => o.id === editingStatusId)?.status === option.value"
							name="ph:check-bold" size="12" class="ml-auto rtl:ml-0 rtl:mr-auto text-emerald-400" />
					</button>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
	display: none;
}

.no-scrollbar {
	-ms-overflow-style: none;
	scrollbar-width: none;
}
</style>
