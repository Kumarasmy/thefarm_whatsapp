const cron = require("node-cron");
const { logger } = require("../utils");
const { updateCatalogProducts } = require("./products.cron");

function startCronJobs() {
  try {
    cron.schedule("0 * * * *", async () => { //every hour
      await updateCatalogProducts();
    });
  } catch (error) {
    logger.error(`Error starting cron jobs: ${error.message}`);
  }
}

module.exports = {
  startCronJobs,
};
