import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CourseForm from "@/components/courses/CourseForm";

export default function NewCoursePage() {
  return (
    <>
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-10 sticky top-0 z-10 gap-4">
        <Link
          href="/teacher/courses"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">สร้างวิชาใหม่</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-2xl mx-auto">
          <CourseForm mode="create" />
        </div>
      </div>
    </>
  );
}
