/**
 * Helper to clean and parse float values safely.
 */
function parseAmount(value) {
  if (!value) return 0;

  return parseFloat(value.replace(/₹/g, "").replace(/,/g, "").trim()) || 0;
}

/**
 * Checks if a line matches IndusInd bank header, footer, or boilerplate text.
 */
function isIndusIndHeaderOrFooter(line) {
  const lowerLine = line.toLowerCase();
  return (
    lowerLine.includes("account statement") ||
    lowerLine.includes("customer details") ||
    lowerLine.includes("account summary") ||
    lowerLine.includes("transaction history") ||
    lowerLine.includes("statement period:") ||
    lowerLine.includes("branch ifsc code:") ||
    lowerLine.includes("nominee(s):") ||
    lowerLine.includes("holding status") ||
    lowerLine.includes("customer id") ||
    lowerLine.includes("account type") ||
    lowerLine.includes("lien amount") ||
    lowerLine.includes("balance") ||
    lowerLine.includes("date particulars") ||
    lowerLine.includes("chq no/ref no") ||
    lowerLine.includes("withdrawal") ||
    lowerLine.includes("deposit") ||
    lowerLine.includes("mob.no / tel.:") ||
    lowerLine.includes("period:") ||
    lowerLine.includes("indusind bank") ||
    lowerLine.includes("registered office") ||
    lowerLine.startsWith("pageno.:") ||
    lowerLine.startsWith("c/o:") ||
    lowerLine.startsWith("date:") ||
    lowerLine.includes("page ") ||
    line.startsWith("#")
  );
}

export function parseIndusIndTransactions(lines) {
  const transactions = [];

  // -------------------------------------------------------------
  // STEP 1 : Merge multiline rows reliably
  // -------------------------------------------------------------
  const merged = [];
  let current = "";

  // IndusInd row start regex: matches dates like "31 Mar 2026" or "29 Mar 2026"
  const rowStart = /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/;

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    if (isIndusIndHeaderOrFooter(line)) {
      continue;
    }

    if (rowStart.test(line)) {
      if (current) merged.push(current.trim());
      current = line;
    } else {
      // Append multi-line description text correctly
      if (
        current &&
        line.length < 120 &&
        !line.toLowerCase().includes("indusind")
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
  const amountRegex = /[\d,]+\.\d{2}/g;

  for (const row of merged) {
    const match = row.match(/^(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.*)$/);

    if (!match) continue;

    const date = match[1];
    let rest = match[2];

    const amounts = rest.match(amountRegex);

    if (!amounts || amounts.length < 2) continue;

    const balance = parseAmount(amounts[amounts.length - 1]);

    let withdrawal = 0;
    let actualDeposit = 0;

    if (amounts.length >= 3) {
      withdrawal = parseAmount(amounts[amounts.length - 3]);
      actualDeposit = parseAmount(amounts[amounts.length - 2]);
    } else if (amounts.length === 2) {
      withdrawal = parseAmount(amounts[0]);
      actualDeposit = parseAmount(amounts[1]);
    }

    // Clean description by stripping out the matched amounts
    let description = rest;
    for (const amtStr of amounts) {
      description = description.replace(amtStr, "");
    }

    // Strip standard reference code formats (e.g., transaction/reference IDs starting with letters followed by digits)
    description = description
      .replace(/\b[A-Z]\d{8,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const finalWithdrawal = withdrawal;
    const finalDeposit = actualDeposit;
    const amount = finalWithdrawal > 0 ? finalWithdrawal : finalDeposit;

    transactions.push({
      _index: indexTracker++,
      date,
      valueDate: date,
      description,
      withdrawal: finalWithdrawal,
      deposit: finalDeposit,
      Withdrawal: finalWithdrawal,
      Deposit: finalDeposit,
      amount,
      type:
        finalWithdrawal > 0
          ? "WITHDRAWAL"
          : finalDeposit > 0
            ? "DEPOSIT"
            : null,
      balance,
    });
  }

  return transactions;
}
