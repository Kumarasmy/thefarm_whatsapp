"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class orders extends Model {
    static associate(models) {
      orders.hasMany(models.order_items, {
        foreignKey: "order_id",
        as: "order_items",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }
  orders.init(
    {
      order_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      wa_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "wa_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      catalog_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      order_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      order_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      order_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      delivery_address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address_id: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: "users_addresses",
          key: "address_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      cancel_reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      order_notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      payment_method: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      payment_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      payment_session_id: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      cf_payment_id: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      cancelled_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "orders",
    }
  );
  return orders;
};
