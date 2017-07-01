'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
var parse = require('csv');
const app = express();

// MongoDB info
// const mongoose = require('mongoose');
// const User = mongoose.model('User', {_id: String, name: String, profile_image_url: String, phone_number: String, current_state: String});

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot');
});

// For Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === process.env.FB_VERIFICATION_TOKEN) {
		res.send(req.query['hub.challenge']);
	}
	res.send('Error, wrong token');
});

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'));
});

// Set FB bot greeting text
facebookThreadAPI('./json/greeting.json', 'Greating Text');
// Set FB bot get started button
facebookThreadAPI('./json/get_started.json', 'Get Started Button');
// Set FB bot persistent menu
facebookThreadAPI('./json/persistent_menu.json', 'Persistent Menu');

// Calls the Facebook graph api to change various bot settings
function facebookThreadAPI(jsonFile, cmd){
    // Start the request
    request({
        url: 'https://graph.facebook.com/v2.6/me/thread_settings?access_token='+process.env.FB_PAGE_TOKEN,
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        form: require(jsonFile)
    },
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Print out the response body
            console.log(cmd+": Updated.");
            console.log(body);
        } else { 
            // TODO: Handle errors
            console.log(cmd+": Failed. Need to handle errors.");
            console.log(body);
        }
    });
}

function sendAPI(sender, msg){
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: { access_token: process.env.FB_PAGE_TOKEN },
	    method: 'POST',
	    json: {
		    recipient: {id:sender},
		    message: msg,
	    }
    }, function(error, response, body) {
	    if (error) {
		    console.log('Error sending messages: ', error);
	    } else if (response.body.error) {
		    console.log('Error: ', response.body.error);
	    }
    });
}


function chooseAnswer(sender){
	let message = require('./json/choose_answer.json')
	sendAPI(sender, message);
}

function sendCategories(sender) {
    let message = require('./json/categories.json'); 
	sendAPI(sender, message);
}

function getQuestion(category){
	var path = "./categories/"+category+".csv";
	fs.readFile(path, function (err, data) {
		parse(fileData, {columns: false, trim: true}, function(err, rows) {
			// Your CSV data is in an array of arrys passed to this callback as rows.
			if(err) return err;
			return rows[0][0];
		});
	});
}

function processPostback(event){
	let text = JSON.stringify(event.postback);
	var sender = event.sender.id;
	var payload = event.postback.payload;
	switch(payload){
		case "change_category":
			sendCategories(sender);
			break;
		case "about":
			sendAPI(sender, require('./json/about_doum.json'));
			break;
		default:
			sendAPI(sender, { text: "Postback received: "+text.substring(0, 200) });
	}
}

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
      let event = req.body.entry[0].messaging[i];
      let sender = event.sender.id;
      if (event.message && event.message.text) {
  	    let text = event.message.text;
  	    if (text === "category")
  		    sendCategories(sender);
		else if( text == "answer")
			chooseAnswer(sender);
		else if( text == "test")
			sendAPI(sender, { text: getQuestion('history') });
		else
  	    	sendAPI(sender, { text: text.substring(0, 200) });
      }
      if (event.postback) {
		processPostback(event);
		continue;
      }
    }
    res.sendStatus(200);
});