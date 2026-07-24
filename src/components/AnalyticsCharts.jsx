import React from "react";
import { useStatement } from "../context/StatementContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#0284c7",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#64748b",
];

export const AnalyticsCharts = () => {
  const { transactions } = useStatement();

  // Handle empty state gracefully
  if (!transactions || transactions.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-6 h-72 flex items-center justify-center text-slate-500 text-sm">
          No category data available to display charts.
        </div>
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-6 h-72 flex items-center justify-center text-slate-500 text-sm">
          No transaction flow available to display charts.
        </div>
      </div>
    );
  }

  // 1. Category Breakdown Data
  const categoryMap = {};
  let totalWithdrawals = 0;
  let totalDeposits = 0;

  transactions.forEach((t) => {
    // Safely parse amount
    const amt = Number(t.amount || t.withdrawal || t.deposit || 0);

    // Track category totals (default to "General" if category is missing)
    const categoryName = t.category || "General";
    categoryMap[categoryName] = (categoryMap[categoryName] || 0) + amt;

    // Track Credits vs Debits
    const isWithdrawal = t.type === "WITHDRAWAL" || t.type === "DEBIT";
    const isDeposit = t.type === "DEPOSIT" || t.type === "CREDIT";

    if (isWithdrawal) {
      totalWithdrawals += t.withdrawal ? Number(t.withdrawal) : amt;
    } else if (isDeposit) {
      totalDeposits += t.deposit ? Number(t.deposit) : amt;
    }
  });

  const categoryData = Object.keys(categoryMap)
    .map((cat) => ({
      name: cat,
      value: Number(categoryMap[cat].toFixed(2)),
    }))
    .filter((item) => item.value > 0);

  // 2. Withdrawal vs Deposit Volume Data
  const volumeData = [
    { name: "Withdrawals", amount: Number(totalWithdrawals.toFixed(2)) },
    { name: "Deposits", amount: Number(totalDeposits.toFixed(2)) },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Category Pie Chart */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col h-72">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">
          Category Spending Distribution
        </h4>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `₹${Number(value || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}`,
                  "Amount",
                ]}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.5rem",
                  color: "#f8fafc",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Credit vs Debit Summary Bar Chart */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col h-72">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">
          Transaction Volume Overview (Withdrawals vs Deposits)
        </h4>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
              />
              <Tooltip
                formatter={(value) => [
                  `₹${Number(value || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}`,
                  "Total",
                ]}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "0.5rem",
                  color: "#f8fafc",
                }}
                itemStyle={{
                  color: "#f8fafc",
                }}
                labelStyle={{
                  color: "#f8fafc",
                }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {volumeData.map((entry, index) => (
                  <Cell
                    key={`bar-cell-${index}`}
                    fill={entry.name === "Deposits" ? "#10b981" : "#f43f5e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
