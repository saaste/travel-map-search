export const createPopupContent = (element) => {
    let content = `<div class="map-popup-content">`

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

export const createMarker = (state, element, latlng = null) => {
    let icon = createIcon(element);
    
    if (!latlng) {
        latlng = [element.lat, element.lon];
    }

    let marker = L.marker(latlng, { icon: icon })
    marker.bindPopup(createPopupContent(element));
    
    state.markers.push(marker);
    
    return marker
}

export const createMarkerFromWay = (state, way) => {
    const p1 = L.latLng(way.bounds.minlat, way.bounds.minlon);
    const p2 = L.latLng(way.bounds.maxlat, way.bounds.maxlon);
    const bounds = L.latLngBounds(p1, p2);
    return createMarker(state, way, bounds.getCenter());
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