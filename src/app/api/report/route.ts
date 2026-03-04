import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

function buildReportPrompt(caseData: Record<string, any>, costHeadsSummary: string): string {
    const approvedArr = (caseData.approved_arr_cr || caseData.actual_arr_cr || 0).toFixed(2);
    const actualArr = (caseData.actual_arr_cr || 0).toFixed(2);
    const revenueActual = (caseData.revenue_actual_cr || 0).toFixed(2);
    const revenueGap = Math.abs(caseData.revenue_gap_cr || 0).toFixed(2);
    const gapType = (caseData.revenue_gap_cr || 0) > 0 ? 'deficit' : 'surplus';

    return `You are a legal/regulatory draftsman at KSERC. Write formal regulatory language for a 
Truing-Up Order for the following case. Use third-person, formal English. 
Do not invent numbers — use only the values provided below.
Your report MUST use clear bullet points for lists and markdown tables for data where appropriate. Avoid long continuous descriptive paragraphs.

CRITICAL FORMATTING RULES:
1. ALWAYS use the Rupee symbol (₹) before every single monetary amount (e.g., ₹10.50 Cr).
2. ALL numerical values MUST be rounded to exactly 2 decimal places (e.g., 331.56 Cr, not 331.5599...).
3. NEVER include reasoning, observations, or long text inside the data tables. Tables should only contain categories and rounded figures.
4. DO NOT use superscript symbols, footnotes (like ¹), or any non-numeric characters inside the numeric columns of the tables.
5. ALL reasoning and observations must be placed in a dedicated section BELOW the tables.

LICENSEE: ${caseData.licensees?.name}
FINANCIAL YEAR: ${caseData.financial_year}

APPROVED ARR: ₹${approvedArr} Cr
ACTUAL ARR (after prudence): ₹${actualArr} Cr
REVENUE ACTUAL: ₹${revenueActual} Cr
REVENUE GAP: ₹${revenueGap} Cr (${gapType})

COST HEAD ANALYSIS SUMMARY:
${costHeadsSummary}

Write the following sections (use formal regulatory language, use newlines for spacing):
1. Background of the Truing-Up Case for ${caseData.licensees?.name} for the FY ${caseData.financial_year}
2. Financial Performance Tables:
   - Approved ARR Table (Columns: Category, Amount in ₹ Cr)
   - Revenue Gap Table (Columns: Category, Amount in ₹ Cr)
   (Tables MUST ONLY contain figures with ₹ symbol and be rounded to 2 decimals).
3. Commission's Detailed Observations and Reasoning (Detailed bullet points for EVERY item. For each item, clearly explain the reason for the verdict based on the provided summary. This section MUST be below the tables.)
4. Controllable vs. Uncontrollable Expenses (Table format. O&M and Admin are controllable; Power Purchase, Transmission, and Depreciation are uncontrollable. Columns: Category, Controllability, Claimed (₹ Cr), Allowed (₹ Cr))
5. Summary Order / Directions`;
}

export async function POST(req: NextRequest) {
    try {
        const { caseId } = await req.json();

        const caseData = db.getCase(caseId);
        if (!caseData) throw new Error("Case not found");

        const costHeads = db.getCostHeads(caseId);

        const costHeadsSummary = costHeads?.map((h: any) =>
            `- ${h.head_name} (${h.category}): Claimed ₹${Number(h.actual_cr).toFixed(2)} Cr. Allowed: ₹${Number(h.final_allowed_cr).toFixed(2)} Cr. (${h.final_verdict}) Reason: ${h.ai_reason}`
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
