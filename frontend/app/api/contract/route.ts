import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  try {
    const contractPath = path.resolve(
      process.cwd(),
      "../contracts/private_p2p_contract.py"
    );
    const contractCode = readFileSync(contractPath, "utf-8");
    return new NextResponse(contractCode, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to read contract" },
      { status: 500 }
    );
  }
}
