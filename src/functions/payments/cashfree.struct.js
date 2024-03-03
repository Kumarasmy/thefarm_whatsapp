const { logger } = require("../../utils");

/*
@params: payload
@params: payload.order_id
@params: payload.order_amount
@params: payload.order_currency (default: INR)
@params: payload.customer_id
@params: payload.customer_name
@params: payload.customer_email || null
@params: payload.customer_phone
@params: payload.customer_name
@params: payload.notify_url
@params: payload.order_note
@params: payload.return_url || null
@params: payload.order_expiry_time
 */

function cashFreeOrderStruct(payload) {
  try {
    const {
      order_id,
      order_amount,
      order_currency = "INR",
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      notify_url,
      order_note,
      return_url,
      order_expiry_time,
    } = payload;

    const struct = {
      order_id: order_id,
      order_amount: order_amount,
      order_currency: order_currency,
      order_expiry_time: order_expiry_time,
      order_note: order_note,
      customer_details: {
        customer_id: customer_id,
        customer_name: customer_name,
        // customer_email: customer_email,
        customer_phone: customer_phone,
      },
      // order_meta: {
      //   notify_url: notify_url,
      //   return_url: return_url,
      // },
    };
    //return json 
    return JSON.stringify(struct);
  } catch (error) {
    logger.error(`Error creating order struct: ${error.message}`);
    return null;
  }
}


module.exports = {
  cashFreeOrderStruct,
};