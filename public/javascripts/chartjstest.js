var config, 
	eventFrequencyInGraphInterval = {},
	myLine;

			
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
									datasetList.push({
										label: nameList[i], 
										data: dataList[i]
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

		// updateXAxis();
		// addDataset();
		// addData();
	}, 7000);
});
	
// $(document).ready(function() {
// 	var ctx = document.getElementById("chartBox").getContext("2d");
// 	myLine = new Chart(ctx, config);
// });

// window.onload = function() {
// 	var ctx = document.getElementById('canvas').getContext('2d');
// 	window.myLine = new Chart(ctx, config);
// };



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
	var newDataset = {
		label: newEvent,
		data: [],
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















































	// document.getElementById('randomizeData').addEventListener('click', function() {
		// 	config.data.datasets.forEach(function(dataset) {
		// 		dataset.data = dataset.data.map(function() {
		// 			return randomScalingFactor();
		// 		});

		// 	});

		// 	window.myLine.update();
		// });

		// var colorNames = Object.keys(window.chartColors);
		// document.getElementById('addDataset').addEventListener('click', function() {
		// 	var colorName = colorNames[config.data.datasets.length % colorNames.length];
		// 	var newColor = window.chartColors[colorName];
		// 	var newDataset = {
		// 		label: 'Dataset ' + config.data.datasets.length,
		// 		borderColor: newColor,
		// 		backgroundColor: newColor,
		// 		data: [],
		// 	};

		// 	for (var index = 0; index < config.data.labels.length; ++index) {
		// 		newDataset.data.push(randomScalingFactor());
		// 	}

		// 	config.data.datasets.push(newDataset);
		// 	window.myLine.update();
		// });

		// document.getElementById('addData').addEventListener('click', function() {
			// if (config.data.datasets.length > 0) {
			// 	var month = MONTHS[config.data.labels.length % MONTHS.length];
			// 	config.data.labels.push(month);

			// 	config.data.datasets.forEach(function(dataset) {
			// 		dataset.data.push(randomScalingFactor());
			// 	});

			// 	window.myLine.update();
			// }
		// });

		// document.getElementById('removeDataset').addEventListener('click', function() {
		// 	config.data.datasets.splice(0, 1);
		// 	window.myLine.update();
		// });

		// document.getElementById('removeData').addEventListener('click', function() {
		// 	config.data.labels.splice(-1, 1); // remove the label first

		// 	config.data.datasets.forEach(function(dataset) {
		// 		dataset.data.pop();
		// 	});

		// 	window.myLine.update();
		// });


        