<script setup lang="ts">
const options = defineModel<{
	fontFamily: string
	backgroundColor: string
	accentColor: string
	buttonColor: string
	footerIconColor: string
	lostColor: string
	qrColor: string
	qrBgColor: string
}>({ required: true })
</script>

<template>
	<div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 shadow-lg rounded-2xl p-2 flex items-center gap-4 animate-fade-in-up">
		<div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-xl">
			<Icon name="ph:magic-wand-bold" size="16" />
			<span class="text-xs font-bold uppercase tracking-wide">{{ $t('flyers.editor.smart_customize') }}</span>
		</div>

		<div class="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

		<div class="flex items-center gap-3">
			<!-- Font -->
			<div class="relative group" title="Police d'écriture">
				<select v-model="options.fontFamily"
					class="appearance-none pl-3 pr-8 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 dark:text-white">
					<option value="Luckiest Guy">Fun</option>
					<option value="Anton">Impact</option>
					<option value="Bangers">Comics</option>
					<option value="Righteous">Moderne</option>
				</select>
				<Icon name="ph:caret-down-bold" size="12" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
			</div>

			<div class="h-6 w-px bg-slate-200"></div>

			<!-- Color swatch helper component inline -->
			<template v-for="(item, i) in [
				{ model: 'backgroundColor', label: $t('flyers.editor.smart_bg'), title: 'Couleur de fond' },
				{ model: 'accentColor', label: $t('flyers.editor.smart_text'), title: 'Couleur des textes' },
				{ model: 'buttonColor', label: $t('flyers.editor.smart_button'), title: 'Couleur du bouton' },
				{ model: 'footerIconColor', label: 'Icônes', title: 'Couleur des icônes footer' },
				{ model: 'lostColor', label: 'Perdu', title: 'Couleur des cases Perdu' },
				{ model: 'qrColor', label: 'QR', title: 'Couleur du QR code' },
				{ model: 'qrBgColor', label: 'Fond QR', title: 'Fond du QR code' },
			]" :key="i">
				<div class="relative group cursor-pointer" :title="item.title">
					<div class="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors">
						<div class="w-6 h-6 rounded-full shadow-inner ring-1 ring-black/10 overflow-hidden relative">
							<input v-model="(options as any)[item.model]" type="color"
								class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer" />
							<div class="w-full h-full pointer-events-none"
								:style="{ backgroundColor: (options as any)[item.model] }"></div>
						</div>
						<span class="text-[10px] font-bold text-slate-500 uppercase">{{ item.label }}</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>
