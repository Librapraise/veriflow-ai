import { parseTd3Mrz, computeMrzCheckDigit, DEMO_PASSPORT_ADULT, DEMO_PASSPORT_MINOR, DEMO_PASSPORT_EXPIRED } from '../src/lib/tee/extractor.ts';

console.log('Testing Adult MRZ...');
const adult = parseTd3Mrz(DEMO_PASSPORT_ADULT);
console.log('Adult:', adult);

console.log('Testing Minor MRZ...');
const minor = parseTd3Mrz(DEMO_PASSPORT_MINOR);
console.log('Minor:', minor);

console.log('Testing Expired MRZ...');
const expired = parseTd3Mrz(DEMO_PASSPORT_EXPIRED);
console.log('Expired:', expired);

console.log('Testing Tampered MRZ (should throw)...');
try {
  const tampered = DEMO_PASSPORT_ADULT.replace('9005156', '9005157');
  parseTd3Mrz(tampered);
  console.error('FAIL: Tampered MRZ did not throw!');
  process.exit(1);
} catch (e) {
  console.log('PASS: Tampered MRZ threw error:', e.message);
}
