const { logger, generateOrderID } = require("../utils");
const {
  prefix,
  serviceable_pincodes,
  admins,
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
} = require("./database.functions");
const orderStatus = require("../constants/order_status.constants");
const slashPrefix = "/";

exports.handleRequest = async (user, message) => {
  try {
    if (!user || !message) {
      logger.error(`Invalid user or message`);
      return null;
    }

    switch (message.type) {
      case "text":
        if (message.msg_body.startsWith(prefix)) {
          await handleAdminCommand(message);
        } else if (message.msg_body.startsWith(slashPrefix)) {
          await handleUserSlashCommand(message);
        } else {
          await handleUserTextCommand(message);
        }

        break;
      case "request_welcome":
        await sendCatalog(message);
        break;

      case "order":
        await handleOrder(message);
        break;
      case "interactive":
        await handleInteractiveMessage(message);
        break;

      default:
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
  const args = message.text.slice(slashPrefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  console.log(command);
  console.log(args);
  // Implement user slash command logic
}

async function handleUserTextCommand(message) {
  if (message.msg_body.toLowerCase() === "help") {
    logger.info(`User requested help`);
    //   await sendHelp(message);
  } else {
    await sendCatalog(message);
  }
}

async function sendCatalog(message) {
  const templatePayload = buildCatalogStruct({
    to: message.wa_id,
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
      logger.error(`button type not supported`);
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

    const items = message.order.product_items;

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
      payment_method: "pod",
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

//nfm reply
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
          await sendOrderConfirmationMsg(message);
          await informAdmin(message);
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
          await sendOrderConfirmationMsg(message);
          await informAdmin(message);
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

//
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

    if (response && response.title) {
      if (response.title.toLowerCase() === "merge cart") {
        await mergeCart(message); //merges cart and sends address message
        return;
      } else if (response.title.toLowerCase() === "continue cart") {
        await continueCart(message); //removes previous cart and sends address message
      } else if (response.title.toLowerCase() === "reject") {
        await rejectOrCancelOrder(message);
        return;
      } else if (response.title.toLowerCase() === "delivered") {
        await updateDeliveredOrder(message);
        return;
      } else {
        logger.error(`Button title not supported`);
        return null;
      }
    }
  } catch (error) {
    logger.error(`Error handling button reply: ${error.message}`);
    return null;
  }
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

async function rejectOrCancelOrder(message) {
  try {
    const response = message.buttonResponse;
    const id = response.id ? response.id : null;
    const orderID = id.split("-").slice(1);
    const prefix = id.split("-").slice(0, 1);
    if (!orderID || orderID.length === 0) {
      throw new Error(`Error parsing orderID - reject or cancel`);
    }

    const order = await checkOrderStatus(orderID[0]);

    if (!order) {
      const customMessage = {
        to: message.wa_id,
        body: `Order not found : ${orderID[0]}`,
      };

      return await sendCustomMessage(customMessage);
    }

    //only CONFIRMED,PENDING orders can be cancelled
    if (
      order.order_status !== orderStatus.CONFIRMED &&
      order.order_status !== orderStatus.PENDING
    ) {
      const customMessage = {
        to: message.wa_id,
        body: `Order not in valid state for cancellation : ${order.order_status}`,
      };

      return await sendCustomMessage(customMessage);
    }

    const cancelReason =
      prefix === "reject" ? "Admin rejected" : "User cancelled";

    const cancelObj = {
      order_id: orderID[0],
      cancel_reason: cancelReason,
      cancelled_by: message.wa_id,
    };

    const isCancelled = await cancelOrder(cancelObj);

    if (!isCancelled) {
      const customMessage = {
        to: message.wa_id,
        body: `Error cancelling order : ${orderID[0]}`,
      };

      return await sendCustomMessage(customMessage);
    }

    const customMessage = {
      to: message.wa_id,
      body: `Order cancelled : ${orderID[0]}`,
    };

    return await sendCustomMessage(customMessage);
  } catch (error) {
    logger.error(`Error cancelling order: ${error.message}`);
    return null;
  }
}

async function updateDeliveredOrder(message) {
  try {
    const response = message.buttonResponse;
    const id = response.id ? response.id : null;
    const orderID = id.split("-").slice(1);
    if (!orderID || orderID.length === 0) {
      throw new Error(`Error parsing orderID - delivered`);
    }

    const order = await checkOrderStatus(orderID[0]);

    if (!order) {
      const customMessage = {
        to: message.wa_id,
        body: `Order not found : ${orderID[0]}`,
      };

      return await sendCustomMessage(customMessage);
    }

    //only CONFIRMED orders can be delivered
    if (order.order_status !== orderStatus.CONFIRMED) {
      const customMessage = {
        to: message.wa_id,
        body: `Order not in valid state for delivery : ${order.order_status}`,
      };

      return await sendCustomMessage(customMessage);
    }

    const deliveredObj = {
      order_id: orderID[0],
      order_status: orderStatus.DELIVERED,
    };

    const isDelivered = await updateOrderStatus(deliveredObj);

    if (!isDelivered) {
      const customMessage = {
        to: message.wa_id,
        body: `Error delivering order : ${orderID[0]}`,
      };

      return await sendCustomMessage(customMessage);
    }

    const customMessage = {
      to: message.wa_id,
      body: `Order delivered : ${orderID[0]}`,
    };

    return await sendCustomMessage(customMessage);
  } catch (error) {
    logger.error(`Error delivering order: ${error.message}`);
    return null;
  }
}
