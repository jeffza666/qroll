import { requireAuth } from "@/lib/auth-helpers";
import Sidebar from "./Sidebar";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return (
    <div className="flex h-screen bg-[#F7F8FC]">
      <Sidebar role={user.role} user={{ name: user.name ?? user.email, email: user.email }} />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
