import liff from '@line/liff';

let liffReady = false;

/**
 * เรียกครั้งเดียวตอนแอปเริ่มทำงาน (ดูใน main.jsx)
 * ต้องตั้งค่า VITE_LIFF_ID ใน .env ก่อน (ดูวิธีได้ใน README.md)
 *
 * ถ้ายังไม่ได้ตั้งค่า VITE_LIFF_ID (เช่นตอนพรีวิวบนเครื่องก่อนไปสร้าง LIFF app จริง)
 * จะข้ามการเชื่อมต่อ LIFF ไปเลย แทนที่จะทำให้หน้าเว็บ crash
 */
export async function initLiff() {
  const liffId = import.meta.env.VITE_LIFF_ID;

  if (!liffId) {
    console.warn('ยังไม่ได้ตั้งค่า VITE_LIFF_ID ใน .env — รันในโหมดพรีวิวบนเครื่อง (ยังไม่เชื่อมต่อ LINE จริง)');
    return false;
  }

  try {
    await liff.init({ liffId });

    // ถ้าเปิดนอกแอป LINE (เช่นเปิดในเบราว์เซอร์ธรรมดา) และยังไม่ login ให้ login ก่อน
    if (!liff.isLoggedIn() && !liff.isInClient()) {
      liff.login();
    }
    liffReady = true;
    return true;
  } catch (err) {
    console.error('LIFF init ล้มเหลว:', err);
    return false;
  }
}

export function isLiffReady() {
  return liffReady;
}

export { liff };
