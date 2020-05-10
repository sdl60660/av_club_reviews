
var currentShowData;

var showChartsTransitionOutDuration = 350;
var showChartsTransitionInDuration = 500; 

var defaultShow = 'Breaking Bad';
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

		bubblePlot.wrangleData();
	});
}


var showId = $("#show-select").find(`:contains(${defaultShow})`).attr('id').substring(5);
$.get( "/get_show?show_id=" + showId ).then (response => {
	currentShowData = JSON.parse(response);

	barChart = new BarChart('#show-bar-chart', [700, 0.9*700], "episode-bar", false);
	seasonChart = new BarChart('#season-bar-chart', [400, 0.75*400], "season-bar", true);

	bubblePlot = new BubblePlot("#ratings-plot");
});