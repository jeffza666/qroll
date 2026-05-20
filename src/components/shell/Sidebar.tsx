"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  Clock,
  Menu,
  X,
  LucideProps,
} from "lucide-react";
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

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/student"
      ? pathname === "/student" || pathname.startsWith("/student/courses")
      : item.href === "/teacher"
        ? pathname === item.href
        : pathname.startsWith(item.href);

  const Icon = iconMap[item.icon] ?? LayoutDashboard;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
        isActive
          ? "bg-red-50 text-qroll-red-dark border border-red-100"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {item.label}
    </Link>
  );
}

function NavContent({
  nav,
  user,
  onNavigate,
}: {
  nav: NavItem[];
  user: { name: string; email: string };
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="h-20 flex items-center px-6 border-b border-slate-100">
        <QRollLogo />
      </div>
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {nav.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <UserCard name={user.name} email={user.email} />
    </>
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#E2E8F0] flex-col shadow-sm z-10 shrink-0">
        <NavContent nav={nav} user={user} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        className="fixed top-4 left-3 z-30 lg:hidden flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition-colors hover:bg-slate-50"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="ปิดเมนู"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>
        <NavContent nav={nav} user={user} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
