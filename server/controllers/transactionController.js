const Transaction = require('../models/Transaction');

// POST /api/transactions: Add a manual transaction
exports.createTransaction = async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/transactions: Fetch all transactions (sorted by newest)
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ date: -1 })
      .populate('reference_job_id', 'device_model status');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/transactions/summary: Return total income, expense, and net profit
exports.getTransactionSummary = async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: null,
          results: {
            $push: {
              type: '$_id',
              totalAmount: '$totalAmount'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          income: {
            $sum: {
              $cond: [
                { $eq: [{ $arrayElemAt: ['$results.type', { $indexOfArray: ['$results.type', 'Income'] }] }, 'Income'] },
                { $arrayElemAt: ['$results.totalAmount', { $indexOfArray: ['$results.type', 'Income'] }] },
                0
              ]
            }
          },
          expense: {
            $sum: {
              $cond: [
                { $eq: [{ $arrayElemAt: ['$results.type', { $indexOfArray: ['$results.type', 'Expense'] }] }, 'Expense'] },
                { $arrayElemAt: ['$results.totalAmount', { $indexOfArray: ['$results.type', 'Expense'] }] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          totalIncome: '$income',
          totalExpense: '$expense',
          netProfit: { $subtract: ['$income', '$expense'] }
        }
      }
    ]);

    // If no transactions exist, return zeros
    const result = summary.length > 0 ? summary[0] : {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};