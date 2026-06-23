import { describe, expect, it } from 'vitest';
import { estimateTokensPerSecond, formatTokenSpeed } from './tokenSpeed';

describe('tokenSpeed', () => {
	it('estimates tokens per second from content length and elapsed time', () => {
		expect(estimateTokensPerSecond(40, 1000)).toBe(10);
	});

	it('returns null for invalid estimates', () => {
		expect(estimateTokensPerSecond(0, 1000)).toBeNull();
		expect(estimateTokensPerSecond(40, 0)).toBeNull();
	});

	it('formats token speed for display', () => {
		expect(formatTokenSpeed(12.34)).toBe('12.3 tok/s');
		expect(formatTokenSpeed(null)).toBe('');
	});
});
