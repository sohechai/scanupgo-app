<script setup lang="ts">
import type { Order } from '~/composables/useOrders'

const props = defineProps<{
	modelValue: boolean
	order: Order | null
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
}>()

const { downloadPdf, getStatusLabel, getStatusColor } = useOrders()
const { t } = useI18n()
const router = useRouter()

const handleDownloadPdf = () => {
	if (props.order) {
		downloadPdf(props.order.id, props.order.orderNumber)
	}
}

const close = () => {
	emit('update:modelValue', false)
}

// Open flyer image in new tab (handles both data URLs and regular URLs)
const openFlyerInNewTab = async () => {
	if (!props.order?.flyerDesignUrl) return

	const imageUrl = props.order.flyerDesignUrl

	if (imageUrl.startsWith('data:')) {
		// Convert data URL to blob and open
		try {
			const response = await fetch(imageUrl)
			const blob = await response.blob()
			const blobUrl = URL.createObjectURL(blob)
			window.open(blobUrl, '_blank')
			// Clean up blob URL after a delay
			setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
		} catch (e) {
			console.error('Failed to open flyer image:', e)
			// Fallback: try opening directly
			window.open(imageUrl, '_blank')
		}
	} else {
		// Regular URL - open directly
		window.open(imageUrl, '_blank')
	}
}

const { formatDate } = useLocaleDate()

const statusTimeline = computed(() => {
	if (!props.order) return []

	const timeline = [
		{
			status: 'pending',
			label: t('components.order_details.timeline_created'),
			date: props.order.createdAt,
			active: true,
		},
		{
			status: 'processing',
			label: t('components.order_details.timeline_processing'),
			date: props.order.status !== 'pending' ? props.order.updatedAt : null,
			active: ['processing', 'shipped', 'delivered'].includes(props.order.status),
		},
		{
			status: 'shipped',
			label: t('components.order_details.timeline_shipped'),
			date: props.order.shippedAt,
			active: ['shipped', 'delivered'].includes(props.order.status),
		},
		{
			status: 'delivered',
			label: t('components.order_details.timeline_delivered'),
			date: props.order.deliveredAt,
			active: props.order.status === 'delivered',
		},
	]

	return timeline
})
const getStatusClasses = (status: string) => {
	const color = getStatusColor(status)
	switch (color) {
		case 'yellow': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
		case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200'
		case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200'
		case 'green': return 'bg-green-50 text-green-700 border-green-200'
		default: return 'bg-slate-50 text-slate-700 border-slate-200'
	}
}
</script>

<template>
	<Teleport to="body">
		<Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95"
			enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in"
			leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
		<div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

			<div v-if="order"
				class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-700/60">
				<!-- Header -->
				<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-xl font-bold text-slate-900 dark:text-white">
								{{ $t('components.order_details.title_prefix') }} {{ order.orderNumber }}
							</h3>
							<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
								{{ $t('components.order_details.created_at') }} {{ formatDate(order.createdAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
							</p>
						</div>
						<div class="flex items-center gap-3">
							<span :class="[
								'px-3 py-1 rounded-full text-xs font-bold border',
								getStatusClasses(order.status)
							]">
								{{ getStatusLabel(order.status) }}
							</span>
							<button @click="close"
								class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
								<Icon name="ph:x-bold" size="20" class="text-slate-500" />
							</button>
						</div>
					</div>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-y-auto p-6 space-y-8">
					<!-- Timeline -->
					<div v-if="order.status !== 'cancelled'"
						class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-100 dark:border-slate-700">
						<h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
							{{ $t('components.order_details.timeline_heading') }}
						</h4>
						<div class="space-y-4">
							<div v-for="(step, index) in statusTimeline" :key="step.status"
								class="flex items-start gap-4">
								<div class="flex flex-col items-center">
									<div :class="[
										'w-8 h-8 rounded-full flex items-center justify-center transition-all',
										step.active
											? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
											: 'bg-slate-200 dark:bg-slate-800 text-slate-400',
									]">
										<Icon v-if="step.active" name="ph:check-bold" size="16" />
										<span v-else class="text-xs font-bold">{{ index + 1 }}</span>
									</div>
									<div v-if="index < statusTimeline.length - 1" :class="[
										'w-0.5 h-6 my-1',
										statusTimeline[index + 1].active
											? 'bg-slate-900 dark:bg-white'
											: 'bg-slate-200 dark:bg-slate-800',
									]" />
								</div>
								<div class="flex-1 pt-1">
									<p :class="[
										'text-sm font-bold',
										step.active ? 'text-slate-900 dark:text-white' : 'text-slate-400',
									]">
										{{ step.label }}
									</p>
									<p v-if="step.date"
										class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
										{{ formatDate(step.date, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Details Grid -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
						<!-- Product Information -->
						<div class="space-y-4">
							<h4
								class="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
								{{ $t('components.order_details.product_info_heading') }}
							</h4>
							<div class="space-y-4">
								<div>
									<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
										{{ $t('components.order_details.label_product_type') }}
									</p>
									<p class="text-sm font-bold text-slate-900 dark:text-white mt-1">{{
										order.productType }}</p>
								</div>
								<div>
									<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
										{{ $t('components.order_details.label_quantity') }}
									</p>
									<p class="text-sm font-bold text-slate-900 dark:text-white mt-1">
										{{ order.quantity }} {{ $t('components.order_details.label_quantity_unit') }}
									</p>
								</div>
								<div v-if="order.description">
									<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
										{{ $t('components.order_details.label_description') }}
									</p>
									<p class="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{{
										order.description }}</p>
								</div>
							</div>
						</div>

						<!-- Delivery Information -->
						<div class="space-y-4">
							<h4
								class="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
								{{ $t('components.order_details.delivery_info_heading') }}
							</h4>
							<div class="space-y-4">
								<div class="grid grid-cols-2 gap-4">
									<div>
										<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
											{{ $t('components.order_details.label_contact') }}
										</p>
										<p class="text-sm font-bold text-slate-900 dark:text-white mt-1">{{
											order.contactName }}</p>
									</div>
									<div>
										<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
											{{ $t('components.order_details.label_phone') }}
										</p>
										<p class="text-sm font-bold text-slate-900 dark:text-white mt-1">{{
											order.contactPhone }}</p>
									</div>
								</div>
								<div>
									<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
										{{ $t('components.order_details.label_email') }}
									</p>
									<p class="text-sm font-bold text-slate-900 dark:text-white mt-1">{{
										order.contactEmail }}</p>
								</div>
								<div>
									<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
										{{ $t('components.order_details.label_address') }}
									</p>
									<p class="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
										{{ order.deliveryAddress }}<br />
										{{ order.deliveryZip }} {{ order.deliveryCity }}<br />
										{{ order.deliveryCountry }}
									</p>
								</div>
								<div v-if="order.trackingNumber">
									<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
										{{ $t('components.order_details.label_tracking') }}
									</p>
									<p
										class="text-sm font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
										{{ order.trackingNumber }}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Notes -->
					<div v-if="order.notes" class="space-y-3">
						<h4
							class="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
							{{ $t('components.order_details.notes_heading') }}
						</h4>
						<div
							class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30">
							<p class="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">{{
								order.notes }}</p>
						</div>
					</div>
				</div>

				<!-- Flyer Design Preview -->
				<div v-if="order.flyerDesignUrl" class="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
					<h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
						{{ $t('components.order_details.flyer_heading') }}
					</h4>
					<div class="flex items-start gap-4">
						<div class="w-32 h-44 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm">
							<img
								:src="order.flyerDesignUrl"
								:alt="$t('components.order_details.alt_flyer_design')"
								class="w-full h-full object-cover"
							/>
						</div>
						<div class="flex flex-col gap-2">
							<button
								@click="openFlyerInNewTab"
								type="button"
								class="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold transition-colors"
							>
								<Icon name="ph:eye-bold" size="16" />
								{{ $t('components.order_details.view_large') }}
							</button>
							<a
								:href="order.flyerDesignUrl"
								download="flyer.png"
								class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:border-slate-400 dark:hover:border-slate-400 transition-colors"
							>
								<Icon name="ph:download-bold" size="16" />
								{{ $t('components.order_details.download_image') }}
							</a>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
					<!-- Pay CTA for pending payment orders -->
					<div v-if="order.paymentStatus === 'pending'" class="mb-3 flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
						<Icon name="ph:warning-bold" size="15" class="text-amber-600 dark:text-amber-400 shrink-0" />
						<p class="text-xs text-amber-700 dark:text-amber-300 flex-1">{{ $t('components.order_details.payment_pending_notice') }}</p>
						<button @click="router.push(`/dashboard/orders/${order.id}/payment`)"
							class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#635BFF] hover:bg-[#5248e0] text-white text-xs font-semibold rounded-md transition-colors">
							<Icon name="ph:credit-card-bold" size="13" />
							{{ $t('components.order_details.pay_now') }}
						</button>
					</div>
					<div class="flex justify-between items-center">
						<button v-if="order.pdfUrl" @click="handleDownloadPdf"
							class="flex items-center gap-2 px-6 py-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white transition-all">
							<Icon name="ph:download-bold" />
							{{ $t('components.order_details.download_pdf') }}
						</button>
						<div v-else />
						<button @click="close"
							class="px-8 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg transition-all">
							{{ $t('components.order_details.close') }}
						</button>
					</div>
				</div>
			</div>
		</div>
		</Transition>
	</Teleport>
</template>
