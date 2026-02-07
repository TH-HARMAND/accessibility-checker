import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { url, score, issues, timestamp } = await request.json();

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Uint8Array[] = [];

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    doc.fontSize(20).text('Rapport d\'Accessibilité Web', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`URL analysée : ${url}`);
    doc.text(`Date : ${new Date(timestamp).toLocaleString('fr-FR')}`);
    doc.moveDown();

    doc.fontSize(16).text(`Score d'accessibilité : ${score}/100`, { underline: true });
    doc.moveDown();

    if (issues.length === 0) {
      doc.fontSize(12).text('Aucun problème majeur détecté.');
    } else {
      doc.fontSize(14).text('Problèmes détectés :', { underline: true });
      doc.moveDown(0.5);

      issues.forEach((issue: any, index: number) => {
        doc.fontSize(12).text(`${index + 1}. ${issue.type}`, { continued: false });
        doc.fontSize(10).text(`   Sévérité : ${issue.severity}`);
        doc.text(`   ${issue.description}`);
        doc.moveDown(0.5);
      });
    }

    doc.moveDown();
    doc.fontSize(10).fillColor('gray').text(
      'Ce rapport est fourni à titre indicatif. Il ne constitue pas une certification WCAG/RGAA officielle.',
      { align: 'center' }
    );

    doc.end();

    const pdfBuffer = await new Promise<Uint8Array>((resolve) => {
      doc.on('end', () => {
        const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(buffer);
      });
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-accessibilite-${Date.now()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Erreur génération PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
