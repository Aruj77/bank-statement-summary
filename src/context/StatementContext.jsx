import React, { createContext, useContext, useState, useMemo } from "react";
import { generateHash } from "../utils/formatters";

const StatementContext = createContext();

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
        (a, b) => new Date(b.date) - new Date(a.date),
      );
    });
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const desc = (t.description || t.remarks || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      const searchTarget = filter.search.toLowerCase();

      const matchesSearch =
        !filter.search ||
        desc.includes(searchTarget) ||
        cat.includes(searchTarget);
      const matchesBank = filter.bank === "ALL" || t.bank === filter.bank;
      const matchesType = filter.type === "ALL" || t.type === filter.type;
      const matchesCategory =
        filter.category === "ALL" || t.category === filter.category;
      const matchesStart =
        !filter.startDate || new Date(t.date) >= new Date(filter.startDate);
      const matchesEnd =
        !filter.endDate || new Date(t.date) <= new Date(filter.endDate);

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
    const latestBalance = filteredTransactions[0]?.balance || 0;

    return {
      totalCount: filteredTransactions.length,
      credit,
      debit,
      netCashFlow,
      closingBalance: latestBalance,
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
