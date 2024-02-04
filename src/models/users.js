"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class users extends Model {
    static associate(models) {}
  }
  users.init(
    {
      wa_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
        comment: "WhatsApp ID",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "User Profile Name",
      },
      language: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Language",
      },
      is_admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Is admin?",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "tiny int(1) default 1",
      },
    },
    {
      sequelize,
      modelName: "users",
    }
  );

  users.removeAttribute("id");
  return users;
};
