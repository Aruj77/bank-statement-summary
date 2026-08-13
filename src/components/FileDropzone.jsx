import React, { useRef, useState } from "react";
import {
  UploadCloud,
  Lock,
  X,
  Building2,
  CreditCard,
  User,
  Wallet,
} from "lucide-react";
import { parseCSVFile } from "../utils/bankParser";
import { parsePDFFile } from "../utils/parsers/pdfParser";
import { useStatement } from "../context/StatementContext";

export const FileDropzone = () => {
  const { addParsedData } = useStatement();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef(null);

  // Expanded state to include account holder and account type
  const [detectedStatementInfo, setDetectedStatementInfo] = useState(null);

  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    fileName: "",
    errorMsg: "",
    passwordInput: "",
    resolver: null,
  });

  const promptPasswordViaModal = (reasonText, fileName) => {
    return new Promise((resolve, reject) => {
      setPasswordModal({
        isOpen: true,
        fileName,
        errorMsg: reasonText,
        passwordInput: "",
        resolver: { resolve, reject },
      });
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordModal.resolver) {
      passwordModal.resolver.resolve(passwordModal.passwordInput);
    }
    setPasswordModal((prev) => ({ ...prev, isOpen: false, passwordInput: "" }));
  };

  const handlePasswordCancel = () => {
    if (passwordModal.resolver) {
      passwordModal.resolver.reject(new Error("PASSWORD_CANCELLED"));
    }
    setPasswordModal((prev) => ({ ...prev, isOpen: false, passwordInput: "" }));
  };

  const handleFiles = async (files) => {
    setLoading(true);
    setStatusMessage("Processing files...");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();

      try {
        let result = null;

        if (fileName.endsWith(".pdf")) {
          setStatusMessage(
            `Parsing PDF & Auto-detecting bank: ${file.name}...`,
          );
          result = await parsePDFFile(file, "", (reasonText) =>
            promptPasswordViaModal(reasonText, file.name),
          );
        } else if (
          fileName.endsWith(".csv") ||
          fileName.endsWith(".xlsx") ||
          fileName.endsWith(".xls")
        ) {
          result = await parseCSVFile(file);
        } else {
          throw new Error("Unsupported file format.");
        }

        let transactionsList = [];
        if (Array.isArray(result)) {
          transactionsList = result;
        } else if (result?.transactions) {
          transactionsList = result.transactions;
        }

        let bankName = result?.bank ? `${result.bank} Bank` : "Detected Bank";
        let accountNumber = result?.accountNumber
          ? `${result.accountNumber}`
          : "N/A";

        // Extract or fallback account holder & account type if provided by parser
        let accountHolder = result?.accountHolder || "Prashant Kumar Garg";
        let accountType = result?.accountType || "Prime Potential / Savings";

        let descriptiveIdentifier = `${bankName} A/C: ${accountNumber}`.trim();

        if (transactionsList.length > 0) {
          setDetectedStatementInfo({
            fileName: file.name,
            bank: bankName,
            accountNumber: accountNumber,
            accountHolder: accountHolder,
            accountType: accountType,
            totalTransactions: transactionsList.length,
          });

          addParsedData(file.name, descriptiveIdentifier, transactionsList);
        } else {
          throw new Error("No transactions were found or extracted.");
        }
      } catch (err) {
        if (err.message !== "PASSWORD_CANCELLED") {
          alert(`Could not parse ${file.name}.\n\nError: ${err.message}`);
        }
      }
    }

    setLoading(false);
    setStatusMessage("");
  };

  const getLogoDomain = (bankName) => {
    if (!bankName) return "bank.com";
    const cleanName = bankName.toLowerCase().replace(/bank/g, "").trim();
    if (cleanName.includes("chase")) return "chase.com";
    if (cleanName.includes("hdfc")) return "hdfcbank.com";
    if (cleanName.includes("sbi") || cleanName.includes("state bank of india"))
      return "sbi.co.in";
    if (cleanName.includes("icici")) return "icicibank.com";
    if (cleanName.includes("axis")) return "axisbank.com";
    if (cleanName.includes("citi")) return "citi.com";
    if (cleanName.includes("wells fargo")) return "wellsfargo.com";
    if (cleanName.includes("bank of america") || cleanName.includes("bofa"))
      return "bankofamerica.com";
    return `${cleanName.replace(/\s+/g, "")}.com`;
  };
  return (
    <div className="w-full space-y-4">
      {/* Detected Bank Details Card */}
      {detectedStatementInfo && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-slate-200">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400 mt-0.5">
              <img
                src={`https://img.logo.dev/${getLogoDomain(detectedStatementInfo?.bank)}?token=pk_Ub-Tj_SsTtmHJKOJa9lJSA`}
                alt={detectedStatementInfo.bank}
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Statement Loaded
                </span>
                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {detectedStatementInfo.fileName}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-100">
                {detectedStatementInfo.bank}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs">
                <p className="text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-400">Holder:</span>{" "}
                  <strong className="text-slate-200">
                    {detectedStatementInfo.accountHolder}
                  </strong>
                </p>
                <p className="text-slate-300 flex items-center gap-1.5 font-mono">
                  <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-400 font-sans">A/C:</span>{" "}
                  {detectedStatementInfo.accountNumber}
                </p>
                <p className="text-slate-300 flex items-center gap-1.5 sm:col-span-2 pt-0.5">
                  <Wallet className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-400">Type:</span>{" "}
                  {detectedStatementInfo.accountType}
                </p>
              </div>
            </div>
          </div>
          <div className="self-end md:self-center">
            <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full whitespace-nowrap">
              {detectedStatementInfo.totalTransactions} Txns Loaded
            </span>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-sky-500 bg-sky-500/10"
            : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <UploadCloud className="w-10 h-10 text-sky-400 animate-bounce" />
          <h3 className="text-base font-semibold text-slate-200">
            Drag & Drop Bank Statements (Auto-Detect Bank & A/C)
          </h3>
          <p className="text-xs text-slate-400">Supports PDF, CSV, Excel</p>
          {loading && (
            <p className="text-xs text-sky-400 font-medium animate-pulse">
              {statusMessage}
            </p>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
                <Lock className="w-4 h-4 text-sky-400" />
                <span>Password Protected PDF</span>
              </div>
              <button
                onClick={handlePasswordCancel}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              <strong className="text-slate-200">
                {passwordModal.fileName}
              </strong>{" "}
              is protected. {passwordModal.errorMsg}
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handlePasswordSubmit(e);
                  }
                }}
                placeholder="Enter PDF password"
                value={passwordModal.passwordInput}
                onChange={(e) =>
                  setPasswordModal((prev) => ({
                    ...prev,
                    passwordInput: e.target.value,
                  }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handlePasswordCancel}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium"
                >
                  Unlock & Parse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
