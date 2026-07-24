/**
 * ippbParser.js
 * Robust parser for India Post Payments Bank (IPPB) statements.
 * Fixes: Account summary pollution, trailing disclaimers, and strict DD-MM-YYYY dates.
 */

export function parseIPPBTransactions(lines) {
  console.log("🔍 [IPPB Parser] Starting scan...");
  console.log(`📄 [IPPB Parser] Received ${lines.length} lines to inspect.`);

  const transactions = [];

  // Match dates specifically with capture groups: Group 1 = Day, Group 2 = Month, Group 3 = Year
  const dateRegex = /\b(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})\b/;
  const amountPattern = /^[\d,]+\.\d{2}(\s*(?:Cr|Dr))?$/i;

  let currentTxn = null;

  for (let i = 0; i < lines.length; i++) {
    // Clean string: strip hidden non-breaking spaces and trim
    const line = lines[i]
      .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, " ")
      .trim();

    // 1. Terminate transaction parsing immediately when summary or footer section begins
    if (isIPPBSummaryOrEndSection(line)) {
      if (currentTxn) {
        console.log(
          `🛑 [IPPB Parser] Reached statement end section at line ${i + 1}. Closing active transaction.`,
        );
        finalizeAndPushIPPB(currentTxn, transactions);
        currentTxn = null;
      }
      continue;
    }

    // 2. Skip headers, metadata, or noise lines
    if (!line || isIPPBHeaderOrFooter(line)) {
      if (line) {
        console.log(
          `⏭️ [IPPB Parser] Ignored noise/metadata at line ${i + 1}: "${line}"`,
        );
      }
      continue;
    }

    const dateMatch = line.match(dateRegex);

    // 3. Check if this line marks the beginning of a new transaction
    if (dateMatch && line.indexOf(dateMatch[0]) < 15) {
      if (currentTxn) {
        finalizeAndPushIPPB(currentTxn, transactions);
      }

      const rawMatch = dateMatch[0];

      // Strict DD-MM-YYYY parsing
      const day = dateMatch[1].padStart(2, "0");
      const month = dateMatch[2].padStart(2, "0");
      const year = dateMatch[3];

      const isoDate = `${year}-${month}-${day}`;
      const displayDate = `${day}-${month}-${year}`;

      const rest = line
        .substring(line.indexOf(rawMatch) + rawMatch.length)
        .trim();

      console.log(
        `🎯 [IPPB Parser] Line ${i + 1} -> New Txn Date: ${displayDate}`,
      );

      currentTxn = {
        lineNum: i + 1,
        date: isoDate,
        formattedDate: displayDate,
        tranId: "",
        remarks: [],
        amounts: [],
      };

      if (rest) {
        processTextTokens(rest, currentTxn, amountPattern);
      }
      continue;
    }

    // 4. Append wrapped/continuing text lines into the active transaction
    if (currentTxn) {
      processTextTokens(line, currentTxn, amountPattern);
    } else {
      console.log(
        `❓ [IPPB Parser] Line ${i + 1} skipped (no active transaction context): "${line}"`,
      );
    }
  }

  // Finalize last transaction if still open
  if (currentTxn) {
    finalizeAndPushIPPB(currentTxn, transactions);
  }

  console.log(
    `✅ [IPPB Parser] Finished! Total extracted: ${transactions.length} transaction(s).`,
  );
  return transactions;
}

function processTextTokens(lineText, txn, amountPattern) {
  // Strip out redundant table column headers if repeated across page splits
  const cleanLine = lineText
    .replace(
      /DATE TRAN ID TRANSACTION PARTICULARS WITHDRWAL DEPOSIT BALANCE/gi,
      "",
    )
    .trim();
  const tokens = cleanLine.split(/\s+/);

  for (let token of tokens) {
    if (!token) continue;

    // Filter noise like bullet symbols or stray numbers
    if (token === "•" || token === "the") continue;

    // Capture IPPB Transaction Ref ID (e.g., S80329065, S138419, TXN12345)
    if (!txn.tranId && /^S\d{5,}$/i.test(token)) {
      txn.tranId = token;
      continue;
    }

    // Preserve internal date remarks formatted as DD-MM-YYYY
    if (/^\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{4}$/.test(token)) {
      const parts = token.split(/[\.\/-]/);
      if (parts.length === 3) {
        token = `${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[2]}`;
      }
      txn.remarks.push(token);
      continue;
    }

    // Capture currency amounts
    if (amountPattern.test(token) || /^\d+\.\d{2}$/.test(token)) {
      txn.amounts.push(token);
    } else if (token.toUpperCase() !== "CR" && token.toUpperCase() !== "DR") {
      txn.remarks.push(token);
    }
  }
}

/**
 * Section boundary check to stop capturing transaction tokens when summary begins.
 */
function isIPPBSummaryOrEndSection(str) {
  const lower = str.toLowerCase();
  return (
    lower.includes("account summary") ||
    lower.includes("opening balance total withdrawals") ||
    lower.includes("end of report") ||
    lower.includes("disclaimer :") ||
    lower.includes("guidelines for safe")
  );
}

function isIPPBHeaderOrFooter(str) {
  const lower = str.toLowerCase();
  const keywords = [
    "transaction details",
    "date tran id",
    "transaction particulars",
    "withdrwal",
    "deposit",
    "balance",
    "account details",
    "transaction period",
    "branch office",
    "customer address",
    "registered mobile",
    "registered e-mail",
    "account number",
    "ifsc",
    "nomination no",
    "customer id",
    "account type",
    "micr",
    "opening balance :",
    "call us at",
    "email us at",
    "download india post",
    "google play store",
    "apple app store",
    "pass code",
    "never share",
    "frequently change",
    "confidential account information",
    "operating system",
    "jail breaking",
    "rooting",
    "granting access",
    "remote access",
    "remember that",
    "page ",
  ];
  return keywords.some((kw) => lower.includes(kw));
}

function finalizeAndPushIPPB(raw, outputArray) {
  if (raw.amounts.length < 1) {
    console.warn(
      `⚠️ [IPPB Parser] Discarded candidate starting at line ${raw.lineNum} (no numeric amounts captured).`,
    );
    return;
  }

  const cleanNum = (str) => parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
  const amounts = raw.amounts.map(cleanNum);

  // In IPPB statement row layout:
  // - Last amount = Running Balance
  // - Second last amount = Transaction Amount
  const closingBalance = amounts[amounts.length - 1];

  let transactionAmount = 0;
  if (amounts.length >= 2) {
    transactionAmount = amounts[amounts.length - 2];
  } else {
    transactionAmount = amounts[0];
  }

  const fullRemarks = raw.remarks.join(" ").trim();
  const lowerRemarks = fullRemarks.toLowerCase();

  // Determine DEPOSIT vs WITHDRAWAL
  let type = "WITHDRAWAL";
  const previousTxn = outputArray[outputArray.length - 1];

  if (previousTxn) {
    type = closingBalance >= previousTxn.balance ? "DEPOSIT" : "WITHDRAWAL";
  } else if (
    lowerRemarks.includes("cr~") ||
    lowerRemarks.includes("credit") ||
    lowerRemarks.includes("deposit") ||
    lowerRemarks.includes("lpg subsidy") ||
    lowerRemarks.includes("int.pd")
  ) {
    type = "DEPOSIT";
  }

  const record = {
    sNo: outputArray.length + 1,
    date: raw.date,
    displayDate: raw.formattedDate,
    tranId: raw.tranId || "N/A",
    remarks: fullRemarks,
    description: fullRemarks,
    amount: transactionAmount,
    balance: closingBalance,
    type: type,
  };

  console.log(
    `✅ [IPPB Parser] Pushed Txn #${record.sNo} | Date: ${record.displayDate} | Amount: ${record.amount} | Balance: ${record.balance} | Type: ${record.type}`,
  );
  outputArray.push(record);
}
