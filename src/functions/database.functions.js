const order_statusConstants = require("../constants/order_status.constants");
const {
  users,
  orders,
  users_addresses,
  order_items,
  sequelize,
  calatog_products,
} = require("../models");

const { logger, manipulateDate } = require("../utils");
const { Op } = require("sequelize");

async function checkUser(payload) {
  try {
    const user = await users.findByPk(payload.wa_id, {
      attributes: ["wa_id", "name", "is_admin", "is_active", "language"],
      raw: true,
    });
    if (user) {
      return user;
    } else {
      const newUser = await users.create(payload);
      return newUser.get({ plain: true });
    }
  } catch (error) {
    logger.error(`Error checking user: ${error.message}`);
    return null;
  }
}

async function createOrder(payload) {
  const transaction = await sequelize.transaction();
  try {
    const order = await orders.create(payload, { transaction });
    const order_id = order.get({ plain: true }).order_id;
    const items = payload.items;
    const orderItems = items.map((item) => {
      return {
        ...item,
        order_id,
      };
    });

    await order_items.bulkCreate(orderItems, { transaction });

    await transaction.commit();

    //return order and order items
    const response = {
      order_id,
      order_items: orderItems,
    };

    return response;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error creating order: ${error.message}`);
    return null;
  }
}

async function getUserAddress(wa_id) {
  try {
    const addresses = await users_addresses.findAll({
      where: {
        wa_id,
      },
      attributes: {
        exclude: ["createdAt", "updatedAt"],
      },
      raw: true,
    });

    if (!addresses || addresses.length === 0) {
      return [];
    }

    const parsedAddresses = addresses.map((address) => {
      return {
        id: address.address_id,
        value: {
          name: address.name,
          phone_number: address.wa_id,
          in_pin_code: address.pincode,
          floor_number: address.floor,
          building_name: address.building,
          address: address.address,
          landmark_area: address.landmark,
          city: "chennai",
          state: "tamilnadu",
        },
      };
    });

    return parsedAddresses;
  } catch (error) {
    logger.error(`Error getting user address: ${error.message}`);
    return [];
  }
}

async function saveAddress(payload) {
  try {
    const address = await users_addresses.create(payload);
    return address.get({ plain: true });
  } catch (error) {
    logger.error(`Error saving address: ${error.message}`);
    return null;
  }
}

async function addAddressToOrder(payload) {
  const transaction = await sequelize.transaction();
  try {
    let lastOrder = await orders.findAll({
      where: {
        wa_id: payload.wa_id,
        delivery_address: null,
        order_status: order_statusConstants.CART,
      },
      order: [["createdAt", "DESC"]],
      attributes: ["order_id"],
      raw: true,
      transaction,
    });

    if (!lastOrder || lastOrder.length === 0) {
      logger.error(`No last order found`);
      await transaction.rollback();
      return null;
    }

    //if more than one cart found, return error
    if (lastOrder.length > 1) {
      logger.error(`More than one cart found`);
      await transaction.rollback();
      return null;
    }

    lastOrder = lastOrder[0];

    const order_id = lastOrder.order_id;
    await orders.update(
      {
        delivery_address: payload.delivery_address
      },
      {
        where: {
          order_id,
        },
        transaction,
      }
    );

    await transaction.commit();
    return lastOrder;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error adding address to order : ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.wa_id
 * @param {string} payload.order_id
 */

async function checkPreviousOrders(payload) {
  try {
    const ordersList = await orders.findAll({
      where: {
        wa_id: payload.wa_id,
        order_status: "cart",
        order_id: {
          [Op.ne]: payload.order_id,
        },
      },
      attributes: ["order_id", "order_status"],
      include: [
        {
          model: order_items,
          as: "order_items",
          attributes: [
            "item_id",
            "product_retailer_id",
            "quantity",
            "item_price",
            "order_id",
          ],
        },
      ],
    });

    if (!ordersList || ordersList.length === 0) {
      return null;
    }

    return ordersList;
  } catch (error) {
    logger.error(`Error checking previous orders : ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.orderIDs
 * @param {string} payload.wa_id
 */

async function mergeOrders(payload) {
  const transaction = await sequelize.transaction();

  try {
    const orderIDs = payload.orderIDs;
    const wa_id = payload.wa_id;

    const lastOrder = await orders.findAll({
      where: {
        wa_id,
        delivery_address: null,
        order_status: order_statusConstants.CART,
        order_id: {
          [Op.notIn]: orderIDs,
        },
      },
      order: [["createdAt", "DESC"]],
      attributes: ["order_id"],
      limit: 1,
      raw: true,
      transaction,
    });

    const lastOrderID = lastOrder[0]?.order_id;

    if (!lastOrderID) {
      logger.error(`No last order found`);
      await transaction.rollback();
      return null;
    }

    const orderItems = await order_items.findAll({
      where: {
        order_id: {
          [Op.in]: orderIDs,
        },
      },
      attributes: [
        "item_id",
        "product_retailer_id",
        "quantity",
        "item_price",
        "order_id",
        "product_name"
      ],
      raw: true,
      transaction,
    });

    if (!orderItems || orderItems.length === 0) {
      logger.error(`No order items found`);
      await transaction.rollback();
      return null;
    }

    const orderItemsPayload = orderItems.map((item) => ({
      product_retailer_id: item.product_retailer_id,
      quantity: item.quantity,
      item_price: item.item_price,
      currency: "INR",
      order_id: lastOrderID,
      product_name: item.product_name
    }));

    await order_items.bulkCreate(orderItemsPayload, { transaction });

    const orderAmount = orderItems.reduce((acc, item) => {
      return acc + parseFloat(item.item_price) * parseInt(item.quantity);
    }, 0);

    await orders.update(
      {
        order_amount: sequelize.literal(`order_amount + ${orderAmount}`),
      },
      {
        where: {
          order_id: lastOrderID,
          wa_id,
        },
        transaction,
      }
    );

    await orders.destroy({
      where: {
        order_id: {
          [Op.in]: orderIDs,
        },
        wa_id,
      },
      transaction,
    });

    await order_items.destroy({
      where: {
        order_id: {
          [Op.in]: orderIDs,
        },
      },
      transaction,
    });
    await transaction.commit();
    return lastOrderID;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error merging orders: ${error.message}`);
    throw error;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.wa_id
 * @param {string} payload.order_id
 */

async function removeExistingCart(payload) {
  try {
    //check order_id is existing in order table and other carts are there for the same user
    const order = await orders.findByPk(payload.order_id, {
      attributes: ["order_id"],
      raw: true,
    });

    if (!order) {
      return null;
    }

    //check is ther any other cart for the same user
    const existingCart = await orders.findAll({
      where: {
        wa_id: payload.wa_id,
        order_status: order_statusConstants.CART,
        order_id: {
          [Op.ne]: payload.order_id,
        },
      },
      attributes: ["order_id"],
      raw: true,
    });

    if (!existingCart || existingCart.length === 0) {
      return null;
    }

    const orderIds = existingCart.map((item) => item.order_id);

    await orders.destroy({
      where: {
        order_id: {
          [Op.in]: orderIds,
        },
      },
    });

    await order_items.destroy({
      where: {
        order_id: {
          [Op.in]: orderIds,
        },
      },
    });

    return true;
  } catch (error) {
    logger.error(`Error removing existing cart: ${error.message}`);
    return null;
  }
}

async function checkOrderIDexists(order_id) {
  try {
    const order = await orders.findByPk(order_id, {
      attributes: ["order_id"],
      raw: true,
    });
    if (order) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    logger.error(`Error checking order id: ${error.message}`);
    return null;
  }
}

async function getProductName(product_retailer_id) {
  try {
    const product = await calatog_products.findOne({
      where: {
        retailer_id: product_retailer_id,
      },
      attributes: ["name"],
      raw: true,
    });

    if (!product) {
      return null;
    }

    return product.name;
  } catch (error) {
    logger.error(`Error getting product name: ${error.message}`);
    return null;
  }
}

async function getOrderDetails(order_id) {
  try {
    let order = await orders.findByPk(order_id, {
      attributes: [
        "order_id",
        "order_amount",
        "delivery_address",
        "catalog_id",
        "payment_method",
      ],
      include: [
        {
          model: order_items,
          as: "order_items",
          attributes: ["product_retailer_id", "quantity", "item_price","product_name"],
        },
      ],
    });

    if (!order) {
      logger.error(`No order found`);
      return null;
    }
    const orderItems = order.order_items;

    let products = [];

    for (let i = 0; i < orderItems.length; i++) {
      let product = orderItems[i];
      products.push({
        product_retailer_id: product.product_retailer_id,
        name : product.product_name || "N/A",
        product_name: product.product_name || "N/A",
        quantity: product.quantity,
        item_price: product.item_price,
      });
    }

    order = {
      order_id: order.order_id,
      order_amount: order.order_amount,
      delivery_address: order.delivery_address,
      products,
      payment_method: order.payment_method,
    };

    return order;
  } catch (error) {
    logger.error(`Error getting order details: ${error.message}`);
    return null;
  }
}

async function checkOrderStatus(order_id) {
  try {
    const order = await orders.findByPk(order_id, {
      attributes: ["order_status", "wa_id"],
      raw: true,
    });

    if (!order) {
      return null;
    }

    return {
      order_status: order.order_status,
      wa_id: order.wa_id,
    };
  } catch (error) {
    logger.error(`Error checking order status: ${error.message}`);
    return null;
  }
}

/*
 * @param {object} payload
 * @param {string} payload.order_id
 * @param {string} payload.cancel_reason
 * @param {string} payload.cancelled_by
 */

async function cancelOrder(payload) {
  const transaction = await sequelize.transaction();
  try {
    const order = await orders.findByPk(payload.order_id, {
      attributes: ["order_id", "order_status"],
      raw: true,
      transaction,
    });

    if (!order) {
      logger.error(`No order found`);
      await transaction.rollback();
      return null;
    }

    if (
      order.order_status === order_statusConstants.CANCELLED ||
      order.order_status === order_statusConstants.REJECTED
    ) {
      logger.error(`Order already cancelled or rejected`);
      await transaction.rollback();
      return null;
    }

    await orders.update(
      {
        order_status: order_statusConstants.CANCELLED,
        cancel_reason: `${payload.cancel_reason} by ${payload.cancelled_by}`,
      },
      {
        where: {
          order_id: payload.order_id,
        },
        transaction,
      }
    );

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error cancelling order: ${error.message}`);
    return null;
  }
}

async function updateOrderStatus(payload) {
  const transaction = await sequelize.transaction();
  try {
    const updateOrder = await orders.update(
      {
        order_status: payload.order_status,
      },
      {
        where: {
          order_id: payload.order_id,
        },
        transaction,
      }
    );

    if (!updateOrder || updateOrder[0] === 0) {
      logger.error(`No order found`);
      await transaction.rollback();
      return null;
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error updating order status: ${error.message}`);
    return null;
  }
}

async function userOrderHistory(wa_id) {
  try {
    const ordersList = await orders.findAll({
      where: {
        wa_id,
      },
      attributes: ["order_id", "order_status", "order_amount", "createdAt"],
      include: [
        {
          required: false,
          model: order_items,
          as: "order_items",
          attributes: ["product_retailer_id", "quantity", "item_price"],
          include: [
            {
              required: false,
              model: calatog_products,
              as: "product",
              attributes: ["name"],
            },
          ],
        },
      ],
    });

    if (!ordersList || ordersList.length === 0) {
      return null;
    }

    let result = [];

    for (let i = 0; i < ordersList.length; i++) {
      let products = [];
      for (let j = 0; j < ordersList[i].order_items.length; j++) {
        let product = ordersList[i].order_items[j].product;
        if (product) {
          products.push({
            name: product.name,
            quantity: ordersList[i].order_items[j].quantity,
            item_price: ordersList[i].order_items[j].item_price,
          });
        } else {
          products.push({
            name: `"N/A"-${ordersList[i].order_items[j].product_retailer_id}`,
            quantity: ordersList[i].order_items[j].quantity,
            item_price: ordersList[i].order_items[j].item_price,
          });
        }
      }

      result.push({
        order_id: ordersList[i].order_id,
        created_at: ordersList[i].createdAt.toDateString(),
        order_status: ordersList[i].order_status,
        order_amount: ordersList[i].order_amount,
        products,
      });
    }

    return result;
  } catch (error) {
    logger.error(`Error getting user order history : ${error.message}`);
    return null;
  }
}

async function userLiveOrders(wa_id) {
  try {
    const ordersList = await orders.findAll({
      where: {
        wa_id,
        order_status: {
          [Op.in]: [
            order_statusConstants.PENDING,
            order_statusConstants.CONFIRMED,
          ],
        },
      },
      attributes: [
        "order_id",
        "order_status",
        "order_amount",
        "createdAt",
        "delivery_address",
      ],
      include: [
        {
          required: false,
          model: order_items,
          as: "order_items",
          attributes: ["product_retailer_id", "quantity", "item_price"],
          include: [
            {
              required: false,
              model: calatog_products,
              as: "product",
              attributes: ["name"],
            },
          ],
        },
      ],
    });

    if (!ordersList || ordersList.length === 0) {
      return null;
    }

    let result = [];

    for (let i = 0; i < ordersList.length; i++) {
      let products = [];
      for (let j = 0; j < ordersList[i].order_items.length; j++) {
        let product = ordersList[i].order_items[j].product;
        if (product) {
          products.push({
            name: product.name,
            quantity: ordersList[i].order_items[j].quantity,
            item_price: ordersList[i].order_items[j].item_price,
          });
        } else {
          products.push({
            name: `"N/A"-${ordersList[i].order_items[j].product_retailer_id}`,
            quantity: ordersList[i].order_items[j].quantity,
            item_price: ordersList[i].order_items[j].item_price,
          });
        }
      }

      result.push({
        order_id: ordersList[i].order_id,
        created_at: manipulateDate(ordersList[i].createdAt),
        order_status: ordersList[i].order_status,
        order_amount: ordersList[i].order_amount,
        products,
        delivery_address: ordersList[i].delivery_address,
      });
    }

    return result;
  } catch (error) {
    logger.error(`Error getting user live orders : ${error.message}`);
    return null;
  }
}

async function checkLanguage(wa_id) {
  try {
    const user = await users.findByPk(wa_id, {
      attributes: ["language"],
      raw: true,
    });

    return !!user.language;
  } catch (error) {
    logger.error(`Error checking user: ${error.message}`);
    return null;
  }
}

async function setLanguage(wa_id, language) {
  try {
    await users.update(
      {
        language,
      },
      {
        where: {
          wa_id,
        },
      }
    );
    return true;
  } catch (error) {
    logger.error(`Error setting language: ${error.message}`);
    return null;
  }
}

async function addPaymentMethod(order_id, payment_method) {
  try {
    await orders.update(
      {
        payment_method,
      },
      {
        where: {
          order_id,
        },
      }
    );

    return true;
  } catch (error) {
    logger.error(`Error adding payment method: ${error.message}`);
    return null;
  }
}

async function updateOrderPayment(order_id,status){
  try{
    //if sataus is 'success' or captured, then update order status to confirmed else keep it as pending
    const order_status = status === 'success' || status === 'captured' ? order_statusConstants.CONFIRMED : order_statusConstants.PENDING;
    await orders.update(
      {
        order_status : order_status
      },
      {
        where: {
          order_id,
        },
      }
    );
    return true;
  }catch(error){
    logger.error(`Error updating payment id: ${error.message}`);
    return null;
  }

}

async function confirmOrderStatus(order_id){
  try{
    await orders.update(
      {
        order_status: order_statusConstants.CONFIRMED
      },
      {
        where: {
          order_id,
        },
      }
    );
    return true;
  }catch(error){
    logger.error(`Error confirming order: ${error.message}`);
    return null;
  }
}

module.exports = {
  checkUser,
  getUserAddress,
  saveAddress,
  createOrder,
  addAddressToOrder,
  checkPreviousOrders,
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
  updateOrderPayment,
  getProductName,
  confirmOrderStatus
};
