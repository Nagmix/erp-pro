import Link from 'next/link';
import { Home, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 bg-primary/5 rounded-full blur-3xl" />
          </div>

          {/* 404 Number */}
          <div className="relative">
            <h1 className="text-[120px] sm:text-[160px] font-extrabold text-primary/10 leading-none select-none">
              404
            </h1>
            {/* Overlay icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Search className="h-10 w-10 text-primary/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          الصفحة غير موجودة
        </h2>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى عنوان آخر. يرجى التحقق من الرابط أو العودة إلى الصفحة الرئيسية.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 justify-center">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              الصفحة الرئيسية
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <ArrowRight className="h-4 w-4" />
              لوحة التحكم
            </Link>
          </Button>
        </div>

        {/* Decorative dots */}
        <div className="mt-12 flex items-center justify-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/20"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
