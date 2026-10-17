import { describe, expect, it } from 'vitest'
import { findActiveLyricIndex, formatAudioDuration, parseLrc } from '../app/utils/audio'

describe('parseLrc', () => {
	it('parses timestamps and sorts lines', () => {
		expect(parseLrc('[00:10.50]later\n[00:01.00]first\n[01:02.3]third')).toEqual([
			{ time: 1, text: 'first' },
			{ time: 10.5, text: 'later' },
			{ time: 62.3, text: 'third' },
		])
	})

	it('supports multiple timestamps on one line', () => {
		expect(parseLrc('[00:01.00][00:05.00]repeat')).toEqual([
			{ time: 1, text: 'repeat' },
			{ time: 5, text: 'repeat' },
		])
	})

	it('skips credit lines and empty text', () => {
		expect(parseLrc([
			'[00:01.00]作词：林夕',
			'[00:02.00]作曲：陈辉阳',
			'[00:03.00]',
			'[00:04.00]真正的一句',
		].join('\n'))).toEqual([{ time: 4, text: '真正的一句' }])
	})

	it('skips compound production credits', () => {
		expect(parseLrc([
			'[00:01.00]录制：Lightroom Studio',
			'[00:02.00]工程师：Derrick Sepnio',
			'[00:03.00]混音助理工程师：Daniela Rivera',
			'[00:04.00]弦乐编曲：The Benjamin Wright Orchestra',
			'[00:05.00]鼓和钢琴：Soulboy',
			'[00:06.00]真正的一句',
		].join('\n'))).toEqual([{ time: 6, text: '真正的一句' }])
	})

	it('returns an empty list for empty input', () => {
		expect(parseLrc()).toEqual([])
		expect(parseLrc('')).toEqual([])
	})
})

describe('findActiveLyricIndex', () => {
	const lines = [{ time: 1, text: 'a' }, { time: 3, text: 'b' }]

	it('returns -1 before the first line', () => {
		expect(findActiveLyricIndex(lines, 0)).toBe(-1)
	})

	it('returns the last line whose timestamp has passed', () => {
		expect(findActiveLyricIndex(lines, 2)).toBe(0)
		expect(findActiveLyricIndex(lines, 3)).toBe(1)
		expect(findActiveLyricIndex(lines, 10)).toBe(1)
	})
})

describe('formatAudioDuration', () => {
	it.each([
		[0, '00:00'],
		[65, '01:05'],
		[3661, '1:01:01'],
		[-1, '00:00'],
		[Number.NaN, '00:00'],
	])('formats %s seconds as %s', (seconds, expected) => {
		expect(formatAudioDuration(seconds)).toBe(expected)
	})
})
