
function translateGrade(grade) {
    
    var gradeTranslationDict = {
        'A+': 11,
        'A': 11,
        'A-': 10,
        'B+': 9,
        'B': 8,
        'B-': 7,
        'C+': 6,
        'C': 5,
        'C-': 4,
        'D+': 3,
        'D': 2,
        'D-': 1,
        'F': 0
    }

    return gradeTranslationDict[grade];
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
};

function mouseover() {
    var rectClass = this.getAttribute('class').split(' ')[0];

    var val = parseFloat(this.getAttribute('grade'));
    if(isNaN(val)) {
        var valueLabel = this.getAttribute('grade');
    }
    else {
        var valueLabel = d3.format('.1f')(100*(this.getAttribute('grade') / 11.0));
    }  

    d3.selectAll('.' + rectClass)
        .attr("opacity", 0.4);
    d3.select(this)
        .attr("opacity", 0.9);

    // d3.selectAll(".season-label")
    //     .attr("opacity", 0.0);
    d3.selectAll("#season-" + this.getAttribute("season") + "-label")
        .attr("opacity", 1.0);

    d3.select('g.' + this.getAttribute("text-group-class")).append('text')
        .attr("x", parseFloat(this.getAttribute("x")) + (parseFloat(this.getAttribute("width"))/2))
        .attr("y", this.getAttribute("y") - 10)
        .attr("text-anchor", "middle")
        .attr("class", "grade-hover-text")
        .attr("color", "black")
        .text(valueLabel);
}

function mouseout() {
    var rectClass = this.getAttribute('class').split(' ')[0];
    d3.selectAll(".grade-hover-text")
        .remove();

    d3.selectAll(".season-label")
        .attr("opacity", 0.0);

    d3.selectAll('rect')
        .attr("opacity",defaultFillOpacity);
}

var defaultFillOpacity = 0.7;

BarChart = function(_parentElement, _fullData, _dimensions, _rectClass, _seasonChart) {
    this.parentElement = _parentElement;
    this.fullData = _fullData;
    this.dimensions = _dimensions;
    this.rectClass = _rectClass;
    this.seasonChart = _seasonChart;

    this.initVis();
}

BarChart.prototype.initVis = function() {
    var vis = this;

    vis.seasonColor = d3.scaleOrdinal()
      .domain([0,100])
      .range(d3.schemePaired);


    // set the dimensions and margins of the graph
    vis.margin = {top: 40, right: 30, bottom: 30, left: 50},
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

    vis.wrangleData(vis.fullData);
}


BarChart.prototype.wrangleData = function(fullData) {
    var vis = this;
    vis.fullData = fullData;

    vis.showData = vis.fullData.show
    vis.episodes = vis.fullData.episodes;

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
        .attr("transform", "translate(0," + vis.height + ")")
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
            .duration(350)
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
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
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
                    return `${vis.rectClass} season-` + d.season_number;
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
                .attr("y", vis.y(0))
                .attr("height", 0)
                .transition()
                    .delay(400)
                    .attr("height", function(d) {
                        if(vis.seasonChart) {
                            return vis.height - vis.y(d.average_score);
                        }
                        else {
                            return vis.height - vis.y(translateGrade(d.letter_grade));
                        }
                    })
                    .attr("y", function(d) {
                        if(vis.seasonChart) {
                            return vis.y(d.average_score);
                        }
                        else {
                            return vis.y(translateGrade(d.letter_grade));
                        }
                    })

                    .duration(500)
                    

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
            .attr("id", "season-" + vis.group[0].season_number + "-label")
            .attr("class", "season-label")
            .attr("text-anchor", "middle")
            .attr("color", "black")
            .attr("x", vis.linearXScale((vis.group[vis.group.length - 1].chart_index + vis.group[0].chart_index + 1)/2))
            .attr("y", vis.y(0) + 20)
            .attr("opacity", 0.0);

        if(vis.seasonChart == false) {
            vis.addSeasonAverageLine(vis.group);
        }
    }
}

BarChart.prototype.addSeasonAverageLine = function(group) {
    var vis = this;

    vis.seasonLine = vis.g.append("line")
        .attr("x1", vis.linearXScale(vis.group[0].chart_index))
        .attr("x2", vis.linearXScale(vis.group[vis.group.length - 1].chart_index + 1))
        .attr("y1", vis.y(vis.average))
        .attr("y2", vis.y(vis.average))
        .attr("class", "season-avg-line")
        .attr("stroke", "black")
        .style("stroke-dasharray", ("3, 3"));
}
    
    
