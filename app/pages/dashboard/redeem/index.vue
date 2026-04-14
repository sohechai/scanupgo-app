<script setup lang="ts">
definePageMeta({
	layout: 'dashboard',
	middleware: 'auth'
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const { fetchSubscription } = useSubscription()
const { formatDate } = useLocaleDate()

const redemptionCode = ref('')
const loading = ref(false)
const scanning = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)
const activeMode = ref<'manual' | 'scan'>('manual')
const stream = ref<MediaStream | null>(null)

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
			body: { redemptionCode: code.toUpperCase() }
		})
		result.value = response
		redemptionCode.value = ''
	} catch (err: any) {
		error.value = err?.data?.message || t('redeem.error')
	} finally {
		loading.value = false
	}
}

const handleSubmit = () => validateCode(redemptionCode.value)

const startScanning = async () => {
	scanning.value = true
	error.value = null
	try {
		stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
		await nextTick()
		const video = document.getElementById('qr-video') as HTMLVideoElement
		if (video && stream.value) video.srcObject = stream.value
	} catch (err) {
		error.value = t('dashboard.quick_validate.error')
		scanning.value = false
	}
}

const stopScanning = () => {
	stream.value?.getTracks().forEach(t => t.stop())
	stream.value = null
	scanning.value = false
}

const scanQRCode = async () => {
	const video = document.getElementById('qr-video') as HTMLVideoElement
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	if (!video || !context) return
	canvas.width = video.videoWidth
	canvas.height = video.videoHeight
	context.drawImage(video, 0, 0, canvas.width, canvas.height)
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
	if (typeof window !== 'undefined' && (window as any).jsQR) {
		const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height)
		if (code) { stopScanning(); await validateCode(code.data) }
	}
}

const onVideoPlay = () => {
	const scanInterval = setInterval(() => {
		if (!scanning.value) { clearInterval(scanInterval); return }
		scanQRCode()
	}, 300)
}

const switchMode = (mode: 'manual' | 'scan') => {
	if (activeMode.value === 'scan' && mode === 'manual') stopScanning()
	activeMode.value = mode
	error.value = null
	if (mode === 'scan') startScanning()
}

const resetState = () => {
	result.value = null
	error.value = null
	redemptionCode.value = ''
}

onUnmounted(() => stopScanning())
onMounted(() => fetchSubscription())
</script>

<template>
	<SubscriptionGate>
	<div class="max-w-lg mx-auto px-0 pt-2 pb-16">

		<!-- ══ SUCCESS STATE ══ -->
		<Transition
			enter-active-class="transition duration-300 ease-out"
			enter-from-class="opacity-0 translate-y-3"
			enter-to-class="opacity-100 translate-y-0">
		<div v-if="result">

			<!-- Status header -->
			<div class="flex items-center gap-3 mb-5">
				<div class="w-10 h-10 rounded-xl bg-[#34C759]/15 flex items-center justify-center shrink-0">
					<Icon name="ph:check-bold" class="text-[#34C759]" size="18" />
				</div>
				<div>
					<p class="font-bold text-slate-900 dark:text-white text-[15px] leading-tight">{{ $t('redeem.success') }}</p>
					<p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('redeem.success_message') }}</p>
				</div>
				<div class="ml-auto">
					<span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
						{{ $t('redeem.validated') }}
					</span>
				</div>
			</div>

			<!-- Receipt card -->
			<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden mb-4">

				<!-- Prize header -->
				<div class="px-5 py-4 border-b border-[#E5E5EA] dark:border-slate-700/40 flex items-center justify-between">
					<div>
						<p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{{ $t('redeem.prize_won') }}</p>
						<p class="text-[15px] font-bold text-slate-900 dark:text-white">{{ result.prize?.name }}</p>
					</div>
					<div class="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
						<Icon name="ph:gift-bold" class="text-slate-400 dark:text-slate-500" size="16" />
					</div>
				</div>

				<!-- Info rows -->
				<div class="divide-y divide-[#E5E5EA] dark:divide-slate-700/40">

					<div class="flex items-center gap-3.5 px-5 py-3.5">
						<div class="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
							<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">
								{{ (result.player?.firstName?.[0] || '') + (result.player?.lastName?.[0] || '') }}
							</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{{ $t('redeem.player') }}</p>
							<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ result.player?.firstName }} {{ result.player?.lastName }}</p>
							<p v-if="result.player?.phone" class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ result.player.phone }}</p>
						</div>
					</div>

					<div class="flex items-center gap-3.5 px-5 py-3.5">
						<div class="w-8 h-8 rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
							<Icon name="ph:calendar-check" class="text-slate-400 dark:text-slate-500" size="14" />
						</div>
						<div>
							<p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{{ $t('redeem.validation_date') }}</p>
							<p class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(result.redeemedAt) }}</p>
						</div>
					</div>

				</div>
			</div>

			<button @click="resetState"
				class="w-full py-3.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-[#007AFF]/20">
				{{ $t('redeem.validate_another') }}
			</button>
		</div>
		</Transition>

		<!-- ══ INPUT STATE ══ -->
		<template v-if="!result">

			<!-- Page title -->
			<div class="mb-5">
				<h1 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('redeem.title') }}</h1>
				<p class="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{{ $t('redeem.subtitle') }}</p>
			</div>

			<!-- Error -->
			<Transition
				enter-active-class="transition duration-200 ease-out"
				enter-from-class="opacity-0 -translate-y-1"
				enter-to-class="opacity-100 translate-y-0">
			<div v-if="error" class="flex items-center gap-2.5 bg-[#FF3B30]/8 border border-[#FF3B30]/20 rounded-xl px-4 py-3 mb-4">
				<Icon name="ph:warning-circle-fill" class="text-[#FF3B30] shrink-0" size="16" />
				<p class="text-[#FF3B30] font-medium text-sm">{{ error }}</p>
			</div>
			</Transition>

			<!-- Mode segmented control -->
			<div class="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl p-1 flex gap-1 mb-4">
				<button
					@click="switchMode('manual')"
					:class="[
						'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
						activeMode === 'manual'
							? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
							: 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
					]">
					<Icon name="ph:keyboard-bold" size="15" />
					{{ $t('redeem.mode_manual') }}
				</button>
				<button
					@click="switchMode('scan')"
					:class="[
						'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
						activeMode === 'scan'
							? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-sm'
							: 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
					]">
					<Icon name="ph:qr-code-bold" size="15" />
					{{ $t('redeem.mode_scan') }}
				</button>
			</div>

			<!-- MANUAL MODE -->
			<template v-if="activeMode === 'manual'">
				<div class="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E5EA] dark:border-slate-700/40 overflow-hidden mb-3">
					<div class="px-5 pt-5 pb-5">
						<label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
							{{ $t('redeem.code_label') }}
						</label>
						<input
							v-model="redemptionCode"
							@keyup.enter="handleSubmit"
							type="text"
							:placeholder="$t('redeem.code_placeholder')"
							class="w-full bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl px-4 py-4 text-slate-900 dark:text-white font-mono font-bold text-2xl placeholder-slate-300 dark:placeholder-slate-600 outline-none uppercase tracking-[0.25em] transition-all focus:ring-2 focus:ring-[#007AFF]/30 border-0 text-center"
							:disabled="loading"
							autocomplete="off"
							autocorrect="off"
							autocapitalize="characters"
							spellcheck="false"
						/>
					</div>
				</div>

				<button
					@click="handleSubmit"
					:disabled="loading || !redemptionCode"
					class="w-full py-3.5 bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] text-white font-semibold rounded-xl transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF]/20">
					<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
					<span v-else>{{ $t('redeem.validate_button') }}</span>
				</button>

				<div class="flex items-start gap-2.5 px-1 mt-4">
					<Icon name="ph:info" class="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" size="14" />
					<p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{{ $t('redeem.instructions') }}</p>
				</div>
			</template>

			<!-- SCAN MODE -->
			<template v-if="activeMode === 'scan'">
				<div class="bg-black rounded-2xl overflow-hidden border border-[#E5E5EA] dark:border-slate-700/40">
					<div class="relative aspect-square">
						<video id="qr-video" autoplay playsinline @play="onVideoPlay"
							class="w-full h-full object-cover opacity-90"></video>

						<!-- Overlay -->
						<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div class="absolute inset-0 bg-black/40"></div>
							<div class="relative z-10 w-56 h-56">
								<div class="absolute inset-0 rounded-xl ring-1 ring-white/15"></div>
								<div class="absolute top-0 left-0 w-6 h-6 border-t-[2.5px] border-l-[2.5px] border-white rounded-tl-xl"></div>
								<div class="absolute top-0 right-0 w-6 h-6 border-t-[2.5px] border-r-[2.5px] border-white rounded-tr-xl"></div>
								<div class="absolute bottom-0 left-0 w-6 h-6 border-b-[2.5px] border-l-[2.5px] border-white rounded-bl-xl"></div>
								<div class="absolute bottom-0 right-0 w-6 h-6 border-b-[2.5px] border-r-[2.5px] border-white rounded-br-xl"></div>
								<div class="absolute left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#007AFF] to-transparent top-1/2 shadow-[0_0_10px_rgba(0,122,255,0.8)]"></div>
							</div>
						</div>
					</div>
					<div class="px-5 py-3.5 bg-[#111] flex items-center gap-2.5">
						<Icon name="ph:qr-code" class="text-slate-500 shrink-0" size="14" />
						<p class="text-xs text-slate-500">{{ $t('redeem.position_qr') }}</p>
					</div>
				</div>
			</template>

		</template>

	</div>
	</SubscriptionGate>
</template>
