import { CONFIG } from "../../../../lib/config.mjs";
import { getWaterBill } from "../../../../lib/water.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ غير مُختبَر — موقع المياه محجوب من خارج مصر
export async function GET(request) {
  const account =
    new URL(request.url).searchParams.get("account")?.trim() ||
    CONFIG.water.account;
  const config = { ...CONFIG.water, account };
  try {
    const data = await getWaterBill(config);
    return Response.json(data);
  } catch (e) {
    return Response.json({
      ok: false,
      utility: "water",
      label: config.label,
      company: config.company,
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
