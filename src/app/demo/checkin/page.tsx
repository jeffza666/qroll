import CheckInShell from "@/components/checkin/CheckInShell";
import DemoCheckInForm from "@/components/checkin/DemoCheckInForm";
import SessionSummary from "@/components/checkin/SessionSummary";
import StatusPanel from "@/components/checkin/StatusPanel";
import { getCheckInContext, isDemoCheckInEnabled } from "@/lib/checkin";

type Props = {
  searchParams: Promise<{ t?: string }>;
};

function formatBangkokDateTime(date: Date) {
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function DemoCheckInPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.t ?? "";

  if (!isDemoCheckInEnabled()) {
    return (
      <CheckInShell
        eyebrow="Demo"
        title="Demo check-in"
        subtitle="โหมดทดลองถูกแยกจากข้อมูลเช็คชื่อจริง"
      >
        <StatusPanel
          tone="neutral"
          title="Demo mode ปิดอยู่"
          message="ตั้งค่า DEMO_CHECKIN_ENABLED=true เพื่อเปิดให้คนทั่วไปลองเช็คชื่อ"
        />
      </CheckInShell>
    );
  }

  const context = await getCheckInContext(token);
  if (!context.ok) {
    const copy = {
      missing_token: {
        title: "ไม่พบ QR token",
        message: "กรุณาสแกน demo QR ใหม่อีกครั้ง",
        tone: "danger" as const,
      },
      invalid: {
        title: "QR ไม่ถูกต้อง",
        message: "ลิงก์นี้ไม่ตรงกับ session ที่เปิดอยู่",
        tone: "danger" as const,
      },
      expired: {
        title: "QR หมดอายุแล้ว",
        message: "QR เปลี่ยนทุก 30 วินาที กรุณาสแกนรอบล่าสุด",
        tone: "warning" as const,
      },
      closed: {
        title: "ปิดการเช็คชื่อแล้ว",
        message: "session นี้ไม่รับ demo check-in เพิ่ม",
        tone: "neutral" as const,
      },
    }[context.reason];

    return (
      <CheckInShell
        eyebrow="Demo"
        title="Demo check-in"
        subtitle="โหมดทดลองถูกแยกจากข้อมูลเช็คชื่อจริง"
      >
        <StatusPanel tone={copy.tone} title={copy.title} message={copy.message} />
      </CheckInShell>
    );
  }

  return (
    <CheckInShell
      eyebrow="Demo"
      title="Demo check-in"
      subtitle="พิมพ์ชื่อเพื่อทดลองเช็คชื่อ ข้อมูลจะถูกเก็บแยกจาก Attendance จริง"
    >
      <SessionSummary
        courseCode={context.session.course.code}
        courseName={context.session.course.name}
        semester={context.session.course.semester}
        timeLabel={`${formatBangkokDateTime(context.session.startsAt)} - ${formatBangkokDateTime(context.session.endsAt)}`}
        room={context.session.room}
      />
      <DemoCheckInForm token={token} />
    </CheckInShell>
  );
}
