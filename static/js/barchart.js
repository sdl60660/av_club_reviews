
var defaultFillOpacity = 0.7;

BarChart = function(_parentElement, _dimensions, _rectClass, _seasonChart) {
    this.parentElement = _parentElement;
    this.dimensions = _dimensions;
    this.rectClass = _rectClass;
    this.seasonChart = _seasonChart;

    this.initVis();
}

BarChart.prototype.initVis = function() {
    var vis = this;

    vis.seasonColor = d3.scaleOrdinal()
      .domain([0,100])
      .range(colorPalette);


    // set the dimensions and margins of the graph
    vis.margin = {top: 40, right: 73, bottom: 40, left: 50},
        vis.width = vis.dimensions[0] - vis.margin.left - vis.margin.right,
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

    vis.g.call(vis.tip);


    vis.wrangleData();
}


BarChart.prototype.wrangleData = function() {
    var vis = this;

    vis.showData = currentShowData.show
    vis.episodes = currentShowData.episodes;

    // console.log(vis.episodes);

    vis.sortedEpisodes = vis.episodes.sort((a, b) => (a.season_number > b.season_number) ? 1 : (a.season_number === b.season_number) ? ((a.episode_number > b.episode_number) ? 1 : -1) : -1 );
    vis.sortedEpisodes =  vis.sortedEpisodes.filter(x => x.letter_grade != null && x.letter_grade.length <= 2);

    vis.lastSeason = vis.sortedEpisodes[vis.sortedEpisodes.length - 1].season_number;

    if(vis.seasonChart) {
        vis.seasonFormatting();
    }
    else {
        vis.chartData = vis.sortedEpisodes;
        vis.updateVis();
    }
    
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
            'average_score': d3.format(".1f")(1.0*sum / seasonGroup.length),
            'imdb_episode_id': seasonGroup[0].show_id + '-' + seasonGroup[0].season_number
        })
    })

    vis.chartData = vis.seasonData;
    vis.updateVis();
}


BarChart.prototype.updateVis = function() {
    var vis = this;

    for (i=0; i<vis.chartData.length; i++) {
        vis.chartData[i].chart_index = i;
    }

    vis.x.domain(vis.chartData.map(function(d) {
        return d.chart_index;
    }))
    
    vis.linearXScale = d3.scaleLinear()
        .domain([0, 1 + d3.max(vis.chartData, function(d) {
            return d.chart_index;
        })])
        .range([0, vis.width])
    // .paddingInner(0.1);

    // Add Axes
    vis.xAxisCall = d3.axisBottom()
        .scale(vis.x)
        .tickValues([]);
    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + (vis.height + barChartBottomOffset) + ")")
            .transition()
            .call(vis.xAxisCall);


    // JOIN data with any existing elements
    vis.barChart = vis.g.selectAll('rect')
        .data(vis.chartData, function(d) {
            return d.imdb_episode_id;
        })
        // .data(vis.chartData)


    // EXIT old elements not present in new data
    vis.barChart.exit()
        .transition()
            .duration(showChartsTransitionOutDuration)
            // .delay(function(d,i) {
            //     return i*30;
            // })
            .attr("y", vis.y(0))
            .attr("height", 0)
            .remove();

    // ENTER new elements present in the data...
    vis.barChart
        .enter()
            .append("rect")
                .style('stroke-width', '1px')
                .style('stroke', 'white')
                .on("mouseover", function(d,i,n) {
                    mouseover(d, n[i]);
                })
                .on("mouseout", function(d,i,n) {
                    mouseout(d, n[i]);
                })
                // .merge(vis.barChart)
                .attr("x", function(d) {
                    return vis.x(d.chart_index);
                }) 
                .attr("width", vis.x.bandwidth)
                .attr("fill", function(d) {
                    return vis.seasonColor(d.season_number);
                })
                .attr("opacity", defaultFillOpacity)
                .attr("class", function(d) {
                    return `show-grade-bar ${vis.rectClass} season-` + d.season_number;
                })
                .attr("season", function(d) {
                    return d.season_number;
                })
                .attr("grade", function(d) {
                    if(vis.seasonChart) {
                        return d.average_score;
                    }
                    else {
                        return d.letter_grade; 
                    }
                })
                .attr("text-group-class", vis.parentGroupClass)
                .attr("y", vis.y(0) + barChartBottomOffset)
                .attr("height", 0)
                .transition()
                    .delay(showChartsTransitionOutDuration + 50)
                    .attr("height", function(d) {
                        if(vis.seasonChart) {
                            var rawHeight = vis.height - vis.y(d.average_score);
                        }
                        else {
                            var rawHeight = vis.height - vis.y(translateGrade(d.letter_grade));
                        }

                        return rawHeight + barChartBottomOffset;
                    })
                    .attr("y", function(d) {
                        if(vis.seasonChart) {
                            return vis.y(d.average_score);
                        }
                        else {
                            return vis.y(translateGrade(d.letter_grade));
                        }
                    })

                    .duration(showChartsTransitionInDuration)
                    

    vis.g.selectAll('.season-label').remove();
    vis.g.selectAll('.season-avg-line').remove();

    for (i=1; i<=vis.lastSeason; i++) {

        vis.group = vis.chartData.filter((episode) => episode.season_number == i);
        if (vis.group.length == 0) {
            continue;
        }

        vis.average = vis.group.reduce((total, next) => total + translateGrade(next.letter_grade), 0) / vis.group.length;

        // Add season labels (default to hidden)
        vis.seasonLabel = vis.g.append("text")
            .text("Season " + vis.group[0].season_number)
            .attr("class", "season-label season-" + vis.group[0].season_number + "-label")
            .attr("text-anchor", "middle")
            .attr("color", "black")
            .attr("x", vis.linearXScale((vis.group[vis.group.length - 1].chart_index + vis.group[0].chart_index + 1)/2))
            .attr("y", vis.y(0) + barChartBottomOffset + 20)
            .attr("opacity", 0.0);

        if(vis.seasonChart == false) {
            vis.addSeasonAverageLine(vis.group);
        }
    }


    function mouseover(data, object) {
        vis.tip.show(data);

        var rectClass = object.getAttribute('class').split(' ')[0];

        // var val = parseFloat(object.getAttribute('grade'));
        // if(isNaN(val)) {
        //     var valueLabel = object.getAttribute('grade');
        // }
        // else {
        //     var valueLabel = d3.format('.1f')(100*(object.getAttribute('grade') / 11.0));
        // }  

        d3.selectAll('.' + rectClass)
            .attr("opacity", 0.4);
        d3.select(object)
            .attr("opacity", 0.9);

        // d3.selectAll(".season-label")
        //     .attr("opacity", 0.0);
        d3.selectAll(".season-" + object.getAttribute("season") + "-label")
            .attr("opacity", 1.0);

        // d3.select('g.' + object.getAttribute("text-group-class")).append('text')
        //     .attr("x", parseFloat(object.getAttribute("x")) + (parseFloat(object.getAttribute("width"))/2))
        //     .attr("y", object.getAttribute("y") - 10)
        //     .attr("text-anchor", "middle")
        //     .attr("class", "grade-hover-text")
        //     .attr("color", "black")
        //     .text(valueLabel);
        
    }

    function mouseout(data, object) {
        vis.tip.hide(data);

        var rectClass = object.getAttribute('class').split(' ')[0];
        d3.selectAll(".grade-hover-text")
            .remove();

        d3.selectAll(".season-label")
            .attr("opacity", 0.0);

        d3.selectAll('rect')
            .attr("opacity",defaultFillOpacity);
    }
}

BarChart.prototype.addSeasonAverageLine = function(group) {
    var vis = this;

    vis.seasonLine = vis.g.append("line")
        .attr("x1", vis.linearXScale(vis.group[0].chart_index))
        .attr("x2", vis.linearXScale(vis.group[vis.group.length - 1].chart_index + 1))
        .attr("y1", vis.y(vis.average) + barChartBottomOffset)
        .attr("y2", vis.y(vis.average) + barChartBottomOffset)
        .attr("class", "season-avg-line")
        .attr("stroke", "black")
        .style("stroke-dasharray", ("3, 3"));
}
    
    
