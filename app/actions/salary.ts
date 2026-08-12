'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SalaryRepository } from "@/lib/repositories/salary.repository";
import { AccountRepository } from "@/lib/repositories/account.repository";
import { calculateSalary } from "@/lib/financial-engine";
import { PanamaTaxStrategy } from "@/lib/strategies/tax/panama.tax.strategy";
import { logger } from "@/lib/logger";

interface ProcessSalaryRequest {
    grossVal: number;
    bonus: number;
    company?: string;
    frequency: 'monthly' | 'biweekly';
    absentDays: number;
    paymentDate: string;
    profileId?: number;
    accountId?: number;
    isManualCalculation?: boolean;
    dryRun?: boolean;
}

export async function createSalary(data: ProcessSalaryRequest) {
    logger.info("Processing salary on the server...");

    try {
        let finalNetVal = 0;
        let finalTaxes = 0;
        let finalSS = 0;
        let eduIns = 0;
        let incomeTax = 0;

        let estimatedDecimoGross = 0;
        let estimatedDecimoNet = 0;
        let isDecimoMonth = false;
        let grossAfterAbsence = data.grossVal;
        let annualISRBase = 0;
        let annualISRTax = 0;
        let isrRateUsed = 0;

        if (data.isManualCalculation) {
            finalNetVal = data.grossVal + data.bonus;
        } else {
            const taxStrategy = new PanamaTaxStrategy();
            const calcResult = calculateSalary(
                data.grossVal,
                data.bonus,
                data.frequency,
                data.absentDays,
                taxStrategy
            );

            grossAfterAbsence = calcResult.grossAfterAbsence;

            // Calcular detalle del ISR
            const monthlyGrossForCalc = data.frequency === 'biweekly' ? data.grossVal * 2 : data.grossVal;
            const monthlyBase = data.frequency === 'biweekly' ? grossAfterAbsence * 2 : grossAfterAbsence;
            const annualSalary = monthlyBase * 12;
            const BRACKET_1_LIMIT = 11000;
            const BRACKET_2_LIMIT = 50000;
            if (annualSalary > BRACKET_1_LIMIT) {
                annualISRBase = annualSalary - BRACKET_1_LIMIT;
                if (annualSalary <= BRACKET_2_LIMIT) {
                    annualISRTax = annualISRBase * 0.15;
                    isrRateUsed = 0.15;
                } else {
                    annualISRTax = (50000 - 11000) * 0.15 + (annualSalary - BRACKET_2_LIMIT) * 0.25;
                    isrRateUsed = 0.25;
                }
            }

            const selectedMonth = parseInt(data.paymentDate.split('-')[1]);
            isDecimoMonth = [4, 8, 12].includes(selectedMonth);

            estimatedDecimoGross = monthlyGrossForCalc / 3;
            const estimatedDecimoSS = estimatedDecimoGross * 0.0975;
            estimatedDecimoNet = estimatedDecimoGross - estimatedDecimoSS;

            finalNetVal = isDecimoMonth ? calcResult.netVal + estimatedDecimoNet : calcResult.netVal;
            finalTaxes = isDecimoMonth ? calcResult.totalTaxes + estimatedDecimoSS : calcResult.totalTaxes;
            finalSS = isDecimoMonth ? calcResult.socialSec + estimatedDecimoSS : calcResult.socialSec;
            eduIns = calcResult.eduIns;
            incomeTax = calcResult.incomeTax;

            // Normalize: engine returns monthly values; for biweekly, divide by 2
            if (data.frequency === 'biweekly') {
                finalTaxes = finalTaxes / 2;
                finalSS = finalSS / 2;
                eduIns = eduIns / 2;
                incomeTax = incomeTax / 2;
                finalNetVal = (grossAfterAbsence + data.bonus) - finalTaxes;
            }
        }

        const salaryData = {
            grossVal: data.grossVal,
            bonus: data.bonus,
            taxes: finalTaxes,
            netVal: finalNetVal,
            socialSec: finalSS,
            eduIns: eduIns,
            incomeTax: incomeTax,
            company: data.company,
            absentDays: data.absentDays,
            profileId: data.profileId,
            accountId: data.accountId,
        };

        if (data.dryRun) {
            return {
                id: 0,
                createdAt: new Date(),
                ...salaryData,
                grossVal: Number(salaryData.grossVal),
                netVal: Number(salaryData.netVal),
                taxes: Number(salaryData.taxes),
                socialSec: Number(salaryData.socialSec),
                eduIns: Number(salaryData.eduIns),
                incomeTax: Number(salaryData.incomeTax),
                bonus: Number(salaryData.bonus),
                absentDays: data.absentDays,
                grossAfterAbsence,
                annualISRBase,
                annualISRTax,
                isrRateUsed,
                _uiResult: {
                    isDecimoIncluded: isDecimoMonth,
                    decimoGross: estimatedDecimoGross,
                    decimoNet: estimatedDecimoNet
                }
            };
        }

        const newSalary = await prisma.$transaction(async (tx) => {
            const salary = await SalaryRepository.create(tx, salaryData);

            if (data.accountId) {
                await AccountRepository.modifyBalance(tx, {
                    accountId: data.accountId,
                    amount: finalNetVal,
                    type: 'CREDIT'
                });
            }

            return salary;
        });

        logger.info(`Salary created successfully: ID ${newSalary.id}`);

        revalidatePath('/budget');
        return {
            ...newSalary,
            grossVal: Number(newSalary.grossVal),
            netVal: Number(newSalary.netVal),
            taxes: Number(newSalary.taxes),
            socialSec: Number(newSalary.socialSec),
            eduIns: Number(newSalary.eduIns),
            incomeTax: Number(newSalary.incomeTax),
            bonus: Number(newSalary.bonus),
            absentDays: data.absentDays,
            grossAfterAbsence,
            annualISRBase,
            annualISRTax,
            isrRateUsed,
            _uiResult: {
                isDecimoIncluded: isDecimoMonth,
                decimoGross: estimatedDecimoGross,
                decimoNet: estimatedDecimoNet
            }
        };
    } catch (error) {
        logger.error(`Error processing salary`, error);
        throw new Error("Failed to process and store salary calculation");
    }
}

export async function deleteSalaryById(id: number): Promise<void> {
    logger.info(`Deleting salary id ${id}`);
    try {
        await prisma.$transaction(async (tx) => {
            const salary = await SalaryRepository.findById(tx, id);

            if (salary) {
                if (salary.accountId) {
                    await AccountRepository.modifyBalance(tx, {
                        accountId: salary.accountId,
                        amount: Number(salary.netVal),
                        type: 'DEBIT' // Revert addition
                    });
                }
                await SalaryRepository.delete(tx, id);
            }
        });
        revalidatePath('/budget');
    } catch (err) {
        logger.error(`Error deleting salary ${id}`, err);
        throw err;
    }
}

export async function updateSalary(id: number, data: ProcessSalaryRequest) {
    logger.info(`Updating salary id ${id}`);
    const oldSalary = await prisma.salary.findUnique({ where: { id } });
    if (!oldSalary) throw new Error("Salario no encontrado");

    try {
        let finalNetVal = 0;
        let finalTaxes = 0;
        let finalSS = 0;
        let eduIns = 0;
        let incomeTax = 0;

        let grossAfterAbsence = data.grossVal;
        let annualISRBase = 0;
        let annualISRTax = 0;
        let isrRateUsed = 0;

        if (data.isManualCalculation) {
            finalNetVal = data.grossVal + data.bonus;
        } else {
            const taxStrategy = new PanamaTaxStrategy();
            const calcResult = calculateSalary(data.grossVal, data.bonus, data.frequency, data.absentDays, taxStrategy);

            grossAfterAbsence = calcResult.grossAfterAbsence;

            const selectedMonth = parseInt(data.paymentDate.split('-')[1]);
            const isDecimoMonth = [4, 8, 12].includes(selectedMonth);

            const monthlyGrossForCalc = data.frequency === 'biweekly' ? data.grossVal * 2 : data.grossVal;
            const estimatedDecimoGross = monthlyGrossForCalc / 3;
            const estimatedDecimoSS = estimatedDecimoGross * 0.0975;
            const estimatedDecimoNet = estimatedDecimoGross - estimatedDecimoSS;

            finalNetVal = isDecimoMonth ? calcResult.netVal + estimatedDecimoNet : calcResult.netVal;
            finalTaxes = isDecimoMonth ? calcResult.totalTaxes + estimatedDecimoSS : calcResult.totalTaxes;
            finalSS = isDecimoMonth ? calcResult.socialSec + estimatedDecimoSS : calcResult.socialSec;
            eduIns = calcResult.eduIns;
            incomeTax = calcResult.incomeTax;

            // Normalize: engine returns monthly values; for biweekly, divide by 2
            if (data.frequency === 'biweekly') {
                finalTaxes = finalTaxes / 2;
                finalSS = finalSS / 2;
                eduIns = eduIns / 2;
                incomeTax = incomeTax / 2;
                finalNetVal = (grossAfterAbsence + data.bonus) - finalTaxes;
            }

            // Calcular detalle del ISR
            const monthlyBase = data.frequency === 'biweekly' ? grossAfterAbsence * 2 : grossAfterAbsence;
            const annualSalary = monthlyBase * 12;
            const BRACKET_1_LIMIT = 11000;
            const BRACKET_2_LIMIT = 50000;
            if (annualSalary > BRACKET_1_LIMIT) {
                annualISRBase = annualSalary - BRACKET_1_LIMIT;
                if (annualSalary <= BRACKET_2_LIMIT) {
                    annualISRTax = annualISRBase * 0.15;
                    isrRateUsed = 0.15;
                } else {
                    annualISRTax = (50000 - 11000) * 0.15 + (annualSalary - BRACKET_2_LIMIT) * 0.25;
                    isrRateUsed = 0.25;
                }
            }
        }

        const salaryData = {
            grossVal: data.grossVal,
            bonus: data.bonus,
            taxes: finalTaxes,
            netVal: finalNetVal,
            socialSec: finalSS,
            eduIns: eduIns,
            incomeTax: incomeTax,
            company: data.company,
            absentDays: data.absentDays,
            profileId: data.profileId,
            accountId: data.accountId,
        };

        await prisma.$transaction(async (tx) => {
            // 1. Revert Old Impact
            if (oldSalary.accountId) {
                await AccountRepository.modifyBalance(tx, {
                    accountId: oldSalary.accountId,
                    amount: Number(oldSalary.netVal),
                    type: 'DEBIT'
                });
            }

            // 2. Apply New Impact
            if (data.accountId) {
                await AccountRepository.modifyBalance(tx, {
                    accountId: data.accountId,
                    amount: finalNetVal,
                    type: 'CREDIT'
                });
            }

            // 3. Update Record
            await SalaryRepository.update(tx, id, salaryData);
        });
        revalidatePath('/budget');
    } catch (err) {
        logger.error(`Error updating salary ${id}`, err);
        throw err;
    }
}
