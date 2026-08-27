import * as z from 'zod';

import { AssetId, Confidence, Decimal, Duration, ObservationId, ObservedAt, SignalId } from './primitives';

/** `flat` is a real answer: "I read this and it changes nothing" is information worth scoring. */
export const Direction = z.enum(['long', 'short', 'flat']);
export type Direction = z.infer<typeof Direction>;

/**
 * Which configuration produced a signal. Without this the scoreboard cannot attribute
 * anything, and a prompt change silently contaminates the history it is measured against.
 */
export const Analyst = z.object({
	/** routing tier, e.g. `triage` or `deep` */
	tier: z.string().min(1),
	/** exact model id, e.g. `claude-haiku-4-5` */
	model: z.string().min(1),
	/** prompt version — bumped on every edit, however small */
	promptVersion: z.string().min(1),
});
export type Analyst = z.infer<typeof Analyst>;

/**
 * A rationale shorter than this is not a rationale. The floor exists because "bullish" passes
 * a `.min(1)` check and tells the scoreboard — and the operator reading the tape — nothing.
 */
const MIN_RATIONALE_LENGTH = 24;

/**
 * Typed analyst output. Advisory: a Signal never reaches a venue on its own (ADR 0005).
 *
 * Signals are append-only. A changed view is a *new* signal pointing at its predecessor via
 * `supersedes`, because the record of what was believed at decision time is the only thing
 * worth measuring — and without backtesting available, that forward record is the project's
 * entire evidence base (ADR 0004, ADR 0008).
 */
export const Signal = z.object({
	id: SignalId,
	asset: AssetId,
	direction: Direction,
	confidence: Confidence,

	/** how far ahead this claim reaches; the resolver scores it exactly this far out */
	horizon: Duration,

	/** the model's own words — non-negotiable, see ADR 0008 */
	rationale: z.string().min(MIN_RATIONALE_LENGTH, 'a rationale this short is not a rationale'),

	/**
	 * Every observation that fed this conclusion. Enforced non-empty at the schema level so a
	 * signal that cannot name its causes fails validation rather than reaching the tape. An
	 * analyst citing a source it was not given is a caught error, not a silent fabrication.
	 */
	sourceIds: z.array(ObservationId).min(1, 'a signal must name the observations that caused it'),

	analyst: Analyst,

	/** set when this revises an earlier view; never edit the predecessor */
	supersedes: SignalId.optional(),

	createdAt: ObservedAt,
});
export type Signal = z.infer<typeof Signal>;

/**
 * The resolved outcome of a signal at its horizon, written exactly once.
 *
 * Kept in a separate shape from `Signal` on purpose: predictions and outcomes never share a
 * row, so there is no way to accidentally update a prediction to match what happened.
 */
export const SignalResult = z.object({
	signalId: SignalId,

	priceAtSignal: Decimal,
	priceAtHorizon: Decimal,
	/** signed return over the horizon, positive meaning price rose */
	realizedReturn: Decimal,

	/** did the stated direction match the realized move — `flat` scores against a dead band */
	directionallyCorrect: z.boolean(),

	resolvedAt: ObservedAt,
});
export type SignalResult = z.infer<typeof SignalResult>;
