# Especificación: Núcleo de Contabilidad ERP Nodo Sur

Esta especificación define los requisitos funcionales y los escenarios de prueba para el motor de contabilidad por partida doble y la generación de informes financieros en tiempo real.

---

## 1. Requisitos

### Requisito: Plan de Cuentas Jerárquico
El sistema DEBE soportar un catálogo o Plan de Cuentas estructurado en forma de árbol, identificado por códigos alfanuméricos únicos.
- Las cuentas padre DEBEN consolidar de forma dinámica el saldo acumulado de todas sus cuentas hijas.
- Debe prohibirse la eliminación de una cuenta si contiene subcuentas (hijas) o si está referenciada en transacciones registradas.

#### Escenario: Consolidación de Saldos en Cuentas Padre
- **DADO** un catálogo de cuentas donde la cuenta padre `1. Activo` tiene como subcuentas a `1.1 Caja` (saldo: 100) y `1.2 Banco` (saldo: 150)
- **CUANDO** se solicita el Plan de Cuentas
- **ENTONCES** el saldo consolidado de la cuenta `1. Activo` DEBE reportarse estrictamente como 250

#### Escenario: Bloqueo de Eliminación de Cuentas con Hijas
- **DADO** una cuenta padre `1. Activo` que posee subcuentas hijas activas
- **CUANDO** el usuario intenta eliminar la cuenta `1. Activo`
- **ENTONCES** el sistema DEBE rechazar la eliminación y retornar un error detallado de validación

---

### Requisito: Registro de Asientos Contables por Partida Doble
Cada transacción registrada (Asiento Contable) DEBE estar estrictamente balanceada bajo la restricción: `Sum(Entries.Debe) == Sum(Entries.Haber)`.
- El sistema DEBE rechazar cualquier transacción desbalanceada.
- Las transacciones deben registrarse de forma atómica y persistirse en un almacenamiento local JSON seguro y seguro para hilos en `backend/db/accounting.json`.

#### Escenario: Registro de un Asiento Balanceado
- **DADO** las cuentas válidas `1.1 Caja` y `4.1 Ingresos`
- **CUANDO** se registra un asiento con Debe: `1.1 Caja` (100) y Haber: `4.1 Ingresos` (100)
- **ENTONCES** la transacción DEBE guardarse con éxito y los saldos de ambas cuentas deben actualizarse correctamente

#### Escenario: Rechazo de un Asiento Desbalanceado
- **DADO** las cuentas válidas `1.1 Caja` y `4.1 Ingresos`
- **CUANDO** se intenta registrar un asiento con Debe: `1.1 Caja` (100) y Haber: `4.1 Ingresos` (90)
- **ENTONCES** el sistema DEBE rechazar de inmediato la transacción y mantener intactos los saldos originales de las cuentas

---

### Requisito: Reportes e Informes Financieros en Tiempo Real
El sistema DEBE generar los siguientes informes financieros bajo demanda:
- **Libro Diario**: Registro cronológico de todos los asientos y movimientos contables.
- **Libro Mayor**: Listado detallado de transacciones históricas filtradas por una cuenta específica.
- **Balance de Sumas y Saldos**: Cuadro resumen jerárquico que muestra la suma del Debe, suma del Haber y el saldo deudor/acreedor resultante para cada cuenta contable activa.

#### Escenario: Cálculo de Balance de Sumas y Saldos
- **DADO** una transacción con 100 en el Debe para la cuenta `1.1 Caja` y otra transacción con 40 en el Haber para la misma cuenta `1.1 Caja`
- **CUANDO** se genera el reporte de Balance de Sumas y Saldos
- **ENTONCES** la cuenta `1.1 Caja` DEBE mostrar: suma Debe: 100, suma Haber: 40 y Saldo Deudor resultante: 60
