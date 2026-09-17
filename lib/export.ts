import type { DatosExportables } from "@/app/actions/export";

export const downloadCSV = (content: string, fileName: string) => {
    // El BOM hace que Excel abra el archivo en UTF-8; sin el, los acentos y la
    // ñ salen rotos, que es justo lo que pasa con nombres como "Nómina".
    const blob = new Blob(["﻿" + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

const escapeCSV = (str: string | null | undefined | number | boolean | Date): string => {
    if (str === null || str === undefined) return "";
    const stringified = String(str);
    if (stringified.includes(",") || stringified.includes("\n") || stringified.includes('"')) {
        return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
};

const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};

const fila = (celdas: (string | number | boolean | Date | null | undefined)[]) =>
    celdas.map(escapeCSV).join(",");

/**
 * Todos los movimientos en orden cronologico: salarios, ingresos, gastos y
 * transferencias.
 *
 * Las transferencias faltaban y son la mitad de la historia en cuanto hay mas
 * de una cuenta: sin ellas el CSV muestra dinero que sale de un sitio y aparece
 * en otro sin explicacion.
 */
export const generateTransactionsCSV = (datos: DatosExportables): string => {
    const filas: string[] = [
        fila(["Fecha", "Tipo", "Categoría/Fuente", "Monto", "Descripción", "Cuenta Origen", "Cuenta Destino"]),
    ];

    interface Movimiento {
        fecha: Date | string;
        celdas: (string | number)[];
    }
    const movimientos: Movimiento[] = [];

    for (const s of datos.salarios) {
        movimientos.push({
            fecha: s.fecha,
            celdas: ["Salario", s.empresa || "Nómina", s.neto, "Salario neto", "", ""],
        });
    }

    for (const i of datos.ingresos) {
        movimientos.push({
            fecha: i.fecha,
            celdas: [
                "Ingreso",
                i.nombre || "Otros",
                i.monto,
                i.frecuencia === 'ONE_TIME' ? 'Puntual' : `Recurrente (${i.frecuencia})`,
                "",
                i.cuentaId ? datos.nombresCuenta[i.cuentaId] ?? "" : "",
            ],
        });
    }

    for (const g of datos.gastos) {
        const origen = g.cuentaId
            ? datos.nombresCuenta[g.cuentaId] ?? ""
            : g.tarjetaId
              ? datos.nombresTarjeta[g.tarjetaId] ?? ""
              : "";
        movimientos.push({
            fecha: g.fecha,
            celdas: [
                g.proyectado ? "Gasto proyectado" : "Gasto",
                datos.categorias.find((c) => c.id === g.categoriaId)?.nombre ?? "Sin categoría",
                // Negativo para que una suma de la columna dé el flujo neto.
                -g.monto,
                g.nombre || "",
                origen,
                "",
            ],
        });
    }

    for (const t of datos.transferencias) {
        movimientos.push({
            fecha: t.fecha,
            celdas: [
                "Transferencia",
                "Entre cuentas",
                // Sale este importe del origen; si hubo tipo de cambio, en el
                // destino entra otro, que se anota en la descripción.
                -t.monto,
                t.montoDestino !== t.monto
                    ? `${t.descripcion || "Transferencia"} (entran ${t.montoDestino})`
                    : t.descripcion || "Transferencia",
                t.origen,
                t.destino,
            ],
        });
    }

    movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    for (const m of movimientos) filas.push(fila([formatDate(m.fecha), ...m.celdas]));

    return filas.join("\n");
};

/**
 * Foto de la situacion actual: con que cuentas, que debes y a donde vas.
 *
 * Los movimientos cuentan el historial, pero no los saldos ni las metas. Sin
 * esto, "exportar tus datos" dejaba fuera cuanto tienes y cuanto debes.
 */
export const generateSnapshotCSV = (datos: DatosExportables): string => {
    const filas: string[] = [];

    filas.push(fila(["CUENTAS"]));
    filas.push(fila(["Nombre", "Tipo", "Propósito", "Saldo", "Moneda"]));
    for (const c of datos.cuentas) {
        filas.push(fila([c.nombre, c.tipo, c.proposito, c.saldo, c.moneda]));
    }

    filas.push("");
    filas.push(fila(["TARJETAS DE CRÉDITO"]));
    filas.push(fila(["Nombre", "Banco", "Saldo (deuda)", "Límite", "Día corte", "Día pago", "Tasa %"]));
    for (const t of datos.tarjetas) {
        filas.push(fila([t.nombre, t.banco, t.saldo, t.limite, t.diaCorte, t.diaPago, t.tasaInteres]));
    }

    filas.push("");
    filas.push(fila(["PRÉSTAMOS"]));
    filas.push(fila(["Nombre", "Prestamista", "Tipo", "Monto total", "Saldo actual", "Tasa %", "Cuota mensual"]));
    for (const p of datos.prestamos) {
        filas.push(fila([p.nombre, p.prestamista, p.tipo, p.montoTotal, p.saldoActual, p.tasaInteres, p.cuotaMensual]));
    }

    filas.push("");
    filas.push(fila(["METAS"]));
    filas.push(fila(["Nombre", "Objetivo", "Acumulado", "Falta", "Fecha límite", "Prioridad", "Pausada"]));
    for (const m of datos.metas) {
        filas.push(fila([
            m.nombre,
            m.objetivo,
            m.acumulado,
            Math.max(0, m.objetivo - m.acumulado),
            formatDate(m.fechaLimite),
            m.prioridad,
            m.pausada ? "Sí" : "No",
        ]));
    }

    return filas.join("\n");
};
