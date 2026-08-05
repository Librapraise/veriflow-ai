/**
 * VeriFlow AI — Enclave Text & MRZ Extractor
 *
 * Implements ICAO 9303 TD3 MRZ parsing with 7-3-1 check digit validation,
 * structured sample markers (%%VERIFLOW-FIELDS {json}), regex heuristics,
 * and pre-computed demo vectors.
 */

export interface ExtractedFields {
  full_name?: string;
  date_of_birth?: string; // YYYY-MM-DD
  expiry_date?: string;   // YYYY-MM-DD
  issuing_country?: string;
  document_number?: string;
  gross_income?: number;
  net_income?: number;
  employer_name?: string;
  degree_title?: string;
  institution?: string;
  graduation_date?: string;
  average_balance?: number;
  raw_text?: string;
}

export class UnsupportedDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedDocumentError';
  }
}

/**
 * Calculates ICAO 7-3-1 check digit for MRZ string slice.
 */
export function computeMrzCheckDigit(str: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    let val = 0;
    if (char >= '0' && char <= '9') {
      val = char.charCodeAt(0) - 48;
    } else if (char >= 'A' && char <= 'Z') {
      val = char.charCodeAt(0) - 55;
    } else if (char === '<') {
      val = 0;
    } else {
      val = 0;
    }
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

/**
 * Parses ICAO 9303 TD3 passport MRZ (2 lines × 44 chars).
 * Validates check digits for doc number, DOB, expiry, and composite.
 */
export function parseTd3Mrz(text: string): ExtractedFields {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length === 44 && l.startsWith('P'));

  let line1: string | null = null;
  let line2: string | null = null;

  if (lines.length >= 2) {
    line1 = lines[0];
    line2 = lines[1];
  } else {
    // Attempt regex fallback if embedded within larger text
    const match = text.match(/(P[<A-Z0-9]{43})\s*\r?\n\s*([A-Z0-9<]{44})/);
    if (match) {
      line1 = match[1];
      line2 = match[2];
    }
  }

  if (!line1 || !line2) {
    throw new UnsupportedDocumentError('No valid 2-line x 44-char ICAO TD3 MRZ found');
  }

  // Line 1: Name extraction
  const nameSection = line1.slice(5, 44);
  const nameParts = nameSection.split('<<').filter(Boolean);
  const surname = nameParts[0] ? nameParts[0].replace(/</g, ' ').trim() : '';
  const givenNames = nameParts[1] ? nameParts[1].replace(/</g, ' ').trim() : '';
  const fullName = `${givenNames} ${surname}`.trim();

  // Line 2: Slices & Check digits
  const docNum = line2.slice(0, 9);
  const docNumCheck = parseInt(line2[9], 10);
  if (computeMrzCheckDigit(docNum) !== docNumCheck) {
    throw new UnsupportedDocumentError('MRZ document number check digit failed');
  }

  const issuingCountry = line1.slice(2, 5).replace(/</g, '');

  const dobRaw = line2.slice(13, 19); // YYMMDD
  const dobCheck = parseInt(line2[19], 10);
  if (computeMrzCheckDigit(dobRaw) !== dobCheck) {
    throw new UnsupportedDocumentError('MRZ date of birth check digit failed');
  }

  const expiryRaw = line2.slice(21, 27); // YYMMDD
  const expiryCheck = parseInt(line2[27], 10);
  if (computeMrzCheckDigit(expiryRaw) !== expiryCheck) {
    throw new UnsupportedDocumentError('MRZ expiry date check digit failed');
  }

  const compositeInput = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);
  const compositeCheck = parseInt(line2[43], 10);
  if (computeMrzCheckDigit(compositeInput) !== compositeCheck) {
    throw new UnsupportedDocumentError('MRZ composite check digit failed');
  }

  // Convert YYMMDD to YYYY-MM-DD
  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  const dobYY = parseInt(dobRaw.slice(0, 2), 10);
  const dobMM = dobRaw.slice(2, 4);
  const dobDD = dobRaw.slice(4, 6);
  const dobYYYY = dobYY <= currentYY ? 2000 + dobYY : 1900 + dobYY;
  const dateOfBirth = `${dobYYYY}-${dobMM}-${dobDD}`;

  const expiryYY = parseInt(expiryRaw.slice(0, 2), 10);
  const expiryMM = expiryRaw.slice(2, 4);
  const expiryDD = expiryRaw.slice(4, 6);
  const expiryYYYY = 2000 + expiryYY;
  const expiryDate = `${expiryYYYY}-${expiryMM}-${expiryDD}`;

  return {
    full_name: fullName,
    date_of_birth: dateOfBirth,
    expiry_date: expiryDate,
    issuing_country: issuingCountry,
    document_number: docNum.replace(/</g, ''),
  };
}

/**
 * Main Enclave Extraction Ladder:
 * 1. MRZ (Passport/Driver's License)
 * 2. Structured JSON Marker (%%VERIFLOW-FIELDS {json})
 * 3. Heuristics (Income/Degree/Payslip)
 * 4. Fallback throw UnsupportedDocumentError
 */
export function extractFields(fileTextOrBuffer: string): ExtractedFields {
  const text = fileTextOrBuffer.trim();

  // Tier 1: MRZ Parsing
  if (text.includes('P<') || text.match(/P[<A-Z0-9]{43}/)) {
    try {
      return parseTd3Mrz(text);
    } catch (e) {
      if (e instanceof UnsupportedDocumentError) throw e;
    }
  }

  // Tier 2: Structured Sample Marker (%%VERIFLOW-FIELDS {json})
  if (text.includes('%%VERIFLOW-FIELDS')) {
    try {
      const markerIndex = text.indexOf('%%VERIFLOW-FIELDS');
      const jsonStr = text.slice(markerIndex + '%%VERIFLOW-FIELDS'.length).trim();
      const fields = JSON.parse(jsonStr);
      return fields as ExtractedFields;
    } catch {
      throw new UnsupportedDocumentError('Invalid structured JSON payload marker');
    }
  }

  // Tier 3: Text Heuristics for Payslip / Income / Degree
  if (text.toLowerCase().includes('payslip') || text.toLowerCase().includes('salary')) {
    const grossMatch = text.match(/gross\s*(?:income|pay)?\s*:\s*\$?([\d,]+(?:\.\d{2})?)/i);
    const netMatch = text.match(/net\s*(?:income|pay)?\s*:\s*\$?([\d,]+(?:\.\d{2})?)/i);
    const employerMatch = text.match(/employer\s*:\s*([^\n\r]+)/i);

    if (grossMatch || netMatch) {
      return {
        gross_income: grossMatch ? parseFloat(grossMatch[1].replace(/,/g, '')) : undefined,
        net_income: netMatch ? parseFloat(netMatch[1].replace(/,/g, '')) : undefined,
        employer_name: employerMatch ? employerMatch[1].trim() : undefined,
      };
    }
  }

  if (text.toLowerCase().includes('degree') || text.toLowerCase().includes('university')) {
    const degreeMatch = text.match(/(?:bachelor|master|doctor|degree)\s+of\s+[^\n\r,]+/i);
    const instMatch = text.match(/(?:university|college|institute)\s+of\s+[^\n\r,]+/i);

    if (degreeMatch || instMatch) {
      return {
        degree_title: degreeMatch ? degreeMatch[0].trim() : undefined,
        institution: instMatch ? instMatch[0].trim() : undefined,
      };
    }
  }

  throw new UnsupportedDocumentError('Document type not recognized or unparseable in Enclave RAM');
}

/** Pre-computed Demo Preset Files */
export const DEMO_PASSPORT_ADULT = `P<USARIVERA<<ALEX<<<<<<<<<<<<<<<<<<<<<<<<<<<
L898902C36USA9005156M3001019ZE184226B<<<<<12`;

export const DEMO_PASSPORT_MINOR = `P<USACHEN<<MAYA<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
P123456789USA0906205F3001019<<<<<<<<<<<<<<02`;

export const DEMO_PASSPORT_EXPIRED = `P<USAOKAFOR<<SAM<<<<<<<<<<<<<<<<<<<<<<<<<<<<
X555123459USA8503105M2001012<<<<<<<<<<<<<<04`;
