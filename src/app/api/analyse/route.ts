import { NextRequest, NextResponse } from 'next/server';
import {
    computeDeviation, computeAllowedAmount, computeARR,
    computeRevenueGap, revenueCheckPasses, energyBalanceCheck,
    classifyDeviation
} from '@/lib/formulas';
import { callLLM, KSERC_SYSTEM_PROMPT, buildPrudencePrompt } from '@/lib/llm';
import { retrieveContext } from '@/lib/rag';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { caseId, aicpi, licenseeName } = await req.json();

        // 1. Load case data from Supabase
        const { data: caseData, error: caseErr } = await supabase
            .from('truing_cases')
            .select('*, licensees(name, short_name)')
            .eq('id', caseId)
            .single();

        if (caseErr) throw new Error("Case not found");

        const { data: costHeads } = await supabase
            .from('cost_heads')
            .select('*')
            .eq('case_id', caseId);

        const { data: revenueData } = await supabase
            .from('revenue_data')
            .select('*')
            .eq('case_id', caseId)
            .single();

        if (!costHeads || !revenueData) throw new Error("Missing financial data");

        const licName = licenseeName || caseData.licensees.name;

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
                // Build RAG query to find similar past cases
                const ragQuery = `${licName} ${head.head_name} deviation ${Math.round(deltaPct)}%`;
                const ragContext = await retrieveContext(ragQuery, 3);

                // Call LLM for prudence reasoning
                const prudencePrompt = buildPrudencePrompt(
                    licName,
                    head.head_name,
                    Number(head.approved_cr),
                    Number(head.actual_cr),
                    deltaPct,
                    ragContext
                );

                const rawResponse = await callLLM(KSERC_SYSTEM_PROMPT, prudencePrompt, 800);

                try {
                    const parsedStr = rawResponse.replace(/```json|```/g, '').trim();
                    const parsed = JSON.parse(parsedStr);
                    aiVerdict = parsed.verdict.toLowerCase().replace(' ', '_');
                    aiAllowedCr = parsed.allowed_cr;
                    aiReason = parsed.reasoning;
                    aiOrderRef = parsed.order_reference;
                } catch (llmErr: unknown) {
                    console.error("LLM JSON Fallback", llmErr);
                    // Fallback to formula-based prudence if LLM JSON parse fails
                    const formulaResult = computeAllowedAmount(Number(head.approved_cr), Number(head.actual_cr), head.head_name, aicpi);
                    aiVerdict = formulaResult.verdict;
                    aiAllowedCr = formulaResult.allowed;
                    aiReason = `Formula-based normative cap applied for ${head.head_name}.`;
                }
            } else {
                // Safe to approve or run formula
                const formulaResult = computeAllowedAmount(Number(head.approved_cr), Number(head.actual_cr), head.head_name, aicpi);
                aiVerdict = formulaResult.verdict;
                aiAllowedCr = formulaResult.allowed;
            }

            // Update cost head in database
            await supabase.from('cost_heads').update({
                deviation_pct: deltaPct,
                flag_level: flagLevel || null,
                ai_verdict: aiVerdict,
                ai_allowed_cr: aiAllowedCr,
                ai_reason: aiReason,
                ai_order_reference: aiOrderRef,
                final_verdict: aiVerdict,
                final_allowed_cr: aiAllowedCr,
            }).eq('id', head.id);

            results.push({ ...head, deltaPct, flagLevel, aiVerdict, aiAllowedCr, aiReason });
        }

        // 4. Compute ARR and Revenue Gap
        const arrActual = computeARR(results.map(r => r.aiAllowedCr));
        const revenueGap = computeRevenueGap(arrActual, Number(revenueData.reported_revenue_cr));

        // 5. Update case with computed totals
        await supabase.from('truing_cases').update({
            actual_arr_cr: arrActual,
            revenue_actual_cr: revenueData.reported_revenue_cr,
            revenue_gap_cr: revenueGap,
            status: 'analysis_done',
            updated_at: new Date().toISOString(),
        }).eq('id', caseId);

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
