"use strict";
plotAllGraphs();
function plotAllGraphs() {
    plotGraph("Payment", "chart1");
    plotGraph("Refund", "chart2");
    plotGraph("Customer", "chart3");
    plotGraph("Fraud", "chart4");
}
var chartColorIndex = 0, chartConfig;

function plotGraph(eventCategory, chartId) {
    var graph = {
        name: eventCategory
    };
    $.getJSON('/charts', graph, function (results) {
        console.log("results in graph", (results));
        if(Object.keys(results)) {
            chartConfig = {
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
                    tooltips: {
                        callbacks: {
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
                                min : 0,
                                userCallback: function(label) {
                                    // when the floored value is the same as the value we have a whole number
                                    if (Math.floor(label) === label) {
                                        return label;
                                    }
                                }
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
                plugins: [
                    {
                        beforeInit: function(chartConfig) {
                            chartConfig.data.datasets.forEach((dataset) => {
                                var eventTotal = dataset.data.reduce((a,b) => a + b, 0);
                                dataset.label = dataset.label +  " = "+ eventTotal;
                            });
                        },
                    }
                ]
            }
            new Chart(document.getElementById(chartId).getContext("2d"), chartConfig);
        }
    });
}
