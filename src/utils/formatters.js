export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export const generateHash = (txn) => {
  const normDesc = (txn.description || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const normAmt = parseFloat(txn.amount || 0).toFixed(2);
  return `${txn.date}_${normAmt}_${txn.type}_${normDesc}`;
};
