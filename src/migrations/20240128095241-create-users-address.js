'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users_addresses', {
      address_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      wa_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "wa_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      landmark: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "LandMark/Area",
      },
      flat:{
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Flat/House No.",
      },
      floor:{
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Floor",
      },
      tower:{
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Tower Number",
      },
      building:{
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Building/Apartment Name",
      },
      city:{
        type: Sequelize.STRING,
        allowNull: true,
        comment: "City",
      },
      state:{
        type: Sequelize.STRING,
        allowNull: true,
        comment: "State",
      },
      pincode:{
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Pincode",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users_addresses');
  }
};