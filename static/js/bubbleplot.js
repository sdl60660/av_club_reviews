

BubblePlot = function(_parentElement, _chartData, _dimensions, _summarizedData) {
    this.parentElement = _parentElement;
    this.chartData = _chartData;
    this.dimensions = _dimensions;
    this.summarizedData = _summarizedData;

    this.initVis();
}


BubblePlot.prototype.initVis = function() {
    var vis = this;

    // set the dimensions and margins of the graph
    vis.margin = {top: 30, right: 80, bottom: 40, left: 70};
    vis.width = vis.dimensions[0] - vis.margin.left - vis.margin.right,
    vis.height = vis.dimensions[1] - vis.margin.top - vis.margin.bottom;

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
        .domain([ 0, 100 ])
        .range([ 0, vis.width ])
        .exponent(chartScaleExponent);
    
    vis.g.append("g")
        .attr("transform", "translate(0," + vis.height + ")")
        .call(d3.axisBottom(vis.x)
                .tickValues([0, 20,30,40,50,60,70,80,90,100]));

    vis.tip = d3.tip().attr('class', 'd3-tip')
        .html(function(d) {
            var text = "<span style='color:white'>" + d.category_value.replace('_', ' ') + "</span></br></br>"

            text +=  "<span style='color:white'>Avg. AV Club Rating: " + d3.format('.1f')(d.average_av_rating) + "/100</span></br>"
            text +=  "<span style='color:white'>Avg. IMDB Rating: " + d3.format('.1f')(d.average_imdb_rating) + "/100</span></br>"

            return text;
    })
    vis.g.call(vis.tip);

    vis.reverseGradeTranslate = d3.scaleQuantize()
        .domain([0, 100])
        .range(['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A+/A']);
    // Add Y axis
    vis.y = d3.scalePow()
        .domain([ 0, 100 ])
        .range([ vis.height, 0 ])
        .exponent(chartScaleExponent);
    vis.g.append("g")
        .call(d3.axisLeft(vis.y)
            .tickValues([0,19,28,37,46,55,64,73,82,91,100])
            .tickFormat(vis.reverseGradeTranslate));

    // Add a scale for bubble size
    vis.z = d3.scaleLog()
        .range([ 3, 15 ]);

    vis.seasonColor = d3.scaleOrdinal()
        .domain([ 0, 100 ])
        .range(colorPalette);

    vis.reverseGradeTranslate = d3.scaleQuantize()
        .domain([0, 100])
        .range(['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A+/A']);

    vis.dividerLine = vis.g.append("line")
        .attr("x1", 0)
        .attr("x2", vis.width)
        .attr("y1", vis.height)
        .attr("y2", 0)
        .attr("class", "divider-line")
        .attr("stroke", "black")
        .style("stroke-dasharray", ("3, 3"));

    vis.g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", vis.width)
        .attr("y", vis.height + 30)
        .attr("text-anchor", "end")
        .style("font-size", "13px")
        .text("Avg. IMDB Rating")

    vis.g.append("text")
        .attr("class", "y-axis-label")
        .attr("x", 0)
        .attr("y", -38)
        .attr("text-anchor", "end")
        .style("font-size", "13px")
        .attr("transform", "rotate(-90)")
        .text("Avg. AV Club Review")

    vis.addBackgroundColoring();
    vis.wrangleData(vis.chartData);
}


BubblePlot.prototype.wrangleData = function(_chartData) {
    var vis = this;
    vis.chartData = _chartData;

    vis.chartData.forEach(function(d) {
        if(d.season_number == undefined) {
            d['season_number'] = d.category_value;
        }
        // else {
            // d['season_number'] = 'Season ' + d['season_number'];
        // }
    })

    if (vis.summarizedData == true) {
        vis.updateVis();
    }
    else {
        vis.seasonsList = vis.chartData.map(function(d) {
                return d.season_number;
            }).filter(onlyUnique);

        vis.seasonData = [];
        vis.seasonsList.forEach(function(seasonNumber) {
            var seasonGroup = vis.chartData.filter(d => d.season_number == seasonNumber && d.imdb_rating != null && d.letter_grade != null);

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
                    'category_value': seasonNumber,
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
}


BubblePlot.prototype.updateVis = function() {
    var vis = this;

    vis.defaultOpacity = 0.7;
    vis.chartData.sort((a, b) => (a.reviewed_episode_count < b.reviewed_episode_count) ? 1 : -1)

    vis.z
        .domain([
            d3.min(vis.chartData, function(d) {
                return d.reviewed_episode_count;
            }),
            Math.max(d3.max(vis.chartData, function(d) {
                return d.reviewed_episode_count;
            }), 30)
        ]);

    // JOIN data with any existing elements
    vis.circles = vis.g.selectAll("circle")
        .data(vis.chartData, function(d) {
            return d.unique_id;
        })

    // EXIT old elements not present in new data
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
            .attr("opacity", vis.defaultOpacity)
            // .attr("stroke", "black")
            .attr("cy", function (d) { return vis.y(d.average_av_rating); } )
            .attr("cx", function (d) { return vis.x(d.average_imdb_rating); } )
            .attr("season", function(d) { return `${d.category_value}`.replace(/./g, ''); })
            .attr("class", function(d) { return `season-${d.category_value}-rating-plot rating-plot`.replace(/./g, ''); })
            .style("fill", function(d) { return vis.seasonColor(d.category_value); } )
            .on("mouseover", function(d, i, n) {
                mouseover(d, n[i]);
            })
            .on("mouseout", function(d) {
                mouseout(d);
            })
            .transition()
                .delay(showChartsTransitionOutDuration + 50)
                .duration(showChartsTransitionInDuration)
                .attr("r", function (d) { return vis.z(d.reviewed_episode_count); } )

    function mouseover(data, object) {
        vis.tip.show(data);

        vis.g.selectAll("circle")
            .attr("opacity", 0.4);

        d3.select(object)
            .attr("opacity", 0.9);

        d3.selectAll(".season-" + object.getAttribute("season") + "-label")
            .attr("opacity", 1.0);

        d3.selectAll("rect.show-grade-bar")
            .attr("opacity", 0.4);

        var seasonNumber = object.getAttribute("season");
        d3.selectAll(`rect.season-${seasonNumber}`)
            .attr("opacity", 0.9);
    }

    function mouseout(data) {
        vis.tip.hide(data);

        vis.g.selectAll("circle")
            .attr("opacity", vis.defaultOpacity);

        d3.selectAll(".season-label")
            .attr("opacity", 0.0);

        d3.selectAll("rect.show-grade-bar")
            .attr("opacity", vis.defaultOpacity);

        // vis.g.select(this)
        //     .attr("opacity", 0.9)
    }

    vis.svg.select(".legend-group").remove();
    vis.attachCircleSizeLegend();

}


BubblePlot.prototype.attachCircleSizeLegend = function() {
    var vis = this;

    // I'll find the inverse for these values then find the closest round number to use for the actual
    // radius values that will be entered into the z scale later
    var approximateRadiusValues = [ 3, 10, 15 ];
    var sampleValues = [];

    approximateRadiusValues.forEach(function(d) {
            var roundedInverse = Math.round(vis.z.invert(d));
            var numDigits = roundedInverse.toString().length;
            var divisor = 10**(numDigits-1);
            var roundedValue = divisor * Math.round(roundedInverse / divisor);

            sampleValues.push(roundedValue);
    })

    var topSampleY;

    vis.legendGroup = vis.svg.append("g")
        .attr("x", vis.width)
        .attr("y", 0)
        .attr("class", "legend-group")
        .attr("transform", "translate(6,0)")

    sampleValues.forEach(function(numReviews, i) {
        var radius = vis.z(numReviews);
        var yCoordinate = vis.height - 5 - (15*i);
        var xCoordinate = vis.width + 70;

        if(i>0) {
            var previousItems = sampleValues.slice(0,i);
            var previousRadii = previousItems.map(function(d) {
                                    return 2*vis.z(d);
                                });

            var heightOffset = previousRadii.reduce(function(a,b){
                                    return a+b;
                                });
            // console.log(previousItems, previousRadii, heightOffset);
            yCoordinate -= heightOffset
        }

        vis.legendGroup.append("circle")
            .attr("cx", xCoordinate)
            .attr("cy", yCoordinate)
            .attr("r", radius)
            .attr("class", "legend-circle")
            .attr("fill", "gray")
            .attr("fill-opacity", 0.7)
            .attr("stroke", "black")

        vis.legendGroup.append("line")
            .attr("x1", xCoordinate+radius+3)
            .attr("x2", vis.width+95)
            .attr("y1", yCoordinate)
            .attr("y2", yCoordinate)
            .attr("class", "legend-dash")
            .attr("stroke", "black")
            .style("stroke-dasharray", ("2, 2"));

        vis.legendGroup.append("text")
            .attr("x", vis.width+95)
            .attr("y", yCoordinate)
            .attr("class", "legend-text")
            .style("font-size", "10px")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "central")
            .text(numReviews);

        topSampleY = yCoordinate - radius;

    })

    vis.legendGroup.append("text")
        .attr("y", topSampleY - 10)
        .attr("x", vis.width + 80)
        .attr("text-anchor", "middle")
        .attr("text-decoration", "underline")
        .style("font-size", "10px")
        .text("Num. Reviews")
}

BubblePlot.prototype.addBackgroundColoring = function() {
    var vis = this;

    vis.grad = vis.svg.append('defs')
        .append('linearGradient')
        .attr('id', 'grad')
        .attr('x1', '0%')
        .attr('x2', '100%')
        .attr('y1', '0%')
        .attr('y2', '100%');

    var colors = ['green','white','red']
    vis.grad.selectAll('stop')
        .data(colors)
        .enter()
        .append('stop')
        .style('stop-color', function(d){ return d; })
        .attr('offset', function(d,i){
            return 100 * (i / (colors.length - 1)) + '%';
        });

    vis.g.append("rect")
        .attr("x", 0)
        .attr("width", vis.width)
        .attr("y", 0)
        .attr("height", vis.height)
        .attr("fill", 'url(#grad)')
        .attr("fill-opacity", 0.25);


    vis.rightCornerText = vis.g.append("g")
    vis.rightCornerText.append("text")
        .attr("x", vis.width - 70)
        .attr("y", vis.height - 30)
        .attr("width", 30)
        .attr("text-anchor", "middle")
        .text("AV Club Score Is Worse")
    vis.rightCornerText.append("text")
        .attr("x", vis.width - 70)
        .attr("y", vis.height - 20)
        .attr("width", 30)
        .attr("text-anchor", "middle")
        .text("Relative to IMDB Rating")

    vis.leftCornerText = vis.g.append("g")
    vis.leftCornerText.append("text")
        .attr("x", 70)
        .attr("y", 20)
        .attr("width", 30)
        .attr("text-anchor", "middle")
        .text("AV Club Score Is Better")
    vis.leftCornerText.append("text")
        .attr("x", 70)
        .attr("y", 30)
        .attr("width", 30)
        .attr("text-anchor", "middle")
        .text("Relative to IMDB Rating")

}

