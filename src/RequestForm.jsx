import { useState, useEffect } from 'react';
import { liff, isLiffReady } from './liff.js';

const CATEGORIES = [
  'ค่าเบี้ยเลี้ยง',
    'ค่าอาหาร',
    'ค่าอาหารกองรักษาการณ์',
    'ค่าเบี้ยเลี้ยง,ค่าที่พัก',
  'ค่าจัดซื้อวัสดุ/ครุภัณฑ์',
    'ค่าวัตถุดิบประกอบอาหาร',
  'ค่าซ่อม',
  'ค่ารับคณะ',
  'อื่นๆ',
];

function beThai(date) {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

// ตัวช่วยสุ่มเลขที่คำขอไว้โชว์ตอน dev/preview เท่านั้น — บน production ควรให้ backend เป็นคนออกเลขที่จริง
function tempRequestNo() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `REQ-${new Date().getFullYear() + 543}-${n}`;
}

export default function RequestForm() {
  const [personnel, setPersonnel] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [unit, setUnit] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [neededDate, setNeededDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestNo, setRequestNo] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (isLiffReady() && liff.isLoggedIn()) {
      liff.getProfile().then(setProfile).catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/personnel`)
      .then((res) => res.json())
      .then((data) => setPersonnel(Array.isArray(data) ? data : []))
      .catch(() => setPersonnel([]));
  }, []);

  function handlePersonChange(value) {
    setSelectedPerson(value);
    if (value === '__other__') {
      setRequesterName('');
      // ไม่แตะช่องหน่วยงาน ปล่อยให้กรอกเองได้เลย
      return;
    }
    const person = personnel.find((p) => p.name === value);
    setRequesterName(value);
    if (person) setUnit(person.unit);
  }

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
    if (!requesterName.trim()) return setError('กรุณากรอกชื่อ-ยศ ผู้ขอเบิก');
    if (!unit.trim()) return setError('กรุณากรอกหน่วยงาน/หน่วยที่สังกัด');
    if (!purpose.trim()) return setError('กรุณากรอกวัตถุประสงค์การขอเบิก');
    if (!category) return setError('กรุณาเลือกหมวดหมู่ค่าใช้จ่าย');
    if (!amount || parseFloat(amount) <= 0) return setError('กรุณากรอกจำนวนเงินให้ถูกต้อง');
    if (!neededDate) return setError('กรุณาเลือกวันที่ต้องการใช้เงิน');
    setError('');
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append('requesterName', requesterName);
      form.append('unit', unit);
      form.append('purpose', purpose);
      form.append('category', category);
      form.append('amount', amount);
      form.append('neededDate', neededDate);
      form.append('note', note);
      if (file) form.append('attachment', file);
      if (profile) form.append('lineUserId', profile.userId);

      const accessToken = isLiffReady() && liff.isLoggedIn() ? liff.getAccessToken() : '';

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/requests`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: form,
      });

      if (!res.ok) throw new Error('ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');

      const data = await res.json().catch(() => ({}));
      setRequestNo(data.requestNo || tempRequestNo());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setPurpose('');
    setCategory('');
    setAmount('');
    setNote('');
    clearFile();
    setError('');
    setSubmitted(false);
    setNeededDate(new Date().toISOString().slice(0, 10));
  }

  function finish() {
    if (isLiffReady() && liff.isInClient()) liff.closeWindow();
  }

  if (submitted) {
    return (
      <div className="phone">
        <div className="receipt-card">
          <div className="stamp-seal pending">
            รอ
            <br />
            อนุมัติ
          </div>
          <h2 className="confirm-title">ส่งคำขอเบิกเงินแล้ว</h2>
          <div className="req-no">เลขที่คำขอ: {requestNo}</div>
          <div className="summary">
            <div className="summary-row">
              <span>ผู้ขอเบิก</span>
              <b>{requesterName}</b>
            </div>
            <div className="summary-row">
              <span>หน่วยงาน</span>
              <b>{unit}</b>
            </div>
            <div className="summary-row">
              <span>หมวดหมู่</span>
              <b>{category}</b>
            </div>
            <div className="summary-row">
              <span>จำนวนเงิน</span>
              <b>฿ {parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b>
            </div>
            <div className="summary-row">
              <span>ต้องการใช้ภายใน</span>
              <b>{beThai(new Date(neededDate))}</b>
            </div>
          </div>
          <div className="status-note">
            คำขอนี้ถูกส่งไปให้ <b>ผบ.หน่วย</b> พิจารณาอนุมัติผ่าน LINE แล้ว
            เมื่ออนุมัติจะมีการแจ้งเตือนกลับมาที่แชทนี้อีกครั้ง
          </div>
          <div className="confirm-actions">
            <button className="submit-btn" onClick={resetForm}>ส่งคำขอเบิกอีกรายการ</button>
            <button className="btn-ghost" onClick={finish}>ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="eyebrow">
        <span>คำขอเบิกเงิน</span>
        <span>{beThai(new Date())}</span>
      </div>
      <div className="receipt-card">
        <h1>ฟอร์มขอเบิกเงิน</h1>
        <div className="sub">กรอกรายละเอียดคำขอ ระบบจะส่งให้ ผบ.หน่วย อนุมัติผ่าน LINE ต่อไป</div>

        <div className="field">
          <label>ชื่อ-ยศ ผู้ขอเบิก</label>
          <select value={selectedPerson} onChange={(e) => handlePersonChange(e.target.value)}>
            <option value="">เลือกชื่อ-ยศ</option>
            {personnel.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
            <option value="__other__">อื่นๆ (พิมพ์ชื่อเอง)</option>
          </select>
          {selectedPerson === '__other__' && (
            <input
              type="text"
              style={{ marginTop: '10px' }}
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="พิมพ์ชื่อ-ยศ เอง เช่น ร.ต.หญิง กัญญาภัทร แสงจันทร์ ร.น."
            />
          )}
        </div>

        <div className="field">
          <label>หน่วยงาน/หน่วยที่สังกัด</label>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="เช่น ฝกง.นพค.43" />
        </div>

        <div className="field">
          <label>วัตถุประสงค์การขอเบิก</label>
          <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="อธิบายเหตุผลและรายละเอียดการใช้เงิน" />
        </div>

        <div className="field">
          <label>หมวดหมู่ค่าใช้จ่าย</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">เลือกหมวดหมู่</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>จำนวนเงินที่ขอเบิก</label>
          <div className="amount-wrap">
            <span className="baht">฿</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="field">
          <label>วันที่ต้องการใช้เงิน</label>
          <input type="date" value={neededDate} onChange={(e) => setNeededDate(e.target.value)} />
        </div>

        <div className="field">
          <label>แนบเอกสารประกอบ (ถ้ามี)</label>
          <label className="attach-btn">
            📎 ใบเสนอราคา / ประมาณการค่าใช้จ่าย
            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
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
          <label>หมายเหตุเพิ่มเติม (ถ้ามี)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ข้อมูลเพิ่มเติมสำหรับ ผบ.หน่วย" />
        </div>

        {error && <div className="error">{error}</div>}

        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเบิกเงิน'}
        </button>
      </div>
    </div>
  );
}
