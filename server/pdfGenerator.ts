import jsPDF from 'jspdf';

export interface LetterData {
  senderFirstName: string | null;
  senderLastName: string | null;
  senderAddress?: string | null;
  recipientFirstName: string;
  recipientLastName: string;
  recipientId: string;
  facilityName: string;
  facilityAddress: string;
  subject?: string | null;
  content: string;
  date?: Date;
}

export function generateLetterPDF(letterData: LetterData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter' // 8.5x11 inches
  });

  // Page dimensions
  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.75;
  const contentWidth = pageWidth - (2 * margin);

  // Font settings
  doc.setFont('times', 'normal');
  
  // Current Y position tracker
  let currentY = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    let lineHeight = fontSize / 72; // Convert points to inches
    
    lines.forEach((line: string, index: number) => {
      doc.text(line, x, y + (index * lineHeight));
    });
    
    return y + (lines.length * lineHeight);
  };

  // 1. Sender Information (Top Left)
  doc.setFontSize(12);
  doc.setFont('times', 'normal');
  
  let senderText = `${letterData.senderFirstName || 'Unknown'} ${letterData.senderLastName || 'Sender'}`;
  if (letterData.senderAddress) {
    senderText += `\n${letterData.senderAddress}`;
  }
  
  currentY = addWrappedText(senderText, margin, currentY, contentWidth / 2);
  
  // 2. Date (Under sender info)
  currentY += 0.1; // Small spacing
  const dateStr = letterData.date ? letterData.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  doc.text(dateStr, margin, currentY);
  currentY += 0.3;

  // 3. Recipient Information (Top Right)
  const recipientX = margin + (contentWidth / 2) + 0.5;
  let recipientY = margin;
  
  doc.setFont('times', 'bold');
  doc.text('TO:', recipientX, recipientY);
  recipientY += 0.2;
  
  doc.setFont('times', 'normal');
  const recipientText = `${letterData.recipientFirstName} ${letterData.recipientLastName}\nInmate ID: ${letterData.recipientId}\n${letterData.facilityName}\n${letterData.facilityAddress}`;
  
  addWrappedText(recipientText, recipientX, recipientY, contentWidth / 2 - 0.5);

  // 4. Subject line (if provided)
  currentY += 0.3;
  if (letterData.subject) {
    doc.setFont('times', 'bold');
    doc.text('RE: ', margin, currentY);
    doc.setFont('times', 'normal');
    currentY = addWrappedText(letterData.subject, margin + 0.4, currentY, contentWidth - 0.4);
    currentY += 0.3;
  }

  // 5. Salutation
  currentY += 0.2;
  doc.text(`Dear ${letterData.recipientFirstName},`, margin, currentY);
  currentY += 0.3;

  // 6. Letter Body
  // Split content into paragraphs and handle each one
  const paragraphs = letterData.content.split(/\n\s*\n/);
  
  paragraphs.forEach((paragraph, index) => {
    if (paragraph.trim()) {
      // Check if we need a new page
      if (currentY > pageHeight - margin - 1) {
        doc.addPage();
        currentY = margin;
      }
      
      // Indent first line of each paragraph
      const firstLineIndent = 0.5;
      const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
      
      if (lines.length > 0) {
        // First line with indent
        doc.text(lines[0], margin + firstLineIndent, currentY);
        currentY += 12/72; // Line height
        
        // Remaining lines without indent
        for (let i = 1; i < lines.length; i++) {
          if (currentY > pageHeight - margin - 0.5) {
            doc.addPage();
            currentY = margin;
          }
          doc.text(lines[i], margin, currentY);
          currentY += 12/72;
        }
      }
      
      // Add spacing between paragraphs
      if (index < paragraphs.length - 1) {
        currentY += 0.2;
      }
    }
  });

  // 7. Closing and Signature
  currentY += 0.4;
  
  // Check if we need a new page for closing
  if (currentY > pageHeight - margin - 1) {
    doc.addPage();
    currentY = margin;
  }
  
  doc.text('Sincerely,', margin, currentY);
  currentY += 0.6; // Space for signature
  
  doc.text(`${letterData.senderFirstName || 'Unknown'} ${letterData.senderLastName || 'Sender'}`, margin, currentY);

  // Add footer with compliance note
  const footerY = pageHeight - 0.4;
  doc.setFontSize(8);
  doc.setFont('times', 'italic');
  const footerText = 'This letter was generated through a digital mail service and printed for delivery.';
  doc.text(footerText, margin, footerY);

  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

export function generateLetterPreview(letterData: LetterData): string {
  // Generate HTML preview that matches the PDF layout
  const date = letterData.date ? letterData.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const paragraphs = letterData.content.split(/\n\s*\n/).filter(p => p.trim());
  const formattedContent = paragraphs.map(p => `<p style="text-indent: 36px; margin-bottom: 12px;">${p.trim()}</p>`).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Letter Preview</title>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.4;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.75in;
          background: white;
          color: black;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .sender-info {
          flex: 1;
        }
        .recipient-info {
          flex: 1;
          text-align: left;
          margin-left: 36px;
        }
        .date {
          margin-bottom: 24px;
        }
        .subject {
          margin-bottom: 18px;
          font-weight: bold;
        }
        .salutation {
          margin-bottom: 18px;
        }
        .content {
          margin-bottom: 24px;
        }
        .content p {
          margin-bottom: 12px;
        }
        .closing {
          margin-top: 24px;
        }
        .signature-space {
          height: 48px;
        }
        .footer {
          margin-top: 36px;
          font-size: 8pt;
          font-style: italic;
          color: #666;
        }
        @media print {
          body { margin: 0; padding: 0.75in; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="sender-info">
          <div><strong>${letterData.senderFirstName || 'Unknown'} ${letterData.senderLastName || 'Sender'}</strong></div>
          ${letterData.senderAddress ? `<div>${letterData.senderAddress}</div>` : ''}
        </div>
        <div class="recipient-info">
          <div><strong>TO:</strong></div>
          <div>${letterData.recipientFirstName} ${letterData.recipientLastName}</div>
          <div>Inmate ID: ${letterData.recipientId}</div>
          <div>${letterData.facilityName}</div>
          <div>${letterData.facilityAddress}</div>
        </div>
      </div>
      
      <div class="date">${date}</div>
      
      ${letterData.subject ? `<div class="subject">RE: ${letterData.subject}</div>` : ''}
      
      <div class="salutation">Dear ${letterData.recipientFirstName},</div>
      
      <div class="content">
        ${formattedContent}
      </div>
      
      <div class="closing">
        <div>Sincerely,</div>
        <div class="signature-space"></div>
        <div>${letterData.senderFirstName || 'Unknown'} ${letterData.senderLastName || 'Sender'}</div>
      </div>
      
      <div class="footer">
        This letter was generated through a digital mail service and printed for delivery.
      </div>
    </body>
    </html>
  `;
}