import { CONFIG } from "../../../../lib/config.mjs";
import { getWaterBill } from "../../../../lib/water.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ غير مُختبَر — موقع المياه محجوب من خارج مصر
export async function GET() {
  try {
    const data = await getWaterBill(CONFIG.water);
    return Response.json(data);
  } catch (e) {
    return Response.json({
      ok: false,
      utility: "water",
      label: CONFIG.water.label,
      company: CONFIG.water.company,
      error: {
        code: e.code || "UNKNOWN",
        message:
          e.messageAr ||
          "موقع المياه مش متاح — الموقع ده بيشتغل من جوه مصر بس، شغّل التطبيق محليًا أو على سيرفر مصري",
      },
      checkedAt: new Date().toISOString(),
      tested: false,
    });
  }
}
