import { useState, useEffect } from 'react';
import { liff, isLiffReady } from './liff.js';

const STATUS_LABEL = {
  pending_approval: 'รอการอนุมัติจาก ผบ.หน่วย',
  rejected: 'ไม่ได้รับการอนุมัติ',
  approved: 'อนุมัติแล้ว รอจ่ายเงิน',
  paid: 'จ่ายเงินแล้ว รอส่งหลักฐาน',
  settled: 'ปิดเรื่องแล้ว',
};

function summaryRow(label, value) {
  return (
    <div className="summary-row" key={label}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function fmtMoney(n) {
  return `฿ ${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
}

export default function SettlementForm({ requestId }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [request, setRequest] = useState(null);

  const [actualAmount, setActualAmount] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/requests/${requestId}`);
        if (!res.ok) throw new Error('ไม่พบคำขอนี้ในระบบ');
        const data = await res.json();
        setRequest(data);
        setActualAmount(String(data.amount)); // ตั้งค่าเริ่มต้น = ยอดที่เบิกไป แก้ไขได้
      } catch (err) {
        setLoadError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId]);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    setFilePreview(null);
  }

  async function handleSubmit() {
    if (!actualAmount || parseFloat(actualAmount) < 0) return setError('กรุณากรอกยอดใช้จ่ายจริงให้ถูกต้อง');
    setError('');
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append('actualAmount', actualAmount);
      form.append('note', note);
      if (file) form.append('receipt', file);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/requests/${requestId}/settle`, {
        method: 'POST',
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');

      setDiff(data.diff || 0);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    if (isLiffReady() && liff.isInClient()) liff.closeWindow();
  }

  if (loading) {
    return (
      <div className="phone">
        <div className="receipt-card">
          <div className="sub">กำลังโหลดข้อมูลคำขอ...</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="phone">
        <div className="receipt-card">
          <h1>ไม่สามารถเปิดคำขอนี้ได้</h1>
          <div className="sub">{loadError}</div>
        </div>
      </div>
    );
  }

  if (request.status !== 'paid') {
    return (
      <div className="phone">
        <div className="eyebrow">
          <span>ฟอร์มส่งหลักฐาน</span>
          <span>{request.requestNo}</span>
        </div>
        <div className="receipt-card">
          <h1>{request.requestNo}</h1>
          <div className="status-note show" style={{ marginTop: '16px' }}>
            สถานะปัจจุบัน: <b>{STATUS_LABEL[request.status] || request.status}</b>
          </div>
          <div className="summary">
            {summaryRow('ผู้ขอเบิก', request.requesterName)}
            {summaryRow('จำนวนเงินที่เบิก', fmtMoney(request.amount))}
            {request.actualAmount != null && summaryRow('ยอดใช้จริง', fmtMoney(request.actualAmount))}
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    let diffText = 'ใช้จ่ายพอดีตามที่เบิก';
    if (diff > 0) diffText = `เหลือคืน ${fmtMoney(diff)}`;
    if (diff < 0) diffText = `ใช้เกินไป ${fmtMoney(Math.abs(diff))}`;

    return (
      <div className="phone">
        <div className="receipt-card">
          <div className="stamp-seal">ปิดเรื่อง<br />สำเร็จ</div>
          <h2 className="confirm-title">ส่งหลักฐานปิดเรื่องแล้ว</h2>
          <div className="summary">
            {summaryRow('คำขอ', request.requestNo)}
            {summaryRow('จำนวนเงินที่เบิก', fmtMoney(request.amount))}
            {summaryRow('ยอดใช้จริง', fmtMoney(actualAmount))}
            {summaryRow('ส่วนต่าง', diffText)}
          </div>
          <div className="confirm-actions">
            <button className="btn-ghost" onClick={finish}>ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="eyebrow">
        <span>ฟอร์มส่งหลักฐาน</span>
        <span>{request.requestNo}</span>
      </div>
      <div className="receipt-card">
        <h1>ส่งหลักฐานปิดเรื่อง</h1>
        <div className="sub">กรอกยอดใช้จ่ายจริง แนบรูปใบเสร็จ เพื่อปิดเรื่องคำขอนี้</div>

        <div className="summary">
          {summaryRow('ผู้ขอเบิก', request.requesterName)}
          {summaryRow('วัตถุประสงค์', request.purpose)}
          {summaryRow('จำนวนเงินที่เบิกไป', fmtMoney(request.amount))}
        </div>

        <div className="field">
          <label>ยอดใช้จ่ายจริง</label>
          <div className="amount-wrap">
            <span className="baht">฿</span>
            <input
              type="text"
              inputMode="decimal"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="field">
          <label>แนบรูปใบเสร็จ</label>
          <label className="attach-btn">
            📎 แตะเพื่อแนบรูป
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </label>
          {filePreview && (
            <div className="preview-row" style={{ display: 'flex' }}>
              <img src={filePreview} alt="preview" />
              <span>{file?.name}</span>
              <button onClick={clearFile}>ลบ</button>
            </div>
          )}
        </div>

        <div className="field">
          <label>หมายเหตุ (ถ้ามี)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น เหตุผลที่ยอดไม่ตรงกับที่เบิก" />
        </div>

        {error && <div className="error">{error}</div>}

        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'กำลังส่ง...' : 'ส่งหลักฐานปิดเรื่อง'}
        </button>
      </div>
    </div>
  );
}
