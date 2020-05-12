
var currentShowData;
var directorData;

var colorPalette = ['#0F4C81', '#F5B895', '#84898c', '#7FC844',
'#b75e41', '#990011', '#463F3A', '#759FBC', '#6A1A4C',
'#BA9238', '#A58D7F', '#F3D5AD', '#DBDD98', '#996848'];

var showChartsTransitionOutDuration = 350;
var showChartsTransitionInDuration = 500; 

// To allow for visible F-Grade bars
var barChartBottomOffset = 15;

var episodeThreshold = 8;

var defaultGenre = 'comedy';
var defaultShow = 'Breaking Bad';

var showId = $("#show-select").find(`:contains(${defaultShow})`).attr('id').substring(5);
// var barChart;

$("#genre-select").val(defaultGenre);
$("#genre-select")
	.on("change", function() {
		updateGenre();
	})

$("#show-select").val(defaultShow);
$("#show-select")
	.on("change", function() {
		updateShow();
	})


function updateShow() {
	var showId = $("#show-select").find('option:selected').attr('id').substring(5);
	$.get( "/get_show?show_id=" + showId ).then( response => {
		// Update chart here once that code has been adapted to be object oriented
		currentShowData = JSON.parse(response);

		barChart.wrangleData();
		seasonChart.wrangleData();

		seasonBubblePlot.wrangleData(currentShowData.episodes);
	});
}

function updateGenre() {
	var newGenre = $("#genre-select").val();

	$.get("/get_genre?genre_name=" + newGenre).then( response => {
		currentGenreData= JSON.parse(response);
		var genreShowData = currentGenreData.show_data.filter( d => d.reviewed_episode_count >= episodeThreshold );

		genreShowBubblePlot.wrangleData(genreShowData);
	})
}

var promises = [
	d3.json("/get_show?show_id=" + showId),
	d3.json("/get_directors"),
	d3.json("/get_genre?genre_name=" + defaultGenre),
	d3.json("/get_genres")
];

Promise.all(promises).then(function(allData) {
	currentShowData = allData[0];
	directorData = allData[1];
	genreData = allData[2];
	genreMetaData = allData[3];

	var genreShowData = genreData.show_data.filter( d => d.reviewed_episode_count >= episodeThreshold );
	console.log(genreShowData);

	barChart = new BarChart('#show-bar-chart', [625, 0.9*700], "episode-bar", false);
	seasonChart = new BarChart('#season-bar-chart', [500, 0.75*400], "season-bar", true);
	seasonBubblePlot = new BubblePlot("#ratings-plot", currentShowData.episodes, [500,330], false);

	genreFullBubblePlot = new BubblePlot("#full-genre-plot", genreMetaData, [600,500], true)
	genreShowBubblePlot = new BubblePlot("#genre-show-plot", genreShowData, [600,500], true);
	
	directorBubblePlot = new BubblePlot("#full-director-plot", directorData, [800, 600], true);

});