'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class payment_webhooks extends Model {

    static associate(models) {
      // define association here
    }
  }
  payment_webhooks.init({
    id:{
      type: DataTypes.TEXT,
      primaryKey: true,
      allowNull: false,
    },
    status : {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timestamp : {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recipient_id : {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type : {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount : {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currency : {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_method : {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_status : {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'payment_webhooks',
  });
  return payment_webhooks;
};