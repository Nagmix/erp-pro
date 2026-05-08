'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { MdxWysiwygEditor } from '@/components/erp/mdx-wysiwyg-editor';
import { Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function RichTemplatesPage() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/rich-templates')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.success || !j.data) return;
        setMarkdown(String(j.data.bodyMarkdown ?? ''));
      })
      .catch(() => toast.error('تعذر تحميل المسودة'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/rich-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyMarkdown: markdown }),
      });
      const j = await res.json();
      if (!j?.success) throw new Error('فشل الحفظ');
      setMarkdown(String(j.data.bodyMarkdown ?? markdown));
      toast.success('تم حفظ المسودة الغنية');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [markdown]);

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="محرر قوالب (المحرر المرئي)"
        description="تحرير مرئي لنصوص الشروط والملاحظات ومسودات القوالب — يُحفظ محلياً؛ لقوالب جينجا الكاملة استخدم قوالب الطباعة أو الصق أكواد جينجا في وضع المصدر داخل المحرر"
        iconify="solar:document-text-bold-duotone"
        accent="info"
        breadcrumbs={[
          { label: 'الإعدادات', href: '/settings' },
          { label: 'محرر القوالب' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="" asChild>
              <Link href="/settings/print-templates">
                <FileText className="h-3.5 w-3.5 ms-1" />
                قوالب الطباعة
              </Link>
            </Button>
            <Button size="sm" className="gap-1.5" disabled={loading || saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              حفظ
            </Button>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل…</p>
      ) : (
        <Tabs defaultValue="edit" className="space-y-4">
          <TabsList className="h-auto flex-wrap gap-1 p-1">
            <TabsTrigger value="edit" className="text-xs">
              تحرير
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              معاينة
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <PageShell className="overflow-hidden p-0" padded={false}>
              <MdxWysiwygEditor
                markdown={markdown}
                onChange={setMarkdown}
                placeholder="ابدأ الكتابة…"
                className="border-0 [&_.mdxeditor]:min-h-[320px] [&_[class*='toolbar']]:flex-wrap [&_[class*='toolbar']]:bg-muted/35"
              />
            </PageShell>
          </TabsContent>
          <TabsContent value="preview">
            <PageShell>
              <div className="max-w-none space-y-3 text-start text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pe-6 [&_ol]:list-decimal [&_ol]:pe-6 [&_a]:text-primary [&_a]:underline" dir="rtl">
                <ReactMarkdown>{markdown || '*لا محتوى*'}</ReactMarkdown>
              </div>
            </PageShell>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
