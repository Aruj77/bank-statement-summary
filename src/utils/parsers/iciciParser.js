export function parseICICIMultiLineTransactions(lines) {
  const transactions = [];

  const datePattern = /^\d{2}[\.\/-]\d{2}[\.\/-]\d{4}$/;
  const amountPattern = /^[\d,]+\.\d{2}$/;

  let currentTxn = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Filter out table headers or page footers
    if (isHeaderOrFooterLine(line)) {
      continue;
    }

    // Single-line start check: "1 02.04.2025 gpay..."
    const combinedStartMatch = line.match(
      /^(\d+)\s+(\d{2}[\.\/-]\d{2}[\.\/-]\d{4})\s*(.*)/,
    );

    // Two-line start check: Line i is "1" and Line i+1 is "02.04.2025"
    const splitStartMatch =
      /^\d+$/.test(line) &&
      i + 1 < lines.length &&
      datePattern.test(lines[i + 1]);

    if (combinedStartMatch || splitStartMatch) {
      if (currentTxn && currentTxn.amounts.length >= 2) {
        finalizeAndPushTxn(currentTxn, transactions);
      }

      let sNo,
        date,
        rest = "";

      if (combinedStartMatch) {
        sNo = combinedStartMatch[1];
        date = combinedStartMatch[2];
        rest = combinedStartMatch[3] || "";
      } else {
        sNo = line;
        date = lines[i + 1];
        i++; // Skip next line consumed as date
      }

      currentTxn = {
        sNo,
        date,
        remarks: rest ? [rest] : [],
        amounts: [],
      };
      continue;
    }

    if (!currentTxn) continue;

    // Case A: Amount and Balance appear on the same line ("250.00 12450.50")
    const doubleAmountMatch = line.match(/^([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/);

    if (doubleAmountMatch) {
      currentTxn.amounts.push(doubleAmountMatch[1], doubleAmountMatch[2]);
      finalizeAndPushTxn(currentTxn, transactions);
      currentTxn = null;
    }
    // Case B: Individual numeric amount token
    else if (amountPattern.test(line)) {
      currentTxn.amounts.push(line);

      if (currentTxn.amounts.length >= 2) {
        finalizeAndPushTxn(currentTxn, transactions);
        currentTxn = null;
      }
    }
    // Case C: Narrative/Remark line
    else {
      currentTxn.remarks.push(line);
    }
  }

  // Finalize any dangling transaction
  if (currentTxn && currentTxn.amounts.length >= 2) {
    finalizeAndPushTxn(currentTxn, transactions);
  }

  return transactions;
}

function isHeaderOrFooterLine(str) {
  const lower = str.toLowerCase();
  const keywords = [
    "s no.",
    "transaction date",
    "cheque number",
    "transaction remarks",
    "withdrawal amount",
    "deposit amount",
    "balance (inr)",
    "page ",
    "statement of account",
  ];
  return keywords.some((kw) => lower.includes(kw));
}

function finalizeAndPushTxn(raw, outputArray) {
  const fullRemarks = raw.remarks.join(" ").trim();
  const numAmounts = raw.amounts.map((a) => parseFloat(a.replace(/,/g, "")));

  if (numAmounts.length < 2) return;

  const closingBalance = numAmounts[numAmounts.length - 1];
  const transactionAmount = numAmounts[numAmounts.length - 2];

  const previousTxn = outputArray[outputArray.length - 1];
  let type = "WITHDRAWAL";

  if (previousTxn) {
    type = closingBalance > previousTxn.balance ? "DEPOSIT" : "WITHDRAWAL";
  } else {
    const lowerRemarks = fullRemarks.toLowerCase();
    if (
      lowerRemarks.includes("received") ||
      lowerRemarks.includes("cr") ||
      lowerRemarks.includes("credit") ||
      lowerRemarks.includes("dep") ||
      lowerRemarks.includes("by transfer")
    ) {
      type = "DEPOSIT";
    }
  }

  outputArray.push({
    sNo: parseInt(raw.sNo, 10) || outputArray.length + 1,
    date: raw.date,
    remarks: fullRemarks,
    description: fullRemarks,
    amount: transactionAmount,
    balance: closingBalance,
    type: type,
  });
}
