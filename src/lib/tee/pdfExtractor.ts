import { createWorker, type Worker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractPdfBufferText } from './extractor';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_EXTRACTED_TEXT_LENGTH = 10;

function normalizedExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
}

function isPdf(fileName: string, mimeType?: string): boolean {
  return mimeType === 'application/pdf' || normalizedExtension(fileName) === 'pdf';
}

function isImage(fileName: string, mimeType?: string): boolean {
  return Boolean(mimeType?.startsWith('image/')) || ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(normalizedExtension(fileName));
}

async function createOcrWorker(): Promise<Worker> {
  // Explicit CDN paths for Tesseract.js v7 so the worker resolves in production.
  // A 10-second race prevents a hung worker from stalling the whole pipeline.
  return Promise.race([
    createWorker('eng', 1, {
      workerPath: 'https://unpkg.com/tesseract.js@7/dist/worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://unpkg.com/tesseract.js-core@6/tesseract-core-simd-mt.wasm.js',
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tesseract worker init timeout')), 10000)
    ),
  ]);
}

async function recognizeImage(source: Blob | HTMLCanvasElement, worker?: Worker): Promise<string> {
  const activeWorker = worker ?? await createOcrWorker();
  try {
    const result = await activeWorker.recognize(source);
    return result.data.text.trim();
  } finally {
    if (!worker) await activeWorker.terminate();
  }
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
  const pdfDocument = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    pages.push(pageText);
    page.cleanup();
  }

  await loadingTask.destroy();
  return pages.join('\n').trim();
}

async function ocrPdf(buffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
  const pdfDocument = await loadingTask.promise;
  const worker = await createOcrWorker();
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D context is unavailable for PDF OCR');

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push(await recognizeImage(canvas, worker));
      page.cleanup();
    }
  } finally {
    await worker.terminate();
    await loadingTask.destroy();
  }

  return pages.join('\n').trim();
}

/** Extracts text from digital PDFs, scanned PDFs, images, and plain-text files. */
export async function extractDocumentText(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType?: string,
): Promise<string> {
  if (isPdf(fileName, mimeType)) {
    try {
      const textLayer = await extractPdfText(buffer);
      if (textLayer.trim().length >= MIN_EXTRACTED_TEXT_LENGTH) return textLayer;
    } catch {
      // Continue through OCR and the legacy parser before reporting failure.
    }

    try {
      const ocrText = await Promise.race([
        ocrPdf(buffer),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), 15000)),
      ]) as string;
      if (ocrText.trim().length >= MIN_EXTRACTED_TEXT_LENGTH) return ocrText;
    } catch {
      // OCR timed out or failed — the legacy parser can still recover text from simple generated PDFs.
    }

    const legacyText = await extractPdfBufferText(buffer);
    if (legacyText.trim().length >= MIN_EXTRACTED_TEXT_LENGTH) return legacyText;
    throw new Error('PDF text extraction and OCR returned empty content');
  }

  if (isImage(fileName, mimeType)) {
    const image = new Blob([buffer], { type: mimeType || `image/${normalizedExtension(fileName) || 'png'}` });
    const text = await recognizeImage(image);
    if (text.trim().length >= MIN_EXTRACTED_TEXT_LENGTH) return text;
    throw new Error('Image OCR returned empty content');
  }

  const text = new TextDecoder('utf-8').decode(buffer).trim();
  if (text.length >= MIN_EXTRACTED_TEXT_LENGTH) return text;
  throw new Error('Document text extraction returned empty content');
}
