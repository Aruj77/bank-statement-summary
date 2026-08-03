/**
 * Helper to clean and parse float values safely.
 */
function parseAmount(value) {
  if (!value) return 0;

  return parseFloat(value.replace(/₹/g, "").replace(/,/g, "").trim()) || 0;
}

/**
 * Checks if a line matches HDFC bank header, footer, or boilerplate text.
 */
function isHdfcHeaderOrFooter(line) {
  const lowerLine = line.toLowerCase();
  return (
    lowerLine.includes("statementofaccount") ||
    lowerLine.includes("jointnoteders") ||
    lowerLine.includes("nomination:") ||
    lowerLine.includes("statementfrom:") ||
    lowerLine.includes("accountbranch") ||
    lowerLine.includes("phoneno.") ||
    lowerLine.includes("odlimit") ||
    lowerLine.includes("currency:") ||
    lowerLine.includes("custid") ||
    lowerLine.includes("accountno") ||
    lowerLine.includes("opendate") ||
    lowerLine.includes("accountstatus") ||
    lowerLine.includes("rtgs/neftifsc") ||
    lowerLine.includes("micr:") ||
    lowerLine.includes("branchcode") ||
    lowerLine.includes("accounttype") ||
    lowerLine.includes("date narration") ||
    lowerLine.includes("statement summary") ||
    lowerLine.includes("opening balance") ||
    lowerLine.includes("closing balance") ||
    lowerLine.includes("total debits") ||
    lowerLine.includes("total credits") ||
    lowerLine.includes("end of statement") ||
    lowerLine.includes("page ") ||
    lowerLine.includes("hdfc bank") ||
    lowerLine.includes("registered office") ||
    lowerLine.includes("state account branch") ||
    lowerLine.includes("gstn:") ||
    lowerLine.includes("terms and conditions") ||
    lowerLine.includes("computer generated") ||
    lowerLine.startsWith("pageno.:") ||
    lowerLine.includes("s/o") ||
    line.startsWith("#")
  );
}

export function parseHdfcTransactions(lines) {
  const transactions = [];

  // -------------------------------------------------------------
  // STEP 1 : Merge multiline rows reliably
  // -------------------------------------------------------------
  const merged = [];
  let current = "";

  // HDFC row start regex: matches dates like DD/MM/YY or DD/MM/YYYY at the start of a line
  const rowStart = /^\d{2}\/\d{2}\/\d{2,4}\s+/;

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    if (isHdfcHeaderOrFooter(line)) {
      continue;
    }

    if (rowStart.test(line)) {
      if (current) merged.push(current.trim());
      current = line;
    } else {
      // Append multi-line description text correctly, protecting against header/footer bleeds
      const lowerLine = line.toLowerCase();
      if (
        current &&
        line.length < 120 &&
        !lowerLine.includes("statement") &&
        !lowerLine.includes("hdfc") &&
        !lowerLine.includes("address")
      ) {
        current += " " + line;
      }
    }
  }

  if (current) merged.push(current.trim());

  // -------------------------------------------------------------
  // STEP 2 : Parse each merged transaction row
  // -----------------------------
  let indexTracker = 0;
  const amountRegex = /[₹-]?[\d,]+\.\d{2}-?/g;

  for (const row of merged) {
    const match = row.match(/^(\d{2}\/\d{2}\/\d{2,4})\s+(.*)$/);

    if (!match) continue;

    const date = match[1];
    let rest = match[2];

    // HDFC rows often contain two dates: Transaction Date and Value Date
    const dateRegex = /\b\d{2}\/\d{2}\/\d{2,4}\b/g;
    const allDates = rest.match(dateRegex);

    let valueDate = date;
    if (allDates && allDates.length > 0) {
      valueDate = allDates[0];
    }

    const rawAmounts = rest.match(amountRegex);

    if (!rawAmounts || rawAmounts.length === 0) continue;

    const amounts = rawAmounts.map((a) => parseAmount(a));

    if (amounts.length === 0) continue;

    const balance = amounts[amounts.length - 1];
    let txnAmount = 0;

    if (amounts.length >= 2) {
      txnAmount = amounts[amounts.length - 2];
    }

    let description = rest;

    // Remove amounts from description
    for (const amtStr of rawAmounts) {
      description = description.replace(amtStr, "");
    }

    // Also remove the embedded value date from description to keep it clean
    if (valueDate) {
      description = description.replace(valueDate, "");
    }

    description = description.replace(/\s+/g, " ").trim();

    transactions.push({
      _index: indexTracker++,
      date,
      valueDate,
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
      withdrawal = curr.txnAmount;
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
  // STEP 3 : Sort transactions (Newest to Oldest) supporting YY/YYYY formats
  // -------------------------------------------------------------
  transactions.sort((a, b) => {
    const parseDateStr = (dateStr) => {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) {
          year = "20" + year;
        }
        return new Date(`${year}-${parts[1]}-${parts[0]}`);
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
