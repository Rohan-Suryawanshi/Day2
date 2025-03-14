class ApiResponse{
  constructor(data, statusCode = 200, message = "Success") {
    this.data = data;
    this.statusCode = statusCode;
    this.message = message;
    this.success=statusCode<400;
  }
}