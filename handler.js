'use strict';
const rp = require('request-promise');
const axios = require("axios");

async function getCovidData() {
  var reply = await axios.get("https://api.rootnet.in/covid19-in/stats/latest")
  return (reply.data.data)
};

async function sendToUser(chat_id, text) {
  const options = {
    method: 'GET',
    uri: `https://api.telegram.org/bot${process.env.TGTOKEN}/sendMessage`,
    qs: {
      chat_id,
      text
    }
  };
  return rp(options);
}

function stringSplitter(choice) {
  var res = choice.split(":");
  return res[1].substring(0,2);
}

let stateCodes = {
  "AN":"Andaman and Nicobar Islands",
  "AP":"Andhra Pradesh",
  "AR":"Arunachal Pradesh",
  "AS":"Assam",
  "BR":"Bihar",
  "CG":"Chandigarh",
  "CH":"Chhattisgarh",
  "DN":"Dadra and Nagar Haveli",
  "DD":"Daman and Diu",
  "DL":"Delhi",
  "GA":"Goa",
  "GJ":"Gujarat",
  "HR":"Haryana",
  "HP":"Himachal Pradesh",
  "JK":"Jammu and Kashmir",
  "JH":"Jharkhand",
  "KA":"Karnataka",
  "KL":"Kerala",
  "LA":"Ladakh",
  "LD":"Lakshadweep",
  "MP":"Madhya Pradesh",
  "MH":"Maharashtra",
  "MN":"Manipur",
  "ML":"Meghalaya",
  "MZ":"Mizoram",
  "NL":"Nagaland",
  "OR":"Odisha",
  "PY":"Puducherry",
  "PB":"Punjab",
  "RJ":"Rajasthan",
  "SK":"Sikkim",
  "TN":"Tamil Nadu",
  "TS":"Telangana",
  "TR":"Tripura",
  "UP":"Uttar Pradesh",
  "UK":"Uttarakhand",
  "WB":"West Bengal"
}

let stateCodeString = (Object.keys(stateCodes)).toString().split(",").join("\n");

var message = "blank";

module.exports.covidbot = async event => {
  const body = JSON.parse(event.body);
  const { chat, text } = body.message;
  // let message = await getCovidData();
  
  if (/\/start/i.test(text) || /\/hi/i.test(text) ) {
    message = "Thank you for pinging this Bot. We hope to provide you with relevant and official data in relation to the COVID Virus in India. To use the bot, please use the slash button below";
  } else if (/\/getlatestcountrycount/i.test(text)){
    let result = await getCovidData();
    let totalCount = result.summary;
    message = `As per the last published official data, the total number of COVID positive patients in India have been ${totalCount}`; 
  } else if (/\/getstatedata/i.test(text)) {
    message = `State Codes:\n${stateCodeString}\nSure, please choose from the above mentioned State Codes and reply \"Code:XX\"\n`;
  } else if (/Code/i.test(text)) {
    let stateCodeChosen = stringSplitter(text);
    let state = stateCodes[stateCodeChosen];
    let result = await getCovidData();
    let regionalData = result.regional;
    let relevantStateDataObject = regionalData.find(obj => obj.loc == state);
    if (relevantStateDataObject == undefined) {
      message = "Good News, the state chosen does not seem to have any COVID case."
    } else {
      let stateCovidData = (relevantStateDataObject.confirmedCasesIndian || 0) + (relevantStateDataObject.confirmedCasesIndian || 0);
      message = `As per the last published official data, the total number of COVID positive patients in ${state} have been ${stateCovidData}`;
    }
  } else {
    message = "Sorry, I do not understand your message"
  }

  // let message;
  // if (text == "/getlatestdata") {
  //   message = "The current total number of officially confirmed cases are "+ result.summary.total;
  // } else {
  //   message = `Hi, Thank you for reaching out.  Please use the available commands to check the latest data.`;
  // }

  await sendToUser(chat.id, message);

  return { statusCode: 200 };
};

