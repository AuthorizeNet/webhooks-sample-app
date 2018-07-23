var chart;
Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

(function renderLiveEventGraph() {
    var stopGraphUpdate;
    $.getJSON("/eventsGraphData", function (results) {
        console.log("eventFrequencyAtEachTimeMap in chart page looks like: ", (results.eventFrequencyAtEachTimeMap));
        console.log("eventFrequencyAtEachTimeMap keys ", Object.keys(results.eventFrequencyAtEachTimeMap));
        
        if (! (Object.keys(results.eventFrequencyAtEachTimeMap) === undefined || Object.keys(results.eventFrequencyAtEachTimeMap).length == 0)) {
            chart = Highcharts.chart('chart5', {
                    chart: {
                        type: 'areaspline'
                    },
                    title: {
                        text: '<b>Live Event Monitoring</b>',
                    },
                    legend: {
                        layout: 'vertical',
                        align: 'center',
                        verticalAlign: 'bottom',
                        borderWidth: 1,
                        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
                    },
                    labels: {
                            enabled: false
                        },
                    xAxis: {
                    categories: (function(){
                        timeList=[]

                        for(var i=0; i<Object.values(results.eventFrequencyAtEachTimeMap)[0].length; ++i) {
                            // timeList.push(new Date(new Date(results.graphStartTime).getTime() + (i * 1000 * results.intervalTimeSeconds)).toISOString().split("T")[1].split(".")[0]);
                            timeList.push(new Date(new Date(results.graphStartTime).getTime() + (i * 1000 * results.intervalTimeSeconds)).toISOString());

                        }
                        return timeList;
                    } ())
                        
                    },
                    yAxis: {
                        title: {
                            text: 'Number of Events'
                        }
                    },
                    credits: {
                        enabled: false
                    },
                    plotOptions: {
                        areaspline: {
                            fillOpacity: 0.5
                        }
                    },
                    series: (function() {
                        var seriesList = [];
                        nameList = Object.keys(results.eventFrequencyAtEachTimeMap);
                        dataList = Object.values(results.eventFrequencyAtEachTimeMap);
                            for(var i=0; i<nameList.length; ++i) {
                                seriesList.push({
                                    name: nameList[i], 
                                    // data: data, 
                                    data: dataList[i]
                                });
                            }
                        return seriesList;
                    } ())
                });
    }
        stopGraphUpdate = setInterval(function () {
                            console.log("\n in set interval\n");
                            updateLiveEventGraph(chart, results.intervalTimeSeconds);
        }, 15000);

    });
} ())

async function updateLiveEventGraph(chart, intervalTimeSeconds) {
    var noOfIntervals = chart.xAxis[0].categories.length;
    lastTime = chart.xAxis[0].categories[noOfIntervals-1];
    // newTime = new Date((lastTime).getTime() + (1000 * intervalTimeSeconds)).toISOString().split("T")[1].split(".")[0];
    newTime = new Date(new Date(lastTime).getTime() + (1000 * intervalTimeSeconds)).toISOString();

    // console.log("\n last and newtime\n", lastTime, "   ", newTime);
    // chart.xAxis[0].categories.push(newTime);
    // chart.xAxis[0].categories.shift();
    console.log("new timelist is ", chart.xAxis[0].categories);
    
    // setting x axis values
    // chart.xAxis[0].setCategories(chart.xAxis[0].categories, true)


    // await chart.series.forEach(function(chartEvent, index, chartSeriesList) {
    //      chartSeriesList[index].yData.push(0);
    //     //  chartSeriesList[index].yData[chartSeriesList[index].yData.length-1] = 0;
    //      chartSeriesList[index].yData.shift();
    //      console.log("updated ", chartEvent.name, "  ydata is ", chartSeriesList[index].yData);
    //  });

    var mockEventFrequencyList = [{name: "net.authorize.payment.authorization.declined", count: 6}, {name: "e2", count: 4}, {name: "net.authorize.payment.authcapture.created", count: 2}];
    await mockEventFrequencyList.forEach(function(newEvent) {
        var updatedFrequency = false;
        chart.series.forEach(function(chartEvent, index, chartSeriesList) {
            if(newEvent.name === chartEvent.name) {
                // chartSeriesList[index].yData[noOfIntervals-1] = newEvent.count;
                // chartSeriesList[index].addPoint( newEvent.count, true, true);
                chartSeriesList[index].addPoint([newTime, newEvent.count], true, true);
                console.log("count updated for event ", newEvent.name);
                console.log("this event ydata is ", chartSeriesList[index].yData);
                updatedFrequency = true;
            }
        });
        if(!updatedFrequency) {
            console.log("new series adding for event ", newEvent.name);
            chart.addSeries({
                name: newEvent.name,
                data: (function() {
                    var newDataList = Array(noOfIntervals).fill(0);
                    //newDataList[newDataList.length-1] = newEvent.count;
                    console.log("this event ydata is ", newDataList);
                    return newDataList;
                } ())
            });
            chart.series.forEach(function(chartEvent, index, chartSeriesList) {
                if(newEvent.name === chartEvent.name) {
                    // chartSeriesList[index].addPoint( newEvent.count, true, true);
                    chartSeriesList[index].addPoint([newTime, newEvent.count], true, true);
                }
            });
        }
    });
    console.log("updated chart values are:\n");
    await chart.series.forEach(function(chartEvent, index, chartSeriesList) {
        console.log(chartEvent.name, "----", chartEvent.yData);
        // chart.yAxis[index].isDirty = true;
    });

}
