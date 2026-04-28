<script setup lang="ts">
import type { Order } from '~/composables/useOrders'

definePageMeta({
	layout: 'dashboard',
	middleware: 'auth',
})

useHead({ title: 'Commande confirmée' })

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
		const sessionId = route.query.session_id as string
		if (sessionId) {
			const result = await verifyCheckoutSession(route.params.id as string, sessionId)
			if (result.id || result.paid !== false) {
				order.value = result as Order
				verificationStatus.value = 'success'
			} else {
				verificationStatus.value = 'error'
				errorMessage.value = t('orders.success_page.payment_not_finalized')
			}
		} else {
			const data = await $api<Order>(`/orders/${route.params.id}`)
			order.value = data
			verificationStatus.value = data.paymentStatus === 'paid' ? 'success' : 'error'
			if (data.paymentStatus !== 'paid') errorMessage.value = t('orders.success_page.payment_not_confirmed')
		}
	} catch (e: any) {
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
	if (hasActiveSubscription.value) fetchOrderAndVerify()
})
</script>

<template>
	<SubscriptionRequired
		v-if="!subscriptionLoading && !hasActiveSubscription"
		:title="$t('orders.success_page.access_required')"
		description=""
		icon="ph:package-fill"
	/>

	<div v-else class="max-w-lg mx-auto py-2">

		<!-- Loading -->
		<div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-3">
			<Icon name="svg-spinners:ring-resize" size="32" class="text-slate-400" />
			<p class="text-sm text-slate-400">{{ $t('orders.success_page.verifying') }}</p>
		</div>

		<!-- Error -->
		<div v-else-if="verificationStatus === 'error'" class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center">
			<div class="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center mx-auto mb-4">
				<Icon name="ph:x-circle-bold" size="20" class="text-red-500" />
			</div>
			<p class="text-sm font-medium text-slate-900 dark:text-white mb-1">{{ $t('orders.success_page.payment_error') }}</p>
			<p class="text-xs text-slate-400 mb-5">{{ errorMessage }}</p>
			<div class="flex gap-2 justify-center">
				<button @click="router.push(`/dashboard/orders/${route.params.id}/payment`)"
					class="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-md">
					{{ $t('orders.payment_page.pay_button') }}
				</button>
				<button @click="router.push('/dashboard/games')"
					class="px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
					{{ $t('orders.payment_page.back_dashboard') }}
				</button>
			</div>
		</div>

		<!-- Success -->
		<div v-else class="space-y-3">

			<!-- Success header -->
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="h-1 w-full bg-emerald-500" />
				<div class="px-6 py-6 text-center">
					<div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<Icon name="ph:check-circle-fill" size="28" class="text-emerald-500" />
					</div>
					<h1 class="text-base font-semibold text-slate-900 dark:text-white mb-1">{{ $t('orders.success_page.title') }}</h1>
					<p class="text-xs text-slate-400">{{ $t('orders.success_page.thanks') }}</p>
				</div>
			</div>

			<!-- Order details -->
			<div v-if="order" class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
					<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{{ $t('orders.success_page.order_number') }}</p>
					<span class="text-xs font-semibold text-slate-700 dark:text-slate-200">#{{ order.orderNumber }}</span>
				</div>
				<div class="divide-y divide-slate-100 dark:divide-slate-800">
					<div class="flex items-center justify-between px-5 py-3">
						<span class="text-sm text-slate-500 dark:text-slate-400">{{ $t('orders.success_page.product') }}</span>
						<span class="text-sm font-medium text-slate-900 dark:text-white">{{ order.quantity }}x {{ order.productType }}</span>
					</div>
					<div class="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50">
						<span class="text-sm font-semibold text-slate-900 dark:text-white">{{ $t('orders.success_page.total_paid') }}</span>
						<span class="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{{ formatPrice(order.totalPrice, order.currency) }}</span>
					</div>
				</div>
			</div>

			<!-- Status -->
			<div class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
				<div class="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
					<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{{ $t('orders.success_page.next_steps') }}</p>
				</div>
				<div class="divide-y divide-slate-100 dark:divide-slate-800">
					<div class="flex items-center gap-3.5 px-5 py-3">
						<div class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
							<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">1</span>
						</div>
						<span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('orders.success_page.step1') }}</span>
					</div>
					<div class="flex items-center gap-3.5 px-5 py-3">
						<div class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
							<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">2</span>
						</div>
						<span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('orders.success_page.step2') }}</span>
					</div>
					<div class="flex items-center gap-3.5 px-5 py-3">
						<div class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
							<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">3</span>
						</div>
						<span class="text-sm text-slate-600 dark:text-slate-400">{{ $t('orders.success_page.step3') }}</span>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-2.5">
				<button @click="router.push('/dashboard/games')"
					class="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
					<Icon name="ph:squares-four-bold" size="15" />
					{{ $t('orders.success_page.dashboard') }}
				</button>
				<button v-if="order" @click="router.push('/dashboard/orders')"
					class="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
					<Icon name="ph:package-bold" size="15" />
					{{ $t('orders.success_page.my_orders') }}
				</button>
			</div>

			<!-- Help -->
			<p class="text-center text-xs text-slate-400">
				Des questions ? <a href="mailto:support@scanupgo.com" class="text-slate-600 dark:text-slate-300 font-medium hover:underline">{{ $t('orders.success_page.contact') }}</a>
			</p>

		</div>
	</div>
</template>
