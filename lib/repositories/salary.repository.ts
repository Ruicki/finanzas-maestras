import { PrismaClient, Salary } from '@prisma/client';
import { CreateSalaryDto } from '../../types/finance';

export class SalaryRepository {
    static async create(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, data: CreateSalaryDto): Promise<Salary> {
        return tx.salary.create({
            data: {
                grossVal: data.grossVal,
                bonus: data.bonus,
                taxes: data.taxes,
                netVal: data.netVal,
                socialSec: data.socialSec,
                eduIns: data.eduIns,
                incomeTax: data.incomeTax,
                company: data.company || "Sin Empresa",
                absentDays: data.absentDays,
                profileId: data.profileId,
                accountId: data.accountId
            },
        });
    }

    static async delete(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, id: number): Promise<void> {
        await tx.salary.delete({ where: { id } });
    }

    static async findById(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, id: number): Promise<Salary | null> {
        return tx.salary.findUnique({ where: { id } });
    }

    static async update(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, id: number, data: CreateSalaryDto): Promise<Salary> {
        return tx.salary.update({
            where: { id },
            data: {
                grossVal: data.grossVal,
                bonus: data.bonus,
                taxes: data.taxes,
                netVal: data.netVal,
                socialSec: data.socialSec,
                eduIns: data.eduIns,
                incomeTax: data.incomeTax,
                company: data.company || "Sin Empresa",
                absentDays: data.absentDays,
                profileId: data.profileId,
                accountId: data.accountId
            }
        });
    }
}
