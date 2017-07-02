'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const app = express();

// Q&A
var categories = ["history", "literature", "engineering"];
var history = require('./categories/history.json');
var literature = require('./categories/literature.json');
var engineering = require('./categories/engineering.json');

// MongoDB info
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var GameSchema = new Schema({
  user_id: {type: String},
  category: {type: String},
  q_id: {type: Number},
  score: {type: Number},
  count: {type: Number},
  total_score: {type: Number}
});

var db = mongoose.connect(process.env.MONGODB_URI);
var Game = mongoose.model("Game", GameSchema);

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get('/', function (req, res) {
	res.send('Hello World! I am a Game. I ask questions. Questions from different fields. People respond. I correct. Who am I?');
});

// Test route
app.get('/test', function (req, res) {
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
	    }else{
			if(msg.text && msg.text[0] == 'س')
				sendSa7WalaGhalat(sender);
		}
    });
}


function sendGetStarted(sender){
	var message = require('./json/about_game.json');
	sendAPI(sender, message);
}

function sendSa7WalaGhalat(sender){
	let message = require('./json/choose_answer.json')
	sendAPI(sender, message);
}

function sendCategories(sender) {
    let message = require('./json/categories.json'); 
	sendAPI(sender, message);
}

function askQuestion(sender, question, category){
	sendAPI(sender, { text:  "س: " + question });
}

function getQuestion(sender, category, obj, isCorrect){
	var idx = 0;
	var question = "";

	switch(category){
		case "literature":
			idx = Math.floor(Math.random() * literature.length);
			question = literature[idx]["question"];
			break;
		case "history":
			idx = Math.floor(Math.random() * history.length);
			question = history[idx]["question"];
			break;
		case "engineering":
			idx = Math.floor(Math.random() * engineering.length);
			question = engineering[idx]["question"];
			break;
		default:
			sendAPI(sender, { text: "Postback received: "+text.substring(0, 200) });
	}

	var query = {user_id: sender};
	var options = {upsert: true};
	var update = {
		user_id: sender,
		category: category,
		q_id: idx,
		score: obj == null ? 0 : (isCorrect ? obj.score+1:obj.score),
		count: obj == null ? 0 : obj.count + 1,
		total_score: 0
	}
	
	Game.findOneAndUpdate(query, update, options, function(err, game){
		if(err)
			console.log("Database Error: "+err);
	});

	askQuestion(sender, question, category);
}


function sendFinalResult(sender){
	console.log("Final Result");
}

function sendCorrection(sender, correction, isCorrect, obj){
	if(isCorrect){
		var message = require('./json/correct.json');
		if(correction.trim() != "")
			message.attachment.payload.elements[0].subtitle = correction;

		sendAPI(sender, message);
		sendAPI(sender, {text: "نتيجتك الآن: "+ (obj.score+1) + "/5"});
	}else{
		var message = require('./json/wrong.json');
		if(correction.trim() != "")
			message.attachment.payload.elements[0].subtitle = correction;
		sendAPI(sender, message);
		sendAPI(sender, {text: "نتيجتك الآن: "+ (obj.score+1) + "/5"});
	}
}

function checkAnswer(sender, answer){
	var query = {user_id: sender};
	var q_id = 0, real = 0;
	var correction = "";
	var isCorrect = false;
	Game.findOne(query, function(err, obj){
		if(err){
			console.log("Databse Error: " + err);
		}else{
			switch(obj.category){
				case "literature":
					real = literature[obj.q_id]["answer"];
					correction = literature[obj.q_id]["correction"];
					break;
				case "history":
					real = history[obj.q_id]["answer"];
					correction = history[obj.q_id]["correction"];
					break;
				case "engineering":
					real = engineering[obj.q_id]["answer"];
					correction = engineering[obj.q_id]["correction"]
					break;
			}
			
			isCorrect = real == answer;
			sendCorrection(sender, correction, isCorrect, obj);
		}
	});
}


function processPostback(event){
	let text = JSON.stringify(event.postback);
	var sender = event.sender.id;
	var payload = event.postback.payload;
	console.log(payload);
	switch(payload){
		case "get_started":
			sendGetStarted(sender);
			break;
		case "start_game":
			sendCategories(sender);
			break;
		case "change_category":
			sendCategories(sender);
			break;
		case "next_q":
			getQuestion(sender, "history", null, false);
			break;
		case "random":
			var cat = categories[Math.floor(Math.random() * categories.length)];
			getQuestion(sender, cat, null, false);
			break;
		case "about":
			sendAPI(sender, require('./json/about_doum.json'));
			break;
		default:
			getQuestion(sender, payload, null, false);
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
		case "صح":
			checkAnswer(sender, 1);
			break;
		case "غلط":
			checkAnswer(sender, 0);
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

      if(event.postback) 
		processPostback(event);
    }
    res.sendStatus(200);
});