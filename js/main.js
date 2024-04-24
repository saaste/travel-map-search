import { fetchResults } from "./overpass-client.js";

let map, searchButton, clearButton, myLocationButton, menuToggleButton, menuElements, spinner;
let markers = [];
let polylines = [];
let storedBounds = null;
let menuVisible = false;

window.onload = () => {
    init();
}

const init = () => {
    let lastLocation = getSavedLocation() || [60.2170, 24.8542];
    let lastZoom = getSavedZoom() || 15;
    map = L.map("map").setView(lastLocation, lastZoom);
    map.addEventListener("zoomend", mapZoomEnd);
    map.addEventListener("moveend", mapMoveEnd);
    map.addEventListener("locationfound", mapLocationFound);
    map.addEventListener("locationerror", mapLocationError);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
    }).addTo(map);

    menuToggleButton = document.getElementById("toggle-menu");
    menuToggleButton.addEventListener("click", menuToggleClick);

    menuElements = document.querySelectorAll(".sidebar, .buttons");
    spinner = document.querySelector(".spinner");

    searchButton = document.getElementById("search");
    searchButton.addEventListener("click", searchClick);

    clearButton = document.getElementById("clear");
    clearButton.addEventListener("click", clearClick);

    myLocationButton = document.getElementById("my-location");
    myLocationButton.addEventListener("click", myLocationClick);

    let lastChecked = getSavedCheckboxes()
    let checkboxes = document.querySelectorAll(".entity-checkbox")
    checkboxes.forEach((cb) => {
        cb.addEventListener("change", checkboxChange);
        if (lastChecked.includes(cb.id)) cb.checked = true;
        setCheckboxLabelStyle(cb);
    });
};

const mapZoomEnd = (e) => {
    let zoom = map.getZoom();
    searchButton.disabled = zoom < 9;
    saveCurrentZoom(zoom)
}

const mapMoveEnd = (e) => {
    saveCurrentLocation(map.getCenter())
}

const menuToggleClick = () => {
    if (menuVisible) {
        hideMenu();
    } else {
        showMenu();
    }
}

const hideMenu = () => {
    menuElements.forEach((el) => {
        el.classList.add("hidden");
    })
    
    map.invalidateSize();
    storedBounds = null;
    menuVisible = false;
    menuToggleButton.classList.remove("fa-angles-left");
    menuToggleButton.classList.add("fa-angles-right");
}

const showMenu = () => {
    storedBounds = map.getBounds();
    
    menuElements.forEach((el) => {
            el.classList.remove("hidden");
    })

    map.invalidateSize();
    menuVisible = true;
    menuToggleButton.classList.add("fa-angles-left");
    menuToggleButton.classList.remove("fa-angles-right");
}

const hideSpinner = () => {
    spinner.classList.add("hidden");
}

const showSpinner = () => {
    spinner.classList.remove("hidden");
}

const myLocationClick = () => {
    map.locate({ setView: true, enableHighAccuracy: true });
    myLocationButton.disabled = true;
    showSpinner();
}

const mapLocationFound = () => {
    myLocationButton.disabled = false;
    hideSpinner();
    hideMenu();
}

const mapLocationError = (error) => {
    myLocationButton.disabled = false;
    hideSpinner();
    console.log(error)
}

const searchClick = () => {
    if (map.getZoom() < 9) {
        console.log("Zoom closer to search");
        return;
    }

    searchButton.disabled = true;
    showSpinner();

    let bounds = map.getBounds();
    if (storedBounds) {
        console.log("using stored bounds");
        bounds = storedBounds;
    }

    clearMapElements();
    fetchResults(bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast())
        .then((result) => {
            const size = new TextEncoder().encode(JSON.stringify(result)).length
            const kiloBytes = size / 1024;
            const megaBytes = kiloBytes / 1024;

            if (megaBytes > 2) {
                let cont = confirm(`Query returned quite a lot of data (approx. ${Math.round(megaBytes)} MB). Your browser may have a hard time trying to render this. Do you really want to continue?`);
                if (!cont) {
                    searchButton.disabled = false;
                    return;
                }
            }
            
            result.elements.forEach((element) => {
                switch (element.type) {
                    case "node":
                        // console.log("node", element);
                        let marker = createMarker(element)
                        marker.addTo(map);
                        break;
                    case "way":
                        // console.log("way", element);
                        let line = createPolylinesWay(element);
                        line.addTo(map);
                        break;
                    case "relation":
                        // console.log("relation", element);
                        let lines = createPolylinesRelation(element);
                        lines.forEach((pl) => {
                            pl.addTo(map);
                        })
                        break;
                    default:
                        console.log("Unsupported type: ", element.type);
                }

            });
            searchButton.disabled = false;
            hideSpinner();
            hideMenu();
        });
}

const clearClick = () => {
    let checkboxes = document.querySelectorAll(".entity-checkbox")
    checkboxes.forEach((cb) => {
        cb.checked = false;
        setCheckboxLabelStyle(cb);
    });
}

const checkboxChange = (e) => {
    setCheckboxLabelStyle(e.target);

    let checkboxes = document.querySelectorAll(".entity-checkbox:checked")
    saveCheckedCheckboxes(checkboxes);
}

const setCheckboxLabelStyle = (checkbox) => {
    let checked = checkbox.checked;
    let labels = checkbox.labels;

    labels.forEach((lb) => {
        if (checked) {
            lb.classList.add("selected");
        } else {
            lb.classList.remove("selected");
        }
    })
}

const createPopupContent = (element) => {
    let content = `<div class="marker-popup-content">`

    if ("name" in element.tags) {
        content += `<h4><strong>${element.tags["name"]}</strong></h4>`
    }


    for (const key in element.tags) {
        let value = element.tags[key];
        if (key.startsWith("addr")) {
            content += `<p>${key.replace("addr:", "")}: ${value}</p>`
        } else if (value.startsWith("http")) {
            content += `<p>${key}: <a href="${value}" target="_blank">${value}</a></p>`
        } else if (key == "name") {
            continue;
        } else {
            content += `<p>${key}: ${value}</p>`
        }
    }
    content += "</div>"
    return content;
}

const createIcon = (element) => {
    let iconClass = "fa-location-dot"
    let className = "icon-unknown"

    if ("tourism" in element.tags) {
        switch (element.tags.tourism) {
            case "hotel":
            case "guest_house":
            case "apartment":
            case "hostel":
            case "chalet":
            case "alpine_hut":
                iconClass = "fa-bed";
                break;
            case "attraction":
                iconClass = "fa-camera";
                break;
            case "information":
                iconClass = "fa-circle-info";
                break;
            case "museum":
                iconClass = "fa-building-columns";
                break;
            case "viewpoint":
                iconClass = "fa-binoculars";
                break;
            case "wine_cellar":
                iconClass = "fa-wine-bottle";
                break;
            default:
                console.log("Unknown tourism value ", element.tags.tourism);
        }
        className = "icon-tourism-" + element.tags.tourism;
    } else if ("amenity" in element.tags) {
        switch (element.tags.amenity) {
            case "restaurant":
                iconClass = "fa-utensils";
                break;
            case "cafe":
                iconClass = "fa-mug-saucer";
                break;
            case "bar":
                iconClass = "fa-martini-glass";
                break;
            case "pub":
                iconClass = "fa-beer-mug-empty";
                break;
            case "hospital":
                iconClass = "fa-hospital";
                break;
            case "clinic":
                iconClass = "fa-chimney-medical";
                break;
            case "doctors":
                iconClass = "fa-user-doctor";
                break;
            case "pharmacy":
                iconClass = "fa-prescription-bottle-medical";
                break;
            case "atm":
                iconClass = "fa-euro-sign";
                break;
            case "bicycle_rental":
                iconClass = "fa-bicycle";
                break;
            case "internet_cafe":
                iconClass = "fa-wifi";
                break;
            case "marketplace":
                iconClass = "fa-store";
                break;
            default:
                console.log("Unknown amenity value ", element.tags.amenity);
        }
        className = "icon-amenity-" + element.tags.amenity;
    } else if ("shop" in element.tags) {
        switch (element.tags.shop) {
            case "supermarket":
                iconClass = "fa-basket-shopping"
                break;
            case "department_store":
            case "mall":
                iconClass = "fa-cart-shopping";
                break;
            case "wool":
                iconClass = "fa-shirt";
                break;
            case "bicycle":
                iconClass = "fa-bicycle";
                break;
            case "laundry":
                iconClass = "fa-jug-detergent";
                break;
            case "wine":
            case "alcohol":
                iconClass = "fa-wine-bottle";
                break;
            default:
                console.log("Unknown shop value ", element.tags.shop);
        }
        className = "icon-shop-" + element.tags.shop;
    } else if ("craft" in element.tags) {
        switch (element.tags.craft) {
            case "winery":
                iconClass = "fa-wine-bottle";
                break;
            default:
                console.log("Unknown craft value ", element.tags.craft);
        }
        className = "icon-craft-" + element.tags.craft;
    } else if ("railway" in element.tags) {
        switch (element.tags.railway) {
            case "station":
                iconClass = "fa-train";
                break;
            case "tram_stop":
                iconClass = "fa-train-tram";
                break;
            default:
                console.log("Unknown railway value ", element.tags.railway);
        }
        className = "icon-railway-" + element.tags.railway;
    } else if ("sport" in element.tags) {
        switch (element.tags.sport) {
            case "free_flying":
                iconClass = "fa-parachute-box";
                break;
            default:
                console.log("Unknown sport value ", element.tags.sport);
        }
        className = "icon-sport-" + element.tags.sport;
    } else {
        console.log("type not supported: ", element);
    }

    return L.divIcon({
        html: `<i class="fa-solid ${iconClass}"></i>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, 0],
        className: className,
    })
}

const createMarker = (element) => {
    let icon = createIcon(element);
    let marker = L.marker([element.lat, element.lon], { icon: icon })
    marker.bindPopup(createPopupContent(element));
    markers.push(marker);
    return marker
}

const createPolylinesRelation = (element) => {
    if (!("members" in element))
        return null;

    let className = "route-unknown";
    if ("route" in element.tags) {
        className = `route-${element.tags.route}`;
    }

    let memberPolylines = []
    for (let i = 0; i < element.members.length; i++) {
        let way = element.members[i];
        if (!("geometry" in way) || way.geometry.length === 0)
            continue;

        let coordinates = [];
        way.geometry.forEach((geo) => {
            coordinates.push([geo.lat, geo.lon]);
        });
        let polyline = L.polyline(coordinates, { weight: 5, smoothFactor: 1.0, className: className })
        polyline.bindPopup(createPopupContent(element));
        polylines.push(polyline);
        memberPolylines.push(polyline);
    }
    
    return memberPolylines
}

const createPolylinesWay = (element) => {
    let className = "way-unknown";
    if ("railway" in element.tags) {
        className = `railway-${element.tags.railway}`;
    }

    if (!("geometry" in element) || element.geometry.length === 0)
        return null;

    let coordinates = [];
    element.geometry.forEach((geo) => {
        coordinates.push([geo.lat, geo.lon]);
    });
    let polyline = L.polyline(coordinates, { weight: 5, smoothFactor: 1.0, className: className })
    polylines.push(polyline);
        
    return polyline
}

const clearMapElements = () => {
    markers.forEach((marker) => {
        map.removeLayer(marker);
    });
    polylines.forEach((pl) => {
        map.removeLayer(pl);
    })
}

const saveCurrentLocation = (location) => {
    window.localStorage.setItem("last-location", `${location.lat},${location.lng}`);
}

const getSavedLocation = () => {
    let value = window.localStorage.getItem("last-location");
    if (!value) return null;

    let parts = value.split(",");
    return [parseFloat(parts[0]), parseFloat(parts[1])];
}

const saveCurrentZoom = (zoom) => {
    window.localStorage.setItem("last-zoom", zoom);
}

const getSavedZoom = () => {
    let value = window.localStorage.getItem("last-zoom");
    if (!value) return null;

    return parseInt(value, 10);
}

const saveCheckedCheckboxes = (checkboxes) => {
    let value = Array.from(checkboxes).map((cb) => cb.id).join(",");
    window.localStorage.setItem("last-selection", value);
}

const getSavedCheckboxes = () => {
    let value = window.localStorage.getItem("last-selection");
    if (value === null) return [];
    return value.split(",")

}