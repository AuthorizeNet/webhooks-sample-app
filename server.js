const express = require("express");
const app = express();
const request = require("request");
const bodyParser = require("body-parser");

const http = require("http");
const socketIo = require("socket.io");
const server = http.Server(app);
const cors = require("cors");
const io = socketIo(server);

const config = require("./config");

const encodedString = Buffer.from(config.apiLoginId + ":" +
                                  config.transactionKey).toString("base64");

const headers = { "content-type": "application/json",
"Authorization": "Basic " + encodedString };

console.log("process.env node_env: ", process.env.NODE_ENV);
console.log("process.env hashed key: ", process.env.hashed_key);

const eventRequestData = {
    url: config.apiEndpoint + "/eventtypes",
    method: "GET",
    headers: headers,
};

const webhooksRequestData = {
    url: config.apiEndpoint + "/webhooks",
    method: "GET",
    headers: headers,
};

const webhooksPostData = {
    url: config.apiEndpoint + "/webhooks",
    method: "POST",
    headers: headers,
    json: true,
};

app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var eventFrequencyMap = {}

function parseBody(res, body) {
    try {
        res.send(JSON.parse(body));
    }catch (e) {
        var errorMessage = {};
        if (e instanceof TypeError) {
            errorMessage.message = "Error in Connection. Please try again";
            res.send(errorMessage);
        }
        else {
            errorMessage.message = "Error";
            res.send(errorMessage);
        }
    }
}

function getEvents(res) {
    request(eventRequestData, function (error, response, body) {
        parseBody(res, body);
    });
}
function getWebhooks(res) {
    request(webhooksRequestData, function (error, response, body) {
        parseBody(res, body);
    });

}
app.get("/events", function (req, res) {
    getEvents(res);
 });

 app.get("/webhooks", function (req, res) {
    getWebhooks(res);
});

app.post("/webhooks", function (req, res) {
    console.log("this is req.body in server.js\n");
    webhooksPostData.body = req.body;
    request(webhooksPostData, function (error, response, body) {
        if (error) {
            console.log("error occured: \n", error);
            //res.write("Error");
        }
        else {
            console.log(response.body);
            //res.sendStatus(200);
        }        
    });

});

app.get("/webhooks/add", function (req, res) {
    res.send("hello");
});

app.post("/notifications", function (req, res) {
    console.log("Got a post request at notifications page", JSON.stringify(req.body));
    //response_event.push(req.body);
    incrementEventOccurrence(req.body.eventType)
    io.emit("new event", {
        eventDetails: (req.body),
        eventsCount: eventFrequencyMap,
    })
    res.sendStatus(200);
})

var increment = 1;

function incrementEventOccurrence(event) {
    console.log("occured event is in neweventgraph func:", event);
    if (event in eventFrequencyMap) {
        eventFrequencyMap[event]++;
    }
    else
        eventFrequencyMap[event] = 1;
    console.log("and map value is: ", eventFrequencyMap)
}

app.get("/notifications", function (req, res) {
    console.log("\n ****inside get notifications****\n");
    res.format({
        // Respond to browser requests with the 404 page
        html: function () {
            console.log("\n inside html\n");
            res.json({
                error: "Page not found"
            });
        },
        json: function () {
            console.log("\n inside json\n");
            //var eventData = [];
            var eventPoint = {};
            min = Math.ceil(0);
            max = Math.floor(25);
            var rand = Math.floor(Math.random() * (max - min)) + min;
            eventPoint.day = new Date();
            //eventPoint.day = increment;
            ++increment;
            eventPoint.event1 = rand;
            eventPoint.event2 = rand + 5;
            eventPoint.event3 = 0;
            eventPoint.event4 = 0;
            //eventData.push(eventPoint);
            console.log("\n going to send json response in get method\n", eventPoint);
            res.json({
                //eventData: eventData
                eventData: eventPoint,
                //eventData: eventFrequencyMap,
            });
        }
    })
})

app.use((req, res, next) => {
    res.status(404).send("<h2 align=center>Page Not Found!</h2>");
});

var myServer = server.listen(config.app.port, "localhost", function () {
    console.log("Example app listening on port ", server.address().port)
})
