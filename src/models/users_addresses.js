'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class users_addresses extends Model {
 
    static associate(models) {
      // define association here
    }
  }
  users_addresses.init({
    address_id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
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
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    landmark: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "LandMark/Area",
    },
    flat:{
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Flat/House No.",
    },
    floor:{
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Floor",
    },
    tower:{
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Tower Number",
    },
    building:{
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Building/Apartment Name",
    },
    city:{
      type: DataTypes.STRING,
      allowNull: true,
      comment: "City",
    },
    state:{
      type: DataTypes.STRING,
      allowNull: true,
      comment: "State",
    },
    pincode:{
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Pincode",
    },
    
  }, {
    sequelize,
    modelName: 'users_addresses',
  });
  return users_addresses;
};