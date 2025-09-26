/**
 * CSV Parser Service
 * Handles CSV parsing operations - Single Responsibility Principle
 */
const csv = require('csv-parser');
const { Readable } = require('stream');

class CsvParserService {
  /**
   * Parse CSV buffer into array of objects
   * @param {Buffer} csvBuffer - CSV file buffer
   * @returns {Promise<Array>} Array of parsed CSV rows
   */
  async parseCSV(csvBuffer) {
    try {
      return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(csvBuffer.toString());

        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (error) => reject(error));
      });
    } catch (error) {
      console.error('CSV parsing failed:', error);
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }

  /**
   * Clean and normalize CSV row data
   * @param {Object} row - Raw CSV row
   * @returns {Object} Cleaned row data
   */
  cleanCSVRow(row) {
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = String(key).trim();
      const cleanValue = typeof value === 'string' ? value.trim() : value;
      cleaned[cleanKey] = cleanValue;
    }
    return cleaned;
  }
}

module.exports = CsvParserService;
