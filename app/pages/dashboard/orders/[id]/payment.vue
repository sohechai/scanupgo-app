<script setup lang="ts">
import type { Order } from '~/composables/useOrders'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { loading: paymentLoading, createCheckoutSession } = usePayment()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

const order = ref<Order | null>(null)
const loading = ref(true)
const fetchError = ref<string | null>(null)

const wasCancelled = computed(() => route.query.cancelled === 'true')

const fetchOrder = async () => {
	loading.value = true
	fetchError.value = null
	try {
		const data = await $api<Order>(`/orders/${route.params.id}`)
		order.value = data
		if (data.paymentStatus === 'paid') {
			router.push(`/dashboard/orders/${route.params.id}/success`)
			return
		}
	} catch (e: any) {
		fetchError.value = e.data?.message || t('orders.payment_page.error_not_found')
	} finally {
		loading.value = false
	}
}

const handlePayment = async () => {
	if (!order.value) return
	try {
		await createCheckoutSession(order.value.id)
	} catch {}
}

const formatPrice = (price: number | string | null | undefined, currency = 'MAD') => {
	if (price === null || price === undefined) return '-'
	const numPrice = typeof price === 'string' ? parseFloat(price) : price
	return `${numPrice.toFixed(2)} ${currency}`
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) fetchOrder()
})
</script>

<template>
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('orders.payment_page.access_required')"
		:description="$t('orders.payment_page.access_description')"
		icon="ph:credit-card-fill"
	/>

	<div v-else class="max-w-lg mx-auto py-2">

		<!-- Loading -->
		<div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-3">
			<Icon name="svg-spinners:ring-resize" size="32" class="text-slate-400" />
			<p class="text-sm text-slate-400">{{ $t('orders.payment_page.loading') }}</p>
		</div>

		<!-- Error -->
		<div v-else-if="fetchError" class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center">
			<div class="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center mx-auto mb-4">
				<Icon name="ph:warning-circle-bold" size="20" class="text-red-500" />
			</div>
			<p class="text-sm font-medium text-slate-900 dark:text-white mb-1">{{ $t('orders.payment_page.error') }}</p>
			<p class="text-xs text-slate-400 mb-5">{{ fetchError }}</p>
			<button @click="router.push('/dashboard/games')"
				class="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-md">
				{{ $t('orders.payment_page.back_dashboard') }}
			</button>
		</div>

		<!-- Payment Content -->
		<div v-else-if="order" class="space-y-3">

			<!-- Cancelled banner -->
			<div v-if="wasCancelled" class="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
				<Icon name="ph:warning-bold" size="15" class="text-amber-600 dark:text-amber-400 shrink-0" />
				<p class="text-sm text-amber-700 dark:text-amber-300">{{ $t('orders.payment_page.cancelled') }}</p>
			</div>

			<!-- Page title -->
			<div class="mb-1">
				<h1 class="text-base font-semibold text-slate-900 dark:text-white">{{ $t('orders.payment_page.title') }}</h1>
				<p class="text-xs text-slate-400 mt-0.5">{{ $t('orders.success_page.order_number') }} <span class="font-medium text-slate-600 dark:text-slate-300">#{{ order.orderNumber }}</span></p>
			</div>

			<!-- Order Summary -->
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
					<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{{ $t('orders.payment_page.summary') }}</p>
				</div>
				<div class="divide-y divide-slate-100 dark:divide-slate-800">
					<div class="flex items-center justify-between px-5 py-3">
						<span class="text-sm text-slate-500 dark:text-slate-400">{{ $t('orders.payment_page.product') }}</span>
						<span class="text-sm font-medium text-slate-900 dark:text-white">{{ order.productType }}</span>
					</div>
					<div class="flex items-center justify-between px-5 py-3">
						<span class="text-sm text-slate-500 dark:text-slate-400">{{ $t('orders.payment_page.quantity') }}</span>
						<span class="text-sm font-medium text-slate-900 dark:text-white">{{ order.quantity }} {{ $t('orders.payment_page.units') }}</span>
					</div>
					<div class="flex items-center justify-between px-5 py-3">
						<span class="text-sm text-slate-500 dark:text-slate-400">{{ $t('orders.payment_page.format') }}</span>
						<span class="text-sm font-medium text-slate-900 dark:text-white">A6 — 14.8 × 10.5 cm</span>
					</div>
					<div class="flex items-center justify-between px-5 py-3">
						<span class="text-sm text-slate-500 dark:text-slate-400">{{ $t('orders.payment_page.paper') }}</span>
						<span class="text-sm font-medium text-slate-900 dark:text-white">135g couché</span>
					</div>
					<div class="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50">
						<span class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('orders.payment_page.total') }}</span>
						<span class="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
							{{ formatPrice(order.totalPrice, order.currency) }}
						</span>
					</div>
				</div>
			</div>

			<!-- Delivery -->
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="flex items-center gap-2.5 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
					<Icon name="ph:truck-bold" size="14" class="text-slate-400" />
					<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{{ $t('orders.payment_page.delivery') }}</p>
				</div>
				<div class="px-5 py-3.5">
					<p class="text-sm font-medium text-slate-900 dark:text-white">{{ order.contactName }}</p>
					<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ order.deliveryAddress }}, {{ order.deliveryZip }} {{ order.deliveryCity }}, {{ order.deliveryCountry }}</p>
				</div>
			</div>

			<!-- Payment -->
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
					<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Paiement</p>
				</div>
				<div class="p-5 space-y-4">
					<!-- Stripe block -->
					<div class="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-100 dark:border-slate-800">
						<div class="w-8 h-8 bg-[#635BFF] rounded-md flex items-center justify-center shrink-0">
							<Icon name="ph:stripe-logo-fill" size="16" class="text-white" />
						</div>
						<div class="min-w-0">
							<p class="text-sm font-medium text-slate-900 dark:text-white">{{ $t('orders.payment_page.stripe_info') }}</p>
							<p class="text-xs text-slate-400 mt-0.5">{{ $t('orders.payment_page.stripe_redirect') }}</p>
						</div>
					</div>

					<!-- Security note -->
					<div class="flex items-center gap-2 text-slate-400">
						<Icon name="ph:lock-simple-bold" size="13" class="shrink-0" />
						<p class="text-xs">{{ $t('orders.payment_page.security') }}</p>
					</div>

					<!-- Actions -->
					<div class="flex gap-2.5 pt-1">
						<button @click="router.push('/dashboard/games')"
							class="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
							{{ $t('orders.payment_page.cancel_button') }}
						</button>
						<button @click="handlePayment" :disabled="paymentLoading"
							class="flex-1 py-2.5 bg-[#635BFF] hover:bg-[#5248e0] text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
							<Icon v-if="paymentLoading" name="svg-spinners:ring-resize" size="15" />
							<Icon v-else name="ph:lock-simple-bold" size="14" />
							<span v-if="paymentLoading">{{ $t('orders.payment_page.redirecting') }}</span>
							<span v-else>{{ $t('orders.payment_page.pay_button') }} {{ formatPrice(order.totalPrice, order.currency) }}</span>
						</button>
					</div>
				</div>
			</div>

		</div>
	</div>
</template>
