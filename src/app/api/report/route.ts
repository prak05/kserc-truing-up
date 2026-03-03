import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { supabase } from '@/lib/supabase';

function buildReportPrompt(caseData: Record<string, any>, costHeadsSummary: string): string {
    return `You are a legal/regulatory draftsman at KSERC. Write formal regulatory language for a 
Truing-Up Order for the following case. Use third-person, formal English. 
Do not invent numbers — use only the values provided below.

LICENSEE: ${caseData.licensees.name}
FINANCIAL YEAR: ${caseData.financial_year}
WORK ORDER: KSERC/CSO/03-05

APPROVED ARR: ₹${caseData.approved_arr_cr} Cr
ACTUAL ARR (after prudence): ₹${caseData.actual_arr_cr} Cr
REVENUE ACTUAL: ₹${caseData.revenue_actual_cr} Cr
REVENUE GAP: ₹${Math.abs(caseData.revenue_gap_cr)} Cr (${caseData.revenue_gap_cr > 0 ? 'deficit' : 'surplus'})

COST HEAD ANALYSIS SUMMARY:
${costHeadsSummary}

Write the following sections (use formal regulatory language, use newlines for spacing, avoid markdown syntax other than basic bolding if necessary):
1. Background
2. Approved ARR and Actual Performance
3. Commission's Observations on Cost Deviations (Summarize flagged items)
4. Revenue and Revenue Gap Computation
5. Order / Directions`;
}

export async function POST(req: NextRequest) {
    try {
        const { caseId } = await req.json();

        const { data: caseData, error: caseErr } = await supabase
            .from('truing_cases')
            .select('*, licensees(name)')
            .eq('id', caseId)
            .single();

        if (caseErr || !caseData) throw new Error("Case not found");

        const { data: costHeads } = await supabase
            .from('cost_heads')
            .select('*')
            .eq('case_id', caseId);

        const costHeadsSummary = costHeads?.map((h: any) =>
            `- ${h.head_name}: Claimed ₹${h.actual_cr} Cr. Allowed: ₹${h.final_allowed_cr} Cr. (${h.final_verdict}) Reason: ${h.ai_reason}`
        ).join('\n') || 'No cost heads analyzed.';

        const systemPrompt = "You are drafting an official KSERC Truing-Up Order.";
        const userPrompt = buildReportPrompt(caseData, costHeadsSummary);

        const rawResponse = await callLLM(systemPrompt, userPrompt, 1500);

        return NextResponse.json({ success: true, report_text: rawResponse });
    } catch (error: unknown) {
        console.error('Report Gen Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
