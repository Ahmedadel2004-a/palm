"use client";

import { useState } from "react";

const UTILITIES = [
  {
    key: "electricity",
    label: "الكهرباء",
    company: "شركة الاسكندرية لتوزيع الكهرباء",
    accountHint: "الرقم الآلي / كود السداد",
    icon: "⚡",
    param: "ref",
  },
  {
    key: "water",
    label: "المياه",
    company: "شركة مياه الشرب بالإسكندرية",
    accountHint: "رقم السداد / الحساب",
    icon: "💧",
    param: "account",
  },
  {
    key: "gas",
    label: "الغاز",
    company: "بتروتريد — Petrotrade",
    accountHint: "رقم المشترك",
    icon: "🔥",
    param: "sub",
  },
];

function StatusBadge({ paid }) {
  if (paid === true)
    return <span className="badge badge-paid">مدفوعة ✅</span>;
  if (paid === false)
    return <span className="badge badge-unpaid">مستحقة ⏳</span>;
  return null;
}

function EmptyView() {
  return (
    <div className="amount-na">
      لا توجد بيانات محفوظة. ابحث برقم الحساب لعرض أحدث فاتورة.
    </div>
  );
}

function LiveView({ data }) {
  return (
    <>
      <div className="amount">
        {data.amountDue != null ? (
          <>
            {data.amountDue} <span className="currency">{data.currency}</span>
          </>
        ) : (
          <span className="amount-na">القيمة غير متاحة</span>
        )}
      </div>
      <div className="rows">
        {data.name && (
          <div className="row">
            <span className="k">الاسم</span>
            <span>{data.name}</span>
          </div>
        )}
        <div className="row">
          <span className="k">شهر الفاتورة</span>
          <span>{data.month || "—"}</span>
        </div>
        {data.consumption != null && (
          <div className="row">
            <span className="k">الاستهلاك</span>
            <span>
              {data.consumption} {data.consumptionUnit}
            </span>
          </div>
        )}
      </div>
      <div className="live-badge">نتيجة مباشرة من موقع الشركة 🟢</div>
    </>
  );
}

function Card({ utility, label, company, accountHint, icon, param }) {
  const [number, setNumber] = useState("");
  // idle | loading | ok | fail
  const [state, setState] = useState("idle");
  const [live, setLive] = useState(null);

  async function search(e) {
    e.preventDefault();
    const q = number.trim();
    if (!q || state === "loading") return;
    setState("loading");
    try {
      const res = await fetch(
        `/api/bills/${utility}?${param}=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data && data.ok) {
        setLive(data);
        setState("ok");
      } else {
        setState("fail");
      }
    } catch {
      setState("fail");
    }
  }

  return (
    <div className="card">
      <div className="card-top">
        <div className="card-title">
          <span className="card-icon">{icon}</span>
          <div>
            {label}
            <div className="company">{company}</div>
          </div>
        </div>
        <StatusBadge paid={state === "ok" ? live?.paid : null} />
      </div>

      <form className="search-row" onSubmit={search}>
        <input
          className="search-input"
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={accountHint}
          aria-label={accountHint}
        />
        <button
          className="search-btn"
          type="submit"
          disabled={state === "loading" || !number.trim()}
        >
          {state === "loading" ? (
            <>
              <span className="spinner" /> بيدور...
            </>
          ) : (
            "ابحث 🔍"
          )}
        </button>
      </form>

      {state === "fail" ? (
        <div className="live-fail">تعذر الوصول إلى موقع الشركة الآن. حاول مرة أخرى لاحقًا.</div>
      ) : state === "ok" && live ? (
        <LiveView data={live} />
      ) : (
        <EmptyView />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="page">
      <div className="header">
        <h1>🧾 فواتيري</h1>
        <p>كهرباء ومياه وغاز — ابحث برقم الحساب وشوف فاتورتك</p>
      </div>
      <div className="cards">
        {UTILITIES.map((utility) => (
          <Card key={utility.key} {...utility} />
        ))}
      </div>
      <div className="footer">
        كل بحث يطلب البيانات مباشرة من موقع الشركة. لا يعرض الموقع بيانات محفوظة.
      </div>
    </main>
  );
}
