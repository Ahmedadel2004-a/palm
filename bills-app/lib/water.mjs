// ============================================================================
// المياه — شركة مياه الشرب بالإسكندرية (alexwater.com.eg)
// ⚠️ غير مُختبَر (UNTESTED): الموقع محجوب من خارج مصر، فاتكتب بناءً على
//    نسخة مؤرشفة (يناير 2026) من صفحة https://alexwater.com.eg/fatora_new/
//    ولازم يتجرب من شبكة مصرية.
//
// اللي عرفناه من الصفحة المؤرشفة:
//   - الفورم فيه حقل واحد: ElecID (رقم السداد الالكترونى)
//   - بيعمل: POST fatora_awco2.php بجسم { ElecID: <الرقم> }
//   - الرد: قطعة HTML بتتحقن في الصفحة وفيها بيانات الفاتورة
//
// ملاحظة: لو رقم الحساب مش هو "رقم السداد الإلكتروني"، هتلاقي رقم السداد
//         مطبوع على أي فاتورة ورقية — حطّه في WATER_ACCOUNT.
// ============================================================================

import {
  fetchHtml,
  stripTags,
  findLabeledNumber,
  findArabicMonth,
} from "./fetchHtml.mjs";

export async function getWaterBill(config) {
  const body = new URLSearchParams({ ElecID: config.account }).toString();

  const { html } = await fetchHtml(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://alexwater.com.eg/fatora_new/",
    },
    body,
  });

  const text = stripTags(html);

  // لو الرد فاضي أو فيه رسالة خطأ شائعة
  if (!text || /غير\s*صحيح|خطأ|لا\s*يوجد|رقم.*غير/.test(text)) {
    return {
      ok: false,
      utility: "water",
      label: config.label,
      company: config.company,
      error: {
        code: "NOT_FOUND",
        message:
          "الموقع مالقاش فاتورة بالرقم ده — اتأكد إن الرقم هو رقم السداد الإلكتروني المطبوع على الفاتورة الورقية",
      },
      rawExcerpt: text.slice(0, 300),
      checkedAt: new Date().toISOString(),
      tested: false,
    };
  }

  const amountDue = findLabeledNumber(text, [
    /المبلغ\s*المطلوب/,
    /الصافي\s*المطلوب/,
    /اجمالي/,
    /إجمالي/,
    /قيمة\s*الفاتورة/,
    /المطلوب\s*سداده/,
  ]);
  const consumption = findLabeledNumber(text, [
    /الاستهلاك/,
    /كمية\s*الاستهلاك/,
    /عدد\s*الوحدات/,
  ]);
  const month = findArabicMonth(text);

  return {
    ok: amountDue != null,
    utility: "water",
    label: config.label,
    company: config.company,
    name: null,
    month,
    consumption,
    consumptionUnit: "م³",
    amountDue,
    currency: "جنيه",
    paid: null, // غير مؤكد — يتحدد بعد التجربة من مصر
    sourceUrl: "https://alexwater.com.eg/fatora_new/",
    rawExcerpt: text.slice(0, 300),
    checkedAt: new Date().toISOString(),
    tested: false,
    note: "نتيجة غير مُختبَرة — لو الأرقام غلط، ابعت لقطة من نتيجة الموقع الرسمي ونظبط التحليل",
    ...(amountDue == null && {
      error: {
        code: "PARSE_ERROR",
        message:
          "وصلنا للموقع بس مقدرناش نستخرج قيمة الفاتورة — شكل الصفحة غالبًا اتغير أو الرقم مختلف",
      },
    }),
  };
}
