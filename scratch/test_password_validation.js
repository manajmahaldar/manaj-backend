/**
 * Quick offline validation test for the 6-digit password regex.
 * No MongoDB connection needed — tests only the regex logic.
 */

const isValidSixDigitPassword = (pw) => /^[0-9]{6}$/.test(pw);

const cases = [
  { label: 'CASE 1  123456 (VALID)',   input: '123456',  expect: true  },
  { label: 'CASE 2  12345  (TOO SHORT)',input: '12345',   expect: false },
  { label: 'CASE 3  1234567 (TOO LONG)',input: '1234567', expect: false },
  { label: 'CASE 4  abcdef (LETTERS)',  input: 'abcdef',  expect: false },
  { label: 'CASE 5  12345a (MIXED)',    input: '12345a',  expect: false },
  { label: 'CASE 6  12@456 (SPECIAL)',  input: '12@456',  expect: false },
  { label: 'CASE 7  "123 56" (SPACE)', input: '123 56',  expect: false },
  { label: 'CASE 8  000000 (VALID)',    input: '000000',  expect: true  },
  { label: 'CASE 9  000001 (VALID)',    input: '000001',  expect: true  },
  { label: 'CASE 10 987654 (VALID)',    input: '987654',  expect: true  },
  { label: 'CASE 11 112233 (VALID)',    input: '112233',  expect: true  },
];

let passed = 0;
let failed = 0;

for (const { label, input, expect } of cases) {
  const result = isValidSixDigitPassword(input);
  const ok = result === expect;
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} | ${label} | result=${result} expected=${expect}`);
  if (ok) passed++; else failed++;
}

console.log(`\n${passed}/${cases.length} passed  |  ${failed} failed`);
if (failed > 0) process.exit(1);
