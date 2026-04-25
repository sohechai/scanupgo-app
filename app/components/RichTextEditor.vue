<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
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
