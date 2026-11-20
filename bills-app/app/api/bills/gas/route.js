import { CONFIG } from "../../../../lib/config.mjs";
import { getGasBill } from "../../../../lib/gas.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ غير مُختبَر — موقع بتروتريد محجوب من خارج مصر
export async function GET(request) {
  const subscription =
    new URL(request.url).searchParams.get("sub")?.trim() ||
    CONFIG.gas.subscription;
  const config = { ...CONFIG.gas, subscription };
  try {
    const data = await getGasBill(config);
    return Response.json(data);
  } catch (e) {
    return Response.json({
      ok: false,
      utility: "gas",
      label: config.label,
      company: config.company,
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
