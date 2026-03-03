// ============================================================
// KSERC TRUING-UP FINANCIAL FORMULAS
// All amounts in Crore Rupees (Cr) unless stated otherwise
// All percentages as decimal (0.05 = 5%)
// ============================================================

export interface CostHead {
    name: string;
    category: 'fixed' | 'variable' | 'roe';
    approved: number;    // Approved by KSERC in tariff order (₹ Cr)
    actual: number;      // Actual as per audited accounts (₹ Cr)
}

export interface RevenueData {
    unitsSoldMU: number;     // Million Units sold
    avgTariffPerUnit: number; // ₹ per unit
    reportedRevenue: number; // ₹ Cr as reported by licensee
    energyInputMU: number;   // Total energy input (before losses)
    lossesPercent: number;   // Distribution loss %
}

// ─── 1. Deviation Calculation ─────────────────────────────────────
// Δᵢ = Actual_i − Approved_i
// Δ%ᵢ = (Δᵢ / Approved_i) × 100
export function computeDeviation(approved: number, actual: number) {
    const delta = actual - approved;                    // absolute difference
    const deltaPct = approved !== 0
        ? (delta / approved) * 100                        // percentage deviation
        : actual > 0 ? 100 : 0;                           // handle zero approved
    return { delta, deltaPct };
}

// ─── 2. Prudence Check — Normative Cap ────────────────────────────
// Per KSERC Tariff Regulations, each cost category has a normative escalation cap.
// Expenses beyond the cap are disallowed unless justified with supporting evidence.
export const NORMATIVE_CAPS: Record<string, number> = {
    'O&M Expenses': 0.05,           // 5% escalation allowed over approved
    'Admin & General Expenses': 0.15, // 15% variance allowed
    'Employee Costs': 0.00,          // No escalation — actuals allowed with audit
    'Depreciation': 0.00,            // Per asset schedule — no discretion
    'Return on Equity': 0.00,        // Fixed rate on approved equity base
    'Interest on Loans': 0.00,       // Actual loan interest with agreement
    'Power Purchase Cost': 1.00,     // Full actuals allowed if PPA/KSEB bill provided
    'Transmission Charges': 1.00,    // Full actuals per KSEB transmission billing
};

// Returns the maximum allowed actual for a cost head
// max_allowed = approved × (1 + cap)
export function maxAllowedAmount(approved: number, headName: string, aicpi: number = 4.2): number {
    let cap = NORMATIVE_CAPS[headName] ?? 0.10;       // default 10% cap
    // If O&M, cap is dynamically based on AICPI rate inflation usually. 
    // We'll use the static rule for now or the given AICPI if head is O&M
    if (headName === 'O&M Expenses') {
        cap = aicpi / 100;
    }
    return approved * (1 + cap);                         // e.g. approved=100, cap=0.05 → max=105
}

// ─── 3. Allowed Amount After Prudence Check ────────────────────────
// allowed = min(actual, max_allowed)
// If actual ≤ max_allowed → fully allowed
// If actual > max_allowed → capped at max_allowed (excess disallowed)
export function computeAllowedAmount(
    approved: number,
    actual: number,
    headName: string,
    aicpi: number = 4.2
): { allowed: number; disallowed: number; verdict: string } {
    const max = maxAllowedAmount(approved, headName, aicpi);
    if (actual <= max) {
        return { allowed: actual, disallowed: 0, verdict: 'approved' };
    } else {
        // Exception for unpredictable costs which are usually passed outright
        if (['Power Purchase Cost', 'Transmission Charges'].includes(headName)) {
            return { allowed: actual, disallowed: 0, verdict: 'approved' };
        }
        const allowed = max;
        const disallowed = actual - max;                   // excess amount disallowed
        return { allowed, disallowed, verdict: 'partial' };
    }
}

// ─── 4. Annual Revenue Requirement (ARR) ──────────────────────────
// ARR_actual = Σ(allowed_i) for all cost heads i
export function computeARR(allowedCostHeads: number[]): number {
    return allowedCostHeads.reduce((sum, v) => sum + v, 0); // sum of all allowed costs
}

// ─── 5. Revenue Gap / Surplus ─────────────────────────────────────
// Revenue Gap = ARR_actual − Revenue_actual
// Positive → under-recovery (gap) → licensee's benefit
// Negative → over-recovery (surplus) → to be adjusted in next tariff
export function computeRevenueGap(arrActual: number, revenueActual: number): number {
    return arrActual - revenueActual;                    // positive = gap, negative = surplus
}

// ─── 6. Revenue Cross-Check ────────────────────────────────────────
// Computed Revenue = Units Sold (MU) × Average Tariff (₹/unit) × 10 (to convert to Cr)
export function computeExpectedRevenue(unitsMU: number, tariffPerUnit: number): number {
    return (unitsMU * tariffPerUnit) / 10;               // converts to ₹ Cr
}

// Revenue check passes if computed is within 5% of reported
export function revenueCheckPasses(reported: number, computed: number): boolean {
    if (reported === 0) return true;
    const diff = Math.abs(reported - computed) / reported;
    return diff <= 0.05;                                  // within 5% tolerance
}

// ─── 7. Energy Balance Check ──────────────────────────────────────
// Energy Balance: Input = Sales + Losses
export function energyBalanceCheck(
    inputMU: number,
    lossPercent: number,
    reportedSalesMU: number
): { valid: boolean; expectedSalesMU: number; discrepancyPct: number } {
    const expectedSales = inputMU * (1 - lossPercent / 100); // expected after losses
    const discrepancy = Math.abs(reportedSalesMU - expectedSales);
    const discrepancyPct = inputMU ? (discrepancy / inputMU) * 100 : 0;
    return {
        valid: discrepancyPct <= 2,                         // allow 2% tolerance
        expectedSalesMU: expectedSales,
        discrepancyPct,
    };
}

// ─── 8. Year-on-Year Spike Detection ──────────────────────────────
export function detectYoYSpike(
    current: number,
    prior: number,
    thresholdPct = 20
): { spiked: boolean; growthPct: number } {
    if (prior === 0) return { spiked: false, growthPct: 0 };
    const growthPct = ((current - prior) / prior) * 100;
    return { spiked: growthPct > thresholdPct, growthPct };
}

export function historicalAverageGap(gaps: number[]): number {
    if (gaps.length === 0) return 0;
    return gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
}

// ─── 10. Deviation Flag Level ─────────────────────────────────────
export function classifyDeviation(
    deltaPct: number,
    deltaAbsCr: number
): 'critical' | 'moderate' | 'info' | null {
    const absPct = Math.abs(deltaPct);
    const absVal = Math.abs(deltaAbsCr);
    if (absPct > 25 || absVal > 1) return 'critical';
    if (absPct > 10 || absVal > 0.25) return 'moderate';
    if (absPct > 5) return 'info';
    return null;
}
