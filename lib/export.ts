import { ProfileWithData } from "@/types";

export const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

const escapeCSV = (str: string | null | undefined | number): string => {
    if (str === null || str === undefined) return "";
    const stringified = String(str);
    if (stringified.includes(",") || stringified.includes("\n") || stringified.includes('"')) {
        return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
};

const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export const generateTransactionsCSV = (profile: ProfileWithData): string => {
    const headers = [
        "Fecha",
        "Tipo",
        "Categoría/Fuente",
        "Monto",
        "Descripción",
        "Método Pago",
        "Cuenta Origen"
    ];

    const rows: string[] = [headers.join(",")];

    // 1. Incomes (Salaries + Additional)
    if (profile.salaries) {
        profile.salaries.forEach((s: any) => {
            rows.push([
                formatDate(s.createdAt),
                "Salario",
                "Nómina",
                s.netVal,
                "Salario Mensual",
                "Depósito",
                ""
            ].map(escapeCSV).join(","));
        });
    }

    if (profile.incomes) {
        profile.incomes.forEach((inc: any) => {
            rows.push([
                formatDate(inc.createdAt),
                "Ingreso Extra",
                inc.source || "Otros",
                inc.amount,
                inc.frequency === 'ONE_TIME' ? 'Puntual' : `Recurrente (${inc.frequency})`,
                "Depósito",
                profile.accounts?.find(a => a.id === inc.destinationAccountId)?.name || "Cuenta Desconocida"
            ].map(escapeCSV).join(","));
        });
    }

    // 2. Expenses
    if (profile.expenses) {
        profile.expenses.forEach((exp: any) => {
            // Find payment source name
            let paymentMethod = "Desconocido";
            if (exp.accountId) {
                paymentMethod = profile.accounts?.find(a => a.id === exp.accountId)?.name || "Cuenta";
            } else if (exp.creditCardId) {
                paymentMethod = profile.creditCards?.find(c => c.id === exp.creditCardId)?.name || "Tarjeta Crédito";
            }

            rows.push([
                formatDate(exp.createdAt),
                "Gasto",
                profile.categories?.find((c: any) => c.id === exp.categoryId)?.name || "Sin Categoría",
                -exp.amount, // Negative for expenses
                exp.description || "",
                paymentMethod,
                exp.accountId ? (profile.accounts?.find(a => a.id === exp.accountId)?.name || "") : ""
            ].map(escapeCSV).join(","));
        });
    }

    return rows.join("\n");
};
