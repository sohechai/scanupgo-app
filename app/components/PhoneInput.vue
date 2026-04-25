<script setup lang="ts">
const props = defineProps<{
	modelValue: string
	disabled?: boolean
	placeholder?: string
	variant?: 'light' | 'dark'
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const countries = [
	{ name: 'Maroc', flag: '🇲🇦', dial: '+212' },
	{ name: 'France', flag: '🇫🇷', dial: '+33' },
	{ name: 'Algérie', flag: '🇩🇿', dial: '+213' },
	{ name: 'Tunisie', flag: '🇹🇳', dial: '+216' },
	{ name: 'Belgique', flag: '🇧🇪', dial: '+32' },
	{ name: 'Suisse', flag: '🇨🇭', dial: '+41' },
	{ name: 'Luxembourg', flag: '🇱🇺', dial: '+352' },
	{ name: 'Canada', flag: '🇨🇦', dial: '+1' },
	{ name: 'États-Unis', flag: '🇺🇸', dial: '+1' },
	{ name: 'Espagne', flag: '🇪🇸', dial: '+34' },
	{ name: 'Italie', flag: '🇮🇹', dial: '+39' },
	{ name: 'Allemagne', flag: '🇩🇪', dial: '+49' },
	{ name: 'Portugal', flag: '🇵🇹', dial: '+351' },
	{ name: 'Pays-Bas', flag: '🇳🇱', dial: '+31' },
	{ name: 'Royaume-Uni', flag: '🇬🇧', dial: '+44' },
	{ name: 'Sénégal', flag: '🇸🇳', dial: '+221' },
	{ name: 'Côte d\'Ivoire', flag: '🇨🇮', dial: '+225' },
	{ name: 'Cameroun', flag: '🇨🇲', dial: '+237' },
	{ name: 'Mauritanie', flag: '🇲🇷', dial: '+222' },
	{ name: 'Mali', flag: '🇲🇱', dial: '+223' },
	{ name: 'Libye', flag: '🇱🇾', dial: '+218' },
	{ name: 'Égypte', flag: '🇪🇬', dial: '+20' },
	{ name: 'Arabie Saoudite', flag: '🇸🇦', dial: '+966' },
	{ name: 'Émirats Arabes', flag: '🇦🇪', dial: '+971' },
	{ name: 'Qatar', flag: '🇶🇦', dial: '+974' },
	{ name: 'Turquie', flag: '🇹🇷', dial: '+90' },
	{ name: 'Chine', flag: '🇨🇳', dial: '+86' },
	{ name: 'Inde', flag: '🇮🇳', dial: '+91' },
	{ name: 'Brésil', flag: '🇧🇷', dial: '+55' },
	{ name: 'Mexique', flag: '🇲🇽', dial: '+52' },
]

function parseValue(val: string): { dial: string; number: string } {
	for (const c of countries) {
		if (val.startsWith(c.dial + ' ') || val === c.dial) {
			return { dial: c.dial, number: val.slice(c.dial.length).trimStart() }
		}
	}
	// Check without space
	for (const c of countries) {
		if (val.startsWith(c.dial)) {
			return { dial: c.dial, number: val.slice(c.dial.length).trimStart() }
		}
	}
	return { dial: '+212', number: val }
}

const parsed = parseValue(props.modelValue ?? '')
const selectedDial = ref(parsed.dial)
const localNumber = ref(parsed.number)

const selectedCountry = computed(() => countries.find(c => c.dial === selectedDial.value) ?? countries[0]!)

watch(() => props.modelValue, (val) => {
	const p = parseValue(val ?? '')
	selectedDial.value = p.dial
	localNumber.value = p.number
})

function emitCombined() {
	const full = localNumber.value.trim()
		? `${selectedDial.value} ${localNumber.value.trim()}`
		: ''
	emit('update:modelValue', full)
}

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()
const search = ref('')

const filteredCountries = computed(() => {
	if (!search.value) return countries
	const q = search.value.toLowerCase()
	return countries.filter(c =>
		c.name.toLowerCase().includes(q) || c.dial.includes(q)
	)
})

function selectCountry(dial: string) {
	selectedDial.value = dial
	isOpen.value = false
	search.value = ''
	if (localNumber.value.trim()) {
		emitCombined()
	}
}

onMounted(() => {
	const handler = (e: MouseEvent) => {
		if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
			isOpen.value = false
			search.value = ''
		}
	}
	document.addEventListener('click', handler)
	onUnmounted(() => document.removeEventListener('click', handler))
})

const isDark = computed(() => props.variant === 'dark')
</script>

<template>
	<div ref="dropdownRef" class="relative flex">
		<!-- Dial code dropdown trigger -->
		<button
			type="button"
			:disabled="disabled"
			@click.stop="isOpen = !isOpen"
			class="flex items-center gap-1.5 px-3 border-r text-sm font-medium rounded-l-md transition-all flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
			:class="isDark
				? 'bg-[#2C2C2E] border-slate-600/50 text-white hover:bg-[#3A3A3C]'
				: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
		>
			<span>{{ selectedCountry.flag }}</span>
			<span class="text-xs text-slate-500 dark:text-slate-400">{{ selectedDial }}</span>
			<Icon name="ph:caret-down-bold" size="10" class="opacity-50 transition-transform" :class="isOpen ? 'rotate-180' : ''" />
		</button>

		<!-- Number input -->
		<input
			v-model="localNumber"
			type="tel"
			:disabled="disabled"
			:placeholder="placeholder ?? '6 00 00 00 00'"
			class="flex-1 min-w-0 border border-l-0 rounded-r-md px-3 py-2 text-sm outline-none transition-all placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
			:class="isDark
				? 'bg-[#2C2C2E] border-slate-600/50 text-white focus:bg-[#1C1C1E] focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10'
				: 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-[#007AFF]/50 focus:ring-2 focus:ring-[#007AFF]/10'"
			@input="emitCombined"
		/>

		<!-- Dropdown -->
		<Transition
			enter-active-class="transition ease-out duration-100"
			enter-from-class="opacity-0 scale-95"
			enter-to-class="opacity-100 scale-100"
			leave-active-class="transition ease-in duration-75"
			leave-from-class="opacity-100 scale-100"
			leave-to-class="opacity-0 scale-95"
		>
			<div
				v-if="isOpen"
				class="absolute top-full left-0 mt-1.5 w-64 rounded-xl shadow-xl border overflow-hidden z-50"
				:class="isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'"
			>
				<!-- Search -->
				<div class="p-2 border-b" :class="isDark ? 'border-white/10' : 'border-slate-100'">
					<input
						v-model="search"
						type="text"
						placeholder="Chercher un pays..."
						class="w-full px-3 py-1.5 text-xs rounded-lg outline-none transition-all placeholder-slate-400"
						:class="isDark
							? 'bg-white/5 border border-white/10 text-white focus:border-[#007AFF]/50'
							: 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-[#007AFF]/50'"
						@click.stop
					/>
				</div>

				<!-- Country list -->
				<div class="max-h-56 overflow-y-auto">
					<button
						v-for="country in filteredCountries"
						:key="country.dial + country.name"
						type="button"
						@click="selectCountry(country.dial)"
						class="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium transition-colors text-left"
						:class="[
							country.dial === selectedDial
								? isDark ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'bg-[#007AFF]/10 text-[#007AFF] font-bold'
								: isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
						]"
					>
						<span class="text-base leading-none">{{ country.flag }}</span>
						<span class="flex-1 truncate">{{ country.name }}</span>
						<span class="text-slate-400 font-mono">{{ country.dial }}</span>
					</button>
					<p v-if="filteredCountries.length === 0" class="px-4 py-3 text-xs text-slate-400 text-center">
						Aucun résultat
					</p>
				</div>
			</div>
		</Transition>
	</div>
</template>
