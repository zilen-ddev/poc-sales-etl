const SalesRecord = require('./sales-record');

/**
 * Sales Data Validation Utility
 * Validates sales data structure and content before processing
 */

/**
 * Validates a sales row using the SalesRecord model
 * @param {Object} row - CSV row object
 * @returns {Array} - Array of validation errors
 */
function validateSalesRow(row) {
    try {
        const salesRecord = new SalesRecord(row);
        return salesRecord.validate();
    } catch (error) {
        console.error('Sales row validation failed:', error, { row });
        return [`Validation error: ${error.message}`];
    }
}


module.exports = {
    validateSalesRow
};
