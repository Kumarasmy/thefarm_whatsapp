const axios = require("axios");
const { logger } = require("../utils");
const { payment } = require("../config/bot.config");

const {
  phoneNumberID,
  apiVersion,
  accessToken,
} = require("../config/bot.config");

const axiosInstance = axios.create({
  baseURL: `https://graph.facebook.com/${apiVersion}`,
  timeout: 60000, //60 seconds
  headers: { "Content-Type": "application/json" },
});

//create a new axios instance for payment gateway
const axiosPaymentInstance = axios.create({
  baseURL: payment.enable_live_payment
    ? payment.cashfree_config.prod.baseUrl
    : payment.cashfree_config.test.baseUrl,
  timeout: 60000, //60 seconds
  headers: {
    "accept": "application/json",
    "Content-Type": "application/json",
    "x-api-version": "2023-08-01",
    "x-client-id": payment.enable_live_payment
    ? payment.cashfree_config.prod.clientId
    : payment.cashfree_config.test.clientId,
  "x-client-secret": payment.enable_live_payment
    ? payment.cashfree_config.prod.clientSecret
    : payment.cashfree_config.test.clientSecret,
  },
});


async function sendMessage(payload) {
  try {
    const response = await axiosInstance.post(
      `${phoneNumberID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json", // Make sure to set the content type
        },
      }
    );

    if (response.data) {
      return response.data;
    } else {
      logger.error(`Error sending message: Response does not contain data`);
      return null;
    }
  } catch (error) {
    if (error.response) {
      logger.error(
        `Error sending message: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    } else if (error.request) {
      logger.error(`Error sending message: No response received`);
    } else {
      logger.error(`Error sending message: ${error.message}`);
    }

    return null;
  }
}

module.exports = {
  sendMessage,
  axiosInstance,
  axiosPaymentInstance,
};
