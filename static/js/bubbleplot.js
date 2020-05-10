

BubblePlot = function(_parentElement) {
    this.parentElement = _parentElement;

    this.initVis();
}


BubblePlot.prototype.initVis = function() {
    var vis = this;

    // set the dimensions and margins of the graph
    vis.margin = {top: 10, right: 20, bottom: 30, left: 50};
    vis.width = 500 - vis.margin.left - vis.margin.right,
    vis.height = 420 - vis.margin.top - vis.margin.bottom;

    // append the svg object to the body of the page
    vis.svg = d3.select(vis.parentElement)
      .append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    // Add X axis
    vis.x = d3.scalePow()
        .domain([0, 100])
        .range([ 0, vis.width ])
        .exponent(3);
    vis.svg.append("g")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(d3.axisBottom(vis.x));

    // Add Y axis
    vis.y = d3.scalePow()
        .domain([0, 100])
        .range([ vis.height, 0])
        .exponent(3);
    vis.svg.append("g")
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
        var seasonGroup = currentShowData.episodes.filter(d => d.season_number == seasonNumber);

        var avSum = 0;
        var imdbSum = 0;
        seasonGroup.forEach(function(d) {
            avSum += translateGrade(d.letter_grade);
            imdbSum += d.imdb_rating;
        })

        // console.log(seasonGroup);
        vis.seasonData.push({
            'season_number': seasonNumber,
            'reviewed_episode_count': seasonGroup.length,
            'average_av_rating': 100*(d3.format(".1f")(1.0*avSum / seasonGroup.length)/11),
            'average_imdb_rating': 10*d3.format(".1f")(1.0*imdbSum / seasonGroup.length)
        })
    })

    vis.chartData = vis.seasonData;

    vis.updateVis();
}


BubblePlot.prototype.updateVis = function() {
    var vis = this;

    vis.svg.append('g')
    .selectAll("dot")
    .data(vis.chartData, function(d) {
        return d.season_number;
    })
    .enter()
    .append("circle")
      .attr("cx", function (d) { return vis.x(d.average_imdb_rating); } )
      .attr("cy", function (d) { return vis.y(d.average_av_rating); } )
      .attr("r", function (d) { return vis.z(d.reviewed_episode_count); } )
      .style("fill", function(d) { return vis.seasonColor(d.season_number); } )
      .style("opacity", "0.7")
      .attr("stroke", "black")

}

