
var currentShowData;
var directorData;

var showChartsTransitionOutDuration = 350;
var showChartsTransitionInDuration = 500; 

var defaultShow = 'Breaking Bad';
var showId = $("#show-select").find(`:contains(${defaultShow})`).attr('id').substring(5);
// var barChart;

$("#show-select").val(defaultShow);
$("#show-select")
	.on("change", function() {
		updateShow();
	})


function updateShow() {
	var showId = $("#show-select").find('option:selected').attr('id').substring(5);
	$.get( "/get_show?show_id=" + showId ).then (response => {
		// Update chart here once that code has been adapted to be object oriented
		currentShowData = JSON.parse(response);

		barChart.wrangleData();
		seasonChart.wrangleData();

		bubblePlot.wrangleData(currentShowData.episodes);
	});
}

var promises = [
	d3.json("/get_show?show_id=" + showId),
	d3.json("/get_directors")
];

Promise.all(promises).then(function(allData) {
	currentShowData = allData[0];
	directorData = allData[1];

	console.log(directorData);

	barChart = new BarChart('#show-bar-chart', [700, 0.9*700], "episode-bar", false);
	seasonChart = new BarChart('#season-bar-chart', [500, 0.75*400], "season-bar", true);

	bubblePlot = new BubblePlot("#ratings-plot", currentShowData.episodes, [500,330], false);
	bubblePlot = new BubblePlot("#full-director-plot", directorData, [800, 600], true);

});