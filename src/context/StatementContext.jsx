import React, { createContext, useContext, useState, useMemo } from "react";
import { generateHash } from "../utils/formatters";

const StatementContext = createContext();

// Universal date parser to safely handle formats like "19-Aug-2025", "19/08/2025", "2025-08-19"
export const parseUniversalDate = (input) => {
  if (!input) return 0;
  if (typeof input === "number") return input;

  let str = String(input).trim();

  // Strip potential leading row index prefixes (e.g., "3121/03/2026" -> "21/03/2026")
  const rowPrefixMatch = str.match(/(?:^\d{1,4})(\d{2}[/-]\d{2}[/-]\d{4}.*)$/);
  if (rowPrefixMatch) {
    str = rowPrefixMatch[1];
  }

  // 1. Text format: DD-Mon-YYYY or DD Mon YYYY (e.g., "19-Aug-2025", "19 August 2025")
  const monthNames = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  const textDateMatch = str.match(/^(\d{1,2})[/\-. ]([A-Za-z]+)[/\-. ](\d{4})/);
  if (textDateMatch) {
    const [, day, monthStr, year] = textDateMatch;
    const monthKey = monthStr.toLowerCase();
    if (monthNames[monthKey] !== undefined) {
      const d = new Date(Number(year), monthNames[monthKey], Number(day));
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }

  // 2. Standard format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. Fallback standard Date parser (handles ISO YYYY-MM-DD, etc.)
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

// Helper to clean and convert balances to numbers
const cleanNumber = (val) => {
  if (typeof val === "number") return val;
  if (!val && val !== 0) return NaN;
  const numericStr = String(val).replace(/[^0-9.-]+/g, "");
  return Number(numericStr);
};

export const StatementProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rawOrderTransactions, setRawOrderTransactions] = useState([]);
  const [detectedStatementInfo, setDetectedStatementInfo] = useState(null);
  const [filter, setFilter] = useState({
    search: "",
    bank: "ALL",
    type: "ALL",
    category: "ALL",
    startDate: "",
    endDate: "",
  });

  const setParsedData = (fileName, bank, newTxns, metadata = null) => {
    setFiles([
      { name: fileName, bank, count: newTxns.length, uploadedAt: new Date() },
    ]);

    // Keep the raw statement order for chronological first/last balance checks
    setRawOrderTransactions([...newTxns]);

    // Sorted for UI display (newest first)
    const sorted = [...newTxns].sort((a, b) => {
      const diff = parseUniversalDate(b.date) - parseUniversalDate(a.date);
      if (diff !== 0) return diff;
      return (b._index ?? b.sNo ?? 0) - (a._index ?? a.sNo ?? 0);
    });
    setTransactions(sorted);

    if (metadata) {
      setDetectedStatementInfo(metadata);
    }
  };

  const addParsedData = (fileName, bank, newTxns) => {
    setFiles((prev) => [
      ...prev,
      { name: fileName, bank, count: newTxns.length, uploadedAt: new Date() },
    ]);

    setTransactions((prev) => {
      const existingHashes = new Set(
        prev.map((t) => t.hash || generateHash(t)),
      );
      const filteredNew = newTxns.filter(
        (t) => !existingHashes.has(t.hash || generateHash(t)),
      );
      return [...prev, ...filteredNew].sort((a, b) => {
        const diff = parseUniversalDate(b.date) - parseUniversalDate(a.date);
        if (diff !== 0) return diff;
        return (b._index ?? b.sNo ?? 0) - (a._index ?? a.sNo ?? 0);
      });
    });
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const desc = (t.description || t.remarks || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      const searchTarget = filter.search.toLowerCase();

      const txnTimestamp = parseUniversalDate(t.date);
      const filterStart = filter.startDate
        ? parseUniversalDate(filter.startDate)
        : null;
      const filterEnd = filter.endDate
        ? parseUniversalDate(filter.endDate)
        : null;

      const matchesSearch =
        !filter.search ||
        desc.includes(searchTarget) ||
        cat.includes(searchTarget);
      const matchesBank = filter.bank === "ALL" || t.bank === filter.bank;
      const matchesType = filter.type === "ALL" || t.type === filter.type;
      const matchesCategory =
        filter.category === "ALL" || t.category === filter.category;
      const matchesStart = !filterStart || txnTimestamp >= filterStart;
      const matchesEnd = !filterEnd || txnTimestamp <= filterEnd;

      return (
        matchesSearch &&
        matchesBank &&
        matchesType &&
        matchesCategory &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [transactions, filter]);

  const kpis = useMemo(() => {
    let credit = 0;
    let debit = 0;
    let suspiciousCount = 0;

    filteredTransactions.forEach((t) => {
      const amountVal = cleanNumber(
        t.amount ?? t.txnAmount ?? (t.deposit || t.withdrawal),
      );
      if (t.type === "CREDIT" || t.type === "DEPOSIT") {
        credit += isNaN(amountVal) ? 0 : amountVal;
      }
      if (t.type === "DEBIT" || t.type === "WITHDRAWAL") {
        debit += isNaN(amountVal) ? 0 : amountVal;
      }
      if (t.isSuspicious) suspiciousCount++;
    });

    const netCashFlow = credit - debit;

    // Filter valid transactions with recorded balances
    const validRawTxns = rawOrderTransactions.filter(
      (t) =>
        t.balance !== undefined &&
        t.balance !== null &&
        !isNaN(cleanNumber(t.balance)),
    );

    let closingBalance = null;

    if (validRawTxns.length > 0) {
      const firstTxn = validRawTxns[0];
      const lastTxn = validRawTxns[validRawTxns.length - 1];

      const firstDate = parseUniversalDate(firstTxn.date || firstTxn.valueDate);
      const lastDate = parseUniversalDate(lastTxn.date || lastTxn.valueDate);

      if (lastDate > firstDate) {
        // Ascending Order (e.g. 01-Aug-2025 to 19-Aug-2025): Closing balance is at the LAST index
        closingBalance = cleanNumber(lastTxn.balance);
      } else if (firstDate > lastDate) {
        // Descending Order (e.g. 19-Aug-2025 to 01-Aug-2025): Closing balance is at the FIRST index
        closingBalance = cleanNumber(firstTxn.balance);
      } else {
        // Same date or single day statement: Use the one with the higher _index / sNo
        const firstIdx = firstTxn._index ?? firstTxn.sNo ?? 0;
        const lastIdx = lastTxn._index ?? lastTxn.sNo ?? 0;

        closingBalance =
          lastIdx >= firstIdx
            ? cleanNumber(lastTxn.balance)
            : cleanNumber(firstTxn.balance);
      }
    }

    // Secondary Fallback: Use detected metadata closingBalance if present
    if (
      (closingBalance === null || isNaN(closingBalance)) &&
      detectedStatementInfo?.closingBalance
    ) {
      closingBalance = cleanNumber(detectedStatementInfo.closingBalance);
    }

    return {
      totalCount: filteredTransactions.length,
      credit: Number(credit.toFixed(2)),
      debit: Number(debit.toFixed(2)),
      netCashFlow: Number(netCashFlow.toFixed(2)),
      closingBalance,
      suspiciousCount,
    };
  }, [filteredTransactions, rawOrderTransactions, detectedStatementInfo]);

  const clearAll = () => {
    setFiles([]);
    setTransactions([]);
    setRawOrderTransactions([]);
    setDetectedStatementInfo(null);
  };

  return (
    <StatementContext.Provider
      value={{
        files,
        transactions: filteredTransactions,
        rawTransactions: transactions,
        detectedStatementInfo,
        setDetectedStatementInfo,
        filter,
        setFilter,
        kpis,
        setParsedData,
        addParsedData,
        clearAll,
      }}
    >
      {children}
    </StatementContext.Provider>
  );
};

export const useStatement = () => useContext(StatementContext);
