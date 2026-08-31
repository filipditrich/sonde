/**
 * Compare the founding-study Python slice (inclusive i-20..i = 21 bars) with Strategy V1's
 * twenty completed bars. Does not change the 20-bar rule.
 */
const dollar = (vwap: number, volume: number) => vwap * volume;
const median = (values: number[]) => {
	const ordered = [...values].toSorted((left, right) => left - right);
	const mid = Math.floor(ordered.length / 2);
	return ordered.length % 2 ? ordered[mid]! : (ordered[mid - 1]! + ordered[mid]!) / 2;
};

const series = Array.from({ length: 40 }, (_, index) => 10_000_000 + index * 1_000_000);
const pythonSlice = (index: number) => series.slice(Math.max(0, index - 20), index + 1);
const strategySlice = (index: number) => series.slice(Math.max(0, index - 19), index + 1);

const index = 25;
const python = pythonSlice(index);
const strategy = strategySlice(index);
const pythonMedian = median(python);
const strategyMedian = median(strategy);
const floor = 20_000_000;

console.log(`python 21-bar slice n=${python.length} median=${pythonMedian}`);
console.log(`strategy 20-bar slice n=${strategy.length} median=${strategyMedian}`);
console.log(`membership floor ${floor}: python ${pythonMedian > floor} / strategy ${strategyMedian > floor}`);
console.log(`median delta ${strategyMedian - pythonMedian}`);
