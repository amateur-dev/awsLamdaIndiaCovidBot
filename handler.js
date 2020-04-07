'use strict';
const rp = require('request-promise');
const axios = require("axios");

async function getCovidData() {
  var reply = await axios.get("https://api.rootnet.in/covid19-in/stats/latest")
  return (reply.data.data)
};

async function getPinCodeDetails(pinCode) {
  var reply = await axios.get(`https://api.postalpincode.in/pincode/${pinCode}`);
  var IndianState = (reply.data[0])["PostOffice"][0]["State"];
  var IndianDistrict = (reply.data[0])["PostOffice"][0]["District"];
  return [IndianState, IndianDistrict];
  // replyArray.push(IndianState);
  // replyArray.push(IndianDistrict);
  // console.log(`${IndianDistrict}, ${IndianState}`);
  // console.log(typeof IndianState);
  // console.log(typeof IndianDistrict);

};

async function getDistrictDetails(inputstate, inputdistrict) {
  var reply = await axios.get(`https://api.covid19india.org/v2/state_district_wise.json`);
  let stateData = await (reply.data.find(obj => obj.state == inputstate));
  // console.log(stateData);
  let fullDistrictData = stateData.districtData;
  // console.log(fullDistrictData);
  let districtDetails = fullDistrictData.find(obj => obj.district == inputdistrict);
  return [districtDetails.confirmed, districtDetails.delta.confirmed];
  console.log(districtDetails);
  console.log(`The total unofficial number of confirmed cases in this district are ${districtDetails.confirmed}; the number of patients confirmed in the last 24 hours are ${districtDetails.delta.confirmed}.`);
};

// https://api.covid19india.org/
// https://api.covid19india.org/v2/state_district_wise.json
// https://api.postalpincode.in/pincode/400001

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
  return res[1].substring(0, 2);
}

function PinSplitter(choice) {
  var res = choice.split(":");
  return res[1].substring(0, 6);
}

let stateCodes = {
  "AN": "Andaman and Nicobar Islands",
  "AP": "Andhra Pradesh",
  "AR": "Arunachal Pradesh",
  "AS": "Assam",
  "BR": "Bihar",
  "CG": "Chandigarh",
  "CH": "Chhattisgarh",
  "DN": "Dadra and Nagar Haveli",
  "DD": "Daman and Diu",
  "DL": "Delhi",
  "GA": "Goa",
  "GJ": "Gujarat",
  "HR": "Haryana",
  "HP": "Himachal Pradesh",
  "JK": "Jammu and Kashmir",
  "JH": "Jharkhand",
  "KA": "Karnataka",
  "KL": "Kerala",
  "LA": "Ladakh",
  "LD": "Lakshadweep",
  "MP": "Madhya Pradesh",
  "MH": "Maharashtra",
  "MN": "Manipur",
  "ML": "Meghalaya",
  "MZ": "Mizoram",
  "NL": "Nagaland",
  "OR": "Odisha",
  "PY": "Puducherry",
  "PB": "Punjab",
  "RJ": "Rajasthan",
  "SK": "Sikkim",
  "TN": "Tamil Nadu",
  "TS": "Telangana",
  "TR": "Tripura",
  "UP": "Uttar Pradesh",
  "UK": "Uttarakhand",
  "WB": "West Bengal"
}

let stateCodeString = (Object.keys(stateCodes)).toString().split(",").join("\n");

var message = "blank";

module.exports.covidbot = async event => {
  const body = JSON.parse(event.body);
  const { chat, text } = body.message;
  // let message = await getCovidData();

  if (/\/start/i.test(text) || /hi/i.test(text)) {
    message = "Thank you for pinging this Bot. We hope to provide you with relevant and official data in relation to the COVID Virus in India. To use the bot, please use the slash button below";
  } else if (/full_country/.test(text)) {
    let result = await getCovidData();
    let totalCount = result.summary.total;
    message = `As per the last published official data, the total number of COVID positive patients in India have been ${totalCount}`;
  } else if (/full_state/i.test(text)) {
    message = `State Codes:\n${stateCodeString}\nSure, please choose from the above mentioned State Codes and reply \"State:XX\".\nPlease make sure that the State Code is in Capital Letters.`;
  } else if (/full_pin_code/.test(text)) {
    message = `Sure, please reply back as \"Pin:XXXXXX\"`;
  } else if (/State/i.test(text)) {
    let stateCodeChosen = stringSplitter(text);
    let state = stateCodes[stateCodeChosen];
    let result = await getCovidData();
    let regionalData = result.regional;
    let relevantStateDataObject = regionalData.find(obj => obj.loc == state);
    if (relevantStateDataObject == undefined) {
      message = "Sorry, we did not get any data for this State. Either there has been no COVID data reported for this case, or your State Code is not correct."
    } else {
      let stateCovidData = (relevantStateDataObject.confirmedCasesIndian || 0) + (relevantStateDataObject.confirmedCasesForeign || 0);
      message = `As per the last published official data, the total number of COVID positive patients in ${state} have been ${stateCovidData}`;
    }
  } else if (/Pin/i.test(text)) {
    let pinCodeReplied = PinSplitter(text);
    try {
      let regionDetails = await getPinCodeDetails(Number(pinCodeReplied));
      try {
        let regionReply = await getDistrictDetails(regionDetails[0], regionDetails[1]);
        message = `The total __unofficial__ number of confirmed cases in this district are ${regionReply[0]}; the number of patients confirmed in the last 24 hours are ${regionReply[1]}.`
      } catch (error) {
        message = "Apologies, the Pin Code that you have entered did not generate any results. Either no case has been reported for this Pin Code or the Pin Code is wrong."
      }
    } catch (error) {
      message = "Sorry, the Pin Code that you have entered did not generate any results. Either no case has been reported for this Pin Code or the Pin Code is wrong."
    }
  } else if (/Thank/i.test(text)) {
    message = "Thanks to you for using it. Please stay safe and take care."
  } else {
    message = "Sorry, I do not understand your message."
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

