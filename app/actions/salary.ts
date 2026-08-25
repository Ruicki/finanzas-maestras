'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SalaryRepository } from "@/lib/repositories/salary.repository";
import { AccountRepository } from "@/lib/repositories/account.repository";
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

// Panama tax rates
const SOCIAL_SEC_RATE = 0.0975;
const EDU_INS_RATE = 0.0125;
const SOCIAL_SEC_DECIMO_RATE = 0.0725; // Reduced rate for décimo
const ISR_EXEMPTION = 11000;
const ISR_BRACKET_2_LIMIT = 50000;
const ISR_RATE_15 = 0.15;
const ISR_RATE_25 = 0.25;

/**
 * Calculates ISR using Panama's official method:
 * 1. Project annual income = monthly_gross × 13 (12 months + décimo)
 * 2. Apply brackets to annual figure
 * 3. Divide by 12 for monthly withholding
 * For biweekly: monthly = grossVal × 2
 */
function calculateISR(monthlyGross: number) {
    // Project annual income including décimo (×13)
    const annualIncome = monthlyGross * 13;

    let annualTax = 0;
    if (annualIncome <= ISR_EXEMPTION) {
        annualTax = 0;
    } else if (annualIncome <= ISR_BRACKET_2_LIMIT) {
        annualTax = (annualIncome - ISR_EXEMPTION) * ISR_RATE_15;
    } else {
        annualTax = (ISR_BRACKET_2_LIMIT - ISR_EXEMPTION) * ISR_RATE_15
            + (annualIncome - ISR_BRACKET_2_LIMIT) * ISR_RATE_25;
    }

    // Monthly ISR withholding
    const monthlyISR = annualTax / 12;

    return { monthlyISR, annualIncome, annualTax };
}

export async function createSalary(data: ProcessSalaryRequest) {
    logger.info("Processing salary on the server...");

    try {
        let finalNetVal = 0;
        let finalTaxes = 0;
        let finalSS = 0;
        let finalEduIns = 0;
        let finalIncomeTax = 0;

        let grossAfterAbsence = data.grossVal;
        let annualISRBase = 0;
        let annualISRTax = 0;
        let isrRateUsed = 0;
        let isDecimoIncluded = false;
        let decimoGross = 0;
        let decimoNet = 0;

        if (data.isManualCalculation) {
            finalNetVal = data.grossVal + data.bonus;
        } else {
            // Calculate daily rate based on frequency
            const daysInPeriod = data.frequency === 'biweekly' ? 15 : 30;
            const dailyRate = data.grossVal / daysInPeriod;

            // Absence deduction
            const absenceDeduction = dailyRate * data.absentDays;
            grossAfterAbsence = Math.max(0, data.grossVal - absenceDeduction);

            // SS and Educativo are calculated on the period amount
            finalSS = grossAfterAbsence * SOCIAL_SEC_RATE;
            finalEduIns = grossAfterAbsence * EDU_INS_RATE;

            // ISR: project monthly × 13, apply brackets, /12
            const monthlyGross = data.frequency === 'biweekly'
                ? grossAfterAbsence * 2
                : grossAfterAbsence;

            const isr = calculateISR(monthlyGross);
            finalIncomeTax = isr.monthlyISR;
            annualISRBase = Math.max(0, isr.annualIncome - ISR_EXEMPTION);
            annualISRTax = isr.annualTax;

            if (annualISRBase > 0) {
                isrRateUsed = isr.annualIncome > ISR_BRACKET_2_LIMIT ? ISR_RATE_25 : ISR_RATE_15;
            }

            // Décimo: automatic in months 4 (Apr), 8 (Aug), 12 (Dec) — only on the 15th payment
            const selectedMonth = parseInt(data.paymentDate.split('-')[1]);
            const selectedDay = parseInt(data.paymentDate.split('-')[2]);
            isDecimoIncluded = [4, 8, 12].includes(selectedMonth) && selectedDay >= 15;

            if (isDecimoIncluded) {
                // Décimo = 1/3 of monthly gross (before absences for calculation)
                const grossMonthlyForDecimo = data.frequency === 'biweekly'
                    ? data.grossVal * 2
                    : data.grossVal;

                decimoGross = grossMonthlyForDecimo / 3;
                // Décimo has reduced SS rate (7.25%), no eduIns
                const decimoSS = decimoGross * SOCIAL_SEC_DECIMO_RATE;
                decimoNet = decimoGross - decimoSS;

                finalSS += decimoSS;
            }

            finalTaxes = finalSS + finalEduIns + finalIncomeTax;
            finalNetVal = (grossAfterAbsence + data.bonus + (isDecimoIncluded ? decimoNet : 0)) - finalTaxes;
        }

        const salaryData = {
            grossVal: data.grossVal,
            bonus: data.bonus,
            taxes: finalTaxes,
            netVal: finalNetVal,
            socialSec: finalSS,
            eduIns: finalEduIns,
            incomeTax: finalIncomeTax,
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
                    isDecimoIncluded,
                    decimoGross,
                    decimoNet
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
                isDecimoIncluded,
                decimoGross,
                decimoNet
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
        let finalEduIns = 0;
        let finalIncomeTax = 0;

        let grossAfterAbsence = data.grossVal;
        let annualISRBase = 0;
        let annualISRTax = 0;
        let isrRateUsed = 0;
        let isDecimoIncluded = false;
        let decimoGross = 0;
        let decimoNet = 0;

        if (data.isManualCalculation) {
            finalNetVal = data.grossVal + data.bonus;
        } else {
            const daysInPeriod = data.frequency === 'biweekly' ? 15 : 30;
            const dailyRate = data.grossVal / daysInPeriod;
            const absenceDeduction = dailyRate * data.absentDays;
            grossAfterAbsence = Math.max(0, data.grossVal - absenceDeduction);

            finalSS = grossAfterAbsence * SOCIAL_SEC_RATE;
            finalEduIns = grossAfterAbsence * EDU_INS_RATE;

            const monthlyGross = data.frequency === 'biweekly'
                ? grossAfterAbsence * 2
                : grossAfterAbsence;

            const isr = calculateISR(monthlyGross);
            finalIncomeTax = isr.monthlyISR;
            annualISRBase = Math.max(0, isr.annualIncome - ISR_EXEMPTION);
            annualISRTax = isr.annualTax;

            if (annualISRBase > 0) {
                isrRateUsed = isr.annualIncome > ISR_BRACKET_2_LIMIT ? ISR_RATE_25 : ISR_RATE_15;
            }

            const selectedMonth = parseInt(data.paymentDate.split('-')[1]);
            const selectedDay = parseInt(data.paymentDate.split('-')[2]);
            isDecimoIncluded = [4, 8, 12].includes(selectedMonth) && selectedDay >= 15;

            if (isDecimoIncluded) {
                const grossMonthlyForDecimo = data.frequency === 'biweekly'
                    ? data.grossVal * 2
                    : data.grossVal;

                decimoGross = grossMonthlyForDecimo / 3;
                const decimoSS = decimoGross * SOCIAL_SEC_DECIMO_RATE;
                decimoNet = decimoGross - decimoSS;
                finalSS += decimoSS;
            }

            finalTaxes = finalSS + finalEduIns + finalIncomeTax;
            finalNetVal = (grossAfterAbsence + data.bonus + (isDecimoIncluded ? decimoNet : 0)) - finalTaxes;
        }

        const salaryData = {
            grossVal: data.grossVal,
            bonus: data.bonus,
            taxes: finalTaxes,
            netVal: finalNetVal,
            socialSec: finalSS,
            eduIns: finalEduIns,
            incomeTax: finalIncomeTax,
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
