
ShowBarChart = function(_parentElement, _dimensions) {
	this.parentElement = _parentElement;
    this.dimensions = _dimensions;

    this.initVis();
}

ShowBarChart.prototype.initVis = function() {
	const vis = this;

	// set the dimensions and margins of the chart
    vis.margin = {top: 50, right: 75, bottom: 50, left: 75};
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

   	// Add Axes
    vis.yAxisCall = d3.axisLeft();
    vis.yAxis = vis.g.append("g")
		.style("font", "10px")
        .attr("class", "y axis y-axis")
        .attr("transform", "translate(" + 0 + ",0)");

    vis.xAxisCall = d3.axisBottom();
        // .tickValues([0]);
    vis.xAxis = vis.g.append("g")
		.style("font", "10px")
		.attr("class", "x axis x-axis")
        .attr("transform", "translate(0," + vis.height + ")");

    vis.g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", vis.width/2)
        .attr("y", vis.height + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .text("Reviewers")

    vis.weightedBiasTip = d3.tip()
    	.attr("class", "d3-tip")
    	.html(function(d) {
			let text = '<div style="max-width:250px;"><span>';

    		if (showBarVar === 'rating_difference') {
				text += 'The average AV Club review score across all episodes, subtracted by the average IMDB community ' +
					'score across all episodes.';
			}
			else {
    			text += 'The average AV Club review score across all episodes. Each letter grade was assigned a numerical' +
					' value so that they were evenly distributed across a 100 point scale (A+/A = 100, A- = 91... D = 9, F = 0)' +
					' and these scores were then averaged across all reviews for the series to come up with a final average review score.';
			}

			text += '</span></div>';

    		return text;
    	})
		.offset([-55, 5]);

    vis.g.call(vis.weightedBiasTip);
    vis.yAxisLabel = vis.g.append("text")
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
        .text("Avg. AV Club Score");


    vis.tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([0, 8])
        .html(function(d) {
            var text = "<span style='color:white'><strong>Show</strong>: " + d.show_name + "</span></br>";

            if (showBarVar === 'rating_difference') {
                text += "<span style='color:white'><strong>Net Score</strong>: " + d3.format('+.1f')(d[showBarVar]) + "</span></br>";
            }
            else {
            	text += "<span style='color:white'><strong>Avg. Episode Rating</strong>: " + d3.format('.1f')(d[showBarVar]) + "</span></br>";
			}
            // text += "<span style='color:white'><strong>Avg. IMDB Score</strong>: " + d3.format('.1f')(d.average_imdb_score) + "/100</span></br></br>";
            // text += "<span style='color:white'><strong>Net Score</strong>: " + d3.format('+.1f')(d.average_av_score - d.average_imdb_score) + "</span></br>";

            return text;
    });

    vis.g.append('circle').attr('id', 'tipfollowscursor');
    vis.g.call(vis.tip);

	vis.wrangleData();
};

ShowBarChart.prototype.wrangleData = function() {
	const vis = this;

	vis.chartData = genreShowData.sort(function(a,b) {
        return b[showBarVar] - a[showBarVar];
    });

	if (typeof domainIndices !== "undefined") {
		vis.chartData = vis.chartData.slice(domainIndices[0], domainIndices[1]);
	}

	vis.updateVis();
}

ShowBarChart.prototype.updateVis = function() {
	const vis = this;

	vis.x.domain(vis.chartData.map(function(d) { return d.show_name }));

	if (showBarVar === 'average_av_rating') {
		// axis and scale stuff
		vis.yAxisCall
			.tickFormat(d3.format("d"))
			.tickValues([100, 90, 80, 70, 60, 50, 40, 30, 20, 0]);

		vis.xAxis
			.transition()
			.duration(800)
			.attr("transform", "translate(0," + vis.height + ")");

		vis.y = d3.scalePow()
   			.domain([0, 100])
   			.range([vis.height, 0])
			.exponent(2);

		vis.colorScale
			.domain([100, 80, 50]);

		vis.yAxisLabel
			.text("Avg. AV Club Score");
	}
	else {
		vis.yAxisCall
			.tickFormat(function(d) {
				if (d > 0) {
					return d3.format("+")(d);
				}
				else {
					return d;
				}
    		})
			.tickValues([30, 20, 10, 5, 0, -5, -10, -20, -30]);


		vis.xAxis
			.transition()
			.duration(800)
			.attr("transform", "translate(0," + vis.height/2 + ")");

		vis.y = d3.scalePow()
   			.domain([-30, 30])
			.range([vis.height, 0])
			.exponent(0.5);

		vis.colorScale
			.domain([15, 0, -15]);

		vis.yAxisLabel
			.text("Net Rating");
	}


	vis.showRects = vis.g.selectAll("rect")
		.data(vis.chartData, function(d) {
			return d.show_name;
		});

	vis.showRects
		.exit()
		.remove();

	vis.showRects
		.enter()
		.append("rect")
			.attr("class", "content-bar")
			.attr("height", 0)
			.attr("y", vis.y(0))
			.attr("opacity", 0.7)
			.on("mouseover", function(d) {
				vis.tip.show(d);
			})
            .on("mouseout", function() {
            	vis.tip.hide();
            })
			.attr("x", function(d) {
					return vis.x(d.show_name);
				})
			.attr("width", vis.x.bandwidth())
		.merge(vis.showRects)
			.transition()
				.duration(800)
				.attr("height", function(d) {
					if (showBarVar === 'average_av_rating') {
						return vis.height - vis.y(d[showBarVar]);
					}
					else {
						return Math.abs(vis.height / 2 - vis.y(d[showBarVar]));
					}
				})
				.attr("y", function(d) {
					return vis.y(Math.max(0, d[showBarVar]));
				})
				.attr("fill", function(d) {
					return vis.colorScale(d[showBarVar]);
				})
				.attr("x", function(d) {
					return vis.x(d.show_name);
				})
				.attr("width", vis.x.bandwidth());

    // Overlay Bars
    vis.overlayBars = vis.g.selectAll("rect.overlay")
		.data(vis.chartData, function(d) {
			return d.show_name;
		});

    vis.overlayBars.exit().remove();

    vis.overlayBars
		.enter()
		.append("rect")
			.attr("class", "overlay")
		.merge(vis.overlayBars)
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
                    .attr('cy', d3.event.offsetY - 62)
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
                    .attr('cy', d3.event.offsetY - 62)
                    .attr("r", 0)
                    .node();
        		vis.tip.show(d, target);
            })
			.on("click", function(d) {
				$("#show-select").val(d.show_name);
				document.querySelector("#show-select").fstdropdown.rebind();
				updateShow();

				$("input[name=section-select]:radio")[1].click();
			});

	vis.yAxisCall
		.scale(vis.y);

	// vis.yAxis
	// 	.call(vis.yAxisCall);
	vis.svg.select(".y-axis")
		.style("font-size", "10px")
		.transition()
		.duration(800)
		.call(vis.yAxisCall);

	d3.select(".tick")
		.style("font-size", "10px");

	vis.xAxisCall
		.scale(vis.x)
		.tickValues([]);

	vis.xAxis
		.call(vis.xAxisCall);

};