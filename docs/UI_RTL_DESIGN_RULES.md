# ERP Pro UI/UX Design System Rules

## Purpose
This file contains the comprehensive design rules and patterns for UI consistency across the entire ERP Pro project. All UI/UX improvements must follow these rules.

---

## 1. Constraints (MANDATORY)

### 1.1 What is ALLOWED
- Frontend (UI/UX) modifications only
- Styling (CSS / Tailwind / Components)
- Layout and Structure (visual only)
- Using professional icons (no emojis)
- Using modern UI libraries and components

### 1.2 What is STRICTLY FORBIDDEN
- No Backend code modifications
- No API or Business Logic changes
- No deleting or modifying System functions
- No breaking existing functionality

---

## 2. Design System Standards

### 2.1 Professional Form Pattern (MANDATORY)
```tsx
<fieldset className="rounded-2xl border border-border/40 overflow-hidden">
  <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
    <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
      <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="h-3 w-3 text-primary" />
      </span>
      عنوان القسم
    </h4>
  </div>
  <div className="p-4 space-y-4 bg-card/50">
    <div className="space-y-1.5">
      <Label className="text-[13px] font-semibold">اسم الحقل <span className="text-destructive text-xs">*</span></Label>
      <Input className="h-10 text-sm" />
    </div>
  </div>
</fieldset>
```

### 2.2 Color Palette for Sections
| Section | Color | Usage |
|---------|-------|-------|
| Basic Info | primary | Customer, Item info |
| Additional | info | Contact, extra info |
| Financial | success | Payment, totals |
| Settings | warning | Configuration |
| Actions | destructive | Delete, cancel |

### 2.3 Label Styling (MANDATORY)
```tsx
<Label className="text-[13px] font-semibold">
  اسم الحقل <span className="text-destructive text-xs">*</span>
</Label>
```

### 2.4 Input Styling (MANDATORY)
```tsx
<Input 
  className="h-10 text-sm" 
  placeholder="نصائح عربية" 
/>
```
For LTR fields (numbers, dates, emails):
```tsx
<Input dir="ltr" className="h-10 font-mono text-sm" />
```

### 2.5 Select/RTL (MANDATORY)
```tsx
<Select dir="rtl" value={...} onValueChange={...}>
  <SelectTrigger className="h-10 text-sm text-right">
    <SelectValue />
  </SelectTrigger>
  <SelectContent dir="rtl" align="start">
    <SelectItem value="value">الخيار</SelectItem>
  </SelectContent>
</Select>
```

### 2.6 Dialog RTL (MANDATORY)
```tsx
<Dialog>
  <DialogContent dir="rtl" className="max-w-xxx p-5 gap-0">
    <DialogHeader className="pb-4">
      <DialogTitle className="flex items-center gap-3 text-lg font-bold">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <span>عنوان النافذة</span>
          <p className="text-xs font-normal text-muted-foreground mt-0.5">وصف</p>
        </div>
      </DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### 2.7 Action Buttons (MANDATORY)
```tsx
<div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
  <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
  <Button className="gap-1.5 min-w-[130px]">حفظ</Button>
</div>
```

---

## 3. RTL Implementation (MANDATORY)

### 3.1 Global RTL Rules
```css
/* Force RTL on all RTL containers */
[dir="rtl"] * {
  direction: rtl;
}

/* Labels in forms */
[dir="rtl"] .space-y-1\.5 label,
[dir="rtl"] .space-y-2 label {
  display: block;
  text-align: right;
  direction: rtl;
}

/* Form inputs */
[dir="rtl"] input,
[dir="rtl"] textarea,
[dir="rtl"] select {
  direction: rtl;
  text-align: right;
}

/* Select trigger */
[dir="rtl"] button[role="combobox"],
[dir="rtl"] button[role="combobox"] span {
  direction: rtl;
  text-align: right;
}
```

### 3.2 Fields That Should Stay LTR
- Dates (type="date")
- Numbers/Currency
- Email addresses
- Phone numbers
- URLs
- Codes (SKU, account codes)

---

## 4. Module Checklist

### 4.1 Sales Module
- [ ] customers/page.tsx - Verify
- [ ] sales-orders/page.tsx - Update
- [ ] sales-invoices/page.tsx - Update
- [ ] quotations/page.tsx - Update
- [ ] delivery-notes/page.tsx - Update
- [ ] pos/page.tsx - Update

### 4.2 Purchase Module
- [ ] suppliers/page.tsx - Update
- [ ] purchase-orders/page.tsx - Update
- [ ] purchase-invoices/page.tsx - Update
- [ ] material-receipts/page.tsx - Update

### 4.3 Inventory Module
- [ ] items/page.tsx - Update
- [ ] warehouses/page.tsx - Update
- [ ] stock-balances/page.tsx - Update
- [ ] stock-transactions/page.tsx - Update

### 4.4 Accounting Module
- [ ] chart-of-accounts/page.tsx - Verify
- [ ] payment-entry/page.tsx - Update
- [ ] journal-entry/page.tsx - Update
- [ ] sales-invoice/new/page.tsx - Verify
- [ ] purchase-invoice/new/page.tsx - Verify

### 4.5 HR Module
- [ ] employees/page.tsx - Update
- [ ] leave-applications/page.tsx - Update
- [ ] attendance/page.tsx - Update

### 4.6 CRM Module
- [ ] leads/page.tsx - Update
- [ ] opportunities/page.tsx - Update
- [ ] appointments/page.tsx - Update

### 4.7 Settings
- [ ] integrations/page.tsx - Already done
- [ ] module-settings/selling - Already done
- [ ] module-settings/buying - Already done
- [ ] module-settings/stock - Already done
- [ ] module-settings/accounts - Already done
- [ ] module-settings/hr - Already done
- [ ] product-extensions/page.tsx - Already done

---

## 5. Sidebar & Scroll Fixes

### 5.1 Sidebar Issues
Common problems:
- Fields hidden behind sidebar when expanded
- Z-index conflicts
- Scrollbar issues inside sidebar

### 5.2 Solution
```css
/* Sidebar container */
.sidebar-content {
  overflow-y: auto;
  overflow-x: hidden;
}

/* Fix for content behind sidebar */
.main-content {
  overflow: visible;
  z-index: 1;
}

/* Dialog above sidebar */
.dialog-container {
  z-index: 9999;
}
```

---

## 6. Arabic Translation Guidelines

### 6.1 Professional Arabic
- Use user-facing language (not technical)
- Short, clear labels
- Proper Arabic grammar

### 6.2 Common Translations
| English | Arabic |
|---------|--------|
| Customer | عميل |
| Supplier | مورد |
| Invoice | فاتورة |
| Order | أمر |
| Sales | مبيعات |
| Purchase | مشتريات |
| Stock | مخزون |
| Account | حساب |
| Payment | دفع |
| Save | حفظ |
| Cancel | إلغاء |
| Add | إضافة |
| Edit | تعديل |
| Delete | حذف |
| Search | بحث |
| Filter | تصفية |
| Settings | إعدادات |
| Date | تاريخ |
| Amount | مبلغ |
| Quantity | كمية |
| Description | وصف |
| Notes | ملاحظات |

---

## 7. Before Any UI Work - Checklist

- [ ] dir="rtl" on all Dialog/AlertDialog Content
- [ ] dir="rtl" on all Select components
- [ ] align="start" on SelectContent
- [ ] fieldset pattern for form sections
- [ ] gradient headers with icons
- [ ] professional Label styling
- [ ] action buttons at bottom with border-top
- [ ] proper spacing
- [ ] Arabic placeholders
- [ ] * for required fields
- [ ] Icons for section headers
- [ ] dir="ltr" for numbers/codes

---

## 8. Implementation Priority

### HIGH PRIORITY
1. RTL fixes on all dialogs
2. Fieldset pattern on forms
3. Professional headers with icons

### MEDIUM PRIORITY
4. Sidebar and scroll fixes
5. Forms in HR module
6. Forms in CRM module

### LOW PRIORITY
7. Accounting forms verification
8. Inventory forms verification

---

## 9. Known Issues

### Issue 1: Labels showing LTR
**Fix**: Ensure Input has default dir="rtl", use globals.css RTL rules

### Issue 2: Select dropdown alignment
**Fix**: Use align="start" on SelectContent, dir="rtl" on Dialog

### Issue 3: Numbers in form fields
**Fix**: Use dir="ltr" explicitly for numeric/currency fields

---

## 10. Updated Files

### Completed
- [x] settings/integrations/page.tsx
- [x] operations/workflow-studio/page.tsx
- [x] operations/developer-api/page.tsx
- [x] settings/product-extensions/page.tsx
- [x] settings/module-settings/selling/page.tsx
- [x] settings/module-settings/buying/page.tsx
- [x] settings/module-settings/stock/page.tsx
- [x] settings/module-settings/accounts/page.tsx
- [x] settings/module-settings/hr/page.tsx

### Pending (In Progress)
- [ ] All Sales module screens
- [ ] All Purchase module screens
- [ ] All Inventory module screens
- [ ] All Accounting module screens
- [ ] All HR module screens
- [ ] All CRM module screens

---

## 11. Notes

- NEVER use emojis - only professional icons
- ALWAYS use Arabic placeholders
- ALWAYS add * for required fields
- NEVER leave fields without Labels
- ALWAYS use proper icons for section headers
- Use space-y-1\.5 (escape the dot in CSS)