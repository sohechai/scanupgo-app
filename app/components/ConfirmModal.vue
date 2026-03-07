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

const getTypeClasses = computed(() => {
	switch (props.type) {
		case 'danger':
			return {
				icon: 'ph:warning-circle-bold',
				iconBg: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
				button: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
			}
		case 'warning':
			return {
				icon: 'ph:warning-bold',
				iconBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
				button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
			}
		case 'success':
			return {
				icon: 'ph:check-circle-bold',
				iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
				button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
			}
		default: // info
			return {
				icon: 'ph:info-bold',
				iconBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
				button: 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-slate-900/10'
			}
	}
})
</script>

<template>
	<Teleport to="body">
		<Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
			enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in"
			leave-from-class="opacity-100" leave-to-class="opacity-0">
			<div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<!-- Backdrop -->
				<div class="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-sm" @click="close"></div>

				<!-- Modal -->
				<div class="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden transform transition-all"
					role="dialog" aria-modal="true">

					<div class="p-6">
						<div class="flex flex-col items-center text-center gap-4">
							<!-- Icon -->
							<div class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
								:class="getTypeClasses.iconBg">
								<Icon :name="getTypeClasses.icon" size="24" />
							</div>

							<!-- Content -->
							<div class="space-y-2">
								<h3 class="text-lg font-bold text-slate-900 dark:text-white">
									{{ title }}
								</h3>
								<p v-if="description"
									class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
									{{ description }}
								</p>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="p-6 pt-0 grid grid-cols-2 gap-3">
						<button @click="close" :disabled="loading"
							class="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
							{{ cancelText || 'Annuler' }}
						</button>
						<button @click="confirm" :disabled="loading"
							class="px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-lg shadow-current/20 flex items-center justify-center gap-2"
							:class="getTypeClasses.button">
							<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
							{{ confirmText || 'Confirmer' }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
