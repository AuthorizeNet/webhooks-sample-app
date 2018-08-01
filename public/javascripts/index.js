"use strict";
// Initialize socket variable
var socket = io();

/**
 * Display either Event monitoring or dashboard of graphs
 * when the respective button is clicked
 */
$(() => {
    // Load the mainChart.html file that contains placeholder 
    // payment, refund, customer and fraud charts 
    $("#includedContent").load("../mainChart.html");
    // Include the mainChart.js file that has function for dashboard charts
    $.getScript("./javascripts/mainChart.js");

    // By default enable the Event Monitoring tab
    $("#currentEvents").css("background-color", "palevioletred");
    
    $("#chart").click(() => {
        // Change Dashboard tab's background color
        $("#chart").css("background-color", "palevioletred");
        // Reset Event Monitoring tab's background color
        $("#currentEvents").css("background-color", "");
        // Hide the Event Monitoring tab's content
        $(".eventMonitoring").css("display", "none");
        // Display the Dashboard tab's content
        $("#includedContent").css("display", "block");
    });

    $("#currentEvents").click(() => {
        // Change Event Monitoring tab's background color
        $("#currentEvents").css("background-color", "palevioletred");
        // Reset Dashboard tab's background color
        $("#chart").css("background-color", "");
        // Hide the Dashboard tab's content
        $("#includedContent").css("display", "none");
        // Display the Event Monitoring tab's content
        $(".eventMonitoring").css("display", "block");
    });
});

/**
 * Call API to populate the recent events when the either
 * page is initially loaded or refreshed
 */
$.getJSON("/notifications", {limit: CONFIG.NoOfNotificationsToDisplay }, function (results) {
    // Create a event log for each notification
    results.forEach((element) =>
                    displayEventMessage(element));
});

/**
 * Socket listens for new event that is emitted in the server side.
 * Calls onNewEvent method when a new event occurs and updates the graph
 */
socket.on("newNotification", (body) => {
    console.log("in socket - index.js");
    onNewEvent(body);
    plotAllGraphs();
});

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

/**
 * Called when new notification is received. Calls methods to display the event
 * log message and update event frequency in event log graph
 * @param {*} body
 */
function onNewEvent(body) {
    // var eventName = extracteventNameFromEventType(body.eventDetails.eventType);
    displayEventMessage(body.eventDetails);
    findEventFrequencyInGraphInterval(body.eventDetails.eventType);
}

/**
 * Creates a new event message with event timestamp, event type and payload.
 * Appends this message to an UI element adds animation to it
 * @param {*} eventDetails
 */
function displayEventMessage(eventDetails) {
    var eventDate = formatEventDate(eventDetails.eventDate);
    var mainPanel = document.getElementById("panelCurrentEvent");
    // Checks the limit to display number of recent events
    if(mainPanel.childElementCount >= CONFIG.NoOfNotificationsToDisplay) {
        mainPanel.removeChild(mainPanel.lastChild);
    }
    var newPanel = document.createElement("div");
    newPanel.classList.add("panel", "panel-success");

    var newPanelRow = document.createElement("div");
    newPanelRow.classList.add("row");
    newPanelRow.setAttribute("style", "background-color: khaki;margin: 0px auto;text-align: left;width: 100%;");

    var newPanelColTimestamp = document.createElement("div");
    newPanelColTimestamp.classList.add("col-md-2");
    var ColTimestampTextnode = document.createTextNode("" + eventDate);
    newPanelColTimestamp.appendChild(ColTimestampTextnode);

    var newPanelColEventtype = document.createElement("div");
    newPanelColEventtype.classList.add("col-md-6");
    var ColEventtypeTextnode = document.createTextNode("" + eventDetails.eventType);
    newPanelColEventtype.style.wordBreak = "break-all";
    newPanelColEventtype.setAttribute("style", "padding: 0px;text-align: center;");
    newPanelColEventtype.appendChild(ColEventtypeTextnode);

    var newPanelColPayload = document.createElement("div");
    newPanelColPayload.classList.add("col-md-4");
    var ColPayloadTextnode = document.createElement("pre");
    ColPayloadTextnode.setAttribute("style", "background-color: lightgreen;padding: 0px;margin: 0px auto;");
    var formatedPayload = JSON.stringify(eventDetails.payload, null, "\t")
                            .slice(2).slice(0, -1);
    ColPayloadTextnode.textContent = formatedPayload;
    newPanelColPayload.appendChild(ColPayloadTextnode);

    newPanelRow.appendChild(newPanelColTimestamp);
    newPanelRow.appendChild(newPanelColEventtype);
    newPanelRow.appendChild(newPanelColPayload);

    newPanel.appendChild(newPanelRow);

    // For animation
    newPanel.animate([
        // keyframes
        { transform: "translateX(300px)" },
        { transform: "translateY(0px)" }
    ], {
        // timing options
        duration: 500,
    });
    // Insert message as the first child
    mainPanel.insertBefore(newPanel, mainPanel.childNodes[0]);
}
