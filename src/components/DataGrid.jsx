import React, { useState, useMemo } from "react";
import { useStatement } from "../context/StatementContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export const DataGrid = () => {
  const { transactions } = useStatement();

  // Sorting state: key (sno | date | withdrawal | deposit | balance), direction ('asc' | 'desc')
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

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

  // Helper to extract values cleanly for sorting
  const getSortableValue = (item, index, key) => {
    const isWithdrawal = item.type === "WITHDRAWAL" || item.type === "DEBIT";
    const isDeposit = item.type === "DEPOSIT" || item.type === "CREDIT";

    switch (key) {
      case "sno":
        return item.sNo ?? index + 1;
      case "date":
        return item.date ? new Date(item.date).getTime() : 0;
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

  // Sort transactions based on current sortConfig
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

  // Calculate totals for withdrawals and deposits across all transactions
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
      {/* Scrollable Box Container */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-sm text-slate-300 relative">
          {/* Sticky Header */}
          <thead className="bg-slate-900 sticky top-0 z-10 text-xs text-slate-400 uppercase border-b border-slate-700 select-none shadow-md">
            <tr>
              {/* S.No Header */}
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

              {/* Date Header */}
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

              {/* Description Header */}
              <th className="p-3 bg-slate-900">Description</th>

              {/* Withdrawal Amount Header */}
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

              {/* Deposit Amount Header */}
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

              {/* Balance Header */}
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
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(t.date)}
                    </td>
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

      {/* Footer Bar with Total Summaries */}
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
