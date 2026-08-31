import { LIQUIDITY_MEDIAN_FLOOR } from '@sonde/core';
import { completedTwentyBarLiquidity, type LiquidityProjection, type SipDailyBarCandidate } from '@sonde/probes';

import { compareDecimal } from './decimal';

export type UniverseLiquidity = {
	readonly included: boolean;
	readonly medianDollarVolume?: string;
	readonly exclusionReasons: readonly string[];
	readonly projection: LiquidityProjection;
};

export const evaluateUniverseLiquidity = (bars: readonly Pick<SipDailyBarCandidate, 'feed' | 'vwap' | 'volume'>[]): UniverseLiquidity => {
	const projection = completedTwentyBarLiquidity(bars);
	if (!projection.ready || !projection.medianDollarVolume) {
		return { included: false, exclusionReasons: [projection.reason ?? 'twenty completed SIP bars with VWAP are required'], projection };
	}
	if (compareDecimal(projection.medianDollarVolume, LIQUIDITY_MEDIAN_FLOOR) <= 0) {
		return {
			included: false,
			medianDollarVolume: projection.medianDollarVolume,
			exclusionReasons: ['median-dollar-volume-at-or-below-floor'],
			projection,
		};
	}
	return { included: true, medianDollarVolume: projection.medianDollarVolume, exclusionReasons: [], projection };
};
