const { logger } = require("../../utils");
const { cashFreeOrderStruct } = require("./cashfree.struct");
const { axiosPaymentInstance } = require("../axios.functions");
async function createCashfreeOrder(orderData) {

  try {
    const struct = cashFreeOrderStruct(orderData);

    console.log(struct);
    if (!struct) {
      logger.error(`Error creating CF order: Invalid order data`);
      return null;
    }

    const response = await axiosPaymentInstance.post("/orders", struct);

    if(!response){
      logger.error(`Error creating CF order: No response`);
      return null;
    }

    return response.data;
  } catch (error) {
    logger.error(`Error creating CF order: ${error.message}`);
    return null;
  }
}


module.exports = {
  createCashfreeOrder,
};