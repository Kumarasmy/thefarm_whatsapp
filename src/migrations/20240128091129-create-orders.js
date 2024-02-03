"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("orders", {
      order_id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      wa_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "wa_id",
        },
      },
      catalog_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      order_status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      order_amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      order_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      delivery_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address_id: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: "users_addresses",
          key: "address_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      cancel_reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      order_notes: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      payment_status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      cancelled_by: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("orders");
  },
};
