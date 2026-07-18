import RequestForm from './RequestForm.jsx';
import PaymentForm from './PaymentForm.jsx';

// ฟอร์มนี้ทำหน้าที่ 2 อย่างในตัวเดียว ขึ้นอยู่กับลิงก์ที่เปิดเข้ามา:
// - เปิดแบบปกติ (ไม่มี query param) -> ฟอร์มขอเบิกเงิน (ขั้นตอน ①)
// - เปิดด้วย ?requestId=123 ต่อท้าย -> ฟอร์มจ่ายเงิน (ขั้นตอน ③ ใช้โดย น.การเงิน)
//   ลิงก์แบบนี้ backend เป็นคนสร้างส่งให้อัตโนมัติตอนคำขอได้รับอนุมัติ
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('requestId');

  if (requestId) {
    return <PaymentForm requestId={requestId} />;
  }

  return <RequestForm />;
}
