/**
 * Sales Record Model
 * Represents a sales record with validation capabilities
 */
class SalesRecord {
  /**
   * Creates a new SalesRecord instance
   * @param {Object} data - Sales record data
   * @param {string} data.saleId - Sale ID
   * @param {string} data.productId - Product ID
   * @param {number} data.quantity - Quantity sold
   * @param {number} data.amount - Sale amount
   * @param {string} data.saleDate - Sale date
   * @param {string} data.sourceFile - Source file name
   * @param {number} data.rowIndex - Row index in source file
   * @param {string} data.enqueuedAt - Enqueued timestamp
   */
  constructor(data) {
    this.saleId = data.saleId;
    this.productId = data.productId;
    this.quantity = data.quantity;
    this.amount = data.amount;
    this.saleDate = data.saleDate;
    this.sourceFile = data.sourceFile;
    this.rowIndex = data.rowIndex;
    this.enqueuedAt = data.enqueuedAt;
  }

  /**
   * Validates the sales record data
   * @returns {Array<string>} Array of validation error messages
   */
  validate() {
    const errors = [];

    if (!this.saleId || String(this.saleId).trim() === '') {
      errors.push('saleId is required');
    }
    if (!this.productId || String(this.productId).trim() === '') {
      errors.push('productId is required');
    }

    const qty = Number(this.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
      errors.push(`quantity must be a positive integer, got: ${this.quantity}`);
    }

    const amt = Number(this.amount);
    if (!Number.isFinite(amt) || amt < 0) {
      errors.push(`amount must be a non-negative number, got: ${this.amount}`);
    }

    if (this.saleDate) {
      const d = new Date(this.saleDate);
      if (Number.isNaN(d.getTime())) {
        errors.push(`saleDate must be a valid date, got: ${this.saleDate}`);
      }
    } else {
      errors.push('saleDate is required');
    }

    return errors;
  }

  /**
   * Converts the sales record to JSON object
   * @returns {Object} JSON representation of the sales record
   */
  toJSON() {
    return {
      saleId: this.saleId,
      productId: this.productId,
      quantity: this.quantity,
      amount: this.amount,
      saleDate: this.saleDate,
      sourceFile: this.sourceFile,
      rowIndex: this.rowIndex,
      enqueuedAt: this.enqueuedAt
    };
  }
}

module.exports = SalesRecord;
