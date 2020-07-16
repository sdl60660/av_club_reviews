
var currentShowData;
var directorData;
var genreShowData;

var reviewerBias;
var rawReviewerScores;

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

var domainIndices;
let showBarVar = 'average_av_rating';

var rankedShows;
var chartBrush;

var barChart;
var boxPlot;

var genreFullBubblePlot;
var genreShowBubblePlot;

var directorBubblePlot;

var reviewerBiasPlot;


$("#genre-select").val(defaultGenre);
$("#genre-select")
	.on("change", function() {
		updateGenre();
	});

$("#show-select").val(defaultShow);
$("#show-select")
	.on("change", function() {
		updateShow();
	});


$("input[name=section-select]:radio").bind( "change", function() {
    $(".section-wrapper").hide();
    $(`#${$(this).val()}-wrapper`).show();
});


$("input[name=showbar-var-select]:radio").bind( "change", function() {
    showBarVar = $(this).val();
    rankedShows.wrangleData();
    chartBrush.wrangleData();
});



function updateShow() {
	var showId = $("#show-select").find('option:selected').attr('id').substring(5);
	$.get( "/get_show?show_id=" + showId ).then( response => {
		// Update chart here once that code has been adapted to be object oriented
		currentShowData = JSON.parse(response);

		barChart.wrangleData();
		boxPlot.wrangleData();
		// seasonChart.wrangleData();

		seasonBubblePlot.wrangleData(currentShowData.episodes);
	});
}

function updateGenre() {
	var newGenre = $("#genre-select").val();

	$.get("/get_genre?genre_name=" + newGenre).then( response => {
		currentGenreData= JSON.parse(response);
		var genreShowData = currentGenreData.show_data.filter( d => d.reviewed_episode_count >= episodeThreshold );

		genreShowBubblePlot.wrangleData(genreShowData);
		rankedShows.wrangleData();
	})
}

var promises = [
	d3.json("/get_show?show_id=" + showId),
	d3.json("/get_directors"),
	d3.json("/get_genre?genre_name=" + defaultGenre),
	d3.json("/get_genres"),
	d3.json("/get_reviewer_bias"),
	d3.json("/get_raw_reviewer_scores")
];

Promise.all(promises).then(function(allData) {
	currentShowData = allData[0];
	directorData = allData[1];
	genreData = allData[2];
	genreMetaData = allData[3];
	reviewerBias = allData[4];
	rawReviewerScores = allData[5];

	genreShowData = genreData.show_data.filter( d => d.reviewed_episode_count >= episodeThreshold );
	console.log(genreShowData);

	rankedShows = new ShowBarChart('#ranked-show-bar-chart', [800, 500]);
	chartBrush = new ChartBrush('#ranked-show-chartbrush', [800, 150]);

	let midVal = Math.round(genreShowData.length / 2);

	chartBrush.setBrush([Math.max(0, midVal - 45), Math.min(genreShowData.length, midVal + 45)]);

	barChart = new BarChart('#episodes-bar-chart', [800, 700]);
	boxPlot = new BoxPlot('#season-box-chart', [800, 300]);
	// seasonBubblePlot = new BubblePlot("#ratings-plot", currentShowData.episodes, [500,330], false);

	genreFullBubblePlot = new BubblePlot("#full-genre-plot", genreMetaData, [600,500])
	genreShowBubblePlot = new BubblePlot("#genre-show-plot", genreShowData, [600,500]);
	
	directorBubblePlot = new BubblePlot("#full-director-plot", directorData, [800, 600]);

	reviewerBiasPlot = new ReviewerChart("#reviewer-bias-plot", [800, 500]);

	$(".chosen-select").chosen();
	$("#show_select_chosen, #genre_select_chosen")
		.removeAttr("style")
		.css("width", "100%");
		// .css("font-size", "14pt")
		// .css("font-family", "Helvetica");
});





