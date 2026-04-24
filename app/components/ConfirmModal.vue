<script setup lang="ts">
const props = defineProps<{
	modelValue: boolean
	title: string
	description?: string
	confirmText?: string
	cancelText?: string
	type?: 'danger' | 'warning' | 'info' | 'success'
	loading?: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
	'confirm': []
	'cancel': []
}>()

const close = () => {
	emit('update:modelValue', false)
	emit('cancel')
}

const confirm = () => {
	emit('confirm')
}

const config = computed(() => {
	switch (props.type) {
		case 'danger':
			return {
				bar: 'bg-red-500',
				iconBg: 'bg-red-50 dark:bg-red-900/20',
				iconColor: 'text-red-500',
				icon: 'ph:trash-bold',
				btn: 'bg-red-500 hover:bg-red-600 text-white',
			}
		case 'warning':
			return {
				bar: 'bg-amber-500',
				iconBg: 'bg-amber-50 dark:bg-amber-900/20',
				iconColor: 'text-amber-500',
				icon: 'ph:warning-bold',
				btn: 'bg-amber-500 hover:bg-amber-600 text-white',
			}
		case 'success':
			return {
				bar: 'bg-emerald-500',
				iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
				iconColor: 'text-emerald-500',
				icon: 'ph:check-circle-bold',
				btn: 'bg-emerald-500 hover:bg-emerald-600 text-white',
			}
		default:
			return {
				bar: 'bg-slate-900 dark:bg-white',
				iconBg: 'bg-slate-100 dark:bg-slate-800',
				iconColor: 'text-slate-600 dark:text-slate-300',
				icon: 'ph:info-bold',
				btn: 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900',
			}
	}
})
</script>

<template>
	<Teleport to="body">
		<Transition
			enter-active-class="transition duration-150 ease-out"
			enter-from-class="opacity-0"
			enter-to-class="opacity-100"
			leave-active-class="transition duration-100 ease-in"
			leave-from-class="opacity-100"
			leave-to-class="opacity-0"
		>
			<div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<!-- Backdrop -->
				<div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="close" />

				<!-- Modal -->
				<Transition
					enter-active-class="transition duration-150 ease-out"
					enter-from-class="opacity-0 scale-95"
					enter-to-class="opacity-100 scale-100"
					leave-active-class="transition duration-100 ease-in"
					leave-from-class="opacity-100 scale-100"
					leave-to-class="opacity-0 scale-95"
				>
					<div
						v-if="modelValue"
						class="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
						role="dialog"
						aria-modal="true"
					>
						<!-- Top accent bar -->
						<div class="h-0.5 w-full" :class="config.bar" />

						<div class="p-5">
							<!-- Icon + Text -->
							<div class="flex items-start gap-4 mb-5">
								<div class="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
									:class="[config.iconBg, config.iconColor]">
									<Icon :name="config.icon" size="18" />
								</div>
								<div>
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
										{{ title }}
									</h3>
									<p v-if="description" class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
										{{ description }}
									</p>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex gap-2 justify-end">
								<button
									@click="close"
									:disabled="loading"
									class="px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
								>
									{{ cancelText || 'Annuler' }}
								</button>
								<button
									@click="confirm"
									:disabled="loading"
									class="px-3.5 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
									:class="config.btn"
								>
									<Icon v-if="loading" name="svg-spinners:ring-resize" size="14" />
									{{ confirmText || 'Confirmer' }}
								</button>
							</div>
						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>
</template>
