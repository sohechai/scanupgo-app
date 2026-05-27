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
	<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/40 rounded-2xl px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 animate-fade-in-up">

		<!-- Badge -->
		<div class="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-xl shrink-0">
			<Icon name="ph:magic-wand-fill" size="13" />
			<span class="text-[10px] font-black uppercase tracking-widest">{{ $t('flyers.editor.smart_customize') }}</span>
		</div>

		<div class="h-5 w-px bg-slate-200 dark:bg-slate-600 shrink-0"></div>

		<!-- Font -->
		<div class="relative shrink-0">
			<select v-model="options.fontFamily"
				class="appearance-none pl-3 pr-7 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white text-slate-700 hover:bg-slate-100 transition-colors">
				<option value="Luckiest Guy">Fun</option>
				<option value="Anton">Impact</option>
				<option value="Bangers">Comics</option>
				<option value="Righteous">Moderne</option>
			</select>
			<Icon name="ph:caret-down-bold" size="10" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
		</div>

		<div class="h-5 w-px bg-slate-200 dark:bg-slate-600 shrink-0"></div>

		<!-- Color swatches -->
		<div class="flex flex-wrap items-center gap-1">
			<template v-for="(item, i) in [
				{ model: 'backgroundColor', label: $t('flyers.editor.smart_bg') },
				{ model: 'accentColor', label: $t('flyers.editor.smart_text') },
				{ model: 'buttonColor', label: $t('flyers.editor.smart_button') },
				{ model: 'footerIconColor', label: 'Icônes' },
				{ model: 'lostColor', label: 'Perdu' },
				{ model: 'qrColor', label: 'QR' },
				{ model: 'qrBgColor', label: 'Fond QR' },
			]" :key="i">
				<div class="group flex flex-col items-center gap-1 px-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer">
					<div class="relative w-6 h-6 rounded-full ring-2 ring-slate-200 dark:ring-slate-600 ring-offset-1 overflow-hidden group-hover:ring-indigo-400 transition-all shadow-sm">
						<input v-model="(options as any)[item.model]" type="color"
							class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer opacity-0" />
						<div class="w-full h-full pointer-events-none rounded-full"
							:style="{ backgroundColor: (options as any)[item.model] }"></div>
					</div>
					<span class="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{{ item.label }}</span>
				</div>
			</template>
		</div>

	</div>
</template>
