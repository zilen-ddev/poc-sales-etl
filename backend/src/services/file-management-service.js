/**
 * File Management Service
 * Handles file operations and path management - Single Responsibility Principle
 */
class FileManagementService {
  /**
   * Generate processed file path
   * @param {string} sourceKey - Original file key
   * @returns {string} Processed file key
   */
  getProcessedFilePath(sourceKey) {
    return sourceKey.replace('incoming/', 'processed/');
  }

  /**
   * Generate failed file path
   * @param {string} sourceKey - Original file key
   * @returns {string} Failed file key
   */
  getFailedFilePath(sourceKey) {
    return sourceKey.replace('incoming/', 'failed/');
  }

  /**
   * Decode S3 object key
   * @param {string} key - Encoded S3 key
   * @returns {string} Decoded key
   */
  decodeS3Key(key) {
    return decodeURIComponent(key.replace(/\+/g, ' '));
  }

  /**
   * Validate file extension
   * @param {string} filename - File name
   * @param {string} expectedExtension - Expected file extension
   * @returns {boolean} True if valid extension
   */
  isValidFileExtension(filename, expectedExtension = '.csv') {
    return filename.toLowerCase().endsWith(expectedExtension.toLowerCase());
  }

  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }
}

module.exports = FileManagementService;
