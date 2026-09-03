'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Building2, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocList } from '@/lib/client/hooks';
import { useUIStore } from '@/stores/ui-store';
import { readStoredDefaultCompanyName } from '@/lib/erp/default-company-storage';
import { cn } from '@/lib/utils';

interface CompanyRow {
  name: string;
  abbr: string;
  company_name: string;
}

export function CompanySwitcher() {
  const { currentCompany, setCurrentCompany } = useUIStore();

  const { data: companies, isLoading, isError } = useDocList<CompanyRow>('Company', {
    fields: ['name', 'abbr', 'company_name'],
    limit: 100,
  });

  // على أول تحميل، حاول استعادة الشركة من localStorage إذا لم تكن محددة
  // QUA-05: صيغة موحدة (اسم فقط) عبر default-company-storage
  useEffect(() => {
    if (currentCompany) return;
    const storedName = readStoredDefaultCompanyName();
    if (storedName) {
      setCurrentCompany({
        name: storedName,
        abbr: '',
        company_name: storedName,
      });
    }
  }, [currentCompany, setCurrentCompany]);

  // إذا لم تكن شركة محددة والقائمة جاهزة، اختر الأولى تلقائياً
  useEffect(() => {
    if (currentCompany || !companies?.length) return;
    setCurrentCompany(companies[0]);
  }, [currentCompany, companies, setCurrentCompany]);

  const handleSelect = (company: CompanyRow) => {
    if (currentCompany?.name === company.name) return;
    setCurrentCompany(company);
    toast.success('تم تغيير الشركة', {
      description: company.company_name || company.name,
      duration: 2000,
    });
  };

  const displayLabel = currentCompany
    ? currentCompany.abbr
      ? `${currentCompany.company_name || currentCompany.name} (${currentCompany.abbr})`
      : currentCompany.company_name || currentCompany.name
    : 'اختر الشركة';

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 rounded-lg border-border/40 bg-muted/30 px-2.5 text-xs font-medium',
            'hover:border-border/60 hover:bg-muted/50 transition-all',
            'max-w-[220px] truncate',
            isError && 'border-destructive/40 text-destructive'
          )}
          aria-label="تبديل الشركة"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[calc(100vw-2rem)] sm:w-[260px] p-1"
      >
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5">
          الشركات المتاحة
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="space-y-1.5 px-2 py-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        ) : isError ? (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-destructive">تعذر تحميل الشركات</p>
          </div>
        ) : !companies?.length ? (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-muted-foreground">لا توجد شركات مسجلة</p>
          </div>
        ) : (
          companies.map((company) => {
            const isSelected = currentCompany?.name === company.name;
            return (
              <DropdownMenuItem
                key={company.name}
                className={cn(
                  'flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 text-xs',
                  isSelected && 'bg-accent'
                )}
                onSelect={() => handleSelect(company)}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">
                    {company.company_name || company.name}
                  </p>
                  {company.abbr && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {company.abbr}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
