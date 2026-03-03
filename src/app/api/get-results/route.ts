import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const caseId = searchParams.get('caseId');

        if (!caseId) return NextResponse.json({ error: 'Missing caseId' }, { status: 400 });

        const cData = db.getCase(caseId);
        const chData = db.getCostHeads(caseId);
        const revData = db.getRevenueData(caseId);

        return NextResponse.json({ cData, chData, revData });
    } catch (error: any) {
        console.error("Get Results Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
