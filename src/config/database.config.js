const SQLite = require("sqlite3").verbose();

new SQLite.Database("./src/database/the_farm.sqlite");


module.exports = {
  development: {
    username: null,
    password: null,
    database: "the_farm",
    host: "127.0.0.1",
    dialect: "sqlite",
    storage: "./src/database/the_farm.sqlite",
    protocol: "sqlite",
    logging: false,
    dialectOptions: {
      mode: SQLite.OPEN_READWRITE,
    },
  },

  production: {
    username: null,
    password: null,
    database: "the_farm",
    storage: "./src/database/the_farm.sqlite",
    host: "127.0.0.1",
    dialect: "sqlite",
    logging: false,
    dialectOptions: {
      mode: SQLite.OPEN_READWRITE,
    },
  },
};
