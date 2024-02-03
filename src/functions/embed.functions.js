const { logger } = require("../utils");

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.templateName
 * @param {object} payload.components
 */

function buildTemplateStruct(payload) {
  try {
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "template",
      template: {
        name: payload.templateName,
        language: {
          code: "en",
        },
      },
      components: payload.components,
    };
    return struct;
  } catch (error) {
    logger.error(`Error building template struct: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 */

function buildCatalogStruct(payload) {
  try {
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "template",
      template: {
        name: "display_catalog_wo_variables", //TODO: change dynamically
        language: {
          code: "en",
        },

        components: [
          {
            type: "button",
            sub_type: "catalog",
            index: 0,
          },
        ],
      },
    };
    return struct;
  } catch (error) {
    logger.error(`Error building catalog struct: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {array} payload.saved_address
 * @param {string} payload.name
 */

function buildAddressStruct(payload) {
  try {
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "address_message",
        body: {
          text: "We received your cart details. Choose an address you'd like this order delivered to.",
        },
        action: {
          name: "address_message",
          parameters: {
            country: "IN",
            values: {
              name: payload.name,
              phone_number: payload.to,
              city: "Chennai",
              state: "Tamil Nadu",
            },
            saved_addresses: payload.saved_addresses || [],
            // validation_errors: {
            //   in_pin_code: "Please enter a valid pincode",
            // },
          },
        },
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error building address struct: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {array} payload.previousItems
 * @param {array} payload.currentItems
 * @param {string} payload.previousItems[0].order_id
 */

function buildMergeOrContinueStruct(payload) {
  try {
    const previousItems = payload.previousItems; //array of objects [{item_id,quantity,item_price,order_id}]
    const currentItems = payload.currentItems; //array of objects [{item_id,quantity,item_price,order_id}]

    //calculate previous cart total, current cart total, merge cart total
    let previousCartTotal = 0;
    let currentCartTotal = 0;
    let mergeCartTotal = 0;

    let previousItemsOrderIds = "";
    let currentItemsOrderId = "";

    if (currentItems && currentItems.length > 0) {
      currentItemsOrderId = currentItems[0].order_id;
    }

    if (previousItems && previousItems.length > 0) {
      // ID1-ID2-ID3 format remove duplicates order ids and remove last -
      let uniqueOrderIds = [
        ...new Set(previousItems.map((item) => item.order_id)),
      ];

      previousItemsOrderIds = uniqueOrderIds.join("-");
    }

    if (previousItems && previousItems.length > 0) {
      previousCartTotal = previousItems.reduce((acc, item) => {
        return (
          parseFloat(acc) +
          parseFloat(item.quantity) * parseFloat(item.item_price)
        );
      }, 0);
    }

    if (currentItems && currentItems.length > 0) {
      currentCartTotal = currentItems.reduce((acc, item) => {
        return (
          parseFloat(acc) +
          parseFloat(item.quantity) * parseFloat(item.item_price)
        );
      }, 0);
    }

    mergeCartTotal = previousCartTotal + currentCartTotal;

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: `You have an existing cart items worth ₹${previousCartTotal}. Do you want to merge or continue? \n\n\nPrevious cart total: ₹${previousCartTotal}\nCurrent cart total: ₹${currentCartTotal}\nMerge cart total: ₹${mergeCartTotal}`,
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `merge-${previousItemsOrderIds}`,
                title: "Merge cart",
              },
            },
            {
              type: "reply",
              reply: {
                id: `continue-${currentItemsOrderId}`,
                title: "Continue cart",
              },
            },
          ],
        },
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error building merge or continue struct: ${error.message}`);
    return null;
  }
}

/*
  * @param {string} payload
  * @param {array} payload.to
  * @param {array} payload.order_id
  
*/

function buildOrdeConfirmedStruct(payload) {
  try {
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: `🛍️ Order confirmed! Your order *${payload.order_id}* has been successfully placed.`,
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error building order confirmed struct: ${error.message}`);
    return null;
  }
}

/*
  * @param {string} payload
  * @param {array} payload.to
  * @param {array} payload.order_id
  
*/

function actionNotSupportedStruct(payload) {
  try {
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: `This action is not supported.`,
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error when action not supported: ${error.message}`);
    return null;
  }
}

function locationNotServiceableStruct(payload) {
  try {
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: `Sorry, we do not deliver to this location. Please choose another location.\n\n\nType *'/serviceable_areas'* to see the list of serviceable areas.`,
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error when location not serviceable: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.name
 * @param {string} payload.from
 * @param {string} payload.order_id
 * @param {array} payload.products
 * @param {string} payload.delivery_address
 * @param {number} payload.total
 */

function sendNewOrdersToAdmin(payload) {
  try {
    let productsString = payload.products.map((product) => {
      return `${product.name} x ${product.quantity} - ₹${product.item_price}`;
    });
    productsString = productsString.join("\n");

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: `New order received 🎉\n\nDetails:\n\nName: ${payload.name}\nMobile: ${payload.from}\nOrder ID: ${payload.order_id}\n\nProducts:\n${productsString}\n\nTotal: ₹${payload.total}\n\nAddress:\n\n${payload.delivery_address}`,
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `delivered-${payload.order_id}`,
                title: "Delivered",
              },
            },
            {
              type: "reply",
              reply: {
                id: `reject-${payload.order_id}`,
                title: "Reject",
              },
            },
          ],
        },
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error when building new orders struct: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.body
 */

function customTextMessageStruct(payload) {
  try {
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: payload.body,
      },
    };

    return struct;
  } catch (error) {
    logger.error(
      `Error when building custom text message struct: ${error.message}`
    );
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {array} payload.orderHistory [array of obj with order_id,created_at,order_amount,order_status,delivery_address,products(name,quantity,item_price)]
 */

function orderHistoryStruct(payload) {
  try {
    const orderDetails = payload.orderHistory.map((order) => {
      const productsList = order.products
        .map(
          (product) =>
            `${product.name} x ${product.quantity} - ₹${product.item_price}`
        )
        .join("\n");

      return `Order ID: ${order.order_id}\nDate: ${order.created_at}\nAmount: ₹${order.order_amount}\nStatus: ${order.order_status}\nProducts:\n${productsList}\n\n`;
    });

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: `📦 Your order history:\n\n${orderDetails.join("")}`,
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error when building order history struct: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.order_id
 * @param {array} payload.products
 */

function liveOrderStruct(payload) {
  try {
    const productsString = payload.products
      .map((product) => {
        return `${product.name} x ${product.quantity} - ₹${product.item_price}`;
      })
      .join("\n");

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: `Order ID: ${payload.order_id}    (${payload.created_at})\n\nProducts:\n${productsString}\n\nTotal: ₹${payload.total}\n\nAddress:\n\n${payload.delivery_address}`,
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `cancel-${payload.order_id}`,
                title: "Cancel",
              },
            },
          ],
        },
      },
    };

    return struct;
  } catch (error) {
    logger.error(`Error when building live orders struct: ${error.message}`);
    return null;
  }
}

module.exports = {
  buildTemplateStruct,
  buildCatalogStruct,
  buildAddressStruct,
  buildMergeOrContinueStruct,
  buildOrdeConfirmedStruct,
  actionNotSupportedStruct,
  locationNotServiceableStruct,
  sendNewOrdersToAdmin,
  customTextMessageStruct,
  orderHistoryStruct,
  liveOrderStruct,
};
