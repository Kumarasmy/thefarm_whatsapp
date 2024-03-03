"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "orders",
        "payment_session_id",
        {
          before : 'cancelled_by',
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "orders",
        "cf_payment_id",
        {
          before : 'cancelled_by',
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.changeColumn(
        "orders",
        "payment_method",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("orders", "payment_session_id", {
        transaction,
      });
      await queryInterface.removeColumn("orders", "cf_payment_id", {
        transaction,
      });
      await queryInterface.changeColumn(
        "orders",
        "payment_method",
        {
          type: Sequelize.STRING,
          allowNull: false,
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
