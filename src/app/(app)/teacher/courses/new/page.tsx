import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CourseForm from "@/components/courses/CourseForm";
import PageHeader from "@/components/shell/PageHeader";

export default function NewCoursePage() {
  return (
    <>
      <PageHeader className="gap-4">
        <Link
          href="/teacher/courses"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">สร้างวิชาใหม่</h1>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        <div className="max-w-2xl mx-auto">
          <CourseForm mode="create" />
        </div>
      </div>
    </>
  );
}
