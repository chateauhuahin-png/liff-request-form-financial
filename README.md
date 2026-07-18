# liff-request-form

ฟอร์ม LIFF ที่ทำหน้าที่ **3 อย่างในตัวเดียว** ขึ้นอยู่กับลิงก์ที่เปิดเข้ามา:

- เปิดแบบปกติ (ลิงก์จาก Rich Menu หรือ `https://liff.line.me/{LIFF_ID}`) → **ฟอร์มขอเบิกเงิน** (ขั้นตอน ① — ผู้ขอเบิกกรอก)
- เปิดด้วย `?requestId=123` ต่อท้ายลิงก์ → **ฟอร์มจ่ายเงิน** (ขั้นตอน ③ — น.การเงิน กรอก)
- เปิดด้วย `?settleId=123` ต่อท้ายลิงก์ → **ฟอร์มส่งหลักฐานปิดเรื่อง** (ขั้นตอน ④ — ผู้ขอเบิกกรอก)

ลิงก์ทั้งสองแบบหลัง backend เป็นคนสร้างส่งให้อัตโนมัติทาง LINE ตามจังหวะของกระบวนการ ไม่ต้องกดหาเอง

เขียนด้วย React + Vite

## กระบวนการทั้งหมด (ภาพรวม)

1. **ผู้ขอเบิก** — กรอกฟอร์มนี้ (โหมดปกติ) → สถานะ "รอการอนุมัติ"
2. **ผบ.หน่วย** — อนุมัติ/ไม่อนุมัติผ่าน Flex Message ใน LINE โดยตรง (ไม่ใช้ฟอร์ม LIFF)
3. **น.การเงิน** — กดลิงก์ที่ backend ส่งมาให้ เปิดฟอร์มนี้ (โหมด `?requestId=`) จ่ายเงิน (เงินสด/โอน) แนบหลักฐานการจ่าย
4. **ผู้ขอเบิก** — กดลิงก์ที่ backend ส่งมาให้ เปิดฟอร์มนี้ (โหมด `?settleId=`) ส่งหลักฐานการใช้จ่ายจริง ปิดเรื่อง ✅ จบกระบวนการ

## 1. ตั้งค่าฝั่ง LINE Developers

1. เข้า [LINE Developers Console](https://developers.line.biz/console/) → เลือก Provider ของคุณ
2. เข้า Channel ของ LINE OA (Messaging API channel) → แท็บ **LIFF** → **Add**
   - **Size**: `Full`
   - **Endpoint URL**: ใส่หลัง deploy เสร็จ (ดูข้อ 4)
   - **Scope**: `profile`
3. คัดลอก **LIFF ID** ใส่ในไฟล์ `.env`

## 2. ติดตั้งและรันบนเครื่อง

```bash
npm install
cp .env.example .env
# แก้ .env ใส่ VITE_LIFF_ID และ VITE_API_BASE_URL
npm run dev
```

## 3. Build

```bash
npm run build
```

## 4. Deploy ขึ้น Cloudflare Pages

1. Push ขึ้น GitHub repo
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Build command: `npm run build`, Output directory: `dist`
4. ตั้ง Environment variables (`VITE_LIFF_ID`, `VITE_API_BASE_URL`)
5. เอา URL ที่ได้ไปใส่เป็น Endpoint URL ของ LIFF app ใน LINE Developers Console

## 5. Backend endpoint ที่ต้องมี

ฟอร์มนี้ยิง `POST {VITE_API_BASE_URL}/requests` แบบ `multipart/form-data`:

| field | ประเภท | คำอธิบาย |
|---|---|---|
| `requesterName` | string | ชื่อ-ยศ ผู้ขอเบิก |
| `unit` | string | หน่วยงาน/หน่วยที่สังกัด |
| `purpose` | string | วัตถุประสงค์การขอเบิก |
| `category` | string | หมวดหมู่ค่าใช้จ่าย |
| `amount` | number (string) | จำนวนเงินที่ขอเบิก |
| `neededDate` | `YYYY-MM-DD` | วันที่ต้องการใช้เงิน |
| `note` | string | หมายเหตุ (optional) |
| `attachment` | file | ใบเสนอราคา/ประมาณการ (optional) |
| `lineUserId` | string | userId จาก LIFF profile |

พร้อม header `Authorization: Bearer {liff access token}`

**Backend ควรตอบกลับ JSON** ที่มี `requestNo` (เลขที่คำขอ ออกโดย backend) เพื่อให้ฟอร์มแสดงในหน้ายืนยัน เช่น:

```json
{ "requestNo": "REQ-2569-0007" }
```

จากนั้น backend มีหน้าที่ต่อ: บันทึกสถานะ `pending_approval` และส่ง Flex Message แจ้ง ผบ.หน่วย ให้กดอนุมัติ/ไม่อนุมัติ
(เป็นขั้นตอนที่ ② ซึ่งจะสร้างแยกในโปรเจกต์ backend)

## 6. Endpoint ที่ฟอร์มจ่ายเงิน (โหมด `?requestId=`) ใช้

- `GET {VITE_API_BASE_URL}/requests/{id}` — ดึงรายละเอียดคำขอมาแสดงก่อนจ่าย
- `POST {VITE_API_BASE_URL}/requests/{id}/pay` — ส่งแบบ `multipart/form-data`:

| field | ประเภท | คำอธิบาย |
|---|---|---|
| `paymentMethod` | `cash` \| `transfer` | วิธีจ่าย |
| `proof` | file | หลักฐานการจ่าย (optional) |
| `financeUserId` | string | userId ของ น.การเงิน จาก LIFF profile |

## 7. Endpoint ที่ฟอร์มส่งหลักฐานปิดเรื่อง (โหมด `?settleId=`) ใช้

- `GET {VITE_API_BASE_URL}/requests/{id}` — ดึงรายละเอียดคำขอมาแสดง
- `POST {VITE_API_BASE_URL}/requests/{id}/settle` — ส่งแบบ `multipart/form-data`:

| field | ประเภท | คำอธิบาย |
|---|---|---|
| `actualAmount` | number (string) | ยอดใช้จ่ายจริง |
| `note` | string | หมายเหตุ (optional) |
| `receipt` | file | รูปใบเสร็จ (optional) |
