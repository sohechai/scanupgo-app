import { describe, it, expect } from 'vitest'

// Import the composable directly (no Nuxt deps)
import { usePhone } from '../../app/composables/usePhone'

const { parsePhone, phoneFlag, phoneDial, normalizePhone, dialForCountry } = usePhone()

describe('parsePhone', () => {
	it('parses Moroccan number with space after dial', () => {
		const r = parsePhone('+212 6 61 23 45 67')
		expect(r.dial).toBe('+212')
		expect(r.flag).toBe('🇲🇦')
		expect(r.number).toBe('6 61 23 45 67')
	})

	it('parses French number with space after dial', () => {
		const r = parsePhone('+33 4 78 12 34 56')
		expect(r.dial).toBe('+33')
		expect(r.flag).toBe('🇫🇷')
		expect(r.number).toBe('4 78 12 34 56')
	})

	it('parses number without space between dial and number', () => {
		const r = parsePhone('+212661234567')
		expect(r.dial).toBe('+212')
		expect(r.number).toBe('661234567')
	})

	it('returns empty strings for empty input', () => {
		const r = parsePhone('')
		expect(r.dial).toBe('')
		expect(r.flag).toBe('')
		expect(r.number).toBe('')
	})

	it('returns raw number when no dial match', () => {
		const r = parsePhone('0661234567')
		expect(r.dial).toBe('')
		expect(r.number).toBe('0661234567')
	})
})

describe('phoneFlag', () => {
	it('returns Moroccan flag', () => expect(phoneFlag('+212 661234567')).toBe('🇲🇦'))
	it('returns French flag', () => expect(phoneFlag('+33 612345678')).toBe('🇫🇷'))
	it('returns empty string for no match', () => expect(phoneFlag('0661234567')).toBe(''))
	it('returns empty string for empty input', () => expect(phoneFlag('')).toBe(''))
})

describe('phoneDial', () => {
	it('returns +212 for Moroccan', () => expect(phoneDial('+212 661234567')).toBe('+212'))
	it('returns +33 for French', () => expect(phoneDial('+33 612345678')).toBe('+33'))
	it('returns empty for no match', () => expect(phoneDial('0661234567')).toBe(''))
})

describe('dialForCountry', () => {
	it('returns +212 for Maroc', () => expect(dialForCountry('Maroc')).toBe('+212'))
	it('returns +33 for France', () => expect(dialForCountry('France')).toBe('+33'))
	it('is case-insensitive', () => expect(dialForCountry('france')).toBe('+33'))
	it('returns empty for unknown country', () => expect(dialForCountry('Unknown')).toBe(''))
	it('returns empty for empty string', () => expect(dialForCountry('')).toBe(''))
})

describe('normalizePhone', () => {
	it('strips leading 0 and prepends dial from country', () => {
		expect(normalizePhone('04 78 12 34 56', 'France')).toBe('+33 4 78 12 34 56')
	})

	it('strips leading 0 for Moroccan landline', () => {
		expect(normalizePhone('05 22 12 34 56', 'Maroc')).toBe('+212 5 22 12 34 56')
	})

	it('strips leading 0 for Moroccan mobile', () => {
		expect(normalizePhone('06 61 23 45 67', 'Maroc')).toBe('+212 6 61 23 45 67')
	})

	it('returns as-is if already has + prefix', () => {
		expect(normalizePhone('+33 4 78 12 34 56', 'France')).toBe('+33 4 78 12 34 56')
	})

	it('returns as-is if already has + prefix regardless of country', () => {
		expect(normalizePhone('+212 661234567', 'France')).toBe('+212 661234567')
	})

	it('returns phone unchanged when country unknown', () => {
		expect(normalizePhone('04 78 12 34 56', 'Unknown')).toBe('04 78 12 34 56')
	})

	it('returns empty for empty phone', () => {
		expect(normalizePhone('', 'France')).toBe('')
	})

	it('does not strip 0 when number does not start with 0', () => {
		expect(normalizePhone('661234567', 'Maroc')).toBe('+212 661234567')
	})
})
