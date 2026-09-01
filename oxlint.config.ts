import { defineConfig } from 'oxlint';

/**
 * Sonde lint gates.
 *
 * Architectural invariants are carried as *rules*, not prose. The two that matter most —
 * risk cannot reach a model and analysis cannot reach planning, risk, or a venue (ADR 0015) —
 * are enforced here rather than trusted to review. An agent obeys what fails and skims what
 * is documented.
 *
 * The restricted-import lists may only ever grow.
 */

/** dependencies that contradict a decision, everywhere in the tree */
const RESTRICTED_PACKAGES = [
	['backtesting', 'No backtesting engine for the LLM path. See docs/decisions/0004-no-llm-backtests.md.'],
	['grademark', 'No backtesting engine for the LLM path. See docs/decisions/0004-no-llm-backtests.md.'],
	['backtest', 'No backtesting engine for the LLM path. See docs/decisions/0004-no-llm-backtests.md.'],
	['ccxt', 'Crypto venue infrastructure is outside the active application. See docs/decisions/0020-strategy-v1-common-equities-only.md.'],
	['moment', 'Use Temporal or date-fns. Market data is timestamp-heavy and moment is mutable.'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

const toPaths = (entries: ReadonlyArray<readonly [string, string]>) => entries.map(([name, message]) => ({ name, message }));

/** the gate must not be able to reach a model, a venue, or the network — ADR 0015 */
const RISK_FORBIDDEN = [
	{
		group: ['@sonde/agents', '@sonde/agents/*'],
		message: 'The risk gate must not be able to import a model. See docs/decisions/0015-deterministic-planning-promotable-analysis.md.',
	},
	{
		group: ['@sonde/venue', '@sonde/venue/*'],
		message: 'The gate decides; it does not execute. See docs/decisions/0015-deterministic-planning-promotable-analysis.md.',
	},
	{
		group: ['@anthropic-ai/sdk', '@anthropic-ai/sdk/*'],
		message: 'No model in the enforcement plane. See docs/decisions/0015-deterministic-planning-promotable-analysis.md.',
	},
	{
		group: ['openai', 'openai/*'],
		message: 'No model in the enforcement plane. See docs/decisions/0015-deterministic-planning-promotable-analysis.md.',
	},
];

/** the analyst runtime is advisory and cannot construct or approve execution — ADR 0015 */
const AGENTS_FORBIDDEN = [
	{
		group: ['@sonde/planning', '@sonde/planning/*', '@sonde/risk', '@sonde/risk/*', '@sonde/venue', '@sonde/venue/*'],
		message:
			'Analysts emit annotations, never proposals, risk decisions, or orders. See docs/decisions/0015-deterministic-planning-promotable-analysis.md.',
	},
];

/** the public site is isolated from every operational/domain package and application module — ADR 0030 */
const PUBLIC_SITE_FORBIDDEN = [
	['@sonde/core', 'The public site is read-only and must not import operational or domain packages. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/db', 'The public site must not reach the evidence database. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/engine', 'The public site must not import the engine. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/probes', 'The public site must not acquire source data. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/risk', 'The public site must not import enforcement code. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/planning', 'The public site must not import planning code. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/venue', 'The public site must not import venue code. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/agents', 'The public site must not import analyst runtime code. See docs/decisions/0030-public-product-site.md.'],
	['@sonde/web', 'The public site must not import the private cockpit. See docs/decisions/0030-public-product-site.md.'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

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
			files: ['apps/site/**'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: toPaths(PUBLIC_SITE_FORBIDDEN),
						patterns: [
							{
								group: [
									'@sonde/*',
									'@sonde/**',
									'**/web/**',
									'**/engine/**',
									'**/db/**',
									'**/probes/**',
									'**/risk/**',
									'**/agents/**',
									'**/planning/**',
									'**/venue/**',
									'**/packages/**',
									'**/apps/**',
								],
								message: 'The public site cannot import operational application modules. See docs/decisions/0030-public-product-site.md.',
							},
						],
					},
				],
			},
		},
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
