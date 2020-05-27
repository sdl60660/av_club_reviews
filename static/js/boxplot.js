
BoxPlot = function(_parentElement, _dimensions) {
    this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
}


BoxPlot.prototype.initVis = function() {
	var vis = this;

	// set the dimensions and margins of the graph
    vis.margin = {top: 60, right: 75, bottom: 40, left: 75};
    vis.width = 700 - vis.margin.left - vis.margin.right;
    vis.height = 300 - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement)
        .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.g = vis.svg.append("g")
        .attr("class", vis.parentGroupClass)
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");


    // Add x and y scales
    vis.x = d3.scalePow()
    	.domain([-100, 100])
        .range([0, vis.width])
        .exponent(5)

    vis.y = d3.scaleBand()
    	.range([0, vis.height])
    	.paddingInner(0.3)

   	// Add color scale, corresponding with other charts
    vis.seasonColor = d3.scaleOrdinal()
      .domain([0,100])
      .range(colorPalette);

    // Add Axes
    vis.yAxisCall = d3.axisLeft();
        // .orient("left")
        // .ticks(12)
        // .tickFormat(function (d) {
        //   return vis.gradeData[d];
        // });
    vis.yAxis = vis.g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + 0 + ",0)");

    vis.xAxisCall = d3.axisTop()
        .scale(vis.x)
        .tickValues([-100, -90, -80, 0, 80, 90, 100]);
    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + -10 + ")")
            .call(vis.xAxisCall);

	vis.wrangleData();
}


BoxPlot.prototype.wrangleData = function() {
	var vis = this;

	vis.episodes = currentShowData.episodes;
    vis.episodes =  vis.episodes.filter(x => x.letter_grade != null && x.letter_grade.length <= 2);

    vis.seasonsList = vis.episodes.map(function(d) {
            return d.season_number;
        }).filter(onlyUnique);

    vis.seasonData = [];
    vis.seasonsList.forEach(function(seasonNumber) {
        var seasonGroup = vis.episodes.filter(d => d.season_number == seasonNumber);

        var avSum = 0;
        var imdbSum = 0;
        seasonGroup.forEach(function(d) {
            avSum += translateGrade(d.letter_grade);
            imdbSum += d.imdb_rating;
        })

        vis.seasonData.push({
            'season_number': seasonNumber,
            'reviewed_episodes': seasonGroup.length,
            'average_av_score': 100*(1.0*avSum / seasonGroup.length)/11,
            'average_imdb_score': 10*(1.0*imdbSum / seasonGroup.length),
            'unique_id': seasonGroup[0].show_id + '-' + seasonGroup[0].season_number
        })
    })

    // console.log(vis.seasonData);

	

	vis.updateVis();
}


BoxPlot.prototype.updateVis = function() {
	var vis = this;

	vis.y.domain(vis.seasonData.map(function(d) { return d.season_number; }));

	vis.yAxisCall.scale(vis.y)
	vis.yAxis.call(vis.yAxisCall);

	// JOIN data with any existing elements
    vis.rects = vis.g.selectAll('.av-rect')
        .data(vis.seasonData, function(d) {
            return d.unique_id;
        })

    // EXIT old elements not present in new data
    vis.rects.exit()
        .transition()
            .duration(showChartsTransitionOutDuration)
            .attr("x", vis.x(0))
            .attr("width", 0)
            .remove();

    // ENTER new elements present in the data
    vis.rects
        .enter()
            .append("rect")
                // .style('stroke-width', '1px')
                // .style('stroke', 'white')
                .attr("x", vis.x(0)) 
                .attr("width", function(d) {
                	return vis.x(0);
                })
                .attr("fill", "#7FC844")
                .attr("opacity", 0.7)
                .attr("class", "av-rect")
                .attr("season", function(d) {
                    return d.season_number;
                })
                .attr("y", function(d) {
                	return vis.y(d.season_number);
                })
                .attr("height", vis.y.bandwidth())
                .transition()
                    .delay(showChartsTransitionOutDuration + 50)
                    .attr("width", function(d) {
	                	return vis.x(d.average_av_score) / 2;
	                })
                    .duration(showChartsTransitionInDuration)


    // JOIN data with any existing elements
    vis.rects = vis.g.selectAll('.imdb-rect')
        .data(vis.seasonData, function(d) {
            return d.unique_id;
        })

    // EXIT old elements not present in new data
    vis.rects.exit()
        .transition()
            .duration(showChartsTransitionOutDuration)
            .attr("x", vis.x(0))
            .attr("width", 0)
            .remove();

    // ENTER new elements present in the data
    vis.rects
        .enter()
            .append("rect")
                // .style('stroke-width', '1px')
                // .style('stroke', 'white')
                .attr("x", function(d) {
                	return vis.x(-1*d.average_imdb_score) / 2;
                }) 
                .attr("width", function(d) {
                	return vis.x(0);
                })
                .attr("fill", "#990011")
                .attr("opacity", 0.7)
                .attr("class", "imdb-rect")
                .attr("season", function(d) {
                    return d.season_number;
                })
                .attr("y", function(d) {
                	return vis.y(d.season_number);
                })
                .attr("height", vis.y.bandwidth())
                .transition()
                    .delay(showChartsTransitionOutDuration + 50)
                    .attr("width", function(d) {
	                	return vis.x(d.average_imdb_score) / 2;
	                })
                    .duration(showChartsTransitionInDuration)


    // JOIN data with any existing elements
    vis.netCircles = vis.g.selectAll('circle')
        .data(vis.seasonData, function(d) {
            return d.unique_id;
        })

    // EXIT old elements not present in new data
    vis.netCircles.exit()
        .transition()
            .duration(showChartsTransitionOutDuration)
            .attr("r", 0)
            .remove();

    // ENTER new elements present in the data
    vis.netCircles
        .enter()
            .append("circle")
                // .style('stroke-width', '1px')
                // .style('stroke', 'white')
                .attr("cx", function(d) {
                	console.log(vis.x(0), vis.x(d.average_av_score), vis.x(d.average_imdb_score));
                	return vis.x(0) + (vis.x(d.average_av_score) - vis.x(d.average_imdb_score)) / 2;
                }) 
                .attr("cy", function(d) {
                	return vis.y(d.season_number) + vis.y.bandwidth() / 2;
                })
                .attr("width", function(d) {
                	return vis.x(0);
                })
                .attr("fill", function(d) {
                	return vis.seasonColor(d.season_number);
                })
                .attr("opacity", 1.0)
                .attr("class", "net-circle")
                .attr("season", function(d) {
                    return d.season_number;
                })
                .attr("stroke-width", "1px")
                .attr("stroke", "black")
                .attr("r", 0)
                .attr("height", vis.y.bandwidth())
                .transition()
                    .delay(showChartsTransitionOutDuration + 50)
                    .attr("r", vis.y.bandwidth() / 3)
                    .duration(showChartsTransitionInDuration)

	


}