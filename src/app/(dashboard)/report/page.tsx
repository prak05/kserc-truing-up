"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AlertTriangle, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function ReportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const caseId = searchParams.get("caseId");

    const [loading, setLoading] = useState(true);
    const [caseData, setCaseData] = useState<Record<string, any> | null>(null);
    const [costHeads, setCostHeads] = useState<any[]>([]);
    const [revenue, setRevenue] = useState<Record<string, any> | null>(null);
    const [reportText, setReportText] = useState("");
    const [generatingText, setGeneratingText] = useState(false);

    const [preparedBy, setPreparedBy] = useState("KSERC Analytical Officer");
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const fetchData = async () => {
            try {
                setLoading(true);
                const { data: cData } = await supabase.from('truing_cases').select('*, licensees(name)').eq('id', caseId).single();
                const { data: chData } = await supabase.from('cost_heads').select('*').eq('case_id', caseId);
                const { data: revData } = await supabase.from('revenue_data').select('*').eq('case_id', caseId).single();

                setCaseData(cData);
                setCostHeads(chData || []);
                setRevenue(revData);

                // Generate narrative
                setGeneratingText(true);
                const res = await fetch("/api/report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ caseId: caseId })
                });
                const data = await res.json();
                if (res.ok) setReportText(data.report_text);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
                setGeneratingText(false);
            }
        };

        if (caseId) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [caseId]);

    const downloadPDF = () => {
        const doc = new jsPDF();
        const isGap = (caseData?.revenue_gap_cr || 0) > 0;

        // Header
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("KERALA STATE ELECTRICITY REGULATORY COMMISSION", 105, 15, { align: "center" });
        doc.setFontSize(11);
        doc.text(`TRUING-UP ORDER: FY ${caseData?.financial_year || ''}`, 105, 22, { align: "center" });

        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.text(`Licensee: ${caseData?.licensees?.name || ''}`, 14, 35);
        doc.text(`Order Date: ${orderDate}`, 14, 40);
        doc.text(`Prepared By: ${preparedBy}`, 14, 45);

        // Table
        doc.setFont("times", "bold");
        doc.text("1. Component-wise Analysis (₹ Crore)", 14, 60);

        const tableBody = costHeads.map(h => [
            h.head_name,
            Number(h.actual_cr).toFixed(2),
            Number(h.final_allowed_cr).toFixed(2),
            (Number(h.actual_cr) - Number(h.final_allowed_cr)).toFixed(2),
            h.final_verdict.toUpperCase()
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['Cost Head', 'Claimed', 'Allowed', 'Disallowed', 'Verdict']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [26, 53, 87] },
            styles: { fontSize: 9, font: 'times' }
        });

        const finalY = (doc as Record<string, any>).lastAutoTable.finalY + 15;

        // Financial Totals
        doc.setFont("times", "bold");
        doc.text("2. Revenue Gap Computation (₹ Crore)", 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            body: [
                ['Net Approved ARR', Number(caseData?.actual_arr_cr || 0).toFixed(2)],
                ['Actual Revenue Collected', Number(caseData?.revenue_actual_cr || 0).toFixed(2)],
                [`Revenue ${isGap ? 'Gap' : 'Surplus'}`, Math.abs(caseData?.revenue_gap_cr || 0).toFixed(2)]
            ],
            theme: 'plain',
            styles: { fontSize: 10, font: 'times' }
        });

        const narrativeY = (doc as Record<string, any>).lastAutoTable.finalY + 15;

        // Narrative Text
        doc.setFont("times", "bold");
        doc.text("3. Commission's Observations and Directions", 14, narrativeY);
        doc.setFont("times", "normal");

        const splitText = doc.splitTextToSize(reportText + (remarks ? `\n\nRemarks: ${remarks}` : ''), 180);
        doc.text(splitText, 14, narrativeY + 10);

        doc.save(`KSERC_TruingUp_Order_${(caseData?.financial_year || '').replace('-', '_')}.pdf`);
    };

    if (loading) return <div className="p-8">Loading Report Data...</div>;

    if (!caseId || !caseData) {
        return (
            <div className="p-8 space-y-4 animate-in fade-in">
                <div className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <AlertTriangle className="mt-0.5" size={18} />
                    <div>
                        <strong>No analysis results found.</strong>
                        <p className="text-sm mt-1">Please select a case to generate a report for, or run a new analysis.</p>
                        <Button variant="link" onClick={() => router.push("/")} className="px-0 mt-2 text-amber-700 font-semibold p-0 h-auto">
                            Run an analysis first →
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in space-y-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <button onClick={() => router.push("/")} className="hover:text-blue transition-colors">Home</button>
                <span>›</span>
                <button onClick={() => router.push(`/results?caseId=${caseId}`)} className="hover:text-blue transition-colors">Results</button>
                <span>›</span>
                <span className="text-foreground">Generate Report</span>
            </div>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-[26px] font-semibold tracking-[0.2px] text-navy">
                        Generate Truing-Up Order
                    </h1>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {caseData.licensees.name} — FY {caseData.financial_year}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/results?caseId=${caseId}`)}>
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Results
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4 items-start">
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="border-b bg-card px-5 py-3">
                            <CardTitle className="text-[13.5px]">Report Checklist</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-[13.5px] text-green-700">
                                <CheckCircle2 size={16} /> Data Extracted Successfully
                            </div>
                            <div className="flex items-center gap-2 text-[13.5px] text-green-700">
                                <CheckCircle2 size={16} /> Prudence Checks Applied
                            </div>
                            <div className={`flex items-center gap-2 text-[13.5px] ${generatingText ? 'text-amber-600' : 'text-green-700'}`}>
                                {generatingText ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" /> : <CheckCircle2 size={16} />}
                                {generatingText ? 'Drafting Narrative Text via AI...' : 'Narrative Drafted'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-card px-5 py-3">
                            <CardTitle className="text-[13.5px]">Download Report</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Prepared By</Label>
                                    <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="e.g. Prakhar Sharma" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Date of Order</Label>
                                    <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1.5 mb-5">
                                <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Additional Remarks (Optional)</Label>
                                <Textarea
                                    placeholder="Any additional commission remarks..."
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                />
                            </div>

                            <Button disabled={generatingText} onClick={downloadPDF} className="bg-blue hover:bg-blue-light gap-2 w-full sm:w-auto">
                                <Download size={16} /> Download PDF Report
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="border-b bg-card px-5 py-3">
                        <CardTitle className="text-[13.5px]">Session Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2 text-[13.5px]">
                        <div className="flex justify-between pb-2 border-b">
                            <span className="text-muted-foreground">Appr. ARR</span>
                            <span className="font-mono text-navy font-medium">₹ {caseData.actual_arr_cr?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pb-2 border-b">
                            <span className="text-muted-foreground">Revenue</span>
                            <span className="font-mono text-green-700 font-medium">₹ {caseData.revenue_actual_cr?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pb-2 font-bold">
                            <span>Gap / Sur.</span>
                            <span className="font-mono text-red-600">₹ {Math.abs(caseData.revenue_gap_cr)?.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-4">
                <CardHeader className="border-b bg-card px-5 py-3">
                    <CardTitle className="text-[13.5px]">Generated AI Narrative Review</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    {generatingText ? (
                        <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded"></div>
                                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Textarea
                            className="min-h-[300px] font-serif text-[14px] leading-relaxed resize-y"
                            value={reportText}
                            onChange={e => setReportText(e.target.value)}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading Report...</div>}>
            <ReportContent />
        </Suspense>
    );
}
