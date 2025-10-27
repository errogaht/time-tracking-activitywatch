const Client = require('../models/Client');
const TimeEntry = require('../models/TimeEntry');
const Payment = require('../models/Payment');

/**
 * Balance Service
 * Handles balance calculations for clients
 */

class BalanceService {
  /**
   * Calculate complete balance information for a client
   * @param {number} client_id - Client ID
   * @returns {Object} Balance information including earnings, payments, and balance
   */
  static calculateClientBalance(client_id) {
    // Get client information
    const client = Client.findById(client_id);
    if (!client) {
      const error = new Error(`Client with ID ${client_id} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Get total time worked
    const timeStats = TimeEntry.getTotalsByClient(client_id);

    // Calculate earned amount
    const totalMinutes = timeStats.total_minutes;
    const totalHours = timeStats.total_hours;
    const remainingMinutes = timeStats.remaining_minutes;
    const earnedAmount = (totalMinutes / 60) * client.hourly_rate;

    // Get payment totals by type
    const paymentTotals = Payment.getTotalsByClient(client_id);

    // Calculate total money payments and supplements separately
    let totalMoneyPaid = 0;
    let totalSupplements = 0;

    paymentTotals.by_type.forEach(typeTotal => {
      if (typeTotal.payment_type === 'money') {
        totalMoneyPaid = typeTotal.total_amount;
      } else if (typeTotal.payment_type === 'supplements') {
        totalSupplements = typeTotal.total_amount;
      }
    });

    const totalPaid = totalMoneyPaid + totalSupplements;

    // Get supplements list
    const supplementsPayments = Payment.findAll({
      client_id,
      payment_type: 'supplements'
    });

    // Get unbilled time entries
    const unbilledEntries = TimeEntry.findUnbilled(client_id);

    // Calculate unbilled totals
    let unbilledMinutes = 0;
    unbilledEntries.forEach(entry => {
      unbilledMinutes += entry.total_minutes;
    });

    const unbilledHours = Math.floor(unbilledMinutes / 60);
    const unbilledRemainingMinutes = unbilledMinutes % 60;
    const unbilledAmount = (unbilledMinutes / 60) * client.hourly_rate;

    // Calculate balance (from client's perspective: positive = prepaid/credit, negative = owes money)
    const balance = totalPaid - earnedAmount;

    // Format response
    return {
      client: {
        id: client.id,
        name: client.name,
        hourly_rate: client.hourly_rate
      },
      time_worked: {
        total_hours: totalHours,
        total_minutes: remainingMinutes,
        total_minutes_sum: totalMinutes,
        formatted_time: `${totalHours}h ${remainingMinutes}m`,
        total_entries: timeStats.total_entries
      },
      earnings: {
        total_amount: parseFloat(earnedAmount.toFixed(2)),
        hourly_rate: client.hourly_rate
      },
      payments: {
        money: parseFloat(totalMoneyPaid.toFixed(2)),
        supplements: parseFloat(totalSupplements.toFixed(2)),
        total_paid: parseFloat(totalPaid.toFixed(2)),
        supplements_list: supplementsPayments.map(payment => ({
          id: payment.id,
          payment_date: payment.payment_date,
          amount: payment.amount,
          description: payment.supplements_description,
          notes: payment.notes
        }))
      },
      unbilled: {
        total_hours: unbilledHours,
        total_minutes: unbilledRemainingMinutes,
        total_minutes_sum: unbilledMinutes,
        formatted_time: `${unbilledHours}h ${unbilledRemainingMinutes}m`,
        amount: parseFloat(unbilledAmount.toFixed(2)),
        entries_count: unbilledEntries.length
      },
      balance: {
        amount: parseFloat(balance.toFixed(2)),
        // Positive balance = client has prepaid/credit
        // Negative balance = client owes money for work done
        status: balance >= 0 ? 'client_credit' : 'client_owes'
      }
    };
  }
}

module.exports = BalanceService;
