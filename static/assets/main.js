var map;
var layerControl;
var heat;
var self_drawn;
var L;
var locs;
var stats;
var chi_vals;
var center = [40.705275, -74.012500];
var currentCSV;
var currentTopic;
var currentMode;
var hexLayer;
var currentRadiusMode;
var breakMode; //["equal_breaks", "quantile", "jenks_natural_breaks"];
var allBreakpointsJson
var CSV;
var overture_places_categories_embeddings;
var currentQueryEmbedding = []

var queryEmbedding;
var minScore = 0;
var minScoreQuantity = 1;

let previousResults;

// colorbrewer2 palettes, blues and greens, single hue 
// https://colorbrewer2.org/#type=sequential&scheme=Blues&n=7 | https://colorbrewer2.org/#type=sequential&scheme=Greens&n=7

const colorbrewerBlues = ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594']
const colorbrewerGreens = ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32']
const colorbrewerRedsWhiteGreens = ['#de2d26', '#fc9272', '#fee0d2', '#ffffff', '#e5f5e0', '#a1d99b', '#31a354']
const colorbrewerRedTransparentGreens = ['#fcae91', '#ffffff00', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32']//,'#edf8e9','#bae4b3','#74c476','#31a354','#006d2c']
const colorbrewerRedTransparentBlues = ['#fcae91', '#ffffff00', '#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c']
const colorbrewerRedsTransparentBlues = ['#de2d26', '#fc9272', '#fee0d2', '#ffffff00', '#deebf7', '#9ecae1', '#3182bd']

const osmUrl = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png';
const osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const osm = L.tileLayer(osmUrl, {    //maxZoom: 18,
    attribution: osmAttrib});


$(document).ready(function () {
    function calculateCosineSimilarity(queryEmbedding, embedding) {
        let dotProduct = 0;
        let queryMagnitude = 0;
        let embeddingMagnitude = 0;
        let queryEmbeddingLength = queryEmbedding.length
        for (let i = 0; i < queryEmbeddingLength; i++) {
            dotProduct += queryEmbedding[i] * embedding[i];
            queryMagnitude += queryEmbedding[i] ** 2;
            embeddingMagnitude += embedding[i] ** 2;
        }
        return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(embeddingMagnitude));
    }

    //let filename = "data/" + document.getElementById("dataFile").value;
    let mean_location_variant = false;

    function initialize_map(focus_coordinates = center, zoom_level = 16) {
        // initialize the map on the "map" div with a given center and zoom
        map = L.map('map', {
            fullscreenControl: true,
        }).setView([40.709033667219515,	-74.01152518721403], zoom_level);
        

        //let map = L.map('map').setView([-16.489689, -68.119293], 12);

        // Add to map
        osm.addTo(map);

        // track the previous results so we can remove them when adding new results
        previousResults = L.layerGroup().addTo(map);

        // Create different theme layers for Protomaps New York
        var protomaps_ny_light = protomapsL.leafletLayer({
            url: './static/protomaps/new_york.pmtiles',
            theme: 'light'
        });

        var protomaps_ny_dark = protomapsL.leafletLayer({
            url: './static/protomaps/new_york.pmtiles',
            theme: 'dark'
        });

        var protomaps_ny_white = protomapsL.leafletLayer({
            url: './static/protomaps/new_york.pmtiles',
            theme: 'white'
        });

        var protomaps_ny_black = protomapsL.leafletLayer({
            url: './static/protomaps/new_york.pmtiles',
            theme: 'black'
        });

        var protomaps_ny_grayscale = protomapsL.leafletLayer({
            url: './static/protomaps/new_york.pmtiles',
            theme: 'grayscale'
        });

        // Create different theme layers for Protomaps Milan
        var protomaps_milan_light = protomapsL.leafletLayer({
            url: './static/protomaps/milan.pmtiles',
            theme: 'light'
        });

        var protomaps_milan_dark = protomapsL.leafletLayer({
            url: './static/protomaps/milan.pmtiles',
            theme: 'dark'
        });

        var protomaps_milan_white = protomapsL.leafletLayer({
            url: './static/protomaps/milan.pmtiles',
            theme: 'white'
        });

        var protomaps_milan_black = protomapsL.leafletLayer({
            url: './static/protomaps/milan.pmtiles',
            theme: 'black'
        });

        var protomaps_milan_grayscale = protomapsL.leafletLayer({
            url: './static/protomaps/milan.pmtiles',
            theme: 'grayscale'
        });

        // Layer control for switching between base layers
        layerControl = L.control.layers({
            "OpenStreetMap": osm, // Add OSM as a base layer option
            //"Basemap Gray": bm_web_gry,
            //"Basemap Color": bm_web_col,
            "Protomaps NY Light": protomaps_ny_light,
            "Protomaps NY Dark": protomaps_ny_dark,
            "Protomaps NY White": protomaps_ny_white,
            "Protomaps NY Black": protomaps_ny_black,
            "Protomaps NY Grayscale": protomaps_ny_grayscale,
            "Protomaps Milan Light": protomaps_milan_light,
            "Protomaps Milan Dark": protomaps_milan_dark,
            "Protomaps Milan White": protomaps_milan_white,
            "Protomaps Milan Black": protomaps_milan_black,
            "Protomaps Milan Grayscale": protomaps_milan_grayscale
        }).addTo(map);

        L.control.scale().addTo(map);
        //L.Control.geocoder().addTo(map);
        //L.control.polylineMeasure().addTo(map);
        //L.control.bigImage().addTo(map);
        $('.leaflet-pm-icon-marker').parent().hide();
        $('.leaflet-pm-icon-circle-marker').parent().hide();
        $('.leaflet-pm-icon-polyline').parent().hide();
    }

    window.remove_layer = function (layr) {
        map.removeLayer(layr);
        layerControl.removeLayer(layr)
    }

    window.add_layer = function (layr, layr_name) {
        map.addLayer(layr);
        layerControl.addOverlay(layr, layr_name);
    }

    initialize_map();

    window.remove_all_hex_layer = function () {
        map.eachLayer(function (layer) {
            if (("duration" in layer.options)) {
                map.removeLayer(layer);
                layerControl.removeLayer(layer);
            }
        });
    }




    /////////////////////////////////////////////////
    // For the example, we fix a visible Rect in the middle of the map
    function getBoundForRect() {
        const bounds = map.getBounds();

        const width = map.distance(bounds.getNorthWest(), bounds.getNorthEast());
        const height = map.distance(bounds.getNorthWest(), bounds.getSouthWest());
        return map.getCenter().toBounds(Math.min(width, height) * 1); // only download 90% width and height to emphasize that not everything is loaded. 
    }

    // convert the rect into the format flatgeobuf expects
    function fgBoundingBox() {
        const bounds = getBoundForRect();
        return {
            minX: bounds.getWest(),
            maxX: bounds.getEast(),
            minY: bounds.getSouth(),
            maxY: bounds.getNorth(),
        };
    }

    // Get the full extent of the map as a bounding box
    function getFullExtentBoundingBox() {
        const bounds = map.getBounds();

        // Convert the bounds to the format flatgeobuf expects
        return {
            minX: bounds.getWest(),
            maxX: bounds.getEast(),
            minY: bounds.getSouth(),
            maxY: bounds.getNorth(),
        };
    }


    async function updateResults() {
        $("#spinner").attr('hidden', false);
        console.log("Data loading...");
        // remove the old results
        previousResults.remove();
        const nextResults = L.layerGroup().addTo(map);
        previousResults = nextResults;

        // Use flatgeobuf JavaScript API to iterate features as geojson
        // Because we specify a bounding box, flatgeobuf will only fetch the relevant subset of data,
        // rather than the entire file.
        const iter = flatgeobuf.deserialize(
            "https://huggingface.co/datasets/do-me/overture-places/resolve/main/overture_places_categories.fgb",
            //'data/overture_places_categories.fgb',
             getFullExtentBoundingBox()); // places_categories_embs
        const all_features = [];

        const add_pins = false;
        for await (const feature of iter) {
            // Leaflet styling
            const properties = feature.properties;

             // Extract latitude and longitude from the geometry object
            const geometry = feature.geometry;
            if (geometry.type === 'Point' && geometry.coordinates.length === 2) {
                properties.lat = geometry.coordinates[1];
                properties.lon = geometry.coordinates[0];
            }

            all_features.push(properties);
        }

        $("#spinner").attr('hidden', '');
        currentCSV = all_features;
        console.log("Data loaded:");
        console.log(all_features);

    }
    // if the user is panning around alot, only update once per second max
    updateResults = _.throttle(updateResults, 300);

    // show results based on the initial map
    // updateResults();
    // ...and update the results whenever the map moves
    map.on("moveend", function (s) {
        //rectangle.setBounds(getBoundForRect());
        console.log("moved")
        //updateResults();
    });

    const search = new GeoSearch.GeoSearchControl({
        provider: new GeoSearch.OpenStreetMapProvider(),
        style: 'bar'
      });
      
    map.addControl(search);
    // Select the button element by its class name and remove it
    document.querySelector('.leaflet-control-geosearch .reset').remove();


    ////////////////////////////////////////////////

    function create_embedding_score_hexlayer(colorScaleExtentLower, colorScaleExtentUpper) {

        remove_all_hex_layer()

        var options = {
            //radius : 12,
            opacity: 0.75,
            duration: 200,
            colorScaleExtent: [0.5, 1]
            //colorScaleExtent: [ 0,6 ]
        };

        hexLayer = L.hexbinLayer(options).addTo(map)
        //hexLayer.colorScale().range(['white', 'blue']);

        hexLayer
            .lat(function (d) { return d["lat"]; })
            .lng(function (d) { return d["lon"]; }).hoverHandler(L.HexbinHoverHandler.compound({
                handlers: [
                    L.HexbinHoverHandler.resizeFill(),
                    L.HexbinHoverHandler.tooltip({ tooltipContent: tooltip_function })
                ]
            }
            ));

        hexLayer.dispatch()
            .on('click', function (d, i) {
                //console.log({ type: 'click', event: d, index: i, context: this });
                hexagon_click(d);
            });

        updateRadius()

        updateColorValueFunction()

        //hexLayer.radiusValue(function(d) {
        //    var posts_match = d.reduce(function (acc, obj) { return acc + obj["o"]["posts_sum"]; }, 0);
        //    return posts_match;
        //   });

        //updateColorValueFunction();
        //updateRadius();
        add_layer(hexLayer, "Hexbins");

        ////#################################################################################################################
        hexLayer.colorScaleExtent([colorScaleExtentLower, colorScaleExtentUpper])

        // set scale extent

        colorScaleExtentLower = colorScaleExtentLower.toFixed(3);
        colorScaleExtentUpper = colorScaleExtentUpper.toFixed(3);

        // min 
        $("#minScale").val(colorScaleExtentLower);
        $("#minScaleRange").val(colorScaleExtentLower);

        //max 
        $("#maxScale").val(colorScaleExtentUpper);
        $("#maxScaleRange").val(colorScaleExtentUpper);

        hexLayer.data(currentCSV);


    }

    function calculateMeanEmbedding(categoriesStr, overturePlacesCategoriesEmbeddings) {
        // Step 1: Parse the comma-separated string into an array of categories
        const categories = categoriesStr.split(',').map(category => category.trim());
    
        // Step 2: Initialize an array to accumulate the sum of embeddings
        let sumEmbedding = new Array(1024).fill(0); // Assuming each embedding is a 128-dimensional vector
    
        // Step 3: Iterate through each category and add its embedding to the accumulator
        categories.forEach(category => {
            if (overturePlacesCategoriesEmbeddings.hasOwnProperty(category)) {
                const embedding = overturePlacesCategoriesEmbeddings[category];
                sumEmbedding = sumEmbedding.map((val, index) => val + embedding[index]);
            }
        });
    
        // Step 4: Divide the accumulated embeddings by the number of categories to get the mean embedding
        if (categories.length > 0) {
            const meanEmbedding = sumEmbedding.map(val => val / categories.length);
            return meanEmbedding;
        } else {
            throw new Error('No valid categories found');
        }
    }

    async function computeQueryEmbedding() {
        console.log("Calculating query embedding...")
        let inputQuery = $("#queryText").val()
        // https://huggingface.co/intfloat/multilingual-e5-small#faq needs "query: " for better performance
        //queryEmbedding = await pipe("query: " + inputQuery, { pooling: 'cls', normalize: true });
        //console.log(queryEmbedding.tolist())
        const embeddings = await extractor([inputQuery], { pooling: 'cls', normalize: true });
        console.log(embeddings);


        queryEmbedding = embeddings.tolist()[0]//Array.from(queryEmbedding["data"]);

        currentQueryEmbedding = queryEmbedding;

        currentCSV = currentCSV.reduce((accumulator, currentValue) => {

            locationEmbedding = calculateMeanEmbedding(currentValue.categories_formatted, overture_places_categories_embeddings)
            currentValue.score = calculateCosineSimilarity(currentQueryEmbedding, locationEmbedding);
            accumulator.push(currentValue);
            return accumulator;
        }, []);

        // Find the maximum and median scores for reasonable initial color extent

        const maxScore = currentCSV.reduce((max, item) => Math.max(max, item.score), -Infinity);


        const scores = currentCSV.map(item => item.score).filter(score => score !== 0).sort((a, b) => a - b);

        let medianScore = scores.length % 2 === 0
            ? ((scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2)
            : scores[Math.floor(scores.length / 2)];

        // Normalize the scores (would be another option but lad to intransparency)
        // currentCSV.forEach(item => {item.score = (item.score - minScoreNonZero) / (maxScore - minScoreNonZero);});

        // add hexlayer here 
        create_embedding_score_hexlayer(medianScore, maxScore);
        console.log("Calculated query embedding")
    }

    async function updateColorValueFunction() {


        //var minScore = 0.4;
        //var minScoreQuantity = 5;

        hexLayer.colorValue((data) => {
            // Filter the data to get values above the threshold
            const aboveThreshold = data.filter(obj => obj["o"]["score"] >= minScore);
            //console.log(aboveThreshold)
            // If the count of values above the threshold is greater than or equal to minCount, return maxScore; else, return 0.
            //console.log(aboveThreshold)
            //console.log(aboveThreshold, aboveThreshold.length, aboveThreshold["o"]["count"], minScoreQuantity)

            // summed posts, if else needed for different mean_location posts sum as posts are aggregated before
            let aboveThresholdSumCounts = 0
            if (mean_location_variant) {
                aboveThresholdSumCounts = aboveThreshold.reduce((sum, obj) => sum + obj["o"]["count"], 0);
            }
            else {
                aboveThresholdSumCounts = aboveThreshold.length //reduce((sum, obj) => sum + obj["o"]["count"], 0);
            }

            //console.log(aboveThresholdSumCounts, minScoreQuantity)
            if (aboveThresholdSumCounts >= minScoreQuantity) {
                // bin score
                const scores = aboveThreshold.map(obj => obj["o"]["score"]);

                // these functions are somehow explainable and referenced in the paper
                const minScore = scores.reduce((min, score) => Math.min(min, score), Infinity);
                const maxScore = scores.reduce((max, score) => Math.max(max, score), -Infinity);
                
                const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

                // experimental, searching for "homogenous areas"
                // Range
                const rangeScore = Math.max(...scores) - Math.min(...scores);
                const madScore = scores.reduce((sum, score) => sum + Math.abs(score - meanScore), 0) / scores.length; // Mean Absolute Deviation (MAD)
                const varianceScore = scores.reduce((sum, score) => sum + (score - meanScore) ** 2, 0) / scores.length;// Standard Deviation
                const stdDevScore = Math.sqrt(varianceScore);
                const cvScore = (stdDevScore / meanScore)// Coefficient of Variation (CV)

                /* // these functions are included here just for experimenting, many might not even work or not make sense
                const sumScore = scores.reduce((sum, score) => sum + score, 0);        // Sum of scores
                const varianceScore = scores.reduce((sum, score) => sum + (score - meanScore) ** 2, 0) / scores.length;  // Variance
                const stdDevScore = Math.sqrt(varianceScore);                          // Standard deviation
                const rangeScore = maxScore - minScore;                                // Range
                const q1Score = scores[Math.floor(scores.length * 0.25)];              // First quartile (25th percentile)
                const q3Score = scores[Math.floor(scores.length * 0.75)];              // Third quartile (75th percentile)
                const iqrScore = q3Score - q1Score;                                    // Interquartile range (IQR)
                const coefVarScore = (stdDevScore / meanScore) * 100;                  // Coefficient of variation (CV)
                const skewnessScore = scores.reduce((sum, score) => sum + ((score - meanScore) ** 3), 0) / (scores.length * stdDevScore ** 3); // Skewness
                const kurtosisScore = scores.reduce((sum, score) => sum + ((score - meanScore) ** 4), 0) / (scores.length * stdDevScore ** 4) - 3;  // Kurtosis (excess)
                const harmonicMeanScore = scores.length / scores.reduce((sum, score) => sum + 1 / score, 0); // Harmonic mean
                const geometricMeanScore = Math.exp(scores.reduce((sum, score) => sum + Math.log(score), 0) / scores.length); // Geometric mean
                const madScore = scores.reduce((sum, score) => sum + Math.abs(score - meanScore), 0) / scores.length; // Mean absolute deviation (MAD)
                const giniCoefficient = scores.map(score => scores.map(y => Math.abs(score - y)).reduce((sum, val) => sum + val, 0)).reduce((sum, val) => sum + val, 0) / (2 * scores.length**2 * meanScore); // Gini coefficient
                const entropyScore = -scores.reduce((sum, score) => sum + (score / sumScore) * Math.log(score / sumScore), 0); // Shannon entropy
                const zScores = scores.map(score => (score - meanScore) / stdDevScore); // Z-scores for each data point
                const moment3Score = scores.reduce((sum, score) => sum + ((score - meanScore) ** 3), 0) / scores.length; // 3rd central moment (used for skewness)
                const moment4Score = scores.reduce((sum, score) => sum + ((score - meanScore) ** 4), 0) / scores.length; // 4th central moment (used for kurtosis)
                const meanSquaredError = scores.reduce((sum, score) => sum + (score - meanScore) ** 2, 0) / scores.length; // Mean squared error (MSE)
                const coefficientOfDispersion = iqrScore / meanScore; // Coefficient of dispersion
                const percentiles = [0.1, 0.9].map(p => scores[Math.floor(scores.length * p)]); // Percentiles, e.g., 10th and 90th
                const rangePercentile = percentiles[1] - percentiles[0]; // Range between two percentiles (like 10th - 90th percentile range)
                */
                // Get the selected value from the dropdown
                const selectedValue = document.getElementById("min_max_mean_median").value;

                // Return the respective score based on the selected value
                const log_vals = false;

                switch (selectedValue) {
                    case "min":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${minScore}`);
                        return minScore;
                    case "max":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${maxScore}`);
                        return maxScore;
                    case "mean":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${meanScore}`);
                        return meanScore;
                    case "median":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${medianScore}`);
                        return medianScore;
                    case "range":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${rangeScore}`);
                        return rangeScore;
                    case "mad":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${madScore}`);
                        return madScore;
                    case "variance":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${varianceScore}`);
                        return varianceScore;
                    case "stdDev":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${stdDevScore}`);
                        return stdDevScore;
                    case "cv":
                        if (log_vals) console.log(`Selected value: ${selectedValue}, Score: ${cvScore}`);
                        return cvScore;
                    default:
                        throw new Error(`Unknown selected value: ${selectedValue}`);
                }



            } else {
                return null; // 0 -> white, null -> transparent
            }
        });

        hexLayer.redraw()
    }

    function tooltip_function(d) {
        // bin stats

        const aboveThreshold = d.filter(obj => obj["o"]["score"] >= minScore);
        const scores = aboveThreshold.map(obj => obj["o"]["score"]);

        let aboveThresholdSumCounts = 0
        if (mean_location_variant) {
            aboveThresholdSumCounts = aboveThreshold.reduce((sum, obj) => sum + obj["o"]["count"], 0);
        }
        else {
            aboveThresholdSumCounts = aboveThreshold.length //reduce((sum, obj) => sum + obj["o"]["count"], 0);
        }


        let SumCounts = 0
        if (mean_location_variant) {
            SumCounts = d.reduce((sum, obj) => sum + obj["o"]["count"], 0);
        }
        else {
            SumCounts = d.length //reduce((sum, obj) => sum + obj["o"]["count"], 0);
        }

        const maxScore = aboveThreshold.reduce((max, obj) => Math.max(max, obj["o"]["score"]), 0);

        // String logic
        const uniqueSortedStrings = aboveThreshold.reduce((result, obj) => {
            // Concatenate each string value with a comma
            result += obj["o"]["categories_formatted"] + ',';
            return result;
        }, '')
            .split(',')
            .filter(Boolean)  // Remove any empty strings (in case of trailing commas)
            .reduce((set, value) => set.add(value), new Set()); // Create a Set for unique values

        // Convert Set to Array and sort alphabetically
        let sortedCategoryArray = [...uniqueSortedStrings].sort();

        const maxCategoriesToShow = 5;
        let truncatedCategories = sortedCategoryArray.slice(0, maxCategoriesToShow).join("<br>");

        // If more categories than maxCategoriesToShow, append "click to see all"
        if (sortedCategoryArray.length > maxCategoriesToShow) {
            truncatedCategories += "<br>...";
        }


        let truncatedScores = scores.map(score => parseFloat(score.toFixed(2))).slice(0, maxCategoriesToShow).join(", ")
        if (scores.length > maxCategoriesToShow) {
            truncatedScores += ", ...";
        }

        /////////////////////////////////////////////////////

        // plain html version
        var tooltip_text =
            `<table>
        <tr>
            <th colspan="2">Hexbin Info</th>
        </tr>
        <tr>
            <td>Places:</td>
            <td>${String(SumCounts)}</td>
        </tr>
        <tr>
            <td>Places Above Threshold:</td>
            <td>${String(aboveThresholdSumCounts)}</td>
        </tr>
        <tr>
            <td>Highest Score (Color):</td>
            <td>${maxScore.toFixed(2)}</td>
        </tr>
        <tr>
            <td>Categories:</td>
            <td>${truncatedCategories}</td>
        </tr>
        <tr>
            <td>Similarity Scores:</td>
            <td>${truncatedScores}</td>
        </tr>
        </table>
        `
        // simple version
        //var tooltip_text_plain =
        //    `Bin Statistics<br>
        //    Posts: ${String(SumCounts)}<br>
        //    Posts Above Threshold: ${String(aboveThresholdSumCounts)}<br>
        //    Highest Score (Color): ${String(maxScore.toFixed(2))}<br>`
        return tooltip_text
    }

    function hexagon_click(d) {
        var locations = d.reduce(function (acc, obj) {
            var locationId = obj["o"]["node.location_id"];
            if (locationId && locationId !== "" && locationId !== null) {
                acc.push(locationId);
            }
            return acc;
        }, []);

        locations = [...new Set(locations)];

        let locationsHTML = ""; // initialize result variable as empty string

        for (let i = 0; i < locations.length; i++) {
            const element = locations[i];

            // Generate URLs for both Facebook and Instagram
            const instagramHref = `https://www.instagram.com/explore/locations/${element}`;
            const facebookHref = `https://www.facebook.com/${element}`;

            // Create hyperlinks for Facebook and Instagram
            const instagramLink = `<a href="${instagramHref}" target="_blank">Instagram</a>`;
            const facebookLink = `<a href="${facebookHref}" target="_blank">Facebook</a>`;

            // Concatenate the location ID and links, and append to the result
            locationsHTML += `${element}: ${facebookLink} | ${instagramLink}<br>`;
        }

        $("#locations").html(locationsHTML);





        ////

        // string logic 
        const uniqueSortedStrings = d.reduce((result, obj) => {
            // Concatenate each string value with a comma
            result += obj["o"]["categories_formatted"] + ',';
            return result;
        }, '')
            // Remove the trailing comma, split the string by commas, create a Set, and convert it back to an array
            .split(',')
            .filter(Boolean)  // Remove any empty strings (in case of trailing commas)
            .reduce((set, value) => set.add(value), new Set()) // Create a Set for unique values
        // Convert Set to Array and sort alphabetically
        let sortedCategoryArray = [...uniqueSortedStrings].sort();
        $("#categories").html(sortedCategoryArray.join(", "))

    }

    function updateRadius() {

        if (currentRadiusMode == "postsMatchRadius") {
            hexLayer.radiusValue(function (d) {
                const aboveThreshold = d.filter(obj => obj["o"]["score"] >= minScore);

                let aboveThresholdSumCounts = 0
                if (mean_location_variant) {
                    aboveThresholdSumCounts = aboveThreshold.reduce((sum, obj) => sum + obj["o"]["count"], 0);
                }
                else {
                    aboveThresholdSumCounts = aboveThreshold.length;
                }
                return aboveThresholdSumCounts;
            });
        }

        else if (currentRadiusMode == "totalPosts") {
            hexLayer.radiusValue(function (d) {
                let SumCounts = 0
                if (mean_location_variant) {
                    SumCounts = d.reduce((sum, obj) => sum + obj["o"]["count"], 0);
                }
                else {
                    SumCounts = d.length;
                }
                return SumCounts;
            });
        }
        else {
            hexLayer.radiusValue(function (d) { return 12; }); // normal radius max value, all bins equal and adjacent
        }
        hexLayer.redraw();
    }

    window.remove_layer = function (layr) {
        map.removeLayer(layr);
        layerControl.removeLayer(layr)
    }

    window.add_layer = function (layr, layr_name) {
        map.addLayer(layr);
        layerControl.addOverlay(layr, layr_name);
    }

    function update_color_scale_extent(lower, upper) {
        hexLayer.colorScaleExtent([lower, upper])
        hexLayer.redraw()
    }

    async function initialize_data(query = false) {

        $("#spinner").attr('hidden', false);
        document.getElementById("queryData").disabled = true;
        document.getElementById("queryDataWithLoad").disabled = true;

        //await loadRemoteGzippedJSON(filename);
        if (query) {
            computeQueryEmbedding()
        }

        $("#spinner").attr('hidden', '');
        document.getElementById("queryData").disabled = false;
        document.getElementById("queryDataWithLoad").disabled = false;
        //map.flyTo([currentCSV[0].lat, currentCSV[0].lon])
    }

    function removeHexbinTooltips() {
        // Select all elements with the class "hexbin-tooltip"
        const tooltips = document.querySelectorAll('.hexbin-tooltip');
        
        // Loop through the NodeList and remove each element
        tooltips.forEach(tooltip => tooltip.remove());
    }
    
    // Call the function to remove all elements with the specified class

    initialize_data()

    // loading all embs!
    async function loadRemoteGzippedJSON(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        const inflated = pako.inflate(data, { to: 'string' });
        const json = JSON.parse(inflated);

        overture_places_categories_embeddings = json
        console.log(overture_places_categories_embeddings)
        return json;
    }

    loadRemoteGzippedJSON("https://huggingface.co/datasets/do-me/overture-places/resolve/main/overture_places_categories_embeddings.json.gz");
        //"data/overture_places_categories_embeddings.json.gz");

    // Range slider listener

    //////////////////////////////////////////////////////////
    $("#maxScaleRange").on("input", function () {
        $("#maxScale").val($("#maxScaleRange").val());
        SminScore = parseFloat($("#minScale").val());
        SmaxScore = parseFloat($("#maxScale").val());
        update_color_scale_extent(SminScore, SmaxScore)
    });

    $("#maxScale").on("change", function () {
        SminScore = parseFloat($("#minScale").val());
        SmaxScore = parseFloat($("#maxScale").val());
        $("#maxScaleRange").val(SmaxScore);
        update_color_scale_extent(SminScore, SmaxScore)
    });

    //////////////////////////////////////////////////////////

    $("#minScaleRange").on("input", function () {
        $("#minScale").val($("#minScaleRange").val());
        SminScore = parseFloat($("#minScale").val());
        SmaxScore = parseFloat($("#maxScale").val());
        update_color_scale_extent(SminScore, SmaxScore)
    });

    $("#minScale").on("change", function () {
        SminScore = parseFloat($("#minScale").val());
        $("#minScaleRange").val(SminScore);
        SmaxScore = parseFloat($("#maxScale").val());
        update_color_scale_extent(SminScore, SmaxScore)
    });

    //////////////////////////////////////////////////////////////
    $("#minScoreRange").on("input", function () {
        $("#minScore").val($("#minScoreRange").val());
        minScore = parseFloat($("#minScore").val());
        updateColorValueFunction();
    });

    $("#minScore").on("change", function () {
        minScore = parseFloat($("#minScore").val());
        $("#minScoreRange").val(minScore);
        updateColorValueFunction();
    });

    //////////////////////////////////////////////////////////////
    $("#minScoreQuantityRange").on("input", function () {
        $("#minScoreQuantity").val($("#minScoreQuantityRange").val());
        minScoreQuantity = parseFloat($("#minScoreQuantity").val());
        updateColorValueFunction();
    });

    $("#minScoreQuantity").on("change", function () {
        minScoreQuantity = parseFloat($("#minScoreQuantity").val());
        $("#minScoreQuantityRange").val(minScoreQuantity);
        updateColorValueFunction();
    });
    //////////////////////////////////////////////////////////////

    $("#breakMode").on("change", function () {

        breakMode = $("#breakMode").val()
        updateColorValueFunction();
    });

    $("#min_max_mean_median").on("change", function () {
        updateColorValueFunction();
    });

    $('input[name="colorScaleRadio"]').on('change', function () {
        currentModeNormalOrBestLoc = $('input[name="colorScaleRadio"]:checked').val()
        updateColorValueFunction()
    });

    $('input[name="radiusRadio"]').on('change', function () {
        currentRadiusMode = $('input[name="radiusRadio"]:checked').val()
        updateRadius();

    });

    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });

    $('#queryData').click(async function (event) {
        //await updateResults(); // Wait for this function to complete
        computeQueryEmbedding(); // Only called after computeQueryEmbedding is done
    });

    $('#queryDataWithLoad').click(async function (event) {
        await updateResults(); // Wait for this function to complete
        computeQueryEmbedding(); // Only called after computeQueryEmbedding is done
    });
    

    $('#queryText').keydown(function (event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            computeQueryEmbedding();
            updateResults();
            //updateColorValueFunction();
        }
    });

    let zoomTimeout;

    function move_or_zoom() {
        if (zoomTimeout) clearTimeout(zoomTimeout);

        zoomTimeout = setTimeout(() => {
            //remove_all_hex_layer();
            //removeHexbinTooltips();
            //updateResults();
            // Add your custom code here
        }, 300); // Adjust the delay as needed
    }

    map.on('zoom', move_or_zoom);
    map.on('move', move_or_zoom);

})