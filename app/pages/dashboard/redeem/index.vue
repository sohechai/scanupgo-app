<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { hasActiveSubscription, fetchSubscription, loading: subscriptionLoading } = useSubscription()
const { formatDate } = useLocaleDate()

// State
const redemptionCode = ref('')
const loading = ref(false)
const scanning = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)
const showScanner = ref(false)
const stream = ref<MediaStream | null>(null)

// Validate redemption code
const validateCode = async (code: string) => {
	if (!code || code.length < 6) {
		error.value = t('dashboard.quick_validate.invalid_code')
		return
	}

	loading.value = true
	error.value = null
	result.value = null

	try {
		const response = await $api('/gameplay/redeem', {
			method: 'POST',
			body: {
				redemptionCode: code.toUpperCase()
			}
		})

		result.value = response
		redemptionCode.value = ''
	} catch (err: any) {
		error.value = err?.data?.message || t('redeem.error')
		console.error('Validation error:', err)
	} finally {
		loading.value = false
	}
}

// Handle manual code submission
const handleSubmit = () => {
	validateCode(redemptionCode.value)
}

// Start camera for QR scanning
const startScanning = async () => {
	showScanner.value = true
	scanning.value = true
	error.value = null

	try {
		stream.value = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: 'environment' }
		})

		const video = document.getElementById('qr-video') as HTMLVideoElement
		if (video && stream.value) {
			video.srcObject = stream.value
		}
	} catch (err) {
		error.value = t('dashboard.quick_validate.error')
		console.error('Camera error:', err)
		scanning.value = false
		showScanner.value = false
	}
}

// Stop camera
const stopScanning = () => {
	if (stream.value) {
		stream.value.getTracks().forEach(track => track.stop())
		stream.value = null
	}
	scanning.value = false
	showScanner.value = false
}

// Scan QR code from video
const scanQRCode = async () => {
	const video = document.getElementById('qr-video') as HTMLVideoElement
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')

	if (!video || !context) return

	canvas.width = video.videoWidth
	canvas.height = video.videoHeight
	context.drawImage(video, 0, 0, canvas.width, canvas.height)

	const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

	// Use jsQR library to decode
	if (typeof window !== 'undefined' && (window as any).jsQR) {
		const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height)

		if (code) {
			stopScanning()
			await validateCode(code.data)
		}
	}
}

// Start scanning loop when video is ready
const onVideoPlay = () => {
	const scanInterval = setInterval(() => {
		if (!scanning.value) {
			clearInterval(scanInterval)
			return
		}
		scanQRCode()
	}, 300)
}

// Reset state
const resetState = () => {
	result.value = null
	error.value = null
	redemptionCode.value = ''
}

// Cleanup on unmount
onUnmounted(() => {
	stopScanning()
})

// Fetch subscription on mount
onMounted(() => {
	fetchSubscription()
})
</script>

<template>
	<SubscriptionGate>
	<div class="space-y-8 relative">

		<!-- Header -->
		<div>
			<h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ $t('redeem.title') }}</h1>
			<p class="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{{ $t('redeem.subtitle') }}</p>
		</div>

		<!-- Main Content Area (Centered for focus) -->
		<div class="max-w-2xl mx-auto">

			<div
				class="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">

				<!-- Success Result -->
				<div v-if="result" class="p-8 md:p-10">
					<div class="text-center mb-8">
						<div
							class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 ring-4 ring-emerald-50">
							<Icon name="ph:check-bold" size="32" />
						</div>
						<h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">{{ $t('redeem.success') }}</h2>
						<p class="text-slate-500 dark:text-slate-400 text-sm">{{ $t('redeem.success_message') }}</p>
					</div>

					<!-- Prize Details -->
					<div
						class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mb-8 border border-slate-100 dark:border-slate-700">
						<div class="grid gap-6">
							<div>
								<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('redeem.prize_won') }}
								</p>
								<p class="text-lg font-bold text-slate-900 dark:text-white">{{ result.prize?.name }}</p>
							</div>

							<div class="border-t border-slate-200 dark:border-slate-600 pt-4">
								<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('redeem.player') }}</p>
								<div class="flex items-center gap-3">
									<div
										class="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
										{{ (result.player?.firstName?.[0] || '') + (result.player?.lastName?.[0] || '')
										}}
									</div>
									<div>
										<p class="font-bold text-slate-900 dark:text-white text-sm">
											{{ result.player?.firstName }} {{ result.player?.lastName }}
										</p>
										<p v-if="result.player?.phone"
											class="text-xs text-slate-500 dark:text-slate-400">
											{{ result.player.phone }}
										</p>
									</div>
								</div>
							</div>

							<div class="border-t border-slate-200 dark:border-slate-600 pt-4">
								<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{{ $t('redeem.validation_date') }}</p>
								<p class="font-medium text-slate-900 dark:text-white text-sm">{{
									formatDate(result.redeemedAt) }}</p>
							</div>
						</div>
					</div>

					<button @click="resetState"
						class="w-full py-3 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-sm">
						{{ $t('redeem.validate_another') }}
					</button>
				</div>

				<!-- Scanner / Input Form -->
				<div v-else class="p-8 md:p-10">
					<!-- Error Message -->
					<div v-if="error"
						class="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-lg flex items-start gap-3">
						<Icon name="ph:warning-circle-fill" class="text-red-500 mt-0.5 flex-shrink-0" size="16" />
						<p class="text-red-700 dark:text-red-400 font-bold text-sm">{{ error }}</p>
					</div>

					<!-- QR Scanner -->
					<div v-if="showScanner" class="mb-8">
						<div class="relative aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-inner">
							<video id="qr-video" autoplay playsinline @play="onVideoPlay"
								class="w-full h-full object-cover"></video>

							<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div class="w-48 h-48 border-2 border-white/50 rounded-xl relative">
									<div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
									<div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white">
									</div>
									<div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white">
									</div>
									<div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white">
									</div>
								</div>
							</div>

							<button @click="stopScanning"
								class="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm">
								<Icon name="ph:x-bold" size="16" />
							</button>
						</div>

						<p class="text-center text-xs font-medium text-slate-500 dark:text-slate-400 mt-4">
							{{ $t('redeem.position_qr') }}
						</p>
					</div>

					<!-- Manual Input -->
					<div v-if="!showScanner">
						<div class="mb-6">
							<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
								{{ $t('redeem.code_label') }}
							</label>
							<div class="relative">
								<input v-model="redemptionCode" @keyup.enter="handleSubmit" type="text"
									:placeholder="$t('redeem.code_placeholder')"
									class="w-full pl-4 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all uppercase"
									:disabled="loading" />
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<button @click="handleSubmit" :disabled="loading || !redemptionCode"
								class="py-3 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2">
								<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" />
								<span v-else>{{ $t('redeem.validate_button') }}</span>
							</button>

							<button @click="startScanning" :disabled="loading"
								class="py-3 px-6 bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
								<Icon name="ph:qr-code-bold" />
								{{ $t('redeem.scanner_button') }}
							</button>
						</div>
					</div>

					<!-- Instructions -->
					<div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
						<div class="flex gap-4">
							<div
								class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
								<Icon name="ph:info-bold" size="20" />
							</div>
							<div class="text-sm text-slate-600 dark:text-slate-300">
								<p class="font-bold text-slate-900 dark:text-white mb-1">{{ $t('redeem.how_it_works') }}</p>
								<p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
									{{ $t('redeem.instructions') }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<p class="text-center text-xs text-slate-400 mt-6">
				{{ $t('redeem.documentation') }}
			</p>
		</div>

	</div>
	</SubscriptionGate>
</template>
