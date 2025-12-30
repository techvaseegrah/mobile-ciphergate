const { Job, Customer, Part } = require('../models/Schemas');
const Transaction = require('../models/Transaction');

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
  try {
    // Get today's date range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Use Promise.all to fetch all data concurrently
    const [
      totalRevenueToday,
      activeJobsCount,
      jobsReadyForPickup,
      lowStockCount,
      recentJobs
    ] = await Promise.all([
      // Total revenue today (sum of 'Income' transactions where date == today)
      Transaction.aggregate([
        {
          $match: {
            type: 'Income',
            date: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]).then(result => result.length > 0 ? result[0].total : 0),

      // Active jobs count (jobs where status != 'Picked Up')
      Job.countDocuments({ status: { $ne: 'Picked Up' } }),

      // Jobs ready for pickup (jobs where status == 'Done')
      Job.countDocuments({ status: 'Done' }),

      // Low stock count (parts where stock <= min_stock_alert)
      Part.countDocuments({ 
        $expr: { 
          $lte: ['$stock', '$min_stock_alert'] 
        }
      }),

      // Recent jobs (5 most recently created jobs with populated customer and taken_by_worker)
      Job.find()
        .sort({ repair_job_taken_time: -1 })
        .limit(5)
        .populate('customer', 'name')
        .populate('taken_by_worker', 'name')
    ]);

    res.json({
      total_revenue_today: totalRevenueToday,
      active_jobs_count: activeJobsCount,
      jobs_ready_for_pickup: jobsReadyForPickup,
      low_stock_count: lowStockCount,
      recent_jobs: recentJobs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/dashboard/financials
exports.getFinancialData = async (req, res) => {
  try {
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Revenue by department
    const revenueByDepartment = await Transaction.aggregate([
      {
        $match: {
          type: 'Income',
          date: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31, 23, 59, 59)
          }
        }
      },
      {
        $group: {
          _id: '$department',
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $project: {
          _id: 0,
          department: '$_id',
          revenue: '$totalRevenue'
        }
      }
    ]);

    // Monthly revenue trend
    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          type: 'Income',
          date: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31, 23, 59, 59)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          month: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'Jan' },
                { case: { $eq: ['$_id', 2] }, then: 'Feb' },
                { case: { $eq: ['$_id', 3] }, then: 'Mar' },
                { case: { $eq: ['$_id', 4] }, then: 'Apr' },
                { case: { $eq: ['$_id', 5] }, then: 'May' },
                { case: { $eq: ['$_id', 6] }, then: 'Jun' },
                { case: { $eq: ['$_id', 7] }, then: 'Jul' },
                { case: { $eq: ['$_id', 8] }, then: 'Aug' },
                { case: { $eq: ['$_id', 9] }, then: 'Sep' },
                { case: { $eq: ['$_id', 10] }, then: 'Oct' },
                { case: { $eq: ['$_id', 11] }, then: 'Nov' },
                { case: { $eq: ['$_id', 12] }, then: 'Dec' }
              ],
              default: 'Unknown'
            }
          },
          revenue: '$totalRevenue'
        }
      }
    ]);

    // Parts cost analysis
    const partsCostAnalysis = await Part.find({
      $or: [
        { cost_price: { $exists: true, $ne: null } },
        { selling_price: { $exists: true, $ne: null } }
      ]
    }).populate('category');

    // Calculate profit margin for each part
    const partsWithProfit = partsCostAnalysis.map(part => {
      const cost = part.cost_price || 0;
      const selling = part.selling_price || 0;
      const profitMargin = cost > 0 ? ((selling - cost) / cost * 100).toFixed(2) : 0;
      
      return {
        _id: part._id,
        name: part.name,
        category: part.category?.name || 'N/A',
        stock: part.stock,
        cost_price: cost,
        selling_price: selling,
        profit_margin: parseFloat(profitMargin)
      };
    });

    res.json({
      revenue_by_department: revenueByDepartment,
      monthly_revenue: monthlyRevenue,
      parts_cost_analysis: partsWithProfit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};