class ApiResponse extends Error {
  constructor(statusCode, data, message = "Success") {
    super(message); // ✅ sabse pehle super() call karo

    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;

    // Yeh optional hai, but helpful for debugging:
    Error.captureStackTrace(this, this.constructor);
  }
}

export { ApiResponse };
