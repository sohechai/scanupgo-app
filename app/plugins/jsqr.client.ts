import jsQR from 'jsqr'

export default defineNuxtPlugin(() => {
	// Make jsQR available globally
	if (typeof window !== 'undefined') {
		;(window as any).jsQR = jsQR
	}
})
