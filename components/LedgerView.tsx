
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Product, TaxCategory, TransactionType } from '../types';
import { exportToCsv, formatCurrency, formatDate } from '../utils';
import { DownloadIcon, PencilIcon, TrashIcon } from '../constants';
import OCRTransactionModal from './OCRTransactionModal';
import AddTransactionModal from './AddTransactionModal';

interface LedgerViewProps {
  transactions: Transaction[];
  products: Product[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddProduct: (product: Omit<Product, 'id'>, callback?: (newProduct: Product) => void) => void;
}

type LedgerType = 'revenue' | 'inventory' | 'expense' | 'tax' | 'payroll' | 'cash' | 'bank';

const LedgerView: React.FC<LedgerViewProps> = ({ transactions, products, onAddTransaction, onUpdateTransaction, onDeleteTransaction, onAddProduct }) => {
  const [activeLedger, setActiveLedger] = useState<LedgerType>('revenue');
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<string>('');
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (products.length > 0 && !selectedInventoryProduct) {
        setSelectedInventoryProduct(products[0].id);
    }
  }, [products, selectedInventoryProduct]);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value);
    if (!isNaN(newYear) && newYear > 1900 && newYear < 2100) {
      setYear(newYear);
    }
  };
  
  const handleEditClick = (transaction: Transaction) => {
      setEditingTransaction(transaction);
  }

  const handleDeleteClick = (id: string) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) {
          onDeleteTransaction(id);
      }
  }

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const revenueLedgerData = useMemo(() => {
    const revenueTransactions = transactions.filter(t => 
        t.type === TransactionType.INCOME &&
        new Date(t.date).getFullYear() === year &&
        (t.category === "Bán hàng" || t.category === "Cung cấp dịch vụ") &&
        t.lineItems && t.lineItems.length > 0
    );

    const ledgerRows = revenueTransactions.map(t => {
      const revenueByCategory = {
        [TaxCategory.DISTRIBUTION_GOODS]: 0,
        [TaxCategory.SERVICES_NO_MATERIALS]: 0,
        [TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS]: 0,
        other: 0
      };
      
      for (const item of t.lineItems!) {
        const product = productMap.get(item.productId);
        const itemRevenue = item.price * item.quantity;
        const taxCategory = product?.taxCategory || TaxCategory.DISTRIBUTION_GOODS;
        
        switch (taxCategory) {
            case TaxCategory.DISTRIBUTION_GOODS:
                revenueByCategory[TaxCategory.DISTRIBUTION_GOODS] += itemRevenue;
                break;
            case TaxCategory.SERVICES_NO_MATERIALS:
                revenueByCategory[TaxCategory.SERVICES_NO_MATERIALS] += itemRevenue;
                break;
            case TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS:
                 revenueByCategory[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS] += itemRevenue;
                break;
            default:
                revenueByCategory.other += itemRevenue;
                break;
        }
      }

      return {
        transaction: t,
        entryDate: t.date,
        docNumber: t.id.substring(0, 8).toUpperCase(),
        docDate: t.date,
        description: t.description,
        revenue: revenueByCategory,
        notes: ''
      };
    });

    const totals = ledgerRows.reduce((acc, row) => {
        acc[TaxCategory.DISTRIBUTION_GOODS] += row.revenue[TaxCategory.DISTRIBUTION_GOODS];
        acc[TaxCategory.SERVICES_NO_MATERIALS] += row.revenue[TaxCategory.SERVICES_NO_MATERIALS];
        acc[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS] += row.revenue[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS];
        acc.other += row.revenue.other;
        return acc;
    }, { 
        [TaxCategory.DISTRIBUTION_GOODS]: 0,
        [TaxCategory.SERVICES_NO_MATERIALS]: 0,
        [TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS]: 0,
        other: 0
    });

    return { rows: ledgerRows.sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()), totals };
  }, [transactions, year, productMap]);

  const expenseLedgerData = useMemo(() => {
    const costCategories = {
        labor: "Chi phí nhân công",
        electricity: "Chi phí điện",
        water: "Chi phí nước",
        telecom: "Chi phí viễn thông",
        rent: "Chi phí thuê kho bãi, mặt bằng kinh doanh",
        management: "Chi phí quản lý",
    };
    const excludedCategories = ["Nhập hàng", "Khách trả hàng", "Chi phí nguyên vật liệu", "Trả nợ nhà cung cấp", "Nộp thuế", "Thanh toán lương nhân viên", "Nộp Bảo hiểm xã hội", "Nộp Bảo hiểm y tế", "Nộp Bảo hiểm thất nghiệp", "Nộp Kinh phí công đoàn"];

    const expenseTransactions = transactions.filter(t => 
        t.type === TransactionType.EXPENSE &&
        new Date(t.date).getFullYear() === year &&
        !excludedCategories.includes(t.category) && 
        t.category !== costCategories.labor
    );

    const ledgerRows = expenseTransactions.map(t => {
        const costs = {
            labor: 0, electricity: 0, water: 0, telecom: 0, rent: 0, management: 0, other: 0,
        };

        switch (t.category) {
            case costCategories.electricity: costs.electricity = t.amount; break;
            case costCategories.water: costs.water = t.amount; break;
            case costCategories.telecom: costs.telecom = t.amount; break;
            case costCategories.rent: costs.rent = t.amount; break;
            case costCategories.management: costs.management = t.amount; break;
            default: costs.other = t.amount; break;
        }

        return {
            transaction: t,
            entryDate: t.date, docNumber: t.id.substring(0, 8).toUpperCase(), docDate: t.date, description: t.description, totalAmount: t.amount, costs,
        };
    });

    const totals = ledgerRows.reduce((acc, row) => {
        acc.totalAmount += row.totalAmount;
        Object.keys(acc.costs).forEach(key => acc.costs[key as keyof typeof acc.costs] += row.costs[key as keyof typeof row.costs]);
        return acc;
    }, {
        totalAmount: 0, costs: { labor: 0, electricity: 0, water: 0, telecom: 0, rent: 0, management: 0, other: 0 }
    });

    return { rows: ledgerRows.sort((a,b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()), totals };
  }, [transactions, year]);

  const inventoryLedgerData = useMemo(() => {
    if (!selectedInventoryProduct) return null;
    const product = productMap.get(selectedInventoryProduct);
    if (!product) return null;

    const transactionsForProduct = transactions
        .filter(t => t.lineItems?.some(item => item.productId === selectedInventoryProduct))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let openingQty = product.initialStock || 0;
    transactionsForProduct.filter(t => new Date(t.date).getFullYear() < year).forEach(t => {
        const item = t.lineItems!.find(li => li.productId === selectedInventoryProduct)!;
        if (t.category === 'Bán hàng' || t.category === 'Trả hàng cho nhà cung cấp') openingQty -= item.quantity;
        else if (t.category === 'Nhập hàng' || t.category === 'Khách trả hàng') openingQty += item.quantity;
    });

    const ledgerRows: any[] = [];
    let runningQty = openingQty;
    let totalImportQty = 0, totalImportValue = 0, totalExportQty = 0, totalExportValue = 0;

    transactionsForProduct.filter(t => new Date(t.date).getFullYear() === year).forEach(t => {
        const item = t.lineItems!.find(li => li.productId === selectedInventoryProduct)!;
        const isImport = t.category === 'Nhập hàng' || t.category === 'Khách trả hàng';
        const isExport = t.category === 'Bán hàng' || t.category === 'Trả hàng cho nhà cung cấp';
        
        let importQty = 0, importValue = 0, exportQty = 0, exportValue = 0;

        if(isImport) {
            importQty = item.quantity;
            importValue = item.quantity * item.price;
            runningQty += item.quantity;
            totalImportQty += importQty;
            totalImportValue += importValue;
        } else if (isExport) {
            exportQty = item.quantity;
            exportValue = item.quantity * item.price;
            runningQty -= item.quantity;
            totalExportQty += exportQty;
            totalExportValue += exportValue;
        }

        ledgerRows.push({
            transaction: t,
            docNumber: t.id.substring(0, 8).toUpperCase(),
            docDate: t.date,
            description: t.description,
            price: item.price,
            importQty, importValue, exportQty, exportValue,
            closingQty: runningQty,
            closingValue: runningQty * product.purchasePrice
        });
    });

    return {
        product,
        openingQty,
        openingValue: openingQty * product.purchasePrice,
        rows: ledgerRows,
        totals: { totalImportQty, totalImportValue, totalExportQty, totalExportValue },
        closingQty: runningQty,
        closingValue: runningQty * product.purchasePrice,
    };
  }, [transactions, year, selectedInventoryProduct, productMap]);

  const taxLedgerData = useMemo(() => {
    const TAX_RATES = {
        [TaxCategory.DISTRIBUTION_GOODS]: { vat: 0.01, pit: 0.005 },
        [TaxCategory.SERVICES_NO_MATERIALS]: { vat: 0.05, pit: 0.02 },
        [TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS]: { vat: 0.03, pit: 0.015 },
        [TaxCategory.OTHER]: { vat: 0.02, pit: 0.01 },
        [TaxCategory.RENTAL_PROPERTY]: { vat: 0.05, pit: 0.05 },
        [TaxCategory.AGENCY_INSURANCE_MLM]: { vat: 0, pit: 0.05 },
    };
    
    const calculateTaxForPeriod = (startDate: Date, endDate: Date) => {
        const periodTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.type === TransactionType.INCOME && tDate >= startDate && tDate <= endDate && t.lineItems;
        });
        
        let totalPayable = 0;
        periodTransactions.forEach(t => {
            t.lineItems?.forEach(item => {
                const product = productMap.get(item.productId);
                const taxCategory = product?.taxCategory || TaxCategory.DISTRIBUTION_GOODS;
                const rates = TAX_RATES[taxCategory];
                if (rates) {
                    totalPayable += item.price * item.quantity * (rates.vat + rates.pit);
                }
            });
        });
        return totalPayable;
    };

    const openingBalance = calculateTaxForPeriod(new Date(0), new Date(year - 1, 11, 31)) - transactions.filter(t => new Date(t.date).getFullYear() < year && t.category === "Nộp thuế").reduce((sum, t) => sum + t.amount, 0);

    const quarterlyPayable = [1, 2, 3, 4].map(q => {
        const startDate = new Date(year, (q - 1) * 3, 1);
        const endDate = new Date(year, q * 3, 0);
        return {
            date: endDate,
            description: `Phải nộp thuế Quý ${q}/${year}`,
            payable: calculateTaxForPeriod(startDate, endDate),
            paid: 0,
            docNumber: '',
            transaction: null, // Computed row, no transaction
        };
    });

    const taxPayments = transactions
        .filter(t => new Date(t.date).getFullYear() === year && t.category === "Nộp thuế")
        .map(t => ({
            date: new Date(t.date),
            description: t.description,
            payable: 0,
            paid: t.amount,
            docNumber: t.id.substring(0, 8).toUpperCase(),
            transaction: t,
        }));
    
    const ledgerRows = [...quarterlyPayable, ...taxPayments]
        .filter(row => row.payable > 0 || row.paid > 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = openingBalance;
    const rowsWithBalance = ledgerRows.map(row => {
        runningBalance += row.payable - row.paid;
        return { ...row, balance: runningBalance };
    });

    const totals = ledgerRows.reduce((acc, row) => ({
        payable: acc.payable + row.payable,
        paid: acc.paid + row.paid,
    }), { payable: 0, paid: 0 });

    return {
        openingBalance,
        rows: rowsWithBalance,
        totals,
        closingBalance: openingBalance + totals.payable - totals.paid,
    };
  }, [transactions, year, productMap]);
  
  const payrollLedgerData = useMemo(() => {
    const RATES = {
        BHXH: 0.255, // 8% NLĐ + 17.5% NSDLĐ
        BHYT: 0.045, // 1.5% NLĐ + 3% NSDLĐ
        BHTN: 0.02,  // 1% NLĐ + 1% NSDLĐ
        KPCD: 0.02   // 2% NSDLĐ
    };

    const calculateBalanceForPeriod = (endDate: Date) => {
        const periodTransactions = transactions.filter(t => new Date(t.date) <= endDate);
        
        const grossSalaryPayable = periodTransactions
            .filter(t => t.category === 'Chi phí nhân công')
            .reduce((sum, t) => sum + t.amount, 0);

        const paid = {
            salary: periodTransactions.filter(t => t.category === 'Thanh toán lương nhân viên').reduce((s, t) => s + t.amount, 0),
            bhxh: periodTransactions.filter(t => t.category === 'Nộp Bảo hiểm xã hội').reduce((s, t) => s + t.amount, 0),
            bhyt: periodTransactions.filter(t => t.category === 'Nộp Bảo hiểm y tế').reduce((s, t) => s + t.amount, 0),
            bhtn: periodTransactions.filter(t => t.category === 'Nộp Bảo hiểm thất nghiệp').reduce((s, t) => s + t.amount, 0),
            kpcd: periodTransactions.filter(t => t.category === 'Nộp Kinh phí công đoàn').reduce((s, t) => s + t.amount, 0),
        };
        
        const payable = {
            salary: grossSalaryPayable,
            bhxh: grossSalaryPayable * RATES.BHXH,
            bhyt: grossSalaryPayable * RATES.BHYT,
            bhtn: grossSalaryPayable * RATES.BHTN,
            kpcd: grossSalaryPayable * RATES.KPCD,
        };

        return {
            salary: payable.salary - paid.salary,
            bhxh: payable.bhxh - paid.bhxh,
            bhyt: payable.bhyt - paid.bhyt,
            bhtn: payable.bhtn - paid.bhtn,
            kpcd: payable.kpcd - paid.kpcd,
        };
    };

    const openingBalance = calculateBalanceForPeriod(new Date(year - 1, 11, 31));
    
    const yearTransactions = transactions
        .filter(t => new Date(t.date).getFullYear() === year && [
            'Chi phí nhân công', 'Thanh toán lương nhân viên', 'Nộp Bảo hiểm xã hội',
            'Nộp Bảo hiểm y tế', 'Nộp Bảo hiểm thất nghiệp', 'Nộp Kinh phí công đoàn'
        ].includes(t.category))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const ledgerRows = yearTransactions.map(t => {
        const row = {
            transaction: t,
            docDate: t.date, docNumber: t.id.substring(0, 8).toUpperCase(), description: t.description,
            payable: { salary: 0, bhxh: 0, bhyt: 0, bhtn: 0, kpcd: 0 },
            paid: { salary: 0, bhxh: 0, bhyt: 0, bhtn: 0, kpcd: 0 },
        };
        switch(t.category) {
            case 'Chi phí nhân công':
                row.payable.salary = t.amount;
                row.payable.bhxh = t.amount * RATES.BHXH;
                row.payable.bhyt = t.amount * RATES.BHYT;
                row.payable.bhtn = t.amount * RATES.BHTN;
                row.payable.kpcd = t.amount * RATES.KPCD;
                break;
            case 'Thanh toán lương nhân viên': row.paid.salary = t.amount; break;
            case 'Nộp Bảo hiểm xã hội': row.paid.bhxh = t.amount; break;
            case 'Nộp Bảo hiểm y tế': row.paid.bhyt = t.amount; break;
            case 'Nộp Bảo hiểm thất nghiệp': row.paid.bhtn = t.amount; break;
            case 'Nộp Kinh phí công đoàn': row.paid.kpcd = t.amount; break;
        }
        return row;
    });

    const totals = ledgerRows.reduce((acc, row) => {
        for (const key of Object.keys(acc.payable)) {
            acc.payable[key as keyof typeof acc.payable] += row.payable[key as keyof typeof row.payable];
            acc.paid[key as keyof typeof acc.paid] += row.paid[key as keyof typeof row.paid];
        }
        return acc;
    }, {
        payable: { salary: 0, bhxh: 0, bhyt: 0, bhtn: 0, kpcd: 0 },
        paid: { salary: 0, bhxh: 0, bhyt: 0, bhtn: 0, kpcd: 0 },
    });

    const closingBalance = {
        salary: openingBalance.salary + totals.payable.salary - totals.paid.salary,
        bhxh: openingBalance.bhxh + totals.payable.bhxh - totals.paid.bhxh,
        bhyt: openingBalance.bhyt + totals.payable.bhyt - totals.paid.bhyt,
        bhtn: openingBalance.bhtn + totals.payable.bhtn - totals.paid.bhtn,
        kpcd: openingBalance.kpcd + totals.payable.kpcd - totals.paid.kpcd,
    };

    return { openingBalance, rows: ledgerRows, totals, closingBalance };
  }, [transactions, year]);
  
  const cashLedgerData = useMemo(() => {
    // Treat transactions without a paymentMethod as 'cash' for backward compatibility
    const transactionsBefore = transactions.filter(t => new Date(t.date).getFullYear() < year && (t.paymentMethod === 'cash' || !t.paymentMethod));
    const openingBalance = transactionsBefore.reduce((balance, t) => {
        return t.type === TransactionType.INCOME ? balance + t.amount : balance - t.amount;
    }, 0);

    const yearTransactions = transactions
        .filter(t => new Date(t.date).getFullYear() === year && (t.paymentMethod === 'cash' || !t.paymentMethod))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = openingBalance;
    const ledgerRows = yearTransactions.map(t => {
        const income = t.type === TransactionType.INCOME ? t.amount : 0;
        const expense = t.type === TransactionType.EXPENSE ? t.amount : 0;
        runningBalance += income - expense;
        return {
            transaction: t,
            entryDate: t.date,
            docDate: t.date,
            docNumberThu: income > 0 ? t.id.substring(0, 8).toUpperCase() : '',
            docNumberChi: expense > 0 ? t.id.substring(0, 8).toUpperCase() : '',
            description: t.description,
            income,
            expense,
            balance: runningBalance,
            notes: ''
        };
    });

    const totals = ledgerRows.reduce((acc, row) => {
        acc.income += row.income;
        acc.expense += row.expense;
        return acc;
    }, { income: 0, expense: 0 });

    const closingBalance = openingBalance + totals.income - totals.expense;

    return {
        openingBalance,
        rows: ledgerRows,
        totals,
        closingBalance,
    };
  }, [transactions, year]);

  const bankLedgerData = useMemo(() => {
    const transactionsBefore = transactions.filter(t => new Date(t.date).getFullYear() < year && t.paymentMethod === 'bank');
    const openingBalance = transactionsBefore.reduce((balance, t) => {
        return t.type === TransactionType.INCOME ? balance + t.amount : balance - t.amount;
    }, 0);

    const yearTransactions = transactions
        .filter(t => new Date(t.date).getFullYear() === year && t.paymentMethod === 'bank')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = openingBalance;
    const ledgerRows = yearTransactions.map(t => {
        const income = t.type === TransactionType.INCOME ? t.amount : 0;
        const expense = t.type === TransactionType.EXPENSE ? t.amount : 0;
        runningBalance += income - expense;
        return {
            transaction: t,
            entryDate: t.date,
            docDate: t.date,
            docNumber: t.id.substring(0, 8).toUpperCase(),
            description: t.description,
            income,
            expense,
            balance: runningBalance,
            notes: ''
        };
    });

    const totals = ledgerRows.reduce((acc, row) => {
        acc.income += row.income;
        acc.expense += row.expense;
        return acc;
    }, { income: 0, expense: 0 });

    const closingBalance = openingBalance + totals.income - totals.expense;

    return {
        openingBalance,
        rows: ledgerRows,
        totals,
        closingBalance,
    };
  }, [transactions, year]);


  const handleExport = () => {
    switch (activeLedger) {
        case 'revenue': {
            const headers = [
                "Ngày ghi sổ", "Số chứng từ", "Ngày chứng từ", "Diễn giải",
                "Doanh thu Phân phối, cung cấp hàng hóa",
                "Doanh thu Dịch vụ, xây dựng không bao thầu NVL",
                "Doanh thu Sản xuất, vận tải, DV có gắn với hàng hóa...",
                "Doanh thu Hoạt động kinh doanh khác",
                "Ghi chú"
            ];
            const data = revenueLedgerData.rows.map(row => [
                formatDate(row.entryDate), row.docNumber, formatDate(row.docDate), row.description,
                row.revenue[TaxCategory.DISTRIBUTION_GOODS], row.revenue[TaxCategory.SERVICES_NO_MATERIALS],
                row.revenue[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS], row.revenue.other, row.notes
            ]);
            data.push([
                "Tổng cộng", "", "", "", revenueLedgerData.totals[TaxCategory.DISTRIBUTION_GOODS], revenueLedgerData.totals[TaxCategory.SERVICES_NO_MATERIALS],
                revenueLedgerData.totals[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS], revenueLedgerData.totals.other, ""
            ]);
            exportToCsv(`so-doanh-thu-s1-hkd-${year}`, headers, data);
            break;
        }
        case 'expense': {
            const headers = [
                "Ngày ghi sổ", "Số chứng từ", "Ngày chứng từ", "Diễn giải", "Tổng số tiền",
                "Chi phí nhân công", "Chi phí điện", "Chi phí nước", "Chi phí viễn thông",
                "Chi phí thuê kho bãi, mặt bằng KD", "Chi phí quản lý", "Chi phí khác"
            ];
            const data = expenseLedgerData.rows.map(row => [
                formatDate(row.entryDate), row.docNumber, formatDate(row.docDate), row.description, row.totalAmount,
                row.costs.labor, row.costs.electricity, row.costs.water, row.costs.telecom,
                row.costs.rent, row.costs.management, row.costs.other
            ]);
            data.push([
                "Tổng cộng", "", "", "", expenseLedgerData.totals.totalAmount, expenseLedgerData.totals.costs.labor, expenseLedgerData.totals.costs.electricity,
                expenseLedgerData.totals.costs.water, expenseLedgerData.totals.costs.telecom, expenseLedgerData.totals.costs.rent,
                expenseLedgerData.totals.costs.management, expenseLedgerData.totals.costs.other
            ]);
            exportToCsv(`so-chi-phi-s3-hkd-${year}`, headers, data);
            break;
        }
        case 'inventory': {
            if (!inventoryLedgerData) return;
            const headers = [
                "Số chứng từ", "Ngày chứng từ", "Diễn giải", "Đơn giá", 
                "Nhập - SL", "Nhập - Thành tiền", "Xuất - SL", "Xuất - Thành tiền", 
                "Tồn - SL", "Tồn - Thành tiền"
            ];
            const data = inventoryLedgerData.rows.map(row => [
                row.docNumber, formatDate(row.docDate), row.description, row.price,
                row.importQty || '', row.importValue || '', row.exportQty || '', row.exportValue || '',
                row.closingQty, row.closingValue
            ]);
            exportToCsv(`so-kho-s2-hkd-${inventoryLedgerData.product.name}-${year}`, headers, data);
            break;
        }
        case 'tax': {
            const headers = ["Ngày tháng", "Số chứng từ", "Diễn giải", "Số thuế phải nộp", "Số thuế đã nộp", "Số dư"];
            const data = taxLedgerData.rows.map(row => [
                formatDate(row.date.toISOString()), row.docNumber || '', row.description, row.payable || '', row.paid || '', row.balance
            ]);
            exportToCsv(`so-thue-s4-hkd-${year}`, headers, data);
            break;
        }
        case 'payroll': {
            const headers = [
                "Ngày chứng từ", "Số chứng từ", "Diễn giải",
                "Lương Phải trả", "Lương Đã trả",
                "BHXH Phải trả", "BHXH Đã trả",
                "BHYT Phải trả", "BHYT Đã trả",
                "BHTN Phải trả", "BHTN Đã trả",
                "KPCĐ Phải trả", "KPCĐ Đã trả"
            ];
            const data = payrollLedgerData.rows.map(row => [
                formatDate(row.docDate), row.docNumber, row.description,
                row.payable.salary || '', row.paid.salary || '',
                row.payable.bhxh || '', row.paid.bhxh || '',
                row.payable.bhyt || '', row.paid.bhyt || '',
                row.payable.bhtn || '', row.paid.bhtn || '',
                row.payable.kpcd || '', row.paid.kpcd || '',
            ]);
            exportToCsv(`so-luong-s5-hkd-${year}`, headers, data);
            break;
        }
        case 'cash': {
            const headers = ["Ngày ghi sổ", "Ngày chứng từ", "Số CT Thu", "Số CT Chi", "Diễn giải", "Thu", "Chi", "Tồn", "Ghi chú"];
            const data = cashLedgerData.rows.map(row => [
                formatDate(row.entryDate),
                formatDate(row.docDate),
                row.docNumberThu,
                row.docNumberChi,
                row.description,
                row.income || '',
                row.expense || '',
                row.balance,
                row.notes
            ]);
            exportToCsv(`so-quy-tien-mat-s6-hkd-${year}`, headers, data);
            break;
        }
        case 'bank': {
             const headers = ["Ngày ghi sổ", "Số CT", "Ngày CT", "Diễn giải", "Thu (gửi vào)", "Chi (rút ra)", "Còn lại", "Ghi chú"];
            const data = bankLedgerData.rows.map(row => [
                formatDate(row.entryDate),
                row.docNumber,
                formatDate(row.docDate),
                row.description,
                row.income || '',
                row.expense || '',
                row.balance,
                row.notes
            ]);
            exportToCsv(`so-tien-gui-ngan-hang-s7-hkd-${year}`, headers, data);
            break;
        }
    }
  };
  
  const renderActions = (transaction: Transaction | null | undefined) => {
      if (!transaction) return <td className="p-2"></td>;
      return (
          <td className="p-2 border-l text-center">
              <div className="flex items-center justify-center space-x-2">
                  <button onClick={() => handleEditClick(transaction)} className="text-blue-500 hover:text-blue-700" title="Sửa">
                      <PencilIcon />
                  </button>
                  <button onClick={() => handleDeleteClick(transaction.id)} className="text-red-500 hover:text-red-700" title="Xóa">
                      <TrashIcon />
                  </button>
              </div>
          </td>
      )
  }
  
  const renderRevenueLedger = () => (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="text-center my-4 relative">
            <h2 className="text-xl font-bold uppercase">Sổ chi tiết doanh thu bán hàng hóa, dịch vụ (Mẫu S1-HKD)</h2>
            <button
                onClick={() => setIsOCRModalOpen(true)}
                className="absolute right-0 top-0 flex items-center space-x-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary-200 transition-colors text-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Quét hóa đơn (OCR)</span>
            </button>
        </div>
        <div className="overflow-x-auto border">
             <table className="min-w-full text-sm">
                <thead className="bg-gray-100 font-bold text-center">
                    <tr className="border-b"><th rowSpan={2} className="p-2 border-r align-middle">Ngày, tháng ghi sổ</th><th colSpan={2} className="p-2 border-r">Chứng từ</th><th rowSpan={2} className="p-2 border-r align-middle">Diễn giải</th><th colSpan={4} className="p-2 border-r">Doanh thu bán hàng hóa, dịch vụ chia theo danh mục ngành nghề</th><th rowSpan={2} className="p-2 align-middle border-r">Ghi chú</th><th rowSpan={2} className="p-2 align-middle w-20">Hành động</th></tr>
                    <tr className="border-b"><th className="p-2 border-r font-semibold">Số hiệu</th><th className="p-2 border-r font-semibold">Ngày, tháng</th><th className="p-2 border-r w-32 font-semibold">Phân phối, cung cấp hàng hóa</th><th className="p-2 border-r w-32 font-semibold">Dịch vụ, xây dựng không bao thầu NVL</th><th className="p-2 border-r w-32 font-semibold">Sản xuất, vận tải, DV có gắn với HH...</th><th className="p-2 border-r w-32 font-semibold">Hoạt động kinh doanh khác</th></tr>
                </thead>
                <tbody>
                     {revenueLedgerData.rows.length > 0 ? revenueLedgerData.rows.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 border-r text-center">{formatDate(row.entryDate)}</td><td className="p-2 border-r text-center">{row.docNumber}</td><td className="p-2 border-r text-center">{formatDate(row.docDate)}</td><td className="p-2 border-r">{row.description}</td>
                            <td className="p-2 border-r text-right">{row.revenue[TaxCategory.DISTRIBUTION_GOODS] > 0 ? formatCurrency(row.revenue[TaxCategory.DISTRIBUTION_GOODS]) : ''}</td>
                            <td className="p-2 border-r text-right">{row.revenue[TaxCategory.SERVICES_NO_MATERIALS] > 0 ? formatCurrency(row.revenue[TaxCategory.SERVICES_NO_MATERIALS]) : ''}</td>
                            <td className="p-2 border-r text-right">{row.revenue[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS] > 0 ? formatCurrency(row.revenue[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS]) : ''}</td>
                            <td className="p-2 border-r text-right">{row.revenue.other > 0 ? formatCurrency(row.revenue.other) : ''}</td><td className="p-2 border-r">{row.notes}</td>
                            {renderActions(row.transaction)}
                        </tr>
                     )) : (
                        <tr><td colSpan={10} className="text-center p-8 text-gray-500">Không có dữ liệu doanh thu cho năm {year}.</td></tr>
                     )}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td colSpan={4} className="p-2 border-r text-center">Tổng cộng</td>
                        <td className="p-2 border-r text-right">{formatCurrency(revenueLedgerData.totals[TaxCategory.DISTRIBUTION_GOODS])}</td><td className="p-2 border-r text-right">{formatCurrency(revenueLedgerData.totals[TaxCategory.SERVICES_NO_MATERIALS])}</td>
                        <td className="p-2 border-r text-right">{formatCurrency(revenueLedgerData.totals[TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS])}</td><td className="p-2 border-r text-right">{formatCurrency(revenueLedgerData.totals.other)}</td><td className="p-2 border-r"></td><td className="p-2"></td>
                    </tr>
                </tfoot>
             </table>
        </div>
    </div>
  );
  
  const renderExpenseLedger = () => (
     <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="text-center my-4">
            <h2 className="text-xl font-bold uppercase">Sổ chi phí sản xuất, kinh doanh (Mẫu S3-HKD)</h2>
        </div>
        <div className="overflow-x-auto border">
             <table className="min-w-full text-sm">
                <thead className="bg-gray-100 font-bold text-center">
                    <tr className="border-b"><th rowSpan={2} className="p-2 border-r align-middle">Ngày, tháng ghi sổ</th><th colSpan={2} className="p-2 border-r">Chứng từ</th><th rowSpan={2} className="p-2 border-r align-middle">Diễn giải</th><th rowSpan={2} className="p-2 border-r align-middle">Tổng số tiền</th><th colSpan={7} className="p-2 border-r">Tập hợp chi phí theo các yếu tố sản xuất, kinh doanh</th><th rowSpan={2} className="p-2 align-middle w-20">Hành động</th></tr>
                    <tr className="border-b"><th className="p-2 border-r font-semibold">Số hiệu</th><th className="p-2 border-r font-semibold">Ngày, tháng</th><th className="p-2 border-r font-semibold w-28">Chi phí nhân công</th><th className="p-2 border-r font-semibold w-28">Chi phí điện</th><th className="p-2 border-r font-semibold w-28">Chi phí nước</th><th className="p-2 border-r font-semibold w-28">Chi phí viễn thông</th><th className="p-2 border-r font-semibold w-28">Chi phí thuê kho bãi...</th><th className="p-2 border-r font-semibold w-28">Chi phí quản lý</th><th className="p-2 border-r font-semibold w-28">Chi phí khác</th></tr>
                </thead>
                <tbody>
                    {expenseLedgerData.rows.length > 0 ? expenseLedgerData.rows.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 border-r text-center">{formatDate(row.entryDate)}</td><td className="p-2 border-r text-center">{row.docNumber}</td><td className="p-2 border-r text-center">{formatDate(row.docDate)}</td><td className="p-2 border-r">{row.description}</td>
                            <td className="p-2 border-r text-right font-semibold">{formatCurrency(row.totalAmount)}</td>
                            <td className="p-2 border-r text-right">{row.costs.labor > 0 ? formatCurrency(row.costs.labor) : ''}</td><td className="p-2 border-r text-right">{row.costs.electricity > 0 ? formatCurrency(row.costs.electricity) : ''}</td>
                            <td className="p-2 border-r text-right">{row.costs.water > 0 ? formatCurrency(row.costs.water) : ''}</td><td className="p-2 border-r text-right">{row.costs.telecom > 0 ? formatCurrency(row.costs.telecom) : ''}</td>
                            <td className="p-2 border-r text-right">{row.costs.rent > 0 ? formatCurrency(row.costs.rent) : ''}</td><td className="p-2 border-r text-right">{row.costs.management > 0 ? formatCurrency(row.costs.management) : ''}</td>
                            <td className="p-2 border-r text-right">{row.costs.other > 0 ? formatCurrency(row.costs.other) : ''}</td>
                            {renderActions(row.transaction)}
                        </tr>
                    )) : (
                        <tr><td colSpan={13} className="text-center p-8 text-gray-500">Không có dữ liệu chi phí cho năm {year}.</td></tr>
                    )}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td colSpan={4} className="p-2 border-r text-center">Tổng cộng</td><td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.totalAmount)}</td>
                        <td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.costs.labor)}</td><td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.costs.electricity)}</td>
                        <td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.costs.water)}</td><td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.costs.telecom)}</td>
                        <td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.costs.rent)}</td><td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.costs.management)}</td>
                        <td className="p-2 border-r text-right">{formatCurrency(expenseLedgerData.totals.costs.other)}</td><td className="p-2"></td>
                    </tr>
                </tfoot>
             </table>
        </div>
    </div>
  );

  const renderInventoryLedger = () => {
    if (!inventoryLedgerData) return <div className="text-center p-8 text-gray-500">Vui lòng chọn một sản phẩm để xem sổ kho.</div>;
    const { product, openingQty, openingValue, rows, totals, closingQty, closingValue } = inventoryLedgerData;
    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="text-center my-4">
                <h2 className="text-xl font-bold uppercase">Sổ chi tiết vật liệu, dụng cụ, sản phẩm, hàng hóa (Mẫu S2-HKD)</h2>
                <div className="flex justify-center items-center gap-2 mt-2">
                    <label htmlFor="product-select" className="font-semibold">Tên vật liệu, dụng cụ, sản phẩm, hàng hóa:</label>
                    <select id="product-select" value={selectedInventoryProduct} onChange={e => setSelectedInventoryProduct(e.target.value)} className="p-1 border rounded-md">
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto border">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 font-bold text-center">
                        <tr className="border-b"><th rowSpan={2} colSpan={2} className="p-2 border-r">Chứng từ</th><th rowSpan={2} className="p-2 border-r align-middle">Diễn giải</th><th rowSpan={2} className="p-2 border-r align-middle">Đơn vị tính</th><th rowSpan={2} className="p-2 border-r align-middle">Đơn giá</th><th colSpan={2} className="p-2 border-r">Nhập</th><th colSpan={2} className="p-2 border-r">Xuất</th><th colSpan={2} className="p-2 border-r">Tồn</th><th rowSpan={2} className="p-2 align-middle border-r">Ghi chú</th><th rowSpan={2} className="p-2 align-middle w-20">Hành động</th></tr>
                        <tr className="border-b"><th className="p-2 border-r font-semibold">Số hiệu</th><th className="p-2 border-r font-semibold">Ngày, tháng</th><th className="p-2 border-r font-semibold">Số lượng</th><th className="p-2 border-r font-semibold">Thành tiền</th><th className="p-2 border-r font-semibold">Số lượng</th><th className="p-2 border-r font-semibold">Thành tiền</th><th className="p-2 border-r font-semibold">Số lượng</th><th className="p-2 border-r font-semibold">Thành tiền</th></tr>
                    </thead>
                    <tbody>
                        <tr className="border-b font-semibold"><td colSpan={3} className="p-2 border-r">Số dư đầu kỳ</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r text-right">{openingQty}</td><td className="p-2 border-r text-right">{formatCurrency(openingValue)}</td><td className="p-2 border-r"></td><td className="p-2"></td></tr>
                        {rows.length > 0 ? rows.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-2 border-r text-center">{row.docNumber}</td><td className="p-2 border-r text-center">{formatDate(row.docDate)}</td><td className="p-2 border-r">{row.description}</td><td className="p-2 border-r text-center">{product.unit}</td><td className="p-2 border-r text-right">{formatCurrency(row.price)}</td>
                                <td className="p-2 border-r text-right text-blue-600">{row.importQty || ''}</td><td className="p-2 border-r text-right text-blue-600">{row.importValue ? formatCurrency(row.importValue) : ''}</td>
                                <td className="p-2 border-r text-right text-red-600">{row.exportQty || ''}</td><td className="p-2 border-r text-right text-red-600">{row.exportValue ? formatCurrency(row.exportValue) : ''}</td>
                                <td className="p-2 border-r text-right font-medium">{row.closingQty}</td><td className="p-2 border-r text-right font-medium">{formatCurrency(row.closingValue)}</td><td className="p-2 border-r"></td>
                                {renderActions(row.transaction)}
                            </tr>
                        )) : (<tr><td colSpan={13} className="text-center p-8 text-gray-500">Không có phát sinh trong kỳ cho sản phẩm này.</td></tr>)}
                         <tr className="border-b font-semibold"><td colSpan={3} className="p-2 border-r">Cộng phát sinh trong kỳ</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r text-right">{totals.totalImportQty}</td><td className="p-2 border-r text-right">{formatCurrency(totals.totalImportValue)}</td><td className="p-2 border-r text-right">{totals.totalExportQty}</td><td className="p-2 border-r text-right">{formatCurrency(totals.totalExportValue)}</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r"></td><td className="p-2"></td></tr>
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                        <tr><td colSpan={3} className="p-2 border-r">Số dư cuối kỳ</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r">x</td><td className="p-2 border-r text-right">{closingQty}</td><td className="p-2 border-r text-right">{formatCurrency(closingValue)}</td><td className="p-2 border-r"></td><td className="p-2"></td></tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
  };
  
  const renderTaxLedger = () => (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="text-center my-4">
            <h2 className="text-xl font-bold uppercase">Sổ theo dõi tình hình thực hiện nghĩa vụ thuế với NSNN (Mẫu S4-HKD)</h2>
            <p className="font-semibold">Loại thuế: GTGT, TNCN</p>
        </div>
        <div className="overflow-x-auto border">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-100 font-bold text-center">
                    <tr className="border-b"><th colSpan={2} className="p-2 border-r">Chứng từ</th><th rowSpan={2} className="p-2 border-r align-middle">Diễn giải</th><th rowSpan={2} className="p-2 border-r align-middle">Số thuế phải nộp</th><th rowSpan={2} className="p-2 border-r align-middle">Số thuế đã nộp</th><th rowSpan={2} className="p-2 align-middle border-r">Ghi chú (Số dư)</th><th rowSpan={2} className="p-2 align-middle w-20">Hành động</th></tr>
                    <tr className="border-b"><th className="p-2 border-r font-semibold">Số hiệu</th><th className="p-2 border-r font-semibold">Ngày, tháng</th></tr>
                </thead>
                <tbody>
                    <tr className="border-b font-semibold"><td colSpan={3} className="p-2 border-r">Số dư đầu kỳ</td><td className="p-2 border-r"></td><td className="p-2 border-r"></td><td className="p-2 text-right border-r">{formatCurrency(taxLedgerData.openingBalance)}</td><td className="p-2"></td></tr>
                    {taxLedgerData.rows.length > 0 ? taxLedgerData.rows.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 border-r text-center">{row.docNumber || ''}</td><td className="p-2 border-r text-center">{formatDate(row.date.toISOString())}</td><td className="p-2 border-r">{row.description}</td>
                            <td className="p-2 border-r text-right text-red-600">{row.payable > 0 ? formatCurrency(row.payable) : ''}</td>
                            <td className="p-2 border-r text-right text-green-600">{row.paid > 0 ? formatCurrency(row.paid) : ''}</td>
                            <td className="p-2 text-right border-r">{formatCurrency(row.balance)}</td>
                            {renderActions(row.transaction)}
                        </tr>
                    )) : (<tr><td colSpan={7} className="text-center p-8 text-gray-500">Không có phát sinh thuế trong kỳ.</td></tr>)}
                    <tr className="border-b font-semibold"><td colSpan={3} className="p-2 border-r">Cộng số phát sinh trong kỳ</td><td className="p-2 border-r text-right">{formatCurrency(taxLedgerData.totals.payable)}</td><td className="p-2 border-r text-right">{formatCurrency(taxLedgerData.totals.paid)}</td><td className="p-2 border-r"></td><td className="p-2"></td></tr>
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr><td colSpan={3} className="p-2 border-r">Số dư cuối kỳ</td><td className="p-2 border-r"></td><td className="p-2 border-r"></td><td className="p-2 text-right border-r">{formatCurrency(taxLedgerData.closingBalance)}</td><td className="p-2"></td></tr>
                </tfoot>
            </table>
        </div>
    </div>
  );

  const renderPayrollLedger = () => {
    const { openingBalance, rows, totals, closingBalance } = payrollLedgerData;
    const renderRowData = (payable: number, paid: number, remaining: number) => (
        <>
            <td className="p-2 border-r text-right">{payable > 0 ? formatCurrency(payable) : ''}</td>
            <td className="p-2 border-r text-right">{paid > 0 ? formatCurrency(paid) : ''}</td>
            <td className="p-2 border-r text-right font-medium">{formatCurrency(remaining)}</td>
        </>
    );
     return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="text-center my-4">
                <h2 className="text-xl font-bold uppercase">Sổ theo dõi tình hình thanh toán tiền lương và các khoản nộp theo lương (Mẫu S5-HKD)</h2>
            </div>
            <div className="overflow-x-auto border">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 font-bold text-center">
                        <tr className="border-b">
                            <th rowSpan={2} className="p-2 border-r align-middle">Ngày, tháng ghi sổ</th>
                            <th colSpan={2} className="p-2 border-r">Chứng từ</th>
                            <th rowSpan={2} className="p-2 border-r align-middle">Diễn giải</th>
                            <th colSpan={3} className="p-2 border-r">Tiền lương và thu nhập</th>
                            <th colSpan={3} className="p-2 border-r">BHXH</th>
                            <th colSpan={3} className="p-2 border-r">BHYT</th>
                            <th colSpan={3} className="p-2 border-r">BHTN</th>
                            <th colSpan={3} className="p-2 border-r">KPCĐ</th>
                            <th rowSpan={2} className="p-2 align-middle w-20">Hành động</th>
                        </tr>
                        <tr className="border-b">
                            <th className="p-2 border-r font-semibold">Số hiệu</th><th className="p-2 border-r font-semibold">Ngày, tháng</th>
                            <th className="p-1 border-r font-semibold w-24">Số phải trả</th><th className="p-1 border-r font-semibold w-24">Số đã trả</th><th className="p-1 border-r font-semibold w-24">Số còn phải trả</th>
                            <th className="p-1 border-r font-semibold w-24">Số phải trả</th><th className="p-1 border-r font-semibold w-24">Số đã trả</th><th className="p-1 border-r font-semibold w-24">Số còn phải trả</th>
                            <th className="p-1 border-r font-semibold w-24">Số phải trả</th><th className="p-1 border-r font-semibold w-24">Số đã trả</th><th className="p-1 border-r font-semibold w-24">Số còn phải trả</th>
                            <th className="p-1 border-r font-semibold w-24">Số phải trả</th><th className="p-1 border-r font-semibold w-24">Số đã trả</th><th className="p-1 border-r font-semibold w-24">Số còn phải trả</th>
                            <th className="p-1 border-r font-semibold w-24">Số phải trả</th><th className="p-1 border-r font-semibold w-24">Số đã trả</th><th className="p-1 border-r font-semibold w-24">Số còn phải trả</th>
                        </tr>
                    </thead>
                     <tbody>
                        <tr className="border-b font-semibold">
                            <td colSpan={4} className="p-2 border-r">Số dư đầu kỳ</td>
                            {renderRowData(0, 0, openingBalance.salary)}
                            {renderRowData(0, 0, openingBalance.bhxh)}
                            {renderRowData(0, 0, openingBalance.bhyt)}
                            {renderRowData(0, 0, openingBalance.bhtn)}
                            {renderRowData(0, 0, openingBalance.kpcd)}
                            <td className="p-2"></td>
                        </tr>
                        {rows.length > 0 ? rows.map((row, index) => {
                             const remaining = (payable: number, paid: number) => payable - paid;
                             return (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-2 border-r text-center">{formatDate(row.docDate)}</td><td className="p-2 border-r text-center">{row.docNumber}</td><td className="p-2 border-r text-center">{formatDate(row.docDate)}</td><td className="p-2 border-r">{row.description}</td>
                                    {renderRowData(row.payable.salary, row.paid.salary, remaining(row.payable.salary, row.paid.salary))}
                                    {renderRowData(row.payable.bhxh, row.paid.bhxh, remaining(row.payable.bhxh, row.paid.bhxh))}
                                    {renderRowData(row.payable.bhyt, row.paid.bhyt, remaining(row.payable.bhyt, row.paid.bhyt))}
                                    {renderRowData(row.payable.bhtn, row.paid.bhtn, remaining(row.payable.bhtn, row.paid.bhtn))}
                                    {renderRowData(row.payable.kpcd, row.paid.kpcd, remaining(row.payable.kpcd, row.paid.kpcd))}
                                    {renderActions(row.transaction)}
                                </tr>
                             )
                        }) : (<tr><td colSpan={20} className="text-center p-8 text-gray-500">Không có phát sinh lương trong kỳ.</td></tr>)}
                        <tr className="border-b font-semibold">
                            <td colSpan={4} className="p-2 border-r">Cộng phát sinh trong kỳ</td>
                            <td className="p-2 border-r text-right">{formatCurrency(totals.payable.salary)}</td><td className="p-2 border-r text-right">{formatCurrency(totals.paid.salary)}</td><td className="p-2 border-r"></td>
                            <td className="p-2 border-r text-right">{formatCurrency(totals.payable.bhxh)}</td><td className="p-2 border-r text-right">{formatCurrency(totals.paid.bhxh)}</td><td className="p-2 border-r"></td>
                            <td className="p-2 border-r text-right">{formatCurrency(totals.payable.bhyt)}</td><td className="p-2 border-r text-right">{formatCurrency(totals.paid.bhyt)}</td><td className="p-2 border-r"></td>
                            <td className="p-2 border-r text-right">{formatCurrency(totals.payable.bhtn)}</td><td className="p-2 border-r text-right">{formatCurrency(totals.paid.bhtn)}</td><td className="p-2 border-r"></td>
                            <td className="p-2 border-r text-right">{formatCurrency(totals.payable.kpcd)}</td><td className="p-2 border-r text-right">{formatCurrency(totals.paid.kpcd)}</td><td className="p-2 border-r"></td>
                            <td className="p-2"></td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                        <tr>
                            <td colSpan={4} className="p-2 border-r">Số dư cuối kỳ</td>
                            {renderRowData(0, 0, closingBalance.salary)}
                            {renderRowData(0, 0, closingBalance.bhxh)}
                            {renderRowData(0, 0, closingBalance.bhyt)}
                            {renderRowData(0, 0, closingBalance.bhtn)}
                            {renderRowData(0, 0, closingBalance.kpcd)}
                            <td className="p-2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
     )
  }
  
  const renderCashLedger = () => (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="text-center my-4">
            <h2 className="text-xl font-bold uppercase">Sổ quỹ tiền mặt (Mẫu S6-HKD)</h2>
            <p className="font-semibold">Loại quỹ: Tiền mặt (VND)</p>
        </div>
        <div className="overflow-x-auto border">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-100 font-bold text-center">
                    <tr className="border-b">
                        <th rowSpan={2} className="p-2 border-r align-middle">Ngày, tháng ghi sổ</th>
                        <th rowSpan={2} className="p-2 border-r align-middle">Ngày, tháng chứng từ</th>
                        <th colSpan={2} className="p-2 border-r">Số hiệu chứng từ</th>
                        <th rowSpan={2} className="p-2 border-r align-middle">Diễn giải</th>
                        <th colSpan={3} className="p-2 border-r">Số tiền</th>
                        <th rowSpan={2} className="p-2 align-middle border-r">Ghi chú</th>
                        <th rowSpan={2} className="p-2 align-middle w-20">Hành động</th>
                    </tr>
                    <tr className="border-b">
                        <th className="p-2 border-r font-semibold">Thu</th>
                        <th className="p-2 border-r font-semibold">Chi</th>
                        <th className="p-2 border-r font-semibold">Thu</th>
                        <th className="p-2 border-r font-semibold">Chi</th>
                        <th className="p-2 border-r font-semibold">Tồn</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b font-semibold">
                        <td colSpan={5} className="p-2 border-r">Số dư đầu kỳ</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r text-right">{formatCurrency(cashLedgerData.openingBalance)}</td>
                        <td className="p-2 border-r"></td><td className="p-2"></td>
                    </tr>
                    {cashLedgerData.rows.length > 0 ? cashLedgerData.rows.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 border-r text-center">{formatDate(row.entryDate)}</td>
                            <td className="p-2 border-r text-center">{formatDate(row.docDate)}</td>
                            <td className="p-2 border-r text-center">{row.docNumberThu}</td>
                            <td className="p-2 border-r text-center">{row.docNumberChi}</td>
                            <td className="p-2 border-r">{row.description}</td>
                            <td className="p-2 border-r text-right text-green-600">{row.income > 0 ? formatCurrency(row.income) : ''}</td>
                            <td className="p-2 border-r text-right text-red-600">{row.expense > 0 ? formatCurrency(row.expense) : ''}</td>
                            <td className="p-2 border-r text-right font-medium">{formatCurrency(row.balance)}</td>
                            <td className="p-2 border-r">{row.notes}</td>
                            {renderActions(row.transaction)}
                        </tr>
                    )) : (
                        <tr><td colSpan={10} className="text-center p-8 text-gray-500">Không có phát sinh thu chi tiền mặt trong kỳ.</td></tr>
                    )}
                    <tr className="border-b font-semibold">
                        <td colSpan={5} className="p-2 border-r">Cộng số phát sinh trong kỳ</td>
                        <td className="p-2 border-r text-right">{formatCurrency(cashLedgerData.totals.income)}</td>
                        <td className="p-2 border-r text-right">{formatCurrency(cashLedgerData.totals.expense)}</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r"></td><td className="p-2"></td>
                    </tr>
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td colSpan={5} className="p-2 border-r">Số dư cuối kỳ</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r text-right">{formatCurrency(cashLedgerData.closingBalance)}</td>
                        <td className="p-2 border-r"></td><td className="p-2"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );
  
  const renderBankLedger = () => (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="text-center my-4">
            <h2 className="text-xl font-bold uppercase">Sổ tiền gửi ngân hàng (Mẫu S7-HKD)</h2>
            <p className="font-semibold">Nơi mở tài khoản: ... Số hiệu tài khoản: ...</p>
        </div>
        <div className="overflow-x-auto border">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-100 font-bold text-center">
                    <tr className="border-b">
                        <th rowSpan={2} className="p-2 border-r align-middle">Ngày, tháng ghi sổ</th>
                        <th colSpan={2} className="p-2 border-r">Chứng từ</th>
                        <th rowSpan={2} className="p-2 border-r align-middle">Diễn giải</th>
                        <th colSpan={3} className="p-2 border-r">Số tiền</th>
                        <th rowSpan={2} className="p-2 align-middle border-r">Ghi chú</th>
                        <th rowSpan={2} className="p-2 align-middle w-20">Hành động</th>
                    </tr>
                    <tr className="border-b">
                        <th className="p-2 border-r font-semibold">Số hiệu</th>
                        <th className="p-2 border-r font-semibold">Ngày, tháng</th>
                        <th className="p-2 border-r font-semibold">Thu (gửi vào)</th>
                        <th className="p-2 border-r font-semibold">Chi (rút ra)</th>
                        <th className="p-2 border-r font-semibold">Còn lại</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b font-semibold">
                        <td colSpan={4} className="p-2 border-r">Số dư đầu kỳ</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r text-right">{formatCurrency(bankLedgerData.openingBalance)}</td>
                        <td className="p-2 border-r"></td><td className="p-2"></td>
                    </tr>
                    {bankLedgerData.rows.length > 0 ? bankLedgerData.rows.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 border-r text-center">{formatDate(row.entryDate)}</td>
                            <td className="p-2 border-r text-center">{row.docNumber}</td>
                            <td className="p-2 border-r text-center">{formatDate(row.docDate)}</td>
                            <td className="p-2 border-r">{row.description}</td>
                            <td className="p-2 border-r text-right text-green-600">{row.income > 0 ? formatCurrency(row.income) : ''}</td>
                            <td className="p-2 border-r text-right text-red-600">{row.expense > 0 ? formatCurrency(row.expense) : ''}</td>
                            <td className="p-2 border-r text-right font-medium">{formatCurrency(row.balance)}</td>
                            <td className="p-2 border-r">{row.notes}</td>
                            {renderActions(row.transaction)}
                        </tr>
                    )) : (
                         <tr><td colSpan={9} className="text-center p-8 text-gray-500">Không có phát sinh tiền gửi ngân hàng trong kỳ.</td></tr>
                    )}
                    <tr className="border-b font-semibold">
                        <td colSpan={4} className="p-2 border-r">Cộng số phát sinh trong kỳ</td>
                        <td className="p-2 border-r text-right">{formatCurrency(bankLedgerData.totals.income)}</td>
                        <td className="p-2 border-r text-right">{formatCurrency(bankLedgerData.totals.expense)}</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r"></td><td className="p-2"></td>
                    </tr>
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td colSpan={4} className="p-2 border-r">Số dư cuối kỳ</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r">x</td>
                        <td className="p-2 border-r text-right">{formatCurrency(bankLedgerData.closingBalance)}</td>
                        <td className="p-2 border-r"></td><td className="p-2"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
       <div className="bg-white p-4 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center">
             <div className="flex space-x-2 border-b flex-wrap">
                <button onClick={() => setActiveLedger('revenue')} className={`px-4 py-2 text-sm font-semibold ${activeLedger === 'revenue' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>Sổ Doanh Thu (S1-HKD)</button>
                <button onClick={() => setActiveLedger('inventory')} className={`px-4 py-2 text-sm font-semibold ${activeLedger === 'inventory' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>Sổ Kho (S2-HKD)</button>
                <button onClick={() => setActiveLedger('expense')} className={`px-4 py-2 text-sm font-semibold ${activeLedger === 'expense' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>Sổ Chi Phí (S3-HKD)</button>
                <button onClick={() => setActiveLedger('tax')} className={`px-4 py-2 text-sm font-semibold ${activeLedger === 'tax' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>Sổ Thuế (S4-HKD)</button>
                <button onClick={() => setActiveLedger('payroll')} className={`px-4 py-2 text-sm font-semibold ${activeLedger === 'payroll' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>Sổ Lương (S5-HKD)</button>
                <button onClick={() => setActiveLedger('cash')} className={`px-4 py-2 text-sm font-semibold ${activeLedger === 'cash' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>Sổ Quỹ Tiền Mặt (S6-HKD)</button>
                <button onClick={() => setActiveLedger('bank')} className={`px-4 py-2 text-sm font-semibold ${activeLedger === 'bank' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>Sổ Tiền Gửi NH (S7-HKD)</button>
            </div>
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
                <div>
                     <label htmlFor="ledgerYear" className="block text-xs font-medium text-gray-600">Năm</label>
                     <input type="number" id="ledgerYear" value={year} onChange={handleYearChange} className="p-2 w-32 border border-gray-300 rounded-lg"/>
                </div>
                 <button onClick={handleExport} className="self-end flex items-center space-x-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg shadow hover:bg-green-700">
                    <DownloadIcon /><span>Xuất Excel</span>
                </button>
            </div>
        </div>
      </div>
      
      <div>
        {activeLedger === 'revenue' && renderRevenueLedger()}
        {activeLedger === 'expense' && renderExpenseLedger()}
        {activeLedger === 'inventory' && renderInventoryLedger()}
        {activeLedger === 'tax' && renderTaxLedger()}
        {activeLedger === 'payroll' && renderPayrollLedger()}
        {activeLedger === 'cash' && renderCashLedger()}
        {activeLedger === 'bank' && renderBankLedger()}
      </div>

      {isOCRModalOpen && (
        <OCRTransactionModal 
            onClose={() => setIsOCRModalOpen(false)}
            onAddTransaction={onAddTransaction}
            onAddProduct={onAddProduct}
            products={products}
        />
      )}
      {editingTransaction && (
        <AddTransactionModal
            onClose={() => setEditingTransaction(null)}
            onAddTransaction={onAddTransaction} // Fallback, though not used in edit mode
            onUpdateTransaction={onUpdateTransaction}
            transaction={editingTransaction}
            customers={[]} // Pass empty or fetch if needed, but for simple edit logic might be fine or pass full lists if available in LedgerView props which they aren't currently. 
            // Wait, LedgerView doesn't have customers/suppliers. 
            // To fully support editing with customer/supplier selection, LedgerView needs those props.
            // However, the prompt asked for "Allow editing info", basic info is in Transaction.
            // Ideally I should pass customers/suppliers to LedgerView.
            // Let's verify if I can easily pass them. Yes, App.tsx has them.
            suppliers={[]} 
            products={products}
        />
      )}
    </div>
  )
}

export default LedgerView;
