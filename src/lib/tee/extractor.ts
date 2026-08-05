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
  currency?: string;
  roles?: Array<{ title?: string; employer?: string; end_date?: string }>;
  education?: Array<{ degree?: string; institution?: string }>;
  raw_text?: string;
}

export class UnsupportedDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedDocumentError';
  }
}

const SUPPORTED_CURRENCY_CODES = [
  'NGN', 'USD', 'EUR', 'GBP', 'GHS', 'ZAR', 'KES', 'CAD', 'AUD', 'JPY', 'CNY', 'INR',
] as const;

function detectDocumentCurrency(text: string): string | undefined {
  const normalized = text
    .normalize('NFKC')
    .replace(/\bN\s*G\s*N\b/gi, 'NGN')
    .replace(/\bU\s*S\s*D\b/gi, 'USD')
    .toUpperCase();
  const codePattern = SUPPORTED_CURRENCY_CODES.join('|');
  const explicitCode = normalized.match(
    new RegExp(`(?:CURRENCY|CURR(?:ENCY)?\\s*CODE)\\s*[:=\\-]?\\s*(${codePattern})\\b`, 'i'),
  );
  if (explicitCode) return explicitCode[1].toUpperCase();

  if (/\b(?:NGN|NAIRA)\b/i.test(normalized) || text.includes('₦')) return 'NGN';
  if (/\bGHS\b/i.test(normalized) || text.includes('₵')) return 'GHS';
  if (/\b(?:ZAR|RAND)\b/i.test(normalized) || text.includes('R ')) return 'ZAR';
  if (/\bKES\b/i.test(normalized) || /\bKSH\b/i.test(normalized)) return 'KES';
  if (/\bEUR\b/i.test(normalized) || text.includes('€')) return 'EUR';
  if (/\bGBP\b/i.test(normalized) || text.includes('£')) return 'GBP';
  if (/\bINR\b/i.test(normalized) || text.includes('₹')) return 'INR';
  if (/\bJPY\b/i.test(normalized) || text.includes('¥')) return 'JPY';
  if (/\bCNY\b/i.test(normalized) || text.includes('CN¥')) return 'CNY';
  if (/\bCAD\b/i.test(normalized)) return 'CAD';
  if (/\bAUD\b/i.test(normalized)) return 'AUD';
  if (/\bUSD\b/i.test(normalized) || text.includes('$')) return 'USD';
  return undefined;
}

function extractInstitutionName(text: string): string | undefined {
  const normalized = text
    .replace(/[|_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const patterns = [
    /\b(?:the\s+)?university\s+of\s+[A-Za-z][A-Za-z&'.-]*(?:\s+(?:of|the|and|&|[A-Za-z][A-Za-z&'.-]*)){0,5}\b/i,
    /\b(?:the\s+)?[A-Za-z][A-Za-z&'.-]*(?:\s+(?:of|the|and|&|[A-Za-z][A-Za-z&'.-]*)){0,5}\s+(?:university|college|polytechnic|academy)\b/i,
    /\b(?:the\s+)?[A-Za-z][A-Za-z&'.-]*(?:\s+(?:of|the|and|&|[A-Za-z][A-Za-z&'.-]*)){0,4}\s+institute\s+of\s+[A-Za-z][A-Za-z&'.-]*(?:\s+[A-Za-z][A-Za-z&'.-]*){0,3}\b/i,
    /\b(?:the\s+)?[A-Za-z][A-Za-z&'.-]*(?:\s+(?:of|the|and|&|[A-Za-z][A-Za-z&'.-]*)){0,5}\s+institute\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    let candidate = cleanPdfTextString(match[0]);
    const lastArticle = candidate.toLowerCase().lastIndexOf('the ');
    if (lastArticle > 0) candidate = candidate.slice(lastArticle);

    const words = candidate.split(/\s+/);
    while (words.length > 2 && words[0].length <= 2 && words[0].toLowerCase() !== 'of') {
      words.shift();
    }
    candidate = words.join(' ').trim();

    if (candidate.length >= 8) return candidate;
  }

  return undefined;
}

function extractDegreeTitle(text: string): string | undefined {
  const normalized = text
    .replace(/[|_]+/g, ' ')
    .replace(/\bB\s*[.,]?\s*(SC|ENG|TECH|ED|A|LAW)\b/gi, 'B.$1')
    .replace(/\bM\s*[.,]?\s*(SC|ENG|TECH|ED|A|LAW)\b/gi, 'M.$1')
    .replace(/\bP\s*[.,]?\s*H\s*[.,]?\s*D\b/gi, 'Ph.D')
    .replace(/\s+/g, ' ')
    .trim();

  const patterns = [
    /\b(?:bachelor|master|doctor(?:ate)?|associate)(?:'s)?(?:\s+degree)?\s+(?:of|in)\s+[A-Za-z][A-Za-z&'.-]*(?:\s+(?:of|the|and|&|in|[A-Za-z][A-Za-z&'.-]*)){0,5}\b/i,
    /\b(?:higher\s+national\s+diploma|ordinary\s+national\s+diploma|national\s+diploma)(?:\s+(?:in|of)\s+[A-Za-z][A-Za-z&'.-]*(?:\s+[A-Za-z][A-Za-z&'.-]*){0,5})?\b/i,
    /\b(?:B\.(?:SC|ENG|TECH|ED|A|LAW)|M\.(?:SC|ENG|TECH|ED|A|LAW)|PH\.D|HND|OND|ND)\.?\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const candidate = cleanPdfTextString(match[0])
      .split(/\b(?:awarded|conferred|certificate|university|college|polytechnic|institute|dated|having|hereby)\b/i)[0]
      .replace(/\s+(?:with|from|at|by)\s*$/i, '')
      .trim();

    if (candidate.length >= 3 && !/^degree$/i.test(candidate)) return candidate;
  }

  return undefined;
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
 * Asynchronously inflates PDF FlateDecode streams inside enclave memory
 * to extract plain text string literals from PDF array buffers.
 */
export async function extractPdfBufferText(rawBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(rawBuffer);
  const rawString = new TextDecoder('latin1').decode(bytes);

  const decompressedChunks: string[] = [];

  let pos = 0;
  while (pos < bytes.length) {
    const streamIdx = rawString.indexOf('stream', pos);
    if (streamIdx === -1) break;

    // Find start of stream data (after \r\n or \n)
    let dataStart = streamIdx + 6;
    if (bytes[dataStart] === 13) dataStart++; // \r
    if (bytes[dataStart] === 10) dataStart++; // \n

    // Find endstream
    const endIdx = rawString.indexOf('endstream', dataStart);
    if (endIdx === -1) break;

    let dataEnd = endIdx;
    if (dataEnd > dataStart && bytes[dataEnd - 1] === 10) dataEnd--; // \n
    if (dataEnd > dataStart && bytes[dataEnd - 1] === 13) dataEnd--; // \r

    if (dataEnd > dataStart) {
      const streamBytes = bytes.subarray(dataStart, dataEnd);

      if (typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          await writer.write(streamBytes);
          await writer.close();
          const response = new Response(ds.readable);
          const inflatedBuffer = await response.arrayBuffer();
          const inflatedText = new TextDecoder('utf-8').decode(inflatedBuffer);
          if (inflatedText.trim().length > 0) {
            decompressedChunks.push(inflatedText);
          }
        } catch {
          try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            await writer.write(streamBytes);
            await writer.close();
            const response = new Response(ds.readable);
            const inflatedBuffer = await response.arrayBuffer();
            const inflatedText = new TextDecoder('utf-8').decode(inflatedBuffer);
            if (inflatedText.trim().length > 0) {
              decompressedChunks.push(inflatedText);
            }
          } catch {}
        }
      }
    }

    pos = endIdx + 9;
  }

  const combinedRaw = rawString + '\n' + decompressedChunks.join('\n');
  const parenthesisTexts: string[] = [];
  const parenRegex = /\(([^()]{2,200})\)/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = parenRegex.exec(combinedRaw)) !== null) {
    const candidate = pMatch[1].replace(/\\([0-9]{3}|.)/g, '$1');
    // Only accept printable ASCII strings (no binary stream noise)
    if (/^[\x20-\x7E\s]+$/.test(candidate) && candidate.trim().length > 1) {
      parenthesisTexts.push(candidate.trim());
    }
  }

  return combinedRaw + '\n' + parenthesisTexts.join(' ');
}

function cleanPdfTextString(raw: string): string {
  let s = raw.replace(/\\([()\\\/])/g, '$1');
  s = s.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
  s = s.replace(/\/[A-Za-z0-9]+\s+\d+(?:\.\d+)?\s+Tf/gi, ' ');
  s = s.replace(/[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+T[dm]/gi, ' ');
  return s.replace(/\s+/g, ' ').trim();
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

  // Tier 3: Dynamic Heuristics for Payslips, Income, Degrees, Resumes & Diplomas
  const pdfExtracted = text.replace(/\(([^()]{2,120})\)/g, ' $1 ').replace(/\\[nrtf]/g, ' ');
  const fullText = cleanPdfTextString(text + '\n' + pdfExtracted);

  const resultFields: ExtractedFields = {};

  // Prefer explicit ISO currency declarations, then symbols and currency names.
  const currency = detectDocumentCurrency(text + '\n' + fullText);

  // Dynamic Bank Statement & Account Holder Extraction
  const accountNameMatch = fullText.match(/(?:account\s*name|account\s*holder|name)\s*[:\s]*([A-Z\.\s]{3,35})/i);
  if (accountNameMatch) {
    resultFields.full_name = cleanPdfTextString(accountNameMatch[1]);
  }

  const bankMatch = fullText.match(/(?:zenith\s*bank|gtbank|guaranty\s*trust|access\s*bank|first\s*bank|uba|united\s*bank|chase|bank\s*of\s*america|wells\s*fargo|hsbc|barclays|citi)\b[A-Za-z\s]*/i);
  if (bankMatch) {
    resultFields.employer_name = cleanPdfTextString(bankMatch[0]);
  }

  // 1. Bank Statement & Income Extraction
  const financialMatches = fullText.match(/(?:total|balance|cleared|closing|ending|gross|salary|income|credit|deposit|pay|amount)[^\d]{0,40}?([₦\$€£]?\s*[\d,]{3,12}(?:\.\d{1,2})?)/gi);
  let maxAmount = 0;
  if (financialMatches) {
    for (const matchStr of financialMatches) {
      const numMatch = matchStr.match(/[\d,]{3,12}(?:\.\d{1,2})?/);
      if (numMatch) {
        const val = parseFloat(numMatch[0].replace(/,/g, ''));
        if (!isNaN(val) && val > maxAmount) {
          maxAmount = val;
        }
      }
    }
  }
  if (maxAmount > 0) {
    resultFields.gross_income = maxAmount;
    resultFields.average_balance = maxAmount;
    if (currency) resultFields.currency = currency;
  }

  // Dynamic Employer / Company Extraction
  const employerMatch = fullText.match(/(?:employer|company|organization|working\s+at|employed\s+at)\s*[:\s]*([A-Z][A-Za-z0-9\s]{2,30})/i);
  if (employerMatch) {
    resultFields.employer_name = cleanPdfTextString(employerMatch[1]);
  }

  // 2. Degree Title & Academic Institution Extraction
  // Standalone words such as "degree" are not credentials. Keep matches
  // bounded so OCR noise and surrounding certificate prose are not absorbed.
  const degreeTitle = extractDegreeTitle(text + '\n' + fullText);
  if (degreeTitle) resultFields.degree_title = degreeTitle;

  const institution = extractInstitutionName(text + '\n' + fullText);
  if (institution) resultFields.institution = institution;

  // 3. Resume & Employment Role Extraction
  const roleMatch = fullText.match(/\b(?:software\s+engineer|full\s*stack|frontend|backend|data\s+scientist|project\s+manager|product\s+manager|developer|engineer|manager|architect|consultant|analyst|intern|lead)\b/i);
  if (roleMatch) {
    const hasPresent = /\b(?:present|currently|current|now|till\s+date|202[4-9])\b/i.test(fullText);
    const cleanedRole = cleanPdfTextString(roleMatch[0]);
    if (cleanedRole.length > 2) {
      resultFields.roles = [
        {
          title: cleanedRole,
          employer: resultFields.employer_name || 'Organization',
          end_date: hasPresent ? 'Present' : 'Past'
        }
      ];
    }
  }

  if (resultFields.degree_title || resultFields.institution) {
    resultFields.education = [
      {
        degree: resultFields.degree_title,
        institution: resultFields.institution
      }
    ];
  }

  // Return extracted fields ONLY if valid real fields were extracted
  if (
    resultFields.gross_income !== undefined ||
    resultFields.degree_title ||
    resultFields.institution ||
    resultFields.employer_name ||
    (resultFields.roles && resultFields.roles.length > 0)
  ) {
    return resultFields;
  }

  return {};
}

/** Pre-computed Demo Preset Files */
export const DEMO_PASSPORT_ADULT = `P<USARIVERA<<ALEX<<<<<<<<<<<<<<<<<<<<<<<<<<<
L898902C36USA9005156M3001019ZE184226B<<<<<12`;

export const DEMO_PASSPORT_MINOR = `P<USACHEN<<MAYA<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
P123456789USA0906205F3001019<<<<<<<<<<<<<<02`;

export const DEMO_PASSPORT_EXPIRED = `P<USAOKAFOR<<SAM<<<<<<<<<<<<<<<<<<<<<<<<<<<<
X555123459USA8503105M2001012<<<<<<<<<<<<<<04`;
