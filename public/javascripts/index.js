"use strict";
// Initialize socket variable
var socket = io(), maxNotificationCount;

/**
 * Triggered when an item is dropdown is selected.
 * Makes current panel content empty
 * Socket listens to capture the initial chart parameter
 * Calls filterNotificationLogByEventType() to filter the logs
 */
$(document).on('click', '.dropdown-menu li a', function() {
    $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
    $(this).parents(".dropdown").find('.btn').val($(this).data('value'));
    $("#panelCurrentEvent").html("");

    // Socket listens during initialization and gets the chart values from server
    if(!maxNotificationCount) {
        socket.on("init", (body) => {
            // console.log("in socket - index.js to get chart values ", body.noOfDaysGraph);
            maxNotificationCount = body.noOfDaysGraph;
            filterNotificationLogByEventType($(this).data('value'));
        });
    }
    else {
        filterNotificationLogByEventType($(this).data('value'));
    }

});

/**
 * Makes API call and gets the notification log based on filtered eventType
 * @param {string} eventType
 */
function filterNotificationLogByEventType(eventType) {
    // console.log("eventtype selected in filterNotificationLogByEventType is ", eventType);
    $.getJSON("/notifications", { limit: maxNotificationCount, name: eventType }, function (notifications) {
        var notificationsLength = notifications.length;
        if(notificationsLength) {
            $("#logCount").html(`<b>Displaying recent ${notificationsLength} notifications</b>`);
        }
        else {
            $("#logCount").html(`<b>No recent notifications</b>`);
        }
        // Create a notification log in UI for each notification
        notifications.forEach((notification) =>
                        displayEventMessage(notification));
    });
}

/**
 * Display either Event monitoring or dashboard of graphs
 * when the respective button is clicked
 */
$(() => {
    // Set the CSRF headers
    $.ajaxSetup({
        headers: { 'x-csrf-token': $('input[name="_csrf"]').val() },
        data: { csrf: $('input[name="_csrf"]').val() }
    });

    // Get All eventTypes and construct the notification filtering dropdown menu
    $.ajax({
        method: "GET",
        url:"/eventtypes",
        dataType: "json",
    }).done(function(data) {

        // If error occurred in getting event types, error message is sent from server
        if(data.hasOwnProperty("message")) {
            $(".error-message").append(`<h4>${data.message}</h4>\n`);
        }
        // console.log("adding dropdown items");
        else {
            data.forEach((eventName) => {
                var div_data = `<li><a data-value="${eventName.name}">${eventName.name}</a></li>`;
                $(div_data).appendTo('.dropdown-menu');
            });
        }

    }).fail(function(err) {
        console.log("Error occured in ajax \"/events\" call ", err);
    });

    // Load the mainChart.html file that contains placeholder
    // payment, refund, customer and fraud charts
    $.ajax({
        url: '../mainChart.html',
        dataType: 'html',
        timeout: 5000, // 5 seconds
        success: function(html) {
            $("#includedContent").html(html);
        }
    });

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
        $(".event-monitoring").css("display", "none");
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
        $(".event-monitoring").css("display", "block");
    });
    // // console.log("clicking all items by defaut");
    $('.dropdown li a:first-child').click();

});

// Socket listens for new event that is emitted in the server side.
// Calls onNewEvent method when a new event occurs and updates the graph
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
    console.log("in onNewEvent func");
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
    // console.log("in displayEventMessage func");
    var eventDate = formatEventDate(eventDetails.eventDate);
    var mainPanel = document.getElementById("panelCurrentEvent");

    // Checks the limit to display number of recent events
    if(mainPanel.childElementCount >= maxNotificationCount) {
        mainPanel.removeChild(mainPanel.lastChild);
    }
    var newPanel = document.createElement("div");
    newPanel.classList.add("panel", "panel-success");

    var formatedPayload = JSON.stringify(eventDetails, null,"\t")
                           .slice(1,-1);

    newPanel.innerHTML =
        `<div class="row event-headings" style="background-color: lavender;height: 100px">
            <div class="col-xs-2">${eventDate}</div>
            <div class="col-xs-5" style="padding: 0px;text-align: center;word-break: break-all">${eventDetails.eventType}</div>
            <div class="col-xs-5" style="padding: 0px;">
                <pre style="background-color: palegoldenrod;padding: 0px;margin: 0px auto;height: 100px">${formatedPayload}</pre>
            </div>
        </div>`;

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
