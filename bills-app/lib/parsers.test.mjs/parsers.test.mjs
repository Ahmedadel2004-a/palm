import assert from "node:assert/strict";
import test from "node:test";
import { parseInvoice, parsePreviousConsumption } from "./electricity.mjs";
import { getGasBill } from "./gas.mjs";
import { decodeHtmlEntities, stripTags } from "./fetchHtml.mjs";
import { getWaterBill } from "./water.mjs";

function numericEntities(text) {
  return Array.from(text, (char) =>
    char.codePointAt(0) > 127
      ? `&#x${char.codePointAt(0).toString(16)};`
      : char
  ).join("");
}

test("decodes numeric, named, and nested HTML entities", () => {
  assert.equal(decodeHtmlEntities("&#x639;&#x627; &amp;copy; &nbsp;"), "عا © \u00a0");
  assert.equal(stripTags("<p>A&nbsp;&amp; B</p>"), "A & B");
});

test("electricity parsers decode the subscriber name, month, and extracted labels", () => {
  const previousHtml = `
    <span>الاسم</span><strong>${numericEntities("عادل فرغلى رشوان احمد")}</strong>
    <div class="panel-heading">${numericEntities("أشهر محاسبة")}</div>
    <div class="panel-body">202611</div>
    <table><tr><td>92</td><td>${numericEntities("نوفمبر")}</td><td>2026</td></tr></table>`;
  const invoiceHtml = `
    <table>
      <tr><th>${numericEntities("شهر الإصدار")}</th><td>${numericEntities("نوفمبر")} 2026</td></tr>
      <tr><th>${numericEntities("استهلاك")}</th><td>92</td></tr>
      <tr><th>${numericEntities("اجمالي الفاتورة")}</th><td>101.20</td></tr>
      <tr><th>${numericEntities("أشهر مديونية")}</th><td>0</td></tr>
    </table>
    <span>${numericEntities("مدفوعة")}</span>`;

  const previous = parsePreviousConsumption(previousHtml);
  const invoice = parseInvoice(invoiceHtml);
  assert.equal(previous.name, "عادل فرغلى رشوان احمد");
  assert.equal(previous.history[0].month, "نوفمبر");
  assert.equal(invoice.month, "نوفمبر 2026");
  assert.equal(invoice.amountDue, 101.2);
  assert.equal(invoice.paid, true);
});

test("water and gas parsers decode entity-encoded response text", async () => {
  const originalFetch = globalThis.fetch;
  let gasPost = false;
  globalThis.fetch = async (_url, options = {}) => {
    const html = _url.includes("/water")
      ? `<div>إجمالي الفاتورة: &#49;&#48;&#49;&#46;&#50;&#48;</div><div>شهر الفاتورة: ${numericEntities("نوفمبر")} 2026</div>`
      : options.method === "POST"
        ? (gasPost = true, `<div>صافي الفاتورة: &#49;&#48;&#49;&#46;&#50;&#48;</div><div>شهر الفاتورة: ${numericEntities("نوفمبر")} 2026</div>`)
        : `<input name="__VIEWSTATE" value="state"><input name="__VIEWSTATEGENERATOR" value="generator"><input name="__EVENTVALIDATION" value="validation">`;
    return new Response(html, { status: 200 });
  };

  try {
    const water = await getWaterBill({
      account: "123",
      endpoint: "https://example.invalid/water",
      label: "المياه",
      company: "شركة المياه",
    });
    const gas = await getGasBill({
      subscription: "0309191905120700",
      pageUrl: "https://example.invalid/gas",
      label: "الغاز",
      company: "شركة الغاز",
    });

    assert.equal(water.month, "نوفمبر 2026");
    assert.equal(water.amountDue, 101.2);
    assert.match(water.rawExcerpt, /نوفمبر/);
    assert.equal(gas.month, "نوفمبر 2026");
    assert.equal(gas.amountDue, 101.2);
    assert.match(gas.rawExcerpt, /نوفمبر/);
    assert.equal(gasPost, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
