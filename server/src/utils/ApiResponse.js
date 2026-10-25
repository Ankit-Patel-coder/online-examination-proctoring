// server/src/utils/ApiResponse.js
// Standardises every successful JSON response across all controllers.
// Every success response has the same shape: { success, message, data }
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (200, 201, etc.)
   * @param {*}      data       - The payload to return (object, array, null)
   * @param {string} message    - Human-readable success message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

module.exports = ApiResponse;
