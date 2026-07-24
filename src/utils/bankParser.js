import Papa from "papaparse";
import * as XLSX from "xlsx";
import { generateHash } from "./formatters";

const BANK_PATTERNS = {
  HDFC: ["hdfc", "hdfcbank", "utib", "upi/p2a"],
  SBI: ["sbi", "state bank", "transfer to", "by transfer"],
  ICICI: ["icici", "mmt/imps", "p2m/"],
  AXIS: ["axis", "axisbank", "dr-"],
};

export const autoDetectBank = (text) => {
  const lower = text.toLowerCase();
  for (const [bank, keywords] of Object.entries(BANK_PATTERNS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return bank;
    }
  }
  return "GENERIC";
};

export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawText = JSON.stringify(results.data);
        const detectedBank = autoDetectBank(rawText);

        const transactions = results.data.map((row, index) => {
          const keys = Object.keys(row);
          const dateKey = keys.find((k) => /date/i.test(k)) || keys[0];
          const descKey =
            keys.find((k) => /desc|narration|particular/i.test(k)) || keys[1];
          const creditKey = keys.find((k) => /credit|deposit/i.test(k));
          const debitKey = keys.find((k) => /debit|withdrawal/i.test(k));
          const amountKey = keys.find((k) => /amount/i.test(k));
          const balanceKey = keys.find((k) => /balance/i.test(k));

          let type = "DEBIT";
          let amount = 0;

          if (creditKey && parseFloat(row[creditKey])) {
            type = "CREDIT";
            amount = parseFloat(row[creditKey]);
          } else if (debitKey && parseFloat(row[debitKey])) {
            type = "DEBIT";
            amount = parseFloat(row[debitKey]);
          } else if (amountKey) {
            const rawAmt = parseFloat(row[amountKey]);
            amount = Math.abs(rawAmt);
            type = rawAmt >= 0 ? "CREDIT" : "DEBIT";
          }

          const description = row[descKey] || "Unknown Transaction";
          const category = inferCategory(description);

          const txn = {
            id: `txn_${Date.now()}_${index}`,
            date: row[dateKey] || new Date().toISOString().split("T")[0],
            description,
            bank: detectedBank,
            type,
            amount: isNaN(amount) ? 0 : amount,
            balance: balanceKey ? parseFloat(row[balanceKey]) || 0 : 0,
            category,
            isSuspicious:
              amount > 50000 || /crypto|casino|unknown/i.test(description),
          };

          txn.hash = generateHash(txn);
          return txn;
        });

        resolve({ bank: detectedBank, transactions });
      },
      error: (err) => reject(err),
    });
  });
};

const inferCategory = (desc) => {
  const d = desc.toLowerCase();
  if (/upi|paytm|gpay|phonepe/.test(d)) return "UPI / Transfer";
  if (/swiggy|zomato|dining|restaurant/.test(d)) return "Food & Dining";
  if (/amazon|flipkart|myntra/.test(d)) return "Shopping";
  if (/uber|ola|fuel|petrol/.test(d)) return "Travel & Transport";
  if (/salary|payroll|bonus/.test(d)) return "Income / Salary";
  if (/netflix|spotify|prime|aws|sub/.test(d)) return "Subscriptions";
  return "General / Others";
};
