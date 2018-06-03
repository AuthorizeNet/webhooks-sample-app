var http = require('http');
var express = require('express')
var app = express();
//var admin = express();
var request = require('request');
var bodyParser = require('body-parser');

const port = 8000;

//admin.get('/', function (req, res) {
//    console.log(admin.mountpath); // /admin
//    res.send('Admin Homepage');
//});

//app.use('/admin', admin);

var eventRequestData = {
    url: 'https://apitest.authorize.net/rest/v1/eventtypes',
    method: 'GET',
    headers: { "content-type": "application/json", "Authorization": "Basic " + "your encoded authentication string" },

};

var webhooksRequestData = {
    url: 'https://apitest.authorize.net/rest/v1/webhooks',
    method: 'GET',
    headers: { "content-type": "application/json", "Authorization": "Basic " + "your encoded authentication string" },
};

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

var response_event = [
    { event_name: 'e1', webhook_id: 'a1' },
    { event_name: 'e2', webhook_id: 'a2' },
]

function getEvents(res) {
    var eventList = []
    request(eventRequestData, function (error, response, body) {
        if (response.statusCode == 200) {
            for (var key in JSON.parse(body)) {
                if (!JSON.parse(body).hasOwnProperty(key)) continue;
                var obj = JSON.parse(body)[key];
                for (var prop in obj) {
                    if (!obj.hasOwnProperty(prop)) continue;
                    eventList.push(obj[prop]);
                }
            }
        }
        //else {
        //    console.log("Error occured\n");
        //    //console.log(JSON.parse(body));
        //    console.log("Body: " + JSON.parse(body).status + " reason: " + JSON.parse(body).reason + " message: " + JSON.parse(body).message)
        //}
        console.log("\nin get events\n")
        console.log("geteventsfunc\n", eventList);
        res.send(eventList);
    });
    
}

function getWebhooks(res) {
    var webhookList = []
    request(webhooksRequestData, function (error, response, body) {
        if (response.statusCode == 200) {
            for (var key in JSON.parse(body)) {
                if (!JSON.parse(body).hasOwnProperty(key)) continue;
                var obj = JSON.parse(body)[key];
                for (var prop in obj) {
                    if (!obj.hasOwnProperty(prop)) continue;
                    webhookList.push(obj[prop]);
                }
            }
        }
        //else {
        //    console.log("Error occured\n");
        //    //console.log(JSON.parse(body));
        //    console.log("Body: " + JSON.parse(body).status + " reason: " + JSON.parse(body).reason + " message: " + JSON.parse(body).message)
        //}
        console.log("\nin get webhook\n")
        console.log("getwebhooksfunc\n", JSON.parse(body));
        res.send(JSON.parse(body));
        
    });

}
app.get('/events', function (req, res) {
    getEvents(res);
 })

//if (error || response == undefined || response.statusCode != 200)
//    out = error;
//else
//    out = JSON.parse(body);
//console.log(out);

app.get('/webhooks', function (req, res) {
    getWebhooks(res);
});

app.get('/webhooks/add', function (req, res) {
    res.send("hello");
});

app.get('/notifications', function (req, res) {
    console.log("Got a get request at notifications page", req.body);
    //response_event.push(req.body);
    res.send("new page");
})

app.post('/notifications', function (req, res) {
    console.log("Got a post request at notifications page", req.body);
    //response_event.push(req.body);
    res.sendStatus(200);
})

var server = app.listen(port, function () {
    console.log('Example app listening on port ', server.address().port)
})
