// Re-export from utils with backward-compatible aliases
export { generateInvoicePDF, downloadInvoicePDF, getInvoicePDFBlob } from '../utils/generatePDF';
export { generateDeclarationPDF, downloadDeclarationPDF, getDeclarationPDFBlob } from '../utils/generateDeclarationPDF';

import jsPDF from 'jspdf';

export const downloadPDF = (doc: jsPDF, filename: string): void => { doc.save(filename); };

export const pdfToBlob = (doc: jsPDF): Blob =>
  new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });

export const openPDFPreview = (doc: jsPDF): void => {
  const url = URL.createObjectURL(pdfToBlob(doc));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};
