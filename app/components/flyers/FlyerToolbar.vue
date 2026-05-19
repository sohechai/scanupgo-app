<script setup lang="ts">
const props = defineProps<{
	mode: 'canvas' | 'smart'
	backgroundColor: string
	textColor: string
	textFontFamily: string
	textAlign: 'left' | 'center' | 'right'
	previewing: boolean
	exporting: boolean
	saving: boolean
	orderLoading: boolean
}>()

const emit = defineEmits<{
	'update:backgroundColor': [value: string]
	'update:textColor': [value: string]
	'update:textFontFamily': [value: string]
	'change-text-align': [align: 'left' | 'center' | 'right']
	'delete': []
	'clear': []
	'preview': []
	'download-png': []
	'download-pdf': []
	'order': []
	'save': []
}>()
</script>

<template>
	<div
		class="bg-white dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap-reverse items-center justify-between gap-4">

		<!-- Canvas-only controls -->
		<div v-if="mode === 'canvas'" class="flex items-center gap-2">
			<!-- Background Color -->
			<div
				class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
				<span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">{{ $t('flyers.editor.color_bg') }}</span>
				<input :value="backgroundColor" @input="emit('update:backgroundColor', ($event.target as HTMLInputElement).value)"
					type="color" class="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent" />
			</div>

			<!-- Text Color -->
			<div
				class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
				<span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">{{ $t('flyers.editor.color_text') }}</span>
				<input :value="textColor" @input="emit('update:textColor', ($event.target as HTMLInputElement).value)"
					type="color" class="w-6 h-6 rounded border-0 p-0 cursor-pointer bg-transparent" />
			</div>

			<!-- Font Family -->
			<div
				class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
				<span class="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase">Police</span>
				<select :value="textFontFamily" @change="emit('update:textFontFamily', ($event.target as HTMLSelectElement).value)"
					class="text-xs bg-transparent border-0 outline-none cursor-pointer text-slate-700 dark:text-slate-200 max-w-[110px]">
					<option value="Luckiest Guy">Fun</option>
					<option value="Anton">Impact</option>
					<option value="Bangers">Comics</option>
					<option value="Righteous">Moderne</option>
				</select>
			</div>

			<!-- Text Alignment -->
			<div class="flex items-center bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 overflow-hidden">
				<button @click="emit('change-text-align', 'left')" type="button" title="Aligner à gauche"
					class="p-1.5 transition-colors"
					:class="textAlign === 'left' ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'">
					<Icon name="ph:text-align-left-bold" size="16" />
				</button>
				<button @click="emit('change-text-align', 'center')" type="button" title="Centrer"
					class="p-1.5 transition-colors"
					:class="textAlign === 'center' ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'">
					<Icon name="ph:text-align-center-bold" size="16" />
				</button>
				<button @click="emit('change-text-align', 'right')" type="button" title="Aligner à droite"
					class="p-1.5 transition-colors"
					:class="textAlign === 'right' ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'">
					<Icon name="ph:text-align-right-bold" size="16" />
				</button>
			</div>

			<div class="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

			<!-- Delete -->
			<button @click="emit('delete')" type="button" title="Supprimer la sélection"
				class="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
				<Icon name="ph:trash-bold" size="20" />
			</button>

			<!-- Clear -->
			<button @click="emit('clear')" type="button" title="Tout effacer"
				class="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
				<Icon name="ph:eraser-bold" size="20" />
			</button>
		</div>
		<div v-else class=""></div>

		<!-- Action buttons (always visible) -->
		<div class="flex items-center gap-2">
			<!-- Preview -->
			<button @click="emit('preview')" type="button" :disabled="previewing"
				class="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
				<Icon v-if="previewing" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
				<Icon v-else name="ph:eye-bold" size="16" />
				<span class="hidden sm:inline">{{ $t('flyers.editor.btn_preview') }}</span>
			</button>

			<!-- Download PNG -->
			<button @click="emit('download-png')" type="button"
				class="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
				<Icon name="ph:file-png-bold" size="16" />
				<span class="hidden sm:inline">PNG</span>
			</button>

			<!-- Download PDF -->
			<button @click="emit('download-pdf')" type="button"
				class="px-3 py-2 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
				<Icon name="ph:file-pdf-bold" size="16" />
				<span class="hidden sm:inline">PDF</span>
			</button>

			<!-- Order Flyers -->
			<button @click="emit('order')" type="button" :disabled="orderLoading"
				class="px-3 py-2 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
				<Icon v-if="orderLoading" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
				<Icon v-else name="ph:shopping-cart-bold" size="16" />
				<span class="hidden sm:inline">{{ orderLoading ? $t('flyers.editor.btn_ordering') : $t('flyers.editor.btn_order') }}</span>
			</button>

			<!-- Export / Save -->
			<button @click="emit('save')" type="button" :disabled="exporting || saving"
				class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-70">
				<Icon v-if="exporting || saving" name="ph:spinner-gap-bold" size="16" class="animate-spin" />
				<Icon v-else name="ph:floppy-disk-bold" size="16" />
				{{ saving ? $t('flyers.editor.btn_saving') : exporting ? $t('flyers.editor.btn_saving') : $t('flyers.editor.btn_save') }}
			</button>
		</div>
	</div>
</template>
