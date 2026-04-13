<script setup lang="ts">
import type { Order } from '~/composables/useOrders'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const { orders, stats, loading, fetchOrders, fetchStats, getStatusLabel, getStatusColor } = useOrders()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

const showCreateModal = ref(false)
const showDetailsModal = ref(false)
const selectedOrder = ref<Order | null>(null)
const filterStatus = ref<string>('all')

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		await Promise.all([fetchOrders(), fetchStats()])
	}
})

const filteredOrders = computed(() => {
	if (filterStatus.value === 'all') {
		return orders.value
	}
	return orders.value.filter(order => order.status === filterStatus.value)
})

const handleOrderCreated = async () => {
	await Promise.all([fetchOrders(), fetchStats()])
}

const viewOrderDetails = (order: Order) => {
	selectedOrder.value = order
	showDetailsModal.value = true
}

const statusFilters = computed(() => [
	{ value: 'all', label: t('orders.stats.total'), count: computed(() => stats.value.total) },
	{ value: 'pending', label: t('orders.stats.pending'), count: computed(() => stats.value.pending) },
	{ value: 'processing', label: t('orders.stats.processing'), count: computed(() => stats.value.processing) },
	{ value: 'shipped', label: t('orders.stats.shipped'), count: computed(() => stats.value.shipped) },
	{ value: 'delivered', label: t('orders.stats.delivered'), count: computed(() => stats.value.delivered) },
])
const getStatusClasses = (status: string) => {
	const color = getStatusColor(status)
	switch (color) {
		case 'yellow': return 'bg-yellow-50 text-yellow-700 border-yellow-100'
		case 'blue': return 'bg-blue-50 text-blue-700 border-blue-100'
		case 'purple': return 'bg-purple-50 text-purple-700 border-purple-100'
		case 'green': return 'bg-green-50 text-green-700 border-green-100'
		default: return 'bg-slate-50 text-slate-700 border-slate-100'
	}
}
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-8 relative">
		<!-- Header & Actions -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('orders.title') }}
				</h1>
				<p class="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
					{{ $t('orders.subtitle') }}
				</p>
			</div>

			<div class="flex items-center gap-3">
				<button @click="showCreateModal = true"
					class="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all">
					<Icon name="ph:plus-bold" />
					{{ $t('orders.new_order') }}
				</button>
			</div>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
			<div
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('orders.stats.total') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.total }}</span>
				</div>
			</div>
			<div
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('orders.stats.pending') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ stats.pending }}</span>
				</div>
			</div>
			<div
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('orders.stats.processing') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ stats.processing }}</span>
				</div>
			</div>
			<div
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('orders.stats.shipped') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ stats.shipped }}</span>
				</div>
			</div>
			<div
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{{ $t('orders.stats.delivered') }}</span>
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats.delivered }}</span>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
			<button v-for="filter in statusFilters" :key="filter.value" @click="filterStatus = filter.value" :class="[
				'px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border-2',
				filterStatus === filter.value
					? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/10'
					: 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600',
			]">
				{{ filter.label }}
				<span class="ml-2 opacity-60 text-xs">{{ filter.count }}</span>
			</button>
		</div>

		<!-- Orders List -->
		<div
			class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-900/5 overflow-hidden">

			<!-- Loading State -->
			<div v-if="loading" class="py-24 flex flex-col items-center justify-center gap-4">
				<Icon name="svg-spinners:ring-resize" size="40" class="text-slate-900 dark:text-white" />
				<p class="text-sm font-bold text-slate-400 animate-pulse">{{ $t('orders.loading') }}</p>
			</div>

			<!-- Empty State -->
			<div v-else-if="filteredOrders.length === 0"
				class="py-24 flex flex-col items-center justify-center text-center px-4">
				<div
					class="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700 group-hover:scale-110 transition-transform">
					<Icon name="ph:package-duotone" size="40" />
				</div>
				<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ $t('orders.empty_state') }}</h3>
				<p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-8">
					{{ filterStatus === "all" ?
						$t('orders.empty_state_all') : $t('orders.empty_state_filtered') }}
				</p>
				<button v-if="filterStatus === 'all'" @click="showCreateModal = true"
					class="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-slate-900/10">
					{{ $t('orders.empty_state_button') }}
				</button>
			</div>

			<!-- Orders Table -->
			<div v-else class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
							<th
								class="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
								{{ $t('orders.table.order_number') }}</th>
							<th
								class="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
								{{ $t('orders.table.date') }}</th>
							<th
								class="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
								{{ $t('orders.table.product') }}</th>
							<th
								class="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
								{{ $t('orders.table.quantity') }}</th>
							<th
								class="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
								{{ $t('orders.table.status') }}</th>
							<th
								class="px-6 py-4 text-right rtl:text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
								{{ $t('orders.table.actions') }}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-50 dark:divide-slate-700/50">
						<tr v-for="order in filteredOrders" :key="order.id"
							class="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all cursor-pointer"
							@click="viewOrderDetails(order)">
							<td class="px-6 py-4 whitespace-nowrap">
								<span
									class="text-sm font-bold text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300">
									#{{ order.orderNumber }}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="text-xs font-bold text-slate-500 dark:text-slate-400">
									{{ formatDate(order.createdAt) }}
								</span>
							</td>
							<td class="px-6 py-4">
								<div class="flex flex-col">
									<span class="text-sm font-bold text-slate-900 dark:text-white">{{ order.productType
									}}</span>
									<span v-if="order.dimensions"
										class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{{
											order.dimensions }}</span>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="text-sm font-bold text-slate-700 dark:text-slate-300">
									{{ order.quantity }} <span class="text-[10px] text-slate-400">{{ $t('orders.payment_page.units').toUpperCase() }}</span>
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span :class="[
									'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
									getStatusClasses(order.status)
								]">
									{{ getStatusLabel(order.status) }}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right rtl:text-left">
								<button @click.stop="viewOrderDetails(order)"
									class="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-900 dark:hover:bg-white text-slate-900 dark:text-white hover:text-white dark:hover:text-slate-900 font-bold text-xs rounded-lg transition-all">
									{{ $t('orders.table.view') }}
									<Icon name="ph:arrow-right-bold" size="12" class="rtl:rotate-180" />
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Modals -->
		<OrdersCreateOrderModal v-model="showCreateModal" @created="handleOrderCreated" />
		<OrdersOrderDetailsModal v-model="showDetailsModal" :order="selectedOrder" />
	</div>
	</SubscriptionGate>
</template>
