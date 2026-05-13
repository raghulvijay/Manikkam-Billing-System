import jsPDF from 'jspdf';
import type { ShopSettings } from '../types';
import { fmtDateLong } from './dateFormat';

export const generateDeclarationPDF = (date: string, settings: ShopSettings): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const M = 25;
  let y = M;

  // Shop Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(settings.shopName || 'MANIKKAM & CO', PW / 2, y, { align: 'center' });
  y += 7;

  // Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(settings.addressLine1 || 'No.3/104, G.N.T Road, Karanodai, Chennai - 600 067', PW / 2, y, { align: 'center' });
  y += 5;
  if (settings.addressLine2) {
    doc.text(settings.addressLine2, PW / 2, y, { align: 'center' });
    y += 5;
  }
  doc.text(
    `GSTIN: ${settings.gstin || '33AOAPL9789B1ZU'}  |  Ph: ${settings.phone1 || '9498411373'} / ${settings.phone2 || '9840456373'}`,
    PW / 2, y, { align: 'center' }
  );
  y += 8;

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(M, y, PW - M, y);
  y += 12;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DECLARATION OF NO SALES', PW / 2, y, { align: 'center' });
  y += 12;

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const longDate = fmtDateLong(date);
  const declarationText = [
    `This is to hereby declare that there were no sales transactions conducted at our`,
    `establishment on ${longDate}.`,
    ``,
    `The shop was either closed or there were no business transactions on the above`,
    `mentioned date. This declaration is submitted for GST compliance and record-keeping`,
    `purposes as required under the Goods and Services Tax Act, 2017.`,
    ``,
    `We confirm that this declaration is true and correct to the best of our knowledge.`,
  ];

  for (const line of declarationText) {
    if (line === '') {
      y += 5;
      continue;
    }
    const wrapped = doc.splitTextToSize(line, PW - M * 2) as string[];
    doc.text(wrapped, M, y);
    y += wrapped.length * 6;
  }

  y += 8;

  // Date of declaration
  doc.setFontSize(10);
  doc.text(`Date of Declaration: ${longDate}`, M, y);
  y += 30;

  // Signature
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 70, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Authorised Signatory', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(settings.shopName || 'MANIKKAM & CO', M, y);
  y += 5;
  doc.text(settings.gstin || '33AOAPL9789B1ZU', M, y);

  return doc;
};

export const downloadDeclarationPDF = (date: string, settings: ShopSettings): void => {
  const doc = generateDeclarationPDF(date, settings);
  doc.save(`Declaration-${date}.pdf`);
};

export const getDeclarationPDFBlob = (date: string, settings: ShopSettings): Blob => {
  const doc = generateDeclarationPDF(date, settings);
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
};
