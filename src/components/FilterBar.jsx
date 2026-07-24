import React from "react";
import { useStatement } from "../context/StatementContext";
import { Search, Filter, RotateCcw } from "lucide-react";

export const FilterBar = () => {
  const { filter, setFilter, clearAll, rawTransactions } = useStatement();

  const handleReset = () => {
    setFilter({
      search: "",
      bank: "ALL",
      type: "ALL",
      category: "ALL",
      startDate: "",
      endDate: "",
    });
  };

  const categories = [
    "ALL",
    "UPI / Transfer",
    "Food & Dining",
    "Shopping",
    "Travel & Transport",
    "Income / Salary",
    "Subscriptions",
    "General / Others",
  ];
  const banks = ["ALL", "HDFC", "SBI", "ICICI", "AXIS", "GENERIC"];

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by merchant, UPI ID, or keyword..."
            value={filter.search}
            onChange={(e) =>
              setFilter((f) => ({ ...f, search: e.target.value }))
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Bank Filter */}
        <select
          value={filter.bank}
          onChange={(e) => setFilter((f) => ({ ...f, bank: e.target.value }))}
          className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
        >
          {banks.map((b) => (
            <option key={b} value={b}>
              {b === "ALL" ? "All Banks" : b}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filter.type}
          onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
          className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
        >
          <option value="ALL">All Types</option>
          <option value="CREDIT">Credit (Inflow)</option>
          <option value="DEBIT">Debit (Outflow)</option>
        </select>

        {/* Category Filter */}
        <select
          value={filter.category}
          onChange={(e) =>
            setFilter((f) => ({ ...f, category: e.target.value }))
          }
          className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "ALL" ? "All Categories" : c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700/50">
        {/* Date Range Inputs */}
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span>Date Range:</span>
          <input
            type="date"
            value={filter.startDate}
            onChange={(e) =>
              setFilter((f) => ({ ...f, startDate: e.target.value }))
            }
            className="px-2 py-1 bg-slate-900/60 border border-slate-700 rounded text-xs text-slate-200"
          />
          <span>to</span>
          <input
            type="date"
            value={filter.endDate}
            onChange={(e) =>
              setFilter((f) => ({ ...f, endDate: e.target.value }))
            }
            className="px-2 py-1 bg-slate-900/60 border border-slate-700 rounded text-xs text-slate-200"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>

          {rawTransactions.length > 0 && (
            <button
              onClick={clearAll}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-semibold transition-colors"
            >
              Clear Statement Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
