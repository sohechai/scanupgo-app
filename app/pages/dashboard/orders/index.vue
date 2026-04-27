<script setup lang="ts">
import type { Order } from '~/composables/useOrders'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const router = useRouter()
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

const currentPage = ref(1)
const PAGE_SIZE = 20
const totalPages = computed(() => Math.ceil(filteredOrders.value.length / PAGE_SIZE))
const paginatedOrders = computed(() => {
	const start = (currentPage.value - 1) * PAGE_SIZE
	return filteredOrders.value.slice(start, start + PAGE_SIZE)
})
watch(filterStatus, () => { currentPage.value = 1 })

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
	awaiting_payment: 'bg-orange-400',
	refunded:   'bg-rose-500',
	pending:    'bg-amber-400',
	processing: 'bg-blue-500',
	shipped:    'bg-violet-500',
	delivered:  'bg-emerald-500',
	cancelled:  'bg-red-500',
}
const statusTextColor: Record<string, string> = {
	awaiting_payment: 'text-orange-500',
	refunded:   'text-rose-500',
	pending:    'text-amber-600',
	processing: 'text-blue-600',
	shipped:    'text-violet-600',
	delivered:  'text-emerald-600',
	cancelled:  'text-red-600',
}

const getOrderDisplayKey = (order: Order) => {
	if (order.paymentStatus === 'refunded') return 'refunded'
	if (order.paymentStatus === 'pending') return 'awaiting_payment'
	return order.status
}

const getOrderDisplayLabel = (order: Order) => {
	if (order.paymentStatus === 'refunded') return t('orders.stats.refunded')
	if (order.paymentStatus === 'pending') return t('orders.stats.awaiting_payment')
	return getStatusLabel(order.status)
}
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-5">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-semibold text-slate-900 dark:text-white">{{ $t('orders.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('orders.subtitle') }}</p>
			</div>
			<button @click="showCreateModal = true"
				class="flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-medium rounded-md transition-all text-sm">
				<Icon name="ph:plus-bold" size="15" />
				{{ $t('orders.new_order') }}
			</button>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('orders.stats.total') }}</p>
				<p class="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums leading-none">{{ stats.total }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('orders.stats.pending') }}</p>
				<p class="text-2xl font-semibold text-amber-500 tabular-nums leading-none">{{ stats.pending }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('orders.stats.processing') }}</p>
				<p class="text-2xl font-semibold text-blue-500 tabular-nums leading-none">{{ stats.processing }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('orders.stats.shipped') }}</p>
				<p class="text-2xl font-semibold text-violet-500 tabular-nums leading-none">{{ stats.shipped }}</p>
			</div>
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3">
				<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">{{ $t('orders.stats.delivered') }}</p>
				<p class="text-2xl font-semibold text-emerald-500 tabular-nums leading-none">{{ stats.delivered }}</p>
			</div>
		</div>

		<!-- Filter pills -->
		<div class="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
			<button
				v-for="f in statusFilters" :key="f.value"
				@click="filterStatus = f.value"
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap"
				:class="filterStatus === f.value
					? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
					: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'">
				{{ f.label }}
				<span class="text-[11px] opacity-60 tabular-nums">{{ f.count }}</span>
			</button>
		</div>

		<!-- Orders list -->
		<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">

			<div v-if="loading" class="p-10 flex flex-col items-center justify-center gap-3">
				<Icon name="ph:spinner-gap-bold" size="28" class="text-slate-300 animate-spin" />
				<p class="text-sm text-slate-400">{{ $t('orders.loading') }}</p>
			</div>

			<div v-else-if="filteredOrders.length === 0" class="p-12 flex flex-col items-center text-center">
				<div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-4">
					<Icon name="ph:package-duotone" size="24" class="text-slate-400" />
				</div>
				<h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">{{ $t('orders.empty_state') }}</h3>
				<p class="text-sm text-slate-400 dark:text-slate-500 max-w-xs mb-5">
					{{ filterStatus === 'all' ? $t('orders.empty_state_all') : $t('orders.empty_state_filtered') }}
				</p>
				<button v-if="filterStatus === 'all'" @click="showCreateModal = true"
					class="px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-md text-sm transition-all">
					{{ $t('orders.empty_state_button') }}
				</button>
			</div>

			<div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
				<div
					v-for="order in paginatedOrders" :key="order.id"
					@click="viewOrderDetails(order)"
					class="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
					<!-- Status dot -->
					<div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
						<span :class="[statusDotColor[getOrderDisplayKey(order)] || 'bg-slate-400', 'w-2 h-2 rounded-full']"></span>
					</div>
					<!-- Info -->
					<div class="flex-1 min-w-0">
						<p class="font-medium text-slate-900 dark:text-white text-sm">#{{ order.orderNumber }}</p>
						<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
							{{ order.productType }}<span v-if="order.dimensions"> · {{ order.dimensions }}</span>
							<span> · {{ order.quantity }} {{ $t('orders.payment_page.units') }}</span>
						</p>
					</div>
					<!-- Status + date -->
					<div class="flex flex-col items-end gap-1 shrink-0">
						<span class="inline-flex items-center gap-1.5 text-xs" :class="statusTextColor[getOrderDisplayKey(order)] || 'text-slate-500'">
							<span :class="[statusDotColor[getOrderDisplayKey(order)] || 'bg-slate-400', 'w-1.5 h-1.5 rounded-full shrink-0']"></span>
							{{ getOrderDisplayLabel(order) }}
						</span>
						<span class="text-xs text-slate-400">{{ formatDate(order.createdAt) }}</span>
					</div>
					<!-- Pay now button for pending orders -->
					<button v-if="order.paymentStatus === 'pending'"
						@click.stop="router.push(`/dashboard/orders/${order.id}/payment`)"
						class="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#635BFF] hover:bg-[#5248e0] text-white text-xs font-semibold rounded-md transition-colors">
						<Icon name="ph:credit-card-bold" size="12" />
						{{ $t('components.order_details.pay_now') }}
					</button>
					<Icon v-else name="ph:caret-right-bold" size="11" class="text-slate-300 dark:text-slate-600 shrink-0 rtl:rotate-180" />
				</div>
			</div>
		</div>

		<!-- Pagination -->
		<div v-if="totalPages > 1" class="flex items-center justify-between px-1">
			<span class="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
				{{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, filteredOrders.length) }} / {{ filteredOrders.length }}
			</span>
			<div class="flex items-center gap-1">
				<button @click="currentPage--" :disabled="currentPage === 1"
					class="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
					<Icon name="ph:caret-left-bold" size="14" />
				</button>
				<span class="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">{{ currentPage }} / {{ totalPages }}</span>
				<button @click="currentPage++" :disabled="currentPage === totalPages"
					class="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
					<Icon name="ph:caret-right-bold" size="14" />
				</button>
			</div>
		</div>

		<!-- Modals -->
		<OrdersCreateOrderModal v-model="showCreateModal" @created="handleOrderCreated" />
		<OrdersOrderDetailsModal v-model="showDetailsModal" :order="selectedOrder" />
	</div>
	</SubscriptionGate>
</template>
