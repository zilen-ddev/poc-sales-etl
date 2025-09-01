/**
 * CSV Data Validation Utility
 * Validates CSV data structure and content before processing
 */

/**
 * Validates CSV data structure and content
 * @param {Array} csvData - Array of CSV row objects
 * @returns {Object} - Validation result with isValid flag and errors array
 */
function validateCSVData(csvData) {
    const errors = [];
    
    // Check if data exists
    if (!csvData || !Array.isArray(csvData)) {
        errors.push('CSV data must be an array');
        return { isValid: false, errors };
    }
    
    if (csvData.length === 0) {
        errors.push('CSV data is empty');
        return { isValid: false, errors };
    }
    
    // Get expected columns from first row
    const firstRow = csvData[0];
    const expectedColumns = Object.keys(firstRow);
    
    // Validate each row
    csvData.forEach((row, index) => {
        const rowErrors = validateCSVRow(row, expectedColumns, index);
        errors.push(...rowErrors);
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validates a single CSV row
 * @param {Object} row - CSV row object
 * @param {Array} expectedColumns - Array of expected column names
 * @param {number} rowIndex - Index of the row for error reporting
 * @returns {Array} - Array of validation errors for this row
 */
function validateCSVRow(row, expectedColumns, rowIndex) {
    const errors = [];
    
    // Check if row has all expected columns
    const rowColumns = Object.keys(row);
    const missingColumns = expectedColumns.filter(col => !rowColumns.includes(col));
    const extraColumns = rowColumns.filter(col => !expectedColumns.includes(col));
    
    if (missingColumns.length > 0) {
        errors.push(`Row ${rowIndex + 1}: Missing columns: ${missingColumns.join(', ')}`);
    }
    
    if (extraColumns.length > 0) {
        errors.push(`Row ${rowIndex + 1}: Extra columns: ${extraColumns.join(', ')}`);
    }
    
    // Validate specific fields based on common sales data patterns
    expectedColumns.forEach(column => {
        const value = row[column];
        const columnError = validateColumnValue(column, value, rowIndex);
        if (columnError) {
            errors.push(columnError);
        }
    });
    
    return errors;
}

/**
 * Validates a specific column value
 * @param {string} columnName - Name of the column
 * @param {any} value - Value to validate
 * @param {number} rowIndex - Row index for error reporting
 * @returns {string|null} - Error message or null if valid
 */
function validateColumnValue(columnName, value, rowIndex) {
    const column = columnName.toLowerCase();
    
    // Required fields validation
    const requiredFields = ['id', 'date', 'amount', 'customer'];
    if (requiredFields.some(field => column.includes(field)) && (!value || value.toString().trim() === '')) {
        return `Row ${rowIndex + 1}: ${columnName} is required but empty`;
    }
    
    // Numeric fields validation
    const numericFields = ['amount', 'price', 'quantity', 'total', 'cost'];
    if (numericFields.some(field => column.includes(field))) {
        if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return `Row ${rowIndex + 1}: ${columnName} must be a valid number, got: ${value}`;
            }
            if (numValue < 0) {
                return `Row ${rowIndex + 1}: ${columnName} cannot be negative, got: ${value}`;
            }
        }
    }
    
    // Date fields validation
    const dateFields = ['date', 'created', 'updated', 'timestamp'];
    if (dateFields.some(field => column.includes(field))) {
        if (value && value.toString().trim() !== '') {
            const dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
                return `Row ${rowIndex + 1}: ${columnName} must be a valid date, got: ${value}`;
            }
        }
    }
    
    // Email validation
    if (column.includes('email')) {
        if (value && value.toString().trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return `Row ${rowIndex + 1}: ${columnName} must be a valid email address, got: ${value}`;
            }
        }
    }
    
    // String length validation
    if (typeof value === 'string' && value.length > 1000) {
        return `Row ${rowIndex + 1}: ${columnName} is too long (max 1000 characters)`;
    }
    
    return null;
}

/**
 * Sanitizes CSV data by cleaning and normalizing values
 * @param {Array} csvData - Array of CSV row objects
 * @returns {Array} - Sanitized CSV data
 */
function sanitizeCSVData(csvData) {
    return csvData.map(row => {
        const sanitizedRow = {};
        
        for (const [key, value] of Object.entries(row)) {
            // Clean key
            const cleanKey = key.trim().replace(/[^a-zA-Z0-9_]/g, '_');
            
            // Clean value
            let cleanValue = value;
            if (typeof value === 'string') {
                cleanValue = value.trim();
                // Remove any potential script tags or dangerous content
                cleanValue = cleanValue.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            }
            
            sanitizedRow[cleanKey] = cleanValue;
        }
        
        return sanitizedRow;
    });
}

module.exports = {
    validateCSVData,
    validateCSVRow,
    validateColumnValue,
    sanitizeCSVData
};
