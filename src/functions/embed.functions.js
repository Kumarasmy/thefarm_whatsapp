const { logger } = require("../utils");
const { bussinessName } = require("../config/bot.config");

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.templateName
 * @param {object} payload.components
 * @param {string} payload.language
 */

function buildTemplateStruct(payload) {
  try {
    let languageCode = "en";
    if (payload.language) {
      languageCode = payload.language;
    }

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "template",
      template: {
        name: payload.templateName,
        language: {
          code: languageCode,
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
 * @param {string} payload.language
 */

function buildCatalogStruct(payload) {
  try {
    let languageCode = "en";
    if (payload.language) {
      languageCode = payload.language;
    }
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "template",
      template: {
        name: "welcome_catalog", //TODO: change dynamically
        language: {
          code: languageCode,
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
 * @param {string} payload.language
 */

function buildAddressStruct(payload) {
  try {
    let english =
      "We received your cart details. Choose an address you'd like this order delivered to.👇";
    let tamil =
      "உங்கள் ஆர்டர் விவரங்களைப் பெற்றோம். இந்த ஆர்டரை வழங்க விரும்பும் முகவரியைத் தேர்வுசெய்யவும்.👇";

    let bodyText = english;

    if (payload.language === "ta") {
      bodyText = tamil;
    }

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "address_message",
        body: {
          text: bodyText,
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
 * @param {string} payload.language
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

    let english = `You have an existing cart items worth *₹${previousCartTotal}*. Do you want to merge or continue? \n\n\nPrevious cart total: *₹${previousCartTotal}*\nCurrent cart total: *₹${currentCartTotal}*\nMerge cart total: *₹${mergeCartTotal}*`;
    let tamil = `உங்களிடம் ஏற்கனவே உள்ள கார்ட்டில் *₹${previousCartTotal}* மதிப்புக்களம் உள்ளது. நீங்கள் அதை ஒன்றிணைக்க வேண்டுமா அல்லது தொடர வேண்டுமா? \n\n\nமுந்தைய கார்டின் மதிப்பு: *₹${previousCartTotal}*\nதற்போதைய கார்டின் மதிப்பு: *₹${currentCartTotal}*\nஒன்றிணைக்கபட்ட கார்டின் மதிப்பு: *₹${mergeCartTotal}*`;
    let mergeBtnTitleEn = "Merge cart";
    let mergeBtnTitleTa = "ஒன்றிணைக்க";
    let continueBtnTitleEn = "Continue cart";
    let continueBtnTitleTa = "தொடர";
    let bodyText = english;
    let mergeBtnTitle = mergeBtnTitleEn;
    let continueBtnTitle = continueBtnTitleEn;

    if (payload.language === "ta") {
      bodyText = tamil;
      mergeBtnTitle = mergeBtnTitleTa;
      continueBtnTitle = continueBtnTitleTa;
    }

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: bodyText,
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `merge-${previousItemsOrderIds}`,
                title: mergeBtnTitle,
              },
            },
            {
              type: "reply",
              reply: {
                id: `continue-${currentItemsOrderId}`,
                title: continueBtnTitle,
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
  * @param {array} payload.language
  
*/

function buildOrdeConfirmedStruct(payload) {
  try {
    let english = `🛍️ Order confirmed! Your order *${payload.order_id}* has been successfully placed.`;
    let tamil = `🛍️ ஆர்டர் உறுதிசெய்யப்பட்டது! உங்கள் ஆர்டர் *${payload.order_id}* வெற்றிகரமாக முடிந்தது.`;

    let bodyText = english;

    if (payload.user.language === "ta") {
      bodyText = tamil;
    }

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: bodyText,
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

/*
 * @param {string} payload
 * @param {array} payload.to
 * @param {array} payload.language
 * @param {array} payload.order_id
 */
function locationNotServiceableStruct(payload) {
  try {
    let english = `Sorry, we do not deliver to this location. Please choose another location.\n\n\nType *'/serviceable_areas'* to see the list of serviceable areas.`;
    let tamil = `மன்னிக்கவும், இந்த இடத்திற்கு விநியோகம் செய்ய முடியவில்லை. மற்றொரு இடத்தைத் தேர்ந்தெடுக்கவும்.\n\n\nசேவையாகும் பகுதிகளின் பட்டியலைப் பார்க்க *'/serviceable_areas'* என்று தட்டச்சு செய்க.`;

    let bodyText = english;

    if (payload.language === "ta") {
      bodyText = tamil;
    }
    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: bodyText,
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
 * @param {string} payload.payment_method
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
          text: `New order received 🎉\n\nDetails:\n\nName: ${payload.name}\nMobile: ${payload.from}\nOrder ID: ${payload.order_id}\n\nProducts:\n${productsString}\n\nTotal: ₹${payload.total}\n\nAddress:\n\n${payload.delivery_address}\n\nPayment Method: ${payload.payment_method}`,
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

/*
 * @param {object} payload
 * @param {string} payload.to
 */

function selectLanguageStruct(payload) {
  try {
    const text = `Please select your language to continue 👇`;

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: text,
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `language-ta`,
                title: "தமிழ்",
              },
            },
            {
              type: "reply",
              reply: {
                id: `language-en`,
                title: "English",
              },
            },
          ],
        },
      },
    };
    return struct;
  } catch (error) {
    logger.error(
      `Error when building select language struct: ${error.message}`
    );
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.language
 */

function languageChangedNotificationStruct(payload) {
  try {
    let english = `Language changed to English`;
    let tamil = `மொழி மாற்றப்பட்டது`;

    let bodyText = english;

    if (payload.language === "ta") {
      bodyText = tamil;
    }

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "text",
      text: {
        preview_url: false,
        body: bodyText,
      },
    };

    return struct;
  } catch (error) {
    logger.error(
      `Error when building language changed notification struct: ${error.message}`
    );
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 */

function requestWelcomeStruct(payload) {
  try {
    const text = `Hi there! Welcome to the official WhatsApp store of *${bussinessName}*.\n\nPlease select your language to continue 👇`;

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: text,
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `language-ta`,
                title: "தமிழ்",
              },
            },
            {
              type: "reply",
              reply: {
                id: `language-en`,
                title: "English",
              },
            },
          ],
        },
      },
    };
    return struct;
  } catch (error) {
    logger.error(`Error building welcome struct: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.language
 */

function buildPaymentMethodStruct(payload) {
  try {
    const english = `Please select your payment method 👇`;
    const tamil = `உங்கள் கட்டண முறையைத் தேர்வுசெய்க 👇`;

    const onlineBtnTitleEn = "Online";
    const onlineBtnTitleTa = "ஆன்லைன்";
    const podBtnTitleEn = "COD";
    const podBtnTitleTa = "சிஓடி";

    let text = english;

    let onlineBtnTitle = onlineBtnTitleEn;
    let podBtnTitle = podBtnTitleEn;

    if (payload.language === "ta") {
      text = tamil;
      onlineBtnTitle = onlineBtnTitleTa;
      podBtnTitle = podBtnTitleTa;
    }

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: text,
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `${payload.order_id}-online`,
                title: onlineBtnTitle,
              },
            },
            {
              type: "reply",
              reply: {
                id: `${payload.order_id}-cod`,
                title: podBtnTitle,
              },
            },
          ],
        },
      },
    };
    return struct;
  } catch (error) {
    logger.error(`Error building payment method struct: ${error.message}`);
    return null;
  }
}

/*
Name : UPI intent struct
Description : This struct format is used to send UPI payemnt intent to the user

@param {object} payload
@param {string} payload.to
@param {string} payload.order_id
@param {string} payload.total_amount
@param {string} payload.catalog_id
@param {string} payload.items //array of objects [{product_retailer_id,product_name,item_price,quantity}]


*/

function buildUPIIntentStruct(payload) {
  try {
    let offset = 100;

    let items = payload.items.map((item) => {
      return {
        retailer_id: item.product_retailer_id,
        name: item.product_name,
        amount: {
          value: parseFloat(item.item_price) * offset,
          offset: offset,
        },
        quantity: item.quantity,
      };
    });

    const struct = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: payload.to,
      type: "interactive",
      interactive: {
        type: "order_details",
        body: {
          text: `You are about to pay *₹${payload.total_amount}* for your order *${payload.order_id}*.`, 
        },
        footer: {
          text: "the farm payments",
        },
        action: {
          name: "review_and_pay",
          parameters: {
            reference_id: payload.order_id,
            type: "physical-goods",
            payment_configuration: "cashfree_test",
            payment_type: "upi",
            currency: "INR",
            //Positive integer representing the amount value multiplied by offset
            total_amount: {
              value: parseFloat(payload.total_amount) * offset,
              offset: offset,
            },
            order: {
              status: "pending",
              //   "type":"quick_pay",
              catalog_id: "730957122326676",
              // expiration: {
              //   timestamp: "1709397974",
              //   description: "time expired",
              // },
              items: items,

              subtotal: {
                value: parseFloat(payload.total_amount) * offset,
                offset: offset,
              },
              tax: {
                value: 0,
                offset: 100,
                description: "no tax applicable",
              },
            },
          },
        },
      },
    };
    return struct;
  } catch (error) {
    logger.error(`Error building UPI intent struct: ${error.message}`);
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
  selectLanguageStruct,
  languageChangedNotificationStruct,
  requestWelcomeStruct,
  buildPaymentMethodStruct,
  buildUPIIntentStruct,
};
