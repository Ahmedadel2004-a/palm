// ============================================================================
// إعدادات الحسابات — غيّر الأرقام من هنا، أو من متغيرات البيئة في Vercel
// (Settings → Environment Variables). متغيرات البيئة لها الأولوية.
// ============================================================================

export const CONFIG = {
  electricity: {
    label: "الكهرباء",
    company: "شركة الاسكندرية لتوزيع الكهرباء",
    // الرقم الآلي / كود السداد الإلكتروني
    referenceId: process.env.ELEC_REFERENCE_ID || "8420808023306011",
    previousConsumptionUrl: (ref) =>
      `https://alex.ahram.org.eg/home/PreviousConsumption?referenceID=${encodeURIComponent(ref)}`,
    invoiceUrl: (ref) =>
      `https://alex.ahram.org.eg/home/InvoiceDetails?Reference=${encodeURIComponent(ref)}`,
  },

  water: {
    label: "المياه",
    company: "شركة مياه الشرب بالإسكندرية",
    // رقم الحساب / رقم السداد الإلكتروني
    account: process.env.WATER_ACCOUNT || "17020000580634",
    // صفحة الاستعلام: https://alexwater.com.eg/fatora_new/
    // بتبعت رقم السداد POST لنقطة النهاية دي وترجع HTML فيه بيانات الفاتورة
    endpoint: "https://alexwater.com.eg/fatora_new/fatora_awco2.php",
  },

  gas: {
    label: "الغاز",
    company: "بتروتريد — Petrotrade",
    // رقم المشترك (16 رقم)
    subscription: process.env.GAS_SUBSCRIPTION || "0309191905120700",
    pageUrl: "https://www.petrotrade.com.eg/billing/billq.aspx",
  },
};
