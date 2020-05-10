
$("#show-select")
	.on("change", function() {
		updateShow();
	})


function updateShow() {
	var showId = $("#show-select").find('option:selected').attr('id').substring(5);
	$.get( "/get_show?show_id=" + showId ).then (response => {
		// Update chart here once that code has been adapted to be object oriented
		response = JSON.parse(response);

		barChart.wrangleData(response);
		seasonChart.wrangleData(response);
	});
}

var defaultShow = 'Breaking Bad';
var barChart;

var showId = $("#show-select").find(`:contains(${defaultShow})`).attr('id').substring(5);
$.get( "/get_show?show_id=" + showId ).then (response => {
	response = JSON.parse(response);
	barChart = new BarChart('#show-bar-chart', response, [700, 0.85*700], "episode-bar", false);
	seasonChart = new BarChart('#season-bar-chart', response, [400, 0.75*400], "season-bar", true);
});