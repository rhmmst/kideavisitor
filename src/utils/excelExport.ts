import ExcelJS from 'exceljs';
import { VisitorRecord } from '../types';

export const exportVisitorsToExcel = async (visitors: VisitorRecord[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TK Kidea Visitor System';
  workbook.lastModifiedBy = 'Admin TK Kidea';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Data Calon Murid Kidea', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'TK KIDEA - DATA PENDAFTARAN TRIAL CLASS CALON MURID';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEA580C' }, // Kidea Warm Orange
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 32;

  // Subtitle / Date
  worksheet.mergeCells('A2:M2');
  const subCell = worksheet.getCell('A2');
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  subCell.value = `Dicetak pada: ${dateStr} | Sistem Informasi Buku Tamu & Trial Class TK Kidea`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4A5568' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  // Blank row
  worksheet.addRow([]);

  // Table Headers
  const headers = [
    'Tgl Registrasi',
    'Cabang / Branch',
    'Nama Murid',
    'L/P',
    'Usia',
    'Nama Ayah',
    'Nama Ibu',
    'No. WhatsApp',
    'Email',
    'Kategori Kelas',
    'Sesi Sekolah',
    'Tanggal Trial',
    'Status Trial',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF37321' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E0' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E0' } },
      bottom: { style: 'medium', color: { argb: 'FFC2410C' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E0' } },
    };
  });

  const statusLabelMap: Record<string, string> = {
    pending: 'Menunggu / Pending',
    confirmed: 'Terkonfirmasi / Confirmed',
    completed: 'Selesai / Completed',
    cancelled: 'Dibatalkan / Cancelled',
    scheduled: 'Menunggu / Pending',
    attended: 'Selesai / Completed',
  };

  // Add Data Rows
  visitors.forEach((v) => {
    const regDate = v.created_at ? v.created_at.split('T')[0] : '-';
    const row = worksheet.addRow([
      regDate,
      v.branch_name || '-',
      v.childName,
      v.gender === 'Male' ? 'L' : 'P',
      v.age,
      v.fatherName,
      v.motherName,
      v.phone,
      v.email || '-',
      v.classCategory,
      v.schoolSession,
      v.trialDate,
      statusLabelMap[v.status?.toLowerCase()] || v.status,
    ]);

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if ([1, 2, 4, 5, 12, 13].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // Auto-fit column widths
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) {
        maxLength = Math.min(cellLength + 3, 35);
      }
    });
    column.width = maxLength;
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `TK_Kidea_Data_Calon_Murid_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};
