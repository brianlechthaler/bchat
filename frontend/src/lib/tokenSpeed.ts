const CHARS_PER_TOKEN = 4;

export function estimateTokensPerSecond(contentLength: number, elapsedMs: number): number | null {
	if (contentLength <= 0 || elapsedMs <= 0) {
		return null;
	}
	const tokens = contentLength / CHARS_PER_TOKEN;
	const seconds = elapsedMs / 1000;
	return tokens / seconds;
}

export function formatTokenSpeed(tokensPerSecond: number | null): string {
	if (tokensPerSecond == null || !Number.isFinite(tokensPerSecond) || tokensPerSecond <= 0) {
		return '';
	}
	return `${tokensPerSecond.toFixed(1)} tok/s`;
}
