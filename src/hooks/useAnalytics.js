import { useMemo } from "react";
import { formatCurrency } from "../utils/formatters";

export const useAnalytics = (transactions = []) => {
  // 1. Recurring Payment Detection Engine
  const recurringPayments = useMemo(() => {
    const merchantMap = {};

    transactions.forEach((t) => {
      if (t.type !== "DEBIT") return;

      // Clean up description to extract core merchant keyword
      const cleanedMerchant = t.description
        .toLowerCase()
        .replace(/upi\/p2m\/|neft-|imps-|rtgs-/g, "")
        .split("/")[0]
        .trim();

      if (!cleanedMerchant) return;

      if (!merchantMap[cleanedMerchant]) {
        merchantMap[cleanedMerchant] = {
          merchant: t.description,
          count: 0,
          totalAmount: 0,
          amounts: [],
          dates: [],
        };
      }

      merchantMap[cleanedMerchant].count += 1;
      merchantMap[cleanedMerchant].totalAmount += t.amount;
      merchantMap[cleanedMerchant].amounts.push(t.amount);
      merchantMap[cleanedMerchant].dates.push(t.date);
    });

    // Filter for merchants appearing 2+ times with similar amounts
    return Object.values(merchantMap)
      .filter((item) => item.count >= 2)
      .map((item) => {
        const avgAmount = item.totalAmount / item.count;
        return {
          merchant: item.merchant,
          frequency: `${item.count} cycles detected`,
          avgAmount,
          formattedAvgAmount: formatCurrency(avgAmount),
          totalSpent: item.totalAmount,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [transactions]);

  // 2. Anomaly & Suspicious Activity Engine
  const anomalies = useMemo(() => {
    const flagged = [];

    transactions.forEach((t, index) => {
      const reasons = [];

      // Flag 1: High-value single transaction (> ₹50,000)
      if (t.amount >= 50000) {
        reasons.push("High-value single transfer exceeding ₹50,000");
      }

      // Flag 2: Round number large cash withdrawals
      if (
        t.amount >= 10000 &&
        t.amount % 5000 === 0 &&
        /atm|cash/i.test(t.description)
      ) {
        reasons.push("Large round-number cash withdrawal");
      }

      // Flag 3: Potential duplicate charge (same date, same amount, same bank)
      const duplicate = transactions.find(
        (other, otherIdx) =>
          otherIdx !== index &&
          other.date === t.date &&
          other.amount === t.amount &&
          other.type === t.type &&
          other.description === t.description,
      );

      if (duplicate) {
        reasons.push("Potential duplicate entry on same day");
      }

      if (reasons.length > 0) {
        flagged.push({
          ...t,
          reasons,
        });
      }
    });

    return flagged;
  }, [transactions]);

  return {
    recurringPayments,
    anomalies,
    anomalyCount: anomalies.length,
  };
};
