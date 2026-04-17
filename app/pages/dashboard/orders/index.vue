<script setup lang="ts">
import type { Order } from '~/composables/useOrders'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { formatDate } = useLocaleDate()
const { orders, stats, loading, fetchOrders, fetchStats, getStatusLabel, getStatusColor } = useOrders()
const { hasActiveSubscription, fetchSubscription } = useSubscription()

const showCreateModal = ref(false)
const showDetailsModal = ref(false)
const selectedOrder = ref<Order | null>(null)
const filterStatus = ref<string>('all')

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) await Promise.all([fetchOrders(), fetchStats()])
})

const filteredOrders = computed(() =>
	filterStatus.value === 'all' ? orders.value : orders.value.filter(o => o.status === filterStatus.value)
)

const handleOrderCreated = async () => await Promise.all([fetchOrders(), fetchStats()])

const viewOrderDetails = (order: Order) => {
	selectedOrder.value = order
	showDetailsModal.value = true
}

const statusFilters = computed(() => [
	{ value: 'all',        label: t('orders.stats.total'),      count: stats.value.total },
	{ value: 'pending',    label: t('orders.stats.pending'),    count: stats.value.pending },
	{ value: 'processing', label: t('orders.stats.processing'), count: stats.value.processing },
	{ value: 'shipped',    label: t('orders.stats.shipped'),    count: stats.value.shipped },
	{ value: 'delivered',  label: t('orders.stats.delivered'),  count: stats.value.delivered },
])

const statusDotColor: Record<string, string> = {
	pending:    'bg-[#FF9500]',
	processing: 'bg-[#007AFF]',
	shipped:    'bg-[#5856D6]',
	delivered:  'bg-[#34C759]',
	cancelled:  'bg-[#FF3B30]',
}
const statusTextColor: Record<string, string> = {
	pending:    'text-[#FF9500]',
	processing: 'text-[#007AFF]',
	shipped:    'text-[#5856D6]',
	delivered:  'text-[#34C759]',
	cancelled:  'text-[#FF3B30]',
}
const statusBgColor: Record<string, string> = {
	pending:    'bg-[#FF9500]/10',
	processing: 'bg-[#007AFF]/10',
	shipped:    'bg-[#5856D6]/10',
	delivered:  'bg-[#34C759]/10',
	cancelled:  'bg-[#FF3B30]/10',
}
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('orders.title') }}</h1>
				<p class="text-slate-400 dark:text-slate-500 text-sm mt-0.5">{{ $t('orders.subtitle') }}</p>
			</div>
			<button @click="showCreateModal = true"
				class="flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-[#007AFF]/25">
				<Icon name="ph:plus-bold" size="16" />
				{{ $t('orders.new_order') }}
			</button>
		</div>

		<!-- Stats — iOS widgets -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('orders.stats.total') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ stats.total }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('orders.stats.pending') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ stats.pending }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('orders.stats.processing') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ stats.processing }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('orders.stats.shipped') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ stats.shipped }}</p>
			</div>
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 p-4 shadow-sm">
				<p class="text-[11px] text-slate-400 mb-1 font-medium">{{ $t('orders.stats.delivered') }}</p>
				<p class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{ stats.delivered }}</p>
			</div>
		</div>

		<!-- Filter pills -->
		<div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
			<button
				v-for="f in statusFilters" :key="f.value"
				@click="filterStatus = f.value"
				class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
				:class="filterStatus === f.value
					? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
					: 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300 hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]'">
				{{ f.label }}
				<span class="text-[11px] opacity-70">{{ f.count }}</span>
			</button>
		</div>

		<!-- Orders list — iOS grouped -->
		<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden shadow-sm">

			<div v-if="loading" class="p-12 flex flex-col items-center justify-center gap-3">
				<Icon name="ph:spinner-gap-bold" size="32" class="text-slate-300 animate-spin" />
				<p class="text-sm text-slate-400 animate-pulse">{{ $t('orders.loading') }}</p>
			</div>

			<div v-else-if="filteredOrders.length === 0" class="p-14 flex flex-col items-center text-center">
				<div class="w-16 h-16 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-center mb-4">
					<Icon name="ph:package-duotone" size="32" class="text-slate-400" />
				</div>
				<h3 class="text-base font-bold text-slate-900 dark:text-white mb-1.5">{{ $t('orders.empty_state') }}</h3>
				<p class="text-sm text-slate-400 dark:text-slate-500 max-w-xs mb-6">
					{{ filterStatus === 'all' ? $t('orders.empty_state_all') : $t('orders.empty_state_filtered') }}
				</p>
				<button v-if="filterStatus === 'all'" @click="showCreateModal = true"
					class="px-5 py-2.5 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-xl text-sm shadow-md shadow-[#007AFF]/25 transition-all">
					{{ $t('orders.empty_state_button') }}
				</button>
			</div>

			<div v-else class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">
				<div
					v-for="order in filteredOrders" :key="order.id"
					@click="viewOrderDetails(order)"
					class="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer group">
					<!-- Status icon -->
					<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
						:class="statusBgColor[order.status] || 'bg-[#F2F2F7] dark:bg-[#2C2C2E]'">
						<span :class="[statusDotColor[order.status] || 'bg-slate-400', 'w-2.5 h-2.5 rounded-full']"></span>
					</div>
					<!-- Info -->
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-slate-900 dark:text-white text-sm">#{{ order.orderNumber }}</p>
						<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
							{{ order.productType }}<span v-if="order.dimensions"> · {{ order.dimensions }}</span>
							<span> · {{ order.quantity }} {{ $t('orders.payment_page.units') }}</span>
						</p>
					</div>
					<!-- Status + date -->
					<div class="flex flex-col items-end gap-1 shrink-0">
						<span :class="[statusBgColor[order.status] || 'bg-[#F2F2F7]', statusTextColor[order.status] || 'text-slate-500']"
							class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold">
							{{ getStatusLabel(order.status) }}
						</span>
						<span class="text-[11px] text-slate-400">{{ formatDate(order.createdAt) }}</span>
					</div>
					<Icon name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0" />
				</div>
			</div>
		</div>

		<!-- Modals -->
		<OrdersCreateOrderModal v-model="showCreateModal" @created="handleOrderCreated" />
		<OrdersOrderDetailsModal v-model="showDetailsModal" :order="selectedOrder" />
	</div>
	</SubscriptionGate>
</template>
