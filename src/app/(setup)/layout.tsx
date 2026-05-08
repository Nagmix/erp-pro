/**
 * تخطيط صفحة الإعداد — بدون شريط جانبي أو رأس
 * يُستخدم فقط لمعالج الإعداد الأولي
 */
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {children}
    </div>
  );
}
