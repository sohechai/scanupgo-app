<script setup lang="ts">
import type { Order, UpdateOrderStatusDto } from '~/composables/useOrders'

const props = defineProps<{
	modelValue: boolean
	order: Order | null
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	'updated': []
}>()

const { updateOrderStatus, loading, getStatusLabel, getStatusColor } = useOrders()
const { t } = useI18n()

const form = ref<UpdateOrderStatusDto>({
	status: 'pending',
	trackingNumber: '',
	notes: '',
})

watch(() => props.order, (order) => {
	if (order) {
		form.value = {
			status: order.status,
			trackingNumber: order.trackingNumber || '',
			notes: '',
		}
	}
}, { immediate: true })

const statusOptions = computed(() => [
	{ value: 'pending', label: t('components.update_order_status.status_pending'), color: 'yellow' },
	{ value: 'processing', label: t('components.update_order_status.status_processing'), color: 'blue' },
	{ value: 'shipped', label: t('components.update_order_status.status_shipped'), color: 'purple' },
	{ value: 'delivered', label: t('components.update_order_status.status_delivered'), color: 'green' },
	{ value: 'cancelled', label: t('components.update_order_status.status_cancelled'), color: 'red' },
])

const handleSubmit = async () => {
	if (!props.order) return

	try {
		await updateOrderStatus(props.order.id, form.value)
		emit('updated')
		emit('update:modelValue', false)
	} catch (error) {
		console.error('Error updating order status:', error)
	}
}

const close = () => {
	emit('update:modelValue', false)
}
const getStatusDotClass = (status: string) => {
	const color = getStatusColor(status)
	switch (color) {
		case 'yellow': return 'bg-yellow-500'
		case 'blue': return 'bg-blue-500'
		case 'purple': return 'bg-purple-500'
		case 'green': return 'bg-green-500'
		default: return 'bg-slate-500'
	}
}
</script>

<template>
	<Teleport to="body">
		<div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

			<div v-if="order"
				class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
				<!-- Header -->
				<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('components.update_order_status.title') }}</h3>
							<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
								{{ $t('components.update_order_status.order_prefix') }} {{ order.orderNumber }}
							</p>
						</div>
						<button @click="close"
							class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
							<Icon name="ph:x-bold" size="20" class="text-slate-500" />
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-y-auto p-6 space-y-6">
					<form @submit.prevent="handleSubmit" class="space-y-4">
						<div class="space-y-1">
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
								{{ $t('components.update_order_status.label_status') }} <span class="text-red-500">*</span>
							</label>
							<div class="relative">
								<select v-model="form.status"
									class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all appearance-none">
									<option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
										{{ opt.label }}
									</option>
								</select>
								<div
									class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
									<div :class="[
										'w-2 h-2 rounded-full',
										getStatusDotClass(form.status)
									]" />
									<Icon name="ph:caret-down-bold" class="text-slate-400" />
								</div>
							</div>
						</div>

						<div v-if="form.status === 'shipped' || form.status === 'delivered'" class="space-y-1">
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
								{{ $t('components.update_order_status.label_tracking') }}
							</label>
							<input v-model="form.trackingNumber" placeholder="Ex: 1Z999AA10123456784"
								class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
						</div>

						<div class="space-y-1">
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
								{{ $t('components.update_order_status.label_notes') }}
							</label>
							<textarea v-model="form.notes" :placeholder="$t('components.update_order_status.placeholder_notes')"
								rows="3"
								class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all"></textarea>
						</div>

						<!-- Current Order Info -->
						<div
							class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 space-y-3">
							<h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
								{{ $t('components.update_order_status.order_info_heading') }}
							</h4>
							<div class="grid grid-cols-2 gap-4 text-xs font-medium">
								<div>
									<p class="text-slate-500">{{ $t('components.update_order_status.label_business') }}</p>
									<p class="text-slate-900 dark:text-white mt-0.5">{{ order.business?.name }}</p>
								</div>
								<div>
									<p class="text-slate-500">{{ $t('components.update_order_status.label_product') }}</p>
									<p class="text-slate-900 dark:text-white mt-0.5">{{ order.productType }}</p>
								</div>
								<div>
									<p class="text-slate-500">{{ $t('components.update_order_status.label_quantity') }}</p>
									<p class="text-slate-900 dark:text-white mt-0.5">{{ order.quantity }} {{ $t('components.update_order_status.units') }}</p>
								</div>
								<div>
									<p class="text-slate-500">{{ $t('components.update_order_status.label_contact') }}</p>
									<p class="text-slate-900 dark:text-white mt-0.5">{{ order.contactName }}</p>
								</div>
							</div>
						</div>
					</form>
				</div>

				<!-- Footer -->
				<div
					class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
					<button @click="close" :disabled="loading"
						class="px-6 py-2 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
						{{ $t('components.update_order_status.cancel_button') }}
					</button>
					<button @click="handleSubmit" :disabled="loading"
						class="px-8 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg transition-all disabled:opacity-50">
						<Icon v-if="loading" name="svg-spinners:ring-resize" class="mr-2" />
						{{ $t('components.update_order_status.update_button') }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>
