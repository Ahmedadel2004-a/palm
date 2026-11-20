import { CONFIG } from "../../../../lib/config.mjs";
import { getGasBill } from "../../../../lib/gas.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ غير مُختبَر — موقع بتروتريد محجوب من خارج مصر
export async function GET() {
  try {
    const data = await getGasBill(CONFIG.gas);
    return Response.json(data);
  } catch (e) {
    return Response.json({
      ok: false,
      utility: "gas",
      label: CONFIG.gas.label,
      company: CONFIG.gas.company,
      error: {
        code: e.code || "UNKNOWN",
        message:
          e.messageAr ||
          "موقع بتروتريد مش متاح — الموقع ده بيشتغل من جوه مصر بس، شغّل التطبيق محليًا أو على سيرفر مصري",
      },
      checkedAt: new Date().toISOString(),
      tested: false,
    });
  }
}
