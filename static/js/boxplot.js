
BoxPlot = function(_parentElement, _dimensions) {
    this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
}


BoxPlot.prototype.initVis = function() {
	var vis = this;

	// set the dimensions and margins of the chart
    vis.margin = {top: 60, right: 40, bottom: 40, left: 200};
    vis.width = vis.dimensions[0] - vis.margin.left - vis.margin.right;
    vis.height = vis.dimensions[1] - vis.margin.top - vis.margin.bottom;

    vis.svg = d3.select(vis.parentElement)
        .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.g = vis.svg.append("g")
        .attr("class", vis.parentGroupClass)
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");


    // Add x and y scales
    vis.x = d3.scaleLinear()
    	.domain([-35, 35])
        .range([0, vis.width])
        // .exponent(5)

    vis.y = d3.scaleBand()
    	.range([0, vis.height])
    	.paddingInner(0.3)

   	// Add color scale, corresponding with other charts
    vis.seasonColor = d3.scaleOrdinal()
      .domain([0,100])
      .range(colorPalette);

    // Add Axes
    vis.yAxisCall = d3.axisLeft()
        // .orient("left")
        .ticks(0)
        .tickValues([])
        .tickSize(0)
        // .tickFormat(function (d) {
        // 	return 'Season ' + d;
        // });
    vis.yAxis = vis.g.append("g")
        .attr("class", "y axis y-axis")
        .attr("transform", "translate(" + vis.width/2 + ",0)")
        .attr("stroke", "black")
        .style("stroke-dasharray", ("3, 3"));

    vis.xAxisCall = d3.axisTop()
        .scale(vis.x)
        .tickValues([-30, -20, -10, 0, 10, 20, 30])
        .tickFormat(function(d) {
        	if (d > 0) {
        		return d3.format("+")(d)
        	}
        	else {
        		return d;
        	}
        })
    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + -10 + ")")
            .call(vis.xAxisCall);

    d3.selectAll(".y-axis>.tick>text")
  		.each(function(d, i){
    		d3.select(this).style("font-size","14px");
  		});


    vis.g.append("text")
    	.attr("x", 0)
    	.attr("y", 10)
    	.attr("text-anchor", "start")
    	.style("font-size", "13px")
    	.text("⟵ IMDB Community Score is Higher")

    vis.g.append("text")
    	.attr("x", vis.width)
    	.attr("y", 10)
    	.attr("text-anchor", "end")
    	.style("font-size", "13px")
    	.text("AV Club Score is Higher ⟶")

    vis.tip = d3.tip().attr('class', 'd3-tip')
        .html(function(d) {
            var text = "<span style='color:white'><strong>Season " + d.season_number + "</strong></span></br></br>";

            text += "<span style='color:white'><strong>Avg. AV Club Review</strong>: " + d3.format('.1f')(d.average_av_score) + "/100" + "</span></br>";
            text += "<span style='color:white'><strong>Avg. IMDB Score</strong>: " + d3.format('.1f')(d.average_imdb_score) + "/100</span></br></br>";
            text += "<span style='color:white'><strong>Net Score</strong>: " + d3.format('+.1f')(d.average_av_score - d.average_imdb_score) + "</span></br>";

            return text;
    })
    vis.g.call(vis.tip);

	vis.wrangleData();
}


BoxPlot.prototype.wrangleData = function() {
	var vis = this;

	vis.episodes = currentShowData.episodes;
    vis.episodes =  vis.episodes.filter(x => x.letter_grade != null && x.letter_grade.length <= 2 && x.imdb_rating != null);

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
    d3.selectAll(".off-chart-text").remove();
	

	vis.updateVis();
}


BoxPlot.prototype.updateVis = function() {
	var vis = this;

	vis.y.domain(vis.seasonData.map(function(d) { return d.season_number; }));

	var radiusVal = Math.min(10, vis.y.bandwidth() / 3);

	vis.yAxisCall.scale(vis.y)
	vis.yAxis.call(vis.yAxisCall);

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
                .attr("cx", function(d, i, n) {
                	var xVal = vis.x(d.average_av_score - d.average_imdb_score)
                	if( d.average_av_score - d.average_imdb_score < -30 ) {
                		d3.selectAll(".off-chart-text").remove();
                		vis.g.append("text")
                			.attr("x", xVal + 2*(radiusVal) + 2)
                			.attr("y", vis.y(d.season_number) + (vis.y.bandwidth() / 2))
                			.attr("class", "off-chart-text")
                			.attr("text-anchor", "start")
                			.text("⟵ This one's off the chart!")
                	}
                	else if (d.average_av_score - d.average_imdb_score > 30) {
                		d3.selectAll(".off-chart-text").remove();
                		vis.g.append("text")
                			.attr("x", xVal - 2*(radiusVal) - 2)
                			.attr("y", vis.y(d.season_number) + (vis.y.bandwidth() / 2))
                			.attr("class", "off-chart-text")
                			.attr("text-anchor", "end")
                			.text("This one's off the chart! ⟶")
                	}
                	return xVal
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
                .attr("opacity", 0.8)
                .attr("class", "net-circle")
                .attr("season", function(d) {
                    return d.season_number;
                })
                .attr("r", 0)
                .attr("height", vis.y.bandwidth())
                .on("mouseover", function(d) {
                	vis.tip.show(d);
                })
                .on("mouseout", function() {
                	vis.tip.hide();
                })
                .transition()
                    .delay(showChartsTransitionOutDuration + 50)
                    .attr("r", radiusVal)
                    .duration(showChartsTransitionInDuration)

	


}