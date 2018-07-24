var chartColors = {
	Red: 'rgb(230, 25, 75)',
	Green: 'rgb(60, 180, 75)',
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
	Brown: 'rgb(170, 110, 40)',
	Beige: 'rgb(255, 250, 200)',
	Maroon: 'rgb(128, 0, 0)',
	Mint: 'rgb(170, 255, 195)',
	Olive: 'rgb(128, 128, 0)',
	Coral: 'rgb(255, 215, 180)',
	Navy: 'rgb(0, 0, 128)',
	Grey: 'rgb(128, 128, 128)',
	White: 'rgb(255, 255, 255)',
	Black: 'rgb(0, 0, 0)',
};

var config, 
	eventFrequencyInGraphInterval = {},
	myLine,
	colorNames = Object.keys(chartColors);;

			
$.getJSON("/eventsGraphData", function (results) {
	console.log("eventFrequencyAtEachTimeMap in chart page looks like: ", (results.eventFrequencyAtEachTimeMap));
	
	if (! (Object.keys(results.eventFrequencyAtEachTimeMap) === undefined || Object.keys(results.eventFrequencyAtEachTimeMap).length == 0)) {
		config = {
			type: 'line',
			data: {
				labels: (function() {
							var timeLabelList = [];
							for(var i=0; i<Object.values(results.eventFrequencyAtEachTimeMap)[0].length; ++i) 
								timeLabelList.push(new Date(new Date(results.graphStartTime).getTime() + (i * 1000 * results.intervalTimeSeconds)).toISOString());
							
							return timeLabelList;
						}()),
				datasets: (function() {
							var datasetList = [];
							nameList = Object.keys(results.eventFrequencyAtEachTimeMap);
							dataList = Object.values(results.eventFrequencyAtEachTimeMap);
							for(var i=0; i<nameList.length; ++i) {
								var colorName = colorNames[i % colorNames.length];
								var newColor = chartColors[colorName];
								datasetList.push({
									label: nameList[i], 
									data: dataList[i],
									borderColor: newColor,
									backgroundColor: newColor,
								});
							}
							return datasetList;
						} ())
			},
			options: { 
				scales: {
				xAxes: [{
					ticks: {
						callback: function(value) {
									formattedTime = new Date(value).toISOString().split("T");
									formattedTime[1]= formattedTime[1].split(".")[0];
									return formattedTime[1];
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
		};
	}

	$(document).ready(function() {
		var ctx = document.getElementById("chartBox").getContext("2d");
		myLine = new Chart(ctx, config);
	});
	stopGraphUpdate = setInterval(function () {
		console.log("\n in set interval\n");
		updateLiveEventGraph(results.intervalTimeSeconds, eventFrequencyInGraphInterval);
		eventFrequencyInGraphInterval = {};
	}, 7000);
});

function updateLiveEventGraph(intervalTimeSeconds, eventFrequencyInGraphInterval) {
    console.log("\n eventFrequencyInGraphInterval is \n", eventFrequencyInGraphInterval);

	updateXAxis(intervalTimeSeconds);
	// if (! (Object.keys(eventFrequencyInGraphInterval) === undefined || Object.keys(eventFrequencyInGraphInterval).length == 0)) {
		config.data.datasets.forEach((dataset, index, datasetsList)=> {
			var updatedFrequencyFlag = false;
			Object.keys(eventFrequencyInGraphInterval).forEach(function(newEvent) {
				if(newEvent === dataset.label) {
					addData(dataset.label, eventFrequencyInGraphInterval[newEvent]);
					updatedFrequencyFlag = true;
				}
			});
			if(!updatedFrequencyFlag) {
				addData(dataset.label, 0);
			}
		});

		Object.keys(eventFrequencyInGraphInterval).forEach(function(newEvent) {
			var updatedFrequency1Flag = false;
			config.data.datasets.forEach(function(dataset, index, chartSeriesList) {
				if(newEvent === dataset.label) {
					updatedFrequency1Flag = true;
				}
			});
			if(!updatedFrequency1Flag) {
				addDataset(newEvent);
				addData(newEvent, eventFrequencyInGraphInterval[newEvent]);

			}
		});
	// }
	console.log("going to update chart");
	myLine.update();
}

function addDataset(newEvent) {
	console.log("new series adding for event ", newEvent);
	var colorName = colorNames[config.data.datasets.length % colorNames.length];
	var newColor = chartColors[colorName];
	var newDataset = {
		label: newEvent,
		data: [],
		borderColor: newColor,
		backgroundColor: newColor,
	};

	for (var index = 0; index < config.data.labels.length; ++index)
		newDataset.data.push(0);
		console.log("after pushing zeroes ", newDataset.data);
	config.data.datasets.push(newDataset);
}

function addData(datasetName, value) {
	console.log("addData for event ", datasetName);
	if (config.data.datasets.length > 0 && datasetName!= undefined) {
		config.data.datasets.forEach(function(dataset) {
			if(dataset.label === datasetName) {
				dataset.data.push(value);
				dataset.data.shift();
				console.log("value after addData ", dataset.data);
			}
		});
	}
}

function updateXAxis(intervalTimeSeconds) {
	var latestTime = config.data.labels[config.data.labels.length-1];
	var nextTime = new Date(new Date(latestTime).getTime() + (1000 * intervalTimeSeconds)).toISOString();
	console.log("latestTime ", latestTime, " nextTime ", nextTime);
	config.data.labels.push(nextTime);
	config.data.labels.shift();
	console.log("next timelist is ", config.data.labels);
}
		
function findEventFrequencyInGraphInterval(eventType) {
    if(eventType in eventFrequencyInGraphInterval)
        eventFrequencyInGraphInterval[eventType] += 1;
    else
        eventFrequencyInGraphInterval[eventType] = 1;
}	
