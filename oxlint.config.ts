import { defineConfig } from 'oxlint';

/**
 * Sonde lint gates.
 *
 * Architectural invariants are carried as *rules*, not prose. The two that matter most —
 * the reasoning plane cannot reach a venue (ADR 0005) and CCXT does not leak out of
 * `packages/venue` (ADR 0002) — are enforced here rather than trusted to review. An agent
 * obeys what fails and skims what is documented.
 *
 * The restricted-import lists may only ever grow.
 */

/** dependencies that contradict a decision, everywhere in the tree */
const RESTRICTED_PACKAGES = [
	['backtesting', 'No backtesting engine for the LLM path. See docs/decisions/0004-no-llm-backtests.md.'],
	['grademark', 'No backtesting engine for the LLM path. See docs/decisions/0004-no-llm-backtests.md.'],
	['backtest', 'No backtesting engine for the LLM path. See docs/decisions/0004-no-llm-backtests.md.'],
	['moment', 'Use Temporal or date-fns. Market data is timestamp-heavy and moment is mutable.'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

const toPaths = (entries: ReadonlyArray<readonly [string, string]>) => entries.map(([name, message]) => ({ name, message }));

/** the gate must not be able to reach a model, a venue, or the network — ADR 0005 */
const RISK_FORBIDDEN = [
	{
		group: ['@sonde/agents', '@sonde/agents/*'],
		message: 'The risk gate must not be able to import a model. See docs/decisions/0005-llm-proposes-code-disposes.md.',
	},
	{
		group: ['@sonde/venue', '@sonde/venue/*'],
		message: 'The gate decides; it does not execute. See docs/decisions/0005-llm-proposes-code-disposes.md.',
	},
	{
		group: ['@anthropic-ai/sdk', '@anthropic-ai/sdk/*'],
		message: 'No model in the enforcement plane. See docs/decisions/0005-llm-proposes-code-disposes.md.',
	},
	{ group: ['ccxt', 'ccxt/*'], message: 'No venue client in the enforcement plane. See docs/decisions/0005-llm-proposes-code-disposes.md.' },
];

/** the reasoning plane is advisory — it has no execution path — ADR 0005 */
const AGENTS_FORBIDDEN = [
	{
		group: ['@sonde/venue', '@sonde/venue/*'],
		message: 'Agents emit proposals, never orders. See docs/decisions/0005-llm-proposes-code-disposes.md.',
	},
	{ group: ['ccxt', 'ccxt/*'], message: 'Agents emit proposals, never orders. See docs/decisions/0005-llm-proposes-code-disposes.md.' },
];

export default defineConfig({
	options: {
		/** extra lint on top of `tsc --noEmit` — do not set typeCheck */
		typeAware: true,
	},
	plugins: ['eslint', 'typescript', 'react'],
	env: { browser: true, node: true },
	ignorePatterns: [
		'**/*.gen.ts',
		'**/node_modules/**',
		'**/dist/**',
		'**/.next/**',
		'**/.turbo/**',
		/** agent tooling */
		'.claude/**',
		'.cursor/**',
	],
	rules: {
		'no-restricted-imports': ['error', { paths: toPaths(RESTRICTED_PACKAGES) }],

		/**
		 * Complexity gates. Sonde's failure mode is a decision path nobody can follow, so
		 * branching is capped rather than merely discouraged. Defaults would be max 20 —
		 * deliberately tighter here.
		 */
		complexity: ['error', { max: 12, variant: 'modified' }],
		'max-depth': ['error', { max: 3 }],
		'max-params': ['error', { max: 4 }],
		'max-nested-callbacks': ['error', { max: 3 }],
		'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],

		/** unused code is a gate, not a warning */
		'typescript/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

		/** market data is full of gaps; silent coercion hides them */
		eqeqeq: ['error', 'always'],
		'no-console': ['warn', { allow: ['warn', 'error'] }],
	},
	overrides: [
		{
			/**
			 * The enforcement plane. Stricter than the rest of the tree on purpose: the gate is
			 * the one component whose correctness is not recoverable after the fact, so it stays
			 * small enough to hold in your head and read in one sitting.
			 */
			files: ['packages/risk/**'],
			rules: {
				'no-restricted-imports': ['error', { paths: toPaths(RESTRICTED_PACKAGES), patterns: RISK_FORBIDDEN }],
				complexity: ['error', { max: 8, variant: 'modified' }],
				'max-depth': ['error', { max: 2 }],
				'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
				'no-console': 'error',
			},
		},
		{
			/** the reasoning plane — advisory only */
			files: ['packages/agents/**'],
			rules: {
				'no-restricted-imports': ['error', { paths: toPaths(RESTRICTED_PACKAGES), patterns: AGENTS_FORBIDDEN }],
			},
		},
		{
			/** CCXT is wrapped by packages/venue and does not leak — ADR 0002 */
			files: ['packages/probes/**', 'packages/core/**', 'packages/db/**', 'apps/web/**'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: toPaths(RESTRICTED_PACKAGES),
						patterns: [
							{ group: ['ccxt', 'ccxt/*'], message: 'Venue access goes through @sonde/venue. See docs/decisions/0002-crypto-first-ccxt.md.' },
						],
					},
				],
			},
		},
		{
			/** tests exercise adversarial shapes; complexity caps get in the way there */
			files: ['**/*.test.ts', '**/*.spec.ts'],
			rules: {
				'max-lines-per-function': 'off',
				'max-nested-callbacks': 'off',
				complexity: 'off',
			},
		},
	],
});
