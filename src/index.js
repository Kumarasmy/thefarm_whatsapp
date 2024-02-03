const express = require("express");
require("dotenv").config();
const app = express();
const port = 4000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const { parseWebhook, checkUser } = require("./functions");

const { logger } = require("./utils");
const { handleRequest } = require("./functions/handleRequest");

const { startCronJobs } = require("./cron");

app.get("/webhook", (req, res) => {
  const verifyToken = process.env.VERIFY_TOKEN;
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

  await handleRequest(user, response);
  console.log(response);
  console.log(user);
});

app.get("/", (req, res) => {
  res.send({ message: `Web server is up and running!` });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

startCronJobs();
