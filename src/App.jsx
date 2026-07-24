import React from "react";
import { StatementProvider } from "./context/StatementContext";
import { FileDropzone } from "./components/FileDropzone";
import { KpiDashboard } from "./components/KpiDashboard";
import { FilterBar } from "./components/FilterBar";
import { DataGrid } from "./components/DataGrid";
import { AnalyticsCharts } from "./components/AnalyticsCharts";
import { ExportModal } from "./components/ExportModal";
import { Landmark, ShieldCheck } from "lucide-react";

export function AppContent() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Bank Statement Analyzer
            </h1>
            <p className="text-xs text-sky-400 font-medium">by Aruj Bansal</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-medium">
            100% Client-Side Privacy Guaranteed
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <FileDropzone />
        <ExportModal />
        <KpiDashboard />
        <FilterBar />
        <AnalyticsCharts />
        <DataGrid />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Bank Statement Analyzer by Aruj Bansal • Engineered for High-Performance
        Multi-Bank Parsing
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StatementProvider>
      <AppContent />
    </StatementProvider>
  );
}
