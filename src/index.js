const express = require("express");
require("dotenv").config();
const app = express();
const port = 4000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { parseWebhook, checkUser } = require("./functions");
const { isMaintainanceMode, accessToken } = require("./config/bot.config");
const { logger } = require("./utils");
const { handleRequest } = require("./functions/handleRequest");
const { startCronJobs } = require("./cron");
const { updateCatalogProducts } = require("./cron/products.cron");
const { cron } = require("./utils/crons");

app.get("/webhook", (req, res) => {
  console.log(`[GET] /webhook`);
  const verifyToken = accessToken;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WEBHOOK_VERIFIED");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  const response = parseWebhook(req.body);
  if (!response.wa_id || !response.from) {
    return;
  }

  const user = await checkUser(response);

  // //if maintainance mode is on, and user is not admin, then return
  if (isMaintainanceMode && !user.is_admin) {
    return;
  }

  await handleRequest({ ...response, user });
});

app.get("/", (req, res) => {
  res.send({ message: `Web server is up and running!` });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

startCronJobs();
updateCatalogProducts(); //initial update

console.log(new Date(Date.now() + 20 * 60000).toISOString());
