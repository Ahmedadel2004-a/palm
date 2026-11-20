// ============================================================================
// الغاز — بتروتريد Petrotrade (www.petrotrade.com.eg/billing/billq.aspx)
// الموقع يستخدم ASP.NET WebForms ويحتاج إلى إرسال قيم الجلسة والحقول المخفية
// كما ظهرت في صفحة الاستعلام قبل إرسال رقم المشترك.
// ============================================================================

import { decodeHtmlEntities, fetchHtml, stripTags, findLabeledNumber, findArabicMonth } from "./fetchHtml.mjs";

function htmlText(value) {
  return decodeHtmlEntities(stripTags(value)).replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function elementValue(html, id) {
  const escapedId = escapeRegExp(id);
  const tag = new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*\\bid=["']${escapedId}["'])[^>]*>([\\s\\S]*?)<\\/\\1\\s*>`, "i");
  const match = html.match(tag);
  if (match) return htmlText(match[2]);

  const input = new RegExp(`<input\\b(?=[^>]*\\bid=["']${escapedId}["'])[^>]*>`, "i").exec(html)?.[0];
  if (!input) return null;
  return attribute(input, "value");
}

function attribute(tag, name) {
  const escapedName = escapeRegExp(name);
  const match = tag.match(new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? "") : "";
}

function hiddenFields(html) {
  const values = {};
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "type").toLowerCase() !== "hidden") continue;
    const name = attribute(tag, "name");
    if (name) values[name] = attribute(tag, "value");
  }
  return values;
}

function formAction(html, fallback) {
  for (const match of html.matchAll(/<form\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "id") === "form1") {
      const action = attribute(tag, "action");
      if (action) {
        try { return new URL(action, fallback).toString(); } catch { return fallback; }
      }
    }
  }
  return fallback;
}

function sessionCookies(headers) {
  const cookieValues = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : (headers.get("set-cookie") || "").split(/,(?=\s*[^;,=\s]+=[^;,]*)/g);
  return cookieValues.map((cookie) => cookie.split(";")[0].trim()).filter(Boolean).join("; ");
}

function numericElement(html, id) {
  const value = elementValue(html, id);
  if (value == null || value === "") return null;
  const number = Number(String(value).replace(/[٬,]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export function parseGasBillHtml(html, config = {}) {
  const text = htmlText(html);
  const name = elementValue(html, "sName") || null;
  const subscriberNumber = elementValue(html, "sCrn") || null;
  const area = elementValue(html, "MAN") || null;
  const governorate = elementValue(html, "MOH") || null;
  const placeDescription = elementValue(html, "sKind") || null;
  const issueText = elementValue(html, "ContentPlaceHolder1_y_m") || text;
  const month = findArabicMonth(issueText);
  const previousReading = numericElement(html, "ContentPlaceHolder1_sabks");
  const currentReading = numericElement(html, "ContentPlaceHolder1_TextBox1");
  const statusMessage = elementValue(html, "Label1") || elementValue(html, "ContentPlaceHolder1_Label1") || "";
  const statusText = `${statusMessage} ${text}`;
  const paid = /كل\s*الفواتير\s*محصلة/.test(statusText);
  const notFound = /رقم\s*المشترك\s*غير|غير\s*صحيح|لا\s*توجد\s*بيانات|لم\s*يتم\s*العثور/.test(text);

  const amountLabels = [
    /المبلغ\s*المستحق/, /قيمة\s*الفاتورة/, /إجمالي\s*الفاتورة/, /اجمالي\s*الفاتورة/,
    /إجمالي\s*المبلغ/, /اجمالي\s*المبلغ/, /المبلغ\s*المطلوب/, /المطلوب\s*سداده/,
    /المستحق/, /صافي\s*الفاتورة/, /قيمة\s*الاستهلاك/,
  ];
  const parsedAmount = findLabeledNumber(statusMessage, amountLabels) ?? findLabeledNumber(text, amountLabels);
  const currencyAmount = (statusMessage || text).match(/(-?\d+(?:[.,]\d{1,2})?)\s*(?:جنيه(?:ًا)?|ج\.م|EGP)/i);
  const amountDue = paid ? 0 : parsedAmount ?? (currencyAmount ? Number(currencyAmount[1].replace(",", ".")) : null);
  const reading = text.match(/(?:الاستهلاك|كمية\s*الغاز)[^\d]{0,30}(\d+(?:[.,]\d+)?)/);
  const consumption = reading ? Number(reading[1].replace(",", ".")) : null;
  const hasResult = Boolean(name || subscriberNumber) && !notFound;
  const ok = hasResult && (amountDue != null || paid);

  return {
    ok,
    utility: "gas",
    label: config.label || "الغاز",
    company: config.company || "بتروتريد — Petrotrade",
    name,
    subscriberNumber,
    area,
    governorate,
    placeDescription,
    month,
    previousReading,
    currentReading,
    consumption,
    consumptionUnit: "م³",
    amountDue,
    currency: "جنيه",
    paid: paid ? true : amountDue != null ? amountDue <= 0 : null,
    sourceUrl: config.pageUrl || "https://www.petrotrade.com.eg/billing/billq.aspx",
    rawExcerpt: text.slice(0, 300),
    checkedAt: new Date().toISOString(),
    tested: false,
    ...(!ok && {
      error: {
        code: notFound ? "NOT_FOUND" : "PARSE_ERROR",
        message: notFound
          ? "الموقع مالقاش فاتورة برقم المشترك ده — اتأكد من الرقم من فاتورة ورقية"
          : "وصلنا للموقع بس مقدرناش نستخرج بيانات فاتورة الغاز من صفحة النتيجة",
      },
    }),
  };
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

  const first = await fetchHtml(config.pageUrl);
  const cookies = sessionCookies(first.res.headers);
  const fields = hiddenFields(first.html);
  const pairs = sub.match(/.{2}/g);
  const body = new URLSearchParams({
    ...fields,
    T1: pairs[0], T2: pairs[1], T3: pairs[2], T4: pairs[3],
    T5: pairs[4], T6: pairs[5], T7: pairs[6], T8: pairs[7],
    BCrn: "استعلام",
  });

  const postUrl = formAction(first.html, config.pageUrl);
  const { html } = await fetchHtml(postUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: config.pageUrl,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: body.toString(),
  });

  return parseGasBillHtml(html, config);
        }
