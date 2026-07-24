import React, { useRef, useState } from "react";
import { UploadCloud, Building2, Lock, X } from "lucide-react";
import { parseCSVFile } from "../utils/bankParser";
import { parsePDFFile } from "../utils/parsers/pdfParser";
import { useStatement } from "../context/StatementContext";

const SUPPORTED_BANKS = [
  { id: "icici", name: "ICICI Bank" },
  { id: "ippb", name: "India Post Payments Bank (IPPB)" },
  { id: "hdfc", name: "HDFC Bank" },
  { id: "sbi", name: "State Bank of India (SBI)" },
  { id: "axis", name: "Axis Bank" },
  { id: "pnb", name: "PNB Bank" },
];

export const FileDropzone = () => {
  const { addParsedData } = useStatement();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedBank, setSelectedBank] = useState("icici");
  const fileInputRef = useRef(null);

  // Modal State for Password Prompting
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
          setStatusMessage(`Parsing PDF: ${file.name}...`);

          // Pass the interactive modal trigger into parsePDFFile
          result = await parsePDFFile(file, selectedBank, (reasonText) =>
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

        let transactionsList = Array.isArray(result)
          ? result
          : result?.transactions || [];
        const detectedBank =
          SUPPORTED_BANKS.find((b) => b.id === selectedBank)?.name ||
          "ICICI Bank";

        if (transactionsList.length > 0) {
          addParsedData(file.name, detectedBank, transactionsList);
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

  return (
    <div className="w-full space-y-3">
      {/* Target Bank Dropdown */}
      <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 px-4 py-2.5 rounded-xl">
        <label
          htmlFor="bank-select"
          className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2"
        >
          <Building2 className="w-4 h-4 text-sky-400" />
          Target Bank Format:
        </label>
        <select
          id="bank-select"
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
        >
          {SUPPORTED_BANKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

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
              // Reset file input value so uploading the exact same file again triggers onChange
              e.target.value = "";
            }
          }}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <UploadCloud className="w-10 h-10 text-sky-400 animate-bounce" />
          <h3 className="text-base font-semibold text-slate-200">
            Drag & Drop Bank Statements (PDF, CSV, Excel)
          </h3>
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
