export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TaxCategory {
  DISTRIBUTION_GOODS = 'Phân phối, cung cấp hàng hóa',
  SERVICES_NO_MATERIALS = 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu',
  RENTAL_PROPERTY = 'Cho thuê tài sản',
  AGENCY_INSURANCE_MLM = 'Làm đại lý xổ số, đại lý bảo hiểm, bán hàng đa cấp',
  PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS = 'Sản xuất, vận tải, dịch vụ có gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu',
  OTHER = 'Hoạt động kinh doanh khác',
}

export enum UserRole {
  ADMIN = 'Quản trị',
  ACCOUNTANT = 'Kế toán',
  SALES = 'Bán hàng',
  WAREHOUSE = 'Thủ kho',
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
}

export interface LineItem {
  productId: string;
  quantity: number;
  price: number; // Price at the time of transaction (sale or purchase)
}

export interface Transaction {
  id: string;
  date: string; // ISO string format: YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  customerId?: string; // Link to a customer
  supplierId?: string; // Link to a supplier
  lineItems?: LineItem[];
  paymentMethod?: 'cash' | 'bank'; // 'cash' for S6-HKD, 'bank' for S7-HKD
}

export interface Customer {
  id: string;
  name: string;
  classification?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  budgetCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
}

export interface Product {
    id: string;
    sku?: string; // Mã sản phẩm
    name: string;
    price: number; // Selling price
    purchasePrice: number; // Cost price
    unit: string; // e.g., 'cái', 'kg', 'thùng'
    initialStock: number; // Initial stock quantity
    taxCategory?: TaxCategory;
    subCategory?: string; // Nhóm phụ, e.g., 'Linh kiện máy tính'
    vat?: number; // VAT percentage, e.g., 8 for 8%
}

export interface Supplier {
  id: string;
  name: string;
  classification?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  budgetCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
}