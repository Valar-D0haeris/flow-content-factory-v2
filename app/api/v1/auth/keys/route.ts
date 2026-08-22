import { NextResponse } from "next/server";

export async function GET() {
  const gptKey = process.env.GPT_API_KEY || "fcf_live_prod_5d94f1195da6fa33e9eda9643dcb1b2d0a80f1a613b3db1c";
  const gptRoKey = process.env.GPT_READONLY_KEY || "fcf_live_ro_625eca9fabe91c96bd142e077765da1b542a50ee4eb295f1";
  const adminKey = process.env.ADMIN_API_KEY || "fcf_live_adm_5873bc4e1163e4c99d13f3302117a2747f1311c96c98fb69";

  return NextResponse.json({
    success: true,
    data: {
      gptProdKey: gptKey,
      gptReadOnlyKey: gptRoKey,
      adminKey: adminKey,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://flow-content-factory.vercel.app",
    },
  });
}
