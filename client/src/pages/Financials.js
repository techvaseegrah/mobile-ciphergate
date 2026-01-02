import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Financials = () => {
  const [financialData, setFinancialData] = useState({
    revenue_by_department: [],
    monthly_revenue: [],
    parts_cost_analysis: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin');
    if (!storedAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch financial data from the backend
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const res = await api.get('/dashboard/financials');
        setFinancialData(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch financial data');
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading financial data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-gray-600">Overview of your repair shop's financial performance</p>
      </div>

      {/* Revenue by Department */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Revenue by Department</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={financialData.revenue_by_department}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" angle={-45} textAnchor="end" height={60} />
              <YAxis tickFormatter={(value) => `Rs ${value}`} />
              <Tooltip formatter={(value) => [`Rs ${value}`, 'Revenue']} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Monthly Revenue Trend</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={financialData.monthly_revenue}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
              <YAxis tickFormatter={(value) => `Rs ${value}`} />
              <Tooltip formatter={(value) => [`Rs ${value}`, 'Revenue']} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Parts Cost Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Parts Cost Analysis</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {financialData.parts_cost_analysis.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No parts data available
                  </td>
                </tr>
              ) : (
                financialData.parts_cost_analysis.map((part) => (
                  <tr key={part._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{part.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{part.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(part.cost_price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(part.selling_price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={part.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {part.profit_margin >= 0 ? '+' : ''}{part.profit_margin}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Financials;