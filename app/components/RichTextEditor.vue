<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

const props = defineProps({
	modelValue: {
		type: String,
		default: '',
	},
	placeholder: {
		type: String,
		default: 'Écrivez votre contenu ici...',
	},
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
	content: props.modelValue,
	extensions: [
		StarterKit,
		Link.configure({
			openOnClick: false,
			HTMLAttributes: {
				class: 'text-brand-600 underline hover:text-brand-700',
			},
		}),
		Placeholder.configure({
			placeholder: props.placeholder,
		}),
	],
	editorProps: {
		attributes: {
			class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[150px] px-4 py-3',
		},
	},
	onUpdate: ({ editor }) => {
		emit('update:modelValue', editor.getHTML())
	},
})

// Update editor content if modelValue changes externally
watch(() => props.modelValue, (newValue) => {
	if (editor.value && newValue !== editor.value.getHTML()) {
		editor.value.commands.setContent(newValue, false)
	}
})

// Toolbar actions
const setLink = () => {
	const previousUrl = editor.value?.getAttributes('link').href
	const url = window.prompt('URL', previousUrl)

	// cancelled
	if (url === null) {
		return
	}

	// empty
	if (url === '') {
		editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
		return
	}

	// update link
	editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

onBeforeUnmount(() => {
	editor.value?.destroy()
})
</script>

<template>
	<div
		class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col">
		<!-- Toolbar -->
		<div v-if="editor"
			class="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">

			<!-- History -->
			<div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-600 pr-2">
				<button @mousedown.prevent="editor.chain().focus().undo().run()"
					:disabled="!editor.can().chain().focus().undo().run()"
					class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors"
					title="Annuler">
					<Icon name="ph:arrow-u-up-left-bold" size="16" />
				</button>
				<button @mousedown.prevent="editor.chain().focus().redo().run()"
					:disabled="!editor.can().chain().focus().redo().run()"
					class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors"
					title="Rétablir">
					<Icon name="ph:arrow-u-up-right-bold" size="16" />
				</button>
			</div>

			<!-- Formatting -->
			<button @mousedown.prevent="editor.chain().focus().toggleBold().run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('bold') }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
				title="Gras">
				<Icon name="ph:text-b-bold" size="16" />
			</button>

			<button @mousedown.prevent="editor.chain().focus().toggleItalic().run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('italic') }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
				title="Italique">
				<Icon name="ph:text-italic-bold" size="16" />
			</button>

			<button @mousedown.prevent="editor.chain().focus().toggleStrike().run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('strike') }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
				title="Barré">
				<Icon name="ph:text-strikethrough-bold" size="16" />
			</button>

			<!-- Headings -->
			<div class="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1"></div>

			<button @mousedown.prevent="editor.chain().focus().toggleHeading({ level: 2 }).run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('heading', { level: 2 }) }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors font-bold text-xs"
				title="Titre 2">
				H2
			</button>

			<button @mousedown.prevent="editor.chain().focus().toggleHeading({ level: 3 }).run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('heading', { level: 3 }) }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors font-bold text-xs"
				title="Titre 3">
				H3
			</button>

			<!-- Lists -->
			<div class="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1"></div>

			<button @mousedown.prevent="editor.chain().focus().toggleBulletList().run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('bulletList') }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
				title="Liste à puces">
				<Icon name="ph:list-bullets-bold" size="16" />
			</button>

			<button @mousedown.prevent="editor.chain().focus().toggleOrderedList().run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('orderedList') }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
				title="Liste numérotée">
				<Icon name="ph:list-numbers-bold" size="16" />
			</button>

			<!-- Extras -->
			<div class="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1"></div>

			<button @mousedown.prevent="editor.chain().focus().toggleBlockquote().run()"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('blockquote') }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
				title="Citation">
				<Icon name="ph:quotes-bold" size="16" />
			</button>

			<button @mousedown.prevent="setLink"
				:class="{ 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white': editor.isActive('link') }"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
				title="Lien">
				<Icon name="ph:link-bold" size="16" />
			</button>

			<button @mousedown.prevent="editor.chain().focus().unsetLink().run()" :disabled="!editor.isActive('link')"
				class="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
				title="Supprimer le lien">
				<Icon name="ph:link-break-bold" size="16" />
			</button>

		</div>

		<!-- content -->
		<editor-content :editor="editor" class="flex-1 overflow-y-auto" />
	</div>
</template>

<style>
/* Custom prose adjustments for editor content */
.ProseMirror p.is-editor-empty:first-child::before {
	color: #94a3b8;
	content: attr(data-placeholder);
	float: left;
	height: 0;
	pointer-events: none;
}

.ProseMirror:focus {
	outline: none;
}
</style>
