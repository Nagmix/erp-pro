'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { FileUpload } from '@/components/ui/file-upload';
import { FormField as ErpFormField } from '@/components/erp/form-field';
import { CurrencyInput } from '@/components/erp/currency-input';
import { useFormDraft } from '@/lib/client/use-form-draft';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'checkbox' | 'multiselect' | 'file' | 'daterange';
  placeholder?: string;
  options?: { label: string; value: string }[];
  dir?: 'rtl' | 'ltr';
  required?: boolean;
  defaultValue?: string | number | boolean;
  colSpan?: 1 | 2;
  size?: 'sm' | 'md' | 'lg';
  hint?: string;
  currency?: string;
  /** When true and type is 'file', files are uploaded automatically on selection (P1-03) */
  autoUpload?: boolean;
  /** ERP doctype to pass to the file upload API (P1-03) */
  fileDoctype?: string;
  /** ERP docname to pass to the file upload API (P1-03) */
  fileDocname?: string;
}

interface DocFormProps {
  title: string;
  fields: FormField[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
  isPending?: boolean;
  initialData?: Record<string, unknown>;
  children?: ReactNode;
  // Optional react-hook-form integration
  form?: UseFormReturn<FieldValues>;
  onFormSubmit?: SubmitHandler<FieldValues>;
  dialogSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  enableDraft?: boolean;
  draftKey?: string;
  /** Default doctype for all file fields in this form (P1-03) */
  fileDoctype?: string;
  /** Default docname for all file fields in this form (P1-03) */
  fileDocname?: string;
}

export function DocForm({
  title,
  fields,
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  initialData,
  children,
  form,
  onFormSubmit,
  dialogSize = 'lg',
  enableDraft = true,
  draftKey,
  fileDoctype,
  fileDocname,
}: DocFormProps) {
  const initialState = useMemo(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((f) => {
      initial[f.key] = initialData?.[f.key] ?? f.defaultValue ?? '';
    });
    return initial;
  }, [fields, initialData]);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialState);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { readDraft, saveDraft, clearDraft, hydrated } = useFormDraft<Record<string, unknown>>({
    key: draftKey ?? `doc-form:${title}`,
    enabled: enableDraft && !form,
    initialValue: initialState,
    delayMs: 550,
  });

  const handleChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!enableDraft || form || !hydrated) return;
    const draft = readDraft();
    if (draft)
      queueMicrotask(() => setFormData((prev) => ({ ...prev, ...draft })));
  }, [enableDraft, form, hydrated, readDraft]);

  useEffect(() => {
    if (!enableDraft || form) return;
    saveDraft(formData);
  }, [enableDraft, form, formData, saveDraft]);

  const markTouched = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const getManualError = (field: FormField): string | undefined => {
    if (!field.required) return undefined;
    const shouldValidate = submitAttempted || touched[field.key];
    if (!shouldValidate) return undefined;
    const value = formData[field.key];
    const empty =
      value == null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'number' && Number.isNaN(value));
    return empty ? 'هذا الحقل مطلوب' : undefined;
  };

  const sizeClass = (size: FormField['size']): string =>
    size === 'sm' ? 'h-8 text-xs' : size === 'lg' ? 'h-11 text-base' : 'h-10 text-sm';

  const validationClass = (field: FormField): string => {
    const manualError = getManualError(field);
    const hasValue = String(formData[field.key] ?? '').trim().length > 0;
    if (manualError) return 'border-destructive focus-visible:ring-destructive/20';
    if ((submitAttempted || touched[field.key]) && hasValue) return 'border-success/60 focus-visible:ring-success/20';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // If react-hook-form is provided, use it
    if (form && onFormSubmit) {
      form.handleSubmit(onFormSubmit)(e as unknown as React.FormEvent<HTMLFormElement>);
      return;
    }

    try {
      await onSubmit(formData);
      toast.success('تم الحفظ بنجاح');
      onOpenChange(false);
      const reset: Record<string, unknown> = {};
      fields.forEach((f) => {
        reset[f.key] = f.defaultValue ?? '';
      });
      setFormData(reset);
      setTouched({});
      clearDraft();
    } catch (error) {
      toast.error('فشل الحفظ: ' + (error instanceof Error ? error.message : 'حدث خطأ'));
    }
  };

  const renderField = (field: FormField) => {
    const baseClass = cn(sizeClass(field.size), validationClass(field));

    // If react-hook-form is provided, use its register
    if (form) {
      const registerProps = form.register(field.key);
      
      switch (field.type) {
        case 'select':
          return (
            <select
              className={cn('w-full rounded-[var(--radius-md-ui)] border border-border/40 bg-background px-3 text-start text-sm', baseClass)}
              {...registerProps}
              dir={field.dir ?? 'rtl'}
            >
              <option value="">اختر...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          );
        case 'textarea':
          return (
            <Textarea
              className={cn('min-h-[80px]', baseClass)}
              placeholder={field.placeholder}
              {...registerProps}
              dir={field.dir ?? 'rtl'}
            />
          );
        case 'multiselect':
          return (
            <MultiSelect
              options={field.options ?? []}
              value={Array.isArray(form.getValues(field.key)) ? (form.getValues(field.key) as string[]) : []}
              onChange={(next) => form.setValue(field.key, next)}
            />
          );
        case 'file':
          return (
            <FileUpload
              value={(form.getValues(field.key) as File[] | undefined) ?? []}
              onChange={(next) => form.setValue(field.key, next)}
              autoUpload={field.autoUpload}
              doctype={field.fileDoctype ?? fileDoctype}
              docname={field.fileDocname ?? fileDocname}
              onUploadComplete={(result, file) => {
                form.setValue(`${field.key}_url`, result.file_url);
              }}
              onUploadError={(error) => {
                toast.error('فشل رفع الملف: ' + error.message);
              }}
            />
          );
        case 'daterange':
          return (
            <DateRangePicker
              value={(form.getValues(field.key) as { from?: string; to?: string } | undefined) ?? {}}
              onChange={(next) => form.setValue(field.key, next)}
            />
          );
        default:
          return (
            <Input
              type={field.type}
              placeholder={field.placeholder}
              {...registerProps}
              className={baseClass}
              dir={field.dir ?? 'rtl'}
            />
          );
      }
    }

    // Manual form handling
    const value = formData[field.key];

    switch (field.type) {
      case 'select':
        return (
          <select
            className={cn('w-full rounded-[var(--radius-md-ui)] border border-border/40 bg-background px-3 text-start text-sm', baseClass)}
            value={String(value || '')}
            onChange={(e) => {
              handleChange(field.key, e.target.value);
              markTouched(field.key);
            }}
            onBlur={() => markTouched(field.key)}
            dir={field.dir ?? 'rtl'}
          >
            <option value="">اختر...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <Textarea
            className={cn('min-h-[80px]', baseClass)}
            placeholder={field.placeholder}
            value={String(value || '')}
            onChange={(e) => {
              handleChange(field.key, e.target.value);
              markTouched(field.key);
            }}
            onBlur={() => markTouched(field.key)}
            dir={field.dir ?? 'rtl'}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.key}
              checked={!!value}
              onChange={(e) => {
                handleChange(field.key, e.target.checked);
                markTouched(field.key);
              }}
              className="rounded border-input"
            />
            <label htmlFor={field.key} className="text-xs">{field.placeholder || field.label}</label>
          </div>
        );
      case 'number':
        return (
          <CurrencyInput
            value={typeof value === 'number' ? value : Number(value || 0)}
            onValueChange={(next) => {
              handleChange(field.key, next ?? 0);
              markTouched(field.key);
            }}
            className={baseClass}
            currency={field.currency}
          />
        );
      case 'multiselect':
        return (
          <MultiSelect
            options={field.options ?? []}
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(next) => {
              handleChange(field.key, next);
              markTouched(field.key);
            }}
          />
        );
      case 'file':
        return (
          <FileUpload
            value={Array.isArray(value) ? (value as File[]) : []}
            onChange={(next) => {
              handleChange(field.key, next);
              markTouched(field.key);
            }}
            autoUpload={field.autoUpload}
            doctype={field.fileDoctype ?? fileDoctype}
            docname={field.fileDocname ?? fileDocname}
            onUploadComplete={(result) => {
              handleChange(`${field.key}_url`, result.file_url);
            }}
            onUploadError={(error) => {
              toast.error('فشل رفع الملف: ' + error.message);
            }}
          />
        );
      case 'daterange':
        return (
          <DateRangePicker
            value={(value as { from?: string; to?: string } | undefined) ?? {}}
            onChange={(next) => {
              handleChange(field.key, next);
              markTouched(field.key);
            }}
          />
        );
      default:
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={field.type === 'date' ? String(value || '') : String(value || '')}
            onChange={(e) => {
              handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value);
              markTouched(field.key);
            }}
            onBlur={() => markTouched(field.key)}
            className={baseClass}
            dir={field.dir ?? 'rtl'}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" size={dialogSize} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => (
              <ErpFormField
                key={field.key}
                label={field.type === 'checkbox' ? undefined : field.label}
                required={field.required}
                size={field.size ?? 'md'}
                hint={field.hint}
                error={
                  form && form.formState.errors[field.key]
                    ? String(form.formState.errors[field.key]?.message ?? '')
                    : !form
                      ? getManualError(field)
                    : undefined
                }
                className={field.colSpan === 2 ? 'col-span-2' : ''}
              >
                {renderField(field)}
              </ErpFormField>
            ))}
          </div>
          {children}
          <DialogFooter className="gap-2 pt-4">
            {!form && enableDraft ? <p className="text-[11px] text-muted-foreground me-auto">يتم حفظ المسودة تلقائياً</p> : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-sm">
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending} className="text-sm">
              {isPending ? 'جارٍ الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
