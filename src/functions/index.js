const webhookFunction = require("./webhook.parser");
const dbFunctions = require("./database.functions");
const axiosFunctions = require("./axios.functions");
const embedFunctions = require("./embed.functions");

module.exports = {
  ...webhookFunction,
  ...dbFunctions,
  ...axiosFunctions,
  ...embedFunctions,
};
