// ============================================================================
// أدوات الجلب والتحليل المشتركة بين المواقع الثلاثة
// ============================================================================

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar-EG,ar;q=0.9,en;q=0.8",
};

// خطأ مصنّف عشان الواجهة تعرف تعرض رسالة مناسبة
export class FetchError extends Error {
  constructor(code, messageAr) {
    super(messageAr);
    this.code = code;
    this.messageAr = messageAr;
  }
}

// يجيب HTML من رابط مع مهلة وكشف حظر Cloudflare
export async function fetchHtml(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 25000);
  let res;
  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers: { ...BROWSER_HEADERS, ...(options.headers || {}) },
      body: options.body,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      throw new FetchError(
        "UNREACHABLE",
        "الموقع ماردش في الوقت المناسب — غالبًا محجوب من خارج مصر أو واقع"
      );
    }
    throw new FetchError(
      "UNREACHABLE",
      "مقدرناش نوصل للموقع — غالبًا محجوب من خارج مصر (جرب من سيرفر جوه مصر)"
    );
  }
  clearTimeout(timeout);

  const html = await res.text();

  // كشف صفحة تحدي Cloudflare ("Just a moment...")
  if (
    res.status === 403 &&
    /just a moment|cf-chl|challenge-platform/i.test(html)
  ) {
    throw new FetchError(
      "CF_CHALLENGE",
      "الموقع طلب تحقق أمني (Cloudflare) — ده بيحصل أحيانًا مع سيرفرات خارج مصر، جرب تاني أو شغّل التطبيق من شبكة مصرية"
    );
  }

  if (!res.ok) {
    throw new FetchError(
      "HTTP_ERROR",
      `الموقع رد بخطأ (${res.status}) — ممكن يكون واقع مؤقتًا، جرب بعد شوية`
    );
  }

  return { html, res };
}

// --------------------------- أدوات تحليل HTML ---------------------------

export function stripTags(s) {
  return (s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function toNumber(s) {
  if (s == null) return null;
  const m = String(s).replace(/[,٬]/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// يستخرج كل صفوف <tr><th>مفتاح</th><td>قيمة</td></tr> كقاموس
export function parseKeyValueTables(html) {
  const rows = {};
  const re =
    /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = re.exec(html))) {
    const key = stripTags(m[1]);
    const val = stripTags(m[2]);
    if (key) rows[key] = val;
  }
  return rows;
}

// بحث مرن عن قيمة رقمية مرتبطة بوصف عربي في نص صفحة
// patterns: مصفوفة تعبيرات منتظمة بديلة للوصف
export function findLabeledNumber(text, labelPatterns) {
  for (const p of labelPatterns) {
    const re = new RegExp(
      p.source.replace(/\s+/g, "\\s*") + "[^0-9\\d]{0,40}(-?\\d+(?:[.,]\\d+)?)",
      "i"
    );
    const m = text.match(re);
    if (m) return toNumber(m[1]);
  }
  return null;
}

export const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "ابريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "اغسطس", "سبتمبر", "أكتوبر", "اكتوبر",
  "نوفمبر", "ديسمبر",
];

export function findArabicMonth(text) {
  for (const m of AR_MONTHS) {
    const re = new RegExp(m + "\\s*(20\\d{2})?");
    const found = text.match(re);
    if (found) return found[1] ? `${m} ${found[1]}` : m;
  }
  return null;
        }
