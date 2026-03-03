"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, FileText, FileSpreadsheet, Folder, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export default function UploadPage() {
    const router = useRouter();

    const [licensee, setLicensee] = useState<string>("");
    const [otherLicensee, setOtherLicensee] = useState("");
    const [fy, setFy] = useState("2024-25");
    const [aicpi, setAicpi] = useState("4.2");
    const [files, setFiles] = useState<(File | null)[]>([null, null, null, null]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [log, setLog] = useState<string[]>([]);

    const uploadCount = files.filter(Boolean).length;
    const canRun = files[0] && files[1] && licensee;

    const addLog = (msg: string) => {
        setLog(prev => [...prev, `> ${msg}`]);
    };

    const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = [...files];
            newFiles[index] = e.target.files[0];
            setFiles(newFiles);
        }
    };

    const runAnalysis = async () => {
        try {
            setIsUploading(true);
            setLog([]);
            setProgress(5);
            const activeLicensee = licensee === "Other" ? otherLicensee : licensee;
            setStatusText("Initializing analysis...");
            addLog(`Session: ${activeLicensee} · FY ${fy}`);

            // Upload documents to API
            setProgress(20);
            setStatusText("Uploading and parsing documents...");

            const formData = new FormData();
            formData.append("licensee", activeLicensee);
            formData.append("fy", fy);
            files.forEach((f) => {
                if (f) formData.append("file", f);
            });

            addLog("Extracting text and structured data via LLM...");
            const extractRes = await fetch("/api/extract", {
                method: "POST",
                body: formData,
            });

            const extractData = await extractRes.json();
            if (!extractRes.ok) throw new Error(extractData.error);

            setProgress(60);
            setStatusText("Extraction complete. Running analysis...");
            addLog("Data successfully structured. Running KSERC rules engine...");

            // 1. Create Truing-up Case
            const { data: licRecord } = await supabase.from('licensees').select('id').eq('short_name', activeLicensee).single();
            let licId = licRecord?.id;

            // (Simplified: In production, create licensee if missing)

            const { data: caseRecord, error: caseErr } = await supabase.from('truing_cases').insert({
                licensee_id: licId || '00000000-0000-0000-0000-000000000000', // fallback 
                financial_year: fy,
                status: 'draft'
            }).select('id').single();

            if (caseErr) throw caseErr;

            // 2. Insert cost heads
            const costHeadsToInsert = extractData.data.costHeads.map((ch: Record<string, any>) => ({
                case_id: caseRecord.id,
                head_name: ch.name,
                category: ch.category,
                approved_cr: ch.approved_cr,
                actual_cr: ch.actual_cr
            }));
            await supabase.from('cost_heads').insert(costHeadsToInsert);

            // 3. Insert revenue data
            await supabase.from('revenue_data').insert({
                case_id: caseRecord.id,
                units_sold_mu: extractData.data.revenueData.units_sold_mu,
                avg_tariff_per_unit: extractData.data.revenueData.avg_tariff_per_unit,
                reported_revenue_cr: extractData.data.revenueData.reported_revenue_cr,
                energy_input_mu: extractData.data.revenueData.energy_input_mu,
                distribution_loss_pct: extractData.data.revenueData.distribution_loss_pct,
            });

            // 4. Run Analysis Endpoint
            setProgress(80);
            setStatusText("Generating Prudence Checks & AI Veridcts...");
            addLog("Consulting knowledge base and computing deviations...");

            const analyseRes = await fetch("/api/analyse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caseId: caseRecord.id, aicpi: parseFloat(aicpi), licenseeName: activeLicensee })
            });

            const analyseData = await analyseRes.json();
            if (!analyseRes.ok) throw new Error(analyseData.error);

            setProgress(100);
            setStatusText("Complete.");
            addLog("Analysis pipeline finished successfully.");

            setTimeout(() => {
                router.push(`/results?caseId=${caseRecord.id}`);
            }, 1000);

        } catch (e: unknown) {
            console.error(e);
            setStatusText("Error.");
            const msg = e instanceof Error ? e.message : String(e);
            addLog(`ERROR: ${msg}`);
            setIsUploading(false);
        }
    };

    return (
        <div className="animate-in fade-in space-y-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Home</span>
            </div>
            <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-[26px] font-semibold tracking-wide text-navy">
                        Upload & Analyse Documents
                    </h1>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        Upload actual KSERC documents — all analysis is performed on the real data extracted from your files.
                    </p>
                </div>
            </div>

            <div className="mb-4 flex items-start gap-2.5 rounded border-l-[3px] border-cyan-600 bg-cyan-50 px-[14px] py-[11px] text-[13.5px] text-cyan-900 leading-[1.5]">
                <Info className="mt-0.5 shrink-0" size={16} />
                <div>
                    <b>How this works:</b> Upload your documents below. The AI reads them, extracts every financial figure, applies all KSERC regulatory formulas, and shows you the computed Revenue Gap or Surplus — from your actual data, not any template.
                </div>
            </div>

            <Card className="rounded-md overflow-hidden">
                <CardHeader className="border-b bg-card/50 px-5 py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-[13.5px]">Step 1 — Session Details</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Distribution Licensee</Label>
                            <Select value={licensee} onValueChange={setLicensee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="— Select licensee —" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Infoparks">Infoparks Kerala</SelectItem>
                                    <SelectItem value="Technopark">Electronics Technology Parks – Kerala (Technopark)</SelectItem>
                                    <SelectItem value="KDHP">Kanan Devan Hills Plantations Company (KDHP)</SelectItem>
                                    <SelectItem value="CSEZA">Cochin Special Economic Zone Authority (CSEZA)</SelectItem>
                                    <SelectItem value="Other">Other (specify below)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Financial Year</Label>
                            <Select value={fy} onValueChange={setFy}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2024-25">2024-25</SelectItem>
                                    <SelectItem value="2023-24">2023-24</SelectItem>
                                    <SelectItem value="2022-23">2022-23</SelectItem>
                                    <SelectItem value="2021-22">2021-22</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {licensee === "Other" && (
                        <div className="mt-3 space-y-1.5">
                            <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Licensee Name (Custom)</Label>
                            <Input
                                placeholder="Enter full licensee name..."
                                value={otherLicensee}
                                onChange={(e) => setOtherLicensee(e.target.value)}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-md overflow-hidden">
                <CardHeader className="border-b bg-card/50 px-5 py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-[13.5px]">Step 2 — Upload Documents</CardTitle>
                    <Badge variant={uploadCount >= 2 ? "default" : "secondary"} className={uploadCount >= 4 ? "bg-green-100 text-green-800" : ""}>
                        {uploadCount} / 4 uploaded
                    </Badge>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Annual Accounts (Audited)", req: true, icon: FileText, types: ".pdf,.xlsx" },
                            { label: "ARR Order (Commission-approved)", req: true, icon: FileSpreadsheet, types: ".pdf,.xlsx" },
                            { label: "Previous Truing-Up Order", req: false, icon: Folder, types: ".pdf" },
                            { label: "Tariff Schedule / Energy Audit", req: false, icon: Zap, types: ".pdf,.xlsx" }
                        ].map((box, i) => (
                            <div key={i} className="space-y-1.5">
                                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    {box.label} {box.req ? <span className="text-red-600">*Required</span> : <span className="font-normal">(Optional)</span>}
                                </div>
                                <Label
                                    htmlFor={`file-${i}`}
                                    className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-5 text-center transition-colors hover:bg-slate-50 ${files[i] ? "border-green-500 bg-green-50/50 border-solid" : "border-slate-300"
                                        }`}
                                >
                                    <box.icon className={`mb-2 h-7 w-7 ${files[i] ? "text-green-600" : "text-slate-400"}`} />
                                    <div className="text-sm font-semibold text-slate-700">
                                        {files[i] ? files[i]?.name : "Click to upload"}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {files[i] ? `${(files[i]!.size / 1024 / 1024).toFixed(2)} MB · Ready` : box.types}
                                    </div>
                                    <input
                                        type="file"
                                        id={`file-${i}`}
                                        className="hidden"
                                        accept={box.types}
                                        onChange={(e) => handleFileChange(i, e)}
                                    />
                                </Label>
                            </div>
                        ))}
                    </div>

                    <div className="my-5 flex items-center gap-2.5">
                        <div className="h-px flex-1 bg-border" />
                        <div className="text-[10px] font-bold uppercase tracking-[1.1px] text-muted-foreground">Analysis Parameters</div>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">AICPI Escalation Rate (%)</Label>
                            <Input type="number" step="0.1" value={aicpi} onChange={(e) => setAicpi(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11.5px] uppercase tracking-wider text-muted-foreground">SBI Term Deposit Rate (%)</Label>
                            <Input type="number" step="0.1" defaultValue="6.5" />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
                        <Button disabled={!canRun || isUploading} onClick={runAnalysis} className="gap-2 bg-blue hover:bg-blue-light">
                            <Play size={16} fill="currentColor" />
                            Run AI Analysis
                        </Button>
                        {!canRun && <span className="text-xs text-muted-foreground">Select Licensee and upload Annual Accounts + ARR Order to proceed.</span>}
                    </div>
                </CardContent>
            </Card>

            {isUploading && (
                <Card className="rounded-md border-amber-200">
                    <CardHeader className="bg-amber-50/50 border-b border-amber-100 flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-[13.5px] text-amber-900">AI Analysis in Progress</CardTitle>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">{progress === 100 ? 'Complete' : 'Processing...'}</Badge>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="mb-1.5 flex justify-between text-[13px]">
                            <span className="text-slate-600">{statusText}</span>
                            <span className="font-mono font-bold text-navy">{progress}%</span>
                        </div>
                        <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="mb-4 text-xs text-slate-500">
                            Please wait. Do not close this window. Analysis may take 1–3 minutes depending on document size.
                        </div>
                        <div className="h-44 overflow-y-auto rounded-md bg-navy-dark p-3 font-mono text-[11.5px] leading-[1.9] text-white/50">
                            {log.map((l, i) => (
                                <div key={i} className="animate-in slide-in-from-left-2">{l}</div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
