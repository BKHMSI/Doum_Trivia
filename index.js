'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
var parse = require('csv');
var csv = require('fast-csv')
const app = express();


// Q&A
var categories = ["history", "literature", "engineering"];
var history = require('./categories/history.json');
var literature = require('./categories/literature.json');
var engineering = require('./categories/engineering.json');

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
	res.send('Hello World! I am a Game. I ask questions. Questions from different fields. People respond. I correct. Who am I?');
});

// History route
app.get('/history', function (req, res) {
	res.send(history[0]["question"]);
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


function sendSa7WalaGhalat(sender){
	let message = require('./json/choose_answer.json')
	sendAPI(sender, message);
}

function sendCategories(sender) {
    let message = require('./json/categories.json'); 
	sendAPI(sender, message);
}

function askQuestion(sender, question){
	sendAPI(sender, { text:  "س: " + question });
	sendSa7WalaGhalat(sender);
}

function getQuestion(sender, category){
	var idx = 0;
	switch(category){
		case "literature":
			idx = Math.floor(Math.random() * literature.length);
			askQuestion(sender, literature[idx]["question"]);
			break;
		case "history":
			idx = Math.floor(Math.random() * history.length);
			askQuestion(sender, history[idx]["question"]);
			break;
		case "engineering":
			idx = Math.floor(Math.random() * engineering.length);
			askQuestion(sender, engineering[idx]["question"]);
			break;
		default:
			sendAPI(sender, { text: "Postback received: "+text.substring(0, 200) });
	}
}


function processPostback(event){
	let text = JSON.stringify(event.postback);
	var sender = event.sender.id;
	var payload = event.postback.payload;
	switch(payload){
		case "change_category":
			sendCategories(sender);
			break;
		case "random":
			var cat = categories[Math.floor(Math.random() * categories.length)];
			getQuestion(sender, cat);
		case "correct":
			break;
		case "wrong":
			break;
		case "about":
			sendAPI(sender, require('./json/about_doum.json'));
			break;
		default:
			getQuestion(sender, payload);
	}
}

function processMessage(event){
	let text = event.message.text;
	var sender = event.sender.id;
	switch(text){
		case "category":
			sendCategories(sender);
			break;
		case "answer":
			sendSa7WalaGhalat(sender);
			break;
		default:
			sendAPI(sender, { text: text.substring(0, 200) });
	}
}

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
      let event = req.body.entry[0].messaging[i];

      if(event.message && event.message.text)
	  	processMessage(event);

      if (event.postback) {
		processPostback(event);
		continue;
      }
    }
    res.sendStatus(200);
});