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
    const purpleColor = [100, 0, 255]; // #6400ff

    // --- Header ---
    // Logo (Right)
    try {
        const logoWidth = 40;
        const logoAspectRatio = 2172 / 820; // Approx based on typical horizontal logo
        const logoHeight = logoWidth / logoAspectRatio;

        // Align right
        const logoX = pageWidth - margin - logoWidth;
        doc.addImage(logo, 'PNG', logoX, currentY - 5, logoWidth, logoHeight, undefined, 'FAST');
    } catch (e) {
        console.warn("Could not load logo", e);
    }

    // Company Info (Left)
    doc.setFontSize(12);
    doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]);
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

    // --- Date Section & Doc Info ---
    currentY += 15;

    // Grid Setup
    const col1X = margin;
    const col2X = margin + (contentWidth * 0.45); // Middle
    const col3X = margin + (contentWidth * 0.75); // Right side

    // Labels Row
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');

    doc.text("A la atención de", col1X, currentY);
    doc.text("Fechas", col2X, currentY);
    doc.text(docType === 'PRESUPUESTO' ? "N.º de presupuesto" : "N.º de factura", col3X, currentY);

    currentY += 5;

    // Values Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    // Client Info
    doc.text(client.name, col1X, currentY);
    if (client.cif) doc.text(client.cif, col1X, currentY + 5);
    doc.text(client.address, col1X, currentY + 10);
    doc.text(`${client.city || ''}, ${client.province || ''}`, col1X, currentY + 15);

    // Date / Validity
    const dateLabel = "Emisión:";
    const expiryLabel = docType === 'PRESUPUESTO' ? "Válido hasta:" : "Vencimiento:";

    let validityText = '-';
    if (data.expiryDate) {
        if (docType === 'PRESUPUESTO') {
            const diffTime = Math.abs(new Date(data.expiryDate).getTime() - new Date(data.date).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            validityText = `${new Date(data.expiryDate).toLocaleDateString('es-ES')} (${diffDays} días)`;
        } else {
            validityText = new Date(data.expiryDate).toLocaleDateString('es-ES');
        }
    }

    doc.text(`${dateLabel} ${new Date(data.date).toLocaleDateString('es-ES')}`, col2X, currentY);
    doc.text(`${expiryLabel} ${validityText}`, col2X, currentY + 5);

    // Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(data.number, col3X, currentY);

    // Project Description / Name
    // User wants "Conceptos, descripcion y condiciones" linked.
    doc.setFontSize(9);
    doc.text("Descripción / Proyecto", col3X, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    // Use data.description if available (user input), fallback to project name
    const descText = data.description || (project ? project.name : '-');
    const splitDesc = doc.splitTextToSize(descText, (pageWidth - margin) - col3X);
    doc.text(splitDesc, col3X, currentY + 20);

    currentY += 35; // Spacing before table

    // --- Table ---
    // Divider line?
    // doc.setDrawColor(200, 200, 200);
    // doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);

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
                    tableBody.push([
                        { content: detail, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } },
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
            halign: 'center' // Header centered? or per column?
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' }, // Description
            1: { cellWidth: 25, halign: 'center' },   // Cantidad - Centered
            2: { cellWidth: 30, halign: 'center' },   // Precio - Centered (was right)
            3: { cellWidth: 35, halign: 'center' }    // Total - Centered (was right)
        },
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
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Totals Block (Right Aligned relative to content)
    const totalsX = pageWidth - margin - 40;
    const totalsLabelX = totalsX - 10;

    // Subtotal
    doc.text("Subtotal:", totalsLabelX, currentY, { align: 'right' });
    doc.text(data.baseAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    // IVA
    doc.text(`IVA (${(data.ivaRate * 100).toFixed(0)}%):`, totalsLabelX, currentY, { align: 'right' });
    doc.text(data.ivaAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 60, 180); // Blue
    doc.text("TOTAL:", totalsLabelX, currentY, { align: 'right' });
    doc.text(data.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', pageWidth - margin, currentY, { align: 'right' });

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

    doc.save(`${docType}_${data.number}.pdf`);
};
