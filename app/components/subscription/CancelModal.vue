<script setup lang="ts">
interface Props {
	show: boolean
	subscription: any
	loading: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
	close: []
	confirm: [reason: string]
}>()

const { user } = useAuth() // Access auth store for business name

const cancellationReason = ref('')

const handleConfirm = () => {
	emit('confirm', cancellationReason.value)
}

watch(() => props.show, (newVal) => {
	if (!newVal) {
		cancellationReason.value = ''
	}
})
</script>

<template>
	<Teleport to="body">
		<Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
			enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in"
			leave-from-class="opacity-100" leave-to-class="opacity-0">
			<div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center px-4"
				@click.self="emit('close')">

				<!-- Backdrop -->
				<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md"></div>

				<!-- Modal Card -->
				<div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">

					<!-- Header (Red) -->
					<div class="bg-red-500 p-6 text-center text-white relative overflow-hidden">
						<div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
						<div class="relative z-10 flex flex-col items-center">
							<div
								class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3 backdrop-blur-sm">
								<Icon name="ph:warning-bold" class="text-white text-2xl" />
							</div>
							<h3 class="text-lg font-bold font-display mb-1">
								{{ $t('components.cancel_modal.title') }}
							</h3>
							<p class="text-white/80 text-xs font-semibold uppercase tracking-wider">
								{{ $t('components.cancel_modal.irreversible') }}
							</p>
						</div>
					</div>

					<!-- Receipt Body -->
					<div class="p-6 bg-slate-50 border-b border-slate-100">
						<div class="space-y-4">
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-500 font-medium">{{ $t('components.cancel_modal.label_business') }}</span>
								<span class="text-slate-900 font-bold">{{ user?.business?.name || 'Mon Commerce'
								}}</span>
							</div>
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-500 font-medium">{{ $t('components.cancel_modal.label_plan') }}</span>
								<span class="text-slate-900 font-bold">{{ subscription?.plan?.name || 'Premium'
								}}</span>
							</div>
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-500 font-medium">{{ $t('components.cancel_modal.label_amount') }}</span>
								<span class="text-slate-900 font-bold">{{ subscription?.price }} Dhs</span>
							</div>
						</div>
					</div>

					<!-- Consequences List -->
					<div class="p-6 bg-white">
						<h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
							{{ $t('components.cancel_modal.actions_heading') }}
						</h4>
						<ul class="space-y-3">
							<li class="flex items-start gap-3 text-sm text-slate-600">
								<Icon name="ph:check-circle-fill" class="text-red-500 mt-0.5 flex-shrink-0" />
								<span>{{ $t('components.cancel_modal.consequence_cancel') }}</span>
							</li>
							<li class="flex items-start gap-3 text-sm text-slate-600">
								<Icon name="ph:check-circle-fill" class="text-red-500 mt-0.5 flex-shrink-0" />
								<span>{{ $t('components.cancel_modal.consequence_refund') }}</span>
							</li>
							<li class="flex items-start gap-3 text-sm text-slate-600">
								<Icon name="ph:check-circle-fill" class="text-red-500 mt-0.5 flex-shrink-0" />
								<span>{{ $t('components.cancel_modal.consequence_access') }}</span>
							</li>
						</ul>
					</div>

					<!-- Actions Footer -->
					<div class="p-4 bg-slate-50 flex flex-col gap-3 border-t border-slate-100">
						<button @click="emit('close')"
							class="w-full py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm">
							{{ $t('components.cancel_modal.cancel_button') }}
						</button>

						<button @click="handleConfirm" :disabled="loading"
							class="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
							<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" />
							<span>{{ $t('components.cancel_modal.confirm_button') }}</span>
						</button>
					</div>

				</div>
			</div>
		</Transition>
	</Teleport>
</template>
