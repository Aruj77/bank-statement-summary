import * as XLSX from "xlsx";

export const exportToCSV = (data, filename = "bank_statement_analysis.csv") => {
  if (!data || !data.length) return;

  const headers = [
    "Date",
    "Bank",
    "Description",
    "Category",
    "Type",
    "Amount (INR)",
    "Balance (INR)",
    "Suspicious",
  ];
  const csvRows = [headers.join(",")];

  data.forEach((t) => {
    const row = [
      `"${t.date}"`,
      `"${t.bank}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${t.type}"`,
      t.amount,
      t.balance,
      t.isSuspicious ? "YES" : "NO",
    ];
    csvRows.push(row.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (
  data,
  filename = "bank_statement_analysis.xlsx",
) => {
  if (!data || !data.length) return;

  const exportData = data.map((t) => ({
    Date: t.date,
    Bank: t.bank,
    Description: t.description,
    Category: t.category,
    Type: t.type,
    Amount: t.amount,
    Balance: t.balance,
    "Flagged Anomaly": t.isSuspicious ? "Yes" : "No",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, filename);
};

export const exportToJSON = (
  data,
  filename = "bank_statement_analysis.json",
) => {
  if (!data || !data.length) return;

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2),
  )}`;
  const link = document.createElement("a");
  link.setAttribute("href", jsonString);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
