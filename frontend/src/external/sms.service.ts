export const sendSms = async (number: string, message: string) => {
  // integrate with external SMS gateway
  console.log(`SMS to ${number}: ${message}`);
};
