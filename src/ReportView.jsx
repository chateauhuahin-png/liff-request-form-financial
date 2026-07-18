import { useState, useEffect } from 'react';
import { liff, isLiffReady } from './liff.js';

const PERIOD_TABS = [
  { key: 'daily', label: 'วันนี้' },
  { key: 'weekly', label: 'สัปดาห์นี้' },
  { key: 'monthly', label: 'เดือนนี้' },
  { key: 'yearly', label: 'ปีนี้' },
];

const STATUS_LABEL = {
  pending_approval: 'รออนุมัติ',
  rejected: 'ไม่อนุมัติ',
  approved: 'รอจ่ายเงิน',
  paid: 'รอหลักฐาน',
  settled: 'ปิดเรื่องแล้ว',
};

const STATUS_COLOR = {
  pending_approval: '#B0821E',
  rejected: '#A6382F',
  approved: '#63705F',
  paid: '#63705F',
  settled: '#1F6E43',
};

function money(n) {
  return `฿ ${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
}

export default function ReportView({ initialPeriod }) {
  const [period, setPeriod] = useState(
    PERIOD_TABS.some((t) => t.key === initialPeriod) ? initialPeriod : 'daily'
  );
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`${import.meta.env.VITE_API_BASE_URL}/reports?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error('โหลดรายงานไม่สำเร็จ');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'เกิดข้อผิดพลาด');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const maxCategoryAmount = report?.byCategory?.length
    ? Math.max(...report.byCategory.map((c) => c.amount))
    : 0;

  function handlePrint() {
    // ใน LINE ในแอป (LIFF webview) เปิดคำสั่งพิมพ์ตรงๆ มักไม่ทำงาน — เปิดหน้านี้ในเบราว์เซอร์จริงแทนแล้วค่อยพิมพ์
    if (isLiffReady() && liff.isInClient()) {
      liff.openWindow({ url: window.location.href, external: true });
      return;
    }
    window.print();
  }

  const printedAt = new Date().toLocaleString('th-TH', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="report-wrap">
      <div className="eyebrow">
        <span>รายงานสรุปค่าใช้จ่าย</span>
        <span>ธุรการ</span>
      </div>

      <div className="report-tabs no-print">
        {PERIOD_TABS.map((t) => (
          <button
            key={t.key}
            className={`report-tab ${period === t.key ? 'active' : ''}`}
            onClick={() => setPeriod(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {report && !loading && (
        <button className="submit-btn no-print" style={{ marginTop: '14px' }} onClick={handlePrint}>
          🖨️ พิมพ์ / บันทึกเป็น PDF
        </button>
      )}

      <div className="receipt-card report-card">
        {loading && <div className="sub">กำลังโหลดรายงาน...</div>}
        {error && <div className="error">{error}</div>}

        {report && !loading && (
          <>
            <div className="print-only print-header">
              <div className="print-header-title">รายงานสรุปค่าใช้จ่าย (ธุรการ)</div>
              <div className="print-header-sub">พิมพ์เมื่อ {printedAt}</div>
            </div>

            <h1>{report.label}</h1>
            <div className="sub">สรุปคำขอเบิกเงินทั้งหมดในช่วงนี้</div>

            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">ยอดเบิกรวม</div>
                <div className="stat-value">{money(report.totalRequested)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">ยอดใช้จริง (ปิดเรื่องแล้ว)</div>
                <div className="stat-value accent">{money(report.totalActual)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">จำนวนคำขอ</div>
                <div className="stat-value">{report.count} รายการ</div>
              </div>
            </div>

            {report.byStatus && Object.keys(report.byStatus).length > 0 && (
              <>
                <div className="section-title">แยกตามสถานะ</div>
                <div className="status-pills">
                  {Object.entries(report.byStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className="status-pill"
                      style={{ borderColor: STATUS_COLOR[status] || '#D9DBD1', color: STATUS_COLOR[status] || '#1E2A22' }}
                    >
                      {STATUS_LABEL[status] || status} · {count}
                    </span>
                  ))}
                </div>
              </>
            )}

            {report.byCategory && report.byCategory.length > 0 && (
              <>
                <div className="section-title">แยกตามหมวดหมู่</div>
                <div className="bar-list">
                  {report.byCategory.map((c) => (
                    <div className="bar-row" key={c.category}>
                      <div className="bar-row-top">
                        <span>{c.category}</span>
                        <b>{money(c.amount)}</b>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${maxCategoryAmount ? (c.amount / maxCategoryAmount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {report.requests && report.requests.length > 0 && (
              <>
                <div className="section-title">รายการทั้งหมด</div>
                <div className="request-list">
                  {report.requests.map((r) => (
                    <div className="request-row" key={r.id}>
                      <div>
                        <div className="request-row-no">{r.requestNo}</div>
                        <div className="request-row-name">{r.requesterName} · {r.category}</div>
                      </div>
                      <div className="request-row-right">
                        <div className="request-row-amount">{money(r.amount)}</div>
                        <div
                          className="request-row-status"
                          style={{ color: STATUS_COLOR[r.status] || '#63705F' }}
                        >
                          {STATUS_LABEL[r.status] || r.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {report.count === 0 && <div className="status-note show">ไม่มีคำขอในช่วงเวลานี้</div>}

            <div className="print-only print-signatures">
              <div className="print-sig-box">
                <div className="print-sig-line">ลงชื่อ ....................................................</div>
                <div className="print-sig-label">ผู้จัดทำรายงาน</div>
                <div className="print-sig-label">วันที่ ..............................</div>
              </div>
              <div className="print-sig-box">
                <div className="print-sig-line">ลงชื่อ ....................................................</div>
                <div className="print-sig-label">ผบ.หน่วย (ผู้ตรวจสอบ/รับทราบ)</div>
                <div className="print-sig-label">วันที่ ..............................</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
