import { NextRequest, NextResponse } from 'next/server';
import {
    computeDeviation, computeAllowedAmount, computeARR,
    computeRevenueGap, revenueCheckPasses, energyBalanceCheck,
    classifyDeviation
} from '@/lib/formulas';
import { callLLM, KSERC_SYSTEM_PROMPT, buildPrudencePrompt } from '@/lib/llm';
import { retrieveContext } from '@/lib/rag';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { caseId, aicpi, licenseeName } = await req.json();

        // 1. Load case data from Local DB
        const caseData = db.getCase(caseId);
        if (!caseData) throw new Error("Case not found");

        const costHeads = db.getCostHeads(caseId);
        const revenueData = db.getRevenueData(caseId);

        if (!costHeads?.length || !revenueData) throw new Error("Missing financial data");

        const licName = licenseeName || caseData.licensees?.name || 'Local Licensee';

        // 2. Validate revenue data
        const computedRevenue = (revenueData.units_sold_mu * revenueData.avg_tariff_per_unit) / 10;
        const revenueOk = revenueCheckPasses(revenueData.reported_revenue_cr, computedRevenue);

        const energyCheck = energyBalanceCheck(
            revenueData.energy_input_mu,
            revenueData.distribution_loss_pct,
            revenueData.units_sold_mu
        );

        // 3. Process each cost head
        const results = [];
        for (const head of costHeads) {
            const { delta, deltaPct } = computeDeviation(Number(head.approved_cr), Number(head.actual_cr));
            const flagLevel = classifyDeviation(deltaPct, delta);

            let aiVerdict = 'approved';
            let aiAllowedCr = Number(head.actual_cr);
            let aiReason = 'Within normative limits — fully approved.';
            let aiOrderRef = '';

            if (flagLevel === 'critical' || flagLevel === 'moderate') {
                const ragQuery = `${licName} ${head.head_name} deviation ${Math.round(deltaPct)}%`;
                let ragContext = "";
                try {
                    ragContext = await retrieveContext(ragQuery, 3);
                } catch (e) { }

                const prudencePrompt = buildPrudencePrompt(
                    licName,
                    head.head_name,
                    Number(head.approved_cr),
                    Number(head.actual_cr),
                    deltaPct,
                    ragContext
                );
                let rawResponse: string = '';
                try {
                    rawResponse = await callLLM(KSERC_SYSTEM_PROMPT, prudencePrompt, 800);
                } catch (llmCallErr: unknown) {
                    console.warn('LLM call failed, falling back to formula:', llmCallErr);
                    const formulaResult = computeAllowedAmount(Number(head.approved_cr), Number(head.actual_cr), head.head_name, aicpi);
                    aiVerdict = formulaResult.verdict;
                    aiAllowedCr = formulaResult.allowed;
                    aiReason = `Formula fallback due to LLM error for ${head.head_name}.`;
                    rawResponse = '';
                }
                if (rawResponse) {
                    try {
                        const parsedStr = rawResponse.replace(/```json|```/g, '').trim();
                        const parsed = JSON.parse(parsedStr);
                        aiVerdict = parsed.verdict.toLowerCase().replace(' ', '_');
                        aiAllowedCr = parsed.allowed_cr;
                        aiReason = parsed.reasoning;
                        aiOrderRef = parsed.order_reference;
                    } catch (llmErr: unknown) {
                        console.error('LLM JSON parse failed, using formula fallback', llmErr);
                        const formulaResult = computeAllowedAmount(Number(head.approved_cr), Number(head.actual_cr), head.head_name, aicpi);
                        aiVerdict = formulaResult.verdict;
                        aiAllowedCr = formulaResult.allowed;
                        aiReason = `Formula fallback after JSON parse error for ${head.head_name}.`;
                    }
                }
            } else {
                const formulaResult = computeAllowedAmount(Number(head.approved_cr), Number(head.actual_cr), head.head_name, aicpi);
                aiVerdict = formulaResult.verdict;
                aiAllowedCr = formulaResult.allowed;
            }

            const updateData = {
                deviation_pct: deltaPct,
                flag_level: flagLevel || null,
                ai_verdict: aiVerdict,
                ai_allowed_cr: aiAllowedCr,
                ai_reason: aiReason,
                ai_order_reference: aiOrderRef,
                final_verdict: aiVerdict,
                final_allowed_cr: aiAllowedCr,
            };
            db.updateCostHead(head.id, updateData);

            results.push({ ...head, deltaPct, flagLevel, aiVerdict, aiAllowedCr, aiReason });
        }

        // 4. Compute ARR and Revenue Gap
        const arrActual = computeARR(results.map(r => r.aiAllowedCr));
        const revenueGap = computeRevenueGap(arrActual, Number(revenueData.reported_revenue_cr));

        // 5. Update case with computed totals
        db.updateCase(caseId, {
            actual_arr_cr: arrActual,
            revenue_actual_cr: revenueData.reported_revenue_cr,
            revenue_gap_cr: revenueGap,
            status: 'analysis_done',
            updated_at: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            arrActual,
            revenueGap,
            flagsRaised: results.filter(r => r.flagLevel).length,
            revenueCheckOk: revenueOk,
            energyBalanceOk: energyCheck.valid,
        });
    } catch (error: unknown) {
        console.error('Analysis Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
