const express = require("express");
const app = express();
const request = require("request");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const server = http.Server(app);
const cors = require("cors");
const io = socketIo(server);
const config = require("./config/config");
const loki = require("lokijs");

const encodedString = Buffer.from(config.apiLoginId + ":" +
                                config.transactionKey).toString("base64");

const headers = { "content-type": "application/json",
                "Authorization": "Basic " + encodedString };

const eventRequestData = {
    url: config.apiEndpoint + "/eventtypes",
    method: "GET",
    headers: headers
};

const webhooksRequestData = {
    url: config.apiEndpoint + "/webhooks",
    method: "GET",
    headers: headers
};

const webhooksPostData = {
    url: config.apiEndpoint + "/webhooks",
    method: "POST",
    headers: headers,
    json: true
};

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var noOfDaysGraph = config.graph.noOfDays;
var dbSize = config.db.size;
var db = new loki(config.db.name, {
         autoload: true,
         autoloadCallback : databaseInitialize,
         autosave: true,
         autosaveInterval: 4000
});

function databaseInitialize() {
    if (!db.getCollection("notifications")) {
        db.addCollection("notifications");
    }

    if (!db.getCollection("testnotifications")) {
        db.addCollection("testnotifications");
    }

    if (!db.getCollection("eventsFrequency")) {
        db.addCollection("eventsFrequency");
    }
    // console.log("available testnotif are :\n", db.getCollection("testnotifications").find())
    
    // calculateEventGraphInterval(graphStartTime, 300);
}

function calculateLastXDays(x) {
    var recentDateMap = {};
    var tempDate;
    while (x > 0) {
        tempDate = new Date(new Date().setDate(new Date().getDate()- x + 1))
                   .toISOString().slice(0, 10);
        recentDateMap[tempDate] = 0;
        --x;
    }
    return recentDateMap;
}

function getRecentGraph(eventCategory, noOfDays) {
    var recentDateMap = calculateLastXDays(noOfDays);
    var testnotifications =  db.getCollection("testnotifications");
    var eventFilter;
    if(eventCategory === "payment"){
        eventFilter =  [
            "net.authorize.payment.authcapture.created",
            "net.authorize.payment.priorAuthCapture.created",
            "net.authorize.payment.capture.created"
        ];
    }
    else if(eventCategory === "refund"){
        eventFilter =  [
            "net.authorize.payment.refund.created",
            "net.authorize.payment.void.created"
        ];
    }

    var recentDocs = testnotifications.find({eventType: { $in: eventFilter } });
    // console.log("payment doc count: ", recentDocs.length)
    recentDocs.forEach( (element) => {
        var elementDate = new Date(element.eventDate)
                          .toISOString().slice(0, 10);
        if(elementDate in recentDateMap) {
            recentDateMap[elementDate] +=  parseInt(element.payload.authAmount);
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
    var testnotifications = db.getCollection("testnotifications");
    if (testnotifications.count() == dbSize) {
        // Get oldest entry available in the DB (event with oldest eventDate)
        var oldestNotification = testnotifications.chain()
                                 .simplesort("eventDate").limit(1).data();
        testnotifications.remove(oldestNotification);
        // Decrement the oldest event's count in eventsFrequency collection
        decrementEventOccurrence(oldestNotification[0].eventType);
    }
    testnotifications.insert(req.body);
    incrementEventOccurrence(req.body.eventType);
    var eventsFrequency = db.getCollection("eventsFrequency");
    var eventsfrequencyWithoutMetadata = eventsFrequency
                                         .chain().data({removeMeta: true});
    io.emit("new event", {
        eventDetails: (req.body),
        eventsCountList: eventsfrequencyWithoutMetadata
    });
    res.sendStatus(200);
});

function decrementEventOccurrence(event) {
    var eventsFrequency = db.getCollection("eventsFrequency");
    var currentEvent = eventsFrequency.findOne({eventType: event });
    currentEvent.count = currentEvent.count - 1;
    eventsFrequency.update(currentEvent);
}

function incrementEventOccurrence(event) {
    var eventsFrequency = db.getCollection("eventsFrequency");
    var currentEvent = eventsFrequency.findOne({eventType: event });
    if(currentEvent) {
        currentEvent.count = currentEvent.count + 1;
        eventsFrequency.update(currentEvent);
    }
    else {
        eventsFrequency.insert({eventType: event, count: 1});
    }
}

function calculateEventGraphInterval(startTime) {
    console.log("start time: ", startTime);
    var newTime = new Date(startTime.getTime() + (1000 * config.graph.intervalTimeSeconds));
    var graphTimeList = [], currentTime = new Date(), tempDate;
    
    console.log("currentTime", currentTime);
    tempDate = startTime.toISOString().slice(0, 24);
    graphTimeList.push(startTime);

    while(newTime <= currentTime) {
        tempDate = newTime.toISOString().slice(0, 24);
        graphTimeList.push(newTime);
        newTime = new Date(newTime.getTime() + (1000 * config.graph.intervalTimeSeconds));
    }
    console.log("time list:\n", graphTimeList);
    return graphTimeList;
}

function getCollectionFunction(collectionName) {
    return new Promise((resolve) => resolve(db.getCollection(collectionName)));
}

function findEventsFrequencyInGraphInterval(graphTimeList, graphEvents) {
    
    var eventFrequencyAtEachTimeMap = {}; // {"event1": [4,0,3,1,0,6,2,3,0,0], "event2": [0,0,5,3,2,0,5,7,8,9]}
    if(graphEvents) {
        graphEvents.forEach(function(event) {
            timeDiff = Math.abs(new Date(event.eventDate).getTime() - new Date(graphTimeList[0]).getTime());
            var index = Math.ceil((timeDiff/ (config.graph.intervalTimeSeconds * 1000)));
            console.log(event.eventType, " occured at ", event.eventDate, "and index is ", index, "to insert at ", graphTimeList[index].toISOString());
            if (eventFrequencyAtEachTimeMap[event.eventType] === undefined || eventFrequencyAtEachTimeMap[event.eventType].length == 0) {
                eventFrequencyAtEachTimeMap[event.eventType] = Array(config.graph.graphTimeScale).fill(0);
                eventFrequencyAtEachTimeMap[event.eventType][index-1] = 1;
            }
            else 
                eventFrequencyAtEachTimeMap[event.eventType][index-1] += 1;
        });
    }
    else
        console.log("no events occured in requested interval");
    return eventFrequencyAtEachTimeMap;
}

app.get("/eventsGraphData", async function(req, res) {
    var currentTime = new Date();
    var calculateFromTime = new Date(new Date().setTime(currentTime.getTime()- (1000 * config.graph.intervalTimeSeconds * config.graph.graphTimeScale)));
    var graphStartTime = new Date(calculateFromTime.getTime() + (1000 * config.graph.intervalTimeSeconds));

    var graphTimeList = calculateEventGraphInterval(calculateFromTime);
    
    getCollectionFunction("testnotifications")
        .then((testnotifications) => {
            var graphEvents = testnotifications.chain().where(function(obj) {
                return  graphStartTime < new Date(obj.eventDate)}).data();
            return graphEvents;
        })
        .then((graphEvents) =>{
            var eventFrequencyAtEachTimeMap = findEventsFrequencyInGraphInterval(graphTimeList, graphEvents);
            var returnJsonValue = {
                eventFrequencyAtEachTimeMap: eventFrequencyAtEachTimeMap,
                graphStartTime: graphTimeList[1],
                intervalTimeSeconds: config.graph.intervalTimeSeconds
            }
            returnApiResponse(res, returnJsonValue);
        })
        .catch((err) => { console.log("error happened in getting graphEvents") })
    
});

/**
 * API endpoint to return recent requested number of notifications
 */
app.get("/recentNotifications", async function(req, res) {
    var testnotifications = db.getCollection("testnotifications");
    var recentNotifications = testnotifications.chain()
                              .simplesort("eventDate");
    // If requesting count of notifications is less than number of notifications
    // present in database, return the most recent requested number of
    // notifications
    if (testnotifications.count() > req.query.count)
        recentNotifications = recentNotifications
                              .limit(req.query.count)
                              .data({removeMeta: true});

    // If requesting count of notifications is more than number of notifications
    // present in database, return all available notifications in database
    else
        recentNotifications = recentNotifications
                              .data({removeMeta: true});
    // Formatting in JSON style
    var returnJsonValue = {
        recentNotifications: recentNotifications,
    };
    returnApiResponse(res, recentNotifications);
});

/**
 * Sends the API response.
 * @param {*} res - Response Object.
 * @param {*} returnJsonValue Value to be returned from the API
 */
function returnApiResponse(res, returnJsonValue) {
    res.format({
        html: function () {
            res.json({
                error: "Page not found !!"
            });
        },
        json: function () {
            res.json(returnJsonValue);
        }
    })
}

app.get("/notifications", async function (req, res) {
    console.log("------------------------------------");
    // console.log("request graph parameter in /notif is: ", req.graph);
    var returnValue;
    if(req.query.name === "all"){
        var eventsFrequency = db.getCollection("eventsFrequency");
        returnValue = eventsFrequency.chain().data({removeMeta: true});
    }
    else
        returnValue = await getRecentGraph(req.query.name, noOfDaysGraph);
    // Formatting in JSON style
    var returnJsonValue = {
        paymentDetail: returnValue,
    };
    returnApiResponse(res, returnJsonValue);
});

app.use((req, res, next) => {
    res.status(404).send("<h2 align=center>Page Not Found!</h2>");
});

var myServer = server.listen(config.app.port, "localhost", function () {
    console.log("Application listening on port ", server.address().port)
});
