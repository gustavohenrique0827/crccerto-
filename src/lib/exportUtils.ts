/**
 * Universal Data Export Utilities for Leads, Patients, Appointments, Tasks, Follow-ups, and Analytics
 */

export interface ExportColumn<T = any> {
  header: string;
  accessor: keyof T | ((item: T) => any);
}

export function exportToCSV<T = any>(
  data: T[], 
  fileName: string, 
  customColumns?: ExportColumn<T>[]
) {
  if (!data || data.length === 0) {
    // Generate empty CSV template with headers if provided
    if (customColumns && customColumns.length > 0) {
      const headers = customColumns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(';');
      downloadCSVFile(headers, fileName);
    }
    return;
  }

  let csvRows: string[] = [];

  if (customColumns && customColumns.length > 0) {
    const headers = customColumns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(';');
    csvRows.push(headers);

    for (const item of data) {
      const row = customColumns.map(col => {
        let val: any;
        if (typeof col.accessor === 'function') {
          val = col.accessor(item);
        } else {
          val = (item as any)[col.accessor];
        }
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') {
          if (Array.isArray(val)) return `"${val.join(', ').replace(/"/g, '""')}"`;
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(';');
      csvRows.push(row);
    }
  } else {
    // Auto-detect headers from keys
    const firstObj = data[0] as Record<string, any>;
    const keys = Object.keys(firstObj);
    csvRows.push(keys.map(k => `"${k.replace(/"/g, '""')}"`).join(';'));

    for (const item of data) {
      const obj = item as Record<string, any>;
      const row = keys.map(k => {
        const val = obj[k];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') {
          if (Array.isArray(val)) return `"${val.join(', ').replace(/"/g, '""')}"`;
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(';');
      csvRows.push(row);
    }
  }

  const csvContent = csvRows.join('\r\n');
  downloadCSVFile(csvContent, fileName);
}

function downloadCSVFile(content: string, fileName: string) {
  // UTF-8 BOM so Excel opens accents cleanly in Portuguese
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}_${dateStr}.csv`;

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fullFileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
