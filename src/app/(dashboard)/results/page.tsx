"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2, AlertTriangle, XCircle, Info, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";

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
            const res = await fetch(`/api/get-results?caseId=${caseId}`);
            if (!res.ok) throw new Error("Failed to fetch results");
            const data = await res.json();

            setCaseData(data.cData);
            setCostHeads(data.chData || []);
            setRevenue(data.revData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-cyan-500 animate-spin"></div>
                <div className="text-navy font-medium animate-pulse">Loading Analysis Results...</div>
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="flex justify-center p-12">
                <Card className="w-full max-w-md p-8 text-center shadow-lg border-red-200">
                    <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-navy mb-2">Analysis Not Found</h2>
                    <p className="text-muted-foreground mb-6">Could not locate the requested Truing-Up session.</p>
                    <Button onClick={() => router.push("/")} className="bg-navy">Return Home</Button>
                </Card>
            </div>
        );
    }

    const totalClaimed = costHeads.reduce((s, h) => s + Number(h.actual_cr), 0);
    const totalApproved = costHeads.reduce((s, h) => s + Number(h.final_allowed_cr), 0);
    const totalDisallowed = totalClaimed - totalApproved;
    const gap = caseData.revenue_gap_cr;

    const isGap = gap > 0;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-6xl space-y-6 pt-4 pb-12">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium tracking-wide">
                <button onClick={() => router.push("/")} className="transition-colors hover:text-blue">Dashboard</button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-navy font-semibold">Analysis Results</span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-navy mb-1 leading-none">
                        Truing-Up Results
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[14px] text-muted-foreground font-medium">
                            {caseData.licensees.name}
                        </span>
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 font-mono text-[10px] tracking-widest">
                            FY {caseData.financial_year}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 shadow-sm border-amber-200 px-3 py-1 uppercase tracking-wider text-[10px]">
                        Pending Review
                    </Badge>
                    <Button variant="outline" onClick={() => router.push("/")} className="text-blue border-blue/20 hover:bg-blue-50 shadow-sm">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
                    </Button>
                    <Button onClick={() => router.push(`/report?caseId=${caseId}`)} className="bg-navy hover:bg-navy-dark shadow-md shadow-navy/20">
                        <FileText className="mr-2 h-4 w-4" /> Generate Order Draft
                    </Button>
                </div>
            </div>

            {/* Top Stat Cards - 3D Effect */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    {
                        title: "Revenue Gap / Surplus",
                        value: `₹${Math.abs(gap).toFixed(2)} Cr`,
                        sub: isGap ? 'UNDER-RECOVERY (GAP)' : 'OVER-RECOVERY (SURPLUS)',
                        color: isGap ? 'border-t-red-500' : 'border-t-green-500',
                        textColor: isGap ? 'text-red-600' : 'text-green-600',
                        bg: 'bg-white'
                    },
                    {
                        title: "Claimed by Licensee",
                        value: `₹${totalClaimed.toFixed(2)} Cr`,
                        sub: 'FROM AUDITED ACCOUNTS',
                        color: 'border-t-amber-500',
                        textColor: 'text-amber-600',
                        bg: 'bg-white'
                    },
                    {
                        title: "AT&C Loss Computed",
                        value: `${revenue?.distribution_loss_pct || 0}%`,
                        sub: 'DISTRIBUTION EFFICIENCY',
                        color: 'border-t-blue',
                        textColor: 'text-navy',
                        bg: 'bg-white'
                    },
                    {
                        title: "Total AI Disallowed",
                        value: `₹${totalDisallowed.toFixed(2)} Cr`,
                        sub: 'REJECTED + CAPPED TOTAL',
                        color: 'border-t-slate-800',
                        textColor: totalDisallowed > 0 ? 'text-red-600' : 'text-slate-600',
                        bg: totalDisallowed > 0 ? 'bg-red-50/30' : 'bg-white'
                    },
                ].map((stat, i) => (
                    <motion.div key={i} variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }} className="transition-all duration-200">
                        <Card className={`overflow-hidden border-t-[3px] shadow-md ${stat.color} ${stat.bg}`}>
                            <CardContent className="p-5">
                                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {stat.title}
                                </div>
                                <div className={`mb-1.5 font-mono text-3xl font-bold tracking-tight ${stat.textColor}`}>
                                    {stat.value}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-400">
                                    {stat.sub}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-[1fr_360px] items-start gap-6 pt-2">

                {/* Main Table */}
                <motion.div variants={itemVariants} className="space-y-6">
                    <Card className="shadow-md overflow-hidden border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b px-6 py-4">
                            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                                Line-Item Prudence Validation
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Click any row to view the AI&apos;s regulatory reasoning.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-navy text-white">
                                    <TableRow className="hover:bg-navy">
                                        <TableHead className="text-white h-11 px-6">Line Item</TableHead>
                                        <TableHead className="text-right text-white h-11">Claimed (₹ Cr)</TableHead>
                                        <TableHead className="text-right text-white h-11">Approved Base</TableHead>
                                        <TableHead className="text-right text-white h-11 font-bold">AI Allowed</TableHead>
                                        <TableHead className="text-center text-white h-11 px-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costHeads.map((item) => {
                                        const diff = Number(item.actual_cr) - Number(item.final_allowed_cr);
                                        const isFlagged = diff > 0.01;
                                        const isSelected = selectedItem?.id === item.id;

                                        return (
                                            <TableRow
                                                key={item.id}
                                                className={`cursor-pointer transition-colors
                                                    ${isSelected ? 'bg-blue/5 border-l-4 border-l-blue hover:bg-blue/10' : 'border-l-4 border-l-transparent'}
                                                    ${isFlagged && !isSelected ? 'hover:bg-amber-50/50' : 'hover:bg-slate-50'}
                                                `}
                                                onClick={() => setSelectedItem(item)}
                                            >
                                                <TableCell className="py-3.5 px-6 font-medium text-navy">{item.head_name}</TableCell>
                                                <TableCell className="py-3.5 text-right font-mono text-slate-600">{Number(item.actual_cr).toFixed(2)}</TableCell>
                                                <TableCell className="py-3.5 text-right font-mono text-muted-foreground">{Number(item.approved_cr).toFixed(2)}</TableCell>
                                                <TableCell className={`py-3.5 text-right font-mono font-bold ${isFlagged ? 'text-red-600' : 'text-green-600'}`}>
                                                    {Number(item.final_allowed_cr).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-3.5 px-6 text-center">
                                                    {isFlagged ? (
                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-red-50 text-red-700 border-red-200">
                                                            <AlertTriangle className="mr-1 h-3 w-3" /> Capped
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-green-50 text-green-700 border-green-200 pt-0.5">
                                                            <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            <div className="flex items-center justify-between border-t bg-slate-50 px-6 py-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Disallowed Amount</span>
                                <span className="font-mono font-bold text-red-600 text-base">₹ {totalDisallowed.toFixed(2)} Cr</span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Right Column: Reasoning Drilldown & Summary */}
                <motion.div variants={itemVariants} className="space-y-6">

                    <AnimatePresence mode="popLayout">
                        {selectedItem ? (
                            <motion.div
                                key="drilldown"
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            >
                                <Card className="shadow-lg border-blue shadow-blue/10 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue"></div>
                                    <CardHeader className="bg-slate-50 border-b px-5 py-4 flex flex-row items-center justify-between space-y-0">
                                        <CardTitle className="text-[14px] font-bold text-navy flex items-center gap-2">
                                            <Info className="h-4 w-4 text-blue" />
                                            AI Reasoning Details
                                        </CardTitle>
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            className="rounded-full bg-slate-200/50 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-navy transition-colors"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        <div>
                                            <div className="text-[15px] font-bold text-navy mb-1">{selectedItem.head_name}</div>
                                            <div className="flex items-center gap-3 text-sm font-mono mt-2 p-3 bg-slate-50 rounded-md border text-slate-600">
                                                <div className="flex-1 text-center border-r border-slate-200">Claimed<br /><span className="font-bold text-navy">₹{Number(selectedItem.actual_cr).toFixed(2)}</span></div>
                                                <div className="flex-1 text-center">Allowed<br /><span className={`font-bold ${Number(selectedItem.actual_cr) > Number(selectedItem.final_allowed_cr) ? 'text-red-600' : 'text-green-600'}`}>₹{Number(selectedItem.final_allowed_cr).toFixed(2)}</span></div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                            {/* Step 1 */}
                                            <div className="relative flex items-start gap-4">
                                                <div className="flex items-center justify-center w-7 h-7 text-[11px] font-bold text-white bg-navy rounded-full ring-4 ring-white z-10 shrink-0 shadow-sm">
                                                    1
                                                </div>
                                                <div className="flex-1 rounded-md bg-white border p-3 shadow-sm relative pt-4">
                                                    <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">KSERC Regulation</span>
                                                    <div className="font-mono text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                        {selectedItem.ai_order_reference || 'Normative escalation limits strictly enforced against prior approved ARR base.'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Step 2 */}
                                            <div className="relative flex items-start gap-4">
                                                <div className="flex items-center justify-center w-7 h-7 text-[11px] font-bold text-white bg-blue rounded-full ring-4 ring-white z-10 shrink-0 shadow-sm mt-1">
                                                    2
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1 block">Decision Rationale</span>
                                                    <div className="text-[13.5px] text-slate-800 leading-relaxed bg-blue/5 p-3 rounded-md border border-blue/10">
                                                        {selectedItem.ai_reason}
                                                    </div>

                                                    {Number(selectedItem.actual_cr) > Number(selectedItem.final_allowed_cr) && (
                                                        <div className="mt-3 text-red-700 bg-red-50 border border-red-100 p-2.5 rounded-md text-[13px] font-semibold flex items-center justify-between shadow-sm">
                                                            <span>Total Disallowed:</span>
                                                            <span className="font-mono">
                                                                ₹{(Number(selectedItem.actual_cr) - Number(selectedItem.final_allowed_cr)).toFixed(2)} Cr
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="bg-slate-50 border-t p-3 flex justify-end gap-2">
                                        <Button variant="outline" size="sm" className="text-xs h-8">Modify Value manually</Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="summary"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="shadow-md">
                                    <CardHeader className="border-b px-5 py-4 bg-slate-50/50">
                                        <CardTitle className="text-[14px]">Revenue Gap Overview</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <table className="w-full text-[13.5px]">
                                            <tbody>
                                                <tr className="border-b bg-white">
                                                    <td className="py-3 px-5 text-slate-600">Approved ARR<br /><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Commission Allowance</span></td>
                                                    <td className="py-3 px-5 text-right font-mono font-bold text-blue text-[15px]">₹ {caseData.actual_arr_cr?.toFixed(2)}</td>
                                                </tr>
                                                <tr className="border-b bg-white">
                                                    <td className="py-3 px-5 text-slate-600">Actual Revenue<br /><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Realized from standard tariff</span></td>
                                                    <td className="py-3 px-5 text-right font-mono font-bold text-green-600 text-[15px]">₹ {caseData.revenue_actual_cr?.toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className={`p-4 ${isGap ? 'bg-red-50' : 'bg-green-50'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[11px] font-bold uppercase tracking-widest ${isGap ? 'text-red-700' : 'text-green-700'}`}>
                                                    {isGap ? 'Final Under-Recovery' : 'Final Over-Recovery'}
                                                </span>
                                            </div>
                                            <div className={`text-right font-mono text-3xl font-bold ${isGap ? 'text-red-700' : 'text-green-700'}`}>
                                                ₹ {Math.abs(gap).toFixed(2)} Cr
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Ask AI Chat Box (Always Visible beneath) */}
                    <Card className="shadow-md overflow-hidden border-slate-300">
                        <CardHeader className="bg-navy px-4 py-3 flex flex-row items-center gap-2.5">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </div>
                            <CardTitle className="font-serif text-[13px] font-semibold text-white tracking-wide">
                                KSERC-Analyst Chat
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex flex-col bg-slate-50">
                            <div className="h-[200px] overflow-y-auto p-4 space-y-3">
                                <div className="max-w-[90%] self-start rounded-b-xl rounded-tr-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm">
                                    <div className="mb-1 text-[9px] font-bold uppercase tracking-[1px] text-blue">KSERC-Analyst System</div>
                                    Analysis complete for <b>{caseData.licensees.short_name}</b>. I am ready to answer any questions regarding the regulatory formulas applied or specific deductions. How can I help?
                                </div>
                            </div>
                            <div className="flex border-t bg-white p-2 gap-2">
                                <input
                                    type="text"
                                    placeholder="e.g. Why was Employee Cost capped?"
                                    className="flex-1 rounded-md border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition-colors focus:border-blue focus:bg-white focus:ring-1 focus:ring-blue"
                                />
                                <Button size="sm" className="bg-navy hover:bg-navy-dark px-3 rounded-md shadow-sm"><Send size={14} /></Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}

// Chevron icon missing in imports
function ChevronRight(props: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6" /></svg>
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center animate-pulse font-medium text-navy">Loading Analysis Engine...</div>}>
            <ResultsContent />
        </Suspense>
    );
}
