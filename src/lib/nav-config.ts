export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const TEACHER_NAV: NavItem[] = [
  { label: "หน้าหลัก", href: "/teacher", icon: "layout-dashboard" },
  { label: "รายวิชาของฉัน", href: "/teacher/courses", icon: "book-open" },
  { label: "ตั้งค่าระบบ", href: "/teacher/settings", icon: "settings" },
];

export const STUDENT_NAV: NavItem[] = [
  { label: "วิชาที่ลงเรียน", href: "/student", icon: "book-open" },
  { label: "ประวัติเข้าเรียน", href: "/student/history", icon: "clock" },
];
