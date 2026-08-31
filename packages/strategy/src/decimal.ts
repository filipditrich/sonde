export const compareDecimal = (left: string, right: string): number => {
	const negativeLeft = left.startsWith('-');
	const negativeRight = right.startsWith('-');
	if (negativeLeft !== negativeRight) return negativeLeft ? -1 : 1;
	const [leftInteger = '0', leftFraction = ''] = left.replace('-', '').split('.');
	const [rightInteger = '0', rightFraction = ''] = right.replace('-', '').split('.');
	const width = Math.max(leftInteger.length, rightInteger.length);
	const scale = Math.max(leftFraction.length, rightFraction.length);
	const normalizedLeft = `${leftInteger.padStart(width, '0')}${leftFraction.padEnd(scale, '0')}`;
	const normalizedRight = `${rightInteger.padStart(width, '0')}${rightFraction.padEnd(scale, '0')}`;
	const comparison = normalizedLeft === normalizedRight ? 0 : normalizedLeft > normalizedRight ? 1 : -1;
	return negativeLeft ? -comparison : comparison;
};
