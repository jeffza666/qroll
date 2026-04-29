import { requireTeacher } from "@/lib/auth-helpers";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireTeacher();
  return <>{children}</>;
}
