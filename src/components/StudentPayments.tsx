import React, { useState } from 'react';
import Card from './Card';

interface StudentPaymentsProps {
  student: any;
  onClose: () => void;
}

const StudentPayments: React.FC<StudentPaymentsProps> = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const paymentHistory = [
    {
      id: 'payment-1',
      date: '2025-10-15',
      amount: 500,
      method: 'Credit Card',
      status: 'completed',
      reference: 'TXN-123456789',
      description: 'Monthly Tuition - October 2025'
    },
    {
      id: 'payment-2',
      date: '2025-09-15',
      amount: 500,
      method: 'Bank Transfer',
      status: 'completed',
      reference: 'TXN-123456788',
      description: 'Monthly Tuition - September 2025'
    },
    {
      id: 'payment-3',
      date: '2025-08-15',
      amount: 500,
      method: 'Credit Card',
      status: 'completed',
      reference: 'TXN-123456787',
      description: 'Monthly Tuition - August 2025'
    },
    {
      id: 'payment-4',
      date: '2025-07-15',
      amount: 500,
      method: 'Cash',
      status: 'completed',
      reference: 'CASH-001',
      description: 'Monthly Tuition - July 2025'
    },
    {
      id: 'payment-5',
      date: '2025-06-15',
      amount: 500,
      method: 'Credit Card',
      status: 'completed',
      reference: 'TXN-123456786',
      description: 'Monthly Tuition - June 2025'
    }
  ];

  const pendingPayments = [
    {
      id: 'pending-1',
      dueDate: '2025-11-15',
      amount: 500,
      description: 'Monthly Tuition - November 2025',
      status: 'pending',
      daysOverdue: 0
    }
  ];

  const overduePayments = [
    {
      id: 'overdue-1',
      dueDate: '2025-10-01',
      amount: 100,
      description: 'Late Fee',
      status: 'overdue',
      daysOverdue: 20
    }
  ];

  const invoices = [
    {
      id: 'invoice-1',
      date: '2025-10-01',
      dueDate: '2025-10-15',
      amount: 500,
      status: 'paid',
      description: 'Monthly Tuition - October 2025',
      items: [
        { description: 'Quran Recitation Course', amount: 400 },
        { description: 'Islamic Studies Course', amount: 100 }
      ]
    },
    {
      id: 'invoice-2',
      date: '2025-09-01',
      dueDate: '2025-09-15',
      amount: 500,
      status: 'paid',
      description: 'Monthly Tuition - September 2025',
      items: [
        { description: 'Quran Recitation Course', amount: 400 },
        { description: 'Islamic Studies Course', amount: 100 }
      ]
    }
  ];

  const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPending = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalOverdue = overduePayments.reduce((sum, payment) => sum + payment.amount, 0);

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      overdue: 'bg-red-100 text-red-800 border-red-300',
      paid: 'bg-green-100 text-green-800 border-green-300',
      unpaid: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getMethodIcon = (method: string) => {
    const icons = {
      'Credit Card': '💳',
      'Bank Transfer': '🏦',
      'Cash': '💵',
      'PayPal': '🅿️',
      'Stripe': '💳'
    };
    return icons[method as keyof typeof icons] || '💰';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'payments', label: 'Payment History', icon: '💰' },
    { id: 'invoices', label: 'Invoices', icon: '🧾' },
    { id: 'reports', label: 'Reports', icon: '📈' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Payment Management</h2>
              <p className="text-primary-100">{student.fullName} - {student.id}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPaymentForm(true)}
                className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                + Record Payment
              </button>
              <button
                onClick={() => setShowInvoiceForm(true)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
              >
                + Create Invoice
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
                    <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">All time</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">${totalPending.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Due soon</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">${totalOverdue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Needs attention</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Monthly Tuition</p>
                    <p className="text-2xl font-bold text-primary-600">${student.tuitionFee}</p>
                    <p className="text-xs text-gray-500 mt-1">Per month</p>
                  </div>
                </Card>
              </div>

              {/* Payment Status */}
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
                          <p className="font-semibold text-gray-900">${payment.amount}</p>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Payment Alerts">
                  <div className="space-y-3">
                    {overduePayments.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600">⚠️</span>
                          <div>
                            <p className="font-medium text-red-900">Overdue Payments</p>
                            <p className="text-sm text-red-700">{overduePayments.length} payment(s) overdue</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {pendingPayments.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600">⏰</span>
                          <div>
                            <p className="font-medium text-yellow-900">Upcoming Payments</p>
                            <p className="text-sm text-yellow-700">{pendingPayments.length} payment(s) due soon</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {overduePayments.length === 0 && pendingPayments.length === 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">✅</span>
                          <div>
                            <p className="font-medium text-green-900">All Payments Current</p>
                            <p className="text-sm text-green-700">No outstanding payments</p>
                          </div>
                        </div>
                      </div>
                    )}
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
                            ${payment.amount.toLocaleString()}
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

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
                <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                  + Create Invoice
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {invoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">Invoice #{invoice.id}</h4>
                        <p className="text-sm text-gray-600">{invoice.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Date:</span>
                        <span className="text-gray-900">{new Date(invoice.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-semibold text-gray-900">${invoice.amount}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2">Items:</h5>
                      <div className="space-y-1">
                        {invoice.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.description}</span>
                            <span className="text-gray-900">${item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <button className="flex-1 px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                        View PDF
                      </button>
                      <button className="flex-1 px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                        Send
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment Reports</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Monthly Payment Summary">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">October 2025</span>
                      <span className="font-semibold text-gray-900">$500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">September 2025</span>
                      <span className="font-semibold text-gray-900">$500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">August 2025</span>
                      <span className="font-semibold text-gray-900">$500</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="font-bold text-primary-600">$1,500</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Payment Methods">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span>💳</span>
                        <span className="text-sm text-gray-600">Credit Card</span>
                      </div>
                      <span className="font-semibold text-gray-900">$1,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span>🏦</span>
                        <span className="text-sm text-gray-600">Bank Transfer</span>
                      </div>
                      <span className="font-semibold text-gray-900">$500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span>💵</span>
                        <span className="text-sm text-gray-600">Cash</span>
                      </div>
                      <span className="font-semibold text-gray-900">$500</span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Export Options">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="font-medium text-gray-900">Excel Report</p>
                    <p className="text-sm text-gray-600">Detailed payment data</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-medium text-gray-900">PDF Summary</p>
                    <p className="text-sm text-gray-600">Payment summary</p>
                  </button>
                  <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center">
                    <div className="text-2xl mb-2">📧</div>
                    <p className="font-medium text-gray-900">Email Report</p>
                    <p className="text-sm text-gray-600">Send to parent</p>
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
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="">Select method...</option>
                  <option value="credit-card">Credit Card</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  placeholder="e.g., Monthly Tuition - October 2025"
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

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Invoice</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  placeholder="e.g., Monthly Tuition - November 2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Item description"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <button className="text-sm text-primary-600 hover:text-primary-800">+ Add Item</button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowInvoiceForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPayments;










