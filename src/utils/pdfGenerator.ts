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
    let currentY = 15;

    // --- Colors ---
    const purpleColor = [100, 0, 255]; // #6400ff

    // --- Header ---
    // Logo (Right)
    try {
        const logoWidth = 50;
        const logoAspectRatio = 2172 / 820; // Approx based on typical horizontal logo
        doc.addImage(logo, 'PNG', 140, 10, logoWidth, logoWidth / logoAspectRatio, undefined, 'FAST');
    } catch (e) {
        console.warn("Could not load logo", e);
    }

    // Company Info (Left)
    doc.setFontSize(14);
    doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(config.name.toUpperCase(), 20, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(config.address, 20, currentY);
    currentY += 4;

    // Address Line 2 (City, Prov, Zip)
    const cityLine = [config.zipCode, config.city, config.province ? `(${config.province})` : ''].filter(Boolean).join(', ');
    if (cityLine) {
        doc.text(cityLine, 20, currentY);
        currentY += 4;
    }
    doc.text(`Tlf: ${config.phone}`, 20, currentY);

    // --- Date Section ---
    currentY += 15;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: ${new Date(data.date).toLocaleDateString('es-ES')}`, 20, currentY);

    currentY += 10;

    // --- Client / Doc Info Grid ---
    const col1X = 20;
    const col2X = 90;
    const col3X = 140;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("A la atención de", col1X, currentY);
    doc.text(docType === 'PRESUPUESTO' ? "Válido hasta" : "Fecha Vencimiento", col2X, currentY);
    doc.text(docType === 'PRESUPUESTO' ? "N.º de presupuesto" : "N.º de factura", col3X, currentY);

    currentY += 5;

    // Values
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    // Client
    doc.text(client.name, col1X, currentY);
    doc.text(client.cif, col1X, currentY + 5);
    doc.text(client.address, col1X, currentY + 10);
    doc.text(`${client.city || ''}, ${client.province || ''}`, col1X, currentY + 15);

    // Validez
    let validityText = '-';
    if (data.expiryDate) {
        if (docType === 'PRESUPUESTO') {
            const diffTime = Math.abs(new Date(data.expiryDate).getTime() - new Date(data.date).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            validityText = `- ${diffDays} días`; // Bullet style as per image
        } else {
            validityText = new Date(data.expiryDate).toLocaleDateString();
        }
    }
    doc.text(validityText, col2X, currentY);

    // Number
    doc.text(data.number, col3X, currentY);

    // Project Description Label (Right side, aligned with bottom of client info approx)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("Descripción proyecto", col3X, currentY + 15);

    // Project Name below description label? Or just next to it? 
    // Image shows explicit label. Assuming the project name goes below or isn't shown in header explicitly in image but implied.
    // Let's print project name if available relative to that label or just leave as header for table.

    currentY += 25; // Spacing before table

    // --- Table ---
    // Divider line above table headers? Image has a line.
    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY - 5, 190, currentY - 5);

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
        head: [['Descripción', 'Cantidad', 'Precio unitario', 'Precio total']],
        body: tableBody,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 4,
            textColor: [0, 0, 0],
            lineColor: [230, 230, 230],
            lineWidth: { bottom: 0.1 } // Line between rows
        },
        headStyles: {
            fontStyle: 'bold',
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineWidth: { bottom: 0 } // No border bottom for header usually, or maybe header has one
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250] // Very light gray stripe
        },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
    });

    // --- Totals ---
    const finalY = (doc as any).lastAutoTable.finalY + 2;

    // Background separation line or block for total?
    // Image shows "Total" in blue, right aligned.

    doc.setFontSize(12);
    doc.setTextColor(20, 60, 180); // Royal Blue
    doc.setFont('helvetica', 'bold');
    doc.text("Total", 150, finalY + 10, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.text(data.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', 190, finalY + 10, { align: 'right' });

    let footerY = finalY + 20;

    // --- Footer Sections ---

    // Notes
    // Hardcoded example text from image if no notes provided? 
    // "Notas:"
    // "- Se incluyen los proyectos visados..."

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Notas:", 20, footerY);
    footerY += 5;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);

    // If we have project notes or specific field
    // For now using placeholder or if we had a notes field. 
    // Let's use `project.description` or leave empty if not meant to be static.
    // The user said "Que se distingan los conceptos...". 
    // Let's use generic notes or nothing.

    if (project) {
        doc.text(`- Proyecto: ${project.name}`, 20, footerY);
        footerY += 5;
    }

    footerY += 5;

    // Conditions
    if (data.terms) {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("Condiciones de la oferta:", 20, footerY);
        footerY += 5;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        const splitTerms = doc.splitTextToSize(data.terms, 170);
        doc.text(splitTerms, 20, footerY);
    }

    // --- GDPR Footer ---
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    // Gray band background
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');

    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);

    const gdprText = config.gdprText || "En vista del cumplimiento de la normativa europea 2016/679 sobre Protección de datos (RGPD), le informamos que le tratamiento de los datos proporcionados por Ud. serán tratados bajo la responsabilidad de ALDASE TECH S.L.P...";
    const splitGdpr = doc.splitTextToSize(gdprText, pageWidth - 40);
    doc.text(splitGdpr, 20, pageHeight - 20);

    doc.save(`${docType}_${data.number}.pdf`);
};
