import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ReportData {
    brand: string;
    technician: string;
    client: string;
    issue: string;
    action: string;
    normative: string;
    date: string;
}

export function validateReportData(data: Partial<ReportData>): string[] {
    const missing: string[] = [];
    if (!data.brand) missing.push('Marca de la caldera');
    if (!data.client) missing.push('Dades del client');
    if (!data.issue) missing.push('Descripció de l\'avaria');
    if (!data.action) missing.push('Actuació realitzada');
    return missing;
}

export async function generateRITEReport(data: ReportData, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });

        doc.pipe(fs.createWriteStream(outputPath));

        // Header
        doc.fontSize(20).text('Registre d\'Intervenció Tècnica (RITE)', { align: 'center' });
        doc.moveDown();

        // Technical Data
        doc.fontSize(14).text('Dades de la Intervenció', { underline: true });
        doc.fontSize(12).text(`Data: ${data.date}`);
        doc.text(`Tècnic: ${data.technician}`);
        doc.text(`Marca Caldera: ${data.brand}`);
        doc.moveDown();

        // Client Data
        doc.fontSize(14).text('Dades del Client', { underline: true });
        doc.fontSize(12).text(`Client: ${data.client}`);
        doc.moveDown();

        // Description
        doc.fontSize(14).text('Descripció de l\'Avaria', { underline: true });
        doc.fontSize(12).text(data.issue);
        doc.moveDown();

        // Action Taken
        doc.fontSize(14).text('Actuació Realitzada', { underline: true });
        doc.fontSize(12).text(data.action);
        doc.moveDown();

        // Normative
        doc.fontSize(14).text('Referència Normativa', { underline: true });
        doc.fontSize(10).text(data.normative);
        doc.moveDown();

        // Footer
        doc.fontSize(10).fillColor('grey').text('Aquest informe ha estat generat automàticament pel sistema Sentinel.', { align: 'center' });

        doc.end();

        doc.on('end', () => resolve(outputPath));
        doc.on('error', (err) => reject(err));
    });
}
