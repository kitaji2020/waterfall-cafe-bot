'use strict';

let soap = require("soap");
let memory = require("memory-cache");
let request = require('request');

const RN_USER = process.env.RN_USER;
const RN_PASSWORD = process.env.RN_PASSWORD;
const RN_HOSTNAME = process.env.RN_HOSTNAME;
const RN_WSDL = process.env.RN_WSDL;
const SOAP_WSS_SECURITY = new soap.WSSecurity(RN_USER, RN_PASSWORD, {hasTimeStamp: false,hasTokenCreated : false});
const APP_API_ID = 'KF Operations';
const APP_IP_ADDRESS = '10.0.0.0';

soap.createClient(RN_WSDL, function(err, client) {
    if (err || !client){
        console.log("Failed to create soap client.");
        return reject("Failed to create soap client.");
    }
    console.log("rightnow soap client created.");

    client.setSecurity(SOAP_WSS_SECURITY);
    client.addSoapHeader({
        ClientInfoHeader: {
            AppID : APP_API_ID
        }},         //soapHeader Object({rootName: {name: "value"}}) or strict xml-string
        '',         //name Unknown parameter (it could just a empty string)
        'rnm_v1',   //namespace prefix of xml namespace
        ''          //xmlns URI
    );
    memory.put("rn_soap_client", client);
});

module.exports = class RightNow {
    static searchAnswer(question){
        return new Promise(function(resolve, reject){
            let client = memory.get("rn_soap_client");
            if (!client){
                return reject("Soap client not found.");
            }
            let options = {};
            let session_token;
            client.StartInteraction({
                AppIdentifier: APP_API_ID,
                UserIPAddress: APP_IP_ADDRESS
            }, function(err, result){
                if (err) {
                    console.log("Failed to start interaction.");
                    return reject("Failed to start interaction.");
                }
                console.log("Interaction started.");
                session_token = result.SessionToken;
                console.log("Going to search '" + question + "'");
                client.GetSmartAssistantSearch({
                    SessionToken: session_token,
                    Body: question,
                    Subject: question,
                    Limit: 1
                }, function(err, result){
                    if (err){
                        console.log("Failed to serach.");
                        return reject(err);
                    }

                    if (result.ContentListResponse.SummaryContents && result.ContentListResponse.SummaryContents.SummaryContentList){
                        console.log("Got contents.");

                        let content_id;
                        if(result.ContentListResponse.SummaryContents.SummaryContentList.length > 0){
                            content_id = result.ContentListResponse.SummaryContents.SummaryContentList[0].ID.attributes.id;
                        } else {
                            content_id = result.ContentListResponse.SummaryContents.SummaryContentList.ID.attributes.id;
                        }

                        // Get full content using content id.
                        let url = "https://" + RN_USER + ":" + RN_PASSWORD + "@" + RN_HOSTNAME + "/services/rest/connect/latest/answers/" + content_id;
                        let headers = {
                            "Content-Type": "application/json"
                        }
                        console.log("Getting full content of " + content_id + ".");
                        request({
                            method: "GET",
                            url: url,
                            headers: headers,
                            json: true
                        }, function (error, response, body) {
                            (error) ? reject(error) : resolve(body);
                        });
                    } else {
                        // Contents not found.
                        console.log("Contents not found.");
                        return resolve();
                    }
                }, options);
            },
            options);
        });
    }
}
