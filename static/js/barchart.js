
var defaultFillOpacity = 0.7;

BarChart = function(_parentElement, _dimensions) {
    this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
}

BarChart.prototype.initVis = function() {
    var vis = this;

    vis.seasonColor = d3.scaleOrdinal()
      .domain([0,100])
      .range(colorPalette);


    // set the dimensions and margins of the graph
    vis.margin = {top: 60, right: 75, bottom: 40, left: 75};
    vis.width = vis.dimensions[0] - vis.margin.left - vis.margin.right;
    vis.height = vis.dimensions[1] - vis.margin.top - vis.margin.bottom;

    // append the svg object to the body of the page
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.parentGroupClass = "g-" + vis.parentElement.substring(1)
    vis.g = vis.svg.append("g")
        .attr("class", vis.parentGroupClass)
        .attr("transform",
              "translate(" + vis.margin.left + "," + vis.margin.top + ")");

    vis.gradeData = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A+/A'];

    vis.y = d3.scaleLinear()
        .domain([0, 11])
        .range([ vis.height, 0 ]);

    vis.x = d3.scaleBand()
        .range([0, vis.width])


    vis.yAxisCall = d3.axisLeft()
        .scale(vis.y)
        // .orient("left")
        .ticks(12)
        .tickFormat(function (d) {
          return vis.gradeData[d];
        });


    vis.yAxis = vis.g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-5,0)")
        .call(vis.yAxisCall);

    vis.xAxisLabel = vis.g.append("text")
        .attr("id", "x-axis-label")
        .attr("x", vis.width / 2)
        .attr("y", vis.height + 25 + barChartBottomOffset)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .text("Season")


    vis.tip = d3.tip()
        .attr('class', 'd3-tip')
        .attr("transform", "translate(0, -10)")
        .html(function(d) {
            var text = "<span style='color:white'><strong>Season</strong>: " + d.season_number + "</span></br>"
            text += "<span style='color:white'><strong>Episode</strong>: " + d.episode_number + "</span></br>"
            text += "<span style='color:white'><strong>Grade</strong>: " + d.letter_grade + "</span></br>"
            text += "<span style='color:white'><strong>Reviewer</strong>: " + d.reviewer_name + "</span></br>"

            return text;
    })

    vis.g.append('circle').attr('id', 'episode-tipfollowscursor')
    vis.g.call(vis.tip);

    vis.wrangleData();
}


BarChart.prototype.wrangleData = function() {
    var vis = this;

    vis.showData = currentShowData.show;
    vis.episodes = currentShowData.episodes;

    vis.sortedEpisodes = vis.episodes.sort((a, b) => (a.season_number > b.season_number) ? 1 : (a.season_number === b.season_number) ? ((a.episode_number > b.episode_number) ? 1 : -1) : -1 );
    vis.sortedEpisodes =  vis.sortedEpisodes.filter(x => x.letter_grade != null && x.letter_grade.length <= 2);

    vis.chartData = vis.sortedEpisodes;
    for (i=0; i<vis.chartData.length; i++) {
        vis.chartData[i].chart_index = i;
    }

    vis.seasonFormatting();
}

BarChart.prototype.seasonFormatting = function() {
    var vis = this;

    vis.seasonsList = vis.sortedEpisodes.map(function(d) {
            return d.season_number;
        }).filter(onlyUnique);

    vis.seasonData = [];
    vis.seasonsList.forEach(function(seasonNumber) {
        var seasonGroup = vis.sortedEpisodes.filter(d => d.season_number == seasonNumber);

        var sum = 0;
        seasonGroup.forEach(function(d) {
            sum += translateGrade(d.letter_grade);
        })

        // console.log(seasonGroup);
        vis.seasonData.push({
            'season_number': seasonNumber,
            'reviewed_episodes': seasonGroup.length,
            'start_index': seasonGroup[0].chart_index,
            'average_score': d3.format(".1f")(1.0*sum / seasonGroup.length),
            'imdb_episode_id': seasonGroup[0].show_id + '-' + seasonGroup[0].season_number
        })
    })

    vis.setScalesAxes();
}

BarChart.prototype.setScalesAxes = function() {
    var vis = this;

    var minBarSlots = 4;
    vis.x
        .domain(vis.chartData.map(function(d) {
            return d.chart_index;
        }))
    if (vis.chartData.length < minBarSlots) {
        vis.x.range([0, vis.width*vis.chartData.length/minBarSlots]);
    }
    else {
        vis.x.range([0, vis.width]);
    }

    vis.linearXScale = d3.scaleLinear()
        .domain([0, 1 + d3.max(vis.chartData, function(d) {
            return d.chart_index;
        })])
        .range([0, vis.width])

    // Add Axes
    vis.xAxisCall = d3.axisBottom()
        .scale(vis.x)
        .tickValues([]);
    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + (vis.height + barChartBottomOffset) + ")")
            .transition()
            .call(vis.xAxisCall);

    vis.updateBars(vis.seasonData, "season");
    vis.updateBars(vis.chartData, "episode");
    vis.addOverlays();
}

BarChart.prototype.updateBars = function(data, barUnit) {
    var vis = this;

    // JOIN data with any existing elements
    vis.barChart = vis.g.selectAll('.' + barUnit + '-grade-bar')
        .data(data, function(d) {
            return d.imdb_episode_id;
        })

    // EXIT old elements not present in new data
    vis.barChart.exit()
        .transition()
            .duration(showChartsTransitionOutDuration)
            .attr("y", vis.y(0))
            .attr("height", 0)
            .remove();


    // ENTER new elements present in the data
    vis.barChart
        .enter()
            .append("rect")
                .style('stroke-width', '1px')
                .style('stroke', 'white')
                .attr("x", function(d) {
                    return barUnit == "season" ? vis.x(d.start_index) : vis.x(d.chart_index);      
                }) 
                .attr("width", function(d) {
                    return barUnit == "season" ? vis.x.bandwidth()*d.reviewed_episodes : vis.x.bandwidth();
                })
                .attr("fill", function(d) {
                    return vis.seasonColor(d.season_number);
                })
                .attr("opacity", function() {
                    return barUnit == "season" ? defaultFillOpacity : 0;
                })
                .attr("class", function(d) {
                    var allClasses = barUnit + '-grade-bar season-' + d.season_number;
                    if (barUnit == "episode") {
                        allClasses += ' chart-index-' + d.chart_index;
                    }
                    return allClasses;
                })
                .attr("season", function(d) {
                    return d.season_number;
                })
                .attr("text-group-class", vis.parentGroupClass)
                .attr("y", vis.y(0) + barChartBottomOffset)
                .attr("height", 0)
                .transition()
                    .delay(showChartsTransitionOutDuration + 50)
                    .attr("height", function(d) {
                        if(barUnit == "season") {
                            var rawHeight = vis.height - vis.y(d.average_score);
                        }
                        else {
                            var rawHeight = vis.height - vis.y(translateGrade(d.letter_grade));
                        }
                        return rawHeight + barChartBottomOffset;
                    })
                    .attr("y", function(d) {
                        return barUnit == "season" ? vis.y(d.average_score) : vis.y(translateGrade(d.letter_grade));
                    })
                    .duration(showChartsTransitionInDuration);

}

BarChart.prototype.addOverlays = function() {
    var vis = this;                

    // Remove existing overlay rectangles
    vis.g.selectAll(".hover-rect").remove();
    // Add overlay rectangles on top of visualization to trigger mouse hover actions
    // Each one lines up with a bottom-layer episode bar.
    vis.chartData.forEach(function(d,i,n) {
        vis.g.append("rect")
            .attr("class", "hover-rect season-" + d.season_number)
            .attr("x", vis.x(d.chart_index))
            .attr("width", vis.x.bandwidth())
            .attr("y", 0)
            .attr("height", vis.height + barChartBottomOffset)
            .attr("opacity", 0)
            .on("mouseover", function() {
                mouseover(d, n[i]);
            })
            .on("mouseout", function() {
                mouseout(d, n[i]);
            })
            .on("mousemove", function() {
                mousemove(d);
            })
    })

    function mousemove(data) {

        var target = d3.select('#episode-tipfollowscursor')
            .attr('cx', d3.event.offsetX - 74)
            .attr('cy', d3.event.offsetY - 100)
            .node();
        vis.tip.show(data, target);
    }

    function mouseover(data, object) {

        var target = d3.select('#episode-tipfollowscursor')
                    .attr('cx', d3.event.offsetX - 74)
                    .attr('cy', d3.event.offsetY - 100)
                    .attr("r", 0)
                    .node();

        vis.tip.show(data, target);

        d3.select("#x-axis-label")
            .attr("opacity", 0);

        d3.select(".season-grade-bar.season-" + data.season_number)
            .attr("opacity", 0);

        d3.selectAll(".episode-grade-bar.season-" + data.season_number)
            .attr("opacity", 0.4);

        d3.selectAll(".episode-grade-bar.chart-index-" + data.chart_index)
            .attr("opacity", 0.9);

        d3.selectAll(".season-" + data.season_number + "-label")
            .attr("opacity", 1.0);

        d3.selectAll(".season-avg-line.season-" + data.season_number)
            .attr("opacity", 1.0)
        
    }

    function mouseout(data, object) {
        vis.tip.hide(data);

        d3.select("#x-axis-label")
            .attr("opacity", 1);
                
        d3.select(".season-grade-bar.season-" + data.season_number)
            .attr("opacity", defaultFillOpacity);

        d3.selectAll(".episode-grade-bar.season-" + data.season_number)
            .attr("opacity", 0);

        d3.selectAll(".season-avg-line")
            .attr("opacity", 0);

        d3.selectAll(".season-" + data.season_number + "-label")
            .attr("opacity", 0);
    }

    vis.attachSeasonLabels();

}

BarChart.prototype.attachSeasonLabels = function() {
    var vis = this;

    vis.g.selectAll('.season-label').remove();
    vis.g.selectAll('.season-avg-line').remove();

    vis.seasonData.forEach(function(d) {

        // Add season labels (default to hidden)
        vis.seasonLabel = vis.g.append("text")
            .text("Season " + d.season_number)
            .attr("class", "season-label season-" + d.season_number + "-label")
            .attr("text-anchor", "middle")
            .attr("color", "black")            
            .attr("x", vis.linearXScale( d.start_index + d.reviewed_episodes / 2 ))
            .attr("y", vis.y(0) + barChartBottomOffset + 20)
            .attr("opacity", 0.0);

        vis.addSeasonAverageLine(d);
    });

}

BarChart.prototype.addSeasonAverageLine = function(group) {
    var vis = this;

    vis.seasonLine = vis.g.append("line")
        .attr("x1", vis.linearXScale(group.start_index))
        .attr("x2", vis.linearXScale(group.start_index + group.reviewed_episodes))
        .attr("y1", vis.y(group.average_score))
        .attr("y2", vis.y(group.average_score))
        .attr("class", "season-avg-line season-" + group.season_number)
        .attr("opacity", 0)
        .attr("stroke", "black")
        .style("stroke-dasharray", ("3, 3"));
}
    
    
