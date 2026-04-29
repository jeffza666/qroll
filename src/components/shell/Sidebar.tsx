"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Settings, Clock, LucideProps } from "lucide-react";
import { Role } from "@prisma/client";
import { NavItem, TEACHER_NAV, STUDENT_NAV } from "@/lib/nav-config";
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
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${
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
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 flex-shrink-0">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#990000] rounded-xl flex items-center justify-center shadow-md">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <path d="M9 9h.01" />
              <path d="M15 9h.01" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              QRoll<span className="text-[#990000]">.</span>
            </span>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider -mt-0.5">
              Smart Attendance
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {nav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User card */}
      <UserCard name={user.name} email={user.email} />
    </aside>
  );
}
