import * as XLSX from "xlsx";

// Helper to safely parse numeric values
const parseAmount = (val) => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const num = Number(String(val).replace(/[^0-9.-]+/g, ""));
  return isNaN(num) ? 0 : num;
};

export const exportToCSV = (data, filename = "bank_statement_analysis.csv") => {
  if (!data || !data.length) return;

  const headers = [
    "Date",
    "Bank",
    "Description",
    "Category",
    "Debit (INR)",
    "Credit (INR)",
    "Balance (INR)",
    "Suspicious",
  ];
  const csvRows = [headers.join(",")];

  data.forEach((t) => {
    const isCredit = t.type === "CREDIT" || t.type === "DEPOSIT";
    const amountVal = parseAmount(
      t.amount || (isCredit ? t.deposit : t.withdrawal),
    );

    const debit = !isCredit ? amountVal : "";
    const credit = isCredit ? amountVal : "";

    const row = [
      `"${t.date || ""}"`,
      `"${t.bank || ""}"`,
      `"${(t.description || t.remarks || "").replace(/"/g, '""')}"`,
      `"${t.category || ""}"`,
      debit,
      credit,
      t.balance !== undefined && t.balance !== null ? t.balance : "",
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
  statementInfo = null,
  filename = "bank_statement_analysis.xlsx",
) => {
  if (!data || !data.length) return;

  // 1. Format Transactions (separate Debit/Credit, no Type column)
  const exportData = data.map((t) => {
    const isCredit = t.type === "CREDIT" || t.type === "DEPOSIT";
    const amountVal = parseAmount(
      t.amount || (isCredit ? t.deposit : t.withdrawal),
    );

    return {
      Date: t.date || "",
      Bank: t.bank || "",
      Description: t.description || t.remarks || "",
      Category: t.category || "General",
      "Debit (INR)": !isCredit ? amountVal : "",
      "Credit (INR)": isCredit ? amountVal : "",
      "Balance (INR)":
        t.balance !== undefined && t.balance !== null ? t.balance : "",
      "Flagged Anomaly": t.isSuspicious ? "Yes" : "No",
    };
  });

  const workbook = XLSX.utils.book_new();

  // 2. Build and Append Account Summary Sheet (if metadata/info provided)
  if (statementInfo) {
    const periodStr = statementInfo.statementPeriod
      ? `${statementInfo.statementPeriod.startDate || "N/A"} to ${statementInfo.statementPeriod.endDate || "N/A"}`
      : "N/A";

    const summaryRows = [
      ["Account Summary & Metadata", ""],
      ["---------------------------", "---------------------------"],
      ["Bank Name", statementInfo.bankName || statementInfo.bank || "N/A"],
      ["Account Holder", statementInfo.accountHolder || "N/A"],
      ["Account Number", statementInfo.accountNumber || "N/A"],
      ["Account Type", statementInfo.accountType || "N/A"],
      ["IFSC Code", statementInfo.ifscCode || "N/A"],
      ["MICR Code", statementInfo.micrCode || "N/A"],
      ["CIF / CRN", statementInfo.cifNumber || "N/A"],
      ["PAN Number", statementInfo.panNumber || "N/A"],
      ["Branch", statementInfo.branch || "N/A"],
      ["Address", statementInfo.address || "N/A"],
      ["Statement Period", periodStr],
      ["Opening Balance (INR)", statementInfo.openingBalance || "N/A"],
      ["Closing Balance (INR)", statementInfo.closingBalance || "N/A"],
      ["Total Transactions Loaded", data.length],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);

    // Set column widths for readability in the Summary sheet
    summarySheet["!cols"] = [{ wch: 28 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Account Summary");
  }

  // 3. Build and Append Transactions Sheet
  const txSheet = XLSX.utils.json_to_sheet(exportData);
  txSheet["!cols"] = [
    { wch: 14 }, // Date
    { wch: 20 }, // Bank
    { wch: 40 }, // Description
    { wch: 18 }, // Category
    { wch: 14 }, // Debit
    { wch: 14 }, // Credit
    { wch: 16 }, // Balance
    { wch: 16 }, // Flagged Anomaly
  ];

  XLSX.utils.book_append_sheet(workbook, txSheet, "Transactions");

  // 4. Download file
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
