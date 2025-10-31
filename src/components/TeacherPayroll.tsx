import React, { useState } from 'react';
import Card from './Card';

interface TeacherPayrollProps {
  teacher: any;
  onClose: () => void;
}

const TeacherPayroll: React.FC<TeacherPayrollProps> = ({ teacher, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);

  const paymentHistory = [
    {
      id: 'payment-1',
      date: '2025-10-15',
      amount: teacher.payroll.monthlySalary,
      method: 'Bank Transfer',
      status: 'completed',
      reference: 'TXN-123456789',
      description: 'Monthly Salary - October 2025'
    },
    {
      id: 'payment-2',
      date: '2025-09-15',
      amount: teacher.payroll.monthlySalary,
      method: 'Bank Transfer',
      status: 'completed',
      reference: 'TXN-123456788',
      description: 'Monthly Salary - September 2025'
    },
    {
      id: 'payment-3',
      date: '2025-08-15',
      amount: teacher.payroll.monthlySalary,
      method: 'Bank Transfer',
      status: 'completed',
      reference: 'TXN-123456787',
      description: 'Monthly Salary - August 2025'
    },
    {
      id: 'payment-4',
      date: '2025-07-15',
      amount: teacher.payroll.monthlySalary,
      method: 'Bank Transfer',
      status: 'completed',
      reference: 'TXN-123456786',
      description: 'Monthly Salary - July 2025'
    },
    {
      id: 'payment-5',
      date: '2025-06-15',
      amount: teacher.payroll.monthlySalary,
      method: 'Bank Transfer',
      status: 'completed',
      reference: 'TXN-123456785',
      description: 'Monthly Salary - June 2025'
    }
  ];

  const salaryStructure = {
    baseSalary: teacher.payroll.monthlySalary,
    currency: teacher.payroll.currency,
    paymentType: teacher.payroll.paymentType || 'Monthly',
    allowances: [
      { name: 'Housing Allowance', amount: teacher.payroll.currency === 'USD' ? 200 : 50000, type: 'fixed' },
      { name: 'Transport Allowance', amount: teacher.payroll.currency === 'USD' ? 100 : 25000, type: 'fixed' },
      { name: 'Performance Bonus', amount: teacher.payroll.currency === 'USD' ? 150 : 37500, type: 'variable' }
    ],
    deductions: [
      { name: 'Tax', amount: teacher.payroll.currency === 'USD' ? 150 : 37500, type: 'fixed' },
      { name: 'Insurance', amount: teacher.payroll.currency === 'USD' ? 50 : 12500, type: 'fixed' }
    ]
  };

  const totalAllowances = salaryStructure.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  const totalDeductions = salaryStructure.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  const netSalary = salaryStructure.baseSalary + totalAllowances - totalDeductions;

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getMethodIcon = (method: string) => {
    const icons = {
      'Bank Transfer': '🏦',
      'Credit Card': '💳',
      'Cash': '💵',
      'PayPal': '🅿️',
      'Check': '📄'
    };
    return icons[method as keyof typeof icons] || '💰';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'payments', label: 'Payment History', icon: '💰' },
    { id: 'structure', label: 'Salary Structure', icon: '🏗️' },
    { id: 'reports', label: 'Reports', icon: '📈' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Payroll Management</h2>
              <p className="text-primary-100">{teacher.fullName} - {teacher.id}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPaymentForm(true)}
                className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                + Record Payment
              </button>
              <button
                onClick={() => setShowSalaryForm(true)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
              >
                Update Salary
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Base Salary</p>
                    <p className="text-2xl font-bold text-primary-600">
                      {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{salaryStructure.baseSalary.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Monthly</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Allowances</p>
                    <p className="text-2xl font-bold text-green-600">
                      {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{totalAllowances.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Per month</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                    <p className="text-2xl font-bold text-red-600">
                      {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{totalDeductions.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Per month</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Net Salary</p>
                    <p className="text-2xl font-bold text-gold-600">
                      {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{netSalary.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Take home</p>
                  </div>
                </Card>
              </div>

              {/* Recent Payments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Recent Payments">
                  <div className="space-y-3">
                    {paymentHistory.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getMethodIcon(payment.method)}</span>
                          <div>
                            <p className="font-medium text-gray-900">{payment.description}</p>
                            <p className="text-sm text-gray-600">{new Date(payment.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{payment.amount.toLocaleString()}
                          </p>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Payment Summary">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Year Total</span>
                      <span className="font-semibold text-gray-900">
                        {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{(paymentHistory.length * teacher.payroll.monthlySalary).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Monthly</span>
                      <span className="font-semibold text-gray-900">
                        {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{teacher.payroll.monthlySalary.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Next Payment</span>
                      <span className="font-semibold text-primary-600">Nov 15, 2025</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Status</span>
                        <span className="text-green-600 font-semibold">Current</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                    Export CSV
                  </button>
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                    Filter
                  </button>
                </div>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {new Date(payment.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{payment.description}</td>
                          <td className="px-4 py-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <span>{getMethodIcon(payment.method)}</span>
                              <span>{payment.method}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                            {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{payment.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-mono text-gray-600">{payment.reference}</td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-2">
                              <button className="text-primary-600 hover:text-primary-800 text-sm">View</button>
                              <button className="text-gray-600 hover:text-gray-800 text-sm">Receipt</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Salary Structure</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Allowances">
                  <div className="space-y-3">
                    {salaryStructure.allowances.map((allowance, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{allowance.name}</p>
                          <p className="text-sm text-gray-600 capitalize">{allowance.type}</p>
                        </div>
                        <span className="font-semibold text-green-600">
                          {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{allowance.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Allowances</span>
                        <span className="font-bold text-green-600">
                          {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{totalAllowances.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Deductions">
                  <div className="space-y-3">
                    {salaryStructure.deductions.map((deduction, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{deduction.name}</p>
                          <p className="text-sm text-gray-600 capitalize">{deduction.type}</p>
                        </div>
                        <span className="font-semibold text-red-600">
                          {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{deduction.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Deductions</span>
                        <span className="font-bold text-red-600">
                          {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{totalDeductions.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Salary Calculation">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Base Salary</span>
                    <span className="font-semibold text-gray-900">
                      {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{salaryStructure.baseSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span>+ Allowances</span>
                    <span className="font-semibold">
                      {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{totalAllowances.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-red-600">
                    <span>- Deductions</span>
                    <span className="font-semibold">
                      {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{totalDeductions.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t-2 border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Net Salary</span>
                      <span className="font-bold text-2xl text-gold-600">
                        {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{netSalary.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Payroll Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Generate Report">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="">Select report type...</option>
                        <option value="monthly">Monthly Payroll</option>
                        <option value="yearly">Yearly Summary</option>
                        <option value="tax">Tax Report</option>
                        <option value="comprehensive">Comprehensive Report</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="">Select period...</option>
                        <option value="current-month">Current Month</option>
                        <option value="last-month">Last Month</option>
                        <option value="current-year">Current Year</option>
                        <option value="last-year">Last Year</option>
                      </select>
                    </div>
                    
                    <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Generate Report
                    </button>
                  </div>
                </Card>

                <Card title="Quick Stats">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Paid This Year</span>
                      <span className="font-semibold text-primary-600">
                        {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{(paymentHistory.length * teacher.payroll.monthlySalary).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Monthly</span>
                      <span className="font-semibold text-gray-900">
                        {salaryStructure.currency === 'USD' ? '$' : 'Rs'}{teacher.payroll.monthlySalary.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Payment Frequency</span>
                      <span className="font-semibold text-gray-900">Monthly</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Payment</span>
                      <span className="font-semibold text-gray-900">Oct 15, 2025</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Export Options">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="font-medium text-gray-900">Excel Report</p>
                    <p className="text-sm text-gray-600">Detailed payroll data</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-medium text-gray-900">PDF Report</p>
                    <p className="text-sm text-gray-600">Formatted payroll summary</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📧</div>
                    <p className="font-medium text-gray-900">Email Report</p>
                    <p className="text-sm text-gray-600">Send to teacher</p>
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Record Payment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  defaultValue={teacher.payroll.monthlySalary}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="">Select method...</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  defaultValue="Monthly Salary"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  placeholder="Transaction reference"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary Form Modal */}
      {showSalaryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Salary Structure</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Salary</label>
                  <input
                    type="number"
                    defaultValue={teacher.payroll.monthlySalary}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="USD">USD ($)</option>
                    <option value="PKR">PKR (Rs)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="hourly">Hourly</option>
                  <option value="per-student">Per Student</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowSalaryForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  Update Salary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPayroll;









