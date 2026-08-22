import React from "react";
import { useStatement } from "../context/StatementContext";
import { exportToCSV, exportToExcel, exportToJSON } from "../utils/exporter";
import { Download, FileSpreadsheet, FileCode, FileText } from "lucide-react";

export const ExportModal = () => {
  const { transactions, detectedStatementInfo } = useStatement();

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Export Parsed Analytics
          </h3>
          <p className="text-xs text-slate-400">
            Download transactions, summary sheets & party breakdown (
            {transactions.length} items)
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => exportToExcel(transactions, detectedStatementInfo)}
          disabled={!transactions.length}
          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel (.xlsx)</span>
        </button>

        <button
          onClick={() => exportToCSV(transactions)}
          disabled={!transactions.length}
          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>CSV</span>
        </button>

        <button
          onClick={() => exportToJSON(transactions)}
          disabled={!transactions.length}
          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          <FileCode className="w-4 h-4" />
          <span>JSON</span>
        </button>
      </div>
    </div>
  );
};
