'use strict';
const rp = require('request-promise');
const axios = require("axios");
const TGTOKEN = "1124930298:AAGdvQFjPAf2jG91NWrw6joFgwZkeKBFRrM"

async function getCovidData() {
  var reply = await axios.get("https://api.rootnet.in/covid19-in/stats/latest")
  return JSON.stringify(reply.data.data.summary.total)
};

async function sendToUser(chat_id, text) {
  const options = {
    method: 'GET',
    uri: `https://api.telegram.org/bot${TGTOKEN}/sendMessage`,
    qs: {
      chat_id,
      text
    }
  };
  return rp(options);
}

module.exports.covidbot = async event => {
  const body = JSON.parse(event.body);
  const { chat, text } = body.message;

  let message = '';
  try {
    const result = await getCovidData();
    message = `${body.text}`;
  } catch (error) {
    message = `Sorry, there was an error in securing data`;
  }
  await sendToUser(chat.id, message);
  return { statusCode: 200 };
};

