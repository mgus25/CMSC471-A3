let filteredData = [];

const whMargin = { top: 60, right: 20, bottom: 20, left: 20 };
const whWidth = 1100 - whMargin.left - whMargin.right;
const whHeight = 800 - whMargin.top - whMargin.bottom;

let whSvg;
let currentFocus;

// filter data by disposition and year
function filterDataByDisposition(data, yearFilter = null) {
  return data.filter((d) => {
    if (yearFilter !== null && d.year_received !== yearFilter) return false;

    if (
      d.board_disposition &&
      d.board_disposition.startsWith("Substantiated")
    ) {
      d.original_disposition = d.board_disposition;
      d.board_disposition = "Substantiated";
      return true;
    }
    return (
      d.board_disposition === "Exonerated" ||
      d.board_disposition === "Unsubstantiated"
    );
  });
}

function initWhiteHat() {
  if (!allData || allData.length === 0) {
    setTimeout(initWhiteHat, 100);
    return;
  }

  filteredData = filterDataByDisposition(allData);

  console.log("filtered data:", filteredData.length, "complaints");

  addYearFilter(filteredData);
  updateSummaryStats(filteredData);
  initResetButton();

  const hierarchyData = transformDataForHierarchy(filteredData);
  createCirclePacking(hierarchyData);
}

// make a node
function createNode(name, children = []) {
  return { name, children };
}

// add complaints to a node
function addComplaintNodes(parentNode, complaints) {
  complaints.forEach((complaint) => {
    parentNode.children.push({
      name: `Complaint ${complaint.complaint_id}`,
      value: 1,
      originalData: complaint,
    });
  });
  return parentNode.children.length > 0;
}

function transformDataForHierarchy(data) {
  const nested = createNode("complaints");

  const dispositionGroups = d3.group(data, (d) => d.board_disposition);

  for (const [disposition, dispositionComplaints] of dispositionGroups) {
    const dispositionNode = createNode(disposition);
    const fadoGroups = d3.group(dispositionComplaints, (d) => d.fado_type);

    for (const [fadoType, fadoComplaints] of fadoGroups) {
      if (!fadoType) continue;

      const fadoNode = createNode(fadoType);
      const precinctGroups = d3.group(fadoComplaints, (d) => d.precinct);

      for (const [precinct, precinctComplaints] of precinctGroups) {
        const allegationGroups = d3.group(
          precinctComplaints,
          (d) => d.allegation || "Unspecified Allegation"
        );

        if (precinct === 0) {
          for (const [allegation, allegationComplaints] of allegationGroups) {
            const allegationNode = createNode(allegation);

            if (addComplaintNodes(allegationNode, allegationComplaints)) {
              fadoNode.children.push(allegationNode);
            }
          }
        } else {
          const precinctNode = createNode(`Pct. ${precinct}`);

          for (const [allegation, allegationComplaints] of allegationGroups) {
            const allegationNode = createNode(allegation);

            if (addComplaintNodes(allegationNode, allegationComplaints)) {
              precinctNode.children.push(allegationNode);
            }
          }

          if (precinctNode.children.length > 0) {
            fadoNode.children.push(precinctNode);
          }
        }
      }

      if (fadoNode.children.length > 0) {
        dispositionNode.children.push(fadoNode);
      }
    }

    if (dispositionNode.children.length > 0) {
      nested.children.push(dispositionNode);
    }
  }

  return nested;
}

function createCirclePacking(data) {
  d3.select("#vis-white-hat svg").remove();

  // color palette
  const colorScale = d3
    .scaleOrdinal()
    .domain(["Substantiated", "Exonerated", "Unsubstantiated"])
    .range(["#1f77b4", "#37ab27", "#7f7f7f"]);

  const root = d3
    .hierarchy(data)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  const packLayout = d3.pack().size([whWidth, whHeight]).padding(3);
  packLayout(root);

  currentFocus = root;

  whSvg = d3
    .select("#vis-white-hat")
    .append("svg")
    .attr("viewBox", `-${whWidth / 2} -${whHeight / 2} ${whWidth} ${whHeight}`)
    .attr("width", "100%")
    .attr("height", whHeight + whMargin.top + whMargin.bottom)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("cursor", "pointer")
    .attr(
      "aria-label",
      "circle packing visualization of nypd civilian complaints"
    );

  const g = whSvg.append("g");

  const titleContainer = whSvg
    .append("g")
    .attr("class", "title-container")
    .attr("transform", `translate(-${whWidth / 2}, -${whHeight / 2})`);

  titleContainer
    .append("text")
    .attr("x", whWidth / 2)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .style("font-family", "Arial, sans-serif")
    .text("The Shape of Civilian Complaints Against the NYPD");

  titleContainer
    .append("text")
    .attr("x", whWidth / 2)
    .attr("y", 75)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-family", "Arial, sans-serif")
    .text(
      "A visual breakdown of complaints filed by New Yorkers — by outcome and alleged misconduct type"
    );

  // back button
  const backButton = whSvg
    .append("g")
    .attr("class", "back-button")
    .attr("transform", `translate(-${whWidth / 2 - 40}, -${whHeight / 2 - 40})`)
    .style("cursor", "pointer")
    .style("display", "none")
    .style("opacity", 0.8)
    .on("click", (event) => {
      event.stopPropagation();
      if (focus !== root && focus.parent) {
        zoom(event, focus.parent);
      }
    });

  backButton
    .append("circle")
    .attr("r", 20)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#666")
    .attr("stroke-width", 1.5);

  backButton
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.45em")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("↩");

  // tooltip setup
  let tooltipDiv;
  const existingTooltip = d3.select("body").select(".tooltip");
  if (existingTooltip.empty()) {
    tooltipDiv = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "3px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("z-index", "1000");
  } else {
    tooltipDiv = existingTooltip;
  }

  // create nodes
  const node = g
    .append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
    .attr("fill", (d) => {
      if (d.depth === 1) {
        return colorScale(d.data.name);
      } else if (d.depth === 2) {
        const parentColor = d3.rgb(colorScale(d.parent.data.name));
        return d3.rgb(parentColor).brighter(0.3);
      } else if (d.depth === 3) {
        const grandparentColor = d3.rgb(colorScale(d.parent.parent.data.name));
        return d3.rgb(grandparentColor).brighter(0.6);
      } else if (d.depth === 4) {
        const greatGrandparentColor = d3.rgb(
          colorScale(d.parent.parent.parent.data.name)
        );
        return d3.rgb(greatGrandparentColor).brighter(0.8);
      } else if (d.depth === 5) {
        const greatGreatGrandparentColor = d3.rgb(
          colorScale(d.parent.parent.parent.parent.data.name)
        );
        return d3.rgb(greatGreatGrandparentColor).brighter(1.0);
      }
      return "white";
    })
    .attr("pointer-events", (d) =>
      d.depth <= 4 ? "all" : !d.children ? "none" : "all"
    )
    .attr("stroke", (d) => {
      if (d.depth === 0) return "none";
      if (d.depth === 1) return "#666";
      return "#bbb";
    })
    .attr("stroke-width", 1)
    .style("display", (d) => (d.depth >= 5 ? "none" : null))
    .on("mouseover", function (event, d) {
      event.stopPropagation();
      d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);

      let tooltipContent = "";
      if (d.depth === 1) {
        tooltipContent = `<strong>${d.data.name}</strong><br>${
          d.descendants().filter((node) => node.children === undefined).length
        } complaints`;
      } else if (d.depth === 2) {
        tooltipContent = `<strong>${d.data.name}</strong><br>${
          d.parent.data.name
        } outcome<br>${
          d.descendants().filter((node) => node.children === undefined).length
        } complaints`;
      } else if (d.depth === 3) {
        tooltipContent = `<strong>${d.data.name}</strong><br>${
          d.parent.data.name
        } - ${d.parent.parent.data.name}<br>${
          d.descendants().filter((node) => node.children === undefined).length
        } complaints`;
      } else if (d.depth === 4) {
        tooltipContent = `<strong>Allegation: ${d.data.name}</strong><br>${
          d.parent.data.name
        } - ${d.parent.parent.data.name}<br>${
          d.parent.parent.parent.data.name
        } outcome<br>${
          d.descendants().filter((node) => node.children === undefined).length
        } complaints`;
      } else if (d.depth >= 5 || (d.depth === 4 && !d.children)) {
        const complaint = d.data.originalData;
        tooltipContent = `<strong>Complaint #${
          complaint.complaint_id
        }</strong><br>
          Type: ${complaint.fado_type}<br>
          Specific Allegation: ${
            complaint.allegation || "Unspecified Allegation"
          }<br>
          Outcome: ${
            complaint.original_disposition || complaint.board_disposition
          }<br>
          Year: ${complaint.year_received}<br>
          Precinct: ${
            complaint.precinct > 0 ? complaint.precinct : "Not specified"
          }<br>
          Complainant: ${complaint.complainant_gender || "?"} ${
          complaint.complainant_ethnicity || "?"
        }<br>
          Officer: ${complaint.mos_gender || "?"} ${
          complaint.mos_ethnicity || "?"
        }`;
      }

      const tooltipWidth = 300;
      let leftPos = event.pageX + 10;
      if (leftPos + tooltipWidth > window.innerWidth) {
        leftPos = event.pageX - tooltipWidth - 10;
      }

      tooltipDiv
        .html(tooltipContent)
        .style("left", leftPos + "px")
        .style("top", event.pageY - 28 + "px")
        .transition()
        .duration(200)
        .style("opacity", 0.95);
    })
    .on("mouseout", function (event) {
      event.stopPropagation();
      d3.select(this)
        .attr("stroke", (d) => (d.depth === 1 ? "#666" : "#bbb"))
        .attr("stroke-width", 1);
      tooltipDiv.transition().duration(500).style("opacity", 0);
    })
    .on("click", (event, d) => {
      if (d.children) {
        currentFocus = d;
        focus !== d && (zoom(event, d), event.stopPropagation());
      }
    });

  // add text labels
  const label = g
    .append("g")
    .style("font", "10px Arial, sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
    .style("fill-opacity", (d) => (d.parent === root ? 1 : 0))
    .style("display", (d) => (d.parent === root ? "inline" : "none"))
    .attr("class", "circle-label")
    .style("font-size", (d) => {
      if (d.depth === 1) return "14px";
      if (d.depth === 2) return "11px";
      if (d.depth === 3) return "9px";
      return "8px";
    })
    .style("font-weight", (d) => (d.depth === 1 ? "bold" : "normal"))
    .style("fill", (d) => {
      if (d.depth === 1) {
        return "white";
      } else {
        return "#333";
      }
    })
    .style("paint-order", "stroke")
    .style("stroke", (d) => (d.depth === 1 ? "rgba(0,0,0,0.3)" : "none"))
    .style("stroke-width", "1px")
    .text((d) => {
      if (d.depth === 1) return d.data.name;
      if (d.depth === 2) {
        if (d.data.name === "Abuse of Authority") return "Abuse of Authority";
        if (d.data.name === "Offensive Language") return "Off. Language";
        if (d.data.name === "Discourtesy") return "Discourtesy";
        return d.data.name;
      }
      if (d.depth === 3 && d.data.name.startsWith("Pct.")) {
        return d.data.name;
      }
      if (d.depth === 4) {
        const name = d.data.name;
        if (name.length > 25) {
          return name.substring(0, 22) + "...";
        }
        return name;
      }
      return "";
    });

  tooltipDiv.style("font-family", "Arial, sans-serif");

  // setup zoom
  whSvg.on("click", (event) => zoom(event, root));
  let focus = root;
  let view;
  zoomTo([root.x, root.y, root.r * 2]);

  function zoomTo(v) {
    const k = Math.min(whWidth, whHeight) / v[2];
    view = v;

    node
      .attr(
        "transform",
        (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
      )
      .attr("r", (d) => Math.max(0.5, d.r * k));

    node.style("display", (d) =>
      d.depth >= 5 && focus.depth < 4 ? "none" : null
    );

    node.attr("pointer-events", (d) =>
      d.depth <= 4 || focus.depth >= 4 ? "all" : "none"
    );

    label.attr(
      "transform",
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
    );

    // show title only at the root level
    titleContainer.style("opacity", focus === root ? 1 : 0);
    titleContainer.style("display", focus === root ? "inline" : "none");

    d3.select(".back-button").style(
      "display",
      focus !== root ? "inline" : "none"
    );
  }

  function zoom(event, d) {
    focus = d;

    const updateLabels = (isRoot) => {
      const parent = isRoot ? root : focus;
      label
        .style("fill-opacity", (d) => (d.parent === parent ? 1 : 0))
        .style("display", (d) => (d.parent === parent ? "inline" : "none"));
    };

    updateLabels(d === root);

    const duration = event.altKey ? 7500 : 750;
    const startTime = Date.now();
    const interpolator = d3.interpolateZoom(view, [
      focus.x,
      focus.y,
      focus.r * 2,
    ]);

    const animateZoom = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      zoomTo(interpolator(easedT));

      if (t < 1) {
        requestAnimationFrame(animateZoom);
      } else {
        updateLabels(d === root);
      }
    };

    requestAnimationFrame(animateZoom);
  }
}

function addYearFilter(data) {
  const years = [...new Set(data.map((d) => d.year_received))]
    .filter((year) => year > 0)
    .sort();

  const filterContainer = d3
    .select("#year-filter")
    .append("div")
    .attr("class", "year-filter-container");

  filterContainer.append("label").text("Filter by Year: ");

  const yearSelect = filterContainer
    .append("select")
    .attr("id", "year-select")
    .on("change", function () {
      const selectedYear = +this.value;

      filteredData = filterDataByDisposition(
        allData,
        selectedYear === 0 ? null : selectedYear
      );

      const hierarchyData = transformDataForHierarchy(filteredData);
      createCirclePacking(hierarchyData);
      updateSummaryStats(filteredData);
    });

  yearSelect.append("option").attr("value", 0).text("All Years");
  years.forEach((year) => {
    yearSelect.append("option").attr("value", year).text(year);
  });
}

function updateSummaryStats(data) {
  const total = data.length;

  const dispositionCounts = {
    Substantiated: 0,
    Exonerated: 0,
    Unsubstantiated: 0,
  };

  data.forEach((d) => {
    if (d.board_disposition === "Substantiated")
      dispositionCounts.Substantiated++;
    else if (d.board_disposition === "Exonerated")
      dispositionCounts.Exonerated++;
    else if (d.board_disposition === "Unsubstantiated")
      dispositionCounts.Unsubstantiated++;
  });

  const substantiatedPercent = Math.round(
    (dispositionCounts.Substantiated / total) * 100
  );
  const exoneratedPercent = Math.round(
    (dispositionCounts.Exonerated / total) * 100
  );
  const unsubstantiatedPercent = Math.round(
    (dispositionCounts.Unsubstantiated / total) * 100
  );

  d3.select("#total-complaints").text(total.toLocaleString());
  d3.select("#substantiated-percent").text(`${substantiatedPercent}%`);
  d3.select("#exonerated-percent").text(`${exoneratedPercent}%`);
  d3.select("#unsubstantiated-percent").text(`${unsubstantiatedPercent}%`);
}

function initResetButton() {
  d3.select("#reset-view").on("click", () => {
    if (currentFocus) {
      const svgElement = document.querySelector("#vis-white-hat svg");
      if (svgElement) {
        const event = new Event("click");
        svgElement.dispatchEvent(event);
      }
    }
  });
}

// init on page load
window.addEventListener("load", initWhiteHat);
