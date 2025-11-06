import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Customer, Supplier, Product, TransactionType, TaxCategory, Employee, UserRole } from '../types';
import { exportToCsv, formatCurrency } from '../utils';
import { DownloadIcon } from '../constants';
import StatCard from './StatCard';
import { ComposedChart, Line, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';


type ReportType = 'profit-loss' | 'debt' | 'sales' | 'tax' | 'inventory';


interface ReportsViewProps {
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  currentUser: Employee;
}

const ReportsView: React.FC<ReportsViewProps> = ({ transactions, customers, suppliers, products, currentUser }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('profit-loss');
  const today = new Date();
  
  const [reportYear, setReportYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0]);
  const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<string>('');


  const setDateRange = (start: Date, end: Date) => {
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }

  const handleYearChange = (year: number) => {
    if (isNaN(year) || year < 1900 || year > 2100) return;
    setReportYear(year);
    // Automatically set the date range to the full new year
    setDateRange(new Date(year, 0, 1), new Date(year, 11, 31));
  }
  
  const handlePresetClick = (type: 'year' | 'quarter' | 'month', value: number) => {
    let start, end;
    switch(type) {
      case 'year':
        start = new Date(reportYear, 0, 1);
        end = new Date(reportYear, 11, 31);
        break;
      case 'quarter':
        const startMonth = (value - 1) * 3;
        start = new Date(reportYear, startMonth, 1);
        end = new Date(reportYear, startMonth + 3, 0);
        break;
      case 'month':
        start = new Date(reportYear, value - 1, 1);
        end = new Date(reportYear, value, 0);
        break;
    }
    setDateRange(start, end);
  }

  const availableReports = useMemo(() => {
    const allReports: { key: ReportType, label: string }[] = [
      { key: 'profit-loss', label: 'Lãi/Lỗ' },
      { key: 'debt', label: 'Công Nợ' },
      { key: 'sales', label: 'Bán Hàng' },
      { key: 'tax', label: 'Báo cáo Thuế' },
      { key: 'inventory', label: 'Tồn Kho' },
    ];
    
    switch (currentUser.role) {
      case UserRole.ADMIN:
      case UserRole.ACCOUNTANT:
        return allReports;
      case UserRole.SALES:
        return allReports.filter(r => ['sales', 'debt'].includes(r.key));
      case UserRole.WAREHOUSE:
        return allReports.filter(r => ['inventory', 'debt'].includes(r.key));
      default:
        return [];
    }
  }, [currentUser]);

  useEffect(() => {
    // If the active report is not available for the current user, switch to the first available one
    if (!availableReports.find(r => r.key === activeReport)) {
      setActiveReport(availableReports[0]?.key || 'profit-loss');
    }
  }, [availableReports, activeReport]);
  
  const TAX_CATEGORY_CONFIG = {
      [TaxCategory.DISTRIBUTION_GOODS]: {
        stt: '(1)',
        name: 'Phân phối, cung cấp hàng hóa',
        code: '[28]',
        vatRate: 0.01, // 1%
        pitRate: 0.005, // 0.5%
      },
      [TaxCategory.SERVICES_NO_MATERIALS]: {
        stt: '(2)',
        name: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu',
        code: '[29]',
        vatRate: 0.05, // 5%
        pitRate: 0.02, // 2%
      },
      [TaxCategory.RENTAL_PROPERTY]: {
        stt: '(3)',
        name: 'Cho thuê tài sản',
        code: '[29]',
        vatRate: 0.05, // 5%
        pitRate: 0.05, // 5%
      },
      [TaxCategory.AGENCY_INSURANCE_MLM]: {
        stt: '(4)',
        name: 'Làm đại lý xổ số, đại lý bảo hiểm, bán hàng đa cấp',
        code: '[29]',
        vatRate: 0, // No VAT rate specified for agent commissions
        pitRate: 0.05, // 5%
      },
      [TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS]: {
        stt: '(5)',
        name: 'Sản xuất, vận tải, dịch vụ có gắn với hàng hóa, xây dựng có bao thầu nguyên vật liệu',
        code: '[30]',
        vatRate: 0.03, // 3%
        pitRate: 0.015, // 1.5%
      },
      [TaxCategory.OTHER]: {
        stt: '(6)',
        name: 'Hoạt động kinh doanh khác',
        code: '[31]',
        vatRate: 0.02, // 2%
        pitRate: 0.01, // 1%
      },
    };

  const filteredTransactions = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= start && transactionDate <= end;
    });
  }, [transactions, startDate, endDate]);

  const profitLossReport = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
    };
  }, [filteredTransactions]);
  
  const debtReport = useMemo(() => {
      const customerDebt = customers.map(c => {
          const sales = transactions.filter(t => t.customerId === c.id && t.category.includes("Bán hàng")).reduce((s, t) => s + t.amount, 0);
          const payments = transactions.filter(t => t.customerId === c.id && t.category.includes("Thu nợ")).reduce((s, t) => s + t.amount, 0);
          return { name: c.name, debt: sales - payments };
      }).filter(c => c.debt > 0);

      const supplierDebt = suppliers.map(s => {
          const purchases = transactions.filter(t => t.supplierId === s.id && t.category !== "Trả nợ nhà cung cấp").reduce((s, t) => s + t.amount, 0);
          const payments = transactions.filter(t => t.supplierId === s.id && t.category === "Trả nợ nhà cung cấp").reduce((s, t) => s + t.amount, 0);
          return { name: s.name, debt: purchases - payments };
      }).filter(s => s.debt > 0);
      
      return { customerDebt, supplierDebt };
  }, [transactions, customers, suppliers]);

  const salesReport = useMemo(() => {
    const salesByProduct: { [productId: string]: { name: string; quantity: number; total: number; price: number } } = {};
    const productMap = new Map<string, { name: string; price: number }>(products.map(p => [p.id, { name: p.name, price: p.price }]));
    
    const salesTransactions = filteredTransactions.filter(t => t.category === "Bán hàng" && t.lineItems);

    for (const t of salesTransactions) {
        for (const item of t.lineItems!) {
            if (!salesByProduct[item.productId]) {
                const productInfo = productMap.get(item.productId);
                salesByProduct[item.productId] = {
                    name: productInfo?.name || 'Sản phẩm đã xóa',
                    quantity: 0,
                    total: 0,
                    price: item.price,
                };
            }
            salesByProduct[item.productId].quantity += item.quantity;
            salesByProduct[item.productId].total += item.quantity * item.price;
        }
    }
    
    const totalSales = Object.values(salesByProduct).reduce((sum, p) => sum + p.total, 0);

    const soldProducts = Object.entries(salesByProduct).map(([productId, data]) => ({
        id: productId,
        name: data.name,
        quantity: data.quantity,
        price: data.price,
        total: data.total,
    })).sort((a, b) => b.total - a.total);

    return {
        totalSales,
        soldProducts,
    }
}, [filteredTransactions, products]);

 const taxReport = useMemo(() => {
    const productMap = new Map<string, Product>(products.map(p => [p.id, p]));
    const taxableCategories = ["Bán hàng", "Cung cấp dịch vụ", "Cho thuê tài sản"];
    const salesTransactions = filteredTransactions.filter(t => 
        t.type === TransactionType.INCOME && 
        (taxableCategories.includes(t.category) || t.lineItems)
    );
    
    const orderedTaxCategories = [
        TaxCategory.DISTRIBUTION_GOODS,
        TaxCategory.SERVICES_NO_MATERIALS,
        TaxCategory.RENTAL_PROPERTY,
        TaxCategory.AGENCY_INSURANCE_MLM,
        TaxCategory.PRODUCTION_TRANSPORT_SERVICES_WITH_GOODS,
        TaxCategory.OTHER,
    ];

    const revenueByCategory: { [key in TaxCategory]?: number } = {};

    for (const t of salesTransactions) {
        if (t.lineItems && t.lineItems.length > 0) {
             for (const item of t.lineItems) {
                const product = productMap.get(item.productId);
                const revenue = item.quantity * item.price;
                const category = product?.taxCategory || TaxCategory.DISTRIBUTION_GOODS;
                revenueByCategory[category] = (revenueByCategory[category] || 0) + revenue;
            }
        } else {
             // Handle transactions without line items, like 'Cho thuê tài sản'
        }
    }
    
    const reportRows = orderedTaxCategories.map(category => {
        const config = TAX_CATEGORY_CONFIG[category];
        const revenue = revenueByCategory[category] || 0;
        return {
            ...config,
            revenue,
            vatAmount: revenue * config.vatRate,
            pitAmount: revenue * config.pitRate,
        };
    }).filter(row => row.revenue > 0);

    const totals = reportRows.reduce((acc, row) => ({
        revenue: acc.revenue + row.revenue,
        vatAmount: acc.vatAmount + row.vatAmount,
        pitAmount: acc.pitAmount + row.pitAmount,
    }), { revenue: 0, vatAmount: 0, pitAmount: 0 });

    const salesByProduct: { [productId: string]: { name: string; total: number; } } = {};
    for (const t of salesTransactions) {
       if (t.lineItems) {
         for (const item of t.lineItems) {
            const product = productMap.get(item.productId);
            if (!salesByProduct[item.productId]) {
                salesByProduct[item.productId] = {
                    name: product?.name || 'Sản phẩm đã xóa',
                    total: 0,
                };
            }
            salesByProduct[item.productId].total += item.quantity * item.price;
          }
       }
    }
    const detailedItems = Object.values(salesByProduct).sort((a, b) => b.total - a.total);

    const managementExpenseCategories = [
        { label: "Chi phí nhân công", category: "Chi phí nhân công", code: "[24]" },
        { label: "Chi phí điện", category: "Chi phí điện", code: "[25]" },
        { label: "Chi phí nước", category: "Chi phí nước", code: "[26]" },
        { label: "Chi phí viễn thông", category: "Chi phí viễn thông", code: "[27]" },
        { label: "Chi phí thuê kho bãi, mặt bằng kinh doanh", category: "Chi phí thuê kho bãi, mặt bằng kinh doanh", code: "[28]" },
        { label: "Chi phí quản lý (chi phí văn phòng phẩm, công cụ, dụng cụ,...)", category: "Chi phí quản lý", code: "[29]" },
        { label: "Chi phí khác (hội nghị, công tác phí, thanh lý, nhượng bán tài sản cố định, thuế ngoài khác,...)", category: "Chi phí khác", code: "[30]" },
    ];
    
    const managementExpenseReport = managementExpenseCategories.map(item => {
        const amount = filteredTransactions
            .filter(t => t.type === TransactionType.EXPENSE && t.category === item.category)
            .reduce((sum, t) => sum + t.amount, 0);
        return { ...item, amount };
    });
    
    const totalManagementExpense = managementExpenseReport.reduce((sum, item) => sum + item.amount, 0);


    return {
        reportRows,
        totals,
        detailedItems,
        managementExpenseReport,
        totalManagementExpense
    }
 }, [filteredTransactions, products]);

 const inventoryReport = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const transactionsBefore = transactions.filter(t => new Date(t.date) < start);
    const transactionsInPeriod = filteredTransactions;

    const reportData = products.map(product => {
        let openingQty = product.initialStock || 0;
        transactionsBefore.forEach(t => {
            if (t.lineItems) {
                t.lineItems.forEach(item => {
                    if (item.productId === product.id) {
                        if (t.category === 'Bán hàng' || t.category === 'Trả hàng cho nhà cung cấp') openingQty -= item.quantity;
                        else if (t.category === 'Nhập hàng' || t.category === 'Khách trả hàng') openingQty += item.quantity;
                    }
                });
            }
        });
        const openingValue = openingQty * (product.purchasePrice || 0);

        let importQty = 0;
        let importValue = 0;
        let exportQty = 0;
        let exportValue = 0; // Cost of goods sold

        transactionsInPeriod.forEach(t => {
            if (t.lineItems) {
                t.lineItems.forEach(item => {
                    if (item.productId === product.id) {
                        if (t.category === 'Nhập hàng' || t.category === 'Khách trả hàng') {
                            importQty += item.quantity;
                            importValue += item.quantity * (item.price || product.purchasePrice || 0);
                        } else if (t.category === 'Bán hàng' || t.category === 'Trả hàng cho nhà cung cấp') {
                            exportQty += item.quantity;
                            exportValue += item.quantity * (product.purchasePrice || 0);
                        }
                    }
                });
            }
        });

        const closingQty = openingQty + importQty - exportQty;
        const closingValue = closingQty * (product.purchasePrice || 0);

        return {
            id: product.id, name: product.name, unit: product.unit,
            openingQty, openingValue,
            importQty, importValue,
            exportQty, exportValue,
            closingQty, closingValue,
        };
    });

    return reportData.filter(p => p.openingQty !== 0 || p.importQty !== 0 || p.exportQty !== 0 || p.closingQty !== 0);
 }, [filteredTransactions, transactions, products, startDate]);

  const inventoryChartData = useMemo(() => {
    if (!selectedInventoryProduct) return [];

    const product = products.find(p => p.id === selectedInventoryProduct);
    if (!product) return [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    let runningStock = product.initialStock || 0;
    const transactionsBefore = transactions.filter(t => new Date(t.date) < start);
    transactionsBefore.forEach(t => {
        if (t.lineItems) {
            t.lineItems.forEach(item => {
                if (item.productId === product.id) {
                    if (t.category === 'Bán hàng' || t.category === 'Trả hàng cho nhà cung cấp') runningStock -= item.quantity;
                    else if (t.category === 'Nhập hàng' || t.category === 'Khách trả hàng') runningStock += item.quantity;
                }
            });
        }
    });

    const dailyMovements: { [date: string]: { imports: number, exports: number } } = {};
    filteredTransactions.forEach(t => {
         if (t.lineItems) {
            t.lineItems.forEach(item => {
                if (item.productId === product.id) {
                    const dateKey = t.date.split('T')[0];
                    if (!dailyMovements[dateKey]) {
                        dailyMovements[dateKey] = { imports: 0, exports: 0 };
                    }
                    if (t.category === 'Nhập hàng' || t.category === 'Khách trả hàng') {
                        dailyMovements[dateKey].imports += item.quantity;
                    } else if (t.category === 'Bán hàng' || t.category === 'Trả hàng cho nhà cung cấp') {
                        dailyMovements[dateKey].exports += item.quantity;
                    }
                }
            });
        }
    });

    const data = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const movement = dailyMovements[dateKey] || { imports: 0, exports: 0 };
        
        runningStock += movement.imports - movement.exports;

        data.push({
            date: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(currentDate),
            importQty: movement.imports,
            exportQty: movement.exports,
            closingQty: runningStock,
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }, [selectedInventoryProduct, products, transactions, startDate, endDate, filteredTransactions]);

  useEffect(() => {
    if (activeReport === 'inventory' && !selectedInventoryProduct && inventoryReport.length > 0) {
        setSelectedInventoryProduct(inventoryReport[0].id);
    }
  }, [activeReport, inventoryReport, selectedInventoryProduct]);

  
  const handleExport = () => {
    switch(activeReport) {
        case 'profit-loss':
            exportToCsv('bao-cao-lai-lo', 
                ["Chỉ tiêu", "Số tiền"], 
                [
                    ["Tổng thu nhập", profitLossReport.totalIncome],
                    ["Tổng chi phí", profitLossReport.totalExpense],
                    ["Lợi nhuận", profitLossReport.profit],
                ]
            );
            break;
        case 'debt':
            exportToCsv('bao-cao-cong-no',
                ["Đối tượng", "Loại công nợ", "Số tiền"],
                [
                    ...debtReport.customerDebt.map(c => [c.name, "Phải thu", c.debt]),
                    ...debtReport.supplierDebt.map(s => [s.name, "Phải trả", s.debt]),
                ]
            );
            break;
        case 'sales':
             exportToCsv('bao-cao-ban-hang',
                ["Tên Sản Phẩm", "Số Lượng Bán", "Đơn Giá", "Tổng Tiền"],
                salesReport.soldProducts.map(p => [p.name, p.quantity, p.price, p.total])
            );
            break;
        case 'tax':
             exportToCsv('to-khai-thue-01-hkd',
                ["STT", "Nhóm ngành nghề", "Mã chỉ tiêu", "Doanh thu GTGT", "Thuế GTGT", "Doanh thu TNCN", "Thuế TNCN"],
                [
                    ...taxReport.reportRows.map(row => [row.stt, row.name, row.code, row.revenue, row.vatAmount, row.revenue, row.pitAmount]),
                    ["", "Tổng cộng:", "[32]", taxReport.totals.revenue, taxReport.totals.vatAmount, taxReport.totals.revenue, taxReport.totals.pitAmount]
                ]
            );
            break;
        case 'inventory':
            exportToCsv('bao-cao-ton-kho',
                ["Tên Hàng Hóa", "Đơn Vị", "Tồn Đầu SL", "Tồn Đầu GT", "Nhập SL", "Nhập GT", "Xuất SL", "Xuất GT (Giá Vốn)", "Tồn Cuối SL", "Tồn Cuối GT"],
                inventoryReport.map(p => [
                    p.name, p.unit, p.openingQty, p.openingValue, p.importQty, p.importValue, p.exportQty, p.exportValue, p.closingQty, p.closingValue
                ])
            );
            break;
    }
  };


  const renderReportContent = () => {
    switch (activeReport) {
      case 'profit-loss':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Tổng Thu Nhập" value={formatCurrency(profitLossReport.totalIncome)} color="text-green-500" />
            <StatCard title="Tổng Chi Phí" value={formatCurrency(profitLossReport.totalExpense)} color="text-red-500" />
            <StatCard title="Lợi Nhuận" value={formatCurrency(profitLossReport.profit)} color={profitLossReport.profit >= 0 ? 'text-blue-500' : 'text-red-500'} />
          </div>
        );
      case 'debt':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Công Nợ Phải Thu (Khách Hàng)</h3>
                    {debtReport.customerDebt.length > 0 ? (
                        <ul className="divide-y bg-white p-4 rounded-lg shadow">
                            {debtReport.customerDebt.map(c => (
                                <li key={c.name} className="flex justify-between py-2">
                                    <span>{c.name}</span>
                                    <span className="font-semibold text-red-600">{formatCurrency(c.debt)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500">Không có công nợ phải thu.</p>}
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Công Nợ Phải Trả (Nhà C.Cấp)</h3>
                    {debtReport.supplierDebt.length > 0 ? (
                        <ul className="divide-y bg-white p-4 rounded-lg shadow">
                            {debtReport.supplierDebt.map(s => (
                                <li key={s.name} className="flex justify-between py-2">
                                    <span>{s.name}</span>
                                    <span className="font-semibold text-purple-600">{formatCurrency(s.debt)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500">Không có công nợ phải trả.</p>}
                </div>
            </div>
        );
      case 'sales':
        return (
             <div>
                <StatCard title="Tổng Doanh Thu Bán Hàng" value={formatCurrency(salesReport.totalSales)} color="text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-2">Chi Tiết Bán Hàng Theo Sản Phẩm</h3>
                {salesReport.soldProducts.length > 0 ? (
                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Sản Phẩm</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số Lượng</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn Giá</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Tiền</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {salesReport.soldProducts.map(p => (
                                    <tr key={p.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{p.quantity}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(p.price)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700 text-right">{formatCurrency(p.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 mt-4">Không có dữ liệu bán hàng chi tiết trong kỳ này.</p>
                )}
            </div>
        );
      case 'tax':
        return (
            <div>
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 uppercase">A. Kê khai thuế giá trị gia tăng (GTGT), thuế thu nhập cá nhân (TNCN)</h3>
                    <p className="text-sm text-gray-600 italic text-right">Đơn vị tiền: Đồng Việt Nam</p>
                </div>
                <div className="overflow-x-auto mt-4 border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr className="text-center">
                                <th rowSpan={2} className="px-2 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">STT</th>
                                <th rowSpan={2} className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Nhóm ngành nghề</th>
                                <th rowSpan={2} className="px-2 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Mã chỉ tiêu</th>
                                <th colSpan={2} className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Thuế GTGT</th>
                                <th colSpan={2} className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Thuế TNCN</th>
                            </tr>
                            <tr className="text-center">
                                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Doanh thu (a)</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Số thuế (b)</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Doanh thu (c)</th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Số thuế (d)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {taxReport.reportRows.length > 0 ? taxReport.reportRows.map((row) => (
                                <tr key={row.stt}>
                                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 text-center border">{row.stt}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">{row.name}</td>
                                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 text-center border">{row.code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right border">{formatCurrency(row.revenue)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right border">{formatCurrency(row.vatAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right border">{formatCurrency(row.revenue)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right border">{formatCurrency(row.pitAmount)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-gray-500 border">Không có doanh thu tính thuế trong kỳ này.</td>
                                </tr>
                            )}
                            <tr className="font-bold bg-gray-50">
                                <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center border">Tổng cộng:</td>
                                <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 text-center border">[32]</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border">{formatCurrency(taxReport.totals.revenue)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border">{formatCurrency(taxReport.totals.vatAmount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border">{formatCurrency(taxReport.totals.revenue)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border">{formatCurrency(taxReport.totals.pitAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 className="text-lg font-semibold text-gray-700 mt-8 mb-2">Phụ Lục: Bảng Kê Chi Tiết Doanh Thu Hàng Hóa, Dịch Vụ</h3>
                {taxReport.detailedItems.length > 0 ? (
                     <div className="overflow-x-auto mt-4">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Hàng Hóa, Dịch Vụ</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh Thu</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {taxReport.detailedItems.map((p, index) => (
                                    <tr key={p.name}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700 text-right">{formatCurrency(p.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 mt-4">Không có doanh thu tính thuế trong kỳ này.</p>
                )}

                <div className="mt-12">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 uppercase">II. CHI PHÍ QUẢN LÝ</h3>
                        <p className="text-sm text-gray-600 italic text-right">Đơn vị tiền: Đồng Việt Nam</p>
                    </div>
                    <div className="overflow-x-auto mt-4 border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr className="text-center">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border">Chỉ tiêu</th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Mã chỉ tiêu</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider border">Số tiền</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {taxReport.managementExpenseReport.map((row) => (
                                    <tr key={row.code}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">{row.label}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center border">{row.code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right border">{formatCurrency(row.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="font-bold bg-gray-50">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border">Tổng cộng</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center border">[31]</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border">{formatCurrency(taxReport.totalManagementExpense)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

            </div>
        );
        case 'inventory':
            return (
                <div>
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 uppercase">I. Báo cáo vật liệu, dụng cụ, sản phẩm, hàng hóa</h3>
                        <p className="text-sm text-gray-600 italic text-right">Đơn vị tiền: Đồng Việt Nam</p>
                    </div>
                    <div className="overflow-x-auto mt-4 border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr className="text-center">
                                    <th rowSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Hàng hóa</th>
                                    <th rowSpan={2} className="px-2 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">ĐVT</th>
                                    <th colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Tồn đầu kỳ</th>
                                    <th colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Nhập trong kỳ</th>
                                    <th colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Xuất trong kỳ</th>
                                    <th colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Tồn cuối kỳ</th>
                                </tr>
                                <tr className="text-center">
                                    <th className="px-2 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">SL</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Thành tiền</th>
                                    <th className="px-2 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">SL</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Thành tiền</th>
                                    <th className="px-2 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">SL</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Thành tiền</th>
                                    <th className="px-2 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">SL</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider border">Thành tiền</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                {inventoryReport.length > 0 ? inventoryReport.map((p) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border">{p.name}</td>
                                        <td className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-500 border">{p.unit}</td>
                                        <td className="px-2 py-4 whitespace-nowrap text-sm text-right text-gray-700 border">{p.openingQty}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-700 border">{formatCurrency(p.openingValue)}</td>
                                        <td className="px-2 py-4 whitespace-nowrap text-sm text-right text-blue-600 border">{p.importQty}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-blue-600 border">{formatCurrency(p.importValue)}</td>
                                        <td className="px-2 py-4 whitespace-nowrap text-sm text-right text-red-600 border">{p.exportQty}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-600 border">{formatCurrency(p.exportValue)}</td>
                                        <td className="px-2 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 border">{p.closingQty}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 border">{formatCurrency(p.closingValue)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={10} className="text-center py-10 text-gray-500 border">Không có dữ liệu tồn kho.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     <div className="mt-8 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-4">
                           <label htmlFor="inventoryProductSelect" className="block text-sm font-medium text-gray-700">Xem biểu đồ chi tiết cho sản phẩm:</label>
                           <select 
                             id="inventoryProductSelect" 
                             value={selectedInventoryProduct} 
                             onChange={e => setSelectedInventoryProduct(e.target.value)}
                             className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            >
                              {inventoryReport.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                        </div>
                     </div>
                     {selectedInventoryProduct && inventoryChartData.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Biểu đồ biến động tồn kho: {products.find(p => p.id === selectedInventoryProduct)?.name}</h4>
                            <div className="h-96 bg-white p-4 rounded-lg shadow">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={inventoryChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis yAxisId="left" orientation="left" stroke="#4f46e5" tick={{ fontSize: 12 }} label={{ value: 'SL Nhập/Xuất', angle: -90, position: 'insideLeft', offset: 10, style: {textAnchor: 'middle'} }} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#16a34a" tick={{ fontSize: 12 }} label={{ value: 'SL Tồn Kho', angle: 90, position: 'insideRight', offset: -10, style: {textAnchor: 'middle'} }}/>
                                        <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)} />
                                        <Legend wrapperStyle={{fontSize: "14px"}}/>
                                        <Bar yAxisId="left" dataKey="importQty" fill="#22c55e" name="Nhập kho" radius={[4, 4, 0, 0]} />
                                        <Bar yAxisId="left" dataKey="exportQty" fill="#ef4444" name="Xuất kho" radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="closingQty" stroke="#3b82f6" strokeWidth={3} name="Tồn cuối kỳ" dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                     )}
                </div>
            )
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Bộ Lọc Báo Cáo</h2>
        
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label htmlFor="reportYear" className="block text-sm font-medium text-gray-700">Chọn năm báo cáo</label>
                    <input 
                        type="number" 
                        id="reportYear" 
                        value={reportYear} 
                        onChange={e => handleYearChange(parseInt(e.target.value))} 
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="YYYY"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Từ ngày</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"/>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Đến ngày</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"/>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-600 self-center">Lọc nhanh theo năm {reportYear}:</span>
                <div className="flex flex-wrap gap-1">
                    <button onClick={() => handlePresetClick('year', reportYear)} className="px-3 py-1 text-xs font-semibold text-white bg-primary-600 rounded-full hover:bg-primary-700">Cả năm</button>
                    {[1, 2, 3, 4].map(q => (
                        <button key={`q-${q}`} onClick={() => handlePresetClick('quarter', q)} className="px-3 py-1 text-xs text-primary-700 bg-primary-100 rounded-full hover:bg-primary-200">Quý {q}</button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                 <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <button key={`m-${m}`} onClick={() => handlePresetClick('month', m)} className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300">T{m}</button>
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div className="flex space-x-2 border-b flex-wrap">
              {availableReports.map(report => (
                <button 
                  key={report.key}
                  onClick={() => setActiveReport(report.key)} 
                  className={`px-4 py-2 text-sm font-semibold ${activeReport === report.key ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}
                >
                  {report.label}
                </button>
              ))}
            </div>
            <button onClick={handleExport} className="flex items-center space-x-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg shadow hover:bg-green-700 transition-colors mt-4 sm:mt-0">
                <DownloadIcon />
                <span>Xuất Excel</span>
            </button>
        </div>
        <div>
            {renderReportContent()}
        </div>
      </div>

    </div>
  );
};

export default ReportsView;