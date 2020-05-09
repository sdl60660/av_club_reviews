

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

function mouseover() {
    d3.selectAll(".episode-bar")
        .attr("opacity", 0.4)
    d3.select(this)
        .attr("opacity", 0.9);

    d3.selectAll(".season-label")
        .attr("opacity", 0.0);
    d3.select("#season-" + this.getAttribute("season") + "-label")
        .attr("opacity", 1.0);

    d3.select('g').append('text')
        .attr("x", parseFloat(this.getAttribute("x")) + (parseFloat(this.getAttribute("width"))/2))
        .attr("y", this.getAttribute("y") - 10)
        .attr("text-anchor", "middle")
        .attr("class", "grade-hover-text")
        .attr("color", "black")
        .text(this.getAttribute('grade'));
}

function mouseout() {
    d3.selectAll(".grade-hover-text")
        .remove();

    d3.selectAll(".season-label")
        .attr("opacity", 1.0);

    d3.selectAll(".episode-bar")
        .attr("opacity",defaultFillOpacity);
}

var defaultFillOpacity = 0.7;

BarChart = function(_parentElement, _fullData) {
    this.parentElement = _parentElement;
    this.fullData = _fullData;
    // this.yVariable = _yVariable;

    this.initVis(this.fullData);
}

BarChart.prototype.initVis = function(fullData) {
    var vis = this;

    vis.season_numberColor = d3.scaleOrdinal()
      .domain([0,100])
      .range(d3.schemePaired);


    // set the dimensions and margins of the graph
    vis.margin = {top: 40, right: 30, bottom: 30, left: 50},
        vis.width = 800 - vis.margin.left - vis.margin.right,
        vis.height = 600 - vis.margin.top - vis.margin.bottom;

    // append the svg object to the body of the page
    vis.svg = d3.select(vis.parentElement)
        .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

    vis.g = vis.svg.append("g")
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

    vis.wrangleData(fullData);
}


BarChart.prototype.wrangleData = function(fullData) {
    var vis = this;
    vis.fullData = fullData;

    vis.showData = vis.fullData.show
    vis.episodes = vis.fullData.episodes;

    console.log(vis.episodes);

    vis.sortedEpisodes = vis.episodes.sort((a, b) => (a.season_number > b.season_number) ? 1 : (a.season_number === b.season_number) ? ((a.episode_number > b.episode_number) ? 1 : -1) : -1 );
    vis.sortedEpisodes =  vis.sortedEpisodes.filter(x => x.letter_grade != null && x.letter_grade.length <= 2);

    for (i=0; i<vis.sortedEpisodes.length; i++) {
        vis.sortedEpisodes[i].chart_index = i;
    }

    vis.updateVis();
    
}


BarChart.prototype.updateVis = function() {
    var vis = this;

    vis.x.domain(vis.sortedEpisodes.map(function(d) {
        return d.chart_index;
    }))
    
    vis.linearXScale = d3.scaleLinear()
    .domain([0, 1 + d3.max(vis.sortedEpisodes, function(d) {
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

    vis.lastSeason = vis.sortedEpisodes[vis.sortedEpisodes.length - 1].season_number;

    // JOIN data with any existing elements
    vis.barChart = vis.g.selectAll("rect")
        .data(vis.sortedEpisodes, function(d) {
            return d.imdb_episode_id;
        })

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
                    return vis.season_numberColor(d.season_number);
                })
                .attr("opacity", defaultFillOpacity)
                .attr("class", function(d) {
                    return "episode-bar season_number-" + d.season_number;
                })
                .attr("season", function(d) {
                    return d.season_number;
                })
                .attr("grade", function(d) {
                    return d.letter_grade;
                })
                .attr("y", vis.y(0))
                .attr("height", 0)
                
                .transition()
                    // .delay(function(d,i) {
                    //     return 400+(i*30);
                    // })
                    .delay(400)
                    .attr("height", function(d) {
                        return vis.height - vis.y(translateGrade(d.letter_grade));
                    })
                    .attr("y", function(d) {
                        return vis.y(translateGrade(d.letter_grade));
                    })

                    .duration(500)
                    

    d3.selectAll('.season-avg-line').remove();
    d3.selectAll('.season-label').remove();

    for (i=1; i<=vis.lastSeason; i++) {

        vis.group = vis.sortedEpisodes.filter((episode) => episode.season_number == i);
        if (vis.group.length == 0) {
            continue;
        }

        vis.average = vis.group.reduce((total, next) => total + translateGrade(next.letter_grade), 0) / vis.group.length;

        vis.seasonLine = vis.g.append("line")
            .attr("x1", vis.linearXScale(vis.group[0].chart_index))
            .attr("x2", vis.linearXScale(vis.group[vis.group.length - 1].chart_index + 1))
            .attr("y1", vis.y(vis.average))
            .attr("y2", vis.y(vis.average))
            .attr("class", "season-avg-line")
            .attr("stroke", "black")
            .style("stroke-dasharray", ("3, 3"));

        vis.seasonLabel = vis.g.append("text")
            .text("Season " + vis.group[0].season_number)
            .attr("id", "season-" + vis.group[0].season_number + "-label")
            .attr("class", "season-label")
            .attr("text-anchor", "middle")
            .attr("color", "black")
            .attr("x", vis.linearXScale((vis.group[vis.group.length - 1].chart_index + vis.group[0].chart_index)/2))
            .attr("y", vis.y(0) + 20);
    }



}
    
    
