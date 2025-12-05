// index.js — Facebook Messenger Webhook Server

"use strict";

const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const request = require("request");

// App setup
const app = express().use(bodyParser.json());

// Environment variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// ---------------------------------------------------------------------------
// GET: Webhook Verification
// ---------------------------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// ---------------------------------------------------------------------------
// POST: Webhook Receiver (Messenger events)
// ---------------------------------------------------------------------------
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      console.log("Webhook event:", webhookEvent);

      const senderPsid = webhookEvent.sender.id;
      console.log("Sender PSID:", senderPsid);

      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ---------------------------------------------------------------------------
// Handle Messages
// ---------------------------------------------------------------------------
function handleMessage(senderPsid, message) {
  let reply;

  if (message.text) {
    reply = {
      text: `You said: "${message.text}"`
    };
  } else {
    reply = { text: "I only understand text right now." };
  }

  callSendAPI(senderPsid, reply);
}

// ---------------------------------------------------------------------------
// Handle Postbacks
// ---------------------------------------------------------------------------
function handlePostback(senderPsid, postback) {
  let reply;
  const payload = postback.payload;

  if (payload === "GET_STARTED") {
    reply = { text: "Welcome! How can I help you today?" };
  } else {
    reply = { text: `You clicked a button: ${payload}` };
  }

  callSendAPI(senderPsid, reply);
}

// ---------------------------------------------------------------------------
// Send API (Send message back to user)
// ---------------------------------------------------------------------------
function callSendAPI(senderPsid, response) {
  const reqBody = {
    recipient: { id: senderPsid },
    message: response
  };

  request(
    {
      uri: "https://graph.facebook.com/v20.0/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: reqBody
    },
    (err, res, body) => {
      if (!err) console.log("Message sent!");
      else console.error("Unable to send message:", err);
    }
  );
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook server is running on port ${PORT}`));