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
    let currentY = 20;

    // --- Header ---
    // Logo (Left)
    if (config.logoUrl) {
        try {
            // Using a simple image add if it's a valid URL, otherwise might need fetching
            // doc.addImage(config.logoUrl, 'PNG', 150, 10, 40, 0); // Right side logo
            doc.addImage(config.logoUrl, 'PNG', 150, 10, 40, 20, undefined, 'FAST');
        } catch (e) {
            console.warn("Could not load logo", e);
        }
    } else {
        // Fallback text logo if no image
        doc.setFontSize(22);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("ALDASE", 150, 20);
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text("TECH", 150, 26);
    }

    // Company Info (Left)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(config.name.toUpperCase(), 20, currentY);
    currentY += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(config.cif, 20, currentY);
    currentY += 4;
    doc.text(config.address, 20, currentY);
    currentY += 4;
    // Removed specific city/zip line as it's not in config. Use address field for full address.

    doc.text(config.phone, 20, currentY);
    doc.text(config.email, 20, currentY + 4);

    currentY += 20;

    // Document Title & Date
    doc.setFontSize(24);
    doc.setTextColor(20, 60, 180); // Royal Blue
    doc.setFont('helvetica', 'bold');
    const title = docType === 'FACTURA' ? 'Factura' : 'Presupuesto';
    doc.text(title, 20, currentY);

    currentY += 7;
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 100); // Darker Blue
    doc.text('Fecha: ' + new Date(data.date).toLocaleDateString(), 20, currentY);

    currentY += 15;

    // Info Columns
    const leftColX = 20;
    const rightColX = 110;

    // Client Info (Left)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('A la atención de', leftColX, currentY);

    doc.setFont('helvetica', 'normal');
    const clientY = currentY + 5;
    doc.text(client.name, leftColX, clientY);
    doc.text(client.cif, leftColX, clientY + 5);
    doc.text(client.address, leftColX, clientY + 10);

    // Document Details (Right)
    doc.setFont('helvetica', 'bold');
    doc.text(docType === 'FACTURA' ? 'N.º de factura' : 'N.º de presupuesto', rightColX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.number, rightColX, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de vencimiento', rightColX, currentY + 15);
    doc.setFont('helvetica', 'normal');
    // Check if expiryDate exists before using it
    const expiry = data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : 'N/A';
    doc.text(expiry, rightColX, currentY + 20);

    // Divider Line
    currentY = clientY + 25;
    doc.setDrawColor(220, 220, 220);
    doc.line(20, currentY, 190, currentY);

    // Table
    const tableBody = data.concepts.map(c => [
        c.description,
        c.quantity.toString(),
        c.price.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €',
        (c.quantity * c.price).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
    ]);

    autoTable(doc, {
        startY: currentY + 10,
        head: [['Descripción', 'Cantidad', 'Precio unitario', 'Precio total']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyles: {
            textColor: [60, 60, 60],
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 90 }, // Description
            1: { cellWidth: 20, halign: 'right' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
        didDrawPage: () => {
            // Optional footer per page
        }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 5;

    const valuesX = 190;

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100); // Grey label
    doc.text('Subtotal', 150, finalY + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Black value
    doc.setFont('helvetica', 'bold');
    doc.text(data.baseAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', valuesX, finalY + 5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('IVA (' + (data.ivaRate * 100).toFixed(0) + '%)', 150, finalY + 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.text(data.ivaAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', valuesX, finalY + 10, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(20, 60, 180); // Blue Total
    doc.setFont('helvetica', 'bold');
    doc.text('Total', 150, finalY + 20, { align: 'right' });
    doc.text(data.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', valuesX, finalY + 20, { align: 'right' });

    // Notes & Bank Info
    const notesY = finalY + 5;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Notas:', 20, notesY);

    // Project info
    if (project) {
        doc.text(`Proyecto: ${project.name}`, 20, notesY + 5);
    }

    // IBAN
    if (config.iban) {
        doc.setTextColor(80, 80, 80);
        doc.text(`IBAN: ${config.iban}`, 20, notesY + (project ? 15 : 10)); // Adjust position based on project info
    }

    doc.save(`${docType}_${data.number}.pdf`);
};
