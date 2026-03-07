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
const toast = useToast()
const { loading: paymentLoading, error: paymentError, createCheckoutSession } = usePayment()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

// Order data
const order = ref<Order | null>(null)
const loading = ref(true)
const fetchError = ref<string | null>(null)

// Check if user cancelled payment
const wasCancelled = computed(() => route.query.cancelled === 'true')

// Fetch order
const fetchOrder = async () => {
	loading.value = true
	fetchError.value = null

	try {
		const data = await $api<Order>(`/orders/${route.params.id}`)
		order.value = data

		// Check if already paid
		if (data.paymentStatus === 'paid') {
			router.push(`/dashboard/orders/${route.params.id}/success`)
			return
		}
	} catch (e: any) {
		console.error('Failed to fetch order:', e)
		fetchError.value = e.data?.message || t('orders.payment_page.error_not_found')
	} finally {
		loading.value = false
	}
}

// Redirect to Stripe Checkout
const handlePayment = async () => {
	if (!order.value) return

	try {
		await createCheckoutSession(order.value.id)
		// Redirect happens automatically in createCheckoutSession
	} catch (e) {
		// Error already handled in usePayment
	}
}

// Format price
const formatPrice = (price: number | string | null | undefined, currency = 'MAD') => {
	if (price === null || price === undefined) return '-'
	const numPrice = typeof price === 'string' ? parseFloat(price) : price
	return `${numPrice.toFixed(2)} ${currency}`
}

// Cancel and go back
const handleCancel = () => {
	router.push('/dashboard/games')
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchOrder()
	}
})
</script>

<template>
	<!-- Subscription Required -->
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('orders.payment_page.access_required')"
		:description="$t('orders.payment_page.access_description')"
		icon="ph:credit-card-fill"
	/>

	<div v-else class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
		<div class="max-w-xl mx-auto">
			<!-- Loading State -->
			<div v-if="loading" class="flex flex-col items-center justify-center py-24">
				<Icon name="svg-spinners:ring-resize" size="48" class="text-slate-900 dark:text-white mb-4" />
				<p class="text-slate-600 dark:text-slate-400">{{ $t('orders.payment_page.loading') }}</p>
			</div>

			<!-- Error State -->
			<div v-else-if="fetchError" class="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-xl">
				<div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
					<Icon name="ph:warning-circle-duotone" size="32" class="text-red-600" />
				</div>
				<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('orders.payment_page.error') }}</h2>
				<p class="text-slate-600 dark:text-slate-400 mb-6">{{ fetchError }}</p>
				<button @click="router.push('/dashboard/games')"
					class="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl">
					{{ $t('orders.payment_page.back_dashboard') }}
				</button>
			</div>

			<!-- Payment Content -->
			<div v-else-if="order" class="space-y-6">
				<!-- Cancelled Warning -->
				<div v-if="wasCancelled" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
					<div class="flex items-center gap-3">
						<Icon name="ph:warning-circle-fill" size="24" class="text-yellow-600" />
						<p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
							{{ $t('orders.payment_page.cancelled') }}
						</p>
					</div>
				</div>

				<!-- Header -->
				<div class="text-center mb-8">
					<div class="w-16 h-16 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
						<Icon name="ph:credit-card-bold" size="32" class="text-white dark:text-slate-900" />
					</div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ $t('orders.payment_page.title') }}</h1>
					<p class="text-slate-600 dark:text-slate-400 mt-1">{{ $t('orders.success_page.order_number') }} #{{ order.orderNumber }}</p>
				</div>

				<!-- Order Summary Card -->
				<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
					<div class="p-6 border-b border-slate-100 dark:border-slate-700">
						<h2 class="font-bold text-slate-900 dark:text-white mb-4">{{ $t('orders.payment_page.summary') }}</h2>

						<div class="space-y-3">
							<div class="flex justify-between items-center">
								<span class="text-slate-600 dark:text-slate-400">{{ $t('orders.payment_page.product') }}</span>
								<span class="font-medium text-slate-900 dark:text-white">{{ order.productType }}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-slate-600 dark:text-slate-400">{{ $t('orders.payment_page.quantity') }}</span>
								<span class="font-medium text-slate-900 dark:text-white">{{ order.quantity }} {{ $t('orders.payment_page.units') }}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-slate-600 dark:text-slate-400">{{ $t('orders.payment_page.format') }}</span>
								<span class="font-medium text-slate-900 dark:text-white">A6 - 14.8 × 10.5 cm</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-slate-600 dark:text-slate-400">{{ $t('orders.payment_page.paper') }}</span>
								<span class="font-medium text-slate-900 dark:text-white">135g couché</span>
							</div>

							<div class="pt-3 border-t border-slate-100 dark:border-slate-700">
								<div class="flex justify-between items-center">
									<span class="font-bold text-slate-900 dark:text-white">{{ $t('orders.payment_page.total') }}</span>
									<span class="text-2xl font-bold text-slate-900 dark:text-white">
										{{ formatPrice(order.totalPrice, order.currency) }}
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Payment Section -->
					<div class="p-6">
						<!-- Stripe Info -->
						<div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
									<Icon name="ph:stripe-logo-fill" size="24" class="text-white" />
								</div>
								<div>
									<p class="font-bold text-slate-900 dark:text-white text-sm">{{ $t('orders.payment_page.stripe_info') }}</p>
									<p class="text-xs text-slate-500">{{ $t('orders.payment_page.stripe_redirect') }}</p>
								</div>
							</div>
						</div>

						<!-- Security Note -->
						<div class="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-6">
							<Icon name="ph:lock-simple-bold" size="20" />
							<p class="text-xs">{{ $t('orders.payment_page.security') }}</p>
						</div>

						<!-- Action Buttons -->
						<div class="flex gap-3">
							<button @click="handleCancel"
								class="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
								{{ $t('orders.payment_page.cancel_button') }}
							</button>
							<button @click="handlePayment"
								:disabled="paymentLoading"
								class="flex-1 px-6 py-3 bg-[#635BFF] hover:bg-[#5851e5] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
								<Icon v-if="paymentLoading" name="svg-spinners:ring-resize" size="20" />
								<Icon v-else name="ph:lock-simple-bold" size="20" />
								<span v-if="paymentLoading">{{ $t('orders.payment_page.redirecting') }}</span>
								<span v-else>{{ $t('orders.payment_page.pay_button') }} {{ formatPrice(order.totalPrice, order.currency) }}</span>
							</button>
						</div>
					</div>
				</div>

				<!-- Delivery Info -->
				<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
					<h3 class="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
						<Icon name="ph:truck-bold" size="20" />
						{{ $t('orders.payment_page.delivery') }}
					</h3>
					<div class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
						<p class="font-medium text-slate-900 dark:text-white">{{ order.contactName }}</p>
						<p>{{ order.deliveryAddress }}</p>
						<p>{{ order.deliveryZip }} {{ order.deliveryCity }}</p>
						<p>{{ order.deliveryCountry }}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
