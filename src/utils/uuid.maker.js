const crypto = require("crypto");

function generateOrderID() {
  const orderID = "#FARM" + crypto.randomInt(10000, 99999);
  return orderID;
}

module.exports = {
  generateOrderID,
};
