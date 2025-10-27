/**
 * Validation middleware for API requests
 */

/**
 * Validate client data for create/update operations
 */
const validateClientData = (req, res, next) => {
  const { name, hourly_rate } = req.body;
  const errors = [];

  // Name validation (required for POST, optional for PUT)
  if (req.method === 'POST' && !name) {
    errors.push('Name is required');
  }

  if (name !== undefined && typeof name !== 'string') {
    errors.push('Name must be a string');
  }

  if (name !== undefined && name.trim().length === 0) {
    errors.push('Name cannot be empty');
  }

  // Hourly rate validation (required for POST, optional for PUT)
  if (req.method === 'POST' && hourly_rate === undefined) {
    errors.push('Hourly rate is required');
  }

  if (hourly_rate !== undefined) {
    const rate = Number(hourly_rate);

    if (isNaN(rate)) {
      errors.push('Hourly rate must be a number');
    } else if (rate < 0) {
      errors.push('Hourly rate must be a positive number');
    }
  }

  // Validate is_active if provided
  if (req.body.is_active !== undefined) {
    const isActive = req.body.is_active;
    if (typeof isActive !== 'boolean' && isActive !== 0 && isActive !== 1) {
      errors.push('is_active must be a boolean (true/false or 1/0)');
    }
  }

  // If there are validation errors, return 400
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid client data',
      details: errors
    });
  }

  next();
};

/**
 * Validate numeric ID parameter
 */
const validateIdParam = (req, res, next) => {
  const id = Number(req.params.id);

  if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid ID parameter',
      details: ['ID must be a positive integer']
    });
  }

  // Attach parsed ID to request for use in controllers
  req.validatedId = id;
  next();
};

/**
 * Validate time entry data for create/update operations
 */
const validateTimeEntryData = (req, res, next) => {
  const { client_id, work_date, hours, minutes, source, activitywatch_exclude_afk } = req.body;
  const errors = [];

  // client_id validation (required for POST, optional for PUT)
  if (req.method === 'POST' && client_id === undefined) {
    errors.push('client_id is required');
  }

  if (client_id !== undefined) {
    const clientIdNum = Number(client_id);
    if (isNaN(clientIdNum) || clientIdNum <= 0 || !Number.isInteger(clientIdNum)) {
      errors.push('client_id must be a positive integer');
    }
  }

  // work_date validation (required for POST, optional for PUT)
  if (req.method === 'POST' && !work_date) {
    errors.push('work_date is required');
  }

  if (work_date !== undefined) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(work_date)) {
      errors.push('work_date must be in YYYY-MM-DD format');
    } else {
      // Validate that it's a valid date
      const date = new Date(work_date);
      if (isNaN(date.getTime())) {
        errors.push('work_date must be a valid date');
      }
    }
  }

  // hours validation
  if (hours !== undefined) {
    const hoursNum = Number(hours);
    if (isNaN(hoursNum)) {
      errors.push('hours must be a number');
    } else if (hoursNum < 0) {
      errors.push('hours must be greater than or equal to 0');
    } else if (!Number.isInteger(hoursNum)) {
      errors.push('hours must be an integer');
    }
  }

  // minutes validation
  if (minutes !== undefined) {
    const minutesNum = Number(minutes);
    if (isNaN(minutesNum)) {
      errors.push('minutes must be a number');
    } else if (minutesNum < 0) {
      errors.push('minutes must be greater than or equal to 0');
    } else if (minutesNum >= 60) {
      errors.push('minutes must be less than 60');
    } else if (!Number.isInteger(minutesNum)) {
      errors.push('minutes must be an integer');
    }
  }

  // source validation
  if (source !== undefined) {
    const validSources = ['manual', 'activitywatch', 'import'];
    if (!validSources.includes(source)) {
      errors.push('source must be one of: manual, activitywatch, import');
    }
  }

  // activitywatch_exclude_afk validation
  if (activitywatch_exclude_afk !== undefined) {
    if (typeof activitywatch_exclude_afk !== 'boolean' &&
        activitywatch_exclude_afk !== 0 &&
        activitywatch_exclude_afk !== 1) {
      errors.push('activitywatch_exclude_afk must be a boolean (true/false or 1/0)');
    }
  }

  // Validate is_billed if provided
  if (req.body.is_billed !== undefined) {
    const isBilled = req.body.is_billed;
    if (typeof isBilled !== 'boolean' && isBilled !== 0 && isBilled !== 1) {
      errors.push('is_billed must be a boolean (true/false or 1/0)');
    }
  }

  // If there are validation errors, return 400
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid time entry data',
      details: errors
    });
  }

  next();
};

/**
 * Validate payment data for create/update operations
 */
const validatePaymentData = (req, res, next) => {
  const { client_id, payment_date, payment_type, amount, supplements_description } = req.body;
  const errors = [];

  // client_id validation (required for POST, optional for PUT)
  if (req.method === 'POST' && client_id === undefined) {
    errors.push('client_id is required');
  }

  if (client_id !== undefined) {
    const clientIdNum = Number(client_id);
    if (isNaN(clientIdNum) || clientIdNum <= 0 || !Number.isInteger(clientIdNum)) {
      errors.push('client_id must be a positive integer');
    }
  }

  // payment_date validation (required for POST, optional for PUT)
  if (req.method === 'POST' && !payment_date) {
    errors.push('payment_date is required');
  }

  if (payment_date !== undefined) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payment_date)) {
      errors.push('payment_date must be in YYYY-MM-DD format');
    } else {
      // Validate that it's a valid date
      const date = new Date(payment_date);
      if (isNaN(date.getTime())) {
        errors.push('payment_date must be a valid date');
      }
    }
  }

  // payment_type validation (required for POST, optional for PUT)
  if (req.method === 'POST' && !payment_type) {
    errors.push('payment_type is required');
  }

  if (payment_type !== undefined) {
    const validTypes = ['money', 'supplements', 'other'];
    if (!validTypes.includes(payment_type)) {
      errors.push('payment_type must be one of: money, supplements, other');
    }
  }

  // amount validation
  if (amount !== undefined && amount !== null) {
    const amountNum = Number(amount);
    if (isNaN(amountNum)) {
      errors.push('amount must be a number');
    } else if (amountNum < 0) {
      errors.push('amount must be a positive number');
    }
  }

  // If payment_type is 'money', amount must be provided and positive
  if (payment_type === 'money') {
    if (amount === undefined || amount === null) {
      errors.push('amount is required when payment_type is "money"');
    } else {
      const amountNum = Number(amount);
      if (amountNum <= 0) {
        errors.push('amount must be a positive number when payment_type is "money"');
      }
    }
  }

  // If payment_type is 'supplements', supplements_description is required
  if (payment_type === 'supplements') {
    if (!supplements_description || supplements_description.trim().length === 0) {
      errors.push('supplements_description is required when payment_type is "supplements"');
    }
  }

  // If there are validation errors, return 400
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid payment data',
      details: errors
    });
  }

  next();
};

/**
 * Validate bill data for create operations from time entries
 */
const validateBillFromEntries = (req, res, next) => {
  const { client_id, time_entry_ids } = req.body;
  const errors = [];

  // client_id validation (required)
  if (client_id === undefined) {
    errors.push('client_id is required');
  } else {
    const clientIdNum = Number(client_id);
    if (isNaN(clientIdNum) || clientIdNum <= 0 || !Number.isInteger(clientIdNum)) {
      errors.push('client_id must be a positive integer');
    }
  }

  // time_entry_ids validation (required)
  if (!time_entry_ids) {
    errors.push('time_entry_ids is required');
  } else if (!Array.isArray(time_entry_ids)) {
    errors.push('time_entry_ids must be an array');
  } else if (time_entry_ids.length === 0) {
    errors.push('time_entry_ids array cannot be empty');
  } else {
    // Validate each ID is a positive integer
    time_entry_ids.forEach((id, index) => {
      const idNum = Number(id);
      if (isNaN(idNum) || idNum <= 0 || !Number.isInteger(idNum)) {
        errors.push(`time_entry_ids[${index}] must be a positive integer`);
      }
    });
  }

  // Validate bill_type if provided
  if (req.body.bill_type !== undefined) {
    const validTypes = ['invoice', 'act'];
    if (!validTypes.includes(req.body.bill_type)) {
      errors.push('bill_type must be one of: invoice, act');
    }
  }

  // Validate status if provided
  if (req.body.status !== undefined) {
    const validStatuses = ['draft', 'issued', 'paid'];
    if (!validStatuses.includes(req.body.status)) {
      errors.push('status must be one of: draft, issued, paid');
    }
  }

  // Validate issue_date if provided
  if (req.body.issue_date !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.body.issue_date)) {
      errors.push('issue_date must be in YYYY-MM-DD format');
    } else {
      const date = new Date(req.body.issue_date);
      if (isNaN(date.getTime())) {
        errors.push('issue_date must be a valid date');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid bill data',
      details: errors
    });
  }

  next();
};

/**
 * Validate bill data for create operations from date range
 */
const validateBillFromRange = (req, res, next) => {
  const { client_id, period_from, period_to } = req.body;
  const errors = [];

  // client_id validation (required)
  if (client_id === undefined) {
    errors.push('client_id is required');
  } else {
    const clientIdNum = Number(client_id);
    if (isNaN(clientIdNum) || clientIdNum <= 0 || !Number.isInteger(clientIdNum)) {
      errors.push('client_id must be a positive integer');
    }
  }

  // period_from validation (required)
  if (!period_from) {
    errors.push('period_from is required');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(period_from)) {
      errors.push('period_from must be in YYYY-MM-DD format');
    } else {
      const date = new Date(period_from);
      if (isNaN(date.getTime())) {
        errors.push('period_from must be a valid date');
      }
    }
  }

  // period_to validation (required)
  if (!period_to) {
    errors.push('period_to is required');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(period_to)) {
      errors.push('period_to must be in YYYY-MM-DD format');
    } else {
      const date = new Date(period_to);
      if (isNaN(date.getTime())) {
        errors.push('period_to must be a valid date');
      }
    }
  }

  // Validate period_from is before or equal to period_to
  if (period_from && period_to) {
    if (new Date(period_from) > new Date(period_to)) {
      errors.push('period_from must be before or equal to period_to');
    }
  }

  // Validate bill_type if provided
  if (req.body.bill_type !== undefined) {
    const validTypes = ['invoice', 'act'];
    if (!validTypes.includes(req.body.bill_type)) {
      errors.push('bill_type must be one of: invoice, act');
    }
  }

  // Validate status if provided
  if (req.body.status !== undefined) {
    const validStatuses = ['draft', 'issued', 'paid'];
    if (!validStatuses.includes(req.body.status)) {
      errors.push('status must be one of: draft, issued, paid');
    }
  }

  // Validate issue_date if provided
  if (req.body.issue_date !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.body.issue_date)) {
      errors.push('issue_date must be in YYYY-MM-DD format');
    } else {
      const date = new Date(req.body.issue_date);
      if (isNaN(date.getTime())) {
        errors.push('issue_date must be a valid date');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid bill data',
      details: errors
    });
  }

  next();
};

/**
 * Validate bill data for update operations
 */
const validateBillUpdate = (req, res, next) => {
  const errors = [];

  // Validate bill_type if provided
  if (req.body.bill_type !== undefined) {
    const validTypes = ['invoice', 'act'];
    if (!validTypes.includes(req.body.bill_type)) {
      errors.push('bill_type must be one of: invoice, act');
    }
  }

  // Validate status if provided
  if (req.body.status !== undefined) {
    const validStatuses = ['draft', 'issued', 'paid'];
    if (!validStatuses.includes(req.body.status)) {
      errors.push('status must be one of: draft, issued, paid');
    }
  }

  // Validate issue_date if provided
  if (req.body.issue_date !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.body.issue_date)) {
      errors.push('issue_date must be in YYYY-MM-DD format');
    } else {
      const date = new Date(req.body.issue_date);
      if (isNaN(date.getTime())) {
        errors.push('issue_date must be a valid date');
      }
    }
  }

  // Validate period_from if provided
  if (req.body.period_from !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.body.period_from)) {
      errors.push('period_from must be in YYYY-MM-DD format');
    } else {
      const date = new Date(req.body.period_from);
      if (isNaN(date.getTime())) {
        errors.push('period_from must be a valid date');
      }
    }
  }

  // Validate period_to if provided
  if (req.body.period_to !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.body.period_to)) {
      errors.push('period_to must be in YYYY-MM-DD format');
    } else {
      const date = new Date(req.body.period_to);
      if (isNaN(date.getTime())) {
        errors.push('period_to must be a valid date');
      }
    }
  }

  // Validate total_amount if provided
  if (req.body.total_amount !== undefined) {
    const amount = Number(req.body.total_amount);
    if (isNaN(amount)) {
      errors.push('total_amount must be a number');
    } else if (amount < 0) {
      errors.push('total_amount must be a positive number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid bill update data',
      details: errors
    });
  }

  next();
};

module.exports = {
  validateClientData,
  validateIdParam,
  validateTimeEntryData,
  validatePaymentData,
  validateBillFromEntries,
  validateBillFromRange,
  validateBillUpdate
};
