plotAllGraphs();
async function plotAllGraphs() {
    await plotGraph("payment", "chart1");
    await plotGraph("refund", "chart2");
}

function plotGraph(eventCategory, chartId) {
    var graph = {
        name: eventCategory,
    };
    $.getJSON('/notifications', graph, function (results) {
        var totalPayment = Object.values(results.paymentDetail).reduce((a,b) => a + b, 0);
        Highcharts.chart(chartId, {
        chart: {
            type: 'areaspline'
        },
        title: {
            text: '<b>Payment</b>',
        },
        legend: {
            layout: 'vertical',
            align: 'center',
            verticalAlign: 'top',
            // x: 150,
            // y: 100,
            // floating: true,
            borderWidth: 1,
            backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
        },
        labels: {
                enabled: false
            },
        xAxis: {
            categories: Object.keys(results.paymentDetail),
            
        },
        yAxis: {
            title: {
                text: 'Amount Captured ($)'
            }
        },
        tooltip: {
            shared: true,
            formatter: function() { 
                return 'Date: <b>' + this.x + '</b><br>Amount: <b>'+ this.y + ' $</b>';
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
        series: [{
            name: 'Total Amount = ' + totalPayment,
            data: Object.values(results.paymentDetail),
        },]

        });
    });
}
