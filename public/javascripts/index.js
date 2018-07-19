var socket = io();
/**
 * Display either Event monitoring or dashboard of graphs
 * when the respective button is clicked
 */
$(() => {
    $("#includedContent").load("../mainChart.html");
    // $("#includedContent").load("../charttest.html");

    $("#chart").click(() => {
        $(".eventMonitoring").css("display", "none");
        $("#includedContent").css("display", "block");
    });

    $("#currentEvents").click(async () => {
        $("#includedContent").css("display", "none");
        $(".eventMonitoring").css("display", "block");
    });
});

/**
 * Call API to populate the recent events when the either
 * page is initially loaded or refreshed
 */
$.getJSON("/recentNotifications", { count: 5 }, function (results) {
    results.forEach((element) =>
                    displayEventMessage(element.eventType, element));
});

/**
 * Calls the API in the backend to get all the webhooks
 * created by the merchant. Creates the mapping between
 * an event and its associated webhooks. 
 * 
 */
async function getWebhookEventDetails() {
    var webhookWebhookEventDict = {};
    $.get("http://127.0.0.1:9000/webhooks", async function (data) {
        data.forEach((webhook) => {
            webhook.eventTypes.forEach((event) => {
                if (!webhookWebhookEventDict[event])
                    webhookWebhookEventDict[event] = []
                webhookWebhookEventDict[event].push(webhook.webhookId);
            })
        })
        var webhookEventMessage = "";
        for (var key in webhookWebhookEventDict)
            webhookEventMessage += await addWebhookEventMessage(key, webhookWebhookEventDict[key]);
        printWebhookEventMessage(webhookEventMessage);
        // Adds serial number for the table having class as "js-serial".
        addRowCount(".js-serial");
    });
}

async function printWebhookEventMessage(webhookEventMessage) {
    $("#messageList").append(
        `<table class="table table-striped table-bordered table-hover table-condensed js-serial">
            <thead>
                <tr>
                    <th>Event</th>
                    <th>Webhook</th>
                </tr>
            </thead>
            <tbody> ${webhookEventMessage} </tbody>
        </table>`
    );
    $("#messageList").textContent = "";
}

async function addWebhookEventMessage(key, value) {
    var webhookId = "";
    value.forEach((webhook) => {
        console.log("\neach webhookid is ", webhook)
        webhookId += webhook + "<br />";
    })
    var webhookEventMessage =
        "<tr>" +
        "<td>" + key + "</td>" +
        "<td>" + webhookId + "</td>" +
        "</tr>";
    return webhookEventMessage;
}

/**
 * Socket listens for new event that is emitted in the server side.
 * Calls onNewEvent method when a new event occurs and updates the graph
 */
socket.on("new event", (body) => {
    onNewEvent(body);
    // plotAllGraphs();
});

/**
 * Removes the net.authorize from the eventType and formats
 * the remaining string.
 * Eg. Converts "net.authorize.payment.capture.created" to 
 * PAYMENT CAPTURE CREATED
 * @param {string} eventType 
 */
function extracteventNameFromEventType(eventType) {
    var eventName = eventType.split(".").slice(2)
                    .join(" ").toUpperCase();
    console.log("event is ", eventName);
    return eventName;
}

/**
 * Formats the event date into only date time format
 * Converting "2018-07-21T20:52:59.2144524Z" to "2018-07-21 20:52:59"
 * @param {string} eDate 
 */
function formatEventDate(eDate) {
    var eventDate = eDate.split("T");
    eventDate[1] = eventDate[1].split(".")[0];
    eventDate = eventDate.join(" ");
    return eventDate;
}

function onNewEvent(body) {
    var eventName = extracteventNameFromEventType(body.eventDetails.eventType);
    displayEventMessage(eventName, body.eventDetails);
    displayEventsCount(body.eventDetails.eventType, body.eventsCountList);
}

// Display each events occurence count on the right side
function displayEventsCount(eventType, eventsCountList) {
    var eventsCountDiv = document.getElementById("divEventsCount");
    var currentEvent = eventsCountList.find( 
                (event) => event.eventType === eventType);
    if(currentEvent.count > 1) {
        console.log("yes");
        try {
            document.getElementById(eventType).getElementsByTagName("span")[1].textContent = currentEvent.count;
        }catch(e) {
            console.log("error in getting tagname");
        }
        console.log("new badge value: ", currentEvent.count);
    }
    else {
        console.log("no");
        var newLabel = document.createElement("label");
        newLabel.id = eventType;
        newLabel.classList.add("btn", "btn-default", "active");

        var inputCbx = document.createElement("input");
        inputCbx.type = "checkbox";
        newLabel.appendChild(inputCbx);

        var spnTick = document.createElement("span");
        spnTick.classList.add("glyphicon", "glyphicon-ok");
        newLabel.appendChild(spnTick);

        var textEventName = document.createTextNode(" " + eventType + " ");
        newLabel.appendChild(textEventName);

        var spnBadge = document.createElement("span");
        spnBadge.classList.add("badge");

        var textEventCount = document.createTextNode("" + currentEvent.count);
        spnBadge.appendChild(textEventCount);
        newLabel.appendChild(spnBadge);

        eventsCountDiv.appendChild(newLabel);
    }
}

// Display new event's timestamp, eventtype and payload as and when it occurs.
async function displayEventMessage(eventName, eventDetails) {
    var payload;
    var eventDate = formatEventDate(eventDetails.eventDate);
    var mainPanel = document.getElementById("panelCurrentEvent");
    if(mainPanel.childElementCount == 5)
        mainPanel.removeChild(mainPanel.lastChild);

    var newPanel = document.createElement("div");
    newPanel.classList.add("panel", "panel-success");

    var newPanelRow = document.createElement("div");
    newPanelRow.classList.add("row");
    newPanelRow.setAttribute("style", "background-color: khaki;")

    var newPanelColTimestamp = document.createElement("div");
    newPanelColTimestamp.classList.add("col-md-2");
    var ColTimestampTextnode = document.createTextNode("" + eventDate);
    newPanelColTimestamp.appendChild(ColTimestampTextnode);

    var newPanelColEventtype = document.createElement("div");
    newPanelColEventtype.classList.add("col-md-6");
    var ColEventtypeTextnode = document.createTextNode("" + eventDetails.eventType);
    newPanelColEventtype.style.wordBreak = "break-all";
    newPanelColEventtype.appendChild(ColEventtypeTextnode);

    var newPanelColPayload = document.createElement("div");
    newPanelColPayload.classList.add("col-md-4");
    var ColPayloadTextnode = document.createElement("pre");
    ColPayloadTextnode.setAttribute("style", "background-color: lightgreen;");
    // Remove '{' and '}' from JSON String
    var formatedPayload = JSON.stringify(eventDetails.payload, null, "\t")
                            .slice(2).slice(0, -1);
    ColPayloadTextnode.textContent = formatedPayload;
    newPanelColPayload.appendChild(ColPayloadTextnode);

    newPanelRow.appendChild(newPanelColTimestamp);
    newPanelRow.appendChild(newPanelColEventtype);
    newPanelRow.appendChild(newPanelColPayload);

    newPanel.appendChild(newPanelRow);

    newPanel.animate([
        // keyframes
        { transform: "translateX(300px)" },
        { transform: "translateY(0px)" }
    ], { 
        // timing options
        duration: 500,
    });
    mainPanel.insertBefore(newPanel, mainPanel.childNodes[0]);
}

function addEventMessage(data) {
    console.log("\n entered addEventMessage in index");
    $("#messageList").append("<ul class=\"list-group\">");
    data.forEach((value) => { $("#messageList").append(`<li class="list-group-item"> ${value.name} </li>`) })
    $("#messageList").append(`</ul>`);
}

function getEvents() {
    $.get("http://127.0.0.1:9000/events", (data) => {
        console.log("\nindexxx get events\n");
        console.log("available events are ", data);
        if(data.hasOwnProperty("message")) {
            $("#messageList").append(`<h4>${data.message}</h4>\n`);
        }
        else{
            $("#messageList").append("<h4>&nbsp;&nbsp;Available Events: </h4>\n");
            addEventMessage(data);
        }
        
    });
}

async function addWebhookMessage(data) {
    console.log("\n entered addWebhookMessage in index");
    var eventTypes = ''
    data.eventTypes.forEach((event) => {
        console.log("\neach webhookid is ", event)
        eventTypes += event + "<br />";
    })
    var webhookMessage =
        "<tr>" +
        "<td>" + data.webhookId + "</td>" +
        "<td>" + data.name + "</td>" +
        "<td>" + data.status + "</td>" +
        "<td>" + data.url + "</td>" +
        "<td>" + eventTypes + "</td>" +
        "</tr>";
    return webhookMessage;
}


function getWebhooks() {
    console.log("\n entered getwebhooks in index");
    $.get('http://127.0.0.1:9000/webhooks', async function (data) {
        if(data.hasOwnProperty("message")) {
            $("#messageList").append(`<h4>${data.message}</h4>\n`);
        }
        else{
            var webhookMessage = "";
            for (var i = 0; i < data.length; ++i)
                webhookMessage += await addWebhookMessage(data[i]);
            console.log(" Available Webhooks are: \n");
            printWebhookMessage(webhookMessage);
            addRowCount('.js-serial');
        }
    });
}
/**
 * Displays all webhooks in table format
 * @param {string} webhookMessage 
 */
async function printWebhookMessage(webhookMessage) {
    $("#messageList").append(
        `<table class="table table-striped table-bordered table-hover table-condensed js-serial">
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>URL</th>
                    <th>Event Types</th>
                    </tr>
                </thead>
                <tbody>${webhookMessage}</tbody></table>`
    );
}

/**
 * Adds serial number in the first column of table whose class name
 * is passed.
 * @param {string} tableAttr 
 */
function addRowCount(tableAttr) {
    $(tableAttr).each(function () {
        $('th:first-child, thead td:first-child', this).each(function () {
            var tag = $(this).prop('tagName');
            $(this).before('<' + tag + '>#</' + tag + '>');
        });
        $('td:first-child', this).each(function (i) {
            $(this).before('<td>' + (i + 1) + '</td>');
        });
    });
}
