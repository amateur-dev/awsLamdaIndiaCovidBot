'use strict';
const rp = require('request-promise');
const axios = require("axios");
const TGTOKEN = "1124930298:AAGdvQFjPAf2jG91NWrw6joFgwZkeKBFRrM"

async function getCovidData() {
  var reply = await axios.get("https://api.rootnet.in/covid19-in/stats/latest")
  return JSON.stringify(reply.data.data)
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
  let result = getCovidData();
  let message;
  if (text == "/getlatestdata") {
    message = "The current total number of officially confirmed cases are "+ result.summary.total;
  } else {
    message = `Hi, Thank you for reaching out.  Please use the available commands to check the latest data.`;
  }

  await sendToUser(chat.id, message);

  return { statusCode: 200 };
};

