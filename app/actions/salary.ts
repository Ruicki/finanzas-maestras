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
    includeDecimo?: boolean;
}

// Panama tax rates
const SOCIAL_SEC_RATE = 0.0975;
const EDU_INS_RATE = 0.0125;
const ISR_EXEMPTION = 11000;
const ISR_BRACKET_2_LIMIT = 50000;
const ISR_RATE_15 = 0.15;
const ISR_RATE_25 = 0.25;

function calculatePeriodTaxes(grossPeriod: number, frequency: 'monthly' | 'biweekly') {
    // SS and Educativo are always calculated on the period amount
    const socialSec = grossPeriod * SOCIAL_SEC_RATE;
    const eduIns = grossPeriod * EDU_INS_RATE;

    // ISR: annualize based on frequency
    const periodsPerYear = frequency === 'biweekly' ? 26 : 12;
    const annualSalary = grossPeriod * periodsPerYear;

    let annualTax = 0;
    if (annualSalary > ISR_EXEMPTION && annualSalary <= ISR_BRACKET_2_LIMIT) {
        annualTax = (annualSalary - ISR_EXEMPTION) * ISR_RATE_15;
    } else if (annualSalary > ISR_BRACKET_2_LIMIT) {
        annualTax = (ISR_BRACKET_2_LIMIT - ISR_EXEMPTION) * ISR_RATE_15 + (annualSalary - ISR_BRACKET_2_LIMIT) * ISR_RATE_25;
    }

    // ISR per period
    const incomeTax = annualTax / periodsPerYear;

    // Determine ISR rate used
    let isrRateUsed = 0;
    if (annualSalary > ISR_BRACKET_2_LIMIT) isrRateUsed = ISR_RATE_25;
    else if (annualSalary > ISR_EXEMPTION) isrRateUsed = ISR_RATE_15;

    return { socialSec, eduIns, incomeTax, isrRateUsed, annualSalary, annualTax };
}

function calculateDecimo(grossMonthly: number) {
    const decimoGross = grossMonthly / 3;
    const decimoSS = decimoGross * SOCIAL_SEC_RATE;
    const decimoNet = decimoGross - decimoSS;
    return { decimoGross, decimoNet, decimoSS };
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

            // Calculate taxes directly on the period amount
            const taxes = calculatePeriodTaxes(grossAfterAbsence, data.frequency);

            finalSS = taxes.socialSec;
            finalEduIns = taxes.eduIns;
            finalIncomeTax = taxes.incomeTax;
            finalTaxes = finalSS + finalEduIns + finalIncomeTax;
            isrRateUsed = taxes.isrRateUsed;

            // ISR detail for UI
            annualISRBase = Math.max(0, taxes.annualSalary - ISR_EXEMPTION);
            annualISRTax = taxes.annualTax;

            // Décimo: only if user explicitly requests it
            if (data.includeDecimo) {
                const grossMonthly = data.frequency === 'biweekly' ? data.grossVal * 2 : data.grossVal;
                const decimo = calculateDecimo(grossMonthly);
                decimoGross = decimo.decimoGross;
                decimoNet = decimo.decimoNet;
                isDecimoIncluded = true;

                // Décimo has its own SS deduction
                finalSS += decimoNet > 0 ? decimo.decimoSS : 0;
                finalTaxes += decimoNet > 0 ? decimo.decimoSS : 0;
            }

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

            const taxes = calculatePeriodTaxes(grossAfterAbsence, data.frequency);

            finalSS = taxes.socialSec;
            finalEduIns = taxes.eduIns;
            finalIncomeTax = taxes.incomeTax;
            finalTaxes = finalSS + finalEduIns + finalIncomeTax;
            isrRateUsed = taxes.isrRateUsed;

            annualISRBase = Math.max(0, taxes.annualSalary - ISR_EXEMPTION);
            annualISRTax = taxes.annualTax;

            if (data.includeDecimo) {
                const grossMonthly = data.frequency === 'biweekly' ? data.grossVal * 2 : data.grossVal;
                const decimo = calculateDecimo(grossMonthly);
                decimoGross = decimo.decimoGross;
                decimoNet = decimo.decimoNet;
                isDecimoIncluded = true;
                finalSS += decimoNet > 0 ? decimo.decimoSS : 0;
                finalTaxes += decimoNet > 0 ? decimo.decimoSS : 0;
            }

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
