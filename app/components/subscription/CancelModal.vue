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

const { user } = useAuth()
const cancellationReason = ref('')

const handleConfirm = () => emit('confirm', cancellationReason.value)

watch(() => props.show, (newVal) => {
	if (!newVal) cancellationReason.value = ''
})
</script>

<template>
	<Teleport to="body">
		<Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95"
			enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in"
			leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
			<div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center px-4"
				@click.self="emit('close')">

				<div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

				<div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

					<!-- Red accent line -->
					<div class="h-0.5 w-full bg-red-500"></div>

					<div class="p-6">
						<!-- Header -->
						<div class="flex items-start gap-3 mb-5">
							<div class="w-9 h-9 rounded-md bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
								<Icon name="ph:x-circle-fill" class="text-red-500" size="18" />
							</div>
							<div>
								<h3 class="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
									{{ $t('components.cancel_modal.title') }}
								</h3>
								<p class="text-xs text-red-500 font-medium mt-0.5">
									{{ $t('components.cancel_modal.irreversible') }}
								</p>
							</div>
						</div>

						<!-- Receipt -->
						<div class="bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700 mb-4 text-sm">
							<div class="flex justify-between items-center px-4 py-2.5">
								<span class="text-xs text-slate-400">{{ $t('components.cancel_modal.label_business') }}</span>
								<span class="text-slate-800 dark:text-slate-100 font-medium text-xs">{{ user?.business?.name || 'Mon Commerce' }}</span>
							</div>
							<div class="flex justify-between items-center px-4 py-2.5">
								<span class="text-xs text-slate-400">{{ $t('components.cancel_modal.label_plan') }}</span>
								<span class="text-slate-800 dark:text-slate-100 font-medium text-xs">{{ subscription?.plan?.name }}</span>
							</div>
							<div class="flex justify-between items-center px-4 py-2.5">
								<span class="text-xs text-slate-400">{{ $t('components.cancel_modal.label_amount') }}</span>
								<span class="text-red-500 font-semibold text-xs">{{ subscription?.price }} Dhs</span>
							</div>
						</div>

						<!-- Consequences -->
						<div class="rounded-md border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-4 mb-5 space-y-2">
							<p class="text-xs font-medium text-red-500 mb-2">En résiliant</p>
							<div class="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
								<Icon name="ph:minus-circle-fill" class="text-red-300 dark:text-red-500/50 shrink-0 mt-0.5" size="13" />
								{{ $t('components.cancel_modal.consequence_cancel') }}
							</div>
							<div class="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
								<Icon name="ph:minus-circle-fill" class="text-red-300 dark:text-red-500/50 shrink-0 mt-0.5" size="13" />
								{{ $t('components.cancel_modal.consequence_refund') }}
							</div>
							<div class="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
								<Icon name="ph:minus-circle-fill" class="text-red-300 dark:text-red-500/50 shrink-0 mt-0.5" size="13" />
								{{ $t('components.cancel_modal.consequence_access') }}
							</div>
						</div>

						<!-- Actions -->
						<div class="flex flex-col gap-2">
							<button @click="handleConfirm" :disabled="loading"
								class="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
								<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" size="14" />
								<span>{{ $t('components.cancel_modal.confirm_button') }}</span>
							</button>
							<button @click="emit('close')"
								class="w-full py-2.5 text-slate-500 dark:text-slate-400 font-medium text-sm hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
								{{ $t('components.cancel_modal.cancel_button') }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
