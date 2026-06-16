const PHONE_COUNTRIES = [
	{ name: 'Maroc', code: 'MA', flag: '🇲🇦', dial: '+212' },
	{ name: 'France', code: 'FR', flag: '🇫🇷', dial: '+33' },
	{ name: 'Algérie', code: 'DZ', flag: '🇩🇿', dial: '+213' },
	{ name: 'Tunisie', code: 'TN', flag: '🇹🇳', dial: '+216' },
	{ name: 'Belgique', code: 'BE', flag: '🇧🇪', dial: '+32' },
	{ name: 'Suisse', code: 'CH', flag: '🇨🇭', dial: '+41' },
	{ name: 'Luxembourg', code: 'LU', flag: '🇱🇺', dial: '+352' },
	{ name: 'Canada', code: 'CA', flag: '🇨🇦', dial: '+1' },
	{ name: 'États-Unis', code: 'US', flag: '🇺🇸', dial: '+1' },
	{ name: 'Espagne', code: 'ES', flag: '🇪🇸', dial: '+34' },
	{ name: 'Italie', code: 'IT', flag: '🇮🇹', dial: '+39' },
	{ name: 'Allemagne', code: 'DE', flag: '🇩🇪', dial: '+49' },
	{ name: 'Portugal', code: 'PT', flag: '🇵🇹', dial: '+351' },
	{ name: 'Pays-Bas', code: 'NL', flag: '🇳🇱', dial: '+31' },
	{ name: 'Royaume-Uni', code: 'GB', flag: '🇬🇧', dial: '+44' },
	{ name: 'Sénégal', code: 'SN', flag: '🇸🇳', dial: '+221' },
	{ name: "Côte d'Ivoire", code: 'CI', flag: '🇨🇮', dial: '+225' },
	{ name: 'Cameroun', code: 'CM', flag: '🇨🇲', dial: '+237' },
	{ name: 'Mauritanie', code: 'MR', flag: '🇲🇷', dial: '+222' },
	{ name: 'Mali', code: 'ML', flag: '🇲🇱', dial: '+223' },
	{ name: 'Libye', code: 'LY', flag: '🇱🇾', dial: '+218' },
	{ name: 'Égypte', code: 'EG', flag: '🇪🇬', dial: '+20' },
	{ name: 'Arabie Saoudite', code: 'SA', flag: '🇸🇦', dial: '+966' },
	{ name: 'Émirats Arabes', code: 'AE', flag: '🇦🇪', dial: '+971' },
	{ name: 'Qatar', code: 'QA', flag: '🇶🇦', dial: '+974' },
	{ name: 'Turquie', code: 'TR', flag: '🇹🇷', dial: '+90' },
	{ name: 'Chine', code: 'CN', flag: '🇨🇳', dial: '+86' },
	{ name: 'Inde', code: 'IN', flag: '🇮🇳', dial: '+91' },
	{ name: 'Brésil', code: 'BR', flag: '🇧🇷', dial: '+55' },
	{ name: 'Mexique', code: 'MX', flag: '🇲🇽', dial: '+52' },
]

export function usePhone() {
	function parsePhone(phone: string): { dial: string; flag: string; number: string } {
		if (!phone) return { dial: '', flag: '', number: '' }
		for (const c of PHONE_COUNTRIES) {
			if (phone.startsWith(c.dial + ' ') || phone === c.dial) {
				return { dial: c.dial, flag: c.flag, number: phone.slice(c.dial.length).trimStart() }
			}
		}
		for (const c of PHONE_COUNTRIES) {
			if (phone.startsWith(c.dial)) {
				return { dial: c.dial, flag: c.flag, number: phone.slice(c.dial.length).trimStart() }
			}
		}
		return { dial: '', flag: '', number: phone }
	}

	function phoneFlag(phone: string): string {
		return parsePhone(phone).flag
	}

	function phoneDial(phone: string): string {
		return parsePhone(phone).dial
	}

	function dialForCountry(countryName: string): string {
		if (!countryName) return ''
		const match = PHONE_COUNTRIES.find(c => c.name.toLowerCase() === countryName.toLowerCase())
		return match?.dial ?? ''
	}

	/** Indicatif depuis le code ISO pays (MA, FR…) — stable quelle que soit la langue. */
	function dialForCountryCode(code: string): string {
		if (!code) return ''
		const match = PHONE_COUNTRIES.find(c => c.code === code.toUpperCase())
		return match?.dial ?? ''
	}

	/**
	 * Code pays ISO via détection IP (fallback gratuit, sans clé).
	 * Utilisé seulement si Google Places ne donne pas un pays connu.
	 */
	async function countryCodeFromIp(): Promise<string> {
		try {
			const res = await fetch('https://ipapi.co/json/')
			if (!res.ok) return ''
			const data = await res.json()
			const code = (data?.country_code || '').toUpperCase()
			return dialForCountryCode(code) ? code : ''
		} catch {
			return ''
		}
	}

	/**
	 * If phone has no international prefix (+XX), prepend the dial code derived from countryName.
	 * Returns the phone unchanged if it already has a prefix or if no country match.
	 */
	function normalizePhone(phone: string, countryName: string, countryCode?: string): string {
		if (!phone) return ''
		if (phone.startsWith('+')) return phone
		// Code ISO prioritaire (stable), repli sur le nom
		const dial = dialForCountryCode(countryCode || '') || dialForCountry(countryName)
		if (!dial) return phone
		const local = phone.startsWith('0') ? phone.slice(1) : phone
		return `${dial} ${local}`
	}

	return { parsePhone, phoneFlag, phoneDial, dialForCountry, dialForCountryCode, countryCodeFromIp, normalizePhone }
}
