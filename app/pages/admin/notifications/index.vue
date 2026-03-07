<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const toast = useToast()
const { formatDate } = useLocaleDate()

// State
const loading = ref(true)
const sending = ref(false)
const merchants = ref<any[]>([])
const history = ref<any[]>([])

// Form
const form = ref({
	title: '',
	message: '',
	color: 'blue',
	icon: 'ph:megaphone-bold',
	targetUserIds: [] as string[],
	sendEmail: false,
})

const selectAll = ref(false)

// Color options
const colorOptions = computed(() => [
	{ value: 'blue', label: t('admin.notifications.color_blue'), class: 'bg-blue-500' },
	{ value: 'green', label: t('admin.notifications.color_green'), class: 'bg-green-500' },
	{ value: 'yellow', label: t('admin.notifications.color_yellow'), class: 'bg-yellow-500' },
	{ value: 'red', label: t('admin.notifications.color_red'), class: 'bg-red-500' },
	{ value: 'purple', label: t('admin.notifications.color_purple'), class: 'bg-purple-500' },
])

// Icon options
const iconOptions = computed(() => [
	{ value: 'ph:megaphone-bold', label: t('admin.notifications.icon_announcement') },
	{ value: 'ph:info-bold', label: t('admin.notifications.icon_info') },
	{ value: 'ph:warning-bold', label: t('admin.notifications.icon_warning') },
	{ value: 'ph:check-circle-bold', label: t('admin.notifications.icon_success') },
	{ value: 'ph:gift-bold', label: t('admin.notifications.icon_gift') },
	{ value: 'ph:star-bold', label: t('admin.notifications.icon_new') },
	{ value: 'ph:rocket-bold', label: t('admin.notifications.icon_launch') },
	{ value: 'ph:calendar-bold', label: t('admin.notifications.icon_event') },
])

// Fetch data
onMounted(async () => {
	await Promise.all([fetchMerchants(), fetchHistory()])
	loading.value = false
})

const fetchMerchants = async () => {
	try {
		merchants.value = await $api<any[]>('/admin/notifications/merchants')
	} catch (error) {
		console.error('Error fetching merchants:', error)
	}
}

const fetchHistory = async () => {
	try {
		history.value = await $api<any[]>('/admin/notifications/history')
	} catch (error) {
		console.error('Error fetching history:', error)
	}
}

// Toggle select all
watch(selectAll, (value) => {
	if (value) {
		form.value.targetUserIds = merchants.value.map(m => m.id)
	} else {
		form.value.targetUserIds = []
	}
})

// Watch individual selections to update selectAll
watch(() => form.value.targetUserIds, (value) => {
	selectAll.value = value.length === merchants.value.length && merchants.value.length > 0
}, { deep: true })

// Send notification
const handleSend = async () => {
	if (!form.value.title.trim() || !form.value.message.trim()) {
		toast.show(t('admin.notifications.title_filled'), 'error')
		return
	}

	sending.value = true
	try {
		const payload = {
			...form.value,
			targetUserIds: form.value.targetUserIds.length > 0 ? form.value.targetUserIds : undefined,
		}

		const result = await $api<{ message: string; count: number }>('/admin/notifications/send', {
			method: 'POST',
			body: payload,
		})

		toast.show(result.message, 'success')

		// Reset form
		form.value = {
			title: '',
			message: '',
			color: 'blue',
			icon: 'ph:megaphone-bold',
			targetUserIds: [],
			sendEmail: false,
		}
		selectAll.value = false

		// Refresh history
		await fetchHistory()
	} catch (error: any) {
		console.error('Error sending notification:', error)
		toast.show(error?.data?.message || t('admin.notifications.send_error'), 'error')
	} finally {
		sending.value = false
	}
}
</script>

<template>
	<div class="relative min-h-screen">
		<!-- Background Elements -->
		<div class="fixed inset-0 pointer-events-none z-0">
			<div
				class="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] opacity-30 mix-blend-screen animate-pulse-slow">
			</div>
			<div class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen animate-pulse-slow"
				style="animation-delay: 2s;"></div>
		</div>

		<div class="relative z-10 space-y-8 pb-10">
			<!-- Header -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1
						class="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
						{{ $t('admin.notifications.title') }}</h1>
					<p class="text-slate-400 text-lg">{{ $t('admin.notifications.description') }}</p>
				</div>
			</div>

			<div v-if="loading" class="flex items-center justify-center py-20">
				<Icon name="ph:spinner-gap-bold" size="40" class="text-white animate-spin" />
			</div>

			<div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-8">
				<!-- Form Section -->
				<div class="xl:col-span-2 space-y-6">
					<!-- Notification Form Card -->
					<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
						<h2 class="text-xl font-bold text-white mb-6 flex items-center gap-3">
							<div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
								<Icon name="ph:paper-plane-tilt-bold" class="text-blue-400" size="20" />
							</div>
							{{ $t('admin.notifications.new_notification') }}
						</h2>

						<div class="space-y-6">
							<!-- Title -->
							<div class="space-y-2">
								<label class="text-sm font-bold text-slate-400">{{ $t('admin.notifications.title_label') }}</label>
								<input type="text" v-model="form.title" :placeholder="$t('admin.notifications.title_placeholder')"
									class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/20 outline-none transition-all placeholder-slate-600" />
							</div>

							<!-- Message -->
							<div class="space-y-2">
								<label class="text-sm font-bold text-slate-400">{{ $t('admin.notifications.message_label') }}</label>
								<textarea v-model="form.message" rows="4"
									:placeholder="$t('admin.notifications.message_placeholder')"
									class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/20 outline-none transition-all placeholder-slate-600 resize-none"></textarea>
							</div>

							<!-- Color & Icon Row -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<!-- Color -->
								<div class="space-y-2">
									<label class="text-sm font-bold text-slate-400">{{ $t('admin.notifications.color_label') }}</label>
									<div class="flex gap-2">
										<button v-for="color in colorOptions" :key="color.value" @click="form.color = color.value"
											:class="[
												'w-10 h-10 rounded-xl transition-all',
												color.class,
												form.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-50 hover:opacity-100'
											]" :title="color.label">
										</button>
									</div>
								</div>

								<!-- Icon -->
								<div class="space-y-2">
									<label class="text-sm font-bold text-slate-400">{{ $t('admin.notifications.icon_label') }}</label>
									<div class="flex flex-wrap gap-2">
										<button v-for="icon in iconOptions" :key="icon.value" @click="form.icon = icon.value" :class="[
											'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
											form.icon === icon.value
												? 'bg-white/20 ring-2 ring-white/50 text-white'
												: 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
										]" :title="icon.label">
											<Icon :name="icon.value" size="20" />
										</button>
									</div>
								</div>
							</div>

							<!-- Preview -->
							<div class="space-y-2">
								<label class="text-sm font-bold text-slate-400">{{ $t('admin.notifications.preview_label') }}</label>
								<div class="bg-slate-800 border border-slate-700 rounded-xl p-4">
									<div class="flex items-start gap-4">
										<div :class="[
											'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
											`bg-${form.color}-500/20`
										]">
											<Icon :name="form.icon" size="20" :class="`text-${form.color}-400`" />
										</div>
										<div class="flex-1 min-w-0">
											<h4 class="text-sm font-bold text-white">
												{{ form.title || $t('admin.notifications.preview_title_default') }}
											</h4>
											<p class="text-sm text-slate-400 mt-0.5">
												{{ form.message || $t('admin.notifications.preview_message_default') }}
											</p>
										</div>
									</div>
								</div>
							</div>

							<!-- Send Email Option -->
							<label class="flex items-center gap-3 cursor-pointer group">
								<input type="checkbox" v-model="form.sendEmail"
									class="w-5 h-5 rounded bg-white/5 border border-white/10 text-blue-500 focus:ring-blue-500/20" />
								<div>
									<span class="text-white font-bold group-hover:text-blue-400 transition-colors">{{ $t('admin.notifications.email_option') }}</span>
									<p class="text-xs text-slate-500">{{ $t('admin.notifications.email_description') }}</p>
								</div>
							</label>
						</div>
					</div>

					<!-- Recipients Card -->
					<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
						<div class="flex items-center justify-between mb-6">
							<h2 class="text-xl font-bold text-white flex items-center gap-3">
								<div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
									<Icon name="ph:users-bold" class="text-purple-400" size="20" />
								</div>
								{{ $t('admin.notifications.recipients_label') }}
							</h2>
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="checkbox" v-model="selectAll"
									class="w-5 h-5 rounded bg-white/5 border border-white/10 text-blue-500 focus:ring-blue-500/20" />
								<span class="text-sm font-bold text-slate-400">{{ $t('admin.notifications.select_all') }}</span>
							</label>
						</div>

						<div v-if="merchants.length === 0"
							class="text-center py-8 text-slate-500">
							{{ $t('admin.notifications.no_merchants') }}
						</div>

						<div v-else class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
							<label v-for="merchant in merchants" :key="merchant.id"
								class="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all"
								:class="form.targetUserIds.includes(merchant.id) ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-transparent hover:bg-white/10'">
								<input type="checkbox" :value="merchant.id" v-model="form.targetUserIds"
									class="w-5 h-5 rounded bg-white/5 border border-white/10 text-blue-500 focus:ring-blue-500/20" />
								<div class="flex-1 min-w-0">
									<div class="font-bold text-white text-sm">
										{{ merchant.firstName }} {{ merchant.lastName }}
									</div>
									<div class="text-xs text-slate-500 truncate">
										{{ merchant.businessName }} • {{ merchant.email }}
									</div>
								</div>
							</label>
						</div>

						<div class="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
							<p class="text-sm text-slate-400">
								<span v-if="form.targetUserIds.length === 0" class="text-yellow-400">
									<Icon name="ph:info-bold" class="inline" /> {{ $t('admin.notifications.recipients_all') }}
								</span>
								<span v-else>
									{{ $t('admin.notifications.recipients_count', { count: form.targetUserIds.length }) }}
								</span>
							</p>
						</div>
					</div>

					<!-- Send Button -->
					<button @click="handleSend" :disabled="sending || !form.title.trim() || !form.message.trim()"
						class="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
						<Icon v-if="sending" name="ph:spinner-gap-bold" size="20" class="animate-spin" />
						<Icon v-else name="ph:paper-plane-tilt-bold" size="20" />
						{{ sending ? $t('admin.notifications.sending') : $t('admin.notifications.send_button') }}
					</button>
				</div>

				<!-- History Section -->
				<div class="space-y-6">
					<div class="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
						<h2 class="text-xl font-bold text-white mb-6 flex items-center gap-3">
							<div class="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
								<Icon name="ph:clock-counter-clockwise-bold" class="text-slate-400" size="20" />
							</div>
							{{ $t('admin.notifications.history_title') }}
						</h2>

						<div v-if="history.length === 0" class="text-center py-8 text-slate-500">
							{{ $t('admin.notifications.history_empty') }}
						</div>

						<div v-else class="space-y-3 max-h-[600px] overflow-y-auto pr-2">
							<div v-for="notif in history" :key="notif.id"
								class="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
								<div class="flex items-start gap-3">
									<div :class="[
										'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
										`bg-${notif.color || 'blue'}-500/20`
									]">
										<Icon :name="notif.icon || 'ph:bell-bold'" size="16"
											:class="`text-${notif.color || 'blue'}-400`" />
									</div>
									<div class="flex-1 min-w-0">
										<h4 class="text-sm font-bold text-white truncate">{{ notif.title }}</h4>
										<p class="text-xs text-slate-400 line-clamp-2 mt-0.5">{{ notif.message }}</p>
										<p class="text-xs text-slate-500 mt-2">{{ formatDate(notif.createdAt) }}</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.line-clamp-2 {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>
