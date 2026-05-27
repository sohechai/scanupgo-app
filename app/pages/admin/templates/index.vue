<script setup lang="ts">
definePageMeta({
	layout: 'admin',
	middleware: ['admin']
})

const { t } = useI18n()
useHead({ title: t('admin.templates.title') })

const { $api } = useNuxtApp()

// ——— TABS ———
const activeTab = ref<'flyers' | 'themes'>('flyers')

// ——— FLYER TEMPLATES ———
const loading = ref(true)
const templates = ref<any[]>([])

const showModal = ref(false)
const editingTemplate = ref<any>(null)
const modalForm = ref({ name: '', description: '', imageUrl: '' })
const uploading = ref(false)
const saving = ref(false)
const uploadError = ref('')

const MAX_SIZE_MB = 3
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg']

const showDeleteModal = ref(false)
const deletingTemplate = ref<any>(null)
const deleting = ref(false)

const previewTemplate = ref<any>(null)

const activeCount = computed(() => templates.value.filter(t => t.active).length)
const inactiveCount = computed(() => templates.value.filter(t => !t.active).length)

const fetchTemplates = async () => {
	loading.value = true
	try {
		templates.value = await $api<any[]>('/admin/templates')
	} catch (error) {
		console.error('Failed to fetch templates:', error)
	} finally {
		loading.value = false
	}
}

const openCreateModal = () => {
	editingTemplate.value = null
	modalForm.value = { name: '', description: '', imageUrl: '' }
	uploadError.value = ''
	showModal.value = true
}

const openEditModal = (template: any) => {
	editingTemplate.value = template
	modalForm.value = { name: template.name, description: template.description || '', imageUrl: template.imageUrl }
	uploadError.value = ''
	showModal.value = true
}

const handleFileUpload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (!input.files?.length) return
	const file = input.files[0]
	uploadError.value = ''
	if (!ACCEPTED_TYPES.includes(file.type)) {
		uploadError.value = t('admin.templates.modal_error_type')
		input.value = ''
		return
	}
	if (file.size > MAX_SIZE_BYTES) {
		const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
		uploadError.value = t('admin.templates.modal_error_size', { size: sizeMb })
		input.value = ''
		return
	}
	uploading.value = true
	try {
		const formData = new FormData()
		formData.append('file', file)
		const response = await $api<{ url: string }>('/uploads', { method: 'POST', body: formData })
		modalForm.value.imageUrl = response.url
	} catch (error) {
		uploadError.value = t('admin.templates.modal_error_upload')
		console.error('Upload failed:', error)
	} finally {
		uploading.value = false
	}
}

const saveTemplate = async () => {
	if (!modalForm.value.name || !modalForm.value.imageUrl) return
	saving.value = true
	try {
		if (editingTemplate.value) {
			await $api(`/admin/templates/${editingTemplate.value.id}`, { method: 'PUT', body: modalForm.value })
		} else {
			await $api('/admin/templates', { method: 'POST', body: modalForm.value })
		}
		showModal.value = false
		await fetchTemplates()
	} catch (error) {
		console.error('Save failed:', error)
	} finally {
		saving.value = false
	}
}

const confirmDelete = (template: any) => {
	deletingTemplate.value = template
	showDeleteModal.value = true
}

const deleteTemplate = async () => {
	if (!deletingTemplate.value) return
	deleting.value = true
	try {
		await $api(`/admin/templates/${deletingTemplate.value.id}`, { method: 'DELETE' })
		showDeleteModal.value = false
		await fetchTemplates()
	} catch (error) {
		console.error('Delete failed:', error)
	} finally {
		deleting.value = false
	}
}

const toggleActive = async (template: any) => {
	try {
		await $api(`/admin/templates/${template.id}`, { method: 'PUT', body: { active: !template.active } })
		await fetchTemplates()
	} catch (error) {
		console.error('Toggle failed:', error)
	}
}

// ——— BACKGROUND THEMES ———
const themesLoading = ref(true)
const themes = ref<any[]>([])
const showThemeModal = ref(false)
const editingTheme = ref<any>(null)
const themeForm = ref({ name: '', value: '', type: 'gradient' })
const themeUploading = ref(false)
const themeSaving = ref(false)
const themeUploadError = ref('')
const showDeleteThemeModal = ref(false)
const deletingTheme = ref<any>(null)
const deletingThemeInProgress = ref(false)

const themeActiveCount = computed(() => themes.value.filter(th => th.active).length)
const themeInactiveCount = computed(() => themes.value.filter(th => !th.active).length)

const fetchThemes = async () => {
	themesLoading.value = true
	try {
		themes.value = await $api<any[]>('/admin/background-themes')
	} catch (error) {
		console.error('Failed to fetch themes:', error)
	} finally {
		themesLoading.value = false
	}
}

const openCreateThemeModal = () => {
	editingTheme.value = null
	themeForm.value = { name: '', value: '', type: 'gradient' }
	themeUploadError.value = ''
	showThemeModal.value = true
}

const openEditThemeModal = (theme: any) => {
	editingTheme.value = theme
	themeForm.value = { name: theme.name, value: theme.value, type: theme.type }
	themeUploadError.value = ''
	showThemeModal.value = true
}

const handleThemeImageUpload = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (!input.files?.length) return
	const file = input.files[0]
	themeUploadError.value = ''
	if (file.size > 5 * 1024 * 1024) {
		themeUploadError.value = t('admin.templates.modal_error_size', { size: '5' })
		input.value = ''
		return
	}
	themeUploading.value = true
	try {
		const formData = new FormData()
		formData.append('file', file)
		const response = await $api<{ url: string }>('/uploads', { method: 'POST', body: formData })
		themeForm.value.value = response.url
	} catch {
		themeUploadError.value = t('admin.templates.modal_error_upload')
	} finally {
		themeUploading.value = false
	}
}

const saveTheme = async () => {
	if (!themeForm.value.name || !themeForm.value.value) return
	themeSaving.value = true
	try {
		if (editingTheme.value) {
			await $api(`/admin/background-themes/${editingTheme.value.id}`, { method: 'PUT', body: themeForm.value })
		} else {
			await $api('/admin/background-themes', { method: 'POST', body: themeForm.value })
		}
		showThemeModal.value = false
		await fetchThemes()
	} catch (error) {
		console.error('Save theme failed:', error)
	} finally {
		themeSaving.value = false
	}
}

const confirmDeleteTheme = (theme: any) => {
	deletingTheme.value = theme
	showDeleteThemeModal.value = true
}

const deleteTheme = async () => {
	if (!deletingTheme.value) return
	deletingThemeInProgress.value = true
	try {
		await $api(`/admin/background-themes/${deletingTheme.value.id}`, { method: 'DELETE' })
		showDeleteThemeModal.value = false
		await fetchThemes()
	} catch (error) {
		console.error('Delete theme failed:', error)
	} finally {
		deletingThemeInProgress.value = false
	}
}

const toggleThemeActive = async (theme: any) => {
	try {
		await $api(`/admin/background-themes/${theme.id}`, { method: 'PUT', body: { active: !theme.active } })
		await fetchThemes()
	} catch (error) {
		console.error('Toggle failed:', error)
	}
}

onMounted(() => {
	fetchTemplates()
	fetchThemes()
})
</script>

<template>
	<div class="space-y-5 pb-8">

		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold text-white">{{ $t('admin.templates.title') }}</h1>
				<p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.templates.description') }}</p>
			</div>
			<button @click="activeTab === 'flyers' ? openCreateModal() : openCreateThemeModal()"
				class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
				<Icon name="ph:plus-bold" size="15" />
				{{ $t('admin.templates.add_button') }}
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex gap-1 bg-white/[0.04] border border-white/[0.07] p-1 rounded-lg w-fit">
			<button @click="activeTab = 'flyers'"
				:class="activeTab === 'flyers' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'"
				class="px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2">
				<Icon name="ph:newspaper-bold" size="15" />
				{{ $t('admin.templates.tab_flyers') }}
			</button>
			<button @click="activeTab = 'themes'"
				:class="activeTab === 'themes' ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'"
				class="px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2">
				<Icon name="ph:paint-bucket-bold" size="15" />
				{{ $t('admin.templates.tab_themes') }}
			</button>
		</div>

		<!-- ===== FLYERS TAB ===== -->
		<div v-show="activeTab === 'flyers'">
			<!-- Stats -->
			<div v-if="!loading && templates.length > 0" class="grid grid-cols-3 gap-4 mb-5">
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.templates.stats_total') }}</p>
					<p class="text-2xl font-semibold text-white tabular-nums">{{ templates.length }}</p>
				</div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.templates.stats_active') }}</p>
					<p class="text-2xl font-semibold text-emerald-400 tabular-nums">{{ activeCount }}</p>
				</div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.templates.stats_inactive') }}</p>
					<p class="text-2xl font-semibold text-slate-400 tabular-nums">{{ inactiveCount }}</p>
				</div>
			</div>

			<!-- Loading Skeleton -->
			<div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
				<div v-for="i in 5" :key="i" class="bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden animate-pulse">
					<div class="aspect-[3/4] bg-white/[0.06]"></div>
					<div class="p-3 space-y-2">
						<div class="h-3 bg-white/[0.06] rounded w-20"></div>
						<div class="h-3 bg-white/[0.06] rounded w-28"></div>
					</div>
				</div>
			</div>

			<!-- Templates Grid -->
			<div v-else-if="templates.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
				<div v-for="template in templates" :key="template.id"
					class="group relative bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden transition-all hover:border-white/[0.14]"
					:class="{ 'opacity-50': !template.active }">
					<div class="relative aspect-[3/4] bg-slate-900 overflow-hidden cursor-pointer" @click="previewTemplate = template">
						<img :src="template.imageUrl" :alt="template.name"
							class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
						<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
							<div class="flex gap-1.5">
								<button @click.stop="openEditModal(template)"
									class="flex-1 px-2 py-1.5 bg-white/90 hover:bg-white text-black rounded text-xs font-medium transition-colors flex items-center justify-center gap-1">
									<Icon name="ph:pencil-simple-bold" size="12" />
									{{ $t('admin.templates.edit_modal') }}
								</button>
								<button @click.stop="confirmDelete(template)"
									class="px-2.5 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded text-xs transition-colors flex items-center justify-center">
									<Icon name="ph:trash-bold" size="12" />
								</button>
							</div>
						</div>
						<div class="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 border border-white/[0.1] rounded text-white text-[10px] font-medium">
							#{{ template.sortOrder }}
						</div>
						<div class="absolute top-2 right-2">
							<button @click.stop="toggleActive(template)"
								class="px-2 py-0.5 rounded text-[10px] font-medium transition-colors border flex items-center gap-1"
								:class="template.active
									? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
									: 'bg-black/50 text-slate-400 border-white/[0.1] hover:bg-black/70'">
								<span class="w-1.5 h-1.5 rounded-full" :class="template.active ? 'bg-emerald-400' : 'bg-slate-500'"></span>
								{{ template.active ? $t('admin.templates.active') : $t('admin.templates.inactive') }}
							</button>
						</div>
					</div>
					<div class="p-3">
						<p class="text-sm font-medium text-white truncate">{{ template.name }}</p>
						<p v-if="template.description" class="text-xs text-slate-500 truncate mt-0.5">{{ template.description }}</p>
						<p v-else class="text-xs text-slate-600 italic mt-0.5">{{ $t('admin.templates.no_description') }}</p>
					</div>
				</div>
				<button @click="openCreateModal"
					class="aspect-[3/4] bg-[#161920] border-2 border-dashed border-white/[0.07] rounded-lg flex flex-col items-center justify-center gap-2 transition-colors hover:border-white/[0.2] hover:bg-[#1a1f2a] cursor-pointer">
					<div class="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
						<Icon name="ph:plus-bold" class="text-slate-500" size="20" />
					</div>
					<span class="text-xs font-medium text-slate-500">{{ $t('admin.templates.add_button') }}</span>
				</button>
			</div>

			<!-- Empty State -->
			<div v-else class="flex flex-col items-center justify-center py-16 text-slate-600">
				<Icon name="ph:images-duotone" size="36" class="mb-3" />
				<p class="text-sm font-medium text-slate-400 mb-1">{{ $t('admin.templates.no_templates') }}</p>
				<p class="text-xs text-slate-600 mb-4 text-center max-w-xs">{{ $t('admin.templates.no_templates_description') }}</p>
				<button @click="openCreateModal"
					class="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="14" />
					{{ $t('admin.templates.add_first') }}
				</button>
			</div>
		</div>

		<!-- ===== THEMES TAB ===== -->
		<div v-show="activeTab === 'themes'">
			<!-- Stats -->
			<div v-if="!themesLoading && themes.length > 0" class="grid grid-cols-3 gap-4 mb-5">
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.templates.stats_total') }}</p>
					<p class="text-2xl font-semibold text-white tabular-nums">{{ themes.length }}</p>
				</div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.templates.stats_active') }}</p>
					<p class="text-2xl font-semibold text-emerald-400 tabular-nums">{{ themeActiveCount }}</p>
				</div>
				<div class="bg-[#161920] border border-white/[0.07] rounded-lg px-4 py-3">
					<p class="text-xs text-slate-500 mb-1">{{ $t('admin.templates.stats_inactive') }}</p>
					<p class="text-2xl font-semibold text-slate-400 tabular-nums">{{ themeInactiveCount }}</p>
				</div>
			</div>

			<!-- Loading -->
			<div v-if="themesLoading" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
				<div v-for="i in 6" :key="i" class="aspect-square bg-[#161920] border border-white/[0.07] rounded-lg animate-pulse" />
			</div>

			<!-- Themes grid -->
			<div v-else-if="themes.length > 0" class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
				<div v-for="theme in themes" :key="theme.id"
					class="group relative bg-[#161920] border border-white/[0.07] rounded-lg overflow-hidden transition-all hover:border-white/[0.14]"
					:class="{ 'opacity-50': !theme.active }">
					<!-- Preview -->
					<div class="aspect-square relative overflow-hidden">
						<img v-if="theme.type === 'image'" :src="theme.value" class="w-full h-full object-cover" />
						<div v-else class="w-full h-full" :style="{ background: theme.value }" />

						<!-- Overlay actions -->
						<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
							<button @click="openEditThemeModal(theme)"
								class="w-full px-2 py-1 bg-white/90 hover:bg-white text-black rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1">
								<Icon name="ph:pencil-simple-bold" size="11" />
								{{ $t('admin.templates.edit_modal') }}
							</button>
							<button @click="confirmDeleteTheme(theme)"
								class="px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded text-[11px] transition-colors flex items-center gap-1">
								<Icon name="ph:trash-bold" size="11" />
							</button>
						</div>

						<!-- Type badge -->
						<div class="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 border border-white/[0.1] rounded text-white text-[9px] font-medium">
							{{ theme.type === 'image' ? $t('admin.templates.theme_type_image') : $t('admin.templates.theme_type_gradient') }}
						</div>

						<!-- Status toggle -->
						<div class="absolute top-1.5 right-1.5">
							<button @click.stop="toggleThemeActive(theme)"
								class="w-4 h-4 rounded-full border border-white/20 transition-colors"
								:class="theme.active ? 'bg-emerald-400' : 'bg-slate-600'" />
						</div>
					</div>

					<div class="px-2 py-1.5">
						<p class="text-xs font-medium text-white truncate">{{ theme.name }}</p>
					</div>
				</div>

				<!-- Add card -->
				<button @click="openCreateThemeModal"
					class="aspect-square bg-[#161920] border-2 border-dashed border-white/[0.07] rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-white/[0.2] hover:bg-[#1a1f2a]">
					<div class="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
						<Icon name="ph:plus-bold" class="text-slate-500" size="16" />
					</div>
					<span class="text-[11px] font-medium text-slate-500">{{ $t('admin.templates.add_button') }}</span>
				</button>
			</div>

			<!-- Empty state -->
			<div v-else class="flex flex-col items-center justify-center py-16 text-slate-600">
				<Icon name="ph:paint-bucket-duotone" size="36" class="mb-3" />
				<p class="text-sm font-medium text-slate-400 mb-1">{{ $t('admin.templates.no_themes') }}</p>
				<button @click="openCreateThemeModal"
					class="mt-4 flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 text-sm font-medium rounded-md transition-colors">
					<Icon name="ph:plus-bold" size="14" />
					{{ $t('admin.templates.add_first_theme') }}
				</button>
			</div>
		</div>

		<!-- ===== FLYER MODAL ===== -->
		<Teleport to="body">
			<div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div class="absolute inset-0 bg-black/60" @click="showModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">
							{{ editingTemplate ? $t('admin.templates.modal_edit_title') : $t('admin.templates.modal_add_title') }}
						</h2>
						<button @click="showModal = false" class="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>
					<div class="p-5 space-y-4">
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.templates.modal_name_label') }}</label>
							<input v-model="modalForm.name" type="text" :placeholder="$t('admin.templates.modal_name_placeholder')"
								class="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">
								{{ $t('admin.templates.modal_description_label') }}
								<span class="text-slate-600 font-normal ml-1">{{ $t('admin.templates.modal_description_optional') }}</span>
							</label>
							<input v-model="modalForm.description" type="text" :placeholder="$t('admin.templates.modal_description_placeholder')"
								class="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.templates.modal_image_label') }}</label>
							<div v-if="modalForm.imageUrl && !uploading"
								class="mb-3 relative group/img aspect-[3/4] w-40 mx-auto bg-slate-950 rounded-md overflow-hidden border border-white/[0.08]">
								<img :src="modalForm.imageUrl" class="w-full h-full object-contain" />
								<label class="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
									<div class="flex items-center gap-2 text-white text-sm font-medium">
										<Icon name="ph:swap-bold" size="16" />
										{{ $t('admin.templates.modal_image_change') }}
									</div>
									<input type="file" accept="image/png,image/jpeg" class="hidden" @change="handleFileUpload" />
								</label>
							</div>
							<label v-if="!modalForm.imageUrl || uploading"
								class="flex flex-col items-center justify-center gap-2 px-4 py-8 bg-white/[0.02] border-2 border-dashed rounded-md cursor-pointer transition-colors"
								:class="[uploading ? 'opacity-50 pointer-events-none border-white/[0.08]' : 'border-white/[0.08] hover:border-white/[0.18]', uploadError ? 'border-red-500/40' : '']">
								<Icon v-if="uploading" name="ph:spinner" class="animate-spin text-slate-400" size="22" />
								<Icon v-else name="ph:cloud-arrow-up-bold" class="text-slate-500" size="22" />
								<span class="text-xs text-slate-500">{{ uploading ? $t('admin.templates.modal_uploading') : $t('admin.templates.modal_image_upload_text') }}</span>
								<span class="text-[11px] text-slate-600">{{ $t('admin.templates.modal_image_upload_hint') }}</span>
								<input type="file" accept="image/png,image/jpeg" class="hidden" @change="handleFileUpload" />
							</label>
							<div v-if="uploadError" class="mt-2 flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md">
								<Icon name="ph:warning-circle-bold" class="text-red-400 shrink-0 mt-0.5" size="14" />
								<p class="text-xs text-red-400">{{ uploadError }}</p>
							</div>
						</div>
					</div>
					<div class="px-5 py-4 border-t border-white/[0.06] flex gap-2 justify-end">
						<button @click="showModal = false"
							class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							{{ $t('admin.templates.modal_cancel') }}
						</button>
						<button @click="saveTemplate" :disabled="!modalForm.name || !modalForm.imageUrl || saving"
							class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
							:class="(!modalForm.name || !modalForm.imageUrl || saving) ? 'bg-white/[0.04] text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100'">
							<Icon v-if="saving" name="ph:spinner" class="animate-spin" size="14" />
							{{ editingTemplate ? $t('admin.templates.modal_save') : $t('admin.templates.modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- ===== THEME MODAL ===== -->
		<Teleport to="body">
			<div v-if="showThemeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<div class="absolute inset-0 bg-black/60" @click="showThemeModal = false"></div>
				<div class="relative bg-[#111318] border border-white/[0.09] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
					<div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">
							{{ editingTheme ? $t('admin.templates.theme_modal_edit_title') : $t('admin.templates.theme_modal_add_title') }}
						</h2>
						<button @click="showThemeModal = false" class="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors">
							<Icon name="ph:x-bold" size="16" />
						</button>
					</div>

					<div class="p-5 space-y-4">
						<!-- Name -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.templates.modal_name_label') }}</label>
							<input v-model="themeForm.name" type="text" :placeholder="$t('admin.templates.theme_name_placeholder')"
								class="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-white/20 focus:outline-none transition-colors" />
						</div>

						<!-- Type selector -->
						<div>
							<label class="block text-xs font-medium text-slate-400 mb-2">{{ $t('admin.templates.theme_type_label') }}</label>
							<div class="flex gap-2">
								<button type="button" @click="themeForm.type = 'gradient'; themeForm.value = ''"
									:class="themeForm.type === 'gradient' ? 'bg-white/[0.1] border-white/20 text-white' : 'bg-white/[0.02] border-white/[0.07] text-slate-500 hover:text-slate-300'"
									class="flex-1 px-3 py-2 border rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5">
									<Icon name="ph:gradient-bold" size="14" />
									{{ $t('admin.templates.theme_type_gradient') }}
								</button>
								<button type="button" @click="themeForm.type = 'image'; themeForm.value = ''"
									:class="themeForm.type === 'image' ? 'bg-white/[0.1] border-white/20 text-white' : 'bg-white/[0.02] border-white/[0.07] text-slate-500 hover:text-slate-300'"
									class="flex-1 px-3 py-2 border rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5">
									<Icon name="ph:image-bold" size="14" />
									{{ $t('admin.templates.theme_type_image') }}
								</button>
							</div>
						</div>

						<!-- Gradient input -->
						<div v-if="themeForm.type === 'gradient'">
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.templates.theme_gradient_label') }}</label>
							<input v-model="themeForm.value" type="text"
								placeholder="linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
								class="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:border-white/20 focus:outline-none transition-colors" />
							<!-- Live preview -->
							<div v-if="themeForm.value" class="mt-2 h-12 rounded-md" :style="{ background: themeForm.value }" />
						</div>

						<!-- Image upload -->
						<div v-if="themeForm.type === 'image'">
							<label class="block text-xs font-medium text-slate-400 mb-1.5">{{ $t('admin.templates.modal_image_label') }}</label>
							<div v-if="themeForm.value && !themeUploading"
								class="mb-3 relative group/img aspect-video bg-slate-950 rounded-md overflow-hidden border border-white/[0.08]">
								<img :src="themeForm.value" class="w-full h-full object-cover" />
								<label class="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
									<div class="flex items-center gap-2 text-white text-sm font-medium">
										<Icon name="ph:swap-bold" size="16" />
										{{ $t('admin.templates.modal_image_change') }}
									</div>
									<input type="file" accept="image/*" class="hidden" @change="handleThemeImageUpload" />
								</label>
							</div>
							<label v-if="!themeForm.value || themeUploading"
								class="flex flex-col items-center justify-center gap-2 px-4 py-8 bg-white/[0.02] border-2 border-dashed rounded-md cursor-pointer transition-colors"
								:class="themeUploading ? 'opacity-50 pointer-events-none border-white/[0.08]' : 'border-white/[0.08] hover:border-white/[0.18]'">
								<Icon v-if="themeUploading" name="ph:spinner" class="animate-spin text-slate-400" size="22" />
								<Icon v-else name="ph:cloud-arrow-up-bold" class="text-slate-500" size="22" />
								<span class="text-xs text-slate-500">{{ themeUploading ? $t('admin.templates.modal_uploading') : $t('admin.templates.modal_image_upload_text') }}</span>
								<input type="file" accept="image/*" class="hidden" @change="handleThemeImageUpload" />
							</label>
							<div v-if="themeUploadError" class="mt-2 flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md">
								<Icon name="ph:warning-circle-bold" class="text-red-400 shrink-0 mt-0.5" size="14" />
								<p class="text-xs text-red-400">{{ themeUploadError }}</p>
							</div>
						</div>
					</div>

					<div class="px-5 py-4 border-t border-white/[0.06] flex gap-2 justify-end">
						<button @click="showThemeModal = false"
							class="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-sm text-slate-300 transition-colors">
							{{ $t('admin.templates.modal_cancel') }}
						</button>
						<button @click="saveTheme" :disabled="!themeForm.name || !themeForm.value || themeSaving"
							class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
							:class="(!themeForm.name || !themeForm.value || themeSaving) ? 'bg-white/[0.04] text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100'">
							<Icon v-if="themeSaving" name="ph:spinner" class="animate-spin" size="14" />
							{{ editingTheme ? $t('admin.templates.modal_save') : $t('admin.templates.modal_create') }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Image Preview Modal -->
		<Teleport to="body">
			<div v-if="previewTemplate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="previewTemplate = null">
				<div class="absolute inset-0 bg-black/80"></div>
				<div class="relative max-w-sm w-full" @click.stop>
					<img :src="previewTemplate.imageUrl" :alt="previewTemplate.name"
						class="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl" />
					<div class="mt-3 text-center">
						<p class="text-white text-sm font-medium">{{ previewTemplate.name }}</p>
						<p v-if="previewTemplate.description" class="text-slate-500 text-xs mt-0.5">{{ previewTemplate.description }}</p>
					</div>
					<button @click="previewTemplate = null"
						class="absolute -top-2 -right-2 w-7 h-7 bg-[#1a1f2a] border border-white/[0.1] rounded-full flex items-center justify-center text-white hover:bg-[#252b38] transition-colors shadow-lg">
						<Icon name="ph:x-bold" size="12" />
					</button>
				</div>
			</div>
		</Teleport>

		<!-- Delete Flyer Modal -->
		<ConfirmModal v-model="showDeleteModal"
			:title="$t('admin.templates.delete_modal_title')"
			:description="$t('admin.templates.delete_modal_description', { name: deletingTemplate?.name })"
			:confirm-text="$t('admin.templates.delete_modal_confirm')"
			type="danger" :loading="deleting" @confirm="deleteTemplate" />

		<!-- Delete Theme Modal -->
		<ConfirmModal v-model="showDeleteThemeModal"
			:title="$t('admin.templates.delete_modal_title')"
			:description="$t('admin.templates.delete_modal_description', { name: deletingTheme?.name })"
			:confirm-text="$t('admin.templates.delete_modal_confirm')"
			type="danger" :loading="deletingThemeInProgress" @confirm="deleteTheme" />
	</div>
</template>
