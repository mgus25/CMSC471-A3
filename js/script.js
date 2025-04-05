let allData = []

const bhMargin = { top: 80, right: 60, bottom: 60, left: 100 };
const bhWidth = 800 - bhMargin.left - bhMargin.right;
const bhHeight = 600 - bhMargin.top - bhMargin.bottom;

const svg = d3.select('#vis-black-hat')
    .append('svg')
    .attr('width', bhWidth + bhMargin.left + bhMargin.right)
    .attr('height', bhHeight + bhMargin.top + bhMargin.bottom)
    .append('g')
    .attr('transform', `translate(${bhMargin.left},${bhMargin.top})`);

function init() {
    d3.csv("./data/allegations.csv", d => ({
        // load everything for now, remove unused later 
        unique_mos_id: +d.unique_mos_id,
        first_name: d.first_name,
        last_name: d.last_name,
        command_now: d.command_now,
        shield_no: +d.shield_no,
        complaint_id: +d.complaint_id,
        month_received: +d.month_received,
        year_received: +d.year_received,
        month_closed: +d.month_closed,
        year_closed: +d.year_closed,
        command_at_incident: d.command_at_incident,
        rank_abbrev_incident: d.rank_abbrev_incident,
        rank_abbrev_now: d.rank_abbrev_now,
        rank_now: d.rank_now,
        rank_incident: d.rank_incident,
        mos_ethnicity: d.mos_ethnicity,
        mos_gender: d.mos_gender,
        mos_age_incident: +d.mos_age_incident,
        complainant_ethnicity: d.complainant_ethnicity,
        complainant_gender: d.complainant_gender,
        complainant_age_incident: +d.complainant_age_incident,
        fado_type: d.fado_type,
        allegation: d.allegation,
        precinct: +d.precinct,
        contact_reason: d.contact_reason,
        outcome_description: d.outcome_description,
        board_disposition: d.board_disposition
    }))
    .then(data => {
        allData = data;
        console.log("Data loaded:", allData);

        drawVis()

    })
    .catch(error => console.error('Error loading data:', error));
}

function drawVis() {
    const xScale = d3.scaleBand()
        .range([0, bhWidth])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .range([bhHeight, 0]);
    
    svg.append("g")
       .attr("class", "x axis")
       .attr("transform", `translate(0, ${bhHeight})`);
    svg.append("g")
       .attr("class", "y axis");
    svg.append("text")
       .attr("class", "title")
       .attr("x", bhWidth / 2)
       .attr("y", -bhMargin.top / 2)
       .attr("text-anchor", "middle")
       .style("font-size", "16px");
    
    function updateVis(groupByFn, titleText) {
        const groupedData = d3.rollup(
            allData,
            v => v.length,
            groupByFn
        );
      
        const dataArray = Array.from(groupedData, ([category, count]) => ({ category, count }));
        xScale.domain(dataArray.map(d => d.category));
        yScale.domain([d3.max(dataArray, d => d.count)+2000, 0]);
        
        svg.select(".x.axis")
            .transition().duration(500)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");
        svg.select(".y.axis")
            .transition().duration(500)
            .call(d3.axisLeft(yScale));
        svg.select(".title").text(titleText);
        
        const bars = svg.selectAll("rect.bar")
            .data(dataArray, d => d.category);

        const minCount = d3.min(dataArray, d => d.count);
        const maxCount = d3.max(dataArray, d => d.count);
            
        bars.exit()
            .transition().duration(500)
            .attr("y", yScale(0))
            .attr("height", 0)
            .remove();
            
        bars.transition().duration(500)
            .attr("x", d => xScale(d.category))
            .attr("y", d => yScale(d.count))
            .attr("width", xScale.bandwidth())
            .attr("height", d => bhHeight - yScale(d.count))
            .attr("fill", d => {
                if (d.count === minCount) {
                    return "red";  
                } else if (d.count === maxCount) {
                    return "green";   
                } else {
                    return "lightgrey";  
                }
            });
            
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.category))
            .attr("y", yScale(0))
            .attr("width", xScale.bandwidth())
            .attr("height", 0)
            .attr("fill", d => {
                if (d.count === minCount) {
                    return "red";  
                } else if (d.count === maxCount) {
                    return "green";  
                } else {
                    return "lightgrey";  
                }
            })
            .transition().duration(500)
            .attr("y", d => yScale(d.count))
            .attr("height", d => bhHeight - yScale(d.count));
    }
    
    updateVis(d => d.mos_ethnicity, "Number of Complaints by Officer Race");
    
    d3.select("#btn-race").on("click", function() {
         updateVis(d => d.mos_ethnicity, "Number of Complaints by Officer Race");
    });
    
    d3.select("#btn-gender").on("click", function() {
         updateVis(d => d.mos_gender, "Number of Complaints by Officer Gender");
    });
}

window.addEventListener('load', init);