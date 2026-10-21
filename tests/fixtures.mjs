// Fake certificates for the tests, as plain text so the tests know what to
// expect. Obviously made up. prepare-data.mjs encrypts them into a separate
// test copy of the site (see playwright.config.ts), never into dist/.
export const fakeCertificates = [
  { code: 'A0B1-C2D3', name: 'Test Student One', award: 'Test Award: First Place', edition: 'Test Edition', issued: '2026-12-01' },
  { code: 'EF56-GH78', name: 'Test Student Two', award: 'Test Award: Highly Commended', edition: 'Test Edition', issued: '2026-12-05' },
  { code: 'JK9M-NPQR', name: 'Test <i>Markup</i> & "Quotes"', award: 'Test Award', edition: 'Test Edition', issued: '2026-12-09' },
];
