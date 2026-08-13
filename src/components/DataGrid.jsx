import React, { useState, useMemo } from "react";
import { useStatement } from "../context/StatementContext";
import { formatCurrency } from "../utils/formatters";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export const DataGrid = () => {
  const { transactions } = useStatement();

  // Default sorting configuration to show initial serial number order automatically on load
  const [sortConfig, setSortConfig] = useState({
    key: "sno",
    direction: "asc",
  });

  // Accurate date parser built exclusively for sorting raw string dates
  const parseCustomDate = (dateStr) => {
    if (!dateStr) return 0;
    const cleanStr = String(dateStr).trim();

    // 1. Handle numeric formats with slashes or hyphens (e.g., DD/MM/YYYY, DD-MM-YY, YYYY-MM-DD)
    const parts = cleanStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let [p1, p2, p3] = parts;

      let year, month, day;
      if (p1.length === 4) {
        // Format: YYYY-MM-DD
        year = p1;
        month = p2;
        day = p3;
      } else {
        // Format: DD-MM-YYYY or DD-MM-YY
        day = p1;
        month = p2;
        year = p3;
        if (year.length === 2) {
          year = "20" + year; // Convert YY to 20YY
        }
      }

      const timestamp = new Date(`${year}-${month}-${day}`).getTime();
      if (!isNaN(timestamp)) return timestamp;
    }

    // 2. Handle alphanumeric formats (e.g., "03 Mar 2026" or "3-Mar-26")
    const months = {
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
    };

    const matches = cleanStr.match(
      /(\d{1,2})[\s\-]+([A-Za-z]{3})[\s\-]+(\d{2,4})/,
    );
    if (matches) {
      let [, day, monthStr, year] = matches;
      if (year.length === 2) year = "20" + year;
      const monthIdx = months[monthStr.toLowerCase().substring(0, 3)];
      if (monthIdx !== undefined) {
        return new Date(Number(year), monthIdx, Number(day)).getTime();
      }
    }

    // 3. Fallback to standard JS parser
    const fallbackTimestamp = new Date(cleanStr).getTime();
    return !isNaN(fallbackTimestamp) ? fallbackTimestamp : 0;
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      setSortConfig({ key: null, direction: "asc" });
      return;
    }
    setSortConfig({ key, direction });
  };

  const getSortableValue = (item, index, key) => {
    const isWithdrawal = item.type === "WITHDRAWAL" || item.type === "DEBIT";
    const isDeposit = item.type === "DEPOSIT" || item.type === "CREDIT";

    switch (key) {
      case "sno":
        return item.sNo ?? index + 1;
      case "date":
        return parseCustomDate(item.date);
      case "withdrawal":
        return isWithdrawal ? Number(item.withdrawal || item.amount || 0) : 0;
      case "deposit":
        return isDeposit ? Number(item.deposit || item.amount || 0) : 0;
      case "balance":
        return Number(item.balance || 0);
      default:
        return 0;
    }
  };

  const sortedTransactions = useMemo(() => {
    if (!sortConfig.key) return transactions;

    return [...transactions].sort((a, b) => {
      const indexA = transactions.indexOf(a);
      const indexB = transactions.indexOf(b);

      const valA = getSortableValue(a, indexA, sortConfig.key);
      const valB = getSortableValue(b, indexB, sortConfig.key);

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [transactions, sortConfig]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const isWithdrawal = t.type === "WITHDRAWAL" || t.type === "DEBIT";
        const isDeposit = t.type === "DEPOSIT" || t.type === "CREDIT";

        if (isWithdrawal) {
          acc.withdrawals += Number(t.withdrawal || t.amount || 0);
        } else if (isDeposit) {
          acc.deposits += Number(t.deposit || t.amount || 0);
        }
        return acc;
      },
      { withdrawals: 0, deposits: 0 },
    );
  }, [transactions]);

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100" />
      );
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-sky-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
    );
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto pb-6">
        <table className="w-full text-left text-sm text-slate-300 relative">
          <thead className="bg-slate-900 sticky top-0 z-10 text-xs text-slate-400 uppercase border-b border-slate-700 select-none shadow-md">
            <tr>
              <th
                onClick={() => handleSort("sno")}
                className="p-3 text-center cursor-pointer hover:bg-slate-800 transition-colors group bg-slate-900"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span
                    className={
                      sortConfig.key === "sno" ? "text-sky-400 font-bold" : ""
                    }
                  >
                    S.No
                  </span>
                  {renderSortIcon("sno")}
                </div>
              </th>

              <th
                onClick={() => handleSort("date")}
                className="p-3 cursor-pointer hover:bg-slate-800 transition-colors group bg-slate-900"
              >
                <div className="flex items-center space-x-1">
                  <span
                    className={
                      sortConfig.key === "date" ? "text-sky-400 font-bold" : ""
                    }
                  >
                    Date
                  </span>
                  {renderSortIcon("date")}
                </div>
              </th>

              <th className="p-3 bg-slate-900">Description</th>

              <th
                onClick={() => handleSort("withdrawal")}
                className="p-3 text-right cursor-pointer hover:bg-slate-800 transition-colors group bg-slate-900"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span
                    className={
                      sortConfig.key === "withdrawal"
                        ? "text-sky-400 font-bold"
                        : ""
                    }
                  >
                    Withdrawal Amount
                  </span>
                  {renderSortIcon("withdrawal")}
                </div>
              </th>

              <th
                onClick={() => handleSort("deposit")}
                className="p-3 text-right cursor-pointer hover:bg-slate-800 transition-colors group bg-slate-900"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span
                    className={
                      sortConfig.key === "deposit"
                        ? "text-sky-400 font-bold"
                        : ""
                    }
                  >
                    Deposit Amount
                  </span>
                  {renderSortIcon("deposit")}
                </div>
              </th>

              <th
                onClick={() => handleSort("balance")}
                className="p-3 text-right cursor-pointer hover:bg-slate-800 transition-colors group bg-slate-900"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span
                    className={
                      sortConfig.key === "balance"
                        ? "text-sky-400 font-bold"
                        : ""
                    }
                  >
                    Balance
                  </span>
                  {renderSortIcon("balance")}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700/50">
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No transactions parsed or found matching filters.
                </td>
              </tr>
            ) : (
              sortedTransactions.map((t, index) => {
                const isWithdrawal =
                  t.type === "WITHDRAWAL" || t.type === "DEBIT";
                const isDeposit = t.type === "DEPOSIT" || t.type === "CREDIT";

                const withdrawalAmt = isWithdrawal
                  ? t.withdrawal || t.amount
                  : null;
                const depositAmt = isDeposit ? t.deposit || t.amount : null;

                const originalIndex = transactions.indexOf(t);
                const serialNumber = t.sNo || originalIndex + 1;
                const descriptionText = t.description || t.remarks || "-";

                return (
                  <tr
                    key={t.id || `txn-${index}`}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-3 text-center text-slate-400 text-xs whitespace-nowrap">
                      {serialNumber}
                    </td>
                    <td className="p-3 whitespace-nowrap">{t.date || "-"}</td>
                    <td
                      className="p-3 max-w-sm truncate"
                      title={descriptionText}
                    >
                      {descriptionText}
                    </td>
                    <td className="p-3 text-right font-medium text-rose-400 whitespace-nowrap">
                      {withdrawalAmt ? formatCurrency(withdrawalAmt) : "-"}
                    </td>
                    <td className="p-3 text-right font-medium text-emerald-400 whitespace-nowrap">
                      {depositAmt ? formatCurrency(depositAmt) : "-"}
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-200 whitespace-nowrap">
                      {t.balance != null ? formatCurrency(t.balance) : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-700 flex flex-wrap items-center justify-between text-xs gap-3">
        <span className="text-slate-400 font-medium">
          Total Entries:{" "}
          <strong className="text-slate-200">
            {sortedTransactions.length}
          </strong>
        </span>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Total Withdrawals:</span>
            <span className="font-semibold text-rose-400">
              {formatCurrency(totals.withdrawals)}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Total Deposits:</span>
            <span className="font-semibold text-emerald-400">
              {formatCurrency(totals.deposits)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
