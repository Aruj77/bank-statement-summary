import React from "react";
import { useStatement } from "../context/StatementContext";
import { formatCurrency } from "../utils/formatters";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  Layers,
} from "lucide-react";

export const KpiDashboard = () => {
  const { kpis } = useStatement();

  const cards = [
    {
      title: "Total Credit (Inflow)",
      value: formatCurrency(kpis.credit),
      icon: ArrowUpRight,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Total Debit (Outflow)",
      value: formatCurrency(kpis.debit),
      icon: ArrowDownRight,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      title: "Net Cash Flow",
      value: formatCurrency(kpis.netCashFlow),
      icon: Wallet,
      color: kpis.netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400",
      bg: "bg-sky-500/10",
    },
    {
      title: "Flagged Anomalies",
      value: kpis.suspiciousCount,
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "Total Transactions",
      value: kpis.totalCount,
      icon: Layers,
      color: "text-sky-400",
      bg: "bg-slate-700/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {c.title}
              </span>
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </div>
            <div className="mt-2">
              <h3 className={`text-lg font-bold ${c.color}`}>{c.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
};
