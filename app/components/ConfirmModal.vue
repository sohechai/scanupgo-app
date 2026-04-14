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
				icon: 'ph:x-circle-fill',
				iconBg: 'bg-red-50 dark:bg-red-500/10 text-red-500 border-red-100 dark:border-red-500/20',
				button: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-500/20'
			}
		case 'warning':
			return {
				icon: 'ph:warning-fill',
				iconBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 border-amber-100 dark:border-amber-500/20',
				button: 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-amber-500/20'
			}
		case 'success':
			return {
				icon: 'ph:check-circle-fill',
				iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border-emerald-100 dark:border-emerald-500/20',
				button: 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20'
			}
		default: // info
			return {
				icon: 'ph:info-fill',
				iconBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500 border-blue-100 dark:border-blue-500/20',
				button: 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-slate-900/10'
			}
	}
})
</script>

<template>
	<Teleport to="body">
		<Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95"
			enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in"
			leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
			<div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
				<!-- Backdrop -->
				<div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

				<!-- Modal -->
				<div class="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60"
					role="dialog" aria-modal="true">

					<!-- Accent bar -->
					<div class="h-1 w-full" :class="{
						'bg-gradient-to-r from-red-500 to-rose-600': type === 'danger',
						'bg-gradient-to-r from-amber-400 to-orange-500': type === 'warning',
						'bg-gradient-to-r from-emerald-500 to-green-600': type === 'success',
						'bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-400 dark:to-slate-200': !type || type === 'info',
					}"></div>

					<div class="p-7">
						<div class="flex items-start gap-4 mb-6">
							<!-- Icon -->
							<div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
								:class="getTypeClasses.iconBg">
								<Icon :name="getTypeClasses.icon" size="22" />
							</div>
							<!-- Content -->
							<div class="pt-0.5">
								<h3 class="text-base font-bold text-slate-900 dark:text-white leading-tight">
									{{ title }}
								</h3>
								<p v-if="description"
									class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
									{{ description }}
								</p>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex flex-col gap-2">
							<button @click="confirm" :disabled="loading"
								class="w-full py-2.5 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
								:class="getTypeClasses.button">
								<Icon v-if="loading" name="ph:spinner-gap-bold" class="animate-spin" size="16" />
								{{ confirmText || 'Confirmer' }}
							</button>
							<button @click="close" :disabled="loading"
								class="w-full py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
								{{ cancelText || 'Annuler' }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
