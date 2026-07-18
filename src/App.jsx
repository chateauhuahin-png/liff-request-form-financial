import RequestForm from './RequestForm.jsx';
import PaymentForm from './PaymentForm.jsx';
import SettlementForm from './SettlementForm.jsx';
import ReportView from './ReportView.jsx';

// ฟอร์มนี้ทำหน้าที่ 4 อย่างในตัวเดียว ขึ้นอยู่กับลิงก์ที่เปิดเข้ามา:
// - เปิดแบบปกติ (ไม่มี query param) -> ฟอร์มขอเบิกเงิน (ขั้นตอน ①)
// - เปิดด้วย ?requestId=123 -> ฟอร์มจ่ายเงิน (ขั้นตอน ③ ใช้โดย น.การเงิน)
// - เปิดด้วย ?settleId=123 -> ฟอร์มส่งหลักฐานปิดเรื่อง (ขั้นตอน ④ ใช้โดยผู้ขอเบิก)
// - เปิดด้วย ?report=daily|weekly|monthly|yearly -> หน้ารายงานสรุปค่าใช้จ่ายแบบเต็ม
//   ลิงก์ทั้งหมด backend เป็นคนสร้างส่งให้อัตโนมัติทาง LINE ตามจังหวะของกระบวนการ
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('requestId');
  const settleId = params.get('settleId');
  const report = params.get('report');

  if (report) {
    return <ReportView initialPeriod={report} />;
  }
  if (settleId) {
    return <SettlementForm requestId={settleId} />;
  }
  if (requestId) {
    return <PaymentForm requestId={requestId} />;
  }

  return <RequestForm />;
}
