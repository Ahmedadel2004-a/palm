// ============================================================================
// الغاز — بتروتريد Petrotrade (www.petrotrade.com.eg/billing/billq.aspx)
// ⚠️ غير مُختبَر (UNTESTED): الموقع محجوب من خارج مصر، فاتكتب بناءً على
//    نسخة مؤرشفة (يناير 2025) من الصفحة ولازم يتجرب من شبكة مصرية.
//
// آلية العمل (ASP.NET WebForms):
//   1) GET billq.aspx  ← ناخد الحقول المخفية __VIEWSTATE / __VIEWSTATEGENERATOR
//      / __EVENTVALIDATION + الكوكيز
//   2) POST billq.aspx ← رقم المشترك (16 رقم) متقسم على 8 خانات T1..T8
//      (كل خانة رقمين) + زرار BCrn=اعرض
//   3) الرد صفحة HTML فيها بيانات الفاتورة — بنستخرج منها بالبحث عن الوصف
//      العربي المجاور للأرقام (تحليل عام لأن شكل صفحة النتيجة غير مؤكد)
// ============================================================================

import {
  fetchHtml,
  stripTags,
  findLabeledNumber,
  findArabicMonth,
} from "./fetchHtml.mjs";

function hiddenField(html, name) {
  const re = new RegExp(
    `name="${name}"[^>]*value="([^"]*)"`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : "";
}

export async function getGasBill(config) {
  const sub = String(config.subscription).replace(/\D/g, "");
  if (sub.length !== 16) {
    return {
      ok: false,
      utility: "gas",
      label: config.label,
      company: config.company,
      error: {
        code: "BAD_CONFIG",
        message: `رقم المشترك لازم يكون 16 رقم — الموجود حاليًا ${sub.length} رقم`,
      },
      checkedAt: new Date().toISOString(),
      tested: false,
    };
  }

  // 1) GET لجمع الحقول المخفية والكوكيز
  const first = await fetchHtml(config.pageUrl);
  const cookies = first.res.headers.getSetCookie
    ? first.res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
    : "";

  // 2) POST برقم المشترك
  const pairs = sub.match(/.{2}/g); // ["03","09","19","19","05","12","07","00"]
  const params = new URLSearchParams({
    __VIEWSTATE: hiddenField(first.html, "__VIEWSTATE"),
    __VIEWSTATEGENERATOR: hiddenField(first.html, "__VIEWSTATEGENERATOR"),
    __EVENTVALIDATION: hiddenField(first.html, "__EVENTVALIDATION"),
    T1: pairs[0], T2: pairs[1], T3: pairs[2], T4: pairs[3],
    T5: pairs[4], T6: pairs[5], T7: pairs[6], T8: pairs[7],
    BCrn: "اعرض",
  });

  const { html } = await fetchHtml(config.pageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: config.pageUrl,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: params.toString(),
  });

  const text = stripTags(html);

  const amountDue = findLabeledNumber(text, [
    /صافي\s*الفاتورة/,
    /الصافي/,
    /اجمالي/,
    /إجمالي/,
    /المبلغ\s*المطلوب/,
    /قيمة\s*الفاتورة/,
    /المطلوب\s*سداده/,
  ]);
  const consumption = findLabeledNumber(text, [/الاستهلاك/, /كمية\s*الغاز/]);
  const month = findArabicMonth(text);

  const notFound = /رقم\s*المشترك\s*غير|غير\s*صحيح|لا\s*توجد\s*بيانات/.test(text);

  return {
    ok: amountDue != null && !notFound,
    utility: "gas",
    label: config.label,
    company: config.company,
    name: null,
    month,
    consumption,
    consumptionUnit: "م³",
    amountDue,
    currency: "جنيه",
    paid: null, // غير مؤكد — يتحدد بعد التجربة من مصر
    sourceUrl: config.pageUrl,
    rawExcerpt: text.slice(0, 300),
    checkedAt: new Date().toISOString(),
    tested: false,
    note: "نتيجة غير مُختبَرة — لو الأرقام غلط، ابعت لقطة من نتيجة الموقع الرسمي ونظبط التحليل",
    ...((amountDue == null || notFound) && {
      error: {
        code: notFound ? "NOT_FOUND" : "PARSE_ERROR",
        message: notFound
          ? "الموقع مالقاش فاتورة برقم المشترك ده — اتأكد من الرقم من فاتورة ورقية"
          : "وصلنا للموقع بس مقدرناش نستخرج قيمة الفاتورة — شكل صفحة النتيجة محتاج يتراجع من مصر",
      },
    }),
  };
}
