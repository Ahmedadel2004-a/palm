import { CONFIG } from "../../../../lib/config.mjs";
import { getElectricityBill } from "../../../../lib/electricity.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const ref =
    new URL(request.url).searchParams.get("ref")?.trim() ||
    CONFIG.electricity.referenceId;
  const config = { ...CONFIG.electricity, referenceId: ref };
  try {
    const data = await getElectricityBill(config);
    return Response.json(data);
  } catch (e) {
    return Response.json({
      ok: false,
      utility: "electricity",
      label: config.label,
      company: config.company,
      error: {
        code: e.code || "UNKNOWN",
        message: e.messageAr || "حصل خطأ غير متوقع أثناء جلب فاتورة الكهرباء",
      },
      checkedAt: new Date().toISOString(),
      tested: true,
    });
  }
}
