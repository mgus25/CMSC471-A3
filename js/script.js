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

        // populate vis 

    })
    .catch(error => console.error('Error loading data:', error));
}
    

window.addEventListener('load', init);