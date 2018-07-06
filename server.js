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
const loki = require("lokijs");

const encodedString = Buffer.from(config.apiLoginId + ":" +
                                config.transactionKey).toString("base64");

const headers = { "content-type": "application/json",
                "Authorization": "Basic " + encodedString };

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

var noOfDaysGraph = 7;
var dbSize = 5;
var db = new loki("notification.db", {
	autoload: true,
	autoloadCallback : databaseInitialize,
	autosave: true, 
	autosaveInterval: 4000
});

function databaseInitialize() {
    if (!db.getCollection("notifications")) {
        db.addCollection("notifications");
    }

    if (!db.getCollection("eventsFrequency")) {
        db.addCollection("eventsFrequency");
    }
}
console.log("-------------------------------");

function calculateLastXDays(x) {
    var recentDateMap = {};
    while (x > 0) {
        var tempDate = new Date(new Date().setDate(new Date().getDate()- x + 1)).toISOString().slice(0, 10);
        recentDateMap[tempDate] = 0;
        --x;
    }
    return recentDateMap;
}

function getRecentPayment(x) {
    var recentDateMap = calculateLastXDays(x);
    var notifications =  db.getCollection("notifications");
    var paymentDocs = notifications.find({eventType: 
        { $in: 
            [
                'net.authorize.payment.authcapture.created', 
                'net.authorize.payment.priorAuthCapture.created',
                'net.authorize.payment.capture.created'
            ]
        } 
    });
    // console.log("payment doc count: ", paymentDocs.length)
    paymentDocs.forEach(element => {
        var elementDate = new Date(element.eventDate).toISOString().slice(0, 10);
        if(elementDate in recentDateMap) {
            recentDateMap[elementDate] +=  parseInt(element.payload.authAmount);;
        }
    });
    // console.log("recentdate map is\n ", recentDateMap);
    return recentDateMap;

}

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
            errorMessage.message = "Some Error occured";
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
    var notifications = db.getCollection("notifications");
    if (notifications.count() == dbSize) {
        // Get oldest entry available in the DB (event with oldest eventDate)
        var oldestNotification = notifications.chain().simplesort("eventDate").limit(1).data();
        notifications.remove(oldestNotification);
        // Decrement the oldest event's count in eventsFrequency collection
        decrementEventOccurrence(oldestNotification[0].eventType);
    }
    notifications.insert(req.body);
    incrementEventOccurrence(req.body.eventType);

    // console.log("after inserting \n", notifications.find());
    var eventsFrequency = db.getCollection("eventsFrequency");
    var eventsfrequencyWithoutMetadata = eventsFrequency.chain().data({removeMeta: true});
    io.emit("new event", {
        eventDetails: (req.body),
        eventsCount: eventsfrequencyWithoutMetadata,
    })
    
    res.sendStatus(200);
})

function decrementEventOccurrence(event) {
    var eventsFrequency = db.getCollection("eventsFrequency");
    var currentEvent = eventsFrequency.findOne({eventType: event });
    currentEvent.count = currentEvent.count - 1;
    eventsFrequency.update(currentEvent);
    console.log("count reduced for the event ", event);
}

function incrementEventOccurrence(event) {
    console.log("occured event in incrementEventOccurrence: ", event);
    var eventsFrequency = db.getCollection("eventsFrequency");

    var currentEvent = eventsFrequency.findOne({eventType: event });
    if(currentEvent) {
        currentEvent.count = currentEvent.count + 1;
        eventsFrequency.update(currentEvent);
    }
    else
        eventsFrequency.insert({eventType: event, count: 1});
    console.log("after inserting eventfrequency \n", eventsFrequency.find());
}

app.get("/notifications", async function (req, res) {
    var recentDateMap = await getRecentPayment(noOfDaysGraph);
    res.format({
        html: function () {
            console.log("\n inside html\n");
            res.json({
                error: "Page not found"
            });
        },
        json: function () {
            res.json({
                paymentDetail: recentDateMap,
            });
        }
    })
})

app.use((req, res, next) => {
    res.status(404).send("<h2 align=center>Page Not Found!</h2>");
});

var myServer = server.listen(config.app.port, "localhost", function () {
    console.log("Example app listening on port ", server.address().port)
});
