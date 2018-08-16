"use strict";
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const server = http.Server(app);
const io = socketIo(server);
const config = require("./config/config.js");
const loki = require("lokijs");
const request = require("request");
const csurf = require('csurf');
const cookieParser = require("cookie-parser");
var csp = require("helmet-csp");
var fs = require("fs");

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set the CSP parameters
app.use(csp({
  // Specify directives as normal.
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    fontSrc:["'self'"],
    imgSrc: ["'self'"],
    reportUri: '/report-violation',
    objectSrc: ["'none'"],
    connectSrc: ["'self'", "ws:", "wss:"],
    // upgradeInsecureRequests: true,
    workerSrc: false  // This is not set.
  },

  // This module will detect common mistakes in your directives and throw errors
  // if it finds any. To disable this, enable "loose mode".
  loose: true,

  // Set to true if you only want browsers to report errors, not block them.
  reportOnly: false,

  // Set to true if you want to blindly set all headers: Content-Security-Policy,
  // X-WebKit-CSP, and X-Content-Security-Policy.
  setAllHeaders: false,

  // Set to true if you want to disable CSP on Android where it can be buggy.
  disableAndroid: true,

  // Set to false if you want to completely disable any user-agent sniffing.
  // This may make the headers less compatible but it will be much faster.
  // This defaults to `true`.
  browserSniff: false
}));

// Storing values from config file
var noOfDaysGraph = config.graph.noOfDays;
var dbSize = config.db.size;

// Create a folder named "db" if not already exists
if (!fs.existsSync('./db')){
    fs.mkdirSync('./db');
}

// DB initialization
var db = new loki(path.join(__dirname, 'db/') + config.db.name, {
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 4000
});

// Pass initial chart parameter.
io.on('connection', function(){
    io.emit("init", {
        'noOfDaysGraph': config.graph.maxNotificationCount,
    });
});

// Handles POST message to "/notifications" endpoint. Updates notifications set, inserts
// new notification, emit a new event to be captured by front end code
app.post("/notifications", async function (req, res) {
    try {
        io.emit("newNotification", {
            eventDetails: (req.body),
        });
        var notifications = await updateNotifications();

        notifications = await insertNewNotification(notifications, req.body);

        res.sendStatus(201);
    }catch(err) {
        console.error("Error happened in posting notifications ", err);
        res.sendStatus(500);
    }
});

// Handles the CSP report violation
app.post('/report-violation', function (req, res) {
    if (req.body) {
      console.log('CSP Violation: ', req.body);
    } else {
      console.log('CSP Violation: No data received!');
    }
    res.status(204).end();
});

app.use(bodyParser.urlencoded({ extended: true }));

// To render html file
app.set('views', path.join(__dirname, 'public'));
app.engine('.html', require('ejs').renderFile);

// Required for CSRF
app.use(cookieParser());

// For protection from CSRF
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

// Handles the homepage url
app.get('/', csrfProtection, function(req, res) {
    res.render('indexPage.html', {csrfToken: req.csrfToken()});
});

// To generate authorization header
const encodedString = Buffer.from(config.apiLoginId + ":" +
                                config.transactionKey).toString("base64");

const headers = { "content-type": "application/json",
                "Authorization": "Basic " + encodedString };

// Request body to get event types
const eventRequestData = {
    url: config.apiEndpoint + "/eventtypes",
    method: "GET",
    headers: headers
};

/**
 * Initialize the collection
 */
function databaseInitialize() {
    if (!db.getCollection("notifications")) {
        db.addCollection("notifications");
    }
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
 * @param {*} notifications
 * @param {Array} eventFilter
 */
async function getMatchingEventsFromDB(notifications, eventFilter, offsetValue, limitValue) {

    if(offsetValue === -1 && limitValue === -1) {
        return notifications.chain().find({eventType: { $in: eventFilter } }).data({removeMeta: true});
    }
    else {
        if(eventFilter.length!= 0) {
            return notifications.chain().find({eventType: { $in: eventFilter } }).offset(offsetValue).limit(limitValue).data({removeMeta: true});
        }

        else {
            return notifications.chain().offset(offsetValue).limit(limitValue).data({removeMeta: true});
        }
    }
}

/**
 * Calculates the date range and values to plot in chart based on input parameters
 * @param {Array} eventFilter
 * @param {Array} eventKeyList
 * @param {string} calculateParameter
 */
async function getGraphData(eventFilter, eventKeyList, calculateParameter) {
    var recentDateMap = calculateLastXDays(noOfDaysGraph);

    var notifications = await getCollectionFunction("notifications");

    var recentDocs = await getMatchingEventsFromDB(notifications, eventFilter, -1, -1);

    // If recentDocs is null, the charts are displayed with all values as zero
    // for each date in recentDateMap
    if(!(eventKeyList === undefined || eventKeyList.length === 0)) {
        eventKeyList.forEach((eventKey) => {
            Object.keys(recentDateMap).forEach((eachDate) => {
                recentDateMap[eachDate][eventKey] = 0;
            });
        });
    }

    recentDocs.forEach( (element) => {
        var tempDate = element.eventDate.slice(0, 10).split('-');
        var elementDate = tempDate[1] +'-'+ tempDate[2] +'-'+ tempDate[0];

        if(elementDate in recentDateMap) {
            Object.keys(recentDateMap[elementDate]).forEach((eventLegend) => {
                if(eventKeyList.includes(eventLegend)) {
                    if(calculateParameter === "Amount") {
                        recentDateMap[elementDate][eventLegend] += parseInt(element.payload.authAmount);
                    }
                    else if(calculateParameter === "Count") {
                        recentDateMap[elementDate][eventLegend] += 1;
                    }
                }
                else {
                    recentDateMap[elementDate][eventLegend] = 0;
                }
            });
        }

    });
    var chartMap = {
        "data": recentDateMap,
        "yaxis": calculateParameter
    };
    return chartMap;
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
                calculateParameter = "Amount";
                break;

        case "Refund":
                eventFilter =  [
                    "net.authorize.payment.refund.created",
                    "net.authorize.payment.void.created"
                ];
                eventKeyList = ["Total Refund Amount"];
                calculateParameter = "Amount";
                break;

        case "Customer":
                eventFilter =  [
                    "net.authorize.customer.created"
                ];
                eventKeyList = ["# of Customer Profile created"];
                calculateParameter = "Count";
                break;

        case "Fraud":
                eventFilter =  [
                    "net.authorize.payment.fraud.held"
                ];
                eventKeyList = ["# of Fraud transactions held"];
                calculateParameter = "Count";
                break;
    }

    var recentDateMap = await getGraphData(eventFilter, eventKeyList, calculateParameter);
    return recentDateMap;
}

/**
 * Returns the oldest notification present
 * @param {*} notifications
 */
async function getOldestNotification(notifications) {
    return notifications.chain().limit(1).data();
}

/**
 * Removes the oldest notification from available set of notifications
 * @param {*} notifications
 * @param {*} oldestNotification
 */
async function removeOldestNotification(notifications, oldestNotification) {
    notifications.remove(oldestNotification);
    return notifications;
}

/**
 * Retrieves and Deletes the oldest notification present in the set of notifications
 * @param {*} notifications
 */
async function handleOldestNotification(notifications) {
    if (notifications.count() >= dbSize) {
        var oldestNotification = await getOldestNotification(notifications);
        notifications = await removeOldestNotification(notifications,oldestNotification);
        return notifications;
    }
    else {
        return notifications;
    }
}

/**
 * Initializes current set of notifications and removes the oldest one from it
 */
async function updateNotifications() {
    var notifications = await getCollectionFunction("notifications");

    notifications = await handleOldestNotification(notifications);

    return notifications;
}

/**
 * Insert incoming new notification into available notifications set and returns the new set
 * @param {*} notifications
 * @param {*} newNotification
 */
async function insertNewNotification(notifications, newNotification) {
    notifications.insert(newNotification);
    return notifications;
}

/**
 * Finds the time values to be plotted in live event chart and returns as an Array
 * @param {Date} startTime
 */
function calculateEventGraphInterval(startTime) {
    // console.log("start time: ", startTime);
    var newTime = new Date(startTime.getTime() + (1000 * config.graph.intervalTimeSeconds));
    var graphTimeList = [], currentTime = new Date(), tempDate;
    // console.log("currentTime", currentTime);
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
 * @param {*} notifications
 * @param {Date} graphStartTime
 */
async function filterToGetGraphEvents(notifications, graphStartTime) {
    return notifications.chain().where(function(obj) {
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
            var notifications = await getCollectionFunction("notifications");

            var graphEvents = await filterToGetGraphEvents(notifications, graphStartTime);

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
 * Returns the count of collection
 * @param {string} collectionName
 */
async function findCollectionsCount(collectionName) {
    return collectionName.count()
}

/**
 * Returns recent notifications by filtering from available set
 * @param {*} notifications
 * @param {*} limit
 */
async function filterToGetRecentNotifications(notifications, limit, eventType) {

    var collectionCount = await findCollectionsCount(notifications);

    var offset = 0, eventFilter = [], limitValue = limit;
    if(eventType === "all") {
        if(collectionCount > limitValue) {
            offset = collectionCount - limitValue;
        }
        else {
            limitValue = collectionCount;
        }
    }

    else {
        limitValue = collectionCount;
        eventFilter = [eventType];
    }

    var recentNotifications = await getMatchingEventsFromDB(notifications, eventFilter, offset, limitValue);

    if(eventType!= "all") {
        if(recentNotifications.length > limit) {
            recentNotifications.splice(0, recentNotifications.length - limit);
        }
    }

    return recentNotifications;
}

/**
 * Calls filterToGetRecentNotifications() to get the required recent notifications and returns it
 * @param {number} limit
 */
async function getRecentNotifications(limit, eventType) {
    try {
        var notifications = await getCollectionFunction("notifications");

        var recentNotifications = await filterToGetRecentNotifications(notifications, limit, eventType);

        return recentNotifications;

    }catch(err) {
        console.error("Error happened in getting recent notifications ", err);
        return [];
    }
}

// Endpoint to return recent requested number of notifications
app.get("/notifications", csrfProtection, async function(req, res) {
    var recentNotifications = await getRecentNotifications(req.query.limit, req.query.name);
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

// Endpoint to get all the charts data
app.get("/charts", csrfProtection, async function (req, res) {
    var returnValue;
    try{
        if(req.query.name === "all"){
            returnValue = await getAllEventsChart();
        }
        else
            returnValue = await setGraphCriteria(req.query.name);

    }catch(err) {
        console.log("Error in GET /charts ", err)
    }
    returnApiResponse(res, returnValue);
});

/**
 * Makes API call and gets the available eventtypes
 * @param {Function} callback(eventTypes): called after the getting eventTypes
 */
function getEvents(callback) {
    request(eventRequestData, function (error, response, body) {
        if(error) {
            console.error("Error in request getevents ", error);
            var errorMessage = {};
            errorMessage.message = "Error in getting available EventTypes from ANET. Please try again";
            callback(errorMessage)
        }
        else {
            callback(JSON.parse(body))
        }
    });
}


// Handles "/eventtypes" GET endpoint. Calls getEvents() to get available eventTypes.
// Sends the response with error message or eventTypes
app.get('/eventtypes', csrfProtection, function (req, res) {
    getEvents(function(allEventTypes) {
        res.send(allEventTypes);
    });
});

// error handler
app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err)

    // handle CSRF token errors here
    res.status(403);
    res.send("CSRF token validation failed. Suspicious request!!");
})

// Handles invalid URL
app.use((req, res) => {
    res.status(404).send("<h2 align=center>Page Not Found!</h2>");
});

// App listens on the configured port in config.js file
server.listen(config.app.port, function () {
    console.log("Application listening on port ", server.address().port);
});
