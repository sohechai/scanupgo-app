<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

const dontShowAgain = ref(false)

const handleClose = () => {
	if (dontShowAgain.value) {
		localStorage.setItem('smart-flyer-onboarding-seen', '1')
	}
	emit('close')
}
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
			<div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
				<div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />
				<Transition
					enter-active-class="transition duration-150 ease-out"
					enter-from-class="opacity-0 scale-95"
					enter-to-class="opacity-100 scale-100"
					leave-active-class="transition duration-100 ease-in"
					leave-from-class="opacity-100 scale-100"
					leave-to-class="opacity-0 scale-95"
				>
					<div class="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
						role="dialog" aria-modal="true">

						<!-- Top accent bar -->
						<div class="h-0.5 w-full bg-indigo-500" />

						<div class="p-5">

							<!-- Header -->
							<div class="flex items-start gap-4 mb-4">
								<div class="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
									<Icon name="ph:magic-wand-bold" size="18" class="text-indigo-500" />
								</div>
								<div>
									<h3 class="text-sm font-semibold text-slate-900 dark:text-white leading-snug">Flyer Intelligent</h3>
									<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">Personnalisez votre flyer en quelques clics</p>
								</div>
							</div>

							<!-- Steps -->
							<div class="space-y-2 mb-4">

								<div class="flex items-start gap-3 px-3 py-2.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
									<span class="text-base mt-0.5 shrink-0">🎨</span>
									<div>
										<p class="text-xs font-semibold text-slate-800 dark:text-white">Vos couleurs de marque</p>
										<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">Adaptez les couleurs via la barre de personnalisation en bas.</p>
									</div>
								</div>

								<div class="flex items-start gap-3 px-3 py-2.5 rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20">
									<span class="text-base mt-0.5 shrink-0">🍟</span>
									<div>
										<p class="text-xs font-semibold text-slate-800 dark:text-white">Importez votre image produit</p>
										<p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed mt-0.5">
											Cliquez sur
											<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-600 font-medium text-[10px]">
												<Icon name="ph:image-square-bold" size="9" /> Importer une image
											</span>
											dans la barre en bas. Frites, sushis, pizza… votre visuel s'affiche sur la roue.
										</p>
									</div>
								</div>

								<div class="flex items-start gap-3 px-3 py-2.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
									<span class="text-base mt-0.5 shrink-0">🖨️</span>
									<div>
										<p class="text-xs font-semibold text-slate-800 dark:text-white">Prêt à imprimer</p>
										<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">Téléchargez en PNG ou PDF haute qualité.</p>
									</div>
								</div>

							</div>

							<!-- Actions -->
							<div class="flex items-center justify-between">
								<label class="flex items-center gap-2 cursor-pointer select-none">
									<input v-model="dontShowAgain" type="checkbox"
										class="w-3.5 h-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400 cursor-pointer" />
									<span class="text-[11px] text-slate-400 dark:text-slate-500">Ne plus afficher</span>
								</label>
								<button @click="handleClose" type="button"
									class="px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
									J'ai compris
								</button>
							</div>

						</div>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>
</template>
