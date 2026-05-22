"use client";

import React, { useEffect, useState } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Sparkles,
  AlertCircle,
  Car,
  Check,
  TrendingUp,
  Users,
  FileText,
  FileCheck2,
  Building,
  Loader2,
  Coins,
  ChevronRight,
  Info,
  Building2,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  X,
  CreditCard,
  Wallet,
  Landmark,
  Handshake
} from "lucide-react";
import { toast } from "sonner";
import { useCompanyStore } from "@/core/company/company-store";
import { useSalesStore, CartItem } from "@/features/sales/store/use-sales-store";
import { getSupabaseClient } from "@/core/api/supabase";
import { ClientSelector } from "@/features/sales/components/client-selector";
import { getCreditAccount } from "@/features/customers/services/credit-service";
import { useRouter } from "next/navigation";
import { authorizeInvoice } from "@/features/arca/services/arca-service";

// Database Article interface
interface DbArticle {
  id: string;
  codigo_fabricante: string;
  codigo_barras: string | null;
  descripcion: string;
  marca_id: string;
  familia_id: string;
  precio_costo: string | number;
  precio_minorista: string | number;
  precio_mayorista: string | number;
  stock_actual: number;
  stock_minimo: number;
  ubicacion_deposito: string | null;
  marca: { nombre: string } | null;
  familia: { nombre: string } | null;
}

// Vehicle compatibility interface
interface Compatibility {
  observaciones: string | null;
  auto_version: {
    motorizacion: string;
    anio_desde: number;
    anio_hasta: number | null;
    auto_modelo: {
      nombre: string;
      auto_marca: {
        nombre: string;
      };
    };
  } | null;
}

export default function VentasPage() {
  const router = useRouter();
  const activeCompany = useCompanyStore((state) => state.currentCompany);
  const salesStore = useSalesStore();

  // Component local states
  const [articles, setArticles] = useState<DbArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [families, setFamilies] = useState<string[]>([]);

  // Dynamic compatibility loading
  const [loadingCompat, setLoadingCompat] = useState<string | null>(null);
  const [compatData, setCompatData] = useState<{ [articleId: string]: Compatibility[] }>({});
  const [activeCompatArticle, setActiveCompatArticle] = useState<string | null>(null);
  const [hoveredArticleId, setHoveredArticleId] = useState<string | null>(null);

  // checkout AFIP status
  const [afipStatus, setAfipStatus] = useState<string | null>(null);

  // Load articles from database
  const loadCatalog = async () => {
    setLoadingArticles(true);
    try {
      const client = getSupabaseClient();

      // Fetch articles with marca and familia relations
      const { data, error } = await client.database
        .from("articulo")
        .select(`
          *,
          marca:marca_id(nombre),
          familia:familia_id(nombre)
        `)
        .order("descripcion", { ascending: true });

      if (error) throw error;

      const loadedArticles = (data as any[]) || [];
      setArticles(loadedArticles);

      // Extract unique families for quick filter
      const famNames: string[] = Array.from(
        new Set(
          loadedArticles
            .map((art) => art.familia?.nombre)
            .filter((name): name is string => !!name)
        )
      );
      setFamilies(famNames);
    } catch (err: any) {
      console.error("Error loading catalog:", err);
      toast.error("No se pudo cargar el catálogo de repuestos.");
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    // Initialize default client
    salesStore.clearSales();
  }, [activeCompany]);

  // Handle hotkey F9 to confirm invoice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [salesStore.cart, salesStore.clientCuit, salesStore.clientName, activeCompany]);

  // Load compatibility on demand
  const handleLoadCompatibility = async (articleId: string) => {
    if (compatData[articleId]) {
      setActiveCompatArticle(articleId);
      return;
    }
    setLoadingCompat(articleId);
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.database
        .from("articulo_compatibilidad")
        .select(`
          observaciones,
          auto_version:auto_version_id (
            motorizacion,
            anio_desde,
            anio_hasta,
            auto_modelo:modelo_id (
              nombre,
              auto_marca:marca_id (
                nombre
              )
            )
          )
        `)
        .eq("articulo_id", articleId);

      if (error) throw error;

      setCompatData(prev => ({ ...prev, [articleId]: (data as any[]) || [] }));
      setActiveCompatArticle(articleId);
    } catch (err) {
      console.error("Error loading compatibility data:", err);
      toast.error("No se pudieron cargar las compatibilidades.");
    } finally {
      setLoadingCompat(null);
    }
  };

  // Cart financial math computations
  const calculateCartTotals = () => {
    let subtotalNeto = 0;
    let totalIva = 0;
    let totalAmount = 0;

    salesStore.cart.forEach((item) => {
      const lineTotal = item.cantidad * item.precio_unitario;
      // En Argentina, los precios del catálogo autopartista suelen listarse con IVA final.
      // Hacemos el cálculo hacia atrás para discriminar Neto e IVA.
      const factorIva = 1 + (item.alicuota_iva / 100);
      const lineNeto = lineTotal / factorIva;
      const lineIva = lineTotal - lineNeto;

      subtotalNeto += lineNeto;
      totalIva += lineIva;
      totalAmount += lineTotal;
    });

    return {
      subtotalNeto,
      totalIva,
      totalAmount
    };
  };

  const { subtotalNeto, totalIva, totalAmount } = calculateCartTotals();

  // Checkout process with stock decrements and official AFIP auth simulations
  const handleCheckout = async () => {
    if (!activeCompany) {
      toast.error("Debe iniciar sesión en una empresa (CUIT) para facturar.");
      return;
    }
    if (salesStore.cart.length === 0) {
      toast.error("El carrito está vacío. Cargue artículos antes de cobrar.");
      return;
    }
    if (!salesStore.clientCuit || salesStore.clientCuit.trim().length < 6) {
      toast.error("Seleccione un cliente válido.");
      return;
    }
    if (!salesStore.clientName || salesStore.clientName.trim().length === 0) {
      toast.error("Seleccione un cliente válido.");
      return;
    }

    // Gate 1: Prevent Cuenta Corriente for Consumidor Final
    if (salesStore.paymentMethod === "cuenta_corriente" && salesStore.clientCuit === "99999999999") {
      toast.error("La opción de Cuenta Corriente no está disponible para Consumidor Final.");
      return;
    }

    const client = getSupabaseClient();

    // Gate 2: Validate active Cash Drawer shift for Cash sales
    let openSession: any = null;
    if (salesStore.paymentMethod === "efectivo") {
      setAfipStatus("Verificando estado de la Caja Diaria...");

      const { data: sessionData, error: sessionErr } = await client.database
        .from("caja_sesion")
        .select("*")
        .eq("cuit", activeCompany.cuit)
        .eq("estado", "abierta")
        .maybeSingle();

      if (sessionErr) {
        toast.error(`Error al validar la caja diaria: ${sessionErr.message}`);
        setAfipStatus(null);
        return;
      }

      if (!sessionData) {
        toast.error("Debe abrir la Caja Diaria para este CUIT antes de registrar ventas en Efectivo.");
        setAfipStatus(null);
        return;
      }
      openSession = sessionData;
    }

    // Gate 3: Cuenta Corriente (Credit Limit & Enable checks)
    let ccAccount: any = null;
    if (salesStore.paymentMethod === "cuenta_corriente") {
      setAfipStatus("Verificando Cuenta Corriente del cliente...");
      let dbCustomer = salesStore.customers.find(c => c.cuit === salesStore.clientCuit);
      if (!dbCustomer) {
        // Fallback: try to fetch directly from DB to handle fresh registrations
        const { data: fetchedCust, error: custFetchErr } = await client.database
          .from("customers")
          .select("*")
          .eq("cuit", salesStore.clientCuit)
          .maybeSingle();

        if (custFetchErr || !fetchedCust) {
          toast.error("El cliente seleccionado no existe en la base de datos o no es válido para Cuenta Corriente.");
          setAfipStatus(null);
          return;
        }
        dbCustomer = fetchedCust;
      }

      const { data: accData, error: ccErr } = await getCreditAccount(dbCustomer.id, activeCompany.cuit);
      if (ccErr || !accData) {
        toast.error(`Error al verificar la Cuenta Corriente: ${ccErr || "No se encontró la cuenta."}`);
        setAfipStatus(null);
        return;
      }

      if (!accData.tiene_cuenta_corriente) {
        toast.error("La Cuenta Corriente de este cliente no está habilitada.");
        setAfipStatus(null);
        return;
      }

      const nuevoSaldoTeorico = Number(accData.saldo_actual) + totalAmount;
      if (nuevoSaldoTeorico > Number(accData.limite_credito)) {
        const disponible = Number(accData.limite_credito) - Number(accData.saldo_actual);
        toast.error(`Límite de crédito excedido. Disponible: $${disponible.toFixed(2)}. Total compra: $${totalAmount.toFixed(2)}.`);
        setAfipStatus(null);
        return;
      }

      ccAccount = accData;
    }

    setAfipStatus("Estableciendo conexión segura con Servidores AFIP...");

    try {
      // Compilar alícuotas del IVA detalladas agrupando por tasa
      const ivaMap = new Map<number, { base_imp: number; importe: number }>();
      salesStore.cart.forEach((item) => {
        const lineTotal = item.cantidad * item.precio_unitario;
        const factorIva = 1 + (item.alicuota_iva / 100);
        const lineNeto = lineTotal / factorIva;
        const lineIva = lineTotal - lineNeto;

        const alicuotaId = item.alicuota_iva === 10.5 ? 4 : 5; // 4 = 10.5%, 5 = 21% ante AFIP
        const existing = ivaMap.get(alicuotaId) || { base_imp: 0, importe: 0 };

        ivaMap.set(alicuotaId, {
          base_imp: existing.base_imp + lineNeto,
          importe: existing.importe + lineIva
        });
      });

      const ivaAlicuotas = Array.from(ivaMap.entries()).map(([id, val]) => ({
        id,
        base_imp: parseFloat(val.base_imp.toFixed(2)),
        importe: parseFloat(val.importe.toFixed(2))
      }));

      const tipoCbte = salesStore.voucherType.includes("Factura A") ? 1 : 6;
      let docTipo = 99;
      let docNro = "0";

      if (salesStore.clientCuit && salesStore.clientCuit !== "99999999999") {
        docTipo = salesStore.clientCuit.length === 11 ? 80 : 96;
        docNro = salesStore.clientCuit.replace(/\D/g, "");
      }

      setAfipStatus("Transmitiendo datos a servidores fiscales de ARCA...");

      // Invocar el adaptador fiscal dinámico
      const arcaRes = await authorizeInvoice(
        {
          tipo_cbte: tipoCbte,
          punto_venta: activeCompany.punto_venta || 1,
          doc_tipo: docTipo,
          doc_nro: docNro,
          imp_neto: parseFloat(subtotalNeto.toFixed(2)),
          imp_iva: parseFloat(totalIva.toFixed(2)),
          imp_total: parseFloat(totalAmount.toFixed(2)),
          iva_alicuotas: ivaAlicuotas
        },
        activeCompany.cuit
      );

      if (!arcaRes.success) {
        throw new Error(arcaRes.error || "Falla al autorizar comprobante ante ARCA (AFIP).");
      }

      // Generate invoice metadata using real incremental response index
      const formattedInvoiceNumber = `000${activeCompany.punto_venta || 1}-${arcaRes.cbte_nro.toString().padStart(8, "0")}`;
      const caeNumber = arcaRes.cae;
      const formattedExpDate = new Date(arcaRes.cae_vencimiento).toLocaleDateString("es-AR");
      const qrLink = arcaRes.qr_url;

      // Step 2: Atomic Decrement of Stock in database
      setAfipStatus("Actualizando existencias físicas en inventario...");

      for (const item of salesStore.cart) {
        // Encontrar artículo en catálogo local para saber stock
        const catalogArt = articles.find(a => a.id === item.id);
        if (catalogArt) {
          const currentStock = catalogArt.stock_actual;
          const newStock = Math.max(0, currentStock - item.cantidad);

          const { error: stockErr } = await client.database
            .from("articulo")
            .update({ stock_actual: newStock })
            .eq("id", item.id);

          if (stockErr) throw stockErr;
        }
      }

      // Step 3: Insert Voucher into afip_vouchers database table
      setAfipStatus("Guardando registro inmutable fiscal...");
      const newVoucher = {
        id: formattedInvoiceNumber,
        type: salesStore.voucherType,
        company_cuit: activeCompany.cuit,
        client_cuit: salesStore.clientCuit.trim(),
        client_name: salesStore.clientName.trim(),
        net_amount: parseFloat(subtotalNeto.toFixed(2)),
        iva_amount: parseFloat(totalIva.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
        cae: caeNumber.toString(),
        cae_expiration: formattedExpDate,
        qr_link: qrLink,
        items: JSON.stringify(salesStore.cart)
      };

      const { error: voucherErr } = await client.database
        .from("afip_vouchers")
        .insert([newVoucher]);

      if (voucherErr) throw voucherErr;

      // Resilient Post-Fiscal Ledger and Accounts updates (fault-tolerant Saga pattern)
      try {
        // Step 4: Automate Double-Entry Ledger Bookings
        setAfipStatus("Registrando asiento contable de venta...");

        const txId = `TX-VENTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const conceptoVenta = `Venta POS — Comprobante: ${formattedInvoiceNumber} — Cliente: ${salesStore.clientName.trim()}`;

        let cuentaActivo = "1.1.1.01"; // Cash (Caja General)
        if (salesStore.paymentMethod === "tarjeta" || salesStore.paymentMethod === "transferencia") {
          cuentaActivo = "1.1.1.02"; // Bank account
        } else if (salesStore.paymentMethod === "cuenta_corriente") {
          cuentaActivo = "1.1.3.01"; // Receivable
        }

        const netoVal = parseFloat(subtotalNeto.toFixed(2));
        const ivaVal = parseFloat(totalIva.toFixed(2));
        const totalVal = parseFloat(totalAmount.toFixed(2));

        // Guard: Assert double-entry balance
        const debeTotal = totalVal;
        const haberTotal = parseFloat((netoVal + ivaVal).toFixed(2));
        if (Math.abs(debeTotal - haberTotal) > 0.05) {
          throw new Error(`Inconsistencia contable detectada: Debe (${debeTotal}) no coincide con Haber (${haberTotal}).`);
        }

        // Insert transaction header
        const { error: txErr } = await client.database
          .from("accounting_transactions")
          .insert([{
            id: txId,
            date: new Date().toISOString(),
            description: conceptoVenta
          }]);

        if (txErr) throw new Error(`No se pudo crear la cabecera contable: ${txErr.message}`);

        // Insert ledger entries
        const entries = [
          {
            transaction_id: txId,
            account_code: cuentaActivo,
            debe: totalVal,
            haber: 0.00
          },
          {
            transaction_id: txId,
            account_code: "4.1.1.01", // Sales revenue
            debe: 0.00,
            haber: netoVal
          }
        ];

        if (ivaVal > 0) {
          entries.push({
            transaction_id: txId,
            account_code: "2.1.3.01", // VAT tax liability
            debe: 0.00,
            haber: ivaVal
          });
        }

        const { error: entriesErr } = await client.database
          .from("accounting_entries")
          .insert(entries);

        if (entriesErr) throw new Error(`No se pudieron crear los asientos de partida doble: ${entriesErr.message}`);

        // Step 5: Daily Cash movement updates
        if (salesStore.paymentMethod === "efectivo" && openSession) {
          setAfipStatus("Registrando movimiento en Caja Diaria...");

          // Log movement
          const { error: movErr } = await client.database
            .from("caja_movimiento")
            .insert([{
              sesion_id: openSession.id,
              tipo: "ingreso",
              monto: totalVal,
              concepto: conceptoVenta,
              accounting_transaction_id: txId
            }]);

          if (movErr) throw new Error(`No se pudo registrar el movimiento de caja: ${movErr.message}`);

          // Update theoretical drawer balance
          const nuevoTeorico = parseFloat((Number(openSession.monto_teorico) + totalVal).toFixed(2));
          const { error: sesionUpdateErr } = await client.database
            .from("caja_sesion")
            .update({ monto_teorico: nuevoTeorico })
            .eq("id", openSession.id);

          if (sesionUpdateErr) throw new Error(`No se pudo actualizar el balance de caja: ${sesionUpdateErr.message}`);
        }

        // Step 6: Customer Credit Account updates for Cuenta Corriente sales
        if (salesStore.paymentMethod === "cuenta_corriente" && ccAccount) {
          setAfipStatus("Actualizando Cuenta Corriente del cliente...");
          const nuevoSaldo = parseFloat((Number(ccAccount.saldo_actual) + totalVal).toFixed(2));

          const { error: ccUpdateErr } = await client.database
            .from("customer_credit_accounts")
            .update({
              saldo_actual: nuevoSaldo,
              updated_at: new Date().toISOString()
            })
            .eq("id", ccAccount.id);

          if (ccUpdateErr) throw new Error(`No se pudo actualizar el saldo de la Cuenta Corriente: ${ccUpdateErr.message}`);

          // Log debit movement
          const { error: movementErr } = await client.database
            .from("customer_credit_movements")
            .insert([
              {
                id: crypto.randomUUID(),
                credit_account_id: ccAccount.id,
                type: "debito",
                amount: totalVal,
                description: `Compra POS — Factura ${formattedInvoiceNumber}`,
                accounting_transaction_id: txId,
              }
            ]);

          if (movementErr) throw new Error(`No se pudo registrar el historial de la Cuenta Corriente: ${movementErr.message}`);
        }
      } catch (ledgerErr: any) {
        console.error("Non-blocking failure during post-fiscal ledger updates:", ledgerErr);
        toast.warning(`Comprobante fiscal emitido con éxito, pero ocurrió un problema al registrar la contabilidad automáticamente: ${ledgerErr.message || ledgerErr}. Registre el asiento manual de ser necesario.`);
      }

      // Successful completion
      toast.success(`Factura ${formattedInvoiceNumber} autorizada con éxito. CAE: ${caeNumber}`);

      // Clean up sales state
      salesStore.clearSales();

      // Reload catalog to reflect new stock levels
      loadCatalog();

      // Redirect to invoice page or show success
      router.push("/protected/facturas");
    } catch (err: any) {
      console.error("Critical failure during invoicing transactional checkout:", err?.message || err);
      toast.error(`La transacción falló: ${err.message || "Consulte soporte de base de datos"}`);
    } finally {
      setAfipStatus(null);
    }
  };

  // Filter and search logic for the catalog items list
  const filteredArticles = articles.filter((art) => {
    const matchesSearch =
      art.codigo_fabricante.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.marca?.nombre && art.marca.nombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (art.codigo_barras && art.codigo_barras.includes(searchQuery));

    const matchesFamily = selectedFamily === "all" || art.familia?.nombre === selectedFamily;

    return matchesSearch && matchesFamily;
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <ShoppingCart className="w-8 h-8 text-amber-400" />
            <span>Facturación de Ventas (Punto de Venta)</span>
          </h1>
          <p className="text-sm text-zinc-400">
            Terminal POS rápida de alta densidad para mostrador. Búsqueda inteligente de repuestos, stock atómico y AFIP.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl text-xs font-mono text-zinc-400">
          <Building className="w-4 h-4 text-amber-400" />
          <span>Empresa: {activeCompany?.nombre_fantasia || activeCompany?.razon_social}</span>
          <span className="text-zinc-600">|</span>
          <span>Punto de Venta: {activeCompany?.punto_venta || 1}</span>
        </div>
      </div>

      {/* 2. Main Double-Panel Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ==================== LEFT PANEL (60%): PRODUCT SEARCH & CATALOG ==================== */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4 backdrop-blur-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-500" />
              <span>Buscador de Repuestos y Catálogo</span>
            </h2>

            {/* Catalog search bar and filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por Descripción, Código de Fabricante o Marca..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-zinc-800 text-zinc-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/40 transition-colors cursor-pointer shrink-0"
              >
                <option value="all">Todas las Familias</option>
                {families.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Articles Catalog List */}
            {loadingArticles ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                <p className="text-xs text-zinc-500">Cargando catálogo del mostrador...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-zinc-800 rounded-xl space-y-2">
                <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-zinc-400">No se encontraron artículos</p>
                <p className="text-xs text-zinc-500">Probá modificando el término de búsqueda o la familia.</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredArticles.map((art) => {
                  const isInCart = salesStore.cart.find((i) => i.id === art.id);
                  const isLowStock = art.stock_actual <= art.stock_minimo;

                  return (
                    <div
                      key={art.id}
                      className={`p-4 rounded-xl border transition-all duration-200 relative group bg-zinc-950/40 hover:bg-zinc-900/30 ${isInCart
                        ? "border-amber-500/30 shadow-md shadow-amber-500/5 bg-zinc-900/20"
                        : "border-zinc-850 hover:border-zinc-800"
                        }`}
                    >
                      {/* Aura subtle gradient */}
                      <div className="absolute -inset-px bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" />

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
                        {/* Article Info */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                              {art.codigo_fabricante}
                            </span>
                            {art.marca && (
                              <span className="text-[10px] font-semibold bg-amber-500/5 text-amber-400 px-2 py-0.5 rounded border border-amber-500/10">
                                {art.marca.nombre}
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest font-mono">
                              {art.familia?.nombre || "Autoparte"}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-white tracking-wide leading-snug">
                            {art.descripcion}
                          </h3>

                          <div className="flex items-center gap-4 pt-1 flex-wrap">
                            {/* Stock Badge */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${art.stock_actual === 0
                              ? "text-red-500"
                              : isLowStock
                                ? "text-yellow-500 animate-pulse"
                                : "text-emerald-500"
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${art.stock_actual === 0
                                ? "bg-red-500"
                                : isLowStock
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                                }`} />
                              Stock: {art.stock_actual} unidades
                            </span>

                            {art.ubicacion_deposito && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Locación: {art.ubicacion_deposito}
                              </span>
                            )}

                            {/* Popover de compatibilidad de vehículos — click-only */}
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hoveredArticleId === art.id) {
                                    setHoveredArticleId(null);
                                  } else {
                                    setHoveredArticleId(art.id);
                                    handleLoadCompatibility(art.id);
                                  }
                                }}
                                className={`flex items-center justify-center p-1 rounded-lg border transition duration-200 ${hoveredArticleId === art.id
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                                  : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400"
                                  }`}
                                title="Ver vehículos compatibles"
                              >
                                {loadingCompat === art.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                ) : (
                                  <Car className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {hoveredArticleId === art.id && (
                                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] w-72 p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/85 backdrop-blur-md animate-fade-in text-left">
                                  <div className="flex items-center gap-1.5 border-b border-zinc-850 pb-2 mb-2">
                                    <Car className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">Compatibilidad de Vehículos</span>
                                  </div>

                                  {loadingCompat === art.id ? (
                                    <div className="py-6 text-center space-y-2">
                                      <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto" />
                                      <p className="text-[9px] text-zinc-500 font-mono">Buscando motorizaciones...</p>
                                    </div>
                                  ) : !compatData[art.id] || compatData[art.id].length === 0 ? (
                                    <p className="text-[10px] text-zinc-500 italic py-1 text-center">
                                      Compatibilidad general / universal.
                                    </p>
                                  ) : (
                                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                      {compatData[art.id].map((compat, idx) => {
                                        const version = compat.auto_version;
                                        if (!version) return null;
                                        return (
                                          <div
                                            key={idx}
                                            className="p-2 rounded-lg bg-zinc-900 border border-zinc-850/80 text-[10px] space-y-0.5"
                                          >
                                            <div className="flex justify-between items-start gap-1">
                                              <span className="font-bold text-white leading-tight">
                                                {version.auto_modelo?.auto_marca?.nombre} {version.auto_modelo?.nombre}
                                              </span>
                                              <span className="text-[8px] bg-zinc-800 border border-zinc-700 px-1 py-0.2 rounded font-mono text-zinc-400 font-bold shrink-0">
                                                {version.anio_desde} - {version.anio_hasta || "Act"}
                                              </span>
                                            </div>
                                            <p className="text-zinc-400 font-mono text-[9px]">
                                              Motor: {version.motorizacion}
                                            </p>
                                            {compat.observaciones && (
                                              <p className="text-amber-500/80 italic font-mono text-[8px] leading-tight pt-0.5">
                                                Nota: {compat.observaciones}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Prices & Add Buttons */}
                        <div className="flex flex-col xs:flex-row sm:flex-col gap-2 justify-center shrink-0">
                          {/* Retail Price Button */}
                          <button
                            onClick={() => salesStore.addItem(art as any, "minorista")}
                            disabled={art.stock_actual === 0}
                            className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-40 transition-all flex items-center justify-between sm:justify-start gap-3 duration-250 hover:scale-[1.02]"
                          >
                            <div className="text-left">
                              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">P. Minorista</p>
                              <p className="text-xs font-black text-white font-mono">${parseFloat(String(art.precio_minorista)).toFixed(2)}</p>
                            </div>
                            <div className="p-1 rounded-lg bg-zinc-950 text-zinc-400 hover:text-white">
                              <Plus className="w-3 h-3" />
                            </div>
                          </button>

                          {/* Wholesale Price Button */}
                          <button
                            onClick={() => salesStore.addItem(art as any, "mayorista")}
                            disabled={art.stock_actual === 0}
                            className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-40 transition-all flex items-center justify-between sm:justify-start gap-3 duration-250 hover:scale-[1.02]"
                          >
                            <div className="text-left">
                              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">P. Mayorista (Taller)</p>
                              <p className="text-xs font-black text-amber-400 font-mono">${parseFloat(String(art.precio_mayorista)).toFixed(2)}</p>
                            </div>
                            <div className="p-1 rounded-lg bg-zinc-950 text-zinc-400 hover:text-white">
                              <Plus className="w-3 h-3" />
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT PANEL (40%): SHOPPING BASKET & AFIP CHECKOUT ==================== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-6 backdrop-blur-xl">

            {/* Customer Information Block */}
            <ClientSelector />

            {/* Cart Items List */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-500" />
                  <span>Detalle de Compra</span>
                </span>
                <span className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded font-mono font-bold">
                  {salesStore.cart.length} repuestos
                </span>
              </h2>

              {salesStore.cart.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 italic text-xs border border-dashed border-zinc-850 rounded-xl bg-zinc-950/10 space-y-1">
                  <p>El carrito de mostrador está vacío.</p>
                  <p className="text-[10px] text-zinc-500">Agregue artículos desde el catálogo de la izquierda.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                  {salesStore.cart.map((item) => (
                    <div
                      key={`${item.id}-${item.precio_tipo}`}
                      className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 space-y-0.5 max-w-[50%] xs:max-w-[60%]">
                        <p className="font-bold text-white truncate">{item.descripcion}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono text-zinc-500 font-extrabold uppercase">
                            COD: {item.codigo_fabricante}
                          </span>
                          <span className={`text-[8px] font-extrabold px-1 rounded uppercase font-mono tracking-widest ${item.precio_tipo === "mayorista"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-zinc-800 text-zinc-400"
                            }`}>
                            {item.precio_tipo}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Editor Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => salesStore.updateQuantity(item.id, item.cantidad - 1)}
                          className="p-1 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => salesStore.updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-10 text-center font-mono font-bold text-white bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 focus:outline-none focus:border-amber-500/30 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => salesStore.updateQuantity(item.id, item.cantidad + 1)}
                          className="p-1 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Subtotal and remove */}
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <p className="font-black text-white font-mono">${(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                          <p className="text-[9px] text-zinc-500 font-mono">${item.precio_unitario} c/u</p>
                        </div>
                        <button
                          onClick={() => salesStore.removeItem(item.id)}
                          className="p-1.5 rounded-lg text-zinc-650 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Quitar repuesto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals and checkout */}
            <div className="space-y-4 pt-4 border-t border-zinc-850">

              {/* Selector de Medios de Pago */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>Medio de Pago</span>
                  </h3>
                  <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Seleccionado: {salesStore.paymentMethod.replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Botón Efectivo */}
                  <button
                    type="button"
                    onClick={() => salesStore.setPaymentMethod("efectivo")}
                    className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 cursor-pointer ${salesStore.paymentMethod === "efectivo"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-zinc-850 bg-zinc-950/40 hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-300"
                      }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Efectivo</span>
                  </button>

                  {/* Botón Tarjeta */}
                  <button
                    type="button"
                    onClick={() => salesStore.setPaymentMethod("tarjeta")}
                    className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 cursor-pointer ${salesStore.paymentMethod === "tarjeta"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-zinc-850 bg-zinc-950/40 hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-300"
                      }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Tarjeta</span>
                  </button>

                  {/* Botón Transferencia */}
                  <button
                    type="button"
                    onClick={() => salesStore.setPaymentMethod("transferencia")}
                    className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95 cursor-pointer ${salesStore.paymentMethod === "transferencia"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-zinc-850 bg-zinc-950/40 hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-300"
                      }`}
                  >
                    <Landmark className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Transferencia</span>
                  </button>

                  {/* Botón Cuenta Corriente */}
                  <button
                    type="button"
                    disabled={salesStore.clientCuit === "99999999999"}
                    onClick={() => salesStore.setPaymentMethod("cuenta_corriente")}
                    className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 relative ${salesStore.clientCuit === "99999999999"
                      ? "border-zinc-900 bg-zinc-950/20 text-zinc-650 opacity-40 cursor-not-allowed"
                      : salesStore.paymentMethod === "cuenta_corriente"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:scale-[1.01] active:scale-95 cursor-pointer"
                        : "border-zinc-850 bg-zinc-950/40 hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-300 hover:scale-[1.01] active:scale-95 cursor-pointer"
                      }`}
                    title={
                      salesStore.clientCuit === "99999999999"
                        ? "La cuenta corriente requiere un cliente identificado, no disponible para Consumidor Final."
                        : "Venta cargada al saldo de cuenta del cliente."
                    }
                  >
                    <Handshake className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Cuenta Corriente</span>
                    {salesStore.clientCuit === "99999999999" && (
                      <span className="absolute bottom-1 text-[7px] text-red-500/80 font-semibold uppercase tracking-tight scale-90">
                        No disp. p/ CF
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-850 bg-zinc-950 p-4 space-y-2.5 font-sans">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                  <span>Subtotal Neto (Discriminado):</span>
                  <span className="font-mono text-zinc-300 font-bold">${subtotalNeto.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
                  <span>Impuesto IVA Liquidado (21% / 10.5%):</span>
                  <span className="font-mono text-zinc-300 font-bold">${totalIva.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-zinc-850 pt-2.5 flex justify-between items-center text-sm">
                  <span className="text-white font-extrabold uppercase tracking-wide">Importe Total:</span>
                  <span className="font-mono text-amber-400 font-black text-xl">
                    ${totalAmount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Checkout F9 Button */}
              <button
                onClick={handleCheckout}
                disabled={salesStore.cart.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-xs font-black text-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:scale-[1.01] active:scale-95 duration-200 disabled:opacity-40 disabled:hover:scale-100 disabled:pointer-events-none"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>AUTORIZAR Y EMITIR COMPROBANTE (F9)</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* 3. Vehicles Compatibility Floating Overlay/Modal */}
      {activeCompatArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">

            {/* Header info */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Compatibilidad del Repuesto</span>
              </div>
              <button
                onClick={() => setActiveCompatArticle(null)}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Article Detail */}
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1 text-xs">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Artículo
              </p>
              <p className="font-extrabold text-white">
                {articles.find(a => a.id === activeCompatArticle)?.descripcion}
              </p>
              <p className="text-[10px] text-amber-400 font-mono">
                Código: {articles.find(a => a.id === activeCompatArticle)?.codigo_fabricante}
              </p>
            </div>

            {/* Compatibility list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Modelos Autorizados</h4>

              <div className="max-h-[35vh] overflow-y-auto pr-1 space-y-2">
                {compatData[activeCompatArticle]?.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-zinc-900 text-xs text-zinc-500 rounded-xl italic">
                    Este repuesto está catalogado para compatibilidad general / universal.
                  </div>
                ) : (
                  compatData[activeCompatArticle]?.map((compat, idx) => {
                    const version = compat.auto_version;
                    if (!version) return null;

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-850/80 flex items-start justify-between gap-3 text-xs transition hover:bg-zinc-900"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {version.auto_modelo?.auto_marca?.nombre} {version.auto_modelo?.nombre}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            Motorización: <span className="text-zinc-300 font-semibold">{version.motorizacion}</span>
                          </p>
                          {compat.observaciones && (
                            <p className="text-[10px] text-amber-500/80 italic mt-1 font-mono">
                              Nota: {compat.observaciones}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-block text-[9px] bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded font-mono font-bold text-zinc-400">
                            Años: {version.anio_desde} — {version.anio_hasta || "Actual"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Close button */}
            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveCompatArticle(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. AFIP Simulating Authorized Loader Overlay */}
      {afipStatus && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              {/* Outer amber glow */}
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/10 animate-ping" />
              {/* Spinning loader */}
              <Loader2 className="w-20 h-20 text-amber-400 animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight text-white uppercase">
                Autorizando Comprobante
              </h3>
              <p className="text-xs text-zinc-400 font-mono h-4">
                {afipStatus}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-850 px-3.5 py-1.5 text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Conexión Encriptada SSL AFIP
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
