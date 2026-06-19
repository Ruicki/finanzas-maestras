import { NextRequest, NextResponse } from 'next/server';
import { processRecurringExpenses } from '@/app/actions/budget/expenses';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
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
