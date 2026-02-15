import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Quote, Client, CompanyConfig, Project } from '../types';

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
    const primaryColor = [100, 0, 255]; // Purple #6400ff (Approx for 'ALDASE')
    const lightText = [120, 120, 120];

    // --- Header ---
    // Logo (Right)
    if (config.logoUrl) {
        try {
            const logoWidth = 50;
            const logoHeight = 25; // Aspect ratio might vary, assuming landscape-ish
            doc.addImage(config.logoUrl, 'PNG', 140, 10, logoWidth, logoHeight, undefined, 'FAST');
        } catch (e) {
            console.warn("Could not load logo", e);
        }
    }

    // Company Info (Left)
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(config.name, 20, currentY);

    // "TECH" part if name is split (Optional aesthetic, assuming config.name is full name)
    // If the user wants specific ALDASE (purple) TECH (blue) split, we'd need to parse the name.
    // tailored for "ALDASE TECH, S.L.P."
    if (config.name.includes('ALDASE TECH')) {
        // This is a specific hack for the user's request to match the image exact look if config.name matches
        // But better to just print config.name for now to be generic. 
        // Let's stick to the config.name in one color for safety, or try to split if it matches.
    }

    currentY += 8;
    doc.setFontSize(10);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(config.address, 20, currentY);
    currentY += 5;
    // Use optional chaining or defaults for new fields
    const cityLine = [config.zipCode, config.city, config.province ? `(${config.province})` : ''].filter(Boolean).join(' ');
    if (cityLine) {
        doc.text(cityLine, 20, currentY);
        currentY += 5;
    }
    doc.text(`Tlf: ${config.phone}`, 20, currentY);
    currentY += 5;
    doc.text(config.email, 20, currentY);

    currentY += 20;

    // --- Document Info ---
    // Date
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: ${new Date(data.date).toLocaleDateString()}`, 20, currentY);

    currentY += 15;

    // Columns: A la atención de | Válido hasta | N.º Presupuesto
    const col1X = 20;
    const col2X = 90;
    const col3X = 140;

    // Headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("A la atención de", col1X, currentY);
    doc.text(docType === 'PRESUPUESTO' ? "Válido hasta" : "Fecha Vencimiento", col2X, currentY);
    doc.text(docType === 'PRESUPUESTO' ? "N.º de presupuesto" : "N.º de factura", col3X, currentY);

    currentY += 6;

    // Values
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);

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
            validityText = `${diffDays} días`;
        } else {
            validityText = new Date(data.expiryDate).toLocaleDateString();
        }
    }
    doc.text(validityText, col2X, currentY);

    // Number
    doc.text(data.number, col3X, currentY);

    currentY += 25;

    // Description Project Title
    if ((data as any).description || project) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("Descripción proyecto", 140, currentY - 10); // Aligned with right column visually in image? 
        // Image shows "Descripción proyecto" above the table, right aligned roughly or center.
        // Let's put it above the table.

        // const descText = (data as any).description || (project ? project.name : ''); // Removed unused var
        doc.setFont('helvetica', 'normal');
        // doc.text(descText, 140, currentY - 5);
    }

    // --- Table ---
    // Prepare body rows with details
    // We need to flatten concepts -> [Row, Detail1, Detail2...]
    const tableBody: any[] = [];

    data.concepts.forEach((c) => {
        // Main Row
        tableBody.push([
            c.description,
            c.quantity.toString(),
            c.price.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €',
            (c.quantity * c.price).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
        ]);

        // Detail Rows
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
            cellPadding: 3,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fontStyle: 'bold',
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineWidth: 0,
            // Border bottom for header?
        },
        columnStyles: {
            0: { cellWidth: 100 }, // Description wider
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
        didParseCell: (/* data */) => {
            // Remove borders if 'plain' doesn't do it fully, or add specific bottom border
            // if (data.section === 'head') {
            //     data.cell.styles.lineWidth = { bottom: 0.1 };
            // }
        },
        willDrawCell: (/* data */) => {
            // Check if it's a detail row (empty price) to maybe indent or style
        }
    });

    // --- Totals ---
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    const rightMargin = 195;

    doc.setFontSize(11);
    doc.setTextColor(20, 60, 180); // Blue for "Total" label
    doc.setFont('helvetica', 'bold');

    doc.text("Total", 160, finalY + 5);

    doc.setTextColor(0, 0, 0);
    doc.text(data.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', rightMargin, finalY + 5, { align: 'right' });

    // Optional: Breakdown (Subtotal, IVA) - Image shows specific total layout, keeping it simple or adding back if needed.
    // The image shows just simple columns, but usually Subtotal/IVA is needed.
    // Let's add them small above if wanted, or aligned with Total.

    let footerY = finalY + 15;

    // --- Notes ---
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150); // Gray title
    doc.setFont('helvetica', 'normal');
    doc.text("Notas:", 20, footerY);

    // Box for notes? Or just text. Image has a blue border box.
    // Let's draw a simple box or lines if config/notes exist.
    // Using simple text for now to match the "Description" style in image.

    if (project) {
        footerY += 5;
        doc.setTextColor(0, 0, 0);
        doc.text(`- Proyecto: ${project.name}`, 20, footerY);
    }

    // --- Terms / Conditions ---
    if (data.terms) {
        footerY += 10;
        doc.setTextColor(120, 120, 120);
        doc.text("Condiciones de la oferta:", 20, footerY);
        footerY += 5;
        doc.setTextColor(0, 0, 0);

        const splitTerms = doc.splitTextToSize(data.terms, 170);
        doc.text(splitTerms, 20, footerY);
        footerY += (splitTerms.length * 4);
    }

    // --- GDPR Footer ---
    // Bottom of page
    const pageHeight = doc.internal.pageSize.height;
    const gdprY = pageHeight - 30;

    if (config.gdprText) {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        const splitGdpr = doc.splitTextToSize(config.gdprText, 170);
        doc.text(splitGdpr, 20, gdprY);
    } else {
        // Default minimal GDPR if none provided
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        const defaultGdpr = "En cumplimiento del RGPD, le informamos que sus datos serán tratados para la gestión administrativa y fiscal.";
        doc.text(defaultGdpr, 20, gdprY);
    }

    doc.save(`${docType}_${data.number}.pdf`);
};
