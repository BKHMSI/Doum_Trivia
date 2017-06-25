'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
var parse = require('csv');
const app = express();

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot');
});

// Index route
app.get('/history', function (req, res) {
	res.send(getQuestion('history'));
});

// for Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge']);
	}
	res.send('Error, wrong token');
});

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'));
});


const token = "EAAJ2s9H6iDoBANJpnARUgd3XvOu172hwxHfC00PHpfAbZBCT8fg4m1V6n4lX8TRBQFn8aIsVFaAll4hag8fHeYvkaRdeww9Xbxq2Y3X5AY886BnzHYinCwH7BBg1GqZClqdVOuzbfn9TxgTbAAXUH2xGn1g2iyRV8jTPvnjAZDZD";
function sendAPI(sender, msg){
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
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

function chooseCategoryMessage(sender){
  let message = {
		"attachment":{
		"type":"template",
		"payload":{
			"template_type":"button",
			"text":"Choose Category",
			"buttons":[
					{
						"type":"postback",
						"title":"Literature",
						"payload":"literature"
					},
					{
						"type":"postback",
						"title":"History",
						"payload":"history"
					}
				]
			}
		}
	}
	sendAPI(sender,message);
}

function chooseAnswer(sender){
	let message = {
		"text":"صح ولا غلط",
		"quick_replies":[
			{
				"content_type":"text",
				"title":"غلط",
				"payload":"wrong",
				"image_url":"http://petersfantastichats.com/img/red.png"
			},
			{
				"content_type":"text",
				"title":"صح",
				"payload":"correct",
				"image_url":"http://petersfantastichats.com/img/green.png"
			}
		]
	};
	sendAPI(sender, message);
}


function sendCategoryMessage(sender){
	let messageData = {
	    "attachment": {
		    "type": "template",
		    "payload": {
				"template_type": "generic",
			    "elements": [{
					"title": "Choose Category",
				    "subtitle": "Categories:",
				    "image_url": "http://images2.fanpop.com/image/photos/14600000/egypt-egyptian-history-14635054-500-375.jpg",
				    "buttons": [{
					    "type": "postback",
					    "title": "تازيخ",
					    "payload": "history",
				    }, {
					    "type": "postback",
					    "title": "أدب",
					    "payload": "literature",
				    }, {
					    "type": "postback",
					    "title": "هندسة",
					    "payload": "engineering",
				    }, {
					    "type": "postback",
					    "title": "تكنولوجيا",
					    "payload": "technology",
				    }
					]
			    }]
		    }
	    }
    };
	sendAPI(sender, messageData);
}

function sendGenericMessage(sender) {
    let messageData = {
	    "attachment": {
		    "type": "template",
		    "payload": {
				"template_type": "generic",
			    "elements": [{
					"title": "Choose Category",
				    "subtitle": "Element #1 of an hscroll",
				    "image_url": "http://images2.fanpop.com/image/photos/14600000/egypt-egyptian-history-14635054-500-375.jpg",
				    "buttons": [{
					    "type": "web_url",
					    "url": "https://www.messenger.com",
					    "title": "web url"
				    }, {
					    "type": "postback",
					    "title": "Postback",
					    "payload": "Payload for first element in a generic bubble",
				    }],
			    }, {
				    "title": "Second card",
				    "subtitle": "Element #2 of an hscroll",
				    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
				    "buttons": [{
					    "type": "postback",
					    "title": "Postback",
					    "payload": "Payload for second element in a generic bubble",
				    }],
			    }]
		    }
	    }
    };
	sendAPI(sender, messageData);
}

function getQuestion(category){
	var path = "categories/"+category+".csv";
	fs.readFile(path, function (err, data) {
		parse(fileData, {columns: false, trim: true}, function(err, rows) {
			// Your CSV data is in an array of arrys passed to this callback as rows.
			console.log(rows);
			return rows[0][0];
		})
	})
}

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
      let event = req.body.entry[0].messaging[i];
      let sender = event.sender.id;
      if (event.message && event.message.text) {
  	    let text = event.message.text;
  	    if (text === "category") 
  		    sendCategoryMessage(sender);
		else if( text == "generic")
			sendGenericMessage(sender);
		else if( text == "answer")
			chooseAnswer(sender);
		else if( text == "test")
			sendAPI(sender, { text: getQuestion('history') });
		else
  	    	sendAPI(sender, { text: text.substring(0, 200) });
      }
      if (event.postback) {
  	    let text = JSON.stringify(event.postback);
  	    sendAPI(sender, { text: "Postback received: "+text.substring(0, 200) });
  	    continue;
      }
    }
    res.sendStatus(200);
  })