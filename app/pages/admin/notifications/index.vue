<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
const { $api } = useNuxtApp()
const toast = useToast()
const { formatDate } = useLocaleDate()

const loading = ref(true)
const sending = ref(false)
const merchants = ref<any[]>([])
const history = ref<any[]>([])

const form = ref({
	title: '',
	message: '',
	color: 'blue',
	icon: 'ph:megaphone-bold',
	targetUserIds: [] as string[],
	sendEmail: false,
})

const selectAll = ref(false)

const colorOptions = computed(() => [
	{ value: 'blue', label: t('admin.notifications.color_blue'), class: 'bg-blue-500' },
	{ value: 'green', label: t('admin.notifications.color_green'), class: 'bg-green-500' },
	{ value: 'yellow', label: t('admin.notifications.color_yellow'), class: 'bg-yellow-500' },
	{ value: 'red', label: t('admin.notifications.color_red'), class: 'bg-red-500' },
	{ value: 'purple', label: t('admin.notifications.color_purple'), class: 'bg-purple-500' },
])

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

watch(selectAll, (value) => {
	form.value.targetUserIds = value ? merchants.value.map(m => m.id) : []
})

watch(() => form.value.targetUserIds, (value) => {
	selectAll.value = value.length === merchants.value.length && merchants.value.length > 0
}, { deep: true })

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
		form.value = { title: '', message: '', color: 'blue', icon: 'ph:megaphone-bold', targetUserIds: [], sendEmail: false }
		selectAll.value = false
		await fetchHistory()
	} catch (error: any) {
		toast.show(error?.data?.message || t('admin.notifications.send_error'), 'error')
	} finally {
		sending.value = false
	}
}
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div>
			<h1 class="text-xl font-semibold text-white">{{ $t('admin.notifications.title') }}</h1>
			<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.notifications.description') }}</p>
		</div>

		<div v-if="loading" class="flex items-center justify-center py-20 text-slate-600">
			<Icon name="svg-spinners:ring-resize" size="28" />
		</div>

		<div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-5">

			<!-- Left: Form -->
			<div class="xl:col-span-2 space-y-4">

				<!-- Compose card -->
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
					<div class="px-4 py-3 border-b border-white/[0.06]">
						<h2 class="text-sm font-semibold text-white">{{ $t('admin.notifications.new_notification') }}</h2>
					</div>
					<div class="p-4 space-y-4">

						<!-- Title -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.notifications.title_label') }}</label>
							<input type="text" v-model="form.title" :placeholder="$t('admin.notifications.title_placeholder')"
								class="w-full px-3 py-2 bg-[#0d0e12] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>

						<!-- Message -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.notifications.message_label') }}</label>
							<textarea v-model="form.message" rows="4" :placeholder="$t('admin.notifications.message_placeholder')"
								class="w-full px-3 py-2 bg-[#0d0e12] border border-white/[0.07] rounded-md text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors resize-none"></textarea>
						</div>

						<!-- Color & Icon -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-2">{{ $t('admin.notifications.color_label') }}</label>
								<div class="flex gap-2">
									<button v-for="color in colorOptions" :key="color.value" @click="form.color = color.value"
										:title="color.label"
										:class="['w-7 h-7 rounded-md transition-all', color.class, form.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#161920] scale-110' : 'opacity-40 hover:opacity-80']">
									</button>
								</div>
							</div>
							<div>
								<label class="block text-xs font-medium text-slate-400 mb-2">{{ $t('admin.notifications.icon_label') }}</label>
								<div class="flex flex-wrap gap-1.5">
									<button v-for="icon in iconOptions" :key="icon.value" @click="form.icon = icon.value"
										:title="icon.label"
										:class="['w-8 h-8 rounded-md flex items-center justify-center transition-colors', form.icon === icon.value ? 'bg-white/[0.12] text-white border border-white/20' : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300 border border-transparent']">
										<Icon :name="icon.value" size="16" />
									</button>
								</div>
							</div>
						</div>

						<!-- Preview -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.notifications.preview_label') }}</label>
							<div class="bg-[#0d0e12] border border-white/[0.06] rounded-md p-3">
								<div class="flex items-start gap-3">
									<div :class="['w-8 h-8 rounded-md flex items-center justify-center shrink-0', `bg-${form.color}-500/20`]">
										<Icon :name="form.icon" size="16" :class="`text-${form.color}-400`" />
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-semibold text-white">{{ form.title || $t('admin.notifications.preview_title_default') }}</p>
										<p class="text-xs text-slate-400 mt-0.5">{{ form.message || $t('admin.notifications.preview_message_default') }}</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Email option -->
						<label class="flex items-center gap-3 cursor-pointer group">
							<input type="checkbox" v-model="form.sendEmail"
								class="w-4 h-4 rounded bg-white/[0.05] border border-white/10 text-brand-500 focus:ring-brand-500/20 accent-brand-500" />
							<div>
								<p class="text-sm text-white">{{ $t('admin.notifications.email_option') }}</p>
								<p class="text-xs text-slate-500">{{ $t('admin.notifications.email_description') }}</p>
							</div>
						</label>
					</div>
				</div>

				<!-- Recipients card -->
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
					<div class="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
						<h2 class="text-sm font-semibold text-white">{{ $t('admin.notifications.recipients_label') }}</h2>
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" v-model="selectAll"
								class="w-4 h-4 rounded bg-white/[0.05] border border-white/10 accent-brand-500" />
							<span class="text-xs text-slate-400">{{ $t('admin.notifications.select_all') }}</span>
						</label>
					</div>

					<div v-if="merchants.length === 0" class="flex flex-col items-center justify-center py-8 text-slate-600">
						<Icon name="ph:users-three-duotone" size="24" class="mb-2" />
						<p class="text-sm">{{ $t('admin.notifications.no_merchants') }}</p>
					</div>

					<div v-else class="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
						<label v-for="merchant in merchants" :key="merchant.id"
							class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
							:class="form.targetUserIds.includes(merchant.id) ? 'bg-white/[0.03]' : ''">
							<input type="checkbox" :value="merchant.id" v-model="form.targetUserIds"
								class="w-4 h-4 rounded bg-white/[0.05] border border-white/10 accent-brand-500 shrink-0" />
							<div class="flex-1 min-w-0">
								<p class="text-sm text-white">{{ merchant.firstName }} {{ merchant.lastName }}</p>
								<p class="text-xs text-slate-500 truncate">{{ merchant.businessName }} · {{ merchant.email }}</p>
							</div>
						</label>
					</div>

					<div class="px-4 py-2.5 border-t border-white/[0.04]">
						<p class="text-xs text-slate-500">
							<span v-if="form.targetUserIds.length === 0" class="text-amber-400 flex items-center gap-1">
								<Icon name="ph:info-bold" size="12" />
								{{ $t('admin.notifications.recipients_all') }}
							</span>
							<span v-else>{{ $t('admin.notifications.recipients_count', { count: form.targetUserIds.length }) }}</span>
						</p>
					</div>
				</div>

				<!-- Send button -->
				<button @click="handleSend" :disabled="sending || !form.title.trim() || !form.message.trim()"
					class="w-full py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-md hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
					<Icon v-if="sending" name="svg-spinners:ring-resize" size="15" />
					<Icon v-else name="ph:paper-plane-tilt-bold" size="15" />
					{{ sending ? $t('admin.notifications.sending') : $t('admin.notifications.send_button') }}
				</button>
			</div>

			<!-- Right: History -->
			<div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden">
					<div class="px-4 py-3 border-b border-white/[0.06]">
						<h2 class="text-sm font-semibold text-white">{{ $t('admin.notifications.history_title') }}</h2>
					</div>

					<div v-if="history.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-600">
						<Icon name="ph:clock-counter-clockwise-duotone" size="24" class="mb-2" />
						<p class="text-sm">{{ $t('admin.notifications.history_empty') }}</p>
					</div>

					<div v-else class="max-h-[600px] overflow-y-auto divide-y divide-white/[0.04]">
						<div v-for="notif in history" :key="notif.id" class="px-4 py-3 hover:bg-white/[0.02] transition-colors">
							<div class="flex items-start gap-3">
								<div :class="['w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5', `bg-${notif.color || 'blue'}-500/20`]">
									<Icon :name="notif.icon || 'ph:bell-bold'" size="14" :class="`text-${notif.color || 'blue'}-400`" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-white truncate">{{ notif.title }}</p>
									<p class="text-xs text-slate-500 line-clamp-2 mt-0.5">{{ notif.message }}</p>
									<p class="text-xs text-slate-600 mt-1.5">{{ formatDate(notif.createdAt) }}</p>
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
