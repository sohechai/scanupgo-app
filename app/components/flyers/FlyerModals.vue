<script setup lang="ts">
const props = defineProps<{
	showQrModal: boolean
	gameUrl: string
	qrCodeColor: string
	qrCodeBgColor: string
	qrCodeLogoUrl: string
	showOrderModal: boolean
	orderFlyerDesignUrl: string | undefined
	showConversionModal: boolean
}>()

const emit = defineEmits<{
	'close-qr-modal': []
	'qr-update': [data: { qrCodeDataUrl: string; color: string; bgColor: string; logoUrl: string | null }]
	'qr-save': [data: { color: string; bgColor: string; logoUrl: string | null }]
	'update:showOrderModal': [value: boolean]
	'order-created': []
	'cancel-conversion': []
	'confirm-conversion': []
}>()

import QRCodeCustomizer from './QRCodeCustomizer.vue'
</script>

<template>
	<!-- QR Code Customizer Modal -->
	<Teleport to="body">
		<Transition name="modal">
			<div v-if="showQrModal"
				class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
				@click.self="emit('close-qr-modal')">
				<div
					class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
					<div
						class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
						<div class="flex items-center gap-3">
							<div
								class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
								<Icon name="ph:qr-code-bold" size="20" />
							</div>
							<div>
								<h2 class="text-lg font-bold text-slate-900 dark:text-white">Ajouter un QR Code</h2>
								<p class="text-xs text-slate-500 dark:text-slate-400">Personnalisez et ajoutez au flyer</p>
							</div>
						</div>
						<button @click="emit('close-qr-modal')"
							class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
							<Icon name="ph:x-bold" size="20" />
						</button>
					</div>
					<div class="flex-1 overflow-y-auto p-6">
						<QRCodeCustomizer
							:game-url="gameUrl"
							:initial-color="qrCodeColor"
							:initial-bg-color="qrCodeBgColor"
							:initial-logo-url="qrCodeLogoUrl"
							@update="emit('qr-update', $event)"
							@save="emit('qr-save', $event)"
						/>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>

	<!-- Order Flyers Modal -->
	<OrdersCreateOrderModal
		:model-value="showOrderModal"
		:flyer-design-url="orderFlyerDesignUrl"
		@update:model-value="emit('update:showOrderModal', $event)"
		@created="emit('order-created')"
	/>

	<!-- Smart → Canvas Conversion Confirmation Modal -->
	<Teleport to="body">
		<Transition
			enter-active-class="transition duration-150 ease-out"
			enter-from-class="opacity-0"
			enter-to-class="opacity-100"
			leave-active-class="transition duration-100 ease-in"
			leave-from-class="opacity-100"
			leave-to-class="opacity-0"
		>
			<div v-if="showConversionModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="emit('cancel-conversion')" />
				<Transition
					enter-active-class="transition duration-150 ease-out"
					enter-from-class="opacity-0 scale-95"
					enter-to-class="opacity-100 scale-100"
					leave-active-class="transition duration-100 ease-in"
					leave-from-class="opacity-100 scale-100"
					leave-to-class="opacity-0 scale-95"
				>
					<div v-if="showConversionModal"
						class="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
						role="dialog" aria-modal="true">
						<div class="h-0.5 w-full bg-indigo-500" />
						<div class="p-5">
							<div class="flex items-start gap-4 mb-4">
								<div class="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
									<Icon name="ph:magic-wand-bold" size="18" class="text-indigo-500" />
								</div>
								<div>
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white leading-snug">Convertir en canvas éditable</h3>
									<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Cette action est irréversible.</p>
								</div>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
								En convertissant, vous pourrez ajouter du texte, des logos et des éléments graphiques, mais la <span class="font-medium text-slate-700 dark:text-slate-300">modification des couleurs du template sera impossible</span>.
							</p>
							<div class="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 mb-5">
								<Icon name="ph:warning-bold" size="13" class="text-amber-500 shrink-0 mt-0.5" />
								<p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
									Effectuez d'abord toutes vos <strong>modifications de couleurs</strong> dans la barre du bas, puis revenez ajouter vos éléments.
								</p>
							</div>
							<div class="flex gap-2 justify-end">
								<button @click="emit('cancel-conversion')" type="button"
									class="px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
									Retour aux couleurs
								</button>
								<button @click="emit('confirm-conversion')" type="button"
									class="px-3.5 py-2 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-md transition-colors shadow-sm">
									Convertir quand même
								</button>
							</div>
						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
	transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
	opacity: 0;
}
</style>
