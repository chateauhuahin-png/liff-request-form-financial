import { useState, useEffect } from 'react';
import { liff, isLiffReady } from './liff.js';

const STATUS_LABEL = {
  pending_approval: 'รอการอนุมัติจาก ผบ.หน่วย',
  rejected: 'ไม่ได้รับการอนุมัติ',
  approved: 'อนุมัติแล้ว รอจ่ายเงิน',
  paid: 'จ่ายเงินแล้ว',
};

function beThai(date) {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const d = new Date(date);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function summaryRow(label, value) {
  return (
    <div className="summary-row" key={label}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function PaymentForm({ requestId }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [request, setRequest] = useState(null);

  const [pay, setPay] = useState(null); // 'cash' | 'transfer'
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (isLiffReady() && liff.isLoggedIn()) {
      liff.getProfile().then(setProfile).catch(() => {});
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/requests/${requestId}`);
        if (!res.ok) throw new Error('ไม่พบคำขอนี้ในระบบ');
        const data = await res.json();
        setRequest(data);
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
    if (!pay) return setError('กรุณาเลือกวิธีจ่าย');
    setError('');
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append('paymentMethod', pay);
      if (file) form.append('proof', file);
      if (profile) form.append('financeUserId', profile.userId);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/requests/${requestId}/pay`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
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

  // สถานะยังไม่พร้อมจ่ายเงิน หรือจ่ายไปแล้ว — โชว์การ์ดสถานะแทนฟอร์ม
  if (request.status !== 'approved') {
    return (
      <div className="phone">
        <div className="eyebrow">
          <span>ฟอร์มจ่ายเงิน</span>
          <span>{request.requestNo}</span>
        </div>
        <div className="receipt-card">
          <h1>{request.requestNo}</h1>
          <div className="status-note show" style={{ marginTop: '16px' }}>
            สถานะปัจจุบัน: <b>{STATUS_LABEL[request.status] || request.status}</b>
          </div>
          <div className="summary">
            {summaryRow('ผู้ขอเบิก', request.requesterName)}
            {summaryRow('จำนวนเงิน', `฿ ${Number(request.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`)}
            {request.paymentMethod &&
              summaryRow('วิธีจ่าย', request.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน')}
            {request.paidAt && summaryRow('วันที่จ่าย', beThai(request.paidAt))}
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="phone">
        <div className="receipt-card">
          <div className="stamp-seal">จ่ายเงิน<br />สำเร็จ</div>
          <h2 className="confirm-title">บันทึกการจ่ายเงินแล้ว</h2>
          <div className="summary">
            {summaryRow('คำขอ', request.requestNo)}
            {summaryRow('ผู้ขอเบิก', request.requesterName)}
            {summaryRow('จำนวนเงิน', `฿ ${Number(request.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`)}
            {summaryRow('วิธีจ่าย', pay === 'cash' ? 'เงินสด' : 'เงินโอน')}
          </div>
          <div className="status-note show">
            ระบบแจ้งผู้ขอเบิกให้เตรียมส่งหลักฐานการใช้จ่ายจริงเรียบร้อยแล้ว
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
        <span>ฟอร์มจ่ายเงิน</span>
        <span>{request.requestNo}</span>
      </div>
      <div className="receipt-card">
        <h1>บันทึกการจ่ายเงิน</h1>
        <div className="sub">คำขอนี้ได้รับอนุมัติแล้ว กรอกรายละเอียดการจ่ายเงินให้ผู้ขอเบิก</div>

        <div className="summary">
          {summaryRow('ผู้ขอเบิก', request.requesterName)}
          {summaryRow('หน่วยงาน', request.unit)}
          {summaryRow('วัตถุประสงค์', request.purpose)}
          {summaryRow('จำนวนเงิน', `฿ ${Number(request.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`)}
        </div>

        <div className="field">
          <label>วิธีจ่าย</label>
          <div className="pay-row">
            <button type="button" className={`pay-btn ${pay === 'cash' ? 'active' : ''}`} onClick={() => setPay('cash')}>
              💵 เงินสด
            </button>
            <button type="button" className={`pay-btn ${pay === 'transfer' ? 'active' : ''}`} onClick={() => setPay('transfer')}>
              🏦 เงินโอน
            </button>
          </div>
        </div>

        <div className="field">
          <label>แนบหลักฐานการจ่าย (สลิปโอน/ใบเซ็นรับเงินสด — ถ้ามี)</label>
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

        {error && <div className="error">{error}</div>}

        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'กำลังบันทึก...' : 'บันทึกการจ่ายเงิน'}
        </button>
      </div>
    </div>
  );
}
