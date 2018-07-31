"use strict";
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const server = http.Server(app);
const io = socketIo(server);
const config = require("./config/config");
const loki = require("lokijs");

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var noOfDaysGraph = config.graph.noOfDays;
var dbSize = config.db.size;
var db = new loki(config.db.name, {
  autoload: true,
  autoloadCallback: databaseInitialize,
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

    // console.log("available testnotif are :\n", db.getCollection("testnotifications").find())
    // db.getCollection("testnotifications").chain().remove();
}

function calculateLastXDays(x) {
    var recentDateMap = {};
    var tempDate;
    while (x > 0) {
        var someDate = new Date(new Date().setDate(new Date().getDate()- x + 1)).toISOString().slice(0,10).split('-');   
        tempDate = someDate[1] +'-'+ someDate[2] +'-'+ someDate[0];
        recentDateMap[tempDate] = {};
        --x;
    }
    return recentDateMap;
}

function getGraphData(eventFilter, eventKeyList, calculateParameter, filterObject) {
    var recentDateMap = calculateLastXDays(noOfDaysGraph);
    var testnotifications = db.getCollection("testnotifications");
    var recentDocs = testnotifications.find({eventType: { $in: eventFilter } });
    // TODO: null check recentDocs
    // TODO: ends here
    if(!(eventKeyList === undefined || eventKeyList.length === 0)) {
        eventKeyList.forEach((eventKey) => {
            Object.keys(recentDateMap).forEach((eachDate) => {
                recentDateMap[eachDate][eventKey] = 0;
            });
        });
    }

    console.log("recentDocs ", recentDocs.length);
    recentDocs.forEach( (element) => {
        var tempDate = element.eventDate.slice(0, 10).split('-');   
        var elementDate = tempDate[1] +'-'+ tempDate[2] +'-'+ tempDate[0];
        
        if(elementDate in recentDateMap) {
            Object.keys(recentDateMap[elementDate]).forEach((eventLegend) => {
                if(eventKeyList.includes(eventLegend)) {
                    if(calculateParameter === "amount") {
                        recentDateMap[elementDate][eventLegend] += parseInt(element.payload.authAmount);
                    }
                    else if(calculateParameter === "count") {
                        recentDateMap[elementDate][eventLegend] += 1;
                    }
                }
                else {
                    recentDateMap[elementDate][eventLegend] = 0;
                }
            });
        }

    });
    return recentDateMap;
}

function setGraphCriteria(eventCategory) {
    var eventFilter, eventKeyList, calculateParameter;
    switch(eventCategory) {
        case "Payment":
                eventFilter =  [
                    "net.authorize.payment.authcapture.created",
                    "net.authorize.payment.priorAuthCapture.created",
                    "net.authorize.payment.capture.created"
                ];
                // eventKeyList = ["Total Amount", "second dataset"];
                eventKeyList = ["Total Payment Amount"];
                calculateParameter = "amount";
                break;
        case "Refund":
                eventFilter =  [
                    "net.authorize.payment.refund.created",
                    "net.authorize.payment.void.created"
                ];
                eventKeyList = ["Refund Amount"];
                calculateParameter = "amount";
                break;
        case "Customer":
                eventFilter =  [
                    "net.authorize.customer.created"
                ];
                // eventKeyList = ["# of Payment Profile", "# of Subscription Created"];
                eventKeyList = ["# of Payment Profile created"];
                calculateParameter = "count";
                break;
        case "Fraud":
                eventFilter =  [
                    "net.authorize.payment.fraud.held"
                ];
                eventKeyList = ["Fraud held Amount"];
                calculateParameter = "amount";
                break;
    }

    return getGraphData(eventFilter, eventKeyList, calculateParameter, filterObject);
}

app.post("/notifications", function (req, res) {
    var testnotifications = db.getCollection("testnotifications");
    if (testnotifications.count() >= dbSize) {
        // Get oldest entry available in the DB (event with oldest eventDate)
        var oldestNotification = testnotifications.chain()
                                 .limit(1).data();
        testnotifications.remove(oldestNotification);
    }
    testnotifications.insert(req.body);
    io.emit("new event", {
        eventDetails: (req.body),
        // eventsCountList: eventsfrequencyWithoutMetadata
    });
    res.sendStatus(200);
});

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
    return graphTimeList;
}

function getCollectionFunction(collectionName) {
    return new Promise((resolve) => resolve(db.getCollection(collectionName)));
}

function findEventsFrequencyInGraphInterval(graphTimeList, graphEvents) {
    var eventFrequencyAtEachTimeMap = {}; // {"event1": [4,0,3,1,0,6,2,3,0,0], "event2": [0,0,5,3,2,0,5,7,8,9]}
    if(graphEvents) {
        graphEvents.forEach(function(event) {
            var timeDiff = Math.abs(new Date(event.eventDate).getTime() - new Date(graphTimeList[0]).getTime());
            var index = Math.ceil(timeDiff/ (config.graph.intervalTimeSeconds * 1000));
            // console.log(" graphtimelist length =", graphTimeList.length);
            // console.log(event.eventType, " occured at ", event.eventDate, "and index is ", index);
            // console.log(event.eventType, " occured at ", event.eventDate, "and index is ", index, "to insert at ", graphTimeList[index].toISOString());
            if (eventFrequencyAtEachTimeMap[event.eventType] === undefined || eventFrequencyAtEachTimeMap[event.eventType].length == 0) {
                eventFrequencyAtEachTimeMap[event.eventType] = new Array(config.graph.graphTimeScale).fill(0);
                eventFrequencyAtEachTimeMap[event.eventType][index-1] = 1;
            }
            else {
                eventFrequencyAtEachTimeMap[event.eventType][index-1] += 1;
            }
        });
    }
    else {
        console.log("no events occured in requested interval");
    }
    return eventFrequencyAtEachTimeMap;
}

async function getGraphEventsFromDB(testnotifications, graphStartTime) {
    return testnotifications.chain().where(function(obj) {
        return  graphStartTime < new Date(obj.eventDate)}).data();
} 

async function getAllEventsChart() {
        var currentTime = new Date();
        var calculateFromTime = new Date(new Date().setTime(currentTime.getTime()- (1000 * config.graph.intervalTimeSeconds * config.graph.graphTimeScale)));
        var graphStartTime = new Date(calculateFromTime.getTime() + (1000 * config.graph.intervalTimeSeconds));
    
        var graphTimeList = calculateEventGraphInterval(calculateFromTime);
        try {
            var testnotifications = await getCollectionFunction("testnotifications");

            var graphEvents = await getGraphEventsFromDB(testnotifications, graphStartTime);

            var eventFrequencyAtEachTimeMap = findEventsFrequencyInGraphInterval(graphTimeList, graphEvents);

            return {
                eventFrequencyAtEachTimeMap: eventFrequencyAtEachTimeMap,
                graphStartTime: graphTimeList[1],
                intervalTimeSeconds: config.graph.intervalTimeSeconds
            };
        }catch(err) {
            console.error("Error happened in getting graphEvents ", err);
            return {};
        }
}

/**
 * API endpoint to return recent requested number of notifications
 */
app.get("/notifications", async function(req, res) {
    var testnotifications = db.getCollection("testnotifications");
    var recentNotifications;
    // If requesting count of notifications is less than number of notifications
    // present in database, return the most recent requested number of
    // notifications
    console.log("NoOfRecentEventsToDisplay ", req.query.limit);
    if (testnotifications.count() > req.query.limit) {
        var maxId = testnotifications.maxId;
        recentNotifications = testnotifications
                                .chain()
                                .find({ $loki: { $between: [maxId - req.query.limit + 1, maxId] } })
                                .data({removeMeta: true});
    }
    // If requesting count of notifications is more than number of notifications
    // present in database, return all available notifications in database
    else
        recentNotifications = testnotifications
                                .chain()
                                .data({removeMeta: true});

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
            // res.json({
            //     error: "Page not found !!"
            // });
            res.send(returnJsonValue);
        },
        json: function () {
            // res.json(returnJsonValue);
            res.send(returnJsonValue);
        }
    });
}

app.get("/charts", async function (req, res) {
    console.log("------------------------------------");
    // console.log("request graph parameter in /notif is: ", req.graph);
    var returnValue;
    if(req.query.name === "all"){
        returnValue = await getAllEventsChart();
    }
    else
        returnValue = await setGraphCriteria(req.query.name);
    // console.log("return value in get notif", returnValue);
    returnApiResponse(res, returnValue);
});

app.use((req, res, next) => {
    res.status(404).send("<h2 align=center>Page Not Found!</h2>");
});

server.listen(config.app.port, config.app.host, function () {
    console.log("Application listening on port ", server.address().port);
});
