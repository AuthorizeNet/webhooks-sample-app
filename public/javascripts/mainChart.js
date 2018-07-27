"use strict";
plotAllGraphs();
function plotAllGraphs() {
    plotGraph("Payment", "chart1");
    plotGraph("Refund", "chart2");
    plotGraph("Customer", "chart3");
    plotGraph("Fraud", "chart4");
}
var chartColorIndex = 0;

function plotGraph(eventCategory, chartId) {
    var graph = {
        name: eventCategory
    };
    $.getJSON('/notifications', graph, function (results) {
        console.log("results in graph", (results));
        if(Object.keys(results)) {
                new Chart(document.getElementById(chartId).getContext("2d"), {
                type: 'line',
                data: {
                    labels: (function() { 
                        console.log("labels", (Object.keys(results)));
                        return Object.keys(results);
                    }()),

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
                                console.log("datasetList in graph", (datasetList[0]));
                                return datasetList;
                            } ())
                },
                options: {
                    title: {
                        display: true,
                        text: eventCategory,
                        fontSize: 20
                    },
                    legend:{
                        position: "top",
                    },
                    scales: {
                    yAxes : [{
                        ticks : {
                            min : 0,
                            // suggestedMax: 1000,
                            // stepSize: 100,
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
            });
        }
    });
}
