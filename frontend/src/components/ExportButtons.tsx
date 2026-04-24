import React from 'react';
import { Download } from 'lucide-react';

interface ExportColumn {
  key: string;
  label: string;
}

interface ExportButtonsProps {
  data: Record<string, any>[];
  filename: string;
  columns: ExportColumn[];
  onExportCSV?: () => void;
}

const escapeCsvValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const generateCsv = (data: Record<string, any>[], columns: ExportColumn[]): string => {
  const header = columns.map((col) => escapeCsvValue(col.label)).join(',');
  const rows = data.map((row) =>
    columns.map((col) => escapeCsvValue(row[col.key])).join(',')
  );
  return [header, ...rows].join('\n');
};

const downloadCsv = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportPdf = (data: Record<string, any>[], columns: ExportColumn[], filename: string): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableRows = data
    .map(
      (row) =>
        `<tr>${columns
          .map(
            (col) =>
              `<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${
                row[col.key] ?? ''
              }</td>`
          )
          .join('')}</tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #111827; }
        h1 { font-size: 20px; margin-bottom: 16px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; }
        th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; }
        .footer { margin-top: 16px; font-size: 12px; color: #9ca3af; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${filename}</h1>
      <table>
        <thead>
          <tr>${columns
            .map((col) => `<th>${col.label}</th>`)
            .join('')}</tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="footer">Exported on ${new Date().toLocaleDateString()} - ${data.length} records</div>
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

const ExportButtons: React.FC<ExportButtonsProps> = ({ data, filename, columns, onExportCSV }) => {
  const handleExportCsv = () => {
    if (onExportCSV) {
      onExportCSV();
    } else {
      const csv = generateCsv(data, columns);
      downloadCsv(csv, filename);
    }
  };

  const handleExportPdf = () => {
    exportPdf(data, columns, filename);
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={handleExportCsv} style={buttonStyle}>
        <Download size={15} />
        Export CSV
      </button>
      <button onClick={handleExportPdf} style={buttonStyle}>
        <Download size={15} />
        Export PDF
      </button>
    </div>
  );
};

export { ExportButtons };
export default ExportButtons;
