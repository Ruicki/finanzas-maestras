import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { processRecurringExpenses } from '@/app/actions/budget/expenses';

function isValidCronSecret(authHeader: string | null, cronSecret: string): boolean {
    if (!authHeader) return false;
    const expected = Buffer.from(`Bearer ${cronSecret}`);
    const received = Buffer.from(authHeader);
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    if (!isValidCronSecret(authHeader, cronSecret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processRecurringExpenses();

    return NextResponse.json({
        success: true,
        processed: result.processed,
        created: result.created,
        errors: result.errors,
    });
}
