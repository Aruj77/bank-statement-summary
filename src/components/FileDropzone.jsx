import React, { useRef, useState } from "react";
import {
  UploadCloud,
  Lock,
  X,
  Building2,
  CreditCard,
  User,
  Wallet,
  Calendar,
  IndianRupee,
  MapPin,
  FileText,
  Hash,
  Landmark,
} from "lucide-react";
import { parseCSVFile } from "../utils/bankParser";
import { parsePDFFile } from "../utils/parsers/pdfParser";
import { useStatement } from "../context/StatementContext";

export const FileDropzone = () => {
  const {
    setParsedData,
    clearAll,
    detectedStatementInfo,
    setDetectedStatementInfo,
  } = useStatement();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef(null);

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
    if (!files || files.length === 0) return;

    clearAll();
    setLoading(true);
    setStatusMessage("Processing file & extracting metadata...");

    const file = files[0];
    const fileName = file.name.toLowerCase();

    try {
      let result = null;

      if (fileName.endsWith(".pdf")) {
        setStatusMessage(`Parsing PDF & Metadata: ${file.name}...`);
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

      const transactionsList =
        result?.transactions || (Array.isArray(result) ? result : []);
      const bankName =
        result?.bankName ||
        (result?.bank ? `${result.bank} Bank` : "Detected Bank");
      const accountNumber = result?.accountNumber || null;

      const descriptiveIdentifier =
        `${bankName} ${accountNumber ? `A/C: ${accountNumber}` : ""}`.trim();

      if (transactionsList.length > 0) {
        const infoObj = {
          fileName: file.name,
          bankName,
          accountNumber,
          accountHolder: result?.accountHolder || null,
          accountType: result?.accountType || null,
          ifscCode: result?.ifscCode || null,
          micrCode: result?.micrCode || null,
          branch: result?.branch || null,
          address: result?.address || null,
          panNumber: result?.panNumber || null,
          cifNumber: result?.cifNumber || null,
          statementPeriod: result?.statementPeriod || null,
          openingBalance: result?.openingBalance || null,
          closingBalance: result?.closingBalance || null,
          totalTransactions: transactionsList.length,
        };

        setDetectedStatementInfo(infoObj);
        setParsedData(
          file.name,
          descriptiveIdentifier,
          transactionsList,
          infoObj,
        );
      } else {
        throw new Error("No transactions were found or extracted.");
      }
    } catch (err) {
      if (err.message !== "PASSWORD_CANCELLED") {
        alert(`Could not parse ${file.name}.\n\nError: ${err.message}`);
      }
    }

    setLoading(false);
    setStatusMessage("");
  };

  const getLogoDomain = (bankName) => {
    if (!bankName) return "bank.com";
    const cleanName = bankName.toLowerCase().replace(/bank/g, "").trim();

    if (cleanName.includes("post payments") || cleanName.includes("ippb"))
      return "ippbonline.com";
    if (cleanName.includes("punjab national") || cleanName.includes("pnb"))
      return "pnb.bank.in";
    if (
      cleanName.includes("sbi") ||
      cleanName.includes("state of india") ||
      cleanName.includes("state bank")
    )
      return "sbi.co.in";
    if (cleanName.includes("hdfc")) return "hdfcbank.com";
    if (cleanName.includes("icici")) return "icicibank.com";
    if (cleanName.includes("axis")) return "axisbank.com";
    if (cleanName.includes("kotak")) return "kotak.com";
    if (cleanName.includes("canara")) return "canarabank.com";
    if (cleanName.includes("union of india") || cleanName.includes("union"))
      return "unionbankofindia.co.in";
    if (cleanName.includes("baroda") || cleanName.includes("bob"))
      return "bankofbaroda.in";
    if (cleanName.includes("indusind")) return "indusind.com";
    if (cleanName.includes("yes")) return "yesbank.in";
    if (cleanName.includes("idbi")) return "idbibank.in";

    if (cleanName.includes("chase")) return "chase.com";
    if (cleanName.includes("citi")) return "citi.com";
    if (cleanName.includes("wells fargo")) return "wellsfargo.com";
    if (cleanName.includes("of america") || cleanName.includes("bofa"))
      return "bankofamerica.com";

    return `${cleanName.replace(/\s+/g, "")}.com`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Detected Bank Details Card */}
      {detectedStatementInfo && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-xl p-5 shadow-lg flex flex-col gap-4 text-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
                <img
                  src={`https://img.logo.dev/${getLogoDomain(detectedStatementInfo.bankName)}?token=pk_Ub-Tj_SsTtmHJKOJa9lJSA`}
                  alt={detectedStatementInfo.bankName}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">
                    Statement Loaded
                  </span>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {detectedStatementInfo.fileName}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-100">
                  {detectedStatementInfo.bankName}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full whitespace-nowrap">
                {detectedStatementInfo.totalTransactions} Txns Loaded
              </span>
            </div>
          </div>

          {/* Conditional Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 text-xs">
            {detectedStatementInfo.accountHolder && (
              <p className="text-slate-300 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400">Holder:</span>
                <strong className="text-slate-200 truncate">
                  {detectedStatementInfo.accountHolder}
                </strong>
              </p>
            )}

            {detectedStatementInfo.accountNumber && (
              <p className="text-slate-300 flex items-center gap-2 font-mono">
                <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400 font-sans">A/C:</span>
                <span className="text-slate-200 font-semibold">
                  {detectedStatementInfo.accountNumber}
                </span>
              </p>
            )}

            {detectedStatementInfo.accountType && (
              <p className="text-slate-300 flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400">Type:</span>
                <span className="text-slate-200">
                  {detectedStatementInfo.accountType}
                </span>
              </p>
            )}

            {detectedStatementInfo.ifscCode && (
              <p className="text-slate-300 flex items-center gap-2 font-mono">
                <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400 font-sans">IFSC:</span>
                <span className="text-slate-200">
                  {detectedStatementInfo.ifscCode}
                </span>
              </p>
            )}

            {detectedStatementInfo.micrCode && (
              <p className="text-slate-300 flex items-center gap-2 font-mono">
                <Hash className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400 font-sans">MICR:</span>
                <span className="text-slate-200">
                  {detectedStatementInfo.micrCode}
                </span>
              </p>
            )}

            {detectedStatementInfo.cifNumber && (
              <p className="text-slate-300 flex items-center gap-2 font-mono">
                <Landmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400 font-sans">CIF/CRN:</span>
                <span className="text-slate-200">
                  {detectedStatementInfo.cifNumber}
                </span>
              </p>
            )}

            {detectedStatementInfo.panNumber && (
              <p className="text-slate-300 flex items-center gap-2 font-mono">
                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400 font-sans">PAN:</span>
                <span className="text-slate-200">
                  {detectedStatementInfo.panNumber}
                </span>
              </p>
            )}

            {detectedStatementInfo.branch && (
              <p className="text-slate-300 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400">Branch:</span>
                <span className="text-slate-200 truncate">
                  {detectedStatementInfo.branch}
                </span>
              </p>
            )}

            {(detectedStatementInfo.statementPeriod?.startDate ||
              detectedStatementInfo.statementPeriod?.endDate) && (
              <p className="text-slate-300 flex items-center gap-2 sm:col-span-2">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-400">Period:</span>
                <span className="text-slate-200">
                  {detectedStatementInfo.statementPeriod.startDate || "N/A"} -{" "}
                  {detectedStatementInfo.statementPeriod.endDate || "N/A"}
                </span>
              </p>
            )}

            {detectedStatementInfo.address && (
              <p className="text-slate-300 flex items-start gap-2 sm:col-span-2 lg:col-span-3">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-400 shrink-0">Address:</span>
                <span className="text-slate-200">
                  {detectedStatementInfo.address}
                </span>
              </p>
            )}

            {(detectedStatementInfo.openingBalance ||
              detectedStatementInfo.closingBalance) && (
              <div className="sm:col-span-2 lg:col-span-3 pt-2 mt-1 border-t border-slate-800/80 flex flex-wrap gap-4 text-xs">
                {detectedStatementInfo.openingBalance && (
                  <span className="text-slate-400 flex items-center gap-1 font-mono">
                    <IndianRupee className="w-3.5 h-3.5 text-sky-400 font-sans" />
                    <span className="font-sans">Opening:</span>{" "}
                    <strong className="text-slate-200">
                      {detectedStatementInfo.openingBalance}
                    </strong>
                  </span>
                )}
                {detectedStatementInfo.closingBalance && (
                  <span className="text-slate-400 flex items-center gap-1 font-mono">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-400 font-sans" />
                    <span className="font-sans">Closing:</span>{" "}
                    <strong className="text-emerald-400">
                      {detectedStatementInfo.closingBalance}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dropzone Area */}
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
