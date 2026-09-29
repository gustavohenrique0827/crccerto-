import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Lead } from '../types';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportLeadsPDF(leads: Lead[], title: string = 'Relatório de Leads') {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text('LeadGen CRM', 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(title, 14, 32);
  
  doc.setFontSize(10);
  doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 40);
  doc.text(`Total de Leads: ${leads.length}`, 14, 46);
  
  // Table
  const tableHeaders = [['Nome', 'Telefone', 'Email', 'Status', 'Clínica', 'Data']];
  const tableData = leads.map(lead => [
    lead.name,
    lead.whatsapp,
    lead.email,
    lead.status.replace('_', ' ').toUpperCase(),
    lead.clinicId === '1' ? 'Odonto Premium' : 'Estética Viver',
    new Date(lead.createdAt).toLocaleDateString('pt-BR')
  ]);

  doc.autoTable({
    startY: 55,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 55 }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount} - LeadGen CRM Operacional`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`relatorio_leads_${new Date().getTime()}.pdf`);
}
