import { CONFIG } from "../../../../lib/config.mjs";
import { getElectricityBill } from "../../../../lib/electricity.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getElectricityBill(CONFIG.electricity);
    return Response.json(data);
  } catch (e) {
    return Response.json({
      ok: false,
      utility: "electricity",
      label: CONFIG.electricity.label,
      company: CONFIG.electricity.company,
      error: {
        code: e.code || "UNKNOWN",
        message: e.messageAr || "حصل خطأ غير متوقع أثناء جلب فاتورة الكهرباء",
      },
      checkedAt: new Date().toISOString(),
      tested: true,
    });
  }
}
