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
const { verifyCheckoutSession } = usePayment()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()

const order = ref<Order | null>(null)
const loading = ref(true)
const verificationStatus = ref<'verifying' | 'success' | 'error'>('verifying')
const errorMessage = ref<string | null>(null)

const fetchOrderAndVerify = async () => {
	loading.value = true
	verificationStatus.value = 'verifying'

	try {
		// Check if we have a session_id from Stripe redirect
		const sessionId = route.query.session_id as string

		if (sessionId) {
			// Verify the checkout session
			const result = await verifyCheckoutSession(route.params.id as string, sessionId)

			if (result.id || result.paid !== false) {
				// Payment was successful
				order.value = result as Order
				verificationStatus.value = 'success'
			} else {
				// Payment not completed
				verificationStatus.value = 'error'
				errorMessage.value = t('orders.success_page.payment_not_finalized')
			}
		} else {
			// No session_id, just fetch the order
			const data = await $api<Order>(`/orders/${route.params.id}`)
			order.value = data

			if (data.paymentStatus === 'paid') {
				verificationStatus.value = 'success'
			} else {
				verificationStatus.value = 'error'
				errorMessage.value = t('orders.success_page.payment_not_confirmed')
			}
		}
	} catch (e: any) {
		console.error('Failed to fetch/verify order:', e)
		verificationStatus.value = 'error'
		errorMessage.value = e.data?.message || t('orders.success_page.payment_error')
	} finally {
		loading.value = false
	}
}

const formatPrice = (price: number | string | null | undefined, currency = 'MAD') => {
	if (price === null || price === undefined) return '-'
	const numPrice = typeof price === 'string' ? parseFloat(price) : price
	return `${numPrice.toFixed(2)} ${currency}`
}

onMounted(async () => {
	await fetchSubscription()
	if (hasActiveSubscription.value) {
		fetchOrderAndVerify()
	}
})
</script>

<template>
	<!-- Subscription Required -->
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('orders.success_page.access_required')"
		description=""
		icon="ph:package-fill"
	/>

	<div v-else class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
		<div class="max-w-xl mx-auto">
			<!-- Loading / Verifying -->
			<div v-if="loading" class="flex flex-col items-center justify-center py-24">
				<Icon name="svg-spinners:ring-resize" size="48" class="text-slate-900 dark:text-white mb-4" />
				<p class="text-slate-600 dark:text-slate-400">{{ $t('orders.success_page.verifying') }}</p>
			</div>

			<!-- Error State -->
			<div v-else-if="verificationStatus === 'error'" class="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-xl">
				<div class="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
					<Icon name="ph:x-circle-duotone" size="48" class="text-red-600" />
				</div>
				<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('orders.success_page.payment_error') }}</h2>
				<p class="text-slate-600 dark:text-slate-400 mb-6">{{ errorMessage }}</p>
				<div class="flex flex-col sm:flex-row gap-3 justify-center">
					<button @click="router.push(`/dashboard/orders/${route.params.id}/payment`)"
						class="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl">
						{{ $t('orders.payment_page.pay_button') }}
					</button>
					<button @click="router.push('/dashboard/games')"
						class="px-6 py-3 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl">
						{{ $t('orders.payment_page.back_dashboard') }}
					</button>
				</div>
			</div>

			<!-- Success Content -->
			<div v-else class="space-y-6">
				<!-- Success Animation Card -->
				<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
					<!-- Animated Checkmark -->
					<div class="relative w-24 h-24 mx-auto mb-6">
						<div class="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-50"></div>
						<div class="relative w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
							<Icon name="ph:check-circle-fill" size="56" class="text-green-600" />
						</div>
					</div>

					<h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
						{{ $t('orders.success_page.title') }}
					</h1>
					<p class="text-slate-600 dark:text-slate-400 mb-6">
						{{ $t('orders.success_page.thanks') }}
					</p>

					<!-- Order Summary -->
					<div v-if="order" class="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-left mb-6">
						<div class="flex justify-between items-center mb-3">
							<span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('orders.success_page.order_number') }}</span>
							<span class="font-bold text-slate-900 dark:text-white">#{{ order.orderNumber }}</span>
						</div>
						<div class="flex justify-between items-center mb-3">
							<span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('orders.success_page.product') }}</span>
							<span class="font-medium text-slate-900 dark:text-white">{{ order.quantity }}x {{ order.productType }}</span>
						</div>
						<div class="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
							<span class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('orders.success_page.total_paid') }}</span>
							<span class="text-lg font-bold text-green-600">
								{{ formatPrice(order.totalPrice, order.currency) }}
							</span>
						</div>
					</div>

					<!-- Next Steps -->
					<div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-left mb-6">
						<h3 class="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
							<Icon name="ph:info-bold" size="18" />
							{{ $t('orders.success_page.next_steps') }}
						</h3>
						<ol class="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
							<li>{{ $t('orders.success_page.step1') }}</li>
							<li>{{ $t('orders.success_page.step2') }}</li>
							<li>{{ $t('orders.success_page.step3') }}</li>
						</ol>
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-col sm:flex-row gap-3">
						<button @click="router.push('/dashboard/games')"
							class="flex-1 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
							<Icon name="ph:house-bold" size="20" />
							{{ $t('orders.success_page.dashboard') }}
						</button>
						<button v-if="order" @click="router.push(`/dashboard/orders`)"
							class="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
							<Icon name="ph:package-bold" size="20" />
							{{ $t('orders.success_page.my_orders') }}
						</button>
					</div>
				</div>

				<!-- Help Section -->
				<div class="text-center text-sm text-slate-500 dark:text-slate-400">
					<p>Des questions ? Contactez-nous à <a href="mailto:support@scanupgo.com" class="text-slate-900 dark:text-white font-medium hover:underline">{{ $t('orders.success_page.contact') }}</a></p>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
@keyframes ping {
	75%, 100% {
		transform: scale(1.5);
		opacity: 0;
	}
}
</style>
