import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Quote, Client, CompanyConfig, Project } from '../types';

export const generatePDF = (
    docType: 'FACTURA' | 'PRESUPUESTO',
    data: Invoice | Quote,
    client: Client,
    project: Project,
    config: CompanyConfig
) => {
    const doc = new jsPDF();

    // Colors
    const primaryColor = [14, 165, 233] as [number, number, number]; // Sky 500

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(docType, 20, 25);

    doc.setFontSize(10);
    doc.text(`Nº: ${data.number}`, 150, 20);
    doc.text(`Fecha: ${new Date(data.date).toLocaleDateString()}`, 150, 25);

    // Company Info (Left)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(config.name, 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(config.cif, 20, 55);
    doc.text(config.address, 20, 60);
    doc.text(`${config.email} | ${config.phone}`, 20, 65);

    // Client Info (Right)
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 130, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(client.name, 130, 55);
    doc.text(client.cif, 130, 60);
    doc.text(client.address, 130, 65);

    // Project Info
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 75, 190, 75);
    doc.setFont('helvetica', 'bold');
    doc.text('Proyecto:', 20, 82);
    doc.setFont('helvetica', 'normal');
    doc.text(project.name, 40, 82);

    // Table
    const tableBody = data.concepts.map(c => [
        c.description,
        c.quantity.toString(),
        c.price.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €',
        (c.quantity * c.price).toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €'
    ]);

    autoTable(doc, {
        startY: 90,
        head: [['Concepto', 'Cant.', 'Precio Unit.', 'Total']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.text('Base Imponible:', 140, finalY);
    doc.text(data.baseAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 190, finalY, { align: 'right' });

    doc.text(`IVA (${(data.ivaRate * 100).toFixed(0)}%):`, 140, finalY + 5);
    doc.text(data.ivaAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 190, finalY + 5, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 140, finalY + 12);
    doc.text(data.totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 190, finalY + 12, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Documento generado automáticamente por IngenieríaCRM.', 105, 280, { align: 'center' });

    doc.save(`${docType}_${data.number}.pdf`);
};
