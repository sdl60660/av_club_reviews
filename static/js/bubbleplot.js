

BubblePlot = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
}


BubblePlot.prototype.initVis = function() {
    var vis = this;

    // set the dimensions and margins of the graph
    vis.margin = {top: 30, right: 50, bottom: 30, left: 50};
    vis.width = 450 - vis.margin.left - vis.margin.right,
    vis.height = 330 - vis.margin.top - vis.margin.bottom;

    // append the svg object to the body of the page
    vis.svg = d3.select(vis.parentElement)
      .append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
    
    vis.g = vis.svg.append("g")
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");


    var chartScaleExponent = 2.0;
    // Add X axis
    vis.x = d3.scalePow()
        .domain([0, 100])
        .range([ 0, vis.width ])
        .exponent(chartScaleExponent);
    
    vis.g.append("g")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(d3.axisBottom(vis.x));

    // Add Y axis
    vis.y = d3.scalePow()
        .domain([0, 100])
        .range([ vis.height, 0])
        .exponent(chartScaleExponent);
    vis.g.append("g")
        .call(d3.axisLeft(vis.y));

    // Add a scale for bubble size
    vis.z = d3.scaleLinear()
        .domain([1, 50])
        .range([ 10, 40]);

    vis.seasonColor = d3.scaleOrdinal()
      .domain([0,100])
      .range(d3.schemePaired);

    vis.wrangleData();
}


BubblePlot.prototype.wrangleData = function() {
    var vis = this;

    vis.seasonsList = currentShowData.episodes.map(function(d) {
            return d.season_number;
        }).filter(onlyUnique);

    vis.seasonData = [];
    vis.seasonsList.forEach(function(seasonNumber) {
        var seasonGroup = currentShowData.episodes.filter(d => d.season_number == seasonNumber && d.imdb_rating != null && d.letter_grade != null);

        console.log(seasonGroup);

        var avSum = 0;
        var imdbSum = 0;
        seasonGroup.forEach(function(d) {
            avSum += translateGrade(d.letter_grade);
            imdbSum += d.imdb_rating;
        })

        var average_av = 100*(d3.format(".1f")(1.0*avSum / seasonGroup.length)/11)
        var average_imdb = 10*d3.format(".1f")(1.0*imdbSum / seasonGroup.length)

        if(average_av > 0 && average_imdb > 0) {
            // console.log(seasonGroup);
            vis.seasonData.push({
                'season_number': seasonNumber,
                'reviewed_episode_count': seasonGroup.length,
                'average_av_rating': average_av,
                'average_imdb_rating': average_imdb,
                'unique_id': seasonGroup[0].show_id + '-' + seasonGroup[0].season_number
            }
        )}
    })

    vis.chartData = vis.seasonData;

    vis.updateVis();
}


BubblePlot.prototype.updateVis = function() {
    var vis = this;

    console.log(vis.chartData);

    // JOIN data with any existing elements
    vis.circles = vis.g.selectAll("circle")
        .data(vis.chartData, function(d) {
            return d.unique_id;
        })


    // EXIT old elements not present in new data
    // Maybe change this to shrink all circles to radius=0 and have them enter by starting at radius=0
    vis.circles
        .exit()
            .transition()
                .duration(showChartsTransitionOutDuration)
                .attr("r", 0)
            .remove();

    // ENTER new elements present in the data...
    vis.circles
        .enter()
        .append("circle")
            .style("opacity", "0.7")
            .attr("stroke", "black")
            .attr("cy", function (d) { console.log(d.average_av_rating); return vis.y(d.average_av_rating); } )
            .attr("cx", function (d) { return vis.x(d.average_imdb_rating); } )
            .style("fill", function(d) { return vis.seasonColor(d.season_number); } )
            .transition()
                .delay(showChartsTransitionOutDuration + 50)
                .duration(showChartsTransitionInDuration)
                .attr("r", function (d) { return vis.z(d.reviewed_episode_count); } )

}

