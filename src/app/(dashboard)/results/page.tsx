"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface CostHead {
    id: string;
    head_name: string;
    actual_cr: number;
    approved_cr: number;
    final_allowed_cr: number;
    final_verdict: string;
    flag_level: string | null;
    ai_reason: string;
    ai_order_reference: string;
}

function ResultsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const caseId = searchParams.get("caseId");

    const [loading, setLoading] = useState(true);
    const [caseData, setCaseData] = useState<any>(null);
    const [costHeads, setCostHeads] = useState<CostHead[]>([]);
    const [revenue, setRevenue] = useState<any>(null);
    const [selectedItem, setSelectedItem] = useState<CostHead | null>(null);

    useEffect(() => {
        if (caseId) {
            fetchReportData();
        }
    }, [caseId]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const { data: cData } = await supabase
                .from('truing_cases')
                .select('*, licensees(name, short_name)')
                .eq('id', caseId)
                .single();

            const { data: chData } = await supabase
                .from('cost_heads')
                .select('*')
                .eq('case_id', caseId);

            const { data: revData } = await supabase
                .from('revenue_data')
                .select('*')
                .eq('case_id', caseId)
                .single();

            setCaseData(cData);
            setCostHeads(chData || []);
            setRevenue(revData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading Analysis Results...</div>;
    if (!caseData) return <div className="p-8">No Case Selected</div>;

    const totalClaimed = costHeads.reduce((s, h) => s + Number(h.actual_cr), 0);
    const totalApproved = costHeads.reduce((s, h) => s + Number(h.final_allowed_cr), 0);
    const totalDisallowed = totalClaimed - totalApproved;
    const gap = caseData.revenue_gap_cr;

    const isGap = gap > 0;

    return (
        <div className="animate-in fade-in space-y-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <button onClick={() => router.push("/")} className="hover:text-blue transition-colors">Upload & Analyse</button>
                <span>›</span>
                <span className="text-foreground">Results</span>
            </div>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-[26px] font-semibold tracking-[0.2px] text-navy">
                        Truing-Up Analysis Results
                    </h1>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {caseData.licensees.name} — FY {caseData.financial_year}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100/50 text-amber-700 hover:bg-amber-100/50">Pending Review</Badge>
                    <Button variant="outline" size="sm" onClick={() => router.push("/")} className="text-blue border-blue hover:bg-blue-50">
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> New Analysis
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/report?caseId=${caseId}`)} className="bg-blue hover:bg-blue-light">
                        Generate PDF Report →
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                <div className="relative overflow-hidden rounded-md border bg-card p-4 pt-[18px]">
                    <div className={`absolute left-0 right-0 top-0 h-[3px] ${isGap ? 'bg-red-500' : 'bg-green-500'}`} />
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">Revenue Gap / Surplus</div>
                    <div className={`mb-1 font-mono text-[22px] font-bold ${isGap ? 'text-red-500' : 'text-green-600'}`}>
                        ₹ {Math.abs(gap).toFixed(2)} Cr
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">{isGap ? 'Under-recovery (Gap)' : 'Over-recovery (Surplus)'}</div>
                </div>

                <div className="relative overflow-hidden rounded-md border bg-card p-4 pt-[18px]">
                    <div className="absolute left-0 right-0 top-0 h-[3px] bg-amber-500" />
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">Claimed by Licensee</div>
                    <div className="mb-1 font-mono text-[22px] font-bold text-amber-600">₹ {totalClaimed.toFixed(2)} Cr</div>
                    <div className="text-[11.5px] text-muted-foreground">From audited accounts</div>
                </div>

                <div className="relative overflow-hidden rounded-md border bg-card p-4 pt-[18px]">
                    <div className="absolute left-0 right-0 top-0 h-[3px] bg-blue" />
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">AT&C Loss</div>
                    <div className="mb-1 font-mono text-[22px] font-bold text-navy">{revenue?.distribution_loss_pct || 0}%</div>
                    <div className="text-[11.5px] text-muted-foreground">As per energy audit</div>
                </div>

                <div className="relative overflow-hidden rounded-md border bg-card p-4 pt-[18px]">
                    <div className="absolute left-0 right-0 top-0 h-[3px] bg-blue" />
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">Total Disallowed</div>
                    <div className="mb-1 font-mono text-[22px] font-bold text-red-500">₹ {totalDisallowed.toFixed(2)} Cr</div>
                    <div className="text-[11.5px] text-muted-foreground">Rejected + Capped logic</div>
                </div>
            </div>

            <div className="grid grid-cols-[1fr_330px] items-start gap-4">
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="border-b bg-card px-5 py-3">
                            <CardTitle className="text-[13.5px]">Line-Item Validation</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-navy">
                                    <TableRow className="hover:bg-navy">
                                        <TableHead className="text-white h-10 py-2">Line Item</TableHead>
                                        <TableHead className="text-right text-white h-10 py-2">Claimed (₹ Cr)</TableHead>
                                        <TableHead className="text-right text-white h-10 py-2">Approved Base</TableHead>
                                        <TableHead className="text-right text-white h-10 py-2">AI Allowed</TableHead>
                                        <TableHead className="text-center text-white h-10 py-2">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costHeads.map((item) => {
                                        const diff = Number(item.actual_cr) - Number(item.final_allowed_cr);
                                        const isFlagged = diff > 0.01;
                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={`cursor-pointer ${isFlagged ? 'bg-amber-50/50 hover:bg-amber-100/50' : ''}`}
                                                onClick={() => setSelectedItem(item)}
                                            >
                                                <TableCell className="py-2.5 font-medium">{item.head_name}</TableCell>
                                                <TableCell className="py-2.5 text-right font-mono">{Number(item.actual_cr).toFixed(2)}</TableCell>
                                                <TableCell className="py-2.5 text-right font-mono text-muted-foreground">{Number(item.approved_cr).toFixed(2)}</TableCell>
                                                <TableCell className="py-2.5 text-right font-mono text-blue font-bold">{Number(item.final_allowed_cr).toFixed(2)}</TableCell>
                                                <TableCell className="py-2.5 text-center">
                                                    {isFlagged ? (
                                                        <Badge variant="outline" className="text-[10px] uppercase bg-amber-100 text-amber-800 border-amber-200">Capped</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] uppercase bg-green-50 text-green-700 border-green-200">Allowed</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-2.5 text-xs text-muted-foreground">
                                <span>Total Disallowed Amount</span>
                                <span className="font-mono font-bold text-red-500 text-[13px]">₹ {totalDisallowed.toFixed(2)} Cr</span>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedItem && (
                        <Card className="border-blue shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <CardHeader className="bg-navy px-5 py-3 flex flex-row items-center justify-between space-y-0 relative">
                                <CardTitle className="text-[13px] font-semibold text-white">AI Reasoning: {selectedItem.head_name}</CardTitle>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="rounded border border-white/15 px-2 py-0.5 text-[11.5px] text-white/50 transition-colors hover:border-white/30 hover:text-white"
                                >
                                    Close ✕
                                </button>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="flex gap-3 mb-3">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white mt-0.5">
                                        1
                                    </div>
                                    <div>
                                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.8px] text-muted-foreground">KSERC Regulation Snippet</div>
                                        <div className="font-mono text-[12.5px] bg-slate-100 border rounded p-2.5 text-navy whitespace-pre-wrap">
                                            {selectedItem.ai_order_reference || 'Standard normative escalation rule applied.'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white mt-0.5">
                                        2
                                    </div>
                                    <div>
                                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.8px] text-muted-foreground">AI Rationale</div>
                                        <div className="text-[13.5px] text-foreground leading-[1.5]">
                                            {selectedItem.ai_reason}
                                        </div>
                                        {selectedItem.final_verdict !== 'approved' && (
                                            <div className="mt-2 text-red-600 bg-red-50/50 p-2 rounded text-[13px] font-medium inline-block">
                                                Disallowed: ₹{(Number(selectedItem.actual_cr) - Number(selectedItem.final_allowed_cr)).toFixed(2)} Cr
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="border-b px-5 py-3">
                            <CardTitle className="text-[13.5px]">Revenue Gap Computation</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <table className="w-full text-[13.5px]">
                                <tbody>
                                    <tr className="border-b">
                                        <td className="py-2">Approved ARR<br /><span className="text-[11px] text-muted-foreground">Commission allowed total</span></td>
                                        <td className="py-2 text-right font-mono font-medium text-blue">₹ {caseData.actual_arr_cr?.toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Actual Revenue Collected<br /><span className="text-[11px] text-muted-foreground">Realized from tariff</span></td>
                                        <td className="py-2 text-right font-mono font-medium text-green-600">₹ {caseData.revenue_actual_cr?.toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-t-2 border-border font-bold">
                                        <td className="pt-2.5">Revenue Gap / Surplus</td>
                                        <td className="pt-2.5 text-right font-mono text-[15px] text-red-600">₹ {Math.abs(gap).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className={`mt-3 flex items-center justify-between rounded p-3 border-l-[3px] ${isGap ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
                                <div className={`text-[11px] font-bold uppercase tracking-[0.8px] ${isGap ? 'text-red-700' : 'text-green-700'}`}>
                                    {isGap ? 'GAP (UNDER-RECOVERY)' : 'SURPLUS (OVER-RECOVERY)'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-navy-dark px-4 py-2.5 flex flex-row items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                            <CardTitle className="font-serif text-[12.5px] font-semibold text-white">Ask KSERC-Analyst AI</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 border-x border-b rounded-b-md overflow-hidden flex flex-col">
                            <div className="h-[250px] overflow-y-auto bg-slate-50 p-3 space-y-2">
                                <div className="max-w-[92%] self-start rounded-md border bg-white px-3 py-2 text-[13px] leading-relaxed">
                                    <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.5px] opacity-55">KSERC-Analyst</div>
                                    Analysis complete. Ask me about any line item, the revenue gap computation, or any regulatory rule applied.
                                </div>
                            </div>
                            <div className="flex border-t bg-white p-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="e.g. Why was O&M capped?"
                                    className="flex-1 rounded border px-2.5 py-1.5 text-[13px] outline-none focus:border-blue"
                                />
                                <Button size="sm" className="bg-blue hover:bg-blue-light px-3"><Send size={14} /></Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading Analysis Results...</div>}>
            <ResultsContent />
        </Suspense>
    );
}
