import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// This is a workaround for Next.js environments.
// It points to a locally hosted version of the PDF.js worker.
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pagesText = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // We can get more spatial info if needed, but for now, just join the strings.
    const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
    pagesText.push(pageText);
  }
  
  // We use a unique separator to make page-based cleaning easier later.
  return pagesText.join('\n\nPAGE_BREAK\n\n');
}
