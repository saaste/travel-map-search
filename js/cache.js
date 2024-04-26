const LAST_LOCATION_KEY = "last-location";
const LAST_ZOOM_KEY = "last-zoom";
const LAST_SELECTION_KEY = "last-selection";

export const getSavedLocation = () => {
    let value = window.localStorage.getItem(LAST_LOCATION_KEY);
    if (!value) return [60.2170, 24.8542];

    let parts = value.split(",");
    return [parseFloat(parts[0]), parseFloat(parts[1])];
}

export const saveCurrentLocation = (location) => {
    window.localStorage.setItem(LAST_LOCATION_KEY, `${location.lat},${location.lng}`);
}

export const saveCurrentZoom = (zoom) => {
    window.localStorage.setItem(LAST_ZOOM_KEY, zoom);
}

export const getSavedZoom = () => {
    let value = window.localStorage.getItem(LAST_ZOOM_KEY);
    if (!value) return 15;

    return parseInt(value, 10);
}

export const saveCheckedCheckboxes = (checkboxes) => {
    let value = Array.from(checkboxes).map((cb) => cb.id).join(",");
    window.localStorage.setItem(LAST_SELECTION_KEY, value);
}

export const getSavedCheckboxes = () => {
    let value = window.localStorage.getItem(LAST_SELECTION_KEY);
    if (value === null) return [];
    return value.split(",")

}