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

// Specific distinctive color mapping for categories
const CATEGORY_COLORS = {
  "UPI Transfers": "#38bdf8",     // Sky blue
  "Interest Earned": "#34d399",   // Emerald green
  "Bank Charges & Fees": "#f87171",// Soft red / Rose
  "NEFT / RTGS / IMPS": "#818cf8", // Indigo
  "ATM Cash Withdrawal": "#fbbf24",// Amber
  "Card / POS / Online": "#c084fc",// Purple
  "General / Other": "#94a3b8",    // Slate gray
};

const FALLBACK_PALETTE = [
  "#38bdf8",
  "#34d399",
  "#f87171",
  "#818cf8",
  "#fbbf24",
  "#c084fc",
  "#f472b6",
  "#94a3b8",
];

// Helper to categorize raw bank narration strings
const classifyTransaction = (txn) => {
  if (txn.category && txn.category !== "General" && txn.category !== "Other") {
    return txn.category;
  }

  const text = `${txn.description || ""} ${txn.remarks || ""}`.toUpperCase();

  // 1. Bank Charges & Penalties
  if (
    text.includes("CHG") ||
    text.includes("CHARGE") ||
    text.includes("FEE") ||
    text.includes("PENALTY") ||
    text.includes("GST") ||
    text.includes("SMS CHG") ||
    text.includes("ANNUAL MAINT")
  ) {
    return "Bank Charges & Fees";
  }

  // 2. Interest / Dividend
  if (
    text.includes("INT.PD") ||
    text.includes("INTEREST") ||
    text.includes("INT:") ||
    text.includes("INT ON") ||
    text.includes("DIVIDEND")
  ) {
    return "Interest Earned";
  }

  // 3. UPI
  if (text.includes("UPI") || text.includes("/UPI/") || text.includes("@")) {
    return "UPI Transfers";
  }

  // 4. Net Banking Wire Transfers (NEFT, IMPS, RTGS, NACH)
  if (
    text.includes("NEFT") ||
    text.includes("IMPS") ||
    text.includes("RTGS") ||
    text.includes("NACH") ||
    text.includes("ACH") ||
    text.includes("ECS")
  ) {
    return "NEFT / RTGS / IMPS";
  }

  // 5. ATM Withdrawals
  if (text.includes("ATM") || text.includes("CASH WDL") || text.includes("NFS")) {
    return "ATM Cash Withdrawal";
  }

  // 6. POS / E-Commerce / Card
  if (text.includes("POS") || text.includes("ECOM") || text.includes("DEBIT CARD")) {
    return "Card / POS / Online";
  }

  return "General / Other";
};

export const AnalyticsCharts = () => {
  const { transactions } = useStatement();

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

  // 1. Process Transaction Classifications & Totals
  const categoryMap = {};
  let totalWithdrawals = 0;
  let totalDeposits = 0;

  transactions.forEach((t) => {
    const rawAmt = t.amount || t.withdrawal || t.deposit || 0;
    const amt = typeof rawAmt === "number" ? rawAmt : Number(String(rawAmt).replace(/[^0-9.-]+/g, "")) || 0;

    const categoryName = classifyTransaction(t);
    categoryMap[categoryName] = (categoryMap[categoryName] || 0) + amt;

    const isWithdrawal = t.type === "WITHDRAWAL" || t.type === "DEBIT";
    const isDeposit = t.type === "DEPOSIT" || t.type === "CREDIT";

    if (isWithdrawal) {
      totalWithdrawals += amt;
    } else if (isDeposit) {
      totalDeposits += amt;
    }
  });

  const categoryData = Object.keys(categoryMap)
    .map((cat) => ({
      name: cat,
      value: Number(categoryMap[cat].toFixed(2)),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // 2. Transaction Flow Volume Data
  const volumeData = [
    { name: "Withdrawals", amount: Number(totalWithdrawals.toFixed(2)) },
    { name: "Deposits", amount: Number(totalDeposits.toFixed(2)) },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Category Breakdown Donut Chart */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col h-80">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold text-slate-300">
            Transaction Type Breakdown
          </h4>
          <span className="text-[10px] text-slate-400">
            {categoryData.length} Types Identified
          </span>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="46%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      CATEGORY_COLORS[entry.name] ||
                      FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]
                    }
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
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{
                  fontSize: "10.5px",
                  color: "#94a3b8",
                  paddingTop: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Credit vs Debit Volume Bar Chart */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col h-80">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold text-slate-300">
            Cash Flow Volume (Inflow vs Outflow)
          </h4>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
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
                itemStyle={{ color: "#f8fafc" }}
                labelStyle={{ color: "#f8fafc" }}
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