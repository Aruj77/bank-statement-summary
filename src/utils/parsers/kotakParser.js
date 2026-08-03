/**
 * Helper to clean and parse float values safely.
 */
function parseAmount(value) {
  if (!value) return 0;

  return parseFloat(value.replace(/₹/g, "").replace(/,/g, "").trim()) || 0;
}

/**
 * Checks if a line matches Kotak bank header, footer, or boilerplate text.
 */
function isKotakHeaderOrFooter(line) {
  const lower = line.toLowerCase();
  return (
    lower.includes("opening balance") ||
    lower.includes("savings account transactions") ||
    lower.includes("description") ||
    lower.includes("statement generated on") ||
    lower.includes("end of statement") ||
    lower.includes("account summary") ||
    lower.includes("rbi mandates positive pay") ||
    lower.includes("same-day cheque clearing") ||
    lower.includes("complimentary insurance") ||
    lower.includes("in order to avail tds") ||
    lower.includes("deposits of up to") ||
    lower.includes("keep your account active") ||
    lower.includes("registering a nominee") ||
    lower.includes("goods and services tax") ||
    lower.includes("commonly used narrations") ||
    lower.includes("branch address") ||
    lower.includes("toll-free number") ||
    lower.includes("registered office") ||
    lower.includes("important information") ||
    lower.includes("page ") ||
    line.startsWith("#")
  );
}

/**
 * Checks if a line is a footer/disclaimer bleed during multiline appending.
 */
function isKotakBleedLine(line) {
  const lower = line.toLowerCase();
  return (
    lower.startsWith("account statement") ||
    lower.startsWith("account no") ||
    lower.startsWith("account type") ||
    lower.startsWith("savings account") ||
    lower.startsWith("any discrepancy") ||
    lower.startsWith("this is a system generated") ||
    lower.startsWith("for assistance") ||
    lower.startsWith("remember!") ||
    lower.startsWith("scan for") ||
    lower.startsWith("kotak mahindra bank") ||
    lower.startsWith("cin:") ||
    lower.startsWith("salary account") ||
    lower.startsWith("form 15g") ||
    lower.startsWith("rbi") ||
    lower.startsWith("scheme.") ||
    lower.startsWith("ap -") ||
    lower.startsWith("atl -") ||
    lower.startsWith("atw -") ||
    lower.startsWith("bp -") ||
    lower.startsWith("cdm -") ||
    lower.startsWith("cms -") ||
    lower.startsWith("ib -") ||
    lower.startsWith("imps -") ||
    lower.startsWith("kb -") ||
    lower.startsWith("mb -") ||
    lower.startsWith("nach -") ||
    lower.startsWith("neft -") ||
    lower.startsWith("sweep transfer") ||
    lower.startsWith("int. pd.") ||
    /^page\s+\d+/i.test(lower)
  );
}

export function parseKotakTransactions(lines) {
  const transactions = [];

  // -------------------------------------------------------------
  // STEP 1 : Merge multiline rows reliably
  // -------------------------------------------------------------
  const merged = [];
  let current = "";

  // Kotak row start regex: matches index numbers followed by dates like "1 31 Mar 2026"
  const rowStart = /^\d+\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/;

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    if (isKotakHeaderOrFooter(line)) {
      continue;
    }

    if (rowStart.test(line)) {
      if (current) merged.push(current.trim());
      current = line;
    } else {
      if (isKotakBleedLine(line)) {
        continue;
      }

      // Append multi-line description text correctly to the active transaction row
      if (current) {
        current += " " + line;
      }
    }
  }

  if (current) merged.push(current.trim());

  // -------------------------------------------------------------
  // STEP 2 : Parse each merged transaction row
  // -----------------------------
  let previousBalance = 0;
  let indexTracker = 0;
  const amountRegex = /[\d,]+\.\d{2}/g;

  for (const row of merged) {
    const match = row.match(/^(\d+)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(.*)$/);

    if (!match) continue;

    const date = match[2];
    let rest = match[3];

    const amounts = rest.match(amountRegex);

    if (!amounts || amounts.length < 2) continue;

    const balance = parseAmount(amounts[amounts.length - 1]);
    const txnAmount = parseAmount(amounts[amounts.length - 2]);

    // Remove last two amounts only from description
    let description = rest;
    description = description.replace(
      new RegExp(
        `${amounts[amounts.length - 2].replace(".", "\\.")}\\s+${amounts[amounts.length - 1].replace(".", "\\.")}$`,
      ),
      "",
    );

    let withdrawal = 0;
    let deposit = 0;

    if (transactions.length === 0) {
      // First transaction
      if (balance >= txnAmount) {
        deposit = txnAmount;
      } else {
        withdrawal = txnAmount;
      }
    } else {
      if (balance > previousBalance) {
        deposit = txnAmount;
      } else {
        withdrawal = txnAmount;
      }
    }

    previousBalance = balance;

    transactions.push({
      _index: indexTracker++,
      date,
      valueDate: date,
      description: description.replace(/\s+/g, " ").trim(),
      withdrawal,
      deposit,
      Withdrawal: withdrawal,
      Deposit: deposit,
      amount: withdrawal > 0 ? withdrawal : deposit,
      type: withdrawal > 0 ? "WITHDRAWAL" : deposit > 0 ? "DEPOSIT" : null,
      balance,
    });
  }

  return transactions;
}
