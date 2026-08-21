import React, { createContext, useContext, useState, useMemo } from "react";
import { generateHash } from "../utils/formatters";

const StatementContext = createContext();

// Universal date parser to safely handle DD/MM/YYYY, text dates, ISO strings, and edge cases
export const parseUniversalDate = (input) => {
  if (!input) return 0;
  if (typeof input === "number") return input;

  let str = String(input).trim();

  // Strip potential leading row index prefixes (e.g., "3121/03/2026" -> "21/03/2026")
  const rowPrefixMatch = str.match(/(?:^\d{1,4})(\d{2}[/-]\d{2}[/-]\d{4}.*)$/);
  if (rowPrefixMatch) {
    str = rowPrefixMatch[1];
  }

  // 1. Check for standard DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 2. Check for DD-Mon-YYYY or DD Mon YYYY (e.g., 21-Mar-2026, 10 Oct 2025)
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

  // 3. Fallback to native JS Date constructor (handles ISO YYYY-MM-DD, Month Day, Year, etc.)
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export const StatementProvider = ({ children }) => {
  const [files, setFiles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState({
    search: "",
    bank: "ALL",
    type: "ALL",
    category: "ALL",
    startDate: "",
    endDate: "",
  });

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
      return [...prev, ...filteredNew].sort(
        (a, b) => parseUniversalDate(b.date) - parseUniversalDate(a.date),
      );
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
      if (t.type === "CREDIT" || t.type === "DEPOSIT") {
        credit += t.amount || t.deposit || 0;
      }
      if (t.type === "DEBIT" || t.type === "WITHDRAWAL") {
        debit += t.amount || t.withdrawal || 0;
      }
      if (t.isSuspicious) suspiciousCount++;
    });

    const netCashFlow = credit - debit;

    // Clean and normalize balance values from string or numbers (handles formats like ₹1,39,145.80)
    const cleanBalance = (val) => {
      if (typeof val === "number") return val;
      if (!val) return NaN;
      const numericStr = String(val).replace(/[^0-9.-]+/g, "");
      return Number(numericStr);
    };

    // Filter transactions having a valid balance, then sort by parsed date descending
    const txnsWithBalance = filteredTransactions
      .filter(
        (t) =>
          t.balance !== undefined &&
          t.balance !== null &&
          !isNaN(cleanBalance(t.balance)),
      )
      .sort((a, b) => parseUniversalDate(b.date) - parseUniversalDate(a.date));

    const closingBalance =
      txnsWithBalance.length > 0
        ? cleanBalance(txnsWithBalance[0].balance)
        : null;

    return {
      totalCount: filteredTransactions.length,
      credit,
      debit,
      netCashFlow,
      closingBalance,
      suspiciousCount,
    };
  }, [filteredTransactions]);

  const clearAll = () => {
    setFiles([]);
    setTransactions([]);
  };

  return (
    <StatementContext.Provider
      value={{
        files,
        transactions: filteredTransactions,
        rawTransactions: transactions,
        filter,
        setFilter,
        kpis,
        addParsedData,
        clearAll,
      }}
    >
      {children}
    </StatementContext.Provider>
  );
};

export const useStatement = () => useContext(StatementContext);
