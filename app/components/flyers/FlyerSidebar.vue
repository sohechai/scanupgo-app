<script setup lang="ts">
const props = defineProps<{
	hasLogo: boolean
	hasQrCode: boolean
	convertedFromSmart?: boolean
	uploading: boolean
	loadingTemplate: boolean
	selectedTemplate: string
	templates: any[]
	mode: 'canvas' | 'smart'
	// Objet réactif partagé depuis FlyerEditor — muter ses clés se propage (même référence)
	smartOptions?: {
		fontFamily: string
		backgroundColor: string
		accentColor: string
		buttonColor: string
		footerIconColor: string
		lostColor: string
		qrColor: string
		qrBgColor: string
		qrLogo: boolean
	}
}>()

const smartSwatches = [
	{ model: 'backgroundColor', label: 'Fond' },
	{ model: 'accentColor', label: 'Texte' },
	{ model: 'buttonColor', label: 'Bouton' },
	{ model: 'footerIconColor', label: 'Icônes' },
	{ model: 'lostColor', label: 'Perdu' },
	{ model: 'qrColor', label: 'QR' },
	{ model: 'qrBgColor', label: 'Fond QR' },
]

const emit = defineEmits<{
	'add-text': []
	'add-logo': []
	'add-qr-code': []
	'center-horizontally': []
	'center-vertically': []
	'load-template': [id: string]
	'image-file-selected': [file: File]
	'flyer-file-selected': [file: File]
	'reset-colors': []
}>()

const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement>()
const flyerInputRef = ref<HTMLInputElement>()

const triggerImageUpload = () => fileInputRef.value?.click()
const triggerFlyerUpload = () => flyerInputRef.value?.click()

const onFlyerChange = (event: Event) => {
	const file = (event.target as HTMLInputElement).files?.[0]
	if (file) emit('flyer-file-selected', file)
	;(event.target as HTMLInputElement).value = ''
}

const onFileChange = (event: Event) => {
	const file = (event.target as HTMLInputElement).files?.[0]
	if (file) emit('image-file-selected', file)
	;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
	<div class="w-full xl:w-72 flex flex-col gap-6 shrink-0">

		<!-- Tools Panel -->
		<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
			<div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
				<h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
					<Icon name="ph:toolbox-fill" class="text-brand-500" />
					{{ t('flyers.editor.tools_title') }}
				</h3>
			</div>

			<!-- Outils (toujours visibles) -->
			<div class="p-3 grid grid-cols-2 gap-2">

				<!-- Importer une image — élément déplaçable (comportement standard) -->
				<button @click="triggerImageUpload" type="button" :disabled="uploading"
					class="col-span-2 flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white border border-brand-500 transition-all shadow-md shadow-brand-500/20 disabled:opacity-50 group">
					<div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon v-if="uploading" name="ph:spinner-gap-bold" size="18" class="animate-spin" />
						<Icon v-else name="ph:upload-simple-bold" size="18" />
					</div>
					<span class="text-sm font-bold">Importer une image</span>
				</button>
				<input type="file" ref="fileInputRef" @change="onFileChange" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />

				<!-- Importer mon flyer — image plein cadre, uniquement sur canvas vierge -->
				<button v-if="selectedTemplate === 'blank'" @click="triggerFlyerUpload" type="button" :disabled="uploading"
					class="col-span-2 flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-700 border border-brand-300 dark:border-slate-500 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-slate-600 transition-all disabled:opacity-50 group">
					<div class="w-8 h-8 rounded-lg bg-brand-100 dark:bg-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:image-bold" size="18" />
					</div>
					<span class="text-sm font-bold">Importer mon flyer</span>
				</button>
				<input type="file" ref="flyerInputRef" @change="onFlyerChange" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" />

				<button @click="emit('add-text')" type="button"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:text-t-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_text') }}</span>
				</button>

				<!-- Logo + QR : disponibles hors flyer intelligent -->
				<button v-if="mode !== 'smart'" @click="emit('add-logo')" type="button" :disabled="!hasLogo"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50 disabled:grayscale">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:image-square-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_logo') }}</span>
				</button>

				<button v-if="mode !== 'smart'" @click="emit('add-qr-code')" type="button" :disabled="!hasQrCode"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group disabled:opacity-50 disabled:grayscale">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:qr-code-bold" size="20" />
					</div>
					<span class="text-xs font-bold">QR Code</span>
				</button>

				<button @click="emit('center-horizontally')" type="button"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:align-center-horizontal-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_center_h') }}</span>
				</button>

				<button @click="emit('center-vertically')" type="button"
					class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white border border-transparent hover:border-brand-200 dark:hover:border-slate-500 transition-all group">
					<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
						<Icon name="ph:align-center-vertical-bold" size="20" />
					</div>
					<span class="text-xs font-bold">{{ t('flyers.editor.tool_center_v') }}</span>
				</button>

			</div>

			<!-- Personnalisation du flyer intelligent -->
			<div v-if="mode === 'smart' && smartOptions" class="p-4 space-y-4 border-t border-slate-100 dark:border-slate-700">
				<div class="flex items-center gap-2 text-brand-600 dark:text-brand-400">
					<Icon name="ph:magic-wand-fill" size="15" />
					<span class="text-xs font-bold uppercase tracking-wide">{{ $t('flyers.editor.smart_customize') }}</span>
				</div>
				<!-- Police -->
				<div>
					<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Police</label>
					<div class="relative">
						<select v-model="smartOptions.fontFamily"
							class="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400 dark:text-white text-slate-700">
							<option value="Luckiest Guy">Fun</option>
							<option value="Anton">Impact</option>
							<option value="Bangers">Comics</option>
							<option value="Righteous">Moderne</option>
						</select>
						<Icon name="ph:caret-down-bold" size="12" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
					</div>
				</div>
				<!-- Couleurs -->
				<div>
					<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Couleurs</label>
					<div class="grid grid-cols-4 gap-2">
						<div v-for="item in smartSwatches" :key="item.model" class="flex flex-col items-center gap-1">
							<div class="relative w-9 h-9 rounded-full ring-2 ring-slate-200 dark:ring-slate-600 ring-offset-1 overflow-hidden shadow-sm">
								<input v-model="(smartOptions as any)[item.model]" type="color"
									class="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 p-0 border-0 cursor-pointer opacity-0" />
								<div class="w-full h-full pointer-events-none rounded-full" :style="{ backgroundColor: (smartOptions as any)[item.model] }"></div>
							</div>
							<span class="text-[8px] font-bold text-slate-400 uppercase tracking-wide leading-none text-center">{{ item.label }}</span>
						</div>
					</div>
					<!-- Revenir aux couleurs de la marque -->
					<button @click="emit('reset-colors')" type="button"
						class="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors">
						<Icon name="ph:arrow-counter-clockwise-bold" size="12" />
						Couleurs de la marque
					</button>
				</div>
				<!-- Option : logo au centre du QR -->
				<label v-if="hasLogo" class="flex items-center justify-between gap-2 cursor-pointer">
					<span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Logo dans le QR</span>
					<input v-model="smartOptions.qrLogo" type="checkbox" class="sr-only peer">
					<div class="relative w-9 h-5 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-brand-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
				</label>
			</div>
		</div>

		<!-- Templates Panel -->
		<div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1">
			<div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
				<h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
					<Icon name="ph:stack-fill" class="text-brand-500" />
					{{ t('flyers.editor.templates_title') }}
				</h3>
			</div>
			<div class="p-4 h-64 xl:h-auto overflow-y-auto custom-scrollbar space-y-3">
				<button v-for="template in templates" :key="template.id"
					@click="emit('load-template', template.id)"
					type="button" :disabled="loadingTemplate"
					:class="selectedTemplate === template.id ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/20 dark:ring-brand-400' : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'"
					class="w-full h-16 rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-3 transition-all text-left">
					<div class="h-12 w-12 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 overflow-hidden shrink-0 flex items-center justify-center">
						<img v-if="template.image" :src="template.image" class="w-full h-full object-cover" />
						<Icon v-else :name="template.icon" size="20" class="text-slate-400" :class="{ 'text-brand-500': template.isSmart }" />
					</div>
					<div class="min-w-0">
						<p class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ template.name }}</p>
						<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{{ template.description }}</p>
					</div>
					<Icon v-if="selectedTemplate === template.id" name="ph:check-circle-fill" class="ml-auto rtl:ml-0 rtl:mr-auto text-brand-500 shrink-0" />
				</button>
			</div>
		</div>

	</div>
</template>
