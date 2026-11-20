// ============================================================================
// المياه — شركة مياه الشرب بالإسكندرية (alexwater.com.eg)
// Uses the site's inquiry form token and its AJAX endpoint, then reads the
// result table returned by the real page.
// ============================================================================

import { fetchHtml, stripTags, toNumber } from "./fetchHtml.mjs";

const FORM_URL = "https://alexwater.com.eg/2016/fatora/";
const POST_URL = "https://alexwater.com.eg/2016/fatora/fatora_awco2.php";

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(x[\da-f]+|\d+);?/gi, (original, code) => {
      const n = code[0].toLowerCase() === "x"
        ? parseInt(code.slice(1), 16)
        : parseInt(code, 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : original;
    })
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function resultFragment(html) {
  const source = String(html || "");
  const start = source.search(/<div\b(?=[^>]*\bid=["']result-container["'])[^>]*>/i);
  if (start < 0) return source;
  const openEnd = source.indexOf(">", start) + 1;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  let tag;
  while ((tag = tags.exec(source))) {
    if (/^<\/div/i.test(tag[0])) depth--;
    else if (!/\/>$/.test(tag[0])) depth++;
    if (depth === 0) return source.slice(openEnd, tag.index);
  }
  return source.slice(openEnd);
}

export function parseWaterResult(html) {
  const fragment = resultFragment(html);
  const rows = {};
  const rowRe = /<tr\b[^>]*>[\s\S]*?<th\b[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td\b[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(fragment))) {
    const key = decodeHtmlEntities(stripTags(m[1])).replace(/\s+/g, " ").trim();
    const value = decodeHtmlEntities(stripTags(m[2])).replace(/\s+/g, " ").trim();
    if (key) rows[key] = value;
  }

  const dueText = rows["المستحق"] || "";
  const amountDue = toNumber(dueText);
  const text = decodeHtmlEntities(stripTags(fragment));
  return {
    month: rows["شهر الإصدار"] || rows["شهر الاصدار"] || null,
    name: rows["الاسم الكامل"] || null,
    amountDue,
    currency: "جنيه",
    paid: amountDue === 0 ? true : null,
    fields: rows,
    note: text.match(/ملحوظة[^.؟!]*(?:دون الأقساط)?/i)?.[0] || null,
  };
}

function getCsrfToken(html) {
  const input = String(html || "").match(/<input\b(?=[^>]*\bname=["']csrf_token["'])[^>]*>/i)?.[0];
  return input?.match(/\bvalue=["']([^"']*)["']/i)?.[1] || null;
}

export async function getWaterBill(config) {
  const first = await fetchHtml(FORM_URL);
  const csrfToken = getCsrfToken(first.html);
  if (!csrfToken) {
    throw Object.assign(new Error("csrf"), {
      code: "PARSE_ERROR",
      messageAr: "صفحة استعلام المياه اتغيرت ومقدرناش نجهز الطلب",
    });
  }
  const cookies = first.res.headers.getSetCookie
    ? first.res.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ")
    : "";
  const params = new URLSearchParams({ ElecID: String(config.account), csrf_token: csrfToken });
  const { html } = await fetchHtml(POST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: FORM_URL,
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: params.toString(),
  });
  const parsed = parseWaterResult(html);
  const text = decodeHtmlEntities(stripTags(html));
  const notFound = /غير\s*صحيح|لا\s*توجد\s*بيانات|رقم.*غير/.test(text);
  const ok = parsed.amountDue != null && !notFound;
  return {
    ok,
    utility: "water",
    label: config.label,
    company: config.company,
    ...parsed,
    consumption: null,
    consumptionUnit: "م³",
    sourceUrl: FORM_URL,
    rawExcerpt: text.slice(0, 300),
    checkedAt: new Date().toISOString(),
    tested: true,
    ...(!ok && {
      error: {
        code: notFound ? "NOT_FOUND" : "PARSE_ERROR",
        message: notFound
          ? "الموقع مالقاش فاتورة بالرقم ده، اتأكد من رقم السداد الإلكتروني"
          : "وصلنا للموقع بس مقدرناش نستخرج قيمة المستحق من الفاتورة",
      },
    }),
  };
}

export { getCsrfToken };
