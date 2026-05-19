<script setup lang="ts">
import { ref, watch } from 'vue'

interface PlacePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

interface PlaceDetails {
  placeId: string
  name: string
  formattedAddress: string
  addressStreet: string
  addressCity: string
  addressZip: string
  addressCountry: string
  rating: number | null
  reviewCount: number | null
  googleReviewUrl: string
  googleMapsUrl: string
  phone: string | null
}

const emit = defineEmits<{
  select: [details: PlaceDetails]
}>()

const props = defineProps<{
  placeholder?: string
  language?: string
}>()

const { $api } = useNuxtApp()

const query = ref('')
const predictions = ref<PlacePrediction[]>([])
const loading = ref(false)
const loadingDetails = ref(false)
const showDropdown = ref(false)
const sessionToken = ref(crypto.randomUUID())

let debounceTimer: ReturnType<typeof setTimeout>

watch(query, (val) => {
  clearTimeout(debounceTimer)
  if (!val || val.trim().length < 2) {
    predictions.value = []
    showDropdown.value = false
    return
  }
  debounceTimer = setTimeout(() => fetchPredictions(val), 300)
})

const fetchPredictions = async (input: string) => {
  loading.value = true
  try {
    const data = await $api<{ predictions: PlacePrediction[] }>('/places/autocomplete', {
      params: { input, sessiontoken: sessionToken.value, language: props.language || 'fr' }
    })
    predictions.value = data.predictions || []
    showDropdown.value = predictions.value.length > 0
  } catch {
    predictions.value = []
  } finally {
    loading.value = false
  }
}

const selectPlace = async (prediction: PlacePrediction) => {
  loadingDetails.value = true
  showDropdown.value = false
  query.value = prediction.description

  try {
    const details = await $api<PlaceDetails>(`/places/details/${prediction.placeId}`, {
      params: { sessiontoken: sessionToken.value, language: props.language || 'fr' }
    })
    emit('select', details)
    // Reset session token after completed session
    sessionToken.value = crypto.randomUUID()
  } catch {
    // silently fail
  } finally {
    loadingDetails.value = false
  }
}

const onBlur = () => {
  setTimeout(() => { showDropdown.value = false }, 150)
}
</script>

<template>
  <div class="relative">
    <div class="relative">
      <input
        v-model="query"
        type="text"
        :placeholder="placeholder || 'Rechercher votre établissement...'"
        class="w-full px-3 py-2 pr-10 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        @blur="onBlur"
        @focus="showDropdown = predictions.length > 0"
        autocomplete="off"
      />
      <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon v-if="loading || loadingDetails" name="ph:circle-notch" class="w-4 h-4 animate-spin" />
        <Icon v-else name="ph:magnifying-glass" class="w-4 h-4" />
      </div>
    </div>

    <div
      v-if="showDropdown && predictions.length > 0"
      class="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
    >
      <button
        v-for="p in predictions"
        :key="p.placeId"
        type="button"
        class="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-start gap-3 border-b border-slate-700/50 last:border-0"
        @mousedown.prevent="selectPlace(p)"
      >
        <Icon name="ph:map-pin" class="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-white truncate">{{ p.mainText }}</p>
          <p class="text-xs text-slate-400 truncate">{{ p.secondaryText }}</p>
        </div>
      </button>
    </div>
  </div>
</template>
