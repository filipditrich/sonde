import { expect, test } from 'bun:test';

import { parseSubmissionsSic, submissionsUrl } from './submissions';

const apple = await Bun.file(new URL('./__fixtures__/submissions-apple.json', import.meta.url)).text();

test('submissions URL is the data.sec.gov CIK file', () => {
	expect(submissionsUrl('0000320193')).toBe('https://data.sec.gov/submissions/CIK0000320193.json');
});

test('parses a 4-digit SIC and its major group from submissions JSON', () => {
	expect(parseSubmissionsSic(apple)).toEqual({ sic: '3571', sicMajorGroup: '35', sicDescription: 'Electronic Computers' });
});

test('pads a short numeric SIC and rejects missing codes', () => {
	expect(parseSubmissionsSic('{"sic":283,"sicDescription":"Drugs"}')).toEqual({
		sic: '0283',
		sicMajorGroup: '02',
		sicDescription: 'Drugs',
	});
	expect(parseSubmissionsSic('{')).toEqual({ failure: 'submissions-not-json' });
	expect(parseSubmissionsSic('{"sicDescription":"x"}')).toEqual({ failure: 'sic-missing' });
	expect(parseSubmissionsSic('{"sic":"3571"}')).toEqual({ failure: 'sic-description-missing' });
});
