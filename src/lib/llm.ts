// ============================================================
// Multi-provider LLM wrapper with automatic fallback
// Primary: Groq (fast, free 14,400 req/day)
// Fallback: OpenRouter/DeepSeek (free 50 req/day, stronger reasoning)
// ============================================================

import OpenAI from 'openai';

export async function callLLM(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 1500
): Promise<string> {
    // Initialize on demand to ensure we use runtime env vars
    const groqClient = new OpenAI({
        baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
    });

    const openrouterClient = new OpenAI({
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
            'HTTP-Referer': 'https://kserc-truing-up.vercel.app',
            'X-Title': 'KSERC AI Truing-Up Tool',
        },
    });

    try {
        const response = await groqClient.chat.completions.create({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.1,  // low temperature for consistent regulatory reasoning
        });
        return response.choices[0].message.content || '';
    } catch (groqError) {
        console.error('Groq LLM Failed:', groqError);
        throw new Error('Primary LLM (Groq) failed and OpenRouter fallback is disabled.');
    }
}

// ─── KSERC-specific prompt templates ─────────────────────────────

export const KSERC_SYSTEM_PROMPT = `You are a senior regulatory analyst at the Kerala State Electricity Regulatory 
Commission (KSERC). You are conducting the Truing-Up of accounts for small distribution licensees. 
You apply the following principles:
1. KSERC Tariff Regulations 2014 and 2020 govern allowable costs.
2. Prudence checks ensure only genuinely incurred and justifiable costs are allowed.
3. Normative escalation caps apply to controllable costs (O&M, Admin expenses).
4. Uncontrollable costs (power purchase, transmission) are allowed at actuals with proof.
5. You always cite specific order numbers and dates when referencing precedents.
6. Your verdicts are one of: APPROVED, PARTIAL APPROVAL, DISALLOWED.
7. For partial approval, you state the allowed amount and the disallowed amount with reason.`;

export function buildPrudencePrompt(
    licensee: string,
    costHead: string,
    approved: number,
    actual: number,
    deltaPct: number,
    ragContext: string
): string {
    return `Licensee: ${licensee}
Cost Head: ${costHead}
KSERC Approved Amount: ₹${approved.toFixed(2)} Cr
Actual Amount Claimed: ₹${actual.toFixed(2)} Cr
Deviation: ${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}% (${deltaPct > 0 ? 'overrun' : 'under-run'})

Relevant precedents from past KSERC orders:
${ragContext}

Based on the above, provide:
1. VERDICT: [APPROVED / PARTIAL APPROVAL / DISALLOWED]
2. ALLOWED AMOUNT: ₹X.XX Cr
3. DISALLOWED AMOUNT: ₹X.XX Cr (if any)
4. REASONING: 2-3 sentences citing the applicable regulation or past order.
5. ORDER REFERENCE: Quote the specific past order number you are relying on.

Format your response exactly as the following JSON object:
{
  "verdict": "APPROVED|PARTIAL APPROVAL|DISALLOWED",
  "allowed_cr": 0.00,
  "disallowed_cr": 0.00,
  "reasoning": "...",
  "order_reference": "..."
}`;
}
