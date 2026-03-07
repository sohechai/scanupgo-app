<script setup lang="ts">
import type { CreateOrderDto } from '~/composables/useOrders'

const props = defineProps<{
	modelValue: boolean
	flyerDesignUrl?: string
	gameId?: string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	'created': [orderId: string]
}>()

const { $api } = useNuxtApp()
const router = useRouter()
const { createOrder } = useOrders()
const { user } = useAuth()
const toast = useToast()
const { t } = useI18n()

// Flyer selection state
const games = ref<any[]>([])
const gamesLoading = ref(false)
const selectedGameId = ref<string | null>(props.gameId || null)
const selectedFlyerUrl = ref<string | null>(props.flyerDesignUrl || null)

// Determine if we need the flyer selection step
const needsFlyerSelection = computed(() => !props.flyerDesignUrl)

// Form steps: 3 steps if no flyer pre-selected, 2 otherwise
const totalSteps = computed(() => needsFlyerSelection.value ? 3 : 2)
const currentStep = ref(1)

// Pricing state
const pricingLoading = ref(false)
const calculatedPrice = ref<{ unitPrice: number; totalPrice: number; currency: string } | null>(null)

// Payment state
const paymentLoading = ref(false)
const paymentStep = ref<'idle' | 'processing' | 'success' | 'error'>('idle')

// The active flyer URL (from prop or selection)
const activeFlyerUrl = computed(() => props.flyerDesignUrl || selectedFlyerUrl.value)
const activeGameId = computed(() => props.gameId || selectedGameId.value)

// Simplified form - Flyers A6 135g couché only
const form = ref<CreateOrderDto & { dimensions?: string; paperType?: string }>({
	productType: 'Flyers',
	quantity: 250,
	dimensions: 'A6',
	paperType: '135g_couche',
	description: '',
	notes: '',
	deliveryAddress: '',
	deliveryCity: '',
	deliveryZip: '',
	deliveryCountry: 'Maroc',
	contactName: '',
	contactPhone: '',
	contactEmail: user.value?.email || '',
})

const paperTypeLabel = computed(() => t('components.create_order.paper_type_label'))
const quantityOptions = [100, 250, 500, 1000, 2500]

// Fetch games with flyers
const fetchGames = async () => {
	gamesLoading.value = true
	try {
		const allGames = await $api<any[]>('/games')
		games.value = (allGames || []).filter((g: any) => g.flyerDesignUrl)
	} catch (error) {
		console.error('Error fetching games:', error)
	} finally {
		gamesLoading.value = false
	}
}

// Select a flyer from a game
const selectFlyer = (game: any) => {
	selectedGameId.value = game.id
	selectedFlyerUrl.value = game.flyerDesignUrl
}

// Price calculation
const pricingError = ref<string | null>(null)

const calculatePrice = async () => {
	pricingLoading.value = true
	pricingError.value = null
	try {
		const result = await $api<{ unitPrice: number; totalPrice: number; currency: string } | null>('/flyer-pricing/calculate', {
			params: {
				productType: 'flyers',
				dimensions: 'A6',
				quantity: form.value.quantity,
				paperType: '135g_couche',
			}
		})

		if (!result || result.unitPrice === undefined) {
			pricingError.value = t('components.create_order.error_no_pricing')
			calculatedPrice.value = null
		} else {
			calculatedPrice.value = result
		}
	} catch (error) {
		console.error('Error calculating price:', error)
		pricingError.value = t('components.create_order.error_pricing_calc')
		calculatedPrice.value = null
	} finally {
		pricingLoading.value = false
	}
}

watch(() => form.value.quantity, async () => {
	await calculatePrice()
})

// Fetch games and calculate price when modal opens
watch(() => props.modelValue, (val) => {
	if (val) {
		if (needsFlyerSelection.value) {
			fetchGames()
		}
		calculatePrice()
	}
})

// Step mapping: map logical steps to content
const quantityStep = computed(() => needsFlyerSelection.value ? 2 : 1)
const deliveryStep = computed(() => needsFlyerSelection.value ? 3 : 2)

const resetForm = () => {
	currentStep.value = 1
	paymentStep.value = 'idle'
	calculatedPrice.value = null
	selectedGameId.value = props.gameId || null
	selectedFlyerUrl.value = props.flyerDesignUrl || null
	form.value = {
		productType: 'Flyers',
		quantity: 250,
		dimensions: 'A6',
		paperType: '135g_couche',
		description: '',
		notes: '',
		deliveryAddress: '',
		deliveryCity: '',
		deliveryZip: '',
		deliveryCountry: 'Maroc',
		contactName: '',
		contactPhone: '',
		contactEmail: user.value?.email || '',
	}
}

const canGoNext = computed(() => {
	if (needsFlyerSelection.value && currentStep.value === 1) {
		return selectedFlyerUrl.value !== null
	}
	if (currentStep.value === quantityStep.value) {
		return form.value.quantity >= 100 && calculatedPrice.value !== null
	}
	return true
})

const canSubmit = computed(() => {
	return form.value.contactName && form.value.contactPhone && form.value.contactEmail &&
		form.value.deliveryAddress && form.value.deliveryCity && form.value.deliveryZip &&
		calculatedPrice.value !== null
})

const nextStep = () => {
	if (currentStep.value < totalSteps.value && canGoNext.value) {
		currentStep.value++
	}
}

const prevStep = () => {
	if (currentStep.value > 1) {
		currentStep.value--
	}
}

const handleSubmit = async () => {
	if (!calculatedPrice.value) {
		toast.show(t('components.create_order.error_configure'), 'error')
		return
	}

	paymentLoading.value = true
	paymentStep.value = 'processing'

	try {
		const orderData = {
			...form.value,
			productType: form.value.productType,
			unitPrice: calculatedPrice.value.unitPrice,
			totalPrice: calculatedPrice.value.totalPrice,
			flyerDesignUrl: activeFlyerUrl.value || undefined,
			gameId: activeGameId.value || undefined,
		}

		const order = await createOrder(orderData)

		paymentStep.value = 'success'
		emit('update:modelValue', false)
		emit('created', order.id)

		router.push(`/dashboard/orders/${order.id}/payment`)
		resetForm()

	} catch (error) {
		console.error('Error creating order:', error)
		paymentStep.value = 'error'
		toast.show(t('components.create_order.error_create'), 'error')
	} finally {
		paymentLoading.value = false
	}
}

const close = () => {
	emit('update:modelValue', false)
	resetForm()
}

const formatPrice = (price: number, currency: string) => {
	return `${price.toFixed(2)} ${currency}`
}

const stepLabels = computed(() => {
	if (needsFlyerSelection.value) {
		return [
			t('components.create_order.step_flyer'),
			t('components.create_order.step_quantity'),
			t('components.create_order.step_delivery'),
		]
	}
	return [
		t('components.create_order.step_quantity'),
		t('components.create_order.step_delivery'),
	]
})
</script>

<template>
	<Teleport to="body">
		<div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

			<div
				class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
				<!-- Header -->
				<div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
					<div class="flex items-center justify-between">
						<h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('components.create_order.title') }}</h3>
						<button @click="close"
							class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
							<Icon name="ph:x-bold" size="20" class="text-slate-500" />
						</button>
					</div>

					<!-- Progress Steps -->
					<div class="flex items-center gap-2 mt-4">
						<div v-for="step in totalSteps" :key="step" class="flex items-center gap-2">
							<div :class="[
								'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
								currentStep >= step
									? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
									: 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
							]">
								<Icon v-if="currentStep > step" name="ph:check-bold" size="16" />
								<span v-else>{{ step }}</span>
							</div>
							<span v-if="step < totalSteps" class="w-16 h-0.5" :class="[
								currentStep > step ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'
							]"></span>
						</div>
					</div>
					<div class="flex justify-between text-xs font-medium text-slate-500 mt-2 px-1">
						<span v-for="label in stepLabels" :key="label">{{ label }}</span>
					</div>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-y-auto p-6">

					<!-- Step: Flyer Selection (only if no flyer pre-selected) -->
					<div v-if="needsFlyerSelection && currentStep === 1" class="space-y-6">
						<div>
							<h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
								{{ $t('components.create_order.select_flyer_title') }}
							</h4>
							<p class="text-xs text-slate-500 dark:text-slate-400">
								{{ $t('components.create_order.select_flyer_desc') }}
							</p>
						</div>

						<!-- Loading -->
						<div v-if="gamesLoading" class="flex items-center justify-center py-12">
							<Icon name="svg-spinners:ring-resize" size="32" class="text-slate-400" />
						</div>

						<!-- No flyers -->
						<div v-else-if="games.length === 0" class="text-center py-12">
							<div class="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
								<Icon name="ph:image-duotone" size="32" class="text-slate-400" />
							</div>
							<h4 class="font-bold text-slate-900 dark:text-white mb-1">{{ $t('components.create_order.no_flyer_title') }}</h4>
							<p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4">
								{{ $t('components.create_order.no_flyer_desc') }}
							</p>
							<NuxtLink to="/dashboard/games" @click="close"
								class="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors text-sm">
								<Icon name="ph:game-controller-bold" size="16" />
								{{ $t('components.create_order.create_game_button') }}
							</NuxtLink>
						</div>

						<!-- Flyer Cards Grid -->
						<div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4">
							<button v-for="game in games" :key="game.id" type="button"
								@click="selectFlyer(game)"
								:class="[
									'relative rounded-xl overflow-hidden border-2 transition-all text-left rtl:text-right group',
									selectedGameId === game.id
										? 'border-brand-500 shadow-lg shadow-brand-500/20 scale-[1.02]'
										: 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
								]">
								<!-- Flyer Image -->
								<div class="aspect-[3/4] bg-slate-100 dark:bg-slate-700 overflow-hidden">
									<img :src="game.flyerDesignUrl" :alt="game.title"
										class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
								</div>

								<!-- Game Title -->
								<div class="p-3 bg-white dark:bg-slate-800">
									<p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ game.title }}</p>
									<p class="text-[10px] text-slate-400 mt-0.5">{{ $t('components.create_order.format_a6') }}</p>
								</div>

								<!-- Selected Indicator -->
								<div v-if="selectedGameId === game.id"
									class="absolute top-2 right-2 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center shadow-lg">
									<Icon name="ph:check-bold" size="14" class="text-white" />
								</div>
							</button>
						</div>
					</div>

					<!-- Step: Quantity Selection -->
					<div v-if="currentStep === quantityStep" class="space-y-6">
						<!-- Flyer Preview & Product Info -->
						<div class="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-700 dark:to-slate-600 rounded-xl p-5 text-white">
							<div class="flex items-start gap-4">
								<div v-if="activeFlyerUrl" class="shrink-0">
									<div class="w-20 h-28 rounded-lg overflow-hidden shadow-lg border-2 border-white/20 bg-white">
										<img :src="activeFlyerUrl" :alt="$t('components.create_order.alt_flyer_preview')" class="w-full h-full object-cover" />
									</div>
								</div>
								<div v-else class="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
									<Icon name="ph:files-bold" size="28" />
								</div>
								<div class="flex-1">
									<h4 class="font-bold text-lg">{{ $t('components.create_order.product_name') }}</h4>
									<p class="text-sm text-white/80 mt-1">{{ $t('components.create_order.product_dimensions') }}</p>
									<div class="flex items-center gap-2 mt-2">
										<span class="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">{{ paperTypeLabel }}</span>
									</div>
									<p v-if="activeFlyerUrl" class="text-xs text-white/60 mt-2 flex items-center gap-1">
										<Icon name="ph:check-circle-fill" size="12" />
										{{ $t('components.create_order.custom_design') }}
									</p>
								</div>
							</div>
						</div>

						<!-- Quantity Selection -->
						<div class="space-y-3">
							<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
								{{ $t('components.create_order.quantity_label') }}
							</label>
							<div class="grid grid-cols-5 gap-2">
								<button v-for="qty in quantityOptions" :key="qty" type="button"
									@click="form.quantity = qty" :class="[
										'px-3 py-4 rounded-xl text-sm font-bold transition-all border-2',
										form.quantity === qty
											? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg scale-105'
											: 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400 hover:scale-102'
									]">
									{{ qty }}
								</button>
							</div>
						</div>

						<!-- Price Preview -->
						<div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
							<div class="flex items-center justify-between">
								<div>
									<span class="text-sm font-medium text-slate-600 dark:text-slate-400">{{ $t('components.create_order.price_total') }}</span>
									<p class="text-xs text-slate-500 mt-1">{{ form.quantity }} flyers A6 - {{ paperTypeLabel }}</p>
								</div>
								<div v-if="pricingLoading" class="flex items-center gap-2">
									<Icon name="svg-spinners:ring-resize" size="20" class="text-slate-500" />
								</div>
								<div v-else-if="calculatedPrice" class="text-right rtl:text-left">
									<p class="text-3xl font-bold text-slate-900 dark:text-white">
										{{ formatPrice(calculatedPrice.totalPrice, calculatedPrice.currency) }}
									</p>
									<p class="text-xs text-slate-500">
										{{ formatPrice(calculatedPrice.unitPrice, calculatedPrice.currency) }} {{ $t('components.create_order.price_per_unit') }}
									</p>
								</div>
								<div v-else class="text-sm text-slate-500">
									-
								</div>
							</div>
						</div>

						<!-- Pricing Error Alert -->
						<div v-if="pricingError" class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
							<div class="flex items-start gap-3">
								<Icon name="ph:warning-duotone" size="20" class="text-amber-600 flex-shrink-0 mt-0.5" />
								<div>
									<p class="text-sm font-medium text-amber-900 dark:text-amber-100">{{ $t('components.create_order.pricing_unavailable') }}</p>
									<p class="text-xs text-amber-700 dark:text-amber-300 mt-1">{{ pricingError }}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Step: Delivery & Confirmation -->
					<div v-if="currentStep === deliveryStep" class="space-y-6">
						<!-- Payment Status Overlays -->
						<div v-if="paymentStep === 'processing'"
							class="flex flex-col items-center justify-center py-12 text-center">
							<Icon name="svg-spinners:ring-resize" size="48" class="text-slate-900 dark:text-white mb-4" />
							<p class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('components.create_order.processing_title') }}</p>
							<p class="text-sm text-slate-500">{{ $t('components.create_order.processing_redirect') }}</p>
						</div>

						<div v-else-if="paymentStep === 'success'"
							class="flex flex-col items-center justify-center py-12 text-center">
							<div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
								<Icon name="ph:credit-card-duotone" size="40" class="text-blue-600" />
							</div>
							<p class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('components.create_order.payment_redirect_title') }}</p>
							<p class="text-sm text-slate-500">{{ $t('components.create_order.payment_redirect_desc') }}</p>
						</div>

						<div v-else-if="paymentStep === 'error'"
							class="flex flex-col items-center justify-center py-12 text-center">
							<div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
								<Icon name="ph:x-circle-duotone" size="40" class="text-red-600" />
							</div>
							<p class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('components.create_order.error_title') }}</p>
							<p class="text-sm text-slate-500">{{ $t('components.create_order.error_occurred') }}</p>
							<button @click="paymentStep = 'idle'"
								class="mt-4 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg transition-all">
								{{ $t('components.create_order.retry_button') }}
							</button>
						</div>

						<!-- Normal Form -->
						<template v-else>
							<!-- Order Summary -->
							<div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div v-if="activeFlyerUrl" class="w-10 h-14 rounded-md overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0">
											<img :src="activeFlyerUrl" class="w-full h-full object-cover" />
										</div>
										<div>
											<p class="font-bold text-slate-900 dark:text-white text-sm">{{ form.quantity }} Flyers A6</p>
											<p class="text-xs text-slate-500">14.8 x 10.5 cm - {{ paperTypeLabel }}</p>
										</div>
									</div>
									<p v-if="calculatedPrice" class="text-xl font-bold text-slate-900 dark:text-white">
										{{ formatPrice(calculatedPrice.totalPrice, calculatedPrice.currency) }}
									</p>
								</div>
							</div>

							<!-- Delivery Form -->
							<div class="space-y-4">
								<h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
									{{ $t('components.create_order.delivery_heading') }}
								</h4>

								<div class="space-y-1">
									<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
										{{ $t('components.create_order.label_contact_name') }} <span class="text-red-500">*</span>
									</label>
									<input v-model="form.contactName" :placeholder="$t('components.create_order.placeholder_contact_name')"
										class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div class="space-y-1">
										<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
											{{ $t('components.create_order.label_phone') }} <span class="text-red-500">*</span>
										</label>
										<input v-model="form.contactPhone" type="tel" placeholder="+212 6XX XXX XXX"
											class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
									</div>

									<div class="space-y-1">
										<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
											{{ $t('components.create_order.label_email') }} <span class="text-red-500">*</span>
										</label>
										<input v-model="form.contactEmail" type="email" placeholder="email@example.com"
											class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
									</div>
								</div>

								<div class="space-y-1">
									<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
										{{ $t('components.create_order.label_address') }} <span class="text-red-500">*</span>
									</label>
									<input v-model="form.deliveryAddress" :placeholder="$t('components.create_order.placeholder_address')"
										class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
								</div>

								<div class="grid grid-cols-3 gap-4">
									<div class="space-y-1">
										<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
											{{ $t('components.create_order.label_city') }} <span class="text-red-500">*</span>
										</label>
										<input v-model="form.deliveryCity" :placeholder="$t('components.create_order.label_city')"
											class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
									</div>

									<div class="space-y-1">
										<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
											{{ $t('components.create_order.label_zip') }} <span class="text-red-500">*</span>
										</label>
										<input v-model="form.deliveryZip" :placeholder="$t('components.create_order.label_zip')"
											class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
									</div>

									<div class="space-y-1">
										<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
											{{ $t('components.create_order.label_country') }}
										</label>
										<input v-model="form.deliveryCountry" :placeholder="$t('components.create_order.label_country')"
											class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all" />
									</div>
								</div>

								<div class="space-y-1">
									<label class="block text-sm font-bold text-slate-700 dark:text-slate-300">
										{{ $t('components.create_order.label_notes') }}
									</label>
									<textarea v-model="form.notes"
										:placeholder="$t('components.create_order.placeholder_notes')" rows="2"
										class="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500 outline-none transition-all"></textarea>
								</div>
							</div>

							<!-- Info Note -->
							<div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
								<div class="flex items-start gap-3">
									<Icon name="ph:lock-simple-duotone" size="20" class="text-green-600 flex-shrink-0 mt-0.5" />
									<div>
										<p class="text-sm font-medium text-green-900 dark:text-green-100">{{ $t('components.create_order.secure_payment_title') }}</p>
										<p class="text-xs text-green-700 dark:text-green-300 mt-1">
											{{ $t('components.create_order.secure_payment_desc') }}
										</p>
									</div>
								</div>
							</div>
						</template>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
					<div class="flex justify-between items-center">
						<button v-if="currentStep > 1 && paymentStep === 'idle'" @click="prevStep"
							class="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-white transition-colors">
							<Icon name="ph:arrow-left-bold" class="rtl:rotate-180" />
							{{ $t('components.create_order.back_button') }}
						</button>
						<div v-else></div>

						<div class="flex items-center gap-3">
							<button v-if="paymentStep === 'idle'" @click="close"
								class="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
								{{ $t('components.create_order.cancel_button') }}
							</button>

							<button v-if="currentStep < totalSteps" @click="nextStep" :disabled="!canGoNext"
								class="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
								{{ $t('components.create_order.next_button') }}
								<Icon name="ph:arrow-right-bold" class="rtl:rotate-180" />
							</button>

							<button v-else-if="currentStep === deliveryStep && paymentStep === 'idle'" @click="handleSubmit"
								:disabled="paymentLoading || !canSubmit"
								class="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
								<Icon v-if="paymentLoading" name="svg-spinners:ring-resize" />
								<Icon v-else name="ph:credit-card-bold" />
								{{ $t('components.create_order.pay_button') }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>
