
ShowBarChart = function(_parentElement, _dimensions) {
	this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
}

ShowBarChart.prototype.initVis = function() {
	var vis = this;

	// set the dimensions and margins of the chart
    vis.margin = {top: 150, right: 75, bottom: 60, left: 85};
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

    vis.colorScale = d3.scaleLinear()
  		.domain([15, 0, -15])
  		.range(["green", "#ddd", "red"]);

   	vis.x = d3.scaleBand()
   		.range([0, vis.width])
   		.paddingInner(0.2);

   	vis.y = d3.scalePow()
   		.domain([-30, 30])
   		.range([vis.height, 0])
        .exponent(0.5);

   	vis.letterGrade = d3.scaleLinear()
   		.domain([9])
   		.range([-vis.height/4]);
   	
   	vis.letterGradeAxisCall = d3.axisLeft()
    	.scale(vis.letterGrade)
    	.tickValues([]);
    vis.letterGradeAxis = vis.g.append("g")
    	.attr("class", "letter-grade-tick axis")
    	.call(vis.letterGradeAxisCall);

   	// Add Axes
    vis.yAxisCall = d3.axisLeft()
    	.scale(vis.y)
    	.tickFormat(function(d) {
    		if (d > 0) {
    			return d3.format("+")(d);
    		}
    		else {
    			return d;
    		}
    	})
    vis.yAxis = vis.g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + 0 + ",0)")
        .call(vis.yAxisCall);

    vis.xAxisCall = d3.axisBottom()
        .scale(vis.x);
        // .tickValues([0]);
    vis.xAxis = vis.g.append("g")
        .attr("transform", "translate(0," + vis.height/2 + ")")
            .call(vis.xAxisCall);

    vis.g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", vis.width/2)
        .attr("y", vis.height + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .text("Reviewers")

    vis.weightedBiasTip = d3.tip()
    	.attr("class", "d3-tip")
    	.html(function() {
    		var text = '<div style="max-width:250px;"><span>A measure of how harsh or lenient a reviewer is by comparing ';
    		text +=    "their grades to their peers across the same seasons of the same shows (min. 3 seasons of overlap with other reviewers).<br><br>";
    		text +=    "Represented on a 100 point scale, where 9 points is roughly a letter grade.</span></div>";
    		return text;
    	})
    vis.g.call(vis.weightedBiasTip);
    vis.g.append("text")
        .attr("class", "y-axis-label")
        .attr("x", -vis.height/2)
        .attr("y", -32)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .attr("transform", "rotate(-90)")
        .on("mouseover", function(d) {
        	vis.weightedBiasTip.show(d);
        })
        .on("mouseout", function() {
        	vis.weightedBiasTip.hide();
        })
        .text("Weighted Bias Score");

    vis.g.append("text")
        .attr("class", "y-axis-label")
        .attr("x", -30)
        .attr("y", -32)
        .attr("text-anchor", "start")
        .style("font-size", "10px")
        .attr("transform", "rotate(-90)")
        .text("More Lenient Critic ⟶")

    vis.g.append("text")
        .attr("class", "y-axis-label")
        .attr("x", -vis.height + 30)
        .attr("y", -32)
        .attr("text-anchor", "end")
        .style("font-size", "10px")
        .attr("transform", "rotate(-90)")
        .text("⟵ Harsher Critic")

    vis.tip = d3.tip().attr('class', 'd3-tip')
        .html(function(d) {
            var text = "<span style='color:white'><strong>Show</strong>: " + d.show_name + "</span></br></br>";
            text += "<span style='color:white'><strong>Net Score</strong>: " + d3.format('+.1f')(d.rating_difference) + "</span></br>";
            // text += "<span style='color:white'><strong>Avg. IMDB Score</strong>: " + d3.format('.1f')(d.average_imdb_score) + "/100</span></br></br>";
            // text += "<span style='color:white'><strong>Net Score</strong>: " + d3.format('+.1f')(d.average_av_score - d.average_imdb_score) + "</span></br>";

            return text;
    })

    vis.g.append('circle').attr('id', 'tipfollowscursor')
    vis.g.call(vis.tip);

	vis.wrangleData();
}

ShowBarChart.prototype.wrangleData = function() {
	var vis = this;

	vis.chartData = genreShowData.sort(function(a,b) {
        return b.rating_difference - a.rating_difference;
    });


	vis.updateVis();
}

ShowBarChart.prototype.updateVis = function() {
	var vis = this;

	vis.x.domain(vis.chartData.map(function(d) { return d.show_name }))

	vis.g.selectAll("rect")
		.data(vis.chartData)
		.enter()
		.append("rect")
			.attr("class", "content-bar")
			.attr("x", function(d) {
				return vis.x(d.show_name);
			})
			.attr("height", function(d) {
				return Math.abs(vis.height/2 - vis.y(d.rating_difference));
			})
			.attr("width", vis.x.bandwidth())
			.attr("y", function(d) {
				return vis.y(Math.max(0,d.rating_difference));
			})
			.attr("fill", function(d) {
				return vis.colorScale(d.rating_difference);
			})
			.attr("opacity", 0.7)
			.on("mouseover", function(d) {
                	vis.tip.show(d);
                })
            .on("mouseout", function() {
            	vis.tip.hide();
            })

    // Overlay Bars
    vis.g.selectAll("rect.overlay")
		.data(vis.chartData)
		.enter()
		.append("rect")
			.attr("class", "overlay")
			.attr("x", function(d) {
				return vis.x(d.show_name);
			})
			.attr("height", vis.height)
			.attr("width", vis.x.bandwidth())
			.attr("y", 0)
			.attr("fill", function(d) {
				return "white";
			})
			.attr("opacity", 0)
            .on("mouseover", function(d) {
            	var target = vis.g.select('#tipfollowscursor')
                    .attr('cx', d3.event.offsetX - 84)
                    .attr('cy', d3.event.offsetY - 165)
                    .attr("r", 0)
                    .node();

        		vis.tip.show(d, target);

            })
            .on("mouseout", function() {
            	vis.tip.hide();
            })
            .on("mousemove", function(d) {

            	var target = vis.g.select('#tipfollowscursor')
                    .attr('cx', d3.event.offsetX - 84)
                    .attr('cy', d3.event.offsetY - 165)
                    .attr("r", 0)
                    .node();
        		vis.tip.show(d, target);
            })


}