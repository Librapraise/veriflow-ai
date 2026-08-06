import { parseTd3Mrz, extractFields, DEMO_PASSPORT_ADULT, DEMO_PASSPORT_MINOR, DEMO_PASSPORT_EXPIRED } from '../src/lib/tee/extractor.ts';

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

console.log('Testing scanned passport labeled dates...');
const scanned = extractFields('PASSPORT\nDATE OF BIRTH: 15 MAY 1990\nDATE OF EXPIRY: 01 JAN 2030\nPASSPORT NUMBER: L898902C3');
if (scanned.date_of_birth !== '1990-05-15' || scanned.expiry_date !== '2030-01-01') {
  console.error('FAIL: Labeled passport dates were not recovered:', scanned);
  process.exit(1);
}
console.log('PASS: Labeled passport dates:', scanned.date_of_birth, scanned.expiry_date);

console.log('Testing duplicated-month passport date...');
const duplicatedMonth = extractFields('PASSPORT\nDATE OF BIRTH: 21 OCT / OCT 00');
if (duplicatedMonth.date_of_birth !== '2000-10-21') {
  console.error('FAIL: Duplicated-month date was not recovered:', duplicatedMonth);
  process.exit(1);
}
console.log('PASS: Duplicated-month date:', duplicatedMonth.date_of_birth);
