const { logger, generateOrderID } = require("../utils");
const {
  prefix,
  serviceable_pincodes,
  admins,
  serviceable_pincodes_descriptions,
  payment,
} = require("../config/bot.config");

const {
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
} = require("./embed.functions");

const { sendMessage } = require("./axios.functions");

const {
  saveAddress,
  createOrder,
  getUserAddress,
  checkPreviousOrders,
  addAddressToOrder,
  mergeOrders,
  removeExistingCart,
  checkOrderIDexists,
  getOrderDetails,
  checkOrderStatus,
  cancelOrder,
  updateOrderStatus,
  userOrderHistory,
  userLiveOrders,
  checkLanguage,
  setLanguage,
  addPaymentMethod,
  updatePrePayment,
  getProductName,
  confirmOrderStatus,
} = require("./database.functions");
const orderStatus = require("../constants/order_status.constants");
const { createCashfreeOrder } = require("./payments/cashfree.functions");
const slashPrefix = "/";

/*
This is the core starter function for handling incoming messages from the user.
*/
exports.handleRequest = async (message) => {
  try {
    if (!message || !message.user) {
      logger.error(`Invalid user or message`);
      return null;
    }

    switch (message.type) {
      case "text":
        if (message.msg_body.startsWith(prefix)) {
          await handleAdminCommand(message);
        } else if (message.msg_body.startsWith(slashPrefix)) {
          await handleUserSlashCommand(message); //user slash command
        } else {
          await handleUserTextCommand(message); //user text command
        }
        break;
      case "request_welcome":
        await handleRequestWelcome(message); //welcome message triggered when user starts a chat
        break;
      case "order":
        await handleOrder(message);
        break;
      case "interactive":
        await handleInteractiveMessage(message); //button reply or nfm reply
        break;

      default:
        logger.error(`Message type not supported : ${message.type}`);
        break;
    }
  } catch (error) {
    logger.error(`Error handling request: ${error.message}`);
    return null;
  }
};

//HELPER FUNCTIONS
async function handleAdminCommand(message) {
  const args = message.text.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  console.log(command);
  console.log(args);
  // Implement admin command logic
}

async function handleUserSlashCommand(message) {
  const args = message.msg_body.slice(slashPrefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  if (!command) {
    logger.error(`Invalid command : ${command}`);
    return;
  }
  await handleCommand(command, args, message);
}

async function handleUserTextCommand(message) {
  if (message.msg_body.toLowerCase() === "help") {
    logger.info(`User requested help`);
    //   await sendHelp(message);
  } else {
    const isLanguageSelected = await checkLanguage(message.wa_id);
    if (!isLanguageSelected) {
      await sendLanguageSelection(message);
    } else {
      await sendCatalog(message);
    }
  }
}

async function sendCatalog(message) {
  const templatePayload = buildCatalogStruct({
    to: message.wa_id,
    language: message.user.language,
  });

  if (!templatePayload) {
    throw new Error(`Error building template payload`);
  }

  const sendToUser = await sendMessage(templatePayload);

  if (!sendToUser) {
    throw new Error(`Error sending message to user`);
  }
}

async function handleInteractiveMessage(message) {
  if (message.isButton) {
    if (message.buttonType === "button") {
    } else if (message.buttonType === "button_reply") {
      await handleButtonReply(message);
    } else if (message.buttonType === "nfm_reply") {
      await handleNFMReply(message);
    } else {
      logger.error(`button type not supported : ${message.buttonType}`);
      return;
    }
  } else {
    logger.error(`Interactive message not supported`);
    return;
  }
}

async function handleOrder(message) {
  try {
    if (
      !message.order ||
      !message.order.product_items ||
      message.order.product_items.length === 0
    ) {
      logger.error(
        `Message does not have order property or product_items is null or empty`
      );
      return;
    }

    let items = message.order.product_items;

    //product items array as product_retailer_id get product name
    for (let i = 0; i < items.length; i++) {
      const productName = await getProductName(items[i].product_retailer_id);
      if (productName) {
        items[i].product_name = productName;
      }else{
        items[i].product_name = "N/A";
      }
    }

    const totalAmount = items.reduce((acc, item) => {
      return acc + item.item_price * item.quantity;
    }, 0);

    let orderID = generateOrderID();
    const orderExists = await checkOrderIDexists(orderID);

    if (orderExists) {
      orderID = generateOrderID();
    }

    const dbObj = {
      order_id: orderID,
      wa_id: message.wa_id,
      catalog_id: message.order.catalog_id,
      order_status: orderStatus.CART,
      order_amount: totalAmount,
      order_date: new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      }),
      delivery_address: null,
      payment_method: null,
      payment_status: "pending",
      items,
    };

    const order = await createOrder(dbObj);
    if (!order) {
      //TODO: send error message to user
      logger.error(`Error creating order`);
      return;
    }
    //append order_id to message
    message.order_id = order.order_id;
    const isPreviousOrderAvailable = await checkPreviousOrders(message);

    if (!isPreviousOrderAvailable || isPreviousOrderAvailable.length === 0) {
      //ask address proceed to address
      return await proceedToAddress(message);
    } else {
      const previousItems = [];
      const currentItems = [];
      //need to,previousItems,currentItems

      //extact previousItems from isPreviousOrderAvailable format [{item_id,quantity,item_price,order_id}]
      if (isPreviousOrderAvailable && isPreviousOrderAvailable.length > 0) {
        isPreviousOrderAvailable.forEach((order) => {
          if (order.order_items && order.order_items.length > 0) {
            order.order_items.forEach((item) => {
              previousItems.push({
                item_id: item.item_id,
                quantity: item.quantity,
                item_price: item.item_price,
                order_id: item.order_id,
              });
            });
          }
        });
      }

      //extract currentItems from order.order_items format [{item_id,quantity,item_price,order_id}]
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach((item) => {
          currentItems.push({
            item_id: item.item_id,
            quantity: item.quantity,
            item_price: item.item_price,
            order_id: item.order_id,
          });
        });
      }

      const structObj = {
        to: message.wa_id,
        previousItems: previousItems,
        currentItems: currentItems,
        language: message.user.language,
      };

      const payload = buildMergeOrContinueStruct(structObj);

      if (!payload) {
        logger.error(`Error building merge or continue struct`);
        return;
      }

      const sendMergeOrContinue = await sendMessage(payload);

      if (!sendMergeOrContinue) {
        logger.error(`Error sending merge or continue message`);
        return;
      }
    }
  } catch (error) {
    logger.error(`Error handling order: ${error.message}`);
    return null;
  }
}

async function proceedToAddress(message) {
  try {
    let addressObj = {
      to: message.wa_id,
      name: message.name || "",
      language: message.user.language,
    };
    const userAddress = await getUserAddress(message.wa_id);
    if (userAddress && userAddress.length > 0) {
      addressObj.saved_addresses = userAddress;
    }
    const payload = buildAddressStruct(addressObj);

    const sendAddress = await sendMessage(payload);

    if (!sendAddress) {
      logger.error(`Error sending address message`);
      return null;
    }
    return true;
  } catch (error) {
    logger.error(`Error proceeding to address: ${error.message}`);
    return null;
  }
}

//nfm reply - [after user provide address]
async function handleNFMReply(message) {
  try {
    const buttonResponse = message.buttonResponse;

    if (buttonResponse && buttonResponse.response_json && buttonResponse.body) {
      const addressObj = JSON.parse(buttonResponse.response_json);
      const fullAddress = buttonResponse.body;
      const pincode = addressObj.values.in_pin_code;
      const validPincode = await validatePincode(pincode);

      if (!validPincode) {
        await locationNotServiceableMessage(message);
        return;
      }

      if (addressObj && addressObj.saved_address_id) {
        const dbObj = {
          wa_id: message.wa_id,
          delivery_address: fullAddress,
        };

        const updateOrder = await addAddressToOrder(dbObj);

        if (updateOrder) {
          message.to = message.wa_id;
          message.order_id = updateOrder.order_id;

          await checkAvailablePaymentMethod(message);
        } else {
          logger.error(`Error updating address : saved_address_id`);
        }
      } else if (addressObj && addressObj.values) {
        const dbObj = {
          wa_id: message.wa_id,
          name: addressObj.values.name,
          address: addressObj.values.address,
          landmark: addressObj.values.landmark_area,
          flat: addressObj.values.house_number || null,
          floor: addressObj.values.floor_number || null,
          tower: addressObj.values.tower_number || null,
          building: addressObj.values.building_name || null,
          city: addressObj.values.city,
          state: addressObj.values.state,
          pincode: addressObj.values.in_pin_code,
        };

        const savedAddress = await saveAddress(dbObj);

        if (!savedAddress) {
          throw new Error(`Error saving address : new address`);
        }

        const dbObj2 = {
          wa_id: message.wa_id,
          delivery_address: fullAddress,
        };

        const updateOrder = await addAddressToOrder(dbObj2);
        if (updateOrder) {
          message.to = message.wa_id;
          message.order_id = updateOrder.order_id;

          await checkAvailablePaymentMethod(message);
        } else {
          logger.error(`Error updating address`);
        }
      } else {
        throw new Error(`AddressObj not supported`);
      }
    } else {
      throw new Error(`Error parsing button_reply`);
    }
  } catch (error) {
    logger.error(`Error handling button_reply: ${error.message}`);
  }
}

async function sendOrderConfirmationMsg(message) {
  try {

    const confirm = await confirmOrderStatus(message.order_id);
    if (!confirm) {
      throw new Error(`Error confirming order status`);
    }

    const templatePayload = buildOrdeConfirmedStruct(message);

    if (!templatePayload) {
      throw new Error(`Error building order confirmed struct`);
    }

    const sendToUser = await sendMessage(templatePayload);

    if (!sendToUser) {
      throw new Error(`Error sending order confirmed message`);
    }
  } catch (error) {
    logger.error(`Error sending order confirmation message: ${error.message}`);
  }
}

async function mergeCart(message) {
  try {
    const response = message.buttonResponse;
    const id = response.id ? response.id : null;
    const orderIDs = id.split("-").slice(1);
    if (!orderIDs || orderIDs.length === 0) {
      throw new Error(`Error parsing orderIDs`);
    }

    const mergerObj = {
      wa_id: message.wa_id,
      orderIDs,
    };

    const mergeOrder = await mergeOrders(mergerObj);
    if (!mergeOrder) {
      return await actionNotSupported(message);
    }

    const proceedAdd = await proceedToAddress(message);
    if (!proceedAdd) {
      return null;
    }
    return true;
  } catch (error) {
    logger.error(`Error merging cart: ${error.message}`);
    return null;
  }
}

async function continueCart(message) {
  try {
    const response = message.buttonResponse;
    const id = response.id ? response.id : null;
    const orderIDs = id.split("-").slice(1);

    if (!orderIDs || orderIDs.length === 0) {
      throw new Error(`Error parsing orderIDs`);
    }

    const removeObj = {
      wa_id: message.wa_id,
      order_id: orderIDs[0],
    };

    const removeCart = await removeExistingCart(removeObj);

    if (!removeCart) {
      return await actionNotSupported(message);
    }

    const proceedAddress = await proceedToAddress(message);
    if (!proceedAddress) {
      return null;
    }
    return true;
  } catch (error) {
    logger.error(`Error continuing cart: ${error.message}`);
    return null;
  }
}

async function handleButtonReply(message) {
  try {
    const response = message.buttonResponse;

    if (!response || !response.title) {
      throw new Error("Invalid button response format");
    }

    const title = response.title.toLowerCase();

    switch (title) {
      case "merge cart":
      case "ஒன்றிணைக்க":
        await mergeCart(message);
        break;
      case "continue cart":
      case "தொடர":
        await continueCart(message);
        break;
      case "reject":
        await deliverOrRejectOrder(message, orderStatus.CANCELLED, "cancel");
        break;
      case "delivered":
        await deliverOrRejectOrder(message, orderStatus.DELIVERED, "deliver");
        break;
      case "english":
      case "தமிழ்":
        await handleLanguagePreference(message, title);
        break;
      case "ஆன்லைன்":
      case "Online":
      case "சிஓடி":
      case "COD":
        await handlePaymentMethod(message);
        break;
      default:
        logger.info(`Button reply not supported : ${title}`);
        await actionNotSupported(message);
        break;
    }
  } catch (error) {
    logger.error(`Error handling button reply: ${error.message}`);
    return null;
  }
}

async function handleLanguagePreference(message, title) {
  const language = title === "english" ? "en" : "ta";
  await setLanguagePreference(message, language);
  message.user.language = language;
  await sendCatalog(message);
}

//send action not supported message
async function actionNotSupported(message) {
  try {
    const templateObj = {
      to: message.wa_id,
    };
    const templatePayload = actionNotSupportedStruct(templateObj);

    if (!templatePayload) {
      throw new Error(`Error building action not supported struct`);
    }

    const sendToUser = await sendMessage(templatePayload);

    if (!sendToUser) {
      throw new Error(`Error sending action not supported message`);
    }
  } catch (error) {
    logger.error(
      `Error sending action not supported message: ${error.message}`
    );
  }
}

//send serive not available message
async function locationNotServiceableMessage(message) {
  try {
    const templateObj = {
      to: message.wa_id,
      language: message.user.language,
    };
    const templatePayload = locationNotServiceableStruct(templateObj);

    if (!templatePayload) {
      throw new Error(`Error building service not available struct`);
    }

    const sendToUser = await sendMessage(templatePayload);

    if (!sendToUser) {
      throw new Error(`Error sending service not available message`);
    }
  } catch (error) {
    logger.error(
      `Error sending service not available message: ${error.message}`
    );
  }
}

async function validatePincode(pincode) {
  try {
    if (!serviceable_pincodes.includes(pincode)) {
      return false;
    }
    return true;
  } catch (error) {
    logger.error(`Error validating pincode: ${error.message}`);
    return null;
  }
}

//Inform admin about new order
async function informAdmin(message) {
  try {
    const orderDetails = await getOrderDetails(message.order_id);
    if (!orderDetails) {
      throw new Error(`Error fetching order details`);
    }
    //if admins is null or empty return
    if (!admins || admins.length === 0) {
      return;
    }

    //for each admin send message
    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];

      const adminPayload = {
        to: admin,
        from: message.wa_id,
        name: message.name,
        order_id: message.order_id,
        delivery_address: orderDetails.delivery_address,
        total: orderDetails.order_amount,
        products: orderDetails.products,
        payment_method: orderDetails.payment_method,
      };
      const adminStruct = sendNewOrdersToAdmin(adminPayload);

      if (!adminStruct) {
        throw new Error(`Error building admin struct`);
      }

      const sendToAdmin = await sendMessage(adminStruct);

      if (!sendToAdmin) {
        throw new Error(`Error sending message to admin`);
      }
    }

    return true;
  } catch (error) {
    logger.error(`Error informing admin: ${error.message}`);
    return null;
  }
}

async function sendCustomMessage(payload) {
  try {
    if (!payload.to || !payload.body) {
      throw new Error(`Invalid payload`);
    }

    const struct = customTextMessageStruct(payload);

    await sendMessage(struct);
  } catch (error) {
    logger.error(`Error sending custom message: ${error.message}`);
    return null;
  }
}

//Admin Reject or Deliver Order functions
async function deliverOrRejectOrder(message, newStatus, action) {
  try {
    const response = message.buttonResponse;
    const id = response.id ? response.id : null;
    const orderID = id.split("-").slice(1);

    if (!orderID || orderID.length === 0) {
      throw new Error(`Error parsing orderID - ${action}`);
    }

    const order = await checkOrderStatus(orderID[0]);

    if (!order) {
      const customMessage = {
        to: message.wa_id,
        body: `Order not found : ${orderID[0]}`,
      };

      return await sendCustomMessage(customMessage);
    }

    let validStatuses = [];

    switch (action) {
      case "deliver":
        validStatuses = [orderStatus.CONFIRMED];
        break;
      case "cancel":
        validStatuses = [orderStatus.CONFIRMED, orderStatus.PENDING];
        break;
      default:
        throw new Error("Invalid action");
    }

    if (!validStatuses.includes(order.order_status)) {
      const customMessage = {
        to: message.wa_id,
        body: `Order not in valid state for ${action} : ${order.order_status}`,
      };

      return await sendCustomMessage(customMessage);
    }

    const updateObj = {
      order_id: orderID[0],
      order_status: newStatus,
    };

    const isSuccess = await updateOrderStatus(updateObj);

    if (!isSuccess) {
      const customMessage = {
        to: message.wa_id,
        body: `Error ${action}ing order : ${orderID[0]}`,
      };

      return await sendCustomMessage(customMessage);
    }

    const customAdminMessage = {
      to: message.wa_id,
      body: `Order status updated to ${newStatus} : ${orderID[0]}`,
    };

    const customUserMessage = {
      to: order.wa_id,
      body: `Your order has been ${action}ed : ${orderID[0]}`,
    };

    await Promise.all([
      sendCustomMessage(customAdminMessage),
      sendCustomMessage(customUserMessage),
    ]);

    return true;
  } catch (error) {
    logger.error(`Error ${action}ing order: ${error.message}`);
    return null;
  }
}

//Commands related functions
async function handleCommand(command, args, message) {
  try {
    if (!command) {
      logger.error(`Invalid command`);
      return null;
    }

    switch (command) {
      case "help":
        break;
      case "orders":
        await showAllLiveOrders(message);
        break;
      case "history":
        await showOrderHistory(message);
        break;
      case "request_call":
        await requestCallCommand(message);
        break;
      case "feedback":
        break;
      case "serviceable_areas":
        await showServiceableAreas(message);
        break;
      case "language":
        await sendLanguageSelection(message);
        break;
      default:
        logger.error(`Command not supported : ${command}`);
        break;
    }
  } catch (error) {
    logger.error(`Error handling command: ${error.message}`);
    return null;
  }
}

async function showOrderHistory(message) {
  try {
    const orders = await userOrderHistory(message.wa_id);

    if (!orders || orders.length === 0) {
      const customMessage = {
        to: message.wa_id,
        body: `No previous orders found`,
      };

      return await sendCustomMessage(customMessage);
    }

    let chunk = 15;
    for (let i = 0; i < orders.length; i += chunk) {
      const structObj = {
        to: message.wa_id,
        orderHistory: orders.slice(i, i + chunk),
      };
      const payload = orderHistoryStruct(structObj);

      if (!payload) {
        logger.error(`Error building order history struct`);
        return;
      }

      await sendMessage(payload);
    }

    return true;
  } catch (error) {
    logger.error(`Error showing order history: ${error.message}`);
    return null;
  }
}

async function requestCallCommand(message) {
  try {
    const customMessage = {
      to: message.wa_id,
      body: `Call request received, our team will contact you soon\n\nThank you for reaching out to us`,
    };

    await sendCustomMessage(customMessage);

    if (!admins || admins.length === 0) {
      logger.error(`No admins found to send call request`);
      return;
    }

    for (let i = 0; i < admins.length; i++) {
      const customMessage = {
        to: admins[i],
        body: `New call request received 📞:\n\nFrom: ${message.wa_id}\n\nName: ${message.name}`,
      };

      await sendCustomMessage(customMessage);

      if (!sendToAdmin) {
        logger.error(`Error sending message to admin`);
        return;
      }
    }

    return true;
  } catch (error) {
    logger.error(`Error requesting call: ${error.message}`);
    return null;
  }
}

async function showServiceableAreas(message) {
  try {
    if (
      !serviceable_pincodes_descriptions ||
      !Array.isArray(serviceable_pincodes_descriptions)
    ) {
      logger.error(`Serviceable areas not found or invalid in config`);
      return;
    }

    let body = "We are currently serving in the following areas:\n\n";

    serviceable_pincodes_descriptions.forEach((pincode) => {
      const emojiSpace = "\u00A0"; // Unicode non-breaking space
      body += `📍 *${pincode.pincodeName}* (${pincode.pincode})\n`;

      if (pincode.isPincodeCoveredFully) {
        body += `${emojiSpace.repeat(7)}Deliverable to all areas\n\n`;
      } else {
        if (pincode.CoveredAreas && pincode.CoveredAreas.length > 0) {
          body += `${emojiSpace.repeat(7)}Deliverable to:\n`;
          pincode.CoveredAreas.forEach((area) => {
            body += `${emojiSpace.repeat(8)}- ${area}\n`;
          });
        }
      }
    });

    const structObj = {
      to: message.wa_id,
      body: body,
    };

    await sendCustomMessage(structObj);
  } catch (error) {
    logger.error(`Error showing serviceable areas: ${error.message}`);
  }
}

async function showAllLiveOrders(message) {
  try {
    const orders = await userLiveOrders(message.wa_id);

    if (!orders || orders.length === 0) {
      const customMessage = {
        to: message.wa_id,
        body: `No live orders found`,
      };

      return await sendCustomMessage(customMessage);
    }

    //loop and send each order
    for (let i = 0; i < orders.length; i++) {
      const structObj = {
        to: message.wa_id,
        order_id: orders[i].order_id,
        products: orders[i].products,
        delivery_address: orders[i].delivery_address,
        total: orders[i].order_amount,
        created_at: orders[i].created_at,
      };
      const payload = liveOrderStruct(structObj);

      if (!payload) {
        logger.error(`Error building live order struct`);
        return;
      }

      await sendMessage(payload);
    }

    return true;
  } catch (error) {
    logger.error(`Error showing live orders: ${error.message}`);
  }
}

async function sendLanguageSelection(message) {
  try {
    const templatePayload = selectLanguageStruct({
      to: message.wa_id,
    });

    if (!templatePayload) {
      throw new Error(`Error building language selection struct`);
    }

    const sendToUser = await sendMessage(templatePayload);

    if (!sendToUser) {
      throw new Error(`Error sending language selection message`);
    }
  } catch (error) {
    logger.error(`Error sending language selection message: ${error.message}`);
  }
}

async function setLanguagePreference(message, language) {
  try {
    if (!message.wa_id || !language) {
      logger.error(`Invalid wa_id or language`);
      return null;
    }
    await setLanguage(message.wa_id, language);

    await notifyLanguageChanged(message, language);
  } catch (error) {
    logger.error(`Error setting language preference: ${error.message}`);
    return null;
  }
}

async function notifyLanguageChanged(message, language) {
  try {
    const templatePayload = languageChangedNotificationStruct({
      to: message.wa_id,
      language,
    });

    if (!templatePayload) {
      throw new Error(`Error building language selection struct`);
    }

    const sendToUser = await sendMessage(templatePayload);

    if (!sendToUser) {
      throw new Error(`Error sending language selection message`);
    }
  } catch (error) {
    logger.error(`Error sending language selection message: ${error.message}`);
  }
}

async function handleRequestWelcome(message) {
  try {
    if (!message) {
      logger.error(`Invalid message for request welcome`);
      return null;
    }
    const templatePayload = requestWelcomeStruct({
      to: message.wa_id,
    });

    if (!templatePayload) {
      throw new Error(`Error building template payload`);
    }

    const sendToUser = await sendMessage(templatePayload);

    if (!sendToUser) {
      throw new Error(`Error sending message to user`);
    }
  } catch (error) {
    logger.error(`Error handling request welcome: ${error.message}`);
    return null;
  }
}

//PAYMENT FUNCTIONS
async function askPaymentMethod(message) {
  try {
    const templatePayload = buildPaymentMethodStruct({
      to: message.wa_id,
      language: message.user.language,
      order_id: message.order_id,
    });

    if (!templatePayload) {
      throw new Error(`Error building payment method struct`);
    }

    const sendToUser = await sendMessage(templatePayload);

    if (!sendToUser) {
      throw new Error(`Error sending payment method message`);
    }
  } catch (error) {
    logger.error(`Error asking payment method: ${error.message}`);
  }
}

async function checkAvailablePaymentMethod(message) {
  try {
    //check payment.available_methods obj {online:true,cod:true} //if both are true, then ask payment method else proceed to address
    if (!payment || !payment.available_methods) {
      logger.error(`Payment config not found or invalid`);
      return null;
    }
    const availableMethods = payment.available_methods;
    if (availableMethods.online && availableMethods.cod) {
      await askPaymentMethod(message);
    } else {
      await sendOrderConfirmationMsg(message);
      await informAdmin(message);
    }

    return true;
  } catch (error) {
    logger.error(`Error checking available payment method: ${error.message}`);
    return null;
  }
}

async function handlePaymentMethod(message) {
  let orderId = message.buttonResponse.id.split("-")[0];
  let paymentMethod = message.buttonResponse.id.split("-")[1];
  message.order_id = orderId;
  message.to = message.wa_id;
  if (paymentMethod === "cod") {
    await addPaymentMethod(orderId, paymentMethod);
    await sendOrderConfirmationMsg(message);
    await informAdmin(message);
  } else {
    await startOnlinePayment(message);
  }
}

//END OF PAYMENT FUNCTIONS

async function startOnlinePayment(message) {
  try {
    
    const orderDetails = await getOrderDetails(message.order_id);
    if (!orderDetails) {
      logger.error(`Error fetching order details`);
      return null;
    }

    const cashfreeOrderStruct = {
      //remove starting # from order_id
      order_id : message.order_id.slice(1),
      order_amount : orderDetails.order_amount,
      customer_id : message.wa_id,
      customer_name : `farm user ${message.wa_id}`,
      customer_phone : message.wa_id.slice(2),
      order_note : `Payment for order ${message.order_id}`,
      //10 minutes from now iso8601 format
      order_expiry_time: new Date(Date.now() + 20 * 60000).toISOString(),
    }
    const createOrder = await createCashfreeOrder(cashfreeOrderStruct);

    //get payment session id and cf_order_id

    if (!createOrder) {
      logger.error(`Error creating online payment order`);
      return null;
    }

    //save payment session id and cf_order_id to db
    let sessionId = createOrder.payment_session_id;
    let cfOrderId = createOrder.cf_order_id;

    await updatePrePayment(message.order_id, sessionId, cfOrderId);

    let upiStruct = {
      to : message.wa_id,
      order_id : message.order_id.slice(1),
      total_amount : orderDetails.order_amount,
      catalog_id : orderDetails.catalog_id,
      items : orderDetails.products,
    }

    const upiPayload = buildUPIIntentStruct(upiStruct);

    if (!upiPayload) {
      logger.error(`Error building upi intent struct`);
      return null;
    }

    const sendToUser = await sendMessage(upiPayload);

    if (!sendToUser) {
      logger.error(`Error sending upi intent message`);
      return null;
    }

    return true;

  } catch (error) {
    logger.error(`Error starting online payment: ${error.message}`);
    return null;
  }
}
