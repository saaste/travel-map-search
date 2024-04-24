
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const fetchResults = async (south, west, north, east) => {
    let checkboxes = document.querySelectorAll(".entity-checkbox")
    let queries = []
    checkboxes.forEach((cb) => {
        if (cb.checked) {
            if ("customQuery" in cb.dataset) {
                switch(cb.dataset.customQuery) {
                    case "information":
                        queries.push(`nwr["tourism"="information"]["information"="office"](${south},${west},${north},${east});`)
                        break;
                    case "wineries-with-accommodation":
                        queries.push(`nwr["craft"="winery"]["tourism"="hotel"](${south},${west},${north},${east});`)
                        queries.push(`nwr["craft"="winery"]["tourism"="guest_house"](${south},${west},${north},${east});`)
                        queries.push(`nwr["craft"="winery"]["tourism"="chalet"](${south},${west},${north},${east});`)
                        queries.push(`nwr["craft"="winery"]["tourism"="apartment"](${south},${west},${north},${east});`)
                        queries.push(`nwr["craft"="winery"]["tourism"="hostel"](${south},${west},${north},${east});`)
                        break;
                    case "train-tracks":
                        queries.push(`way["railway"="rail"](${south},${west},${north},${east});`)
                        queries.push(`node["railway"="station"](${south},${west},${north},${east});`)
                        break;
                    case "tram-tracks":
                        queries.push(`way["railway"="tram"](${south},${west},${north},${east});`)
                        queries.push(`node["railway"="tram_stop"](${south},${west},${north},${east});`)
                        break;
                    case "light-rail-tracks":
                        queries.push(`way["railway"="light_rail"](${south},${west},${north},${east});`)
                        queries.push(`node["railway"="station"]["station"="light_rail"](${south},${west},${north},${east});`)
                        break;
                    case "subway-tracks":
                        queries.push(`way["railway"="subway"](${south},${west},${north},${east});`)
                        queries.push(`node["railway"="station"]["station"="subway"](${south},${west},${north},${east});`)
                        break;
                    default:
                        console.log("Unsupported custom query: ", cb.dataset.customQuery)
                }
            } else {
                queries.push(`nwr["${cb.dataset.key}"="${cb.dataset.value}"](${south},${west},${north},${east});`)
            }
            
        }

    });
    if (queries.length == 0) {
        return Promise.resolve({"elements": []});
    }

    let query = queries.join("\n")
    let body = "data=" + encodeURIComponent(`
        [bbox:${south},${west},${north},${east}]
        [out:json]
        [timeout:25]
        ;
        (
            ${query}
        );
        out geom;
    `);

    // Uncomment to see the request body
    // console.log(body);

    let result = await fetch(OVERPASS_URL, {
        method: "POST",
        body: body,
    }).then((data) => {
        return data.json();
    })

    // Uncomment to see the response body
    // console.log(JSON.stringify(result, null, 2));
    return result;
}