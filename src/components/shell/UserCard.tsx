"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function UserCard({ name, email }: { name: string; email: string }) {
  return (
    <div className="p-5 border-t border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-red-100 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-qroll-red-dark">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
          <p className="text-xs text-slate-500 truncate">{email}</p>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-5 w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        ออกจากระบบ
      </button>
    </div>
  );
}
