import { Role } from "@prisma/client";

import CheckInShell from "@/components/checkin/CheckInShell";
import SessionSummary from "@/components/checkin/SessionSummary";
import StatusPanel from "@/components/checkin/StatusPanel";
import StudentCheckInForm from "@/components/checkin/StudentCheckInForm";
import { auth } from "@/lib/auth";
import { getCheckInContext } from "@/lib/checkin";

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

function InvalidState({ reason }: { reason: "missing_token" | "invalid" | "expired" | "closed" }) {
  const copy = {
    missing_token: {
      title: "ไม่พบ QR token",
      message: "กรุณาสแกน QR จากหน้าคาบเรียนอีกครั้ง",
      tone: "danger" as const,
    },
    invalid: {
      title: "QR ไม่ถูกต้อง",
      message: "ลิงก์นี้ไม่ตรงกับ session ที่เปิดอยู่",
      tone: "danger" as const,
    },
    expired: {
      title: "QR หมดอายุแล้ว",
      message: "QR เปลี่ยนทุก 30 วินาที กรุณาสแกนรอบล่าสุดบนจออาจารย์",
      tone: "warning" as const,
    },
    closed: {
      title: "ปิดการเช็คชื่อแล้ว",
      message: "session นี้ไม่รับการเช็คชื่อเพิ่มเติม",
      tone: "neutral" as const,
    },
  }[reason];

  return (
    <CheckInShell
      eyebrow="Student"
      title="เช็คชื่อเข้าเรียน"
      subtitle="สแกน QR จากหน้าจออาจารย์เพื่อเข้าเรียน"
    >
      <StatusPanel tone={copy.tone} title={copy.title} message={copy.message} />
    </CheckInShell>
  );
}

export default async function CheckInPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.t ?? "";
  const [session, context] = await Promise.all([auth(), getCheckInContext(token)]);

  if (!context.ok) return <InvalidState reason={context.reason} />;

  if (!session?.user) {
    return (
      <CheckInShell
        eyebrow="Student"
        title="เช็คชื่อเข้าเรียน"
        subtitle="กรุณาเข้าสู่ระบบก่อนเช็คชื่อ"
      >
        <StatusPanel
          tone="neutral"
          title="ยังไม่ได้เข้าสู่ระบบ"
          message="ระบบจะพาคุณไปหน้า login อัตโนมัติ ถ้ายังอยู่หน้านี้ให้เปิดลิงก์ใหม่อีกครั้ง"
        />
      </CheckInShell>
    );
  }

  if (session.user.role !== Role.STUDENT) {
    return (
      <CheckInShell
        eyebrow="Student"
        title="เช็คชื่อเข้าเรียน"
        subtitle="บัญชีที่ใช้เช็คชื่อจริงต้องเป็นบัญชีนักศึกษา"
      >
        <SessionSummary
          courseCode={context.session.course.code}
          courseName={context.session.course.name}
          semester={context.session.course.semester}
          timeLabel={`${formatBangkokDateTime(context.session.startsAt)} - ${formatBangkokDateTime(context.session.endsAt)}`}
          room={context.session.room}
        />
        <StatusPanel
          tone="danger"
          title="บัญชีนี้ไม่ใช่นักศึกษา"
          message="กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษาเพื่อเช็คชื่อจริง"
        />
      </CheckInShell>
    );
  }

  return (
    <CheckInShell
      eyebrow="Student"
      title="เช็คชื่อเข้าเรียน"
      subtitle="ตรวจสอบข้อมูลของคุณก่อนกดยืนยันเข้าเรียน"
    >
      <SessionSummary
        courseCode={context.session.course.code}
        courseName={context.session.course.name}
        semester={context.session.course.semester}
        timeLabel={`${formatBangkokDateTime(context.session.startsAt)} - ${formatBangkokDateTime(context.session.endsAt)}`}
        room={context.session.room}
      />
      <StudentCheckInForm
        token={token}
        student={{
          name: session.user.name ?? session.user.email ?? "Student",
          email: session.user.email ?? "-",
          studentId: session.user.studentId,
        }}
      />
    </CheckInShell>
  );
}
