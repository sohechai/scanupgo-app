<script setup lang="ts">
const props = defineProps<{
	modelValue?: string | null
	label?: string
	accept?: string
	maxSize?: number // in MB
	preview?: boolean
	uploadType?: 'logo' | 'background' | 'image' // Type of upload
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string | null]
}>()

const { $api } = useNuxtApp()
const { show: showToast } = useToast()
const { t } = useI18n()

const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

const currentUrl = computed(() => props.modelValue || null)

const handleFileSelect = async (event: Event) => {
	const target = event.target as HTMLInputElement
	const file = target.files?.[0]

	if (!file) return

	// Validate file size
	const maxSizeBytes = (props.maxSize || 5) * 1024 * 1024
	if (file.size > maxSizeBytes) {
		error.value = t('components.file_upload.error_too_large', { size: props.maxSize || 5 })
		showToast(error.value, 'error')
		return
	}

	// Validate file type
	if (props.accept && !file.type.match(props.accept)) {
		error.value = t('components.file_upload.error_wrong_type')
		showToast(error.value, 'error')
		return
	}

	error.value = null
	uploading.value = true

	try {
		const formData = new FormData()
		formData.append('file', file)

		// Determine endpoint based on upload type
		const endpoint = props.uploadType ? `/uploads/${props.uploadType}` : '/uploads/image'

		const response = await $api<{ url: string }>(endpoint, {
			method: 'POST',
			body: formData
		})

		emit('update:modelValue', response.url)
		showToast(t('components.file_upload.success'), 'success')
	} catch (e: any) {
		console.error('Upload error:', e)
		error.value = e?.data?.message || t('components.file_upload.error_upload')
		showToast(error.value, 'error')
	} finally {
		uploading.value = false
	}
}

const triggerFileInput = () => {
	fileInput.value?.click()
}

const removeFile = () => {
	emit('update:modelValue', null)
	if (fileInput.value) {
		fileInput.value.value = ''
	}
}
</script>

<template>
	<div class="space-y-2">
		<label v-if="label" class="block text-sm font-bold text-slate-700">
			{{ label }}
		</label>

		<div class="flex items-start gap-4">
			<!-- Preview -->
			<div v-if="preview && currentUrl" class="flex-shrink-0">
				<div class="w-24 h-24 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50">
					<img :src="currentUrl" alt="Preview" class="w-full h-full object-cover" />
				</div>
			</div>

			<!-- Upload area -->
			<div class="flex-1">
				<input
					ref="fileInput"
					type="file"
					:accept="accept || 'image/*'"
					@change="handleFileSelect"
					class="hidden"
				/>

				<div
					v-if="!currentUrl"
					@click="triggerFileInput"
					class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-all"
					:class="{ 'opacity-50 pointer-events-none': uploading }"
				>
					<Icon
						v-if="!uploading"
						name="ph:upload-simple-bold"
						size="32"
						class="mx-auto mb-2 text-slate-400"
					/>
					<Icon
						v-else
						name="ph:spinner-gap-bold"
						size="32"
						class="mx-auto mb-2 text-brand-600 animate-spin"
					/>

					<p class="text-sm font-bold text-slate-700">
						{{ uploading ? $t('components.file_upload.uploading') : $t('components.file_upload.click_to_choose') }}
					</p>
					<p class="text-xs text-slate-500 mt-1">
						{{ accept ? accept.replace('image/', '').toUpperCase() : 'Images' }}
						- Max {{ maxSize || 5 }}MB
					</p>
				</div>

				<div v-else class="flex items-center gap-3">
					<button
						@click="triggerFileInput"
						type="button"
						class="px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
					>
						{{ $t('components.file_upload.change') }}
					</button>
					<button
						@click="removeFile"
						type="button"
						class="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
					>
						<Icon name="ph:trash-bold" size="20" />
					</button>
				</div>
			</div>
		</div>

		<!-- Error message -->
		<p v-if="error" class="text-sm text-red-600 font-medium">
			{{ error }}
		</p>
	</div>
</template>
