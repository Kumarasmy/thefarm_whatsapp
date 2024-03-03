"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class order_items extends Model {
    static associate(models) {
      order_items.hasOne(models.calatog_products, {
        foreignKey: "retailer_id",
        sourceKey: "product_retailer_id",
        as: "product",
      });
    }
  }
  order_items.init(
    {
      item_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      order_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "orders",
          key: "order_id",
        },
      },
      product_retailer_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      item_price: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "INR",
      },
      product_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "order_items",
    }
  );
  return order_items;
};
