const { Sequelize, DataTypes } = require("sequelize");
export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/database.sqlite", // Path to your SQLite database file
});
