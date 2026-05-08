# ERP Pro - UI/UX Design Rules & Issues Tracker

هذا الملف يحتوي على القواعد التصميم发现问题 التي تحتاج إصلاح.

---

## المشاكل المكتشفة (Issues)

### 1. عدم تناسق الـ Forms
**الحالة**: موجودة
**الوصف**: بعض الصفحات تستخدم `FormField` component واحترافي، وأخرى تستخدم `Label` + `Input` مباشر

**صفحات احترافية (-good)**:
- `src/app/(dashboard)/accounting/chart-of-accounts/page.tsx` - تستخدم FormField + fieldset
- `src/app/(dashboard)/sales/customers/page.tsx` - تستخدم FormField + fieldset grouped

**صفحات غير احترافية (bad)**:
- `src/app/(dashboard)/sales/sales-orders/page.tsx` - Label + Input مباشر
- `src/app/(dashboard)/hr/employees/page.tsx` - Label + Input مباشر
- `src/app/(dashboard)/purchases/suppliers/page.tsx` - Label + Input مباشر

### 2. مشكلة Labels في Sales Orders
**الحالة**: موجودة
**الوصف**: الـ Labels تظهر مع `className="text-xs"` بينما في صفحة الحسابات تستخدم `FormField` مع `text-[13px]` و `font-semibold`

### 3. عدم استخدام Fieldset Groups
**الحالة**: موجودة
**الوصف**: صفحة الحسابات تستخدم `fieldset` مع عناوين وأيقونات وgradients، بينما Sales Orders لا تستخدم

### 4. Select Components Styling
**الحالة**: تحتاج مراجعة
**الوصف**: الـ Select في Sales Orders يستخدم ErpLinkCombobox بدلاً من Selectcomponent

---

## القواعد التصميم (Design Rules)

### 1.Forms Structure

```tsx
// ❌ سيء - بدون تنظيم
<div className="space-y-2">
  <Label>العميل</Label>
  <Input />
</div>

// ✅ جيد - باستخدام FormField
<FormField label="العميل" required>
  <Input placeholder="اختر العميل..." />
</FormField>

// ✅ أحسن - مع fieldset grouping
<fieldset className="rounded-2xl border border-border/40 overflow-hidden">
  <legend className="sr-only">المعلومات الأساسية</legend>
  <div className="bg-gradient-to-l from-primary/[0.04] px-4 py-2.5 border-b border-border/30">
    <h4 className="text-[12px] font-bold flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      المعلومات الأساسية
    </h4>
  </div>
  <div className="p-4 space-y-4">
    <FormField label="العميل" required>...</FormField>
  </div>
</fieldset>
```

### 2.Label Styling

```tsx
// ❌ سيء
<Label className="text-xs">النص</Label>

// ✅ جيد
<Label className="text-[13px] font-semibold text-foreground">النص</Label>
```

### 3.Input Dimensions

```tsx
// ❌ سيء
<Input className="h-8 text-xs" />

// ✅ جيد - استخدام h-10一貫剂
<Input className="h-10 text-sm" />
```

### 4.Select vs ErpLinkCombobox

```tsx
// للبحث عن سجل من قاعدة البيانات → ErpLinkCombobox
<ErpLinkCombobox doctype="Customer" value={} onChange={} />

// لاختيار من قائمة ثابتة → Select
<Select value={} onValueChange={}>
  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
  <SelectContent dir="rtl">
    <SelectItem value="option1">الخيار</SelectItem>
  </SelectContent>
</Select>
```

### 5.Dialog Content Structure

```tsx
// ✅ جيد
<DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle className="flex items-center gap-3 text-lg font-bold">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <span>العنوان</span>
        <p className="text-xs font-normal text-muted-foreground">الوصف</p>
      </div>
    </DialogTitle>
  </DialogHeader>
</DialogContent>
```

---

## مهام الإصلاح (Todo)

### Priority 1 - Forms Base Components
- [x] Create FormField component - موجود
- [ ] Ensure all pages use FormField
- [ ] Remove duplicate Label + Input patterns

### Priority 2 - Fieldset Groups
- [ ] Add fieldset grouping to Sales Orders form
- [ ] Add fieldset grouping to Purchase Orders form
- [ ] Add fieldset grouping to Employees form
- [ ] Add fieldset grouping to Suppliers form

### Priority 3 - Label Styling
- [ ] Update Labels to use text-[13px] font-semibold
- [ ] Remove inline Label className="text-xs" from all pages

### Priority 4 - Input Dimensions
- [ ] Standardize Input heights to h-10
- [ ] Remove h-8, h-9 from Input usage

### Priority 5 - Dialog Improvements
- [ ] Add icons to Dialog headers
- [ ] Add descriptions to Dialog headers
- [ ] Add gradient section headers

---

## Pages to Fix (by priority)

### High Priority
1. `sales-orders/page.tsx` - Add/Edit Dialog
2. `hr/employees/page.tsx` - Add/Edit Dialog
3. `purchases/suppliers/page.tsx` - Add/Edit Dialog

### Medium Priority
1. `sales/quotations/page.tsx` - Add/Edit Dialog
2. `purchases/purchase-orders/page.tsx` - Add/Edit Dialog
3. `crm/leads/page.tsx` - Add Dialog
4. `crm/opportunities/page.tsx` - Add Dialog

---

## Last Updated
2026-05-02

## Status: In Progress