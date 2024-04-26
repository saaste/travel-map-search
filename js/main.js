import { fetchResults, getResultSizeInMB } from "./overpass-client.js";
import { getSavedLocation, saveCurrentLocation, getSavedZoom, saveCurrentZoom, getSavedCheckboxes, saveCheckedCheckboxes } from "./cache.js";
import { createPopupContent, createMarker, createMarkerFromWay } from "./map-utils.js";
import { state } from "./state.js";

let searchButton, clearButton, myLocationButton, menuToggleButton, menuElements, spinner;

window.onload = () => {
    init();
}

const init = () => {
    let lastLocation = getSavedLocation();
    let lastZoom = getSavedZoom();

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
    if (state.menuVisible) {
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
    state.storedBounds = null;
    state.menuVisible = false;
    menuToggleButton.classList.remove("fa-angles-left");
    menuToggleButton.classList.add("fa-angles-right");
}

const showMenu = () => {
    state.storedBounds = map.getBounds();
    
    menuElements.forEach((el) => {
            el.classList.remove("hidden");
    })

    map.invalidateSize();
    state.menuVisible = true;
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
    if (state.storedBounds) {
        bounds = state.storedBounds;
    }

    clearMapElements();
    fetchResults(bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast())
        .then((result) => {
            const resultSizeInMB = getResultSizeInMB(result);
            if (resultSizeInMB > 2) {
                let cont = confirm(`Query returned quite a lot of data (approx. ${resultSizeInMB} MB). Your browser may have a hard time trying to render this if you are zoomed out. Do you really want to continue?`);
                if (!cont) {
                    searchButton.disabled = false;
                    return;
                }
            }
            
            result.elements.forEach((element) => {
                switch (element.type) {
                    case "node":
                        // console.log("node", element);
                        let marker = createMarker(state, element)
                        marker.addTo(map);
                        break;
                    case "way":
                        // console.log("way", element);
                        const firstGeometry = element.geometry[0];
                        const lastGeometry = element.geometry[element.geometry.length - 1];
                        if (firstGeometry.lat === lastGeometry.lat && firstGeometry.lon === lastGeometry.lon) {
                            // Closed geometry: building, etc (can be a roundabout)
                            let wayMarker = createMarkerFromWay(state, element);
                            wayMarker.addTo(map);
                        } else {
                            // Open geometry: road, etc
                            let line = createPolylinesWay(element);
                            line.addTo(map);
                        }
                        
                        break;
                    case "relation":
                        // console.log("relation", element);
                        let lines = createPolylinesRelation(element, map.getBounds());
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

const createPolylinesRelation = (element, bounds) => {
    let className = "route-unknown";
    if ("route" in element.tags) {
        className = `route-${element.tags.route}`;
    }

    let memberPolylines = []
    for (let i = 0; i < element.members.length; i++) {
        let member = element.members[i];
        if (member.type !== "way") {
            continue;
        }

        let coordinates = [];
        member.geometry.forEach((geo) => {
            // Include coordinates that are within the bounds
            if (bounds.contains([geo.lat, geo.lon])) {
                coordinates.push([geo.lat, geo.lon]);
            }
        });

        if (coordinates.length > 2) {
            let polyline = L.polyline(coordinates, { weight: 5, smoothFactor: 5.0, className: className })
            polyline.bindPopup(createPopupContent(element));
            state.polylines.push(polyline);
            memberPolylines.push(polyline);
        }
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
    state.polylines.push(polyline);
        
    return polyline
}

const clearMapElements = () => {
    state.markers.forEach((marker) => {
        map.removeLayer(marker);
    });
    state.markers = [];

    state.polylines.forEach((pl) => {
        map.removeLayer(pl);
    });
    state.markers = [];
}