"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Settings, Clock, LucideProps } from "lucide-react";
import { Role } from "@prisma/client";
import { NavItem, TEACHER_NAV, STUDENT_NAV } from "@/lib/nav-config";
import QRollLogo from "@/components/brand/QRollLogo";
import UserCard from "./UserCard";

const iconMap: Record<string, React.FC<LucideProps>> = {
  "layout-dashboard": LayoutDashboard,
  "book-open": BookOpen,
  settings: Settings,
  clock: Clock,
};

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/teacher" || item.href === "/student"
      ? pathname === item.href
      : pathname.startsWith(item.href);

  const Icon = iconMap[item.icon] ?? LayoutDashboard;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
        isActive
          ? "bg-red-50 text-[#990000] border border-red-100"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {item.label}
    </Link>
  );
}

export default function Sidebar({
  role,
  user,
}: {
  role: Role;
  user: { name: string; email: string };
}) {
  const nav = role === Role.TEACHER ? TEACHER_NAV : STUDENT_NAV;

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col shadow-sm z-10 shrink-0">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-slate-100">
        <QRollLogo />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {nav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User card */}
      <UserCard name={user.name} email={user.email} />
    </aside>
  );
}
