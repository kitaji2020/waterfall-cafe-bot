'use strict';

/*
** Import Packages
*/
let Promise = require('bluebird');
let flow_tool = require('./flow_tool');


module.exports = class ChangeParameterFlow {

    constructor(line_event, conversation) {
        this.line_event = line_event;
        this.conversation = conversation;
        this.action = null;
    }

    run(){
        console.log("\n### This is Change Parameter Flow. ###\n");
        let that = this;

        // "text message" and "postback" are the supported event.
        if ((that.line_event.type == "message" && that.line_event.message.type == "text") || that.line_event.type == "postback" ){
            console.log("This is supported event type in this flow.");
        } else {
            console.log("This is unsupported event type in this flow.");
            return new Promise(function(resolve, reject){
                resolve();
            });
        }

        /*
        ** Instantiate action depending on the intent.
        ** The implementations of each action are located under /action directory.
        */
        that.action = flow_tool.instantiate_action(that.conversation.intent.action);
        that.conversation.to_confirm = flow_tool.identify_to_confirm_parameter(that.action.required_parameter, that.conversation.confirmed);

        /*
        ** If api.ai return some parameters. we save them in conversation object so that Bot can remember.
        */
        let parameter = {};
        if (that.line_event.type == "message"){
            parameter[that.conversation.previous.confirmed] = that.line_event.message.text;
        } else if (that.line_event.type == "postback"){
            parameter[that.conversation.previous.confirmed] = that.line_event.postback.data;
        }
        if (parameter !== {}){
            that.action = flow_tool.instantiate_action(that.conversation.intent.action);
            parameter = that.action.parse_parameter(parameter);
            if (parameter){
                flow_tool.add_parameter(that.conversation, parameter);
            }
        }

        /*
        ** Run the intent oriented action.
        ** This may lead collection of another parameter or final action for this intent.
        */
        return flow_tool.run(that.action, that.line_event, that.conversation);
    } // End of run()
};
