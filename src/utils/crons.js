const cron = require("node-cron");
const { cleanupLogs } = require("./logger");

cron.schedule("0 0 * * *", async () => { // 0 0 * * * => 12:00 AM
  console.log("Running log cleanup task");
  await cleanupLogs();
});

module.exports = {
  cron,
};