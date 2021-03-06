'use strict';
const rp = require('request-promise');
const axios = require("axios");

// https://api.covid19india.org/
// https://api.covid19india.org/v2/state_district_wise.json
// https://api.postalpincode.in/pincode/400001

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
  let districtDetails;
  try {
    let details = fullDistrictData.find(obj => obj.district == inputdistrict);
    if (details === undefined) {
      throw "error" }
    districtDetails = details;
  } catch (error) {
    districtDetails = { confirmed: 0, delta: { confirmed: 0 } }
  }
  
  let districtDetailsUnknown;
  try {
    let details = fullDistrictData.find(obj => obj.district == "Unknown");
    if (details == undefined) {
      throw "error";
    }
    districtDetailsUnknown = details.confirmed;
  } catch (error) {
    districtDetailsUnknown = 0;
  }
  
  // console.log(districtDetails.confirmed, districtDetails.delta.confirmed, districtDetailsUnknown);
  return [districtDetails.confirmed, districtDetails.delta.confirmed, districtDetailsUnknown];
  console.log(districtDetails);
  console.log(`The total unofficial number of confirmed cases in this district are ${districtDetails.confirmed}; the number of patients confirmed in the last 24 hours are ${districtDetails.delta.confirmed}.`);
};

async function getPhoneNumbers(state) {
  var reply = await axios.get(`https://spreadsheets.google.com/feeds/list/1Cq9yLURiA5KW_nM3_beW32UaRFLmV8K77Z7e8pt3FOM/od6/public/values?alt=json`);
  let entries = reply.data.feed.entry
  // console.log(entries[0])
  let ans = entries.find(obj => obj["title"]['$t'] === state);
  // console.log(ans)
  let phoneNumbers=[];
  // let num = 3
  // console.log(ans[`gsx$phoneno${num}`]["$t"])
  for (let i=1;i<7;i++) {
    phoneNumbers.push(ans[`gsx$phoneno${i}`]["$t"])
  }
  console.log(phoneNumbers);
  phoneNumbers = phoneNumbers.filter(Boolean);
  let message = `The emergency helpline numbers of ${state} are ` + phoneNumbers.toString().replace(/,/g, ', ');
  // console.log(message);
  return message;
}


async function sendToUser(chat_id, text) {
  const options = {
    method: 'GET',
    uri: `https://api.telegram.org/bot${process.env.TGTOKEN}/sendMessage`,
    qs: {
      chat_id,
      text,
      parse_mode: "HTML"
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
      let stateCovidDataDischarged = relevantStateDataObject.discharged;
      let text1 = (stateCovidDataDischarged > 0) ?
      `As per the last published official data, the total number of COVID positive patients in ${state} have been ${stateCovidData}. On the bright side, ${stateCovidDataDischarged} have been cured and discharged in ${state}.`
      :
      `As per the last published official data, the total number of COVID positive patients in ${state} have been ${stateCovidData}.`
      try {
        let text2 = "You may also note that " + (await getPhoneNumbers(regionDetails[0])).replace(/The/i, "the");
        message = text1 + " " + text2;
      } catch (error) {
        message = text1;
      }
          

    }
  } else if (/Pin/i.test(text)) {
    let pinCodeReplied = PinSplitter(text);
    try {
      let regionDetails = await getPinCodeDetails(Number(pinCodeReplied));
      try {
        let regionReply = await getDistrictDetails(regionDetails[0], regionDetails[1]);
        
        let text1 = (regionReply[0] > 0) ? `The total <i>unofficial</i> number of confirmed cases in ${regionDetails[1]}, ${regionDetails[0]} are ${regionReply[0]};` + ` the number of patients confirmed in the last 24 hours are ${regionReply[1]}.` : `Good news! As per the data available with us, there are no confirmed cases reported for ${regionDetails[1]}.`
        
        let text2 = (regionReply[2] > 0) ? `However, do note that ${regionDetails[0]} has also reported ${regionReply[2]} number of confirmed cases with no disctrict details - we are not able to confirm if these cases may or may not belong to your requested district.` : `For additional reference, ${regionDetails[0]} has not reported any case which as "Unknown" district.`;

        try {
          let text3 = "You may also note that " + (await getPhoneNumbers(regionDetails[0])).replace(/The/i, "the");
          message = text1 + " " + text2 + " " + text3;
        } catch (error) {
          message = text1 + " " + text2
        }
        

        
        
      } catch (error) {
        message = "Apologies, the Pin Code that you have entered did not generate any results. Either no case has been reported for this Pin Code or the Pin Code is wrong."
      }
    } catch (error) {
      message = "Sorry, the Pin Code that you have entered did not generate any results. Either no case has been reported for this Pin Code or the Pin Code is wrong."
    }
  } else if (/Thank/i.test(text)) {
    message = "Thanks to you for using it. Please stay safe and take care."
  } else if (/emergency_numbers/i.test(text)) {
    message = `State Codes:\n${stateCodeString}\nSure, please choose from the above mentioned State Codes and reply \"EN:XX\".\nPlease make sure that the State Code is in Capital Letters.`;
  } else if (/EN/i.test(text)) {
    try {
      let stateCodeChosen = stringSplitter(text);
      let state = stateCodes[stateCodeChosen];
      message = await getPhoneNumbers(state)
    } catch (error) {
      message = "Sorry, we did not get any data for this State. May be the State Code is not correct."
    }
  } else {
    message = "Sorry, I do not understand your message."
  }

  await sendToUser(chat.id, message);

  return { statusCode: 200 };
};

