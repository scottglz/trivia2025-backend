class RestError extends Error
{
   status: number;
   message: string;

   constructor(responseCode: number, message: string) {
      super();
      this.status = responseCode;
      this.message = message;
   }
}

export default RestError;