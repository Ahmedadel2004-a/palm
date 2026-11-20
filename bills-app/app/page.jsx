"use client";

import { useCallback, useEffect, useState } from "react";

const UTILITIES = [
  { key: "electricity", icon: "⚡" },
  { key: "water", icon: "💧" },
  { key: "gas", icon: "🔥" },
];

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ data }) {
  if (!data) return null;
  if (data.paid === true)
    return <span className="badge badge-paid">مدفوعة ✅</span>;
  if (data.paid === false)
    return <span className="badge badge-unpaid">مستحقة ⏳</span>;
  return <span className="badge badge-unknown">الحالة غير معروفة</span>;
}

function Card({ utility, icon }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bills/${utility}`, { cache: "no-store" });
      setData(await res.json());
    } catch {
      setData({
        ok: false,
        error: { message: "مشكلة في الاتصال بالسيرفر" },
      });
    } finally {
      setLoading(false);
    }
  }, [utility]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card">
      <div className="card-top">
        <div className="card-title">
          <span className="card-icon">{icon}</span>
          <div>
            {data?.label || utility}
            <div className="company">{data?.company || ""}</div>
          </div>
        </div>
        {data?.ok && <StatusBadge data={data} />}
      </div>

      {loading && (
        <div style={{ padding: "18px 0" }}>
          <span className="spinner" /> جاري الفحص...
        </div>
      )}

      {!loading && data?.ok && (
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
        </>
      )}

      {!loading && data && !data.ok && data.error && (
        <div className="error-box">{data.error.message}</div>
      )}

      {!loading && data?.tested === false && (
        <div className="note-box">
          ⚠️ الجزء ده لسه غير مُختبَر من مصر — الموقع الرسمي محجوب من بره
          البلد. {data.note || ""}
        </div>
      )}

      <div className="checked-at">
        آخر فحص: {formatTime(data?.checkedAt)}
      </div>

      <button className="card-refresh" onClick={load} disabled={loading}>
        {loading ? "..." : "إعادة الفحص 🔄"}
      </button>
    </div>
  );
}

export default function Home() {
  const [tick, setTick] = useState(0);

  return (
    <main className="page">
      <div className="header">
        <h1>🧾 فواتيري</h1>
        <p>كهرباء ومياه وغاز — كل الفواتير في صفحة واحدة</p>
        <button className="refresh-all" onClick={() => setTick((t) => t + 1)}>
          تحديث الكل 🔄
        </button>
      </div>
      <div className="cards" key={tick}>
        {UTILITIES.map((u) => (
          <Card key={u.key} utility={u.key} icon={u.icon} />
        ))}
      </div>
      <div className="footer">
        البيانات بتتجاب لحظيًا من المواقع الرسمية للشركات.
        <br />
        المياه والغاز بيشتغلوا من جوه مصر بس — لو انت خارج البلد هتظهر رسالة
        توضح ده.
      </div>
    </main>
  );
}
