'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

// Q&A
var categories = ["history", "literature", "engineering"];
var data = require('./categories/data.json');

// MongoDB info
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var GameSchema = new Schema({
  user_id: {type: String},
  category: {type: String},
  q_id: {type: Number},
  is_random: {typle: Boolean},
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
//facebookMessengerProfile('./json/greeting.json');
// Set FB bot get started button
facebookMessengerProfile('./json/get_started.json');
// Set FB bot persistent menu
facebookMessengerProfile('./json/persistent_menu.json');

// Calls the Facebook graph api to change various bot settings
function facebookThreadAPI(jsonFile, cmd){
    // Start the request
    request({
        url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+process.env.FB_PAGE_TOKEN,
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

function facebookMessengerProfile(json_file){
	request({
	    url: 'https://graph.facebook.com/v2.6/me/messenger_profile',
	    qs: { access_token: process.env.FB_PAGE_TOKEN },
	    method: 'POST',
	    json: {require(json_file)}
    }, function(error, response, body) {
	    if (error) {
		    console.log('Error sending messages: ', error);
	    } else if (response.body.error) {
		    console.log('Error: ', response.body.error);
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

function sendFinalResult(sender, score){
    let message = require('./json/final_result.json');
	var query = {user_id: sender};
	switch(score){
		case 0: 
			message.attachment.payload.elements[0].image_url = "https://preview.ibb.co/kqX2qF/Screen_Shot_2017_07_03_at_8_37_21_PM.png";
			message.attachment.payload.elements[0].subtitle = "";
			break;
		case 1:
			message.attachment.payload.elements[0].image_url = "https://preview.ibb.co/jScrja/Screen_Shot_2017_07_03_at_8_37_36_PM.png";
			message.attachment.payload.elements[0].subtitle = "";
			break;
		case 2:
			message.attachment.payload.elements[0].image_url = "https://preview.ibb.co/nrztxv/Screen_Shot_2017_07_03_at_8_37_48_PM.png";
			message.attachment.payload.elements[0].subtitle = "";
			break;
		case 3:
			message.attachment.payload.elements[0].image_url = "https://preview.ibb.co/h05Bja/Screen_Shot_2017_07_03_at_8_37_57_PM.png";
			message.attachment.payload.elements[0].subtitle = "";
			break;
		case 4:
			message.attachment.payload.elements[0].image_url = "https://preview.ibb.co/daVBja/Screen_Shot_2017_07_03_at_8_38_06_PM.png";
			message.attachment.payload.elements[0].subtitle = "";
			break;
		case 5:
			message.attachment.payload.elements[0].image_url = "https://preview.ibb.co/hGbj4a/Screen_Shot_2017_07_03_at_8_38_14_PM.png";
			message.attachment.payload.elements[0].subtitle = "";
			break;
	} 

	Game.findOne(query, function(err, obj){
		if(err){
			console.log("Databse Error: " + err);
		}else{
			var idx = getRandom(data[cat]);
			var question = data[cat][idx]["question"];
			var options = {upsert: true};
			var update = {
				user_id: sender,
				category: cat,
				is_random: obj.is_random,
				q_id: idx,
				score: obj.score,
				count: obj.count,
				total_score: obj.total_score + obj.score
			};
			message.attachment.payload.elements[0].title = "نتيجتك الآن: "+ (obj.total_score + obj.score);
			Game.findOneAndUpdate(query, update, options, function(err, game){
				if(err)
					console.log("Database Error: "+err);
				else 
					sendAPI(sender, message);
			});
		}
	});
}

function askQuestion(sender, question, category){
	sendAPI(sender, { text:  "س: " + question });
}

function getRandom(arr){
	return Math.floor(Math.random() * arr.length);
}

function sendCorrection(sender){
	var query = {user_id: sender};
	let message = require('./json/correction.json');
	Game.findOne(query, function(err, obj){
		if(err){
			console.log("Databse Error: " + err);
		}else{
			var correction = data[obj.category][obj.q_id]["correction"];
			if(correction.trim() == "")
				correction = data[obj.category][obj.q_id]["question"];
			message.attachment.payload.text = correction;
			sendAPI(sender, message);
		}
	});
}

function getQuestion(sender, category, isFirst, isRandom){
	var query = {user_id: sender};
	if(!isFirst){
		Game.findOne(query, function(err, obj){
			if(err){
				console.log("Databse Error: " + err);
			}else{
				var cat = "";
				if(obj.count == 5){
					sendFinalResult(sender, obj.score);
				}else{
					if(obj.is_random){
						cat = categories[getRandom(categories)];
					}else{
						cat = obj.category;
					}

					var idx = getRandom(data[cat]);
					var question = data[cat][idx]["question"];
					var options = {upsert: true};
					var update = {
						user_id: sender,
						category: cat,
						is_random: obj.is_random,
						q_id: idx,
						score: obj.score,
						count: obj.count,
						total_score: obj.total_score
					};

					Game.findOneAndUpdate(query, update, options, function(err, game){
						if(err)
							console.log("Database Error: "+err);
						else 
							askQuestion(sender, question, cat);
					});
				}
			}
		});
	}else if(categories.indexOf(category) != -1){
		var idx = getRandom(data[category]);
		var question = data[category][idx]["question"];
		var options = {upsert: true};
		var update = {
			user_id: sender,
			category: category,
			is_random: isRandom,
			q_id: idx,
			score: 0,
			count: 0,
			total_score: 0
		};

		Game.findOneAndUpdate(query, update, options, function(err, game){
			if(err)
				console.log("Database Error: "+err);
			else 
				askQuestion(sender, question, category);
		});

	}else{
		sendAPI(sender, { text: "بإمكانك إستخدام القائمة لإختيار المجال" });
	}
}

function sendResult(sender, score, q_id, category, isCorrect){
	var c_photos = [
		"https://i.ytimg.com/vi/dYWFp9Rjx7g/hqdefault.jpg",
		"https://i.ytimg.com/vi/vVLgDsxL7BM/mqdefault.jpg",
		"https://i.ytimg.com/vi/z2AS_oBqbHQ/hqdefault.jpg",
		"http://static.yafeta.com/evs/d/0/102/ev1026354/org/icon.jpg"
	];

	var w_photos = [
		"https://i.ytimg.com/vi/QMpKvBd0kP8/hqdefault.jpg",
		"https://1.bp.blogspot.com/-G-Qf7qeEYzA/WDAYz5xS2hI/AAAAAAAAAbY/kjoCJD4YLVA94AG7JhpuwMaZcnx7YMEPQCLcB/s320/015%2B-%2BXrmwi15.jpg",
		"http://i.makeagif.com/media/9-16-2015/kDj6u4.gif"
	];

	if(isCorrect){
		var message = require('./json/result.json');
		message.attachment.payload.elements[0].title = "إجابة صحيحة 👍";

		var correction = data[category][q_id]["correction"];
		if(correction.trim() == "")
			message.attachment.payload.elements[0].subtitle = data[category][q_id]["question"];
		else 
		 	message.attachment.payload.elements[0].subtitle = correction;

		message.attachment.payload.elements[0].image_url = c_photos[getRandom(c_photos)];
		sendAPI(sender, message);
		sendAPI(sender, {text: "نتيجتك الآن: "+ (score+1) + "/5"});
	}else{
		var message = require('./json/result.json');
		message.attachment.payload.elements[0].title = "إجابة خاطئة ✗";

		var correction = data[category][q_id]["correction"];
		if(correction.trim() == "")
			message.attachment.payload.elements[0].subtitle = data[category][q_id]["question"];
		else 
			message.attachment.payload.elements[0].subtitle = correction;

		message.attachment.payload.elements[0].image_url = w_photos[getRandom(w_photos)];
		sendAPI(sender, message);
		sendAPI(sender, {text: "نتيجتك لسة: "+ (score) + "/5"});
	}
}

function checkAnswerAndUpdate(sender, answer){
	var query = {user_id: sender};
	var real = 0;
	var isCorrect = false;
	Game.findOne(query, function(err, obj){
		if(err){
			console.log("Databse Error: " + err);
		}else{
			real = data[obj.category][obj.q_id]["answer"];
			isCorrect = real == answer;

			// Update Score
			var query = {user_id: sender};
			var options = {upsert: true};
			var update = {
				user_id: sender,
				category: obj.category,
				q_id: obj.q_id,
				is_random: obj.is_random,
				score: isCorrect ? obj.score+1:obj.score,
				count: obj.count + 1,
				total_score: obj.total_score
			};
			
			Game.findOneAndUpdate(query, update, options, function(err, game){
				if(err)
					console.log("Database Error: "+err);
				else 
					sendResult(sender, obj.score, obj.q_id, obj.category, isCorrect);
			});
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
			getQuestion(sender, "", false, false);
			break;
		case "correction":
			sendCorrection(sender);
			break;
		case "random":
			var cat = categories[getRandom(categories)];
			getQuestion(sender, cat, true, true);
			break;
		case "about":
			sendAPI(sender, require('./json/about_doum.json'));
			break;
		default:
			getQuestion(sender, payload, true, false);
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
			checkAnswerAndUpdate(sender, 1);
			break;
		case "غلط":
			checkAnswerAndUpdate(sender, 0);
			break;
		default:
			sendAPI(sender, { text: "بإمكانك إستخدام القائمة لإختيار المجال" });
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