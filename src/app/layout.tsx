import type { Metadata } from "next";
import { Inter, Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "QRoll",
  description: "Smart attendance for Thammasat University",
  // กัน iOS Safari แปลง date/phone/email ใน text เป็น <a> เอง — ทำให้ DOM ไม่ตรง SSR
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#F7F8FC]">{children}</body>
    </html>
  );
}
