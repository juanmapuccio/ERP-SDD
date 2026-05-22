# Tasks: ERP Nodo Sur Accounting Core (`zenerp-core`)

## Review Workload Forecast
- **Estimated Changed Lines**: ~600-650 lines total
- **Risk Level**: High (Exceeds 400-line review budget)
- **Delivery Strategy**: `ask-on-risk` (Slicing implementation into review-friendly units)
- **Chained PRs Recommended**: Yes

### Chained Work Unit Slices:
1. **Slice 1: Go Backend Core & Engine (`backend/accounting.go`)**: ~200 lines (Structs, thread-safe memory store, dynamic parent rollup, balance validation, and unit tests).
2. **Slice 3: Go Backend HTTP Handlers & Routes (`backend/accounting_handlers.go`)**: ~150 lines (HTTP endpoint handlers, JSON request decoding, main router integration, and handler integration tests).
3. **Slice 3: Next.js Frontend Component Suite (`frontend/src/components/...`)**: ~200 lines (Tree navigation, dynamic multi-row entry form with real-time balance calculations, reports tabs, and Vitest suite).
4. **Slice 4: Dashboard Integration & Polish (`frontend/src/app/dashboard/page.tsx`)**: ~100 lines (Layout stitching, ERP Nodo Sur theme refinement, and end-to-end frontend/backend verification).

---

## Tasks

### [x] Slice 1: Go Backend Core & Engine (TDD)
- [x] Define core structs (`Account`, `Entry`, `Transaction`) and `MemoryStore` with `sync.RWMutex` inside `backend/accounting.go`.
- [x] Implement thread-safe JSON backup serialization and deserialization to/from `backend/db/accounting.json`.
- [x] Implement `CalculateBalances` dynamic rollup engine (prefix sorting rollup algorithm).
- [x] Implement transaction `Validate` and account deletion check rules.
- [x] Write unit tests inside `backend/accounting_test.go` covering `TestAggregatingParentAccountBalances`, `TestBlockingAccountDeletion`, `TestPostBalancedTransaction`, `TestPostUnbalancedTransaction`, and `TestSumasYSaldosReport`.
- [x] Run test suite and ensure all backend core unit tests pass green (`go test -v`).

### [x] Slice 2: Go Backend HTTP Handlers & API Integration
- [x] Implement HTTP API handlers:
  - `GET /api/accounting/accounts`
  - `POST /api/accounting/accounts`
  - `DELETE /api/accounting/accounts`
  - `POST /api/accounting/transactions`
  - `GET /api/accounting/reports/diario`
  - `GET /api/accounting/reports/mayor`
  - `GET /api/accounting/reports/balance`
- [x] Wire the endpoints into `NewRouter()` inside `backend/main.go`.
- [x] Implement HTTP API integration tests using `net/http/httptest` to verify requests/responses and error payloads.
- [x] Run backend tests and verify 100% success.

### [x] Slice 3: Next.js Frontend Component Suite (TDD)
- [x] Create collapsible tree view component `frontend/src/components/AccountTree.tsx` with dynamic padding and interactive delete/create controls.
- [x] Create multi-row transaction entry form `frontend/src/components/TransactionForm.tsx` with dynamic inputs and real-time jade-green/red balance status badge.
- [x] Create ledger reports views `frontend/src/components/LedgerReports.tsx` supporting tabs for Diario, Mayor dropdown lookup, and Balance de Sumas y Saldos.
- [x] Write Vitest component unit tests in `frontend/src/components/__tests__/Accounting.test.tsx` verifying interactive tree nodes, form live validation blocking submit, and report view transitions.
- [x] Run frontend tests and verify all pass green (`bun run --cwd frontend test`).

### [x] Slice 4: Dashboard Integration & Premium Polish
- [x] Add the accounting section inside `frontend/src/app/dashboard/page.tsx` as a sleek premium split-tab layout ("General", "Plan de Cuentas", "Registrar Asiento", "Libros Contables").
- [x] Style the layouts using ERP Nodo Sur Premium palette (charcoal bases, jade/emerald highlight accents, and golden glows).
- [x] Connect frontend components to backend Go APIs via standard React fetch streams.
- [x] Perform full manual verification using both backend and frontend dev runners.

