/**
 * Helper to safely parse amount values.
 */
function parseAmount(value) {
  if (value == null || value === "") return 0;

  const amount = parseFloat(value.toString().replace(/,/g, "").trim());

  return isNaN(amount) ? 0 : amount;
}

/**
 * Checks whether a line starts with DD/MM/YYYY
 */
function startsWithDate(line) {
  return /^\d{2}\/\d{2}\/\d{4}/.test(line.trim());
}

/**
 * Punjab National Bank Statement Parser
 */
export function parsePNBTransactions(lines) {
  console.group("🏦 PNB Parser");

  const transactions = [];
  let currentTxn = null;

  // Date Amount CR/DR Balance Description
  const txnRegex =
    /^(\d{2}\/\d{2}\/\d{4})\s+([\d,]+(?:\.\d+)?)\s+(CR|DR)\s+([\d,]+(?:\.\d+)?)\s*(.*)$/i;

  const skipKeywords = [
    "branch details",
    "branch name",
    "branch address",
    "customer details",
    "customer name",
    "customer address",
    "statement of account",
    "generated through",
    "computer generated",
    "unless constituent",
    "please ensure",
    "customers are requested",
    "please maintain",
    "please note",
    "abbreviations are as under",
    "page ",
    "date:",
    "opening balance",
    "closing balance",
    "total debit",
    "total credit",
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    const match = line.match(txnRegex);
    if (match) {
      if (currentTxn) {
        currentTxn.description = currentTxn.description
          .replace(/\s+/g, " ")
          .trim();

        transactions.push(currentTxn);
      }

      const date = match[1];
      const amount = parseAmount(match[2]);
      const rawType = match[3].toUpperCase();
      const balance = parseAmount(match[4]);
      const description = match[5] || "";
      const isWithdrawal = rawType === "CR";

      const withdrawal = isWithdrawal ? amount : 0;
      const deposit = isWithdrawal ? 0 : amount;

      currentTxn = {
        id: `${date}-${transactions.length + 1}`,

        sNo: transactions.length + 1,

        date,
        valueDate: date,

        description,

        amount,
        balance,

        type: isWithdrawal ? "WITHDRAWAL" : "DEPOSIT",

        rawType,

        withdrawal,
        deposit,

        Withdrawal: withdrawal,
        Deposit: deposit,

        withdrawalAmount: withdrawal,
        depositedAmount: deposit,

        debit: withdrawal,
        credit: deposit,
      };

      continue;
    }
    if (!currentTxn) continue;

    const lower = line.toLowerCase();

    if (skipKeywords.some((k) => lower.includes(k))) {
      continue;
    }

    currentTxn.description += " " + line;
  }

  // Push last transaction
  if (currentTxn) {
    currentTxn.description = currentTxn.description.replace(/\s+/g, " ").trim();

    transactions.push(currentTxn);
  }

  const validTransactions = transactions.filter(
    (txn) => txn.description && (txn.withdrawal > 0 || txn.deposit > 0),
  );

  console.log(`✅ Parsed ${validTransactions.length} transactions`);
  console.table(validTransactions);

  console.groupEnd();

  return validTransactions;
}
