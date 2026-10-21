// Fake certificates for the tests. Obviously made up: they are built into a
// separate test copy of the site (see playwright.config.ts) and never into dist/.
export const fakeCertificates = [
  { code: 'TEST-AB12-CD34', name: 'Test Student One', award: 'Test Award: First Place', edition: 'Test Edition', issued: '2026-12-01' },
  { code: 'TEST-EF56-GH78', name: 'Test Student Two', award: 'Test Award: Highly Commended', edition: 'Test Edition', issued: '2026-12-05' },
  { code: 'TEST <b>X</b>', name: 'Test <i>Markup</i> & "Quotes"', award: 'Test Award', edition: 'Test Edition', issued: '2026-12-09' },
];
