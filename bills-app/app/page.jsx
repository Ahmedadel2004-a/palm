"use client";

import { useState } from "react";
import billsData from "../data/bills.json";

const UTILITIES = [
  { key: "electricity", icon: "⚡", param: "ref" },
  { key: "water", icon: "💧", param: "account" },
  { key: "gas", icon: "🔥", param: "sub" },
];

function StatusBadge({ paid }) {
  if (paid === true)
    return <span className="badge badge-paid">مدفوعة ✅</span>;
  if (paid === false)
    return <span className="badge badge-unpaid">مستحقة ⏳</span>;
  return null;
}

function SavedView({ saved }) {
  const hasData = saved.amount != null || saved.month != null;
  return (
    <>
      {hasData ? (
        <>
          <div className="amount">{saved.amount || "—"}</div>
          <div className="rows">
            <div className="row">
              <span className="k">شهر الفاتورة</span>
              <span>{saved.month || "—"}</span>
            </div>
            {saved.consumption != null && (
              <div className="row">
                <span className="k">الاستهلاك</span>
                <span>{saved.consumption}</span>
              </div>
            )}
            {saved.arrears != null && (
              <div className="row">
                <span className="k">المديونية</span>
                <span>{saved.arrears}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="amount-na">
          لا توجد بيانات محفوظة بعد، ابحث برقم الحساب لعرض أحدث فاتورة.
        </div>
      )}
      {hasData && saved.note && <div className="saved-note">💾 {saved.note}</div>}
      {saved.lastUpdated && (
        <div className="checked-at">آخر تحديث: {saved.lastUpdated}</div>
      )}
    </>
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

function Card({ utility, icon, param }) {
  const saved = billsData[utility] || {};
  const [number, setNumber] = useState(saved.accountNumber || "");
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
            {saved.label || utility}
            <div className="company">{saved.company || ""}</div>
          </div>
        </div>
        <StatusBadge
          paid={state === "ok" ? live?.paid : state === "fail" ? null : saved.paid}
        />
      </div>

      <form className="search-row" onSubmit={search}>
        <input
          className="search-input"
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={saved.accountHint || "رقم الحساب"}
          aria-label={saved.accountHint || "رقم الحساب"}
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
        <SavedView saved={saved} />
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
        {UTILITIES.map((u) => (
          <Card key={u.key} utility={u.key} icon={u.icon} param={u.param} />
        ))}
      </div>
      <div className="footer">
        البحث المباشر بيجيب من مواقع الشركات لحظيًا — بيشتغل من جوه مصر بس.
        <br />
        لو البحث ماشتغلش، بتظهر آخر بيانات محفوظة (بتتحدث تلقائيًا أول ما
        فاتورة جديدة تنزل).
      </div>
    </main>
  );
          }
