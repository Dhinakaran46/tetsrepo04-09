import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  constructor() {}

  exportToExcel(data: any[], fileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // Calculate column widths based on data keys and values
    const columnWidths = this.calculateColumnWidths(data);
    worksheet['!cols'] = columnWidths;

    const workbook: XLSX.WorkBook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, fileName);
  }

  private calculateColumnWidths(data: any[]): any[] {
    // Extract headers from data keys
    const headers = Object.keys(data[0]);

    // Initialize column widths with header lengths
    const columnWidths = headers.map((header) => ({ wch: header.length + 2 }));

    // Adjust column widths based on data
    data.forEach((row) => {
      headers.forEach((header, index) => {
        const cellValue = row[header];
        const cellLength = cellValue ? cellValue.toString().length : 0;
        if (columnWidths[index].wch < cellLength + 2) {
          columnWidths[index].wch = cellLength + 2;
        }
      });
    });

    return columnWidths;
  }

  exportToPDF(data: any[], fileName: string): void {
    // Create an HTML table to render the data
    const table = this.createHtmlTable(data);

    // Create a container div for the table
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px'; // Move out of view
    container.appendChild(table);

    // Temporarily add the container to the body
    document.body.appendChild(container);
    // Convert HTML to canvas
    html2canvas(table).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF();
      const imgWidth = 190; // Adjust as needed
      const pageHeight = doc.internal.pageSize.height;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(`${fileName}.pdf`);

      // Remove the container after rendering
      document.body.removeChild(container);
    });
  }
  private createHtmlTable(data: any[]): HTMLElement {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.tableLayout = 'fixed'; // Ensure fixed layout for consistent column widths

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = Object.keys(data[0] || {});
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      th.style.border = '1px solid #000';
      th.style.padding = '8px';
      th.style.wordWrap = 'break-word';
      th.style.overflow = 'hidden';
      th.style.textOverflow = 'ellipsis';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    data.forEach((row) => {
      const tr = document.createElement('tr');
      headers.forEach((header) => {
        const td = document.createElement('td');
        td.textContent = String(row[header]);
        td.style.border = '1px solid #000';
        td.style.padding = '8px';
        td.style.wordWrap = 'break-word';
        td.style.overflow = 'hidden';
        td.style.textOverflow = 'ellipsis';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // Create container
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.overflowX = 'auto'; // Enable horizontal scroll if necessary
    container.appendChild(table);

    document.body.appendChild(container);

    // Adjust scaling factor to fit within PDF page width
    const tableWidth = table.offsetWidth;
    const pageWidth = 190; // Width of the PDF page in mm
    const scaleFactor = Math.min(1, pageWidth / tableWidth);

    // Ensure minimum scale factor to avoid overly small content
    const minScaleFactor = 0.7; // Adjust as needed
    const finalScaleFactor = Math.max(scaleFactor, minScaleFactor);

    table.style.transform = `scale(${finalScaleFactor})`;
    table.style.transformOrigin = 'top left';

    return container;
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `${fileName}.xlsx`);
  }
}
