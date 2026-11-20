// ============================================================================
// الكهرباء — شركة الاسكندرية لتوزيع الكهرباء (alex.ahram.org.eg)
// ✅ مُختبَر ومتحقق منه على الصفحات الحقيقية بتاريخ 20 نوفمبر 2026
//
// صفحة الاستهلاكات: GET /home/PreviousConsumption?referenceID=XXXX
//   - الاسم:        <span>الاسم</span> <strong>الاسم الكامل</strong>
//   - أشهر محاسبة:  <div class="panel-heading">اشهر محاسبة</div><div class="panel-body">202611</div>
//   - جدول:         <tr><td>92</td><td>نوفمبر</td><td>2026</td></tr> ...
//
// صفحة الفاتورة:   GET /home/InvoiceDetails?Reference=XXXX  (انتبه: Reference بحرف كبير)
//   - 3 جداول <tr><th>مفتاح</th><td>قيمة</td></tr> فيها:
//     شهر الإصدار، أشهر مديونية، استهلاك، قيمة الاستهلاك، اجمالي الفاتورة
//   - حالة السداد:  <span class="label label-success">مدفوعة</span> أو "غير مدفوعة"
// ============================================================================

import { fetchHtml, parseKeyValueTables, stripTags, toNumber } from "./fetchHtml.mjs";

export async function getElectricityBill(config) {
  // نجيب الصفحتين بالتوازي
  const [prev, invoice] = await Promise.all([
    fetchHtml(config.previousConsumptionUrl(config.referenceId)),
    fetchHtml(config.invoiceUrl(config.referenceId)),
  ]);

  const prevData = parsePreviousConsumption(prev.html);
  const invData = parseInvoice(invoice.html);

  if (!invData.amountDue && !prevData.name) {
    throw Object.assign(new Error("parse"), {
      code: "PARSE_ERROR",
      messageAr:
        "صفحة الكهرباء اتغيرت عن المتوقع — محتاجين نحدّث الكود (قسم الكهرباء في lib/electricity.mjs)",
    });
  }

  return {
    ok: true,
    utility: "electricity",
    label: config.label,
    company: config.company,
    name: prevData.name,
    month: invData.month || prevData.billingMonth,
    consumption: invData.consumption ?? prevData.latest?.kwh ?? null,
    consumptionUnit: "ك.و.س",
    amountDue: invData.amountDue,
    currency: "جنيه",
    // أشهر مديونية = 0 يعني مفيش متأخرات
    paid: invData.paid ?? (invData.debtMonths === 0 ? true : null),
    debtMonths: invData.debtMonths,
    history: prevData.history,
    sourceUrl: config.invoiceUrl(config.referenceId),
    checkedAt: new Date().toISOString(),
    tested: true,
  };
}

export function parseInvoice(html) {
  const kv = parseKeyValueTables(html);
  const paid = /غير\s*مدفوعة/.test(html)
    ? false
    : /مدفوعة/.test(html)
    ? true
    : null;
  return {
    month: kv["شهر الإصدار"] || kv["شهر الاصدار"] || null,
    consumption: toNumber(kv["استهلاك"]),
    amountDue: toNumber(kv["اجمالي الفاتورة"] || kv["إجمالي الفاتورة"]),
    debtMonths: toNumber(kv["أشهر مديونية"] ?? kv["اشهر مديونية"]),
    consumptionValue: toNumber(kv["قيمة الاستهلاك"]),
    paid,
  };
}

export function parsePreviousConsumption(html) {
  // اسم المشترك
  const nameM = html.match(
    /<span>\s*الاسم\s*<\/span>\s*<strong>([^<]+)<\/strong>/
  );
  const name = nameM ? nameM[1].trim() : null;

  // أشهر محاسبة (مثال: 202611) من بلوكات panel-heading/panel-body
  let billingMonth = null;
  const panelRe =
    /<div class="panel-heading"[^>]*>([^<]*)<\/div>\s*<div class="panel-body"[^>]*>([^<]*)<\/div>/gi;
  let pm;
  while ((pm = panelRe.exec(html))) {
    if (stripTags(pm[1]).includes("محاسبة")) {
      billingMonth = stripTags(pm[2]);
      break;
    }
  }

  // جدول الاستهلاكات السابقة
  const history = [];
  const rowRe =
    /<tr[^>]*>\s*<td>\s*([\d.,]+)\s*<\/td>\s*<td>\s*([^<0-9]+?)\s*<\/td>\s*<td>\s*(\d{4})\s*<\/td>\s*<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html))) {
    history.push({
      kwh: toNumber(rm[1]),
      month: rm[2].trim(),
      year: parseInt(rm[3], 10),
    });
  }

  return { name, billingMonth, history, latest: history[0] || null };
    }
