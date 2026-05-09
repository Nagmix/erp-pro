'use client';

import { useState, useCallback, useMemo } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/app-format';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import {
  Car,
  Wrench,
  Fuel,
  DollarSign,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';

/* ────────────────────────────────────────────
   ERPNext DocTypes
──────────────────────────────────────────── */
const VEHICLE_DOCTYPE = 'Fleet Vehicle';
const MAINTENANCE_DOCTYPE = 'Fleet Maintenance';
const FUEL_DOCTYPE = 'Fleet Fuel Log';

/* ────────────────────────────────────────────
   ERPNext Field Lists
──────────────────────────────────────────── */
const VEHICLE_FIELDS = [
  'name',
  'plate_number',
  'vehicle_type',
  'model',
  'make',
  'color',
  'driver',
  'status',
  'odometer',
  'purchase_date',
  'insurance_expiry',
  'creation',
];

const MAINTENANCE_FIELDS = [
  'name',
  'vehicle',
  'maintenance_type',
  'date',
  'expense_amount',
  'workshop',
  'odometer',
  'status',
  'notes',
  'creation',
];

const FUEL_FIELDS = [
  'name',
  'vehicle',
  'date',
  'fuel_type',
  'fuel_qty',
  'expense_amount',
  'station',
  'odometer',
  'creation',
];

/* ────────────────────────────────────────────
   Types (UI-facing — camelCase)
──────────────────────────────────────────── */
type VehicleType = 'سيارة' | 'شاحنة' | 'فان' | 'دراجة' | 'معدات ثقيلة';
type VehicleStatus = 'نشطة' | 'قيد الصيانة' | 'خارج الخدمة' | 'مباعة';
type MaintenanceStatus = 'مكتمل' | 'جاري' | 'مجدول';
type MaintenanceType =
  | 'صيانة دورية'
  | 'إصلاح طارئ'
  | 'تغيير زيت'
  | 'تغيير إطارات'
  | 'فحص فني'
  | 'أخرى';
type FuelType = 'بنزين' | 'ديزل' | 'غاز';

interface Vehicle {
  id: string;
  plateNumber: string;
  type: VehicleType;
  model: string;
  year: string;
  color: string;
  driver: string;
  status: VehicleStatus;
  mileage: number;
  purchaseDate: string;
  insuranceExpiry: string;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: string;
  date: string;
  cost: number;
  workshop: string;
  mileage: number;
  status: MaintenanceStatus;
  notes: string;
}

interface FuelRecord {
  id: string;
  vehicleId: string;
  date: string;
  fuelType: FuelType;
  quantity: number;
  cost: number;
  station: string;
  mileage: number;
}

/* ────────────────────────────────────────────
   ERPNext ↔ Display Status Mapping
──────────────────────────────────────────── */
const ERP_VEHICLE_STATUS: Record<string, VehicleStatus> = {
  Active: 'نشطة',
  'In Maintenance': 'قيد الصيانة',
  'Out of Service': 'خارج الخدمة',
  Sold: 'مباعة',
};
const TO_ERP_VEHICLE_STATUS: Record<VehicleStatus, string> = {
  'نشطة': 'Active',
  'قيد الصيانة': 'In Maintenance',
  'خارج الخدمة': 'Out of Service',
  'مباعة': 'Sold',
};

const ERP_MAINTENANCE_STATUS: Record<string, MaintenanceStatus> = {
  Completed: 'مكتمل',
  'In Progress': 'جاري',
  Scheduled: 'مجدول',
};
const TO_ERP_MAINTENANCE_STATUS: Record<MaintenanceStatus, string> = {
  'مكتمل': 'Completed',
  'جاري': 'In Progress',
  'مجدول': 'Scheduled',
};

const ERP_VEHICLE_TYPE: Record<string, VehicleType> = {
  Car: 'سيارة',
  Truck: 'شاحنة',
  Van: 'فان',
  Motorcycle: 'دراجة',
  'Heavy Equipment': 'معدات ثقيلة',
  'سيارة': 'سيارة',
  'شاحنة': 'شاحنة',
  'فان': 'فان',
  'دراجة': 'دراجة',
  'معدات ثقيلة': 'معدات ثقيلة',
};
const TO_ERP_VEHICLE_TYPE: Record<VehicleType, string> = {
  'سيارة': 'Car',
  'شاحنة': 'Truck',
  'فان': 'Van',
  'دراجة': 'Motorcycle',
  'معدات ثقيلة': 'Heavy Equipment',
};

const ERP_FUEL_TYPE: Record<string, FuelType> = {
  Petrol: 'بنزين',
  Diesel: 'ديزل',
  Gas: 'غاز',
  'بنزين': 'بنزين',
  'ديزل': 'ديزل',
  'غاز': 'غاز',
};
const TO_ERP_FUEL_TYPE: Record<FuelType, string> = {
  'بنزين': 'Petrol',
  'ديزل': 'Diesel',
  'غاز': 'Gas',
};

/* ────────────────────────────────────────────
   Status Mapping for StatusBadge component
──────────────────────────────────────────── */
const VEHICLE_STATUS_MAP: Record<VehicleStatus, string> = {
  'نشطة': 'Active',
  'قيد الصيانة': 'Open',
  'خارج الخدمة': 'Inactive',
  'مباعة': 'Sold',
};

const MAINTENANCE_STATUS_MAP: Record<MaintenanceStatus, string> = {
  'مكتمل': 'Completed',
  'جاري': 'In Process',
  'مجدول': 'Not Started',
};

/* ────────────────────────────────────────────
   ERPNext ↔ UI Field Mappers
──────────────────────────────────────────── */
function mapERPVehicle(raw: Record<string, unknown>): Vehicle {
  const erpStatus = String(raw.status || 'Active');
  const erpType = String(raw.vehicle_type || '');
  return {
    id: String(raw.name),
    plateNumber: String(raw.plate_number || ''),
    type: ERP_VEHICLE_TYPE[erpType] || (erpType as VehicleType),
    model: String(raw.model || ''),
    year: String(raw.make || ''),
    color: String(raw.color || ''),
    driver: String(raw.driver || ''),
    status: ERP_VEHICLE_STATUS[erpStatus] || 'نشطة',
    mileage: Number(raw.odometer) || 0,
    purchaseDate: String(raw.purchase_date || '').split(' ')[0],
    insuranceExpiry: String(raw.insurance_expiry || '').split(' ')[0],
  };
}

function mapERPMaintenance(raw: Record<string, unknown>): MaintenanceRecord {
  const erpStatus = String(raw.status || 'Scheduled');
  return {
    id: String(raw.name),
    vehicleId: String(raw.vehicle || ''),
    type: String(raw.maintenance_type || ''),
    date: String(raw.date || '').split(' ')[0],
    cost: Number(raw.expense_amount) || 0,
    workshop: String(raw.workshop || ''),
    mileage: Number(raw.odometer) || 0,
    status: ERP_MAINTENANCE_STATUS[erpStatus] || 'مجدول',
    notes: String(raw.notes || ''),
  };
}

function mapERPFuel(raw: Record<string, unknown>): FuelRecord {
  const erpFuelType = String(raw.fuel_type || '');
  return {
    id: String(raw.name),
    vehicleId: String(raw.vehicle || ''),
    date: String(raw.date || '').split(' ')[0],
    fuelType: ERP_FUEL_TYPE[erpFuelType] || (erpFuelType as FuelType),
    quantity: Number(raw.fuel_qty) || 0,
    cost: Number(raw.expense_amount) || 0,
    station: String(raw.station || ''),
    mileage: Number(raw.odometer) || 0,
  };
}

/* ────────────────────────────────────────────
   Spinner Component
──────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/* ────────────────────────────────────────────
   Page Component
──────────────────────────────────────────── */
export default function FleetManagementPage() {
  /* ── React Query: Fetch vehicles ── */
  const vehiclesQuery = useDocList<Record<string, unknown>>(VEHICLE_DOCTYPE, {
    fields: VEHICLE_FIELDS,
    limit: 200,
  });
  const vehicles: Vehicle[] = useMemo(
    () => (vehiclesQuery.data ?? []).map(mapERPVehicle),
    [vehiclesQuery.data],
  );

  /* ── React Query: Fetch maintenance ── */
  const maintenanceQuery = useDocList<Record<string, unknown>>(MAINTENANCE_DOCTYPE, {
    fields: MAINTENANCE_FIELDS,
    limit: 500,
  });
  const maintenance: MaintenanceRecord[] = useMemo(
    () => (maintenanceQuery.data ?? []).map(mapERPMaintenance),
    [maintenanceQuery.data],
  );

  /* ── React Query: Fetch fuel ── */
  const fuelQuery = useDocList<Record<string, unknown>>(FUEL_DOCTYPE, {
    fields: FUEL_FIELDS,
    limit: 500,
  });
  const fuel: FuelRecord[] = useMemo(
    () => (fuelQuery.data ?? []).map(mapERPFuel),
    [fuelQuery.data],
  );

  /* ── React Query: Fetch employees for driver dropdown ── */
  const employeesQuery = useDocList<Record<string, unknown>>('Employee', {
    fields: ['name', 'employee_name'],
    filters: [['status', '=', 'Active']],
    limit: 200,
  });
  const employees = useMemo(
    () =>
      (employeesQuery.data ?? []).map((raw) => ({
        name: String(raw.name),
        employee_name: String(raw.employee_name || raw.name),
      })),
    [employeesQuery.data],
  );

  /* ── React Query: Mutations ── */
  const createVehicle = useCreateDoc(VEHICLE_DOCTYPE);
  const updateVehicle = useUpdateDoc(VEHICLE_DOCTYPE);
  const deleteVehicle = useDeleteDoc(VEHICLE_DOCTYPE);

  const createMaintenance = useCreateDoc(MAINTENANCE_DOCTYPE);
  const updateMaintenance = useUpdateDoc(MAINTENANCE_DOCTYPE);
  const deleteMaintenance = useDeleteDoc(MAINTENANCE_DOCTYPE);

  const createFuel = useCreateDoc(FUEL_DOCTYPE);
  const updateFuel = useUpdateDoc(FUEL_DOCTYPE);
  const deleteFuel = useDeleteDoc(FUEL_DOCTYPE);

  /* ── Loading & saving states ── */
  const loading = vehiclesQuery.isLoading || maintenanceQuery.isLoading || fuelQuery.isLoading;
  const savingVehicle = createVehicle.isPending || updateVehicle.isPending;
  const savingMaintenance = createMaintenance.isPending || updateMaintenance.isPending;
  const savingFuel = createFuel.isPending || updateFuel.isPending;

  /* ── Dialog states ── */
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceRecord | null>(null);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelRecord | null>(null);

  /* ── Form states — Vehicle ── */
  const [vPlate, setVPlate] = useState('');
  const [vType, setVType] = useState<VehicleType>('سيارة');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState('');
  const [vColor, setVColor] = useState('');
  const [vDriver, setVDriver] = useState('');
  const [vStatus, setVStatus] = useState<VehicleStatus>('نشطة');
  const [vMileage, setVMileage] = useState(0);
  const [vPurchaseDate, setVPurchaseDate] = useState('');
  const [vInsuranceExpiry, setVInsuranceExpiry] = useState('');

  /* ── Form states — Maintenance ── */
  const [mVehicleId, setMVehicleId] = useState('');
  const [mType, setMType] = useState<MaintenanceType>('صيانة دورية');
  const [mDate, setMDate] = useState('');
  const [mCost, setMCost] = useState(0);
  const [mWorkshop, setMWorkshop] = useState('');
  const [mMileage, setMMileage] = useState(0);
  const [mStatus, setMStatus] = useState<MaintenanceStatus>('مجدول');
  const [mNotes, setMNotes] = useState('');

  /* ── Form states — Fuel ── */
  const [fuVehicleId, setFuVehicleId] = useState('');
  const [fuDate, setFuDate] = useState('');
  const [fuType, setFuType] = useState<FuelType>('بنزين');
  const [fuQuantity, setFuQuantity] = useState(0);
  const [fuCost, setFuCost] = useState(0);
  const [fuStation, setFuStation] = useState('');
  const [fuMileage, setFuMileage] = useState(0);

  /* ── KPI calculations ── */
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.status === 'نشطة').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'قيد الصيانة').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyMaintenanceCost = maintenance
    .filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, m) => sum + m.cost, 0);
  const monthlyFuelCost = fuel
    .filter((f) => {
      const d = new Date(f.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, f) => sum + f.cost, 0);
  const monthlyTotalCost = monthlyMaintenanceCost + monthlyFuelCost;

  /* ── Helpers ── */
  const vehicleLabel = useCallback(
    (vehicleId: string) => {
      const v = vehicles.find((x) => x.id === vehicleId);
      return v ? `${v.plateNumber} - ${v.model}` : vehicleId;
    },
    [vehicles],
  );

  /* ── Reset form helpers ── */
  const resetVehicleForm = useCallback(() => {
    setVPlate('');
    setVType('سيارة');
    setVModel('');
    setVYear('');
    setVColor('');
    setVDriver('');
    setVStatus('نشطة');
    setVMileage(0);
    setVPurchaseDate('');
    setVInsuranceExpiry('');
    setEditingVehicle(null);
  }, []);

  const resetMaintenanceForm = useCallback(() => {
    setMVehicleId('');
    setMType('صيانة دورية');
    setMDate('');
    setMCost(0);
    setMWorkshop('');
    setMMileage(0);
    setMStatus('مجدول');
    setMNotes('');
    setEditingMaintenance(null);
  }, []);

  const resetFuelForm = useCallback(() => {
    setFuVehicleId('');
    setFuDate('');
    setFuType('بنزين');
    setFuQuantity(0);
    setFuCost(0);
    setFuStation('');
    setFuMileage(0);
    setEditingFuel(null);
  }, []);

  /* ── Open dialog helpers ── */
  const openAddVehicle = useCallback(() => {
    resetVehicleForm();
    setVehicleDialogOpen(true);
  }, [resetVehicleForm]);

  const openEditVehicle = useCallback(
    (vehicle: Vehicle) => {
      setEditingVehicle(vehicle);
      setVPlate(vehicle.plateNumber);
      setVType(vehicle.type);
      setVModel(vehicle.model);
      setVYear(vehicle.year);
      setVColor(vehicle.color);
      setVDriver(vehicle.driver);
      setVStatus(vehicle.status);
      setVMileage(vehicle.mileage);
      setVPurchaseDate(vehicle.purchaseDate);
      setVInsuranceExpiry(vehicle.insuranceExpiry);
      setVehicleDialogOpen(true);
    },
    [],
  );

  const openAddMaintenance = useCallback(() => {
    resetMaintenanceForm();
    setMaintenanceDialogOpen(true);
  }, [resetMaintenanceForm]);

  const openEditMaintenance = useCallback(
    (record: MaintenanceRecord) => {
      setEditingMaintenance(record);
      setMVehicleId(record.vehicleId);
      setMType(record.type as MaintenanceType);
      setMDate(record.date);
      setMCost(record.cost);
      setMWorkshop(record.workshop);
      setMMileage(record.mileage);
      setMStatus(record.status);
      setMNotes(record.notes);
      setMaintenanceDialogOpen(true);
    },
    [],
  );

  const openAddFuel = useCallback(() => {
    resetFuelForm();
    setFuelDialogOpen(true);
  }, [resetFuelForm]);

  const openEditFuel = useCallback(
    (record: FuelRecord) => {
      setEditingFuel(record);
      setFuVehicleId(record.vehicleId);
      setFuDate(record.date);
      setFuType(record.fuelType);
      setFuQuantity(record.quantity);
      setFuCost(record.cost);
      setFuStation(record.station);
      setFuMileage(record.mileage);
      setFuelDialogOpen(true);
    },
    [],
  );

  /* ── Save handlers (async with ERPNext mutations) ── */
  const handleSaveVehicle = useCallback(async () => {
    if (!vPlate.trim() || !vModel.trim()) {
      toast.error('خطأ', { description: 'رقم اللوحة والموديل مطلوبان' });
      return;
    }
    try {
      const erpStatus = TO_ERP_VEHICLE_STATUS[vStatus];
      const erpType = TO_ERP_VEHICLE_TYPE[vType];
      const body: Record<string, unknown> = {
        plate_number: vPlate,
        vehicle_type: erpType,
        model: vModel,
        make: vYear || undefined,
        color: vColor || undefined,
        driver: vDriver || undefined,
        status: erpStatus,
        odometer: vMileage || undefined,
        purchase_date: vPurchaseDate || undefined,
        insurance_expiry: vInsuranceExpiry || undefined,
      };

      if (editingVehicle) {
        await updateVehicle.mutateAsync({ name: editingVehicle.id, doc: body });
      } else {
        await createVehicle.mutateAsync(body);
      }
      toast.success('تم الحفظ', { description: editingVehicle ? 'تم تحديث بيانات المركبة' : 'تمت إضافة المركبة بنجاح' });
      setVehicleDialogOpen(false);
      resetVehicleForm();
    } catch (err) {
      toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل حفظ بيانات المركبة' });
    }
  }, [
    vPlate, vType, vModel, vYear, vColor, vDriver, vStatus, vMileage,
    vPurchaseDate, vInsuranceExpiry, editingVehicle, resetVehicleForm, toast,
    createVehicle, updateVehicle,
  ]);

  const handleDeleteVehicle = useCallback(
    async (vehicle: Vehicle) => {
      try {
        await deleteVehicle.mutateAsync(vehicle.id);
        toast.success('تم الحذف', { description: `تم حذف المركبة ${vehicle.plateNumber}` });
      } catch (err) {
        toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل حذف المركبة' });
      }
    },
    [toast, deleteVehicle],
  );

  const handleSaveMaintenance = useCallback(async () => {
    if (!mVehicleId || !mDate) {
      toast.error('خطأ', { description: 'المركبة والتاريخ مطلوبان' });
      return;
    }
    try {
      const erpStatus = TO_ERP_MAINTENANCE_STATUS[mStatus];
      const body: Record<string, unknown> = {
        vehicle: mVehicleId,
        maintenance_type: mType,
        date: mDate,
        expense_amount: mCost || undefined,
        workshop: mWorkshop || undefined,
        odometer: mMileage || undefined,
        status: erpStatus,
        notes: mNotes || undefined,
      };

      if (editingMaintenance) {
        await updateMaintenance.mutateAsync({ name: editingMaintenance.id, doc: body });
      } else {
        await createMaintenance.mutateAsync(body);
      }
      toast.success('تم الحفظ', { description: editingMaintenance ? 'تم تحديث سجل الصيانة' : 'تمت إضافة سجل الصيانة بنجاح' });
      setMaintenanceDialogOpen(false);
      resetMaintenanceForm();
    } catch (err) {
      toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل حفظ سجل الصيانة' });
    }
  }, [
    mVehicleId, mType, mDate, mCost, mWorkshop, mMileage, mStatus, mNotes,
    editingMaintenance, resetMaintenanceForm, toast, createMaintenance, updateMaintenance,
  ]);

  const handleDeleteMaintenance = useCallback(
    async (record: MaintenanceRecord) => {
      try {
        await deleteMaintenance.mutateAsync(record.id);
        toast.success('تم الحذف', { description: 'تم حذف سجل الصيانة' });
      } catch (err) {
        toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل حذف سجل الصيانة' });
      }
    },
    [toast, deleteMaintenance],
  );

  const handleSaveFuel = useCallback(async () => {
    if (!fuVehicleId || !fuDate) {
      toast.error('خطأ', { description: 'المركبة والتاريخ مطلوبان' });
      return;
    }
    try {
      const erpFuelType = TO_ERP_FUEL_TYPE[fuType];
      const body: Record<string, unknown> = {
        vehicle: fuVehicleId,
        date: fuDate,
        fuel_type: erpFuelType,
        fuel_qty: fuQuantity || undefined,
        expense_amount: fuCost || undefined,
        station: fuStation || undefined,
        odometer: fuMileage || undefined,
      };

      if (editingFuel) {
        await updateFuel.mutateAsync({ name: editingFuel.id, doc: body });
      } else {
        await createFuel.mutateAsync(body);
      }
      toast.success('تم الحفظ', { description: editingFuel ? 'تم تحديث سجل الوقود' : 'تمت إضافة سجل الوقود بنجاح' });
      setFuelDialogOpen(false);
      resetFuelForm();
    } catch (err) {
      toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل حفظ سجل الوقود' });
    }
  }, [
    fuVehicleId, fuDate, fuType, fuQuantity, fuCost, fuStation, fuMileage,
    editingFuel, resetFuelForm, toast, createFuel, updateFuel,
  ]);

  const handleDeleteFuel = useCallback(
    async (record: FuelRecord) => {
      try {
        await deleteFuel.mutateAsync(record.id);
        toast.success('تم الحذف', { description: 'تم حذف سجل الوقود' });
      } catch (err) {
        toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل حذف سجل الوقود' });
      }
    },
    [toast, deleteFuel],
  );

  /* ── DataTable Columns ── */
  const vehicleColumns: Column<Vehicle>[] = useMemo(
    () => [
      {
        key: 'plateNumber',
        header: 'رقم اللوحة',
        sortable: true,
        filterable: true,
        width: 'w-[140px]',
      },
      {
        key: 'type',
        header: 'نوع المركبة',
        sortable: true,
        filterable: true,
        width: 'w-[120px]',
      },
      {
        key: 'model',
        header: 'الموديل',
        sortable: true,
        filterable: true,
        width: 'w-[150px]',
      },
      {
        key: 'year',
        header: 'السنة',
        sortable: true,
        width: 'w-[80px]',
      },
      {
        key: 'status',
        header: 'الحالة',
        sortable: true,
        width: 'w-[120px]',
        render: (_val: unknown, row: Vehicle) => (
          <StatusBadge status={VEHICLE_STATUS_MAP[row.status]} />
        ),
      },
      {
        key: 'driver',
        header: 'السائق',
        sortable: true,
        filterable: true,
        width: 'w-[140px]',
      },
      {
        key: 'mileage',
        header: 'الكيلومتراج',
        sortable: true,
        width: 'w-[110px]',
        render: (val: unknown) => (
          <span className="tabular-nums">{Number(val).toLocaleString('ar-YE')} كم</span>
        ),
      },
    ],
    [],
  );

  const maintenanceColumns: Column<MaintenanceRecord>[] = useMemo(
    () => [
      {
        key: 'vehicleId',
        header: 'المركبة',
        sortable: true,
        filterable: true,
        width: 'w-[180px]',
        render: (_val: unknown, row: MaintenanceRecord) => vehicleLabel(row.vehicleId),
      },
      {
        key: 'type',
        header: 'نوع الصيانة',
        sortable: true,
        filterable: true,
        width: 'w-[130px]',
      },
      {
        key: 'date',
        header: 'التاريخ',
        sortable: true,
        width: 'w-[120px]',
        render: (val: unknown) => <span>{formatDate(String(val))}</span>,
      },
      {
        key: 'cost',
        header: 'التكلفة',
        sortable: true,
        width: 'w-[120px]',
        render: (val: unknown) => <span className="tabular-nums">{formatCurrency(Number(val))}</span>,
      },
      {
        key: 'workshop',
        header: 'ورشة الصيانة',
        sortable: true,
        filterable: true,
        width: 'w-[130px]',
      },
      {
        key: 'mileage',
        header: 'الكيلومتراج',
        sortable: true,
        width: 'w-[110px]',
        render: (val: unknown) => (
          <span className="tabular-nums">{Number(val).toLocaleString('ar-YE')} كم</span>
        ),
      },
      {
        key: 'status',
        header: 'الحالة',
        sortable: true,
        width: 'w-[110px]',
        render: (_val: unknown, row: MaintenanceRecord) => (
          <StatusBadge status={MAINTENANCE_STATUS_MAP[row.status]} />
        ),
      },
    ],
    [vehicleLabel],
  );

  const fuelColumns: Column<FuelRecord>[] = useMemo(
    () => [
      {
        key: 'vehicleId',
        header: 'المركبة',
        sortable: true,
        filterable: true,
        width: 'w-[180px]',
        render: (_val: unknown, row: FuelRecord) => vehicleLabel(row.vehicleId),
      },
      {
        key: 'date',
        header: 'التاريخ',
        sortable: true,
        width: 'w-[120px]',
        render: (val: unknown) => <span>{formatDate(String(val))}</span>,
      },
      {
        key: 'fuelType',
        header: 'نوع الوقود',
        sortable: true,
        filterable: true,
        width: 'w-[100px]',
      },
      {
        key: 'quantity',
        header: 'الكمية (لتر)',
        sortable: true,
        width: 'w-[110px]',
        render: (val: unknown) => (
          <span className="tabular-nums">{Number(val).toLocaleString('ar-YE')} لتر</span>
        ),
      },
      {
        key: 'cost',
        header: 'التكلفة',
        sortable: true,
        width: 'w-[120px]',
        render: (val: unknown) => <span className="tabular-nums">{formatCurrency(Number(val))}</span>,
      },
      {
        key: 'station',
        header: 'المحطة',
        sortable: true,
        filterable: true,
        width: 'w-[130px]',
      },
      {
        key: 'mileage',
        header: 'رقم الكيلومتر',
        sortable: true,
        width: 'w-[110px]',
        render: (val: unknown) => (
          <span className="tabular-nums">{Number(val).toLocaleString('ar-YE')} كم</span>
        ),
      },
    ],
    [vehicleLabel],
  );

  /* ── Cost analysis calculations ── */
  const costAnalysis = useMemo(() => {
    const totalMaintenance = maintenance.reduce((s, m) => s + m.cost, 0);
    const totalFuel = fuel.reduce((s, f) => s + f.cost, 0);
    const totalInsurance = vehicles.reduce((s, v) => {
      const exp = new Date(v.insuranceExpiry);
      const now = new Date();
      return exp > now ? s + 50000 : s;
    }, 0);
    const totalFees = vehicles.length * 15000;
    const total = totalMaintenance + totalFuel + totalInsurance + totalFees;

    const categories = [
      { key: 'صيانة', amount: totalMaintenance, color: 'bg-amber-500', pct: total ? Math.round((totalMaintenance / total) * 100) : 0 },
      { key: 'وقود', amount: totalFuel, color: 'bg-emerald-500', pct: total ? Math.round((totalFuel / total) * 100) : 0 },
      { key: 'تأمين', amount: totalInsurance, color: 'bg-sky-500', pct: total ? Math.round((totalInsurance / total) * 100) : 0 },
      { key: 'رسوم', amount: totalFees, color: 'bg-rose-500', pct: total ? Math.round((totalFees / total) * 100) : 0 },
    ];

    const perVehicle = vehicles.map((v) => {
      const mCost = maintenance
        .filter((m) => m.vehicleId === v.id)
        .reduce((s, m) => s + m.cost, 0);
      const fCost = fuel
        .filter((f) => f.vehicleId === v.id)
        .reduce((s, f) => s + f.cost, 0);
      return { vehicle: v, maintenanceCost: mCost, fuelCost: fCost, total: mCost + fCost };
    });

    const totalLiters = fuel.reduce((s, f) => s + f.quantity, 0);
    const totalKm = fuel.reduce((s, f) => s + f.mileage, 0);
    const avgConsumption = totalLiters > 0 ? (totalKm / totalLiters).toFixed(1) : '0';

    return { total, categories, perVehicle, totalFuel, totalLiters, avgConsumption };
  }, [vehicles, maintenance, fuel]);

  const maxVehicleCost = useMemo(
    () => Math.max(...costAnalysis.perVehicle.map((v) => v.total), 1),
    [costAnalysis.perVehicle],
  );

  /* ── Insurance expiry warnings ── */
  const expiringInsurance = useMemo(() => {
    const now = new Date();
    const threshold = 30;
    return vehicles.filter((v) => {
      const exp = new Date(v.insuranceExpiry);
      const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= threshold && diff > -365;
    });
  }, [vehicles]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div dir="rtl" className="erp-page-enter">
        <PageHeader
          title="إدارة الأسطول"
          description="إدارة المركبات، سجلات الصيانة، تتبع الوقود وتحليل التكاليف"
          iconify="solar:bus-bold-duotone"
          accent="warning"
          breadcrumbs={[{ label: 'التشغيل' }, { label: 'إدارة الأسطول' }]}
        />
        <Spinner />
      </div>
    );
  }

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      {/* ── Page Header ── */}
      <PageHeader
        title="إدارة الأسطول"
        description="إدارة المركبات، سجلات الصيانة، تتبع الوقود وتحليل التكاليف"
        iconify="solar:bus-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'إدارة الأسطول' }]}
      />

      {/* ── Insurance Expiry Alert ── */}
      {expiringInsurance.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <span>
            تنبيه: {expiringInsurance.length} مركبة{' '}
            {expiringInsurance.length === 1 ? 'لديها' : 'لديها'} تأمين ينتهي قريباً —{' '}
            {expiringInsurance.map((v) => v.plateNumber).join('، ')}
          </span>
        </div>
      )}

      {/* ── KPI Strip ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي المركبات"
          value={totalVehicles}
          icon={Car}
          accent="primary"
          changeType="neutral"
        />
        <KpiCard
          title="مركبات نشطة"
          value={activeVehicles}
          icon={Car}
          accent="success"
          changeType="positive"
          change={totalVehicles ? Math.round((activeVehicles / totalVehicles) * 100) : 0}
          description="نسبة النشاط من إجمالي الأسطول"
        />
        <KpiCard
          title="قيد الصيانة"
          value={maintenanceVehicles}
          icon={Wrench}
          accent="warning"
          description="مركبات تحت الصيانة حالياً"
        />
        <KpiCard
          title="إجمالي تكاليف الشهر"
          value={formatCurrency(monthlyTotalCost)}
          icon={DollarSign}
          accent="info"
          description="صيانة + وقود الشهر الحالي"
        />
      </KpiStrip>

      {/* ── Tabs ── */}
      <Tabs defaultValue="vehicles" dir="rtl" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 w-full">
          <TabsTrigger value="vehicles" className="gap-1.5 text-xs">
            <Car className="h-3.5 w-3.5" />
            المركبات
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5 text-xs">
            <Wrench className="h-3.5 w-3.5" />
            سجل الصيانة
          </TabsTrigger>
          <TabsTrigger value="fuel" className="gap-1.5 text-xs">
            <Fuel className="h-3.5 w-3.5" />
            سجل الوقود
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5" />
            التكاليف
          </TabsTrigger>
        </TabsList>

        {/* ──────────── Tab 1: Vehicles ──────────── */}
        <TabsContent value="vehicles">
          <DataTable<Vehicle>
            data={vehicles}
            columns={vehicleColumns}
            tableId="fleet-vehicles"
            addLabel="إضافة مركبة"
            onAdd={openAddVehicle}
            onEdit={openEditVehicle}
            onDelete={handleDeleteVehicle}
            exportFileName="fleet-vehicles"
            printTitle="إدارة الأسطول - المركبات"
            getRowId={(row) => row.id}
            error={vehiclesQuery.error}
            onRetry={() => vehiclesQuery.refetch()}
          />
        </TabsContent>

        {/* ──────────── Tab 2: Maintenance ──────────── */}
        <TabsContent value="maintenance">
          <DataTable<MaintenanceRecord>
            data={maintenance}
            columns={maintenanceColumns}
            tableId="fleet-maintenance"
            addLabel="إضافة سجل صيانة"
            onAdd={openAddMaintenance}
            onEdit={openEditMaintenance}
            onDelete={handleDeleteMaintenance}
            exportFileName="fleet-maintenance"
            printTitle="إدارة الأسطول - سجل الصيانة"
            getRowId={(row) => row.id}
            error={maintenanceQuery.error}
            onRetry={() => maintenanceQuery.refetch()}
          />
        </TabsContent>

        {/* ──────────── Tab 3: Fuel ──────────── */}
        <TabsContent value="fuel" className="space-y-4">
          {/* Fuel summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/[0.09] text-emerald-800 dark:text-emerald-300">
                  <DollarSign className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">إجمالي تكلفة الوقود</p>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(costAnalysis.totalFuel)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/[0.09] text-sky-800 dark:text-sky-300">
                  <Fuel className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">إجمالي اللترات</p>
                  <p className="text-lg font-semibold tabular-nums">{costAnalysis.totalLiters.toLocaleString('ar-YE')} لتر</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/[0.09] text-amber-800 dark:text-amber-300">
                  <Clock className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">متوسط الاستهلاك</p>
                  <p className="text-lg font-semibold tabular-nums">{costAnalysis.avgConsumption} كم/لتر</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable<FuelRecord>
            data={fuel}
            columns={fuelColumns}
            tableId="fleet-fuel"
            addLabel="إضافة سجل وقود"
            onAdd={openAddFuel}
            onEdit={openEditFuel}
            onDelete={handleDeleteFuel}
            exportFileName="fleet-fuel"
            printTitle="إدارة الأسطول - سجل الوقود"
            getRowId={(row) => row.id}
            error={fuelQuery.error}
            onRetry={() => fuelQuery.refetch()}
          />
        </TabsContent>

        {/* ──────────── Tab 4: Costs ──────────── */}
        <TabsContent value="costs" className="space-y-5">
          {/* Monthly cost summary */}
          <Card className="border-border/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <DollarSign className="h-4 w-4" />
                ملخص التكاليف الإجمالية
              </div>
              <div className="text-2xl font-bold tabular-nums">{formatCurrency(costAnalysis.total)}</div>

              {/* Category breakdown with progress bars */}
              <div className="space-y-3">
                {costAnalysis.categories.map((cat) => (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{cat.key}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(cat.amount)} ({cat.pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cost per vehicle */}
          <Card className="border-border/40">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Car className="h-4 w-4" />
                التكلفة لكل مركبة
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {costAnalysis.perVehicle.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات تكاليف</p>
                )}
                {costAnalysis.perVehicle
                  .sort((a, b) => b.total - a.total)
                  .map((item) => (
                    <div
                      key={item.vehicle.id}
                      className="rounded-lg border border-border/30 p-3 space-y-2 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.vehicle.plateNumber}</span>
                          <span className="text-xs text-muted-foreground">{item.vehicle.model}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70 transition-all duration-500"
                          style={{
                            width: `${Math.round((item.total / maxVehicleCost) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex gap-4 text-[11px] text-muted-foreground">
                        <span>
                          صيانة: <span className="tabular-nums font-medium text-foreground">{formatCurrency(item.maintenanceCost)}</span>
                        </span>
                        <span>
                          وقود: <span className="tabular-nums font-medium text-foreground">{formatCurrency(item.fuelCost)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ──────────── Vehicle Dialog ──────────── */}
      <Dialog open={vehicleDialogOpen} onOpenChange={(open) => { if (!open) resetVehicleForm(); setVehicleDialogOpen(open); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'تعديل بيانات المركبة' : 'إضافة مركبة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">رقم اللوحة *</Label>
              <Input value={vPlate} onChange={(e) => setVPlate(e.target.value)} placeholder="أ ب ج 1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع المركبة</Label>
              <Select value={vType} onValueChange={(v) => setVType(v as VehicleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="سيارة">سيارة</SelectItem>
                  <SelectItem value="شاحنة">شاحنة</SelectItem>
                  <SelectItem value="فان">فان</SelectItem>
                  <SelectItem value="دراجة">دراجة</SelectItem>
                  <SelectItem value="معدات ثقيلة">معدات ثقيلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الموديل *</Label>
              <Input value={vModel} onChange={(e) => setVModel(e.target.value)} placeholder="تويوتا كامري" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">السنة</Label>
              <Input value={vYear} onChange={(e) => setVYear(e.target.value)} placeholder="2024" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">اللون</Label>
              <Input value={vColor} onChange={(e) => setVColor(e.target.value)} placeholder="أبيض" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">السائق</Label>
              {employees.length > 0 ? (
                <Select value={vDriver} onValueChange={setVDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر السائق" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.name} value={emp.employee_name}>
                        {emp.employee_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={vDriver} onChange={(e) => setVDriver(e.target.value)} placeholder="اسم السائق" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الحالة</Label>
              <Select value={vStatus} onValueChange={(v) => setVStatus(v as VehicleStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="نشطة">نشطة</SelectItem>
                  <SelectItem value="قيد الصيانة">قيد الصيانة</SelectItem>
                  <SelectItem value="خارج الخدمة">خارج الخدمة</SelectItem>
                  <SelectItem value="مباعة">مباعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الكيلومتراج</Label>
              <Input type="number" value={vMileage} onChange={(e) => setVMileage(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تاريخ الشراء</Label>
              <Input type="date" value={vPurchaseDate} onChange={(e) => setVPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">انتهاء التأمين</Label>
              <Input type="date" value={vInsuranceExpiry} onChange={(e) => setVInsuranceExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setVehicleDialogOpen(false); resetVehicleForm(); }} disabled={savingVehicle}>
              إلغاء
            </Button>
            <Button onClick={handleSaveVehicle} disabled={savingVehicle}>
              {savingVehicle && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {editingVehicle ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────── Maintenance Dialog ──────────── */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={(open) => { if (!open) resetMaintenanceForm(); setMaintenanceDialogOpen(open); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingMaintenance ? 'تعديل سجل الصيانة' : 'إضافة سجل صيانة جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">المركبة *</Label>
              <Select value={mVehicleId} onValueChange={setMVehicleId}>
                <SelectTrigger><SelectValue placeholder="اختر المركبة" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber} - {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع الصيانة</Label>
              <Select value={mType} onValueChange={(v) => setMType(v as MaintenanceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="صيانة دورية">صيانة دورية</SelectItem>
                  <SelectItem value="إصلاح طارئ">إصلاح طارئ</SelectItem>
                  <SelectItem value="تغيير زيت">تغيير زيت</SelectItem>
                  <SelectItem value="تغيير إطارات">تغيير إطارات</SelectItem>
                  <SelectItem value="فحص فني">فحص فني</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">التاريخ *</Label>
              <Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">التكلفة (ر.ي)</Label>
              <Input type="number" value={mCost} onChange={(e) => setMCost(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ورشة الصيانة</Label>
              <Input value={mWorkshop} onChange={(e) => setMWorkshop(e.target.value)} placeholder="اسم الورشة" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الكيلومتراج</Label>
              <Input type="number" value={mMileage} onChange={(e) => setMMileage(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الحالة</Label>
              <Select value={mStatus} onValueChange={(v) => setMStatus(v as MaintenanceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مجدول">مجدول</SelectItem>
                  <SelectItem value="جاري">جاري</SelectItem>
                  <SelectItem value="مكتمل">مكتمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">ملاحظات</Label>
              <Textarea value={mNotes} onChange={(e) => setMNotes(e.target.value)} placeholder="ملاحظات إضافية..." rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setMaintenanceDialogOpen(false); resetMaintenanceForm(); }} disabled={savingMaintenance}>
              إلغاء
            </Button>
            <Button onClick={handleSaveMaintenance} disabled={savingMaintenance}>
              {savingMaintenance && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {editingMaintenance ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────────── Fuel Dialog ──────────── */}
      <Dialog open={fuelDialogOpen} onOpenChange={(open) => { if (!open) resetFuelForm(); setFuelDialogOpen(open); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingFuel ? 'تعديل سجل الوقود' : 'إضافة سجل وقود جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">المركبة *</Label>
              <Select value={fuVehicleId} onValueChange={setFuVehicleId}>
                <SelectTrigger><SelectValue placeholder="اختر المركبة" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber} - {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">التاريخ *</Label>
              <Input type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع الوقود</Label>
              <Select value={fuType} onValueChange={(v) => setFuType(v as FuelType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="بنزين">بنزين</SelectItem>
                  <SelectItem value="ديزل">ديزل</SelectItem>
                  <SelectItem value="غاز">غاز</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الكمية (لتر)</Label>
              <Input type="number" value={fuQuantity} onChange={(e) => setFuQuantity(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">التكلفة (ر.ي)</Label>
              <Input type="number" value={fuCost} onChange={(e) => setFuCost(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">المحطة</Label>
              <Input value={fuStation} onChange={(e) => setFuStation(e.target.value)} placeholder="اسم المحطة" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رقم الكيلومتر</Label>
              <Input type="number" value={fuMileage} onChange={(e) => setFuMileage(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFuelDialogOpen(false); resetFuelForm(); }} disabled={savingFuel}>
              إلغاء
            </Button>
            <Button onClick={handleSaveFuel} disabled={savingFuel}>
              {savingFuel && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {editingFuel ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
