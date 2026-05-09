'use client';

/**
 * HR Settings — من تطبيق Frappe HRMS (develop): hrms/hr/doctype/hr_settings/hr_settings.json
 * يتطلب تثبيت HRMS على نفس موقع ERPNext.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useDoc, useUpdateDoc } from '@/lib/client/hooks';

const SINGLETON = 'HR Settings';

function docFlag(v: unknown): boolean {
  return v === 1 || v === true || v === '1';
}

export default function HrSettingsPage() {
  const doc = useDoc<Record<string, unknown>>('HR Settings', SINGLETON);
  const updateMut = useUpdateDoc('HR Settings');
  const d = doc.data;

  const patchAndSave = (patch: Record<string, unknown>) => {
    updateMut.mutate(
      { name: SINGLETON, doc: patch },
      {
        onSuccess: () => {
          toast.success('تم الحفظ');
          void doc.refetch();
        },
        onError: (e) =>
          toast.error('تعذر الحفظ', { description: (e as Error).message }),
      }
    );
  };

  const toggle = (field: string, checked: boolean) => patchAndSave({ [field]: checked ? 1 : 0 });
  const restrictBack = d ? docFlag(d.restrict_backdated_leave_application) : false;
  const sendLeave = d ? docFlag(d.send_leave_notification) : false;

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="إعدادات الموارد البشرية"
        description="إعدادات الموارد البشرية — مطابقة مستند «إعدادات الموارد البشرية» عند تثبيت تطبيق الموارد البشرية"
        iconify="solar:users-group-rounded-bold-duotone"
        accent="info"
        breadcrumbs={[
          { label: 'الإعدادات', href: '/settings' },
          { label: 'إعدادات الوحدات', href: '/settings/module-settings' },
          { label: 'الموارد البشرية' },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/module-settings">
              <ArrowRight className="h-3.5 w-3.5" />
              المركز
            </Link>
          </Button>
        }
      />

      <ListQueryAlert error={doc.isError ? (doc.error as Error) : null} onRetry={() => void doc.refetch()} />

      {doc.isLoading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل…</p>
      ) : !d ? (
        <p className="text-sm text-destructive">
          تعذر تحميل إعدادات الموارد البشرية — ثبّت تطبيق الموارد البشرية على الخادم أو تحقق من الصلاحيات.
        </p>
      ) : (
        <Card className="border-border/40 max-w-4xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">إعدادات الموارد البشرية</CardTitle>
            <CardDescription className="text-xs">الحقول مطابقة لمستند إعدادات الموارد البشرية في التطبيق المرتبط.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="employee" className="w-full">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/35 p-1">
                <TabsTrigger value="employee" className="text-xs">
                  الموظف
                </TabsTrigger>
                <TabsTrigger value="leaves" className="text-xs">
                  الإجازات
                </TabsTrigger>
                <TabsTrigger value="expenses" className="text-xs">
                  المصروفات
                </TabsTrigger>
                <TabsTrigger value="attendance" className="text-xs">
                  الحضور
                </TabsTrigger>
                <TabsTrigger value="recruitment" className="text-xs">
                  التوظيف
                </TabsTrigger>
              </TabsList>

              <TabsContent value="employee" className="space-y-4 mt-4 outline-none">
                <div className="space-y-2">
                  <Label className="text-xs">تسمية الموظف حسب</Label>
                  <Select
                    value={String(d.emp_created_by ?? 'Naming Series')}
                    onValueChange={(v) => patchAndSave({ emp_created_by: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Naming Series">سلسلة التسمية</SelectItem>
                      <SelectItem value="Employee Number">رقم الموظف</SelectItem>
                      <SelectItem value="Full Name">الاسم الكامل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">ساعات العمل المعيارية</Label>
                    <Input
                      dir="ltr"
                      type="number"
                      step="any"
                      className="h-9 font-mono text-sm"
                      defaultValue={d.standard_working_hours != null ? String(d.standard_working_hours) : ''}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        patchAndSave({ standard_working_hours: v === '' ? 0 : Number(v) });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">سن التقاعد (بالسنوات)</Label>
                    <Input
                      dir="ltr"
                      className="h-9 font-mono text-sm"
                      defaultValue={String(d.retirement_age ?? '')}
                      onBlur={(e) => patchAndSave({ retirement_age: e.target.value.trim() || undefined })}
                    />
                  </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">تذكيرات</p>
                {(
                  [
                    ['send_work_anniversary_reminders', 'ذكرى توظيف'],
                    ['send_birthday_reminders', 'تواريخ الميلاد'],
                    ['send_holiday_reminders', 'العطلات'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
                {docFlag(d.send_holiday_reminders) ? (
                  <div className="space-y-2">
                    <Label className="text-xs">معدل تذكير العطلات</Label>
                    <Select
                      value={String(d.frequency ?? 'Weekly')}
                      onValueChange={(v) => patchAndSave({ frequency: v })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">أسبوعي</SelectItem>
                        <SelectItem value="Monthly">شهري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label className="text-xs">مرسل (حساب البريد)</Label>
                  <ErpLinkCombobox
                    doctype="Email Account"
                    value={String(d.sender ?? '')}
                    onChange={(v) => patchAndSave({ sender: v || undefined })}
                    className="h-9 text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="leaves" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['leave_approver_mandatory_in_leave_application', 'إلزام موافق الإجازة'],
                    ['prevent_self_leave_approval', 'منع موافقة الموظف على إجازته'],
                    ['show_leaves_of_all_department_members_in_calendar', 'إظهار إجازات جميع الأقسام في التقويم'],
                    ['auto_leave_encashment', 'تحويل الإجازة إلى نقد تلقائياً'],
                    ['send_leave_notification', 'إرسال إشعار الإجازة'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-xs">تقييد الإجازة بأثر رجعي</Label>
                  <Switch
                    checked={restrictBack}
                    onCheckedChange={(c) => patchAndSave({ restrict_backdated_leave_application: c ? 1 : 0 })}
                  />
                </div>
                {restrictBack ? (
                  <div className="space-y-2">
                    <Label className="text-xs">الدور المسموح بإنشاء إجازة بأثر رجعي</Label>
                    <ErpLinkCombobox
                      doctype="Role"
                      value={String(d.role_allowed_to_create_backdated_leave_application ?? '')}
                      onChange={(v) =>
                        patchAndSave({ role_allowed_to_create_backdated_leave_application: v || undefined })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                ) : null}
                {sendLeave ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">قالب إشعار موافقة الإجازة</Label>
                      <ErpLinkCombobox
                        doctype="Email Template"
                        value={String(d.leave_approval_notification_template ?? '')}
                        onChange={(v) => patchAndSave({ leave_approval_notification_template: v || undefined })}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">قالب إشعار حالة الإجازة</Label>
                      <ErpLinkCombobox
                        doctype="Email Template"
                        value={String(d.leave_status_notification_template ?? '')}
                        onChange={(v) => patchAndSave({ leave_status_notification_template: v || undefined })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="expenses" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['expense_approver_mandatory_in_expense_claim', 'إ��زام مصروف任职'],
                    ['prevent_self_expense_approval', 'منع موافقة الموظف على مصروفاته'],
                    ['unlink_payment_on_cancellation_of_employee_advance', 'إلغاء ربط الدفع عند إلغاء السلف'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="attendance" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['allow_multiple_shift_assignments', 'السماح بعدة نوبات في نفس التاريخ'],
                    ['allow_employee_checkin_from_mobile_app', 'السماح بتسجيل الوصول من تطبيق الجوال'],
                    ['allow_geolocation_tracking', 'السماح بتتبع الموقع الجغرافي'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="recruitment" className="space-y-3 mt-4 outline-none">
                {(
                  [
                    ['check_vacancies', 'التحقق من الوظائف الشاغرة عند إنشاء عرض العمل'],
                    ['send_interview_reminder', 'إرسال تذكير المقابلة'],
                    ['send_interview_feedback_reminder', 'إرسال تذكير ملاحظات المقابلة'],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3">
                    <Label className="text-xs leading-snug">{label}</Label>
                    <Switch checked={docFlag(d[field])} onCheckedChange={(c) => toggle(field, c)} disabled={updateMut.isPending} />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-xs">مرسل التوظيف (حساب البريد)</Label>
                  <ErpLinkCombobox
                    doctype="Email Account"
                    value={String(d.hiring_sender ?? '')}
                    onChange={(v) => patchAndSave({ hiring_sender: v || undefined })}
                    className="h-9 text-sm"
                  />
                </div>
              </TabsContent>
            </Tabs>
            {updateMut.isPending ? (
              <p className="text-[10px] text-muted-foreground mt-3">جاري الحفظ…</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
