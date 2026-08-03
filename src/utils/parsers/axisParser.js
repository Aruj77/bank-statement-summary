/**
 * Helper to clean and parse float values safely.
 */
function parseAmount(value) {
  if (!value) return 0;

  return parseFloat(value.replace(/₹/g, "").replace(/,/g, "").trim()) || 0;
}

/**
 * Checks if a line matches Axis Bank header, footer, summary, or specific metadata/customer block.
 */
function isAxisHeaderOrFooter(line) {
  const lowerLine = line.toLowerCase();
  return (
    lowerLine.includes("customer id:") ||
    lowerLine.includes("ifsc code:") ||
    lowerLine.includes("micr code:") ||
    lowerLine.includes("nominee registered:") ||
    lowerLine.includes("registered mobile no:") ||
    lowerLine.includes("registered email id:") ||
    lowerLine.includes("scheme:") ||
    lowerLine.includes("currency:") ||
    lowerLine.includes("statement of axis account") ||
    lowerLine.includes("tran date") ||
    lowerLine.includes("chq no") ||
    lowerLine.includes("particulars") ||
    lowerLine.includes("debit") ||
    lowerLine.includes("credit") ||
    lowerLine.includes("balance") ||
    lowerLine.includes("opening balance") ||
    lowerLine.includes("axis bank") ||
    lowerLine.includes("registered office") ||
    lowerLine.includes("transaction total") ||
    lowerLine.includes("legends :") ||
    lowerLine.includes("iconn-transaction") ||
    lowerLine.includes("vmt-icon") ||
    lowerLine.includes("autosweep-transfer") ||
    lowerLine.includes("rev sweep") ||
    lowerLine.includes("sweep trf") ||
    lowerLine.includes("cwdr-cash") ||
    lowerLine.includes("pur-pos") ||
    lowerLine.includes("clg-cheque") ||
    lowerLine.includes("int.pd-interest") ||
    lowerLine.includes("int.coll-interest") ||
    lowerLine.includes("system generated output") ||
    lowerLine.includes("unless the constituent") ||
    lowerLine.includes("www.dicgc.org.in") ||
    lowerLine.startsWith("pageno.:") ||
    lowerLine.includes("page ") ||
    line.startsWith("#")
  );
}

export function parseAxisTransactions(lines) {
  const transactions = [];

  // -------------------------------------------------------------
  // STEP 1 : Merge multiline rows reliably
  // Axis statements place the date at the start, followed by the description
  // broken across multiple lines, and ending with amount tokens.
  // -------------------------------------------------------------
  const merged = [];
  let current = "";

  const rowStart = /^\d{2}-\d{2}-\d{4}\s+/;

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    if (isAxisHeaderOrFooter(line)) {
      continue;
    }

    if (rowStart.test(line)) {
      if (current) merged.push(current.trim());
      current = line;
    } else {
      const lowerLine = line.toLowerCase();
      // Removed the restrictive line length and keyword filters so all split text lines
      // belonging to the transaction description are correctly captured and joined.
      if (current && !lowerLine.includes("statement of axis account")) {
        current += " " + line;
      }
    }
  }

  if (current) merged.push(current.trim());

  // -------------------------------------------------------------
  // STEP 2 : Parse each merged transaction row
  // -----------------------------
  let indexTracker = 0;
  const amountRegex = /[\d,]+\.\d{2}/g;

  for (const row of merged) {
    const match = row.match(/^(\d{2}-\d{2}-\d{4})\s+(.*)$/);

    if (!match) continue;

    const date = match[1];
    let rest = match[2];

    const amounts = rest.match(amountRegex);

    if (!amounts || amounts.length === 0) continue;

    const balance = parseAmount(amounts[amounts.length - 1]);
    let txnAmount = 0;

    if (amounts.length >= 2) {
      txnAmount = parseAmount(amounts[amounts.length - 2]);
    }

    let description = rest;
    for (const amtStr of amounts) {
      description = description.replace(amtStr, "");
    }
    description = description.replace(/\s+/g, " ").trim();

    transactions.push({
      _index: indexTracker++,
      date,
      valueDate: date,
      description,
      txnAmount,
      balance,
    });
  }

  // Post-process to calculate withdrawal/deposit accurately using balance diffs
  for (let i = 0; i < transactions.length; i++) {
    let withdrawal = 0;
    let deposit = 0;
    const curr = transactions[i];

    if (i === 0) {
      deposit = curr.txnAmount;
    } else {
      const prevBalance = transactions[i - 1].balance;
      const diff = Number((curr.balance - prevBalance).toFixed(2));

      if (diff > 0) {
        deposit = Math.abs(diff);
        curr.txnAmount = deposit;
      } else {
        withdrawal = Math.abs(diff);
        curr.txnAmount = withdrawal;
      }
    }

    curr.withdrawal = withdrawal;
    curr.deposit = deposit;
    curr.Withdrawal = withdrawal;
    curr.Deposit = deposit;
    curr.amount = withdrawal > 0 ? withdrawal : deposit;
    curr.type = withdrawal > 0 ? "WITHDRAWAL" : deposit > 0 ? "DEPOSIT" : null;
  }

  // -------------------------------------------------------------
  // STEP 3 : Sort transactions (Newest to Oldest)
  // -----------------------------
  transactions.sort((a, b) => {
    const parseDateStr = (dateStr) => {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      return new Date(0);
    };

    const d1 = parseDateStr(a.date);
    const d2 = parseDateStr(b.date);

    if (d1.getTime() !== d2.getTime()) {
      return d2 - d1;
    }

    return (b._index || 0) - (a._index || 0);
  });

  return transactions;
}
