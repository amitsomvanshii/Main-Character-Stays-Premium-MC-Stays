import { jsPDF } from 'jspdf';

export const generateAgreementPDF = (booking) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  // occupantName is the name given at booking time; profile name is the account name
  const studentName = booking?.occupantName || booking?.user?.name || 'Resident';
  const pgName = booking?.bed?.floor?.pg?.name || 'SmartPG Property';
  const address = booking?.bed?.floor?.pg?.address || 'Property Location';
  const bedId = booking?.bed?.identifier || 'N/A';
  const rent = Math.round((booking?.bed?.floor?.pg?.rentMonthly || 0) * (booking?.bed?.priceMultiplier || 1.0));
  const date = new Date().toLocaleDateString();

  // ─── Header ───
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text('RESIDENCY & LICENCE AGREEMENT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(20, 25, pageWidth - 20, 25);

  // ─── Section 1: Parties ───
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. PARTIES TO THE AGREEMENT', 20, 40);
  
  doc.setFont('helvetica', 'normal');
  const partiesText = `This digital agreement is entered on ${date} between the Property Owner (hereinafter referred to as 'Licensor') and ${studentName} (hereinafter referred to as 'Licensee').`;
  const splitParties = doc.splitTextToSize(partiesText, pageWidth - 40);
  doc.text(splitParties, 20, 48);

  // ─── Section 2: Property Details ───
  doc.setFont('helvetica', 'bold');
  doc.text('2. DESCRIPTION OF PREMISES', 20, 65);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Property: ${pgName}`, 25, 73);
  doc.text(`Address: ${address}`, 25, 80);
  doc.text(`Allocated Unit: Bed ${bedId} (Floor ${booking?.bed?.floor?.floorNumber || 'N/A'})`, 25, 87);

  // ─── Section 3: Financial Terms ───
  doc.setFont('helvetica', 'bold');
  doc.text('3. FINANCIAL OBLIGATIONS', 20, 100);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`- Monthly Licence Fee (Rent): INR ${rent.toLocaleString()}`, 25, 108);
  doc.text(`- Payment Due Date: 1st to 5th of every calendar month.`, 25, 115);
  doc.text(`- Security Deposit: As per initial booking confirmation.`, 25, 122);

  // ─── Section 4: Rules & Regulations ───
  doc.setFont('helvetica', 'bold');
  doc.text('4. CODE OF CONDUCT & RULES', 20, 135);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rules = [
    '• Quiet hours are strictly observed between 10:00 PM and 7:00 AM.',
    '• Licensee shall maintain cleanliness in common areas and personal units.',
    '• No smoking, alcohol, or prohibited substances are allowed within the premises.',
    '• Visitors are permitted in common areas only until 9:00 PM.',
    '• Any damage to property will be billed directly to the Licensee.',
    '• 30-day notice is mandatory prior to vacating the premises.',
    '• The Licensor reserves the right of entry for emergency maintenance.'
  ];
  
  let yPos = 143;
  rules.forEach(rule => {
    doc.text(rule, 25, yPos);
    yPos += 7;
  });

  // ─── Section 5: Legal Certification ───
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('5. DIGITAL CERTIFICATION', 20, 200);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This document is electronically generated and verified through the SmartPG digital onboarding system.', 20, 208);

  // ─── Digital Stamp / Signature ───
  doc.setDrawColor(233, 30, 99); // Primary pink-ish
  doc.setLineWidth(1);
  doc.rect(20, 220, 80, 40); // Signature box
  
  doc.setTextColor(233, 30, 99);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITALLY SIGNED', 60, 235, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(studentName.toUpperCase(), 60, 245, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Timestamp: ${new Date().toISOString()}`, 60, 253, { align: 'center' });
  doc.text(`Verified via Aadhar: ${booking?.aadharNumber || 'Pending'}`, 60, 257, { align: 'center' });

  // ─── Footer ───
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.text(`Page 1 of 1 | Document Ref: ${booking?.id || 'ALPHA-001'}`, pageWidth / 2, 285, { align: 'center' });

  // ─── Save ───
  doc.save(`Residency_Agreement_${studentName.replace(/\s+/g, '_')}.pdf`);
};
