"use client";

import { useState, useEffect } from "react";
import {
  Calculator,
  BookOpen,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Landmark,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import {
  getAccountingAccounts,
  getAccountingTransactions,
  createManualTransaction,
  deleteTransaction,
  AccountingAccount,
  AccountingTransaction
} from "@/features/accounting/services/accounting-service";

export default function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState<"ledger" | "coa" | "manual">("ledger");
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Search / Filters
  const [coaSearch, setCoaSearch] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Form State for Manual Transaction
  const [manualDescription, setManualDescription] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualEntries, setManualEntries] = useState<
    { account_code: string; debe: string; haber: string }[]
  >([
    { account_code: "", debe: "", haber: "" },
    { account_code: "", debe: "", haber: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Accounts
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    const res = await getAccountingAccounts();
    if (res.error) {
      toast.error(`Error al cargar plan de cuentas: ${res.error}`);
    } else {
      setAccounts(res.data);
    }
    setLoadingAccounts(false);
  };

  // Fetch Transactions
  const loadTransactions = async () => {
    setLoadingTransactions(true);
    const res = await getAccountingTransactions();
    if (res.error) {
      toast.error(`Error al cargar el Libro Diario: ${res.error}`);
    } else {
      setTransactions(res.data);
    }
    setLoadingTransactions(false);
  };

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, []);

  // Compute stats for Ledger Summary
  const totalDebeGlobal = transactions.reduce((sum, tx) => {
    const txSum = tx.accounting_entries?.reduce((s, e) => s + Number(e.debe || 0), 0) || 0;
    return sum + txSum;
  }, 0);

  const totalHaberGlobal = transactions.reduce((sum, tx) => {
    const txSum = tx.accounting_entries?.reduce((s, e) => s + Number(e.haber || 0), 0) || 0;
    return sum + txSum;
  }, 0);

  const totalDiffGlobal = Math.abs(totalDebeGlobal - totalHaberGlobal);

  // Filter accounts
  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.code.includes(coaSearch) ||
      acc.name.toLowerCase().includes(coaSearch.toLowerCase())
  );

  // Filter transactions
  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.id.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      tx.description.toLowerCase().includes(ledgerSearch.toLowerCase())
  );

  // Toggle transaction expansion
  const toggleTxExpanded = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  // Handle entries for manual form
  const addEntryRow = () => {
    setManualEntries([...manualEntries, { account_code: "", debe: "", haber: "" }]);
  };

  const removeEntryRow = (index: number) => {
    if (manualEntries.length <= 2) {
      toast.error("Un asiento contable debe tener al menos dos líneas.");
      return;
    }
    setManualEntries(manualEntries.filter((_, i) => i !== index));
  };

  const updateEntryRow = (
    index: number,
    field: "account_code" | "debe" | "haber",
    value: string
  ) => {
    const updated = [...manualEntries];
    
    if (field === "account_code") {
      updated[index].account_code = value;
    } else if (field === "debe") {
      updated[index].debe = value;
      // If debit is loaded, clear credit to preserve ledger row hygiene
      if (value !== "") updated[index].haber = "";
    } else if (field === "haber") {
      updated[index].haber = value;
      // If credit is loaded, clear debit
      if (value !== "") updated[index].debe = "";
    }

    setManualEntries(updated);
  };

  // Live balance calculations for manual form
  const formTotalDebe = manualEntries.reduce((sum, e) => sum + parseFloat(e.debe || "0"), 0);
  const formTotalHaber = manualEntries.reduce((sum, e) => sum + parseFloat(e.haber || "0"), 0);
  const formDifference = Math.abs(formTotalDebe - formTotalHaber);
  const isFormBalanced = formDifference < 0.01 && formTotalDebe > 0;

  // Handle submit manual transaction
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDescription.trim()) {
      toast.error("La descripción del asiento es obligatoria.");
      return;
    }

    // Verify all rows have an account
    const invalidRow = manualEntries.some((e) => !e.account_code);
    if (invalidRow) {
      toast.error("Todas las líneas de asiento deben tener una cuenta contable seleccionada.");
      return;
    }

    // Verify all rows have either a debit or credit greater than 0
    const zeroRow = manualEntries.some(
      (e) => !parseFloat(e.debe || "0") && !parseFloat(e.haber || "0")
    );
    if (zeroRow) {
      toast.error("Todas las líneas deben contener un importe en el Debe o en el Haber.");
      return;
    }

    if (!isFormBalanced) {
      toast.error("El asiento contable no está balanceado.");
      return;
    }

    setIsSubmitting(true);
    const parsedEntries = manualEntries.map((e) => ({
      account_code: e.account_code,
      debe: parseFloat(e.debe || "0"),
      haber: parseFloat(e.haber || "0")
    }));

    const res = await createManualTransaction(manualDescription, manualDate, parsedEntries);

    if (res.success) {
      toast.success("Asiento contable manual registrado correctamente.");
      setManualDescription("");
      setManualEntries([
        { account_code: "", debe: "", haber: "" },
        { account_code: "", debe: "", haber: "" }
      ]);
      loadTransactions();
      setActiveTab("ledger");
    } else {
      toast.error(`Error al registrar asiento: ${res.error}`);
    }
    setIsSubmitting(false);
  };

  // Handle delete transaction
  const handleDeleteTx = async (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar este asiento contable permanentemente?")) {
      const res = await deleteTransaction(id);
      if (res.success) {
        toast.success("Asiento contable eliminado con éxito.");
        loadTransactions();
      } else {
        toast.error(`No se pudo eliminar el asiento: ${res.error}`);
      }
    }
  };

  // Helper function to resolve indentation class based on account code depth
  const getCoaIndentation = (code: string) => {
    const dotsCount = (code.match(/\./g) || []).length;
    if (dotsCount === 0) return "pl-2 font-bold text-white text-base py-3 bg-zinc-900/40 border-b border-zinc-800/80 rounded-lg mt-3 first:mt-0";
    if (dotsCount === 1) return "pl-6 font-semibold text-zinc-200 text-sm py-2.5 mt-1";
    if (dotsCount === 2) return "pl-12 text-zinc-350 text-xs py-2 mt-0.5";
    return "pl-20 text-zinc-400 text-xs py-1.5 opacity-90 border-l border-amber-500/20 ml-6";
  };

  // Resolve visual color badge for account types
  const getAccountTypeStyles = (type: string) => {
    switch (type) {
      case "asset":
        return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
      case "liability":
        return "bg-rose-500/10 border-rose-500/25 text-rose-400";
      case "equity":
        return "bg-purple-500/10 border-purple-500/25 text-purple-400";
      case "revenue":
        return "bg-blue-500/10 border-blue-500/25 text-blue-400";
      case "expense":
        return "bg-amber-500/10 border-amber-500/25 text-amber-400";
      default:
        return "bg-zinc-500/10 border-zinc-500/25 text-zinc-400";
    }
  };

  // Resolve transaction status properties
  const getTransactionStatus = (tx: AccountingTransaction) => {
    const lines = tx.accounting_entries || [];
    if (lines.length === 0) {
      return { label: "Incompleto", color: "bg-red-500/10 border-red-500/20 text-red-400" };
    }
    const dSum = lines.reduce((s, e) => s + Number(e.debe || 0), 0);
    const hSum = lines.reduce((s, e) => s + Number(e.haber || 0), 0);
    const difference = Math.abs(dSum - hSum);
    
    if (difference > 0.05) {
      return { label: "Desbalanceado", color: "bg-orange-500/10 border-orange-500/20 text-orange-400" };
    }
    return { label: "Balanceado", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" };
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            Contabilidad y Finanzas
          </h1>
          <p className="text-sm text-zinc-400">Plan de cuentas unificado, Libro Diario balanceado y asientos manuales</p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "ledger"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Libro Diario
          </button>
          <button
            onClick={() => setActiveTab("coa")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "coa"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Plan de Cuentas
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "manual"
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Asiento
          </button>
        </div>
      </div>

      {/* Main content conditional view */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* LEDGER OVERVIEW SUMMARY CARDS */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md">
              <div className="text-zinc-400 text-xs font-semibold">Total Débito Acumulado (Debe)</div>
              <div className="text-xl font-black text-white mt-1">
                ${totalDebeGlobal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md">
              <div className="text-zinc-400 text-xs font-semibold">Total Crédito Acumulado (Haber)</div>
              <div className="text-xl font-black text-white mt-1">
                ${totalHaberGlobal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="text-zinc-400 text-xs font-semibold">Consistencia Contable (Diferencia)</div>
                <div className={`text-xl font-black mt-1 flex items-center gap-1.5 ${totalDiffGlobal < 0.05 ? "text-emerald-400" : "text-amber-500"}`}>
                  ${totalDiffGlobal.toFixed(2)}
                  {totalDiffGlobal < 0.05 && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
                </div>
              </div>
            </div>
          </div>

          {/* LEDGER FILTER SEARCH BAR */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar asientos por ID, concepto o cuenta..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/30 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
            <button
              onClick={() => { loadTransactions(); loadAccounts(); }}
              className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-all flex items-center justify-center"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTransactions ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>

          {/* BOOKKEEPING TRANSACTIONS LIST */}
          <div className="space-y-4">
            {loadingTransactions && transactions.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">Cargando Libro Diario...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 p-12 text-center text-zinc-500 text-sm">
                No se encontraron asientos contables registrados.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const status = getTransactionStatus(tx);
                const isExpanded = expandedTxId === tx.id;
                
                // Summarize total debt and credit for this transaction
                const txDebe = tx.accounting_entries?.reduce((s, e) => s + Number(e.debe || 0), 0) || 0;
                const txHaber = tx.accounting_entries?.reduce((s, e) => s + Number(e.haber || 0), 0) || 0;

                return (
                  <div
                    key={tx.id}
                    className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 overflow-hidden hover:border-zinc-700/60 transition-all"
                  >
                    {/* Header Row clickable */}
                    <div
                      onClick={() => toggleTxExpanded(tx.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/10 select-none"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xxs px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {tx.id}
                          </span>
                          <span className={`text-xxs px-2 py-0.5 rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">{tx.description}</h4>
                      </div>

                      <div className="flex items-center gap-6 justify-between md:justify-end">
                        <div className="flex gap-4 text-xxs font-mono text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            {new Date(tx.date).toLocaleDateString("es-AR")}
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-500">Monto:</span> ${txDebe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Trash button to delete transaction */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTx(tx.id);
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Eliminar asiento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Entries Panel */}
                    {isExpanded && (
                      <div className="border-t border-zinc-900 bg-zinc-900/10 px-4 py-3">
                        {!tx.accounting_entries || tx.accounting_entries.length === 0 ? (
                          <div className="text-center py-4 text-xs text-red-400 flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Este asiento está vacío. No posee líneas contables de Debe ni Haber.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xxs font-mono text-zinc-300">
                              <thead>
                                <tr className="border-b border-zinc-900 text-zinc-500 uppercase tracking-wider text-xxs">
                                  <th className="pb-2 font-semibold">Código</th>
                                  <th className="pb-2 font-semibold">Cuenta Contable</th>
                                  <th className="pb-2 font-semibold text-right pr-4">Debe</th>
                                  <th className="pb-2 font-semibold text-right">Haber</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tx.accounting_entries.map((entry) => (
                                  <tr key={entry.id} className="border-b border-zinc-900/40 last:border-0 hover:bg-zinc-900/5">
                                    <td className="py-2.5 text-zinc-400">{entry.account_code}</td>
                                    <td className="py-2.5 text-white font-medium">
                                      {entry.accounting_accounts?.name || "Cuenta no especificada"}
                                    </td>
                                    <td className="py-2.5 text-right text-emerald-400 pr-4 font-medium">
                                      {Number(entry.debe) > 0
                                        ? `$${Number(entry.debe).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                                        : "—"}
                                    </td>
                                    <td className="py-2.5 text-right text-amber-500 font-medium">
                                      {Number(entry.haber) > 0
                                        ? `$${Number(entry.haber).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                                {/* Total Row */}
                                <tr className="border-t border-zinc-800 font-bold bg-zinc-900/20">
                                  <td colSpan={2} className="py-2.5 text-right text-white uppercase tracking-wider pr-4">
                                    Totales:
                                  </td>
                                  <td className="py-2.5 text-right text-emerald-400 pr-4">
                                    ${txDebe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 text-right text-amber-500">
                                    ${txHaber.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "coa" && (
        <div className="space-y-6">
          {/* SEARCH BAR FOR COA */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar cuentas por código o nombre (Ej: 1.1.1.01)..."
              value={coaSearch}
              onChange={(e) => setCoaSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/30 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-all"
            />
          </div>

          {/* COA LIST (TREE STRUCTURE STYLE) */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/20 p-4 max-h-[600px] overflow-y-auto space-y-1.5 select-none scrollbar-thin">
            {loadingAccounts && accounts.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">Cargando Plan de Cuentas...</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">No se encontraron cuentas contables.</div>
            ) : (
              filteredAccounts.map((acc) => {
                const styles = getAccountTypeStyles(acc.type);
                const dotsCount = (acc.code.match(/\./g) || []).length;
                const isLeaf = dotsCount >= 3;

                return (
                  <div
                    key={acc.code}
                    className={`flex items-center justify-between gap-4 transition-all py-1 px-3 rounded-lg hover:bg-zinc-900/20 ${getCoaIndentation(
                      acc.code
                    )}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-500 tracking-wider font-semibold text-xxs">
                        {acc.code}
                      </span>
                      <span className="font-semibold text-xs tracking-wide">{acc.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${styles}`}>
                        {acc.type}
                      </span>
                      {isLeaf && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800/80 text-zinc-500 font-medium">
                          Imputable
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "manual" && (
        <form onSubmit={handleSubmitManual} className="space-y-6">
          {/* HEADER INPUTS FOR FORM */}
          <div className="grid gap-6 md:grid-cols-3 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-xl">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Concepto del Asiento</label>
              <input
                type="text"
                placeholder="Ej: Pago de servicio de luz mensual sucursal norte"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 transition-all font-semibold"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Fecha Contable</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white text-sm focus:outline-none focus:border-amber-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          {/* DYNAMIC ENTRIES LINES FORM GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Líneas de Asiento (Partida Doble)</h3>
              <button
                type="button"
                onClick={addEntryRow}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                Añadir Línea
              </button>
            </div>

            <div className="space-y-3">
              {manualEntries.map((entry, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row gap-3 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/20 items-end md:items-center justify-between"
                >
                  {/* Account Selector */}
                  <div className="w-full md:flex-1 space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      Línea {index + 1}: Cuenta Contable
                    </label>
                    <select
                      value={entry.account_code}
                      onChange={(e) => updateEntryRow(index, "account_code", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 text-xs focus:outline-none focus:border-amber-500 transition-all"
                      required
                    >
                      <option value="" disabled>Seleccione cuenta imputable...</option>
                      {accounts
                        // Show all accounts or prioritize leaves
                        .map((acc) => (
                          <option key={acc.code} value={acc.code} className="bg-zinc-950 py-1 font-mono">
                            {acc.code} — {acc.name} ({acc.type.toUpperCase()})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Debe */}
                  <div className="w-full md:w-36 space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wide">Debe ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={entry.debe}
                      onChange={(e) => updateEntryRow(index, "debe", e.target.value)}
                      disabled={entry.haber !== ""}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-emerald-400 placeholder-zinc-650 text-xs focus:outline-none focus:border-emerald-500 transition-all text-right font-mono"
                    />
                  </div>

                  {/* Haber */}
                  <div className="w-full md:w-36 space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-amber-550 uppercase tracking-wide">Haber ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={entry.haber}
                      onChange={(e) => updateEntryRow(index, "haber", e.target.value)}
                      disabled={entry.debe !== ""}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-amber-500 placeholder-zinc-650 text-xs focus:outline-none focus:border-amber-550 transition-all text-right font-mono"
                    />
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removeEntryRow(index)}
                    className="p-2 rounded-xl text-zinc-550 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent md:mt-5"
                    title="Eliminar fila"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM FORM BALANCING RUNNING TOTALS MONITOR */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 gap-4">
            <div className="flex flex-wrap gap-6 text-xs font-mono">
              <div>
                <span className="text-zinc-500">Total Debe:</span>{" "}
                <span className="text-emerald-400 font-bold">${formTotalDebe.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-zinc-500">Total Haber:</span>{" "}
                <span className="text-amber-500 font-bold">${formTotalHaber.toFixed(2)}</span>
              </div>
              <div className="border-l border-zinc-800 pl-6">
                <span className="text-zinc-550">Diferencia:</span>{" "}
                <span className={`font-bold ${formDifference < 0.01 ? "text-emerald-400" : "text-amber-500"}`}>
                  ${formDifference.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              {formTotalDebe > 0 && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                  isFormBalanced
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                }`}>
                  {isFormBalanced ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Balanceado
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Desbalanceado
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!isFormBalanced || isSubmitting}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isFormBalanced && !isSubmitting
                    ? "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20 hover:scale-[1.02]"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
                }`}
              >
                {isSubmitting ? "Registrando..." : "Registrar Asiento Manual"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
