"use strict";
var chartColorIndex = 0, chartConfig;

plotAllGraphs();

/**
 * Calls the plotGraph() function with different chart types and DOM id for chart's location
 */
function plotAllGraphs() {
    console.log("in ploatallgraphs func - mainchart.js");
    plotGraph("Payment", "chart1");
    plotGraph("Refund", "chart2");
    plotGraph("Customer", "chart3");
    plotGraph("Fraud", "chart4");
}

/**
 * Make "/charts" call and get graph data 
 * @param {string} eventCategory 
 * @param {string} chartId 
 */
function plotGraph(eventCategory, chartId) {
    $.getJSON('/charts', { name: eventCategory }, function (results) {
        console.log("in /charts - maincharts.js");
        console.log("results in graph", (results));
        if(Object.keys(results)) {
            chartConfig = {
                type: 'line',
                data: {
                    // Extract the labels from results object
                    labels: (function() { 
                        return Object.keys(results);
                    }()),

                    // Extract the dataset from results object
                    datasets: (function() {
                                var datasetList = [];
                                var eventDataMap = {};
                                var nameList = Object.keys(results[Object.keys(results)[0]]);
                                console.log("nameList in graph", (nameList));

                                nameList.forEach((name) => {
                                    eventDataMap[name] = [];
                                });
                                Object.keys(results).forEach((graphDate) => {
                                   Object.keys(results[graphDate]).forEach((set) => {
                                        eventDataMap[set].push(results[graphDate][set]);
                                   });
                                });

                                for(var i=0; i<nameList.length; ++i) {
                                    var colorName = colorNames[chartColorIndex % colorNames.length];
                                    var newColor = chartColors[colorName];
                                    ++chartColorIndex;

                                    datasetList.push({
                                        label: nameList[i],
                                        data: eventDataMap[nameList[i]],
                                        borderColor: newColor,
                                        backgroundColor: newColor,
                                    });
                                }
                                return datasetList;
                            } ())
                },
                options: {
                    tooltips: {
                        callbacks: {
                            // Change the tooltip display format
                            label: function(tooltipItem, data) {
                                var label = (data.datasets[tooltipItem.datasetIndex].label).split("=")[0] || '';
                                var labelValue = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] || 0;
                                return label + ": " + labelValue;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: eventCategory,
                        fontSize: 20
                    },
                    legend:{
                        position: "top",
                    },
                    scales: {
                        xAxes: [{
                            scaleLabel: {
                                display: true,
                                labelString: 'Date',
                                fontStyle: "bold",
                                fontSize: 14
                            }
                        }],
                        yAxes : [{
                            scaleLabel: {
                                display: true,
                                labelString: 'Total',
                                fontStyle: "bold",
                                fontSize: 14
                            },
                            ticks : {
                                // Graph's Y-axis must start with zero
                                min : 0,
                                // Converts the Y-axis scale values to int if they are float.
                                userCallback: function(label) {
                                    if (Math.floor(label) === label) {
                                        return label;
                                    }
                                }
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
                    {   // Change the way labels are displayed
                        beforeInit: function(chartConfig) {
                            chartConfig.data.datasets.forEach((dataset) => {
                                var eventTotal = dataset.data.reduce((a,b) => a + b, 0);
                                dataset.label = dataset.label +  " = "+ eventTotal;
                            });
                        },
                    }
                ]
            }
            // Draw the chart with above data
            new Chart(document.getElementById(chartId).getContext("2d"), chartConfig);
        }
    });
}
