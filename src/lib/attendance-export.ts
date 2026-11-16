/**
 * Utilities for exporting Attendance Records to Excel, Word, and Printable PDF.
 */

import { formatPhilippineDateTime } from "./date-utils";
import type { ActivityAttendanceRecord, ProgramActivity } from "@/types/database";

export interface AttendanceExportData {
  activity: Pick<ProgramActivity, "id" | "title" | "starts_at" | "ends_at" | "venue" | "category" | "level">;
  records: ActivityAttendanceRecord[];
  localeGroups: { localeName: string; attendees: ActivityAttendanceRecord[] }[];
  totalAttendees: number;
}

/**
 * Download a file in the browser with appropriate MIME type.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export to Excel (SpreadsheetML / XML format compatible with MS Excel, LibreOffice, Google Sheets).
 */
export function exportAttendanceToExcel(data: AttendanceExportData) {
  const { activity, records, localeGroups, totalAttendees } = data;
  const safeTitle = activity.title.replace(/[/\\?%*:|"<>]/g, "-");
  const filename = `${safeTitle}-Attendance-Records.xls`;

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1E281F"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Italic="1" ss:Color="#555555"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C6A5"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C6A5"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C6A5"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C6A5"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#303B32" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DACD"/>
   </Borders>
  </Style>
  <Style ss:ID="SummaryHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#303B32"/>
   <Interior ss:Color="#F5F1E9" ss:Pattern="Solid"/>
  </Style>
 </Styles>

 <Worksheet ss:Name="Master Attendance">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="40"/>
   <Column ss:Width="180"/>
   <Column ss:Width="200"/>
   <Column ss:Width="150"/>
   <Column ss:Width="140"/>
   <Column ss:Width="100"/>

   <Row ss:Height="25">
    <Cell ss:MergeAcross="5" ss:StyleID="Title">
     <Data ss:Type="String">Pentecostal Missionary Church of Christ (4th Watch) — Davao District</Data>
    </Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="5" ss:StyleID="Subtitle">
     <Data ss:Type="String">Activity Attendance Report: ${activity.title}</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="5">
     <Data ss:Type="String">Schedule: ${formatPhilippineDateTime(activity.starts_at, { dateStyle: "full", timeStyle: "short" })} | Total Attendees: ${totalAttendees}</Data>
    </Cell>
   </Row>
   <Row></Row>

   <!-- Locale Summary -->
   <Row ss:StyleID="SummaryHeader">
    <Cell ss:MergeAcross="1"><Data ss:Type="String">Locale Church</Data></Cell>
    <Cell ss:MergeAcross="1"><Data ss:Type="String">Attendees Count</Data></Cell>
    <Cell ss:MergeAcross="1"><Data ss:Type="String">Percentage</Data></Cell>
   </Row>`;

  for (const group of localeGroups) {
    const pct = totalAttendees > 0 ? ((group.attendees.length / totalAttendees) * 100).toFixed(1) : "0.0";
    xml += `
   <Row>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">${group.localeName}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCellCenter"><Data ss:Type="Number">${group.attendees.length}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCellCenter"><Data ss:Type="String">${pct}%</Data></Cell>
   </Row>`;
  }

  xml += `
   <Row></Row>
   <!-- Attendee Roster -->
   <Row ss:Height="22" ss:StyleID="Header">
    <Cell><Data ss:Type="String">No.</Data></Cell>
    <Cell><Data ss:Type="String">Full Name</Data></Cell>
    <Cell><Data ss:Type="String">Gmail / Email Account</Data></Cell>
    <Cell><Data ss:Type="String">Locale Church</Data></Cell>
    <Cell><Data ss:Type="String">Date &amp; Time Recorded</Data></Cell>
    <Cell><Data ss:Type="String">Method</Data></Cell>
   </Row>`;

  records.forEach((rec, idx) => {
    const name = rec.profile?.full_name ?? "Unknown";
    const email = rec.profile?.email ?? "—";
    const locale = rec.locale?.name ?? "No Locale";
    const time = formatPhilippineDateTime(rec.attended_at, { dateStyle: "short", timeStyle: "short" });
    const method = rec.marked_by ? "Manual (Admin)" : "Code / QR";

    xml += `
   <Row>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(email)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(locale)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(time)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(method)}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  downloadFile(xml, filename, "application/vnd.ms-excel;charset=utf-8;");
}

/**
 * Export to Word Document (.doc format compatible with Microsoft Word & Google Docs).
 */
export function exportAttendanceToWord(data: AttendanceExportData) {
  const { activity, records, localeGroups, totalAttendees } = data;
  const safeTitle = activity.title.replace(/[/\\?%*:|"<>]/g, "-");
  const filename = `${safeTitle}-Attendance-Records.doc`;

  const dateStr = formatPhilippineDateTime(activity.starts_at, { dateStyle: "full", timeStyle: "short" });

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeXml(activity.title)} — Attendance</title>
<style>
body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; margin: 40px; color: #202820; }
.header { text-align: center; border-bottom: 2px solid #8C7853; padding-bottom: 12px; margin-bottom: 24px; }
.title { font-size: 20pt; font-weight: bold; color: #1E281F; margin: 0; }
.subtitle { font-size: 13pt; color: #8C7853; font-weight: 600; margin: 4px 0; }
.meta { font-size: 10pt; color: #555555; margin-top: 6px; }
.section-title { font-size: 12pt; font-weight: bold; color: #303B32; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #D6C6A5; padding-bottom: 4px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
th { background-color: #303B32; color: #ffffff; padding: 8px; text-align: left; border: 1px solid #D6C6A5; }
td { padding: 6px 8px; border: 1px solid #E0DACD; }
tr:nth-child(even) td { background-color: #FAF8F5; }
.text-center { text-align: center; }
.summary-box { background-color: #F5F1E9; border: 1px solid #D6C6A5; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
.sign-off { margin-top: 40px; width: 100%; }
.sign-off td { border: none; padding-top: 50px; }
</style>
</head>
<body>
<div class="header">
  <p class="subtitle">PENTECOSTAL MISSIONARY CHURCH OF CHRIST (4TH WATCH)</p>
  <h1 class="title">Davao District Attendance Report</h1>
  <p class="meta"><strong>Activity:</strong> ${escapeXml(activity.title)} | <strong>Date:</strong> ${dateStr} | <strong>Total Attendees:</strong> ${totalAttendees}</p>
</div>

<div class="summary-box">
  <strong>Locale Attendance Summary</strong>
  <table style="width: 70%; margin-top: 8px;">
    <tr>
      <th>Locale Church</th>
      <th class="text-center">Attendees</th>
      <th class="text-center">Share</th>
    </tr>`;

  for (const g of localeGroups) {
    const pct = totalAttendees > 0 ? ((g.attendees.length / totalAttendees) * 100).toFixed(1) : "0.0";
    html += `
    <tr>
      <td>${escapeXml(g.localeName)}</td>
      <td class="text-center"><strong>${g.attendees.length}</strong></td>
      <td class="text-center">${pct}%</td>
    </tr>`;
  }

  html += `
  </table>
</div>

<div class="section-title">Official Attendee Master Roster (${totalAttendees} total)</div>
<table>
  <thead>
    <tr>
      <th style="width: 40px;" class="text-center">#</th>
      <th>Full Name</th>
      <th>Gmail / Email Account</th>
      <th>Locale Church</th>
      <th class="text-center">Date &amp; Time Recorded</th>
      <th class="text-center">Status</th>
    </tr>
  </thead>
  <tbody>`;

  records.forEach((rec, idx) => {
    html += `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>${escapeXml(rec.profile?.full_name ?? "Unknown")}</strong></td>
      <td>${escapeXml(rec.profile?.email ?? "—")}</td>
      <td>${escapeXml(rec.locale?.name ?? "No Locale")}</td>
      <td class="text-center">${formatPhilippineDateTime(rec.attended_at, { dateStyle: "short", timeStyle: "short" })}</td>
      <td class="text-center">Verified</td>
    </tr>`;
  });

  html += `
  </tbody>
</table>

<table class="sign-off">
  <tr>
    <td style="width: 50%;">
      ______________________________________<br>
      <strong>Prepared By:</strong> District Secretariat
    </td>
    <td style="width: 50%; text-align: right;">
      ______________________________________<br>
      <strong>Noted By:</strong> District Minister
    </td>
  </tr>
</table>
</body>
</html>`;

  downloadFile(html, filename, "application/msword;charset=utf-8;");
}

/**
 * Open a high-resolution, print-optimized attendance sheet formatted for PDF generation.
 */
export function printAttendancePdf(data: AttendanceExportData) {
  const { activity, records, localeGroups, totalAttendees } = data;
  const dateStr = formatPhilippineDateTime(activity.starts_at, { dateStyle: "full", timeStyle: "short" });

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeXml(activity.title)} — Attendance Sheet</title>
<style>
@page { size: portrait; margin: 15mm; }
body { font-family: system-ui, -apple-system, sans-serif; color: #1c241d; font-size: 11pt; line-height: 1.4; padding: 20px; }
.header { text-align: center; border-bottom: 2px solid #8C7853; padding-bottom: 12px; margin-bottom: 20px; }
.logo-title { font-size: 11pt; letter-spacing: 0.1em; text-transform: uppercase; color: #8C7853; font-weight: 700; margin: 0; }
.main-title { font-size: 18pt; font-weight: 800; color: #1e281f; margin: 4px 0 2px 0; }
.meta-line { font-size: 9pt; color: #555; }
.summary-grid { display: flex; gap: 15px; margin-bottom: 20px; }
.summary-card { flex: 1; border: 1px solid #D6C6A5; border-radius: 8px; padding: 10px 14px; background: #FAF8F5; }
.summary-num { font-size: 20pt; font-weight: 700; color: #303B32; margin: 0; }
.summary-label { font-size: 8.5pt; text-transform: uppercase; color: #777; letter-spacing: 0.05em; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5pt; }
th { background: #303B32; color: #fff; padding: 6px 8px; text-align: left; font-size: 8.5pt; text-transform: uppercase; }
td { padding: 6px 8px; border-bottom: 1px solid #E0DACD; }
tr:nth-child(even) td { background: #FAF8F5; }
.text-center { text-align: center; }
.sign-off { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
.sign-line { width: 220px; border-top: 1px solid #333; padding-top: 5px; text-align: center; font-size: 9pt; }
@media print {
  body { padding: 0; }
  .no-print { display: none; }
}
</style>
</head>
<body>
<div class="no-print" style="background: #F5F1E9; border: 1px solid #D6C6A5; padding: 12px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
  <div><strong>Print Preview:</strong> Click the button on the right to Print or Save as PDF.</div>
  <button onclick="window.print()" style="background: #303B32; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
</div>

<div class="header">
  <p class="logo-title">Pentecostal Missionary Church of Christ (4th Watch)</p>
  <h1 class="main-title">Davao District Official Attendance Report</h1>
  <p class="meta-line">
    <strong>Activity:</strong> ${escapeXml(activity.title)} &bull; 
    <strong>Date:</strong> ${dateStr} &bull; 
    <strong>Venue:</strong> ${escapeXml(activity.venue ?? "Davao District")}
  </p>
</div>

<div class="summary-grid">
  <div class="summary-card">
    <p class="summary-num">${totalAttendees}</p>
    <p class="summary-label">Total Attendees</p>
  </div>
  <div class="summary-card">
    <p class="summary-num">${localeGroups.length}</p>
    <p class="summary-label">Represented Locales</p>
  </div>
  <div class="summary-card">
    <p class="summary-num">${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
    <p class="summary-label">Report Generated</p>
  </div>
</div>

<h3 style="font-size: 11pt; color: #303B32; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase;">Locale Church Attendance Breakdown</h3>
<table style="margin-bottom: 20px;">
  <thead>
    <tr>
      <th>Locale Church</th>
      <th class="text-center" style="width: 100px;">Attendees</th>
      <th class="text-center" style="width: 100px;">Share</th>
    </tr>
  </thead>
  <tbody>
    ${localeGroups.map((g) => {
      const pct = totalAttendees > 0 ? ((g.attendees.length / totalAttendees) * 100).toFixed(1) : "0.0";
      return `<tr>
        <td><strong>${escapeXml(g.localeName)}</strong></td>
        <td class="text-center">${g.attendees.length}</td>
        <td class="text-center">${pct}%</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>

<h3 style="font-size: 11pt; color: #303B32; margin-top: 25px; margin-bottom: 5px; text-transform: uppercase;">Master Attendee Directory (${totalAttendees} attendees)</h3>
<table>
  <thead>
    <tr>
      <th style="width: 35px;" class="text-center">#</th>
      <th>Full Name</th>
      <th>Email Account</th>
      <th>Locale Church</th>
      <th class="text-center">Time Submitted</th>
    </tr>
  </thead>
  <tbody>
    ${records.map((rec, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td><strong>${escapeXml(rec.profile?.full_name ?? "Unknown")}</strong></td>
        <td>${escapeXml(rec.profile?.email ?? "—")}</td>
        <td>${escapeXml(rec.locale?.name ?? "No Locale")}</td>
        <td class="text-center">${formatPhilippineDateTime(rec.attended_at, { timeStyle: "short" })}</td>
      </tr>
    `).join("")}
  </tbody>
</table>

<div class="sign-off">
  <div class="sign-line">
    <strong>District Secretariat</strong><br>
    Prepared Official Record
  </div>
  <div class="sign-line">
    <strong>District Minister</strong><br>
    Noted &amp; Approved
  </div>
</div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
