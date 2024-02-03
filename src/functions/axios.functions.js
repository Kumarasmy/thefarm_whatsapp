const axios = require("axios");
const { logger } = require("../utils");

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
};
