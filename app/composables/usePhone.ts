const PHONE_COUNTRIES = [
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
	{ name: "Côte d'Ivoire", flag: '🇨🇮', dial: '+225' },
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

	/**
	 * If phone has no international prefix (+XX), prepend the dial code derived from countryName.
	 * Returns the phone unchanged if it already has a prefix or if no country match.
	 */
	function normalizePhone(phone: string, countryName: string): string {
		if (!phone) return ''
		if (phone.startsWith('+')) return phone
		const dial = dialForCountry(countryName)
		if (!dial) return phone
		const local = phone.startsWith('0') ? phone.slice(1) : phone
		return `${dial} ${local}`
	}

	return { parsePhone, phoneFlag, phoneDial, dialForCountry, normalizePhone }
}
