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

/**
 * Initialize the collection
 */
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

/**
 * Returns a map of recent x dates as keya a and empty olbject as values
 * @param {number} x 
 */
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

/**
 * Filter based on event list from DB
 * @param {*} testnotifications 
 * @param {Array} eventFilter 
 */
async function getMatchingEventsFromDB(testnotifications, eventFilter) {
    return testnotifications.find({eventType: { $in: eventFilter } });
} 

/**
 * Calculates the date range and values to plot in chart based on input parameters
 * @param {Array} eventFilter 
 * @param {Array} eventKeyList 
 * @param {string} calculateParameter 
 */
async function getGraphData(eventFilter, eventKeyList, calculateParameter) {
    var recentDateMap = calculateLastXDays(noOfDaysGraph);
    
    var testnotifications = await getCollectionFunction("testnotifications");

    var recentDocs = await getMatchingEventsFromDB(testnotifications, eventFilter);

    // If recentDocs is null, the charts are displayed with all values as zero
    // for each date in recentDateMap
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

/**
 * Define what to display in the chart and call getGraphData() with it
 * @param {string} eventCategory 
 */
async function setGraphCriteria(eventCategory) {
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
                eventKeyList = ["Total Refund Amount"];
                calculateParameter = "amount";
                break;
        
        case "Customer":
                eventFilter =  [
                    "net.authorize.customer.created"
                ];
                eventKeyList = ["# of Customer Profile created"];
                calculateParameter = "count";
                break;
        
        case "Fraud":
                eventFilter =  [
                    "net.authorize.payment.fraud.held"
                ];
                eventKeyList = ["# of Fraud transactions held"];
                calculateParameter = "count";
                break;
    }

    var recentDateMap = await getGraphData(eventFilter, eventKeyList, calculateParameter);
    return recentDateMap;
}

/**
 * Returns the oldest notification present
 * @param {*} testnotifications 
 */
async function getOldestNotification(testnotifications) {
    return testnotifications.chain().limit(1).data();
}

/**
 * Removes the oldest notification from available set of notifications
 * @param {*} testnotifications 
 * @param {*} oldestNotification 
 */
async function removeOldestNotification(testnotifications, oldestNotification) {
    testnotifications.remove(oldestNotification);
    return testnotifications;
}

/**
 * Retrieves and Deletes the oldest notification present in the set of notifications
 * @param {*} testnotifications 
 */
async function handleOldestNotification(testnotifications) {
    if (testnotifications.count() >= dbSize) {
        var oldestNotification = await getOldestNotification(testnotifications);
        testnotifications = await removeOldestNotification(testnotifications,oldestNotification);
        return testnotifications;
    }
    else {
        return testnotifications;
    }
}

/**
 * Initializes current set of notifications and removes the oldest one from it
 */
async function updateNotifications() {
    var testnotifications = await getCollectionFunction("testnotifications");
    testnotifications = await handleOldestNotification(testnotifications);

    console.log("testnotifications.count after removing ", testnotifications.count());
    return testnotifications;
}

/**
 * Insert incoming new notification into available notifications set and returns the new set
 * @param {*} testnotifications 
 * @param {*} newNotification 
 */
async function insertNewNotification(testnotifications, newNotification) {
    testnotifications.insert(newNotification);
    return testnotifications;
}

/**
 * Handles POST message to "/notifications" endpoint. Updates notifications set, inserts
 * new notification, emit a new event to be captured by front end code
 */
app.post("/notifications", async function (req, res) {
    try {
        var testnotifications = await updateNotifications();

        testnotifications = await insertNewNotification(testnotifications, req.body);
        
        console.log("testnotifications.count after inserting new notification", testnotifications.count());
        
        io.emit("newNotification", {
            eventDetails: (req.body),
        });

        res.sendStatus(201);
    }catch(err) {
        console.error("Error happened in posting notifications ", err);
        res.sendStatus(500);
    }
});

/**
 * Finds the time values to be plotted in live event chart and returns as an Array
 * @param {Date} startTime 
 */
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

/**
 * Gets the collection from database
 * @param {string} collectionName 
 */
async function getCollectionFunction(collectionName) {
    return db.getCollection(collectionName);
}

/**
 * Returns the mapping of eventType and it count of occurrence
 * @param {Array} graphTimeList 
 * @param {*} graphEvents 
 */
function findEventsFrequencyInGraphInterval(graphTimeList, graphEvents) {
    var eventFrequencyAtEachTimeMap = {}; // {"event1": [4,0,3,1,0,6,2,3,0,0], "event2": [0,0,5,3,2,0,5,7,8,9]}
    if(graphEvents) {
        graphEvents.forEach(function(event) {
            var timeDiff = Math.abs(new Date(event.eventDate).getTime() - new Date(graphTimeList[0]).getTime());
            var index = Math.ceil(timeDiff/ (config.graph.intervalTimeSeconds * 1000));
            
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

/**
 * Returns the notifications occurred after the graph start time
 * @param {*} testnotifications 
 * @param {Date} graphStartTime 
 */
async function filterToGetGraphEvents(testnotifications, graphStartTime) {
    return testnotifications.chain().where(function(obj) {
        return  graphStartTime < new Date(obj.eventDate)}).data({removeMeta: true});
} 

/**
 * Returns the data required for live event chart
 */
async function getAllEventsChart() {
        var currentTime = new Date();
        var calculateFromTime = new Date(new Date().setTime(currentTime.getTime()- (1000 * config.graph.intervalTimeSeconds * config.graph.graphTimeScale)));
        var graphStartTime = new Date(calculateFromTime.getTime() + (1000 * config.graph.intervalTimeSeconds));
    
        var graphTimeList = calculateEventGraphInterval(calculateFromTime);
        try {
            var testnotifications = await getCollectionFunction("testnotifications");

            var graphEvents = await filterToGetGraphEvents(testnotifications, graphStartTime);

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
 * Returns recent notifications by filtering from available set
 * @param {*} testnotifications 
 * @param {*} limit 
 */
async function filterToGetRecentNotifications(testnotifications, limit) {
    var recentNotifications;
    if (testnotifications.count() > limit) {
        var maxId = testnotifications.maxId;
        var recentNotifications = testnotifications
                                .chain()
                                .find({ $loki: { $between: [maxId - limit + 1, maxId] } })
                                .data({removeMeta: true});
    }
    // If requesting count of notifications is more than number of notifications
    // present in database, return all available notifications in database
    else
        var recentNotifications = testnotifications
                                .chain()
                                .data({removeMeta: true});
    return recentNotifications;
}

/**
 * Calls filterToGetRecentNotifications() to get the required recent notifications and returns it
 * @param {number} limit 
 */
async function getRecentNotifications(limit) {
    try {
        var testnotifications = await getCollectionFunction("testnotifications");

        var recentNotifications = await filterToGetRecentNotifications(testnotifications, limit);
    
        return recentNotifications;
    }catch(err) {
        console.error("Error happened in getting recent notifications ", err);
        return [];
    }
}

/**
 * Endpoint to return recent requested number of notifications
 */
app.get("/notifications", async function(req, res) {
     
    var recentNotifications = await getRecentNotifications(req.query.limit);
    console.log(recentNotifications);
    returnApiResponse(res, recentNotifications);
});

/**
 * Sends the API response.
 * @param {*} res - Response Object.
 * @param {*} returnJsonValue Value to be returned from the API
 */
function returnApiResponse(res, returnJsonValue) {
    res.format({
        json: function () {
            res.send(returnJsonValue);
        },
        html: function () {
            res.json({
                error: "Page not found !!"
            });
        },
    });
}

/**
 * Endpoint to get all the charts data
 */
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

/**
 * Handles invalid URL
 */
app.use((req, res) => {
    res.status(404).send("<h2 align=center>Page Not Found!</h2>");
});

/**
 * App listens on the configured port in config.js file
 */
server.listen(config.app.port, config.app.host, function () {
    console.log("Application listening on port ", server.address().port);
});
