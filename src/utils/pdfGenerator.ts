import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Quote, Client, CompanyConfig, Project } from '../types';
import logo from '../assets/aldase-logo-horizontal.png';

export const generatePDF = async (
    docType: 'FACTURA' | 'PRESUPUESTO',
    data: Invoice | Quote,
    client: Client,
    project: Project | undefined,
    config: CompanyConfig
) => {
    const doc = new jsPDF();
    // --- Constants ---
    const margin = 25.4; // 1 inch approx
    const pageWidth = doc.internal.pageSize.width; // Usually 210mm
    const pageHeight = doc.internal.pageSize.height; // Usually 297mm
    const contentWidth = pageWidth - (margin * 2);

    let currentY = margin;

    // --- Colors ---
    // --- Colors ---
    // const purpleColor = [100, 0, 255]; // #6400ff (Unused)

    // --- Header ---
    // Logo (Right)
    try {
        const logoWidth = 60; // Increased size
        const logoAspectRatio = 2172 / 820; // Approx based on typical horizontal logo
        const logoHeight = logoWidth / logoAspectRatio;

        // Align right but moved left a bit
        const logoX = pageWidth - margin - logoWidth - 10;
        doc.addImage(logo, 'PNG', logoX, currentY - 5, logoWidth, logoHeight, undefined, 'FAST');
    } catch (e) {
        console.warn("Could not load logo", e);
    }

    // Company Info (Left)
    doc.setFontSize(12);
    // Dark Blue for Company Name
    doc.setTextColor(5, 43, 95); // #052b5f
    doc.setFont('helvetica', 'bold');
    doc.text(config.name.toUpperCase(), margin, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');

    // CIF
    if (config.cif) {
        doc.text(`CIF: ${config.cif}`, margin, currentY);
        currentY += 4;
    }

    doc.text(config.address, margin, currentY);
    currentY += 4;

    // Address Line 2 (City, Prov, Zip)
    const cityLine = [config.zipCode, config.city, config.province ? `(${config.province})` : ''].filter(Boolean).join(', ');
    if (cityLine) {
        doc.text(cityLine, margin, currentY);
        currentY += 4;
    }
    doc.text(`Tlf: ${config.phone}`, margin, currentY);
    currentY += 4;
    if (config.email) {
        doc.text(`Email: ${config.email}`, margin, currentY);
        currentY += 4;
    }

    currentY += 6;
    // Creation Date moved here
    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha Emisión: ${new Date(data.date).toLocaleDateString('es-ES')}`, margin, currentY);
    doc.setFont('helvetica', 'normal');

    // --- Date Section & Doc Info ---
    currentY += 10;

    // Grid Setup
    const col1X = margin;
    const col2X = margin + (contentWidth * 0.45); // Middle
    const col3X = margin + (contentWidth * 0.75); // Right side

    // Labels Row
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');

    const expiryLabel = docType === 'PRESUPUESTO' ? "Válido hasta" : "Vencimiento";

    doc.text("A la atención de", col1X, currentY);

    if (data.expiryDate) {
        doc.text(expiryLabel, col2X, currentY);
    }

    doc.text(docType === 'PRESUPUESTO' ? "N.º de presupuesto" : "N.º de factura", col3X, currentY);

    currentY += 5;

    // Values Row
    doc.setFont('helvetica', 'normal');
    // Dark Blue for Document Number (matches company name approx or just bold black?)
    // User asked strictly for Company Name color.
    // doc.setTextColor(80, 80, 80); // Default gray for values

    // -- Client Info (Simplified: Name + Contact) --
    let clientY = currentY;
    doc.setTextColor(80, 80, 80);
    doc.text(client.name, col1X, clientY);
    clientY += 5;
    if (client.contactName) {
        doc.text(client.contactName, col1X, clientY);
        clientY += 5;
    }

    // -- Expiry Date Value --
    if (data.expiryDate) {
        let validityText = '-';
        if (docType === 'PRESUPUESTO') {
            const diffTime = Math.abs(new Date(data.expiryDate).getTime() - new Date(data.date).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            validityText = `${new Date(data.expiryDate).toLocaleDateString('es-ES')} (${diffDays} días)`;
        } else {
            validityText = new Date(data.expiryDate).toLocaleDateString('es-ES');
        }
        doc.text(validityText, col2X, currentY);
    }

    // -- Document Number value --
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9); // Matches Date font size
    doc.setTextColor(0, 0, 0); // User requested Font Style match, not color so much? Or maybe both. Date is Black?
    // Date label "Fecha Emisión:" is Bold Size 9 Color Gray (80,80,80)?
    // Wait, let's check Date color.
    // Line 74: Date uses previous text color (80,80,80) or new?
    // Line 47: doc.setTextColor(80, 80, 80);
    // Line 74: Just sets font bold. So Date is Gray Bold.
    // Number is currently Black (0,0,0).
    // User said "mismo tipo de letra". Let's assume Gray Bold Size 9? Or just Bold Size 9?
    // Let's stick to Bold Size 9, keeps it readable.
    doc.text(data.number, col3X, currentY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    // -- Description --
    // Move Description below Client Info
    const descY = clientY + 5;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Descripción / Proyecto", col1X, descY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const descText = data.description || (project ? project.name : '-');
    // Width for description? Full width or just col1 width?
    // "Debajo de a la atención de". If text is long, should it span?
    // Let's wrap it to 80mm approx to avoid hitting col2 if header was there (though col2 is date now).
    // Let's give it generous width since Date is just one line.
    const splitDesc = doc.splitTextToSize(descText, (pageWidth - margin) * 0.6);
    doc.text(splitDesc, col1X, descY + 5);

    // Update currentY for table start
    // Reduce spacing: "Pegala a la descripcion"
    // Previously: currentY = descY + 5 + (splitDesc.length * 4) + 10;
    // New: + 2 or 3 padding from desc text?
    const descHeight = (splitDesc.length * 4);
    currentY = descY + 5 + descHeight + 5;

    // currentY += 35; // REMOVED large spacing

    // --- Table ---

    // Data preparation
    // Data preparation
    const tableBody: any[] = [];
    data.concepts.forEach((c) => {
        tableBody.push([
            c.description,
            c.quantity.toString(),
            c.price.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €',
            (c.quantity * c.price).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
        ]);

        if (c.details && c.details.length > 0) {
            c.details.forEach(detail => {
                if (detail.trim()) {
                    // Just the text, we will draw the bullet manually and use padding for indent
                    tableBody.push([
                        {
                            content: detail,
                            styles: {
                                fontStyle: 'italic',
                                textColor: [100, 100, 100],
                                cellPadding: { top: 1, bottom: 1, left: 6, right: 3 }
                            },
                        },
                        '',
                        '',
                        ''
                    ]);
                }
            });
        }
    });

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
        body: tableBody,
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [230, 230, 230],
            lineWidth: { bottom: 0.1 }
        },
        headStyles: {
            fontStyle: 'bold',
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineWidth: { bottom: 0.5, top: 0.5 }, // Header border
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' }, // Description
            1: { cellWidth: 25, halign: 'center' },   // Cantidad - Centered
            2: { cellWidth: 30, halign: 'center' },   // Precio - Centered
            3: { cellWidth: 35, halign: 'center' }    // Total - Centered
        },
        didDrawCell: (data) => {
            // Draw bullet for indented details
            if (data.section === 'body' && data.column.index === 0 && (data.cell.styles as any).fontStyle === 'italic') {
                const cell = data.cell;
                // Draw a small dash at x + 2
                doc.setDrawColor(100, 100, 100);
                doc.text('-', cell.x + 2, cell.y + (data.cell.styles.cellPadding as any).top + 3);
            }
        }
    });

    // --- Totals ---
    const finalY = (doc as any).lastAutoTable.finalY + 5;

    // Prevent page break split if close to bottom
    if (finalY > pageHeight - 60) {
        doc.addPage();
        currentY = margin;
    } else {
        currentY = finalY;
    }

    doc.setFontSize(10);
    // Use Dark Blue for Totals Numbers as requested? Or just keep black for labels?
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Totals Block (Right Aligned relative to content)
    // Align with the "Total" column (last column)
    const colWidth = 35;
    const colX = pageWidth - margin - colWidth;
    const centerColX = colX + (colWidth / 2);

    if (docType === 'PRESUPUESTO') {
        // PRESUPUESTO: Only show TOTAL (Base Amount / Net), no Subtotal, no IVA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 43, 95);
        doc.text("TOTAL:", centerColX - 25, currentY, { align: 'right' });
        // Use baseAmount to ensure it's without VAT
        doc.text(data.baseAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', centerColX, currentY, { align: 'center' });
    } else {
        // FACTURA: Show Subtotal, IVA, Total
        // Subtotal
        doc.text("Subtotal:", centerColX - 25, currentY, { align: 'right' }); // Label
        doc.setTextColor(5, 43, 95);
        doc.text(data.baseAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', centerColX, currentY, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Reset for next label
        currentY += 5;

        // IVA
        doc.text(`IVA (${(data.ivaRate * 100).toFixed(0)}%):`, centerColX - 25, currentY, { align: 'right' });
        doc.setTextColor(5, 43, 95);
        doc.text(data.ivaAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', centerColX, currentY, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        currentY += 6;

        // Total
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 43, 95);
        doc.text("TOTAL:", centerColX - 25, currentY, { align: 'right' });
        doc.text(data.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', centerColX, currentY, { align: 'center' });
    }

    // --- Footer Content (Terms & Notes) ---
    // Start below totals or at a fixed position if plenty of space?
    // Let's flow properly.

    let footerY = currentY + 15;

    // Check if we need a new page for terms
    // Reserve 30mm for GDPR footer
    const maxContentY = pageHeight - margin - 20;

    if (footerY > maxContentY) {
        doc.addPage();
        footerY = margin;
    }

    // Conditions / Terms
    if (data.terms) {
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Condiciones y notas:", margin, footerY);
        footerY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(8);

        const splitTerms = doc.splitTextToSize(data.terms, contentWidth);
        doc.text(splitTerms, margin, footerY);

        // Update Y for next checks (though nothing else comes after except GDPR)
        const lines = splitTerms.length || 1;
        footerY += lines * 4;
    }

    // --- Static Footer (GDPR) ---
    // Ensure it's usually on the last page, at the bottom.
    // If table/terms took up space, we might be on a new page.
    // We want this on EVERY page? Or just the last?
    // Usually Legal text is on every page or last. 
    // "El texto de protección de datos inferior no se ve" suggests it might have been cut off or covered.

    // Let's stick to simple text for now to ensure visibility.
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);

    const gdprText = config.gdprText || "En cumplimiento de la normativa, sus datos son tratados por ALDASE TECH...";
    // Split to width
    const splitGdpr = doc.splitTextToSize(gdprText, contentWidth);

    // Print from bottom up?
    // `doc.text` Y is baseline.
    const textHeight = splitGdpr.length * 3; // approx 3mm line height for font size 7
    doc.text(splitGdpr, margin, pageHeight - margin - textHeight + 5);

    // Sanitize client name for filename
    const safeClientName = client.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-_.]/g, '').trim();
    doc.save(`${data.number} - ${safeClientName}.pdf`);
};
