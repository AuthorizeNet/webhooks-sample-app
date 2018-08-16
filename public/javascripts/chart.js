"use strict";
var chartColors = {
    Yellow: 'rgb(255, 225, 25)',
    Blue: 'rgb(0, 130, 200)',
    Orange: 'rgb(245, 130, 48)',
    Purple: 'rgb(145, 30, 180)',
    Cyan: 'rgb(70, 240, 240)',
    Magenta: 'rgb(240, 50, 230)',
    Lime: 'rgb(210, 245, 60)',
    Pink: 'rgb(250, 190, 190)',
    Teal: 'rgb(0, 128, 128)',
    Lavender: 'rgb(230, 190, 255)',
    Red: 'rgb(230, 25, 75)',
    Brown: 'rgb(170, 110, 40)',
    Beige: 'rgb(255, 250, 200)',
    Maroon: 'rgb(128, 0, 0)',
    Mint: 'rgb(170, 255, 195)',
    Olive: 'rgb(128, 128, 0)',
    Coral: 'rgb(255, 215, 180)',
    Navy: 'rgb(0, 0, 128)',
    Green: 'rgb(60, 180, 75)',
    Grey: 'rgb(128, 128, 128)',
    Black: 'rgb(0, 0, 0)',
};

var config,
    initialChartData,
    eventFrequencyInGraphInterval = {},
    myLine,
    colorNames = Object.keys(chartColors);

/**
 * Initialize chart data and draws chart if the chart data is populated
 * @param {*} chartResults
 */
function initialChartCallback(chartResults) {
    initialChartData = chartResults;

    if(Object.keys(initialChartData.eventFrequencyAtEachTimeMap).length!= 0) {
        drawChart(initialChartData);
    }
}
initializeChart();

/**
 * Gets chart values from "/charts" endpoint.
 * calls initialChartCallback() with chart data
 */
function initializeChart() {
    // For live event chart. Query parameter name is passed with value "all"
    $.getJSON('/charts', { name: "all", csrf: $('input[name="_csrf"]').val() }, (results) => { initialChartCallback(results); });
}

/**
 * Initializes chart configurations. Plots chart and calls function to
 * update chart regularly
 * @param {*} results
 */
function drawChart(results) {
    try{
        config = {
            type: "line",
            data: {
                // Extract the labels from results object
                labels: (function() {
                            var timeLabelList = [];
                            for(var i=0; i<Object.values(results.eventFrequencyAtEachTimeMap)[0].length; ++i)
                                timeLabelList.push(new Date(new Date(results.graphStartTime).getTime() + (i * 1000 * results.intervalTimeSeconds)).toISOString());

                            return timeLabelList;
                        }()),

                // Extract the dataset from results object
                datasets: (function() {
                            var datasetList = [];
                            var nameList = Object.keys(results.eventFrequencyAtEachTimeMap);
                            var dataList = Object.values(results.eventFrequencyAtEachTimeMap);
                            for(var i=0; i<nameList.length; ++i) {
                                var colorName = colorNames[i % colorNames.length];
                                var newColor = chartColors[colorName];
                                datasetList.push({
                                    label: nameList[i],
                                    data: dataList[i],
                                    borderColor: newColor,
                                    backgroundColor: newColor
                                });
                            }
                            return datasetList;
                        }())
            },
            options: {
                // If title for chart is required, uncomment the following
                // title: {
                //     display: true,
                //     text: "Event Tracker",
                //     fontSize: 20
                // },
                legend:{
                    position: "right",
                },
                scales: {
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Time (UTC)",
                        fontStyle: "bold",
                        fontSize: 16
                    },
                    ticks: {
                        // Extract Time portion of Date and display in X axis
                        callback: function(value) {
                                    var formattedTime = new Date(value).toISOString().split("T");
                                    formattedTime[1]= formattedTime[1].split(".")[0];
                                    return formattedTime[1];
                                }
                    }
                }],
                yAxes : [{
                    scaleLabel: {
                        display: true,
                        labelString: "# of Events",
                        fontStyle: "bold",
                        fontSize: 14,
                    },
                    ticks : {
                        min : 0,
                        suggestedMax: 15,
                        stepSize: 5,
                    }
                }]
                },
                animation: {
                    duration: 0,
                },
                hover: {
                    animationDuration: 0,
                },
                responsiveAnimationDuration: 0
            },
            plugins: [
            {
                // Before Updating chart, find event count and add to its label
                beforeUpdate: function(config) {
                    config.data.datasets.forEach((dataset) => {
                        var eventCount = dataset.data.reduce((a,b) => a + b, 0);
                        dataset.label = dataset.label +  " ("+ eventCount + ")";
                        // Hide the event if its count is zero in this timeframe
                        if(!eventCount) {
                            dataset.hidden = true;
                        }
                    });
                }
            },
            {
                // After Updating chart, remove the count from event label
                afterUpdate: function(config) {
                    config.data.datasets.forEach((dataset) => {
                        dataset.label = dataset.label.split(" ")[0];
                        if(dataset.hidden) {
                            dataset.hidden = false;
                        }
                    });
                }
            }
        ]
        };
    }catch(err) {
        console.error("Error in chart.js ", err);
    }

    // Plot the chart
    $(document).ready(function() {
        var ctx = document.getElementById("chartBox").getContext("2d");
        myLine = new Chart(ctx, config);
    });

    // Execute the setInterval's callback function repeatedly
    var stopGraphUpdate = setInterval(function () {
        updateLiveEventGraph(results.intervalTimeSeconds, eventFrequencyInGraphInterval);
        eventFrequencyInGraphInterval = {};
    }, results.intervalTimeSeconds * 1000);
}

/**
 * During each call, updates the X-axis, adds new event if occurred,
 * updates existing event whether occurred in this time interval or not
 * @param {number} intervalTimeSeconds
 * @param {*} eventFrequencyInGraphInterval
 */
function updateLiveEventGraph(intervalTimeSeconds, eventFrequencyInGraphInterval) {
    if(config.data.datasets) {
        updateXAxis(intervalTimeSeconds);
    }

    config.data.datasets.forEach((dataset)=> {
        var updatedFrequencyFlag = false;
        Object.keys(eventFrequencyInGraphInterval).forEach(function(newEvent) {

            // If already present event has occurred in this timeframe,
            // update with new count
            if(newEvent === dataset.label) {
                // console.log("If already present event has occurred in this timeframe, update with new count")
                addData(dataset.label, eventFrequencyInGraphInterval[newEvent]);
                updatedFrequencyFlag = true;
            }
        });

        // If already present event does not occur in the time frame, add "0" as count
        if(!updatedFrequencyFlag) {
            // console.log("If already present event does not occur in the time frame, add 0 as count")
            addData(dataset.label, 0);
        }
    });

    Object.keys(eventFrequencyInGraphInterval).forEach(function(newEvent) {
        var updatedFrequency1Flag = false;
        config.data.datasets.forEach(function(dataset) {
            if(newEvent === dataset.label) {
                updatedFrequency1Flag = true;
            }
        });

        // If new event has occurred, add a dataset for it and update its latest count
        if(!updatedFrequency1Flag) {
            // console.log("If new event has occurred, add a dataset for it and update its latest count")
            addDataset(newEvent);
            addData(newEvent, eventFrequencyInGraphInterval[newEvent]);
        }
    });
    // Update the graph after making necessary changes
    myLine.update();
}

/**
 * Add a dataset for newly occurred event
 * @param {*} newEvent
 */
function addDataset(newEvent) {
    // console.log("new series adding for event ", newEvent);
    var colorName = colorNames[config.data.datasets.length % colorNames.length];
    var newColor = chartColors[colorName];
    var newDataset = {
        label: newEvent,
        data: [],
        borderColor: newColor,
        backgroundColor: newColor,
    };

    // Make count as zero for each value in X axis
    for (var index = 0; index < config.data.labels.length; ++index)
        newDataset.data.push(0);

    config.data.datasets.push(newDataset);
}

/**
 * Add a data point for already existing event or new event
 * @param {string} datasetName
 * @param {number} value
 */
function addData(datasetName, value) {
    if (config.data.datasets.length > 0 && datasetName!= undefined) {
        config.data.datasets.forEach(function(dataset, index, chartSeriesList) {
            if(dataset.label === datasetName) {
                chartSeriesList[index].data.push(value);
                chartSeriesList[index].data.shift();
            }
        });
    }
}

/**
 * Updates the X axis by adding new time and removing the earliest time
 * @param {number} intervalTimeSeconds
 */
function updateXAxis(intervalTimeSeconds) {
    var latestTime = config.data.labels[config.data.labels.length-1];
    var nextTime = new Date(new Date(latestTime).getTime() + (1000 * intervalTimeSeconds)).toISOString();
    config.data.labels.push(nextTime);
    config.data.labels.shift();
}

/**
 * Maintains the event occurrence count for each interval
 * @param {string} eventType
 */
function findEventFrequencyInGraphInterval(eventType) {
    if(Object.keys(initialChartData.eventFrequencyAtEachTimeMap).length == 0) {
        initializeChart();
    }
    else {
        if(eventType in eventFrequencyInGraphInterval)
            eventFrequencyInGraphInterval[eventType] += 1;
        else
           eventFrequencyInGraphInterval[eventType] = 1;
    }
}
