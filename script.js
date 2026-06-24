let locations = [];
let markers = [];
let selectedMarker = null;
let editMode = false;
let editingIndex = null;

const map = L.map("map").setView([20.5937, 78.9629], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(map);

fetch("india.json")
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: {
                color: "#003366",
                weight: 1,
                fillOpacity: 0.05
            }
        }).addTo(map);
    })
    .catch(error => console.log("GeoJSON Load Error:", error));

map.on("click", function(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    document.getElementById("latitude").value = lat.toFixed(6);
    document.getElementById("longitude").value = lon.toFixed(6);

    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    selectedMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(
            "<b>Selected Location</b><br>" +
            "Latitude: " + lat.toFixed(6) + "<br>" +
            "Longitude: " + lon.toFixed(6)
        )
        .openPopup();
});

function escapeHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createInstrumentBlock(instrument = {}) {
    const block = document.createElement("div");
    block.className = "instrument-block";
    block.innerHTML = `
        <label>Instrument Name</label>
        <input type="text" class="instrumentName" placeholder="Instrument Name" value="${escapeHTML(instrument.instrument_name)}">

        <label>Installation Date</label>
        <input type="date" class="installationDate" value="${escapeHTML(instrument.installation_date)}">

        <label>Category</label>
        <input type="text" class="category" placeholder="Weather / Rainfall / AWS" value="${escapeHTML(instrument.category)}">

        <label>Objective</label>
        <textarea class="objective" rows="3" placeholder="Scientific objective">${escapeHTML(instrument.objective)}</textarea>

        <label>Description</label>
        <textarea class="description" rows="4" placeholder="Instrument description">${escapeHTML(instrument.description)}</textarea>

        <label>Surface / 2D / 3D Measurement</label>
        <input
        type="text"
        class="measurementDimension"
        placeholder="Enter Surface / 2D / 3D Measurement"
        value="${escapeHTML(instrument.measurement_dimension)}">


        <label>Temporal Resolution</label>
        <input type="text" class="temporalResolution" placeholder="e.g. 1 min, 1 hr, daily" value="${escapeHTML(instrument.temporal_resolution)}">

        <label>Number of Units</label>
        <input type="number" min="0" class="numberOfUnits" placeholder="Number of units" value="${escapeHTML(instrument.number_of_units)}">

        <label>Sensor Type</label>
        <input type="text" class="sensorType" placeholder="Sensor type" value="${escapeHTML(instrument.sensor_type)}">

        <label>Measurement</label>
        <input type="text" class="measurement" placeholder="What is measured (e.g. PM2.5, Temperature)" value="${escapeHTML(instrument.measurement)}">

        <label>Project</label>
        <input type="text" class="project" placeholder="Associated project" value="${escapeHTML(instrument.project)}">

        <label>Network</label>
        <input type="text" class="network" placeholder="Network / consortium" value="${escapeHTML(instrument.network)}">

        <button type="button" onclick="removeInstrument(this)">Remove Instrument</button>
    `;
    return block;
}

function getInstrumentBlocks() {
    return Array.from(document.querySelectorAll(".instrument-block"));
}

function resetInstrumentBlocks(instruments = [{}]) {
    const container = document.getElementById("instrumentContainer");
    container.innerHTML = "";
    instruments.forEach(instrument => container.appendChild(createInstrumentBlock(instrument)));
}

function addMoreInstrument() {
    document.getElementById("instrumentContainer").appendChild(createInstrumentBlock());
}

function removeInstrument(button) {
    const blocks = getInstrumentBlocks();

    if (blocks.length > 1) {
        button.closest(".instrument-block").remove();
        return;
    }

    blocks[0].querySelectorAll("input, textarea").forEach(field => field.value = "");
}

function collectInstruments() {
    return getInstrumentBlocks()
        .map(block => ({
            instrument_name: block.querySelector(".instrumentName").value.trim(),
            installation_date: block.querySelector(".installationDate").value,
            category: block.querySelector(".category").value.trim(),
            objective: block.querySelector(".objective").value.trim(),
            description: block.querySelector(".description").value.trim(),
            measurement_dimension: block.querySelector(".measurementDimension").value,
            temporal_resolution: block.querySelector(".temporalResolution").value.trim(),
            number_of_units: block.querySelector(".numberOfUnits").value.trim(),
            sensor_type: block.querySelector(".sensorType").value.trim(),
            measurement: block.querySelector(".measurement").value.trim(),
            project: block.querySelector(".project").value.trim(),
            network: block.querySelector(".network").value.trim()
        }))
        .filter(instrument => instrument.instrument_name !== "");
}

function buildPopup(location, index) {
    return `
        <div class="location-popup">
            <h3>${escapeHTML(location.location_name)}</h3>
            <b>Latitude:</b> ${escapeHTML(location.latitude)}<br>
            <b>Longitude:</b> ${escapeHTML(location.longitude)}<br>
            <b>Total Instruments:</b> ${location.instruments.length}<br><br>
            <button type="button" class="popup-toggle" onclick="openInstrumentTable(${index})">Instruments</button>
        </div>
    `;
}

function redrawMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    locations.forEach((location, index) => {
        const lat = parseFloat(location.latitude);
        const lon = parseFloat(location.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return;

        const marker = L.marker([lat, lon])
            .addTo(map)
            .bindPopup(buildPopup(location, index));

        markers.push(marker);
    });
}

function renderTable() {
    const tableBody = document.querySelector("tbody");
    tableBody.innerHTML = "";

    locations.forEach((location, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHTML(location.location_name)}</td>
            <td>${escapeHTML(location.latitude)}</td>
            <td>${escapeHTML(location.longitude)}</td>
            <td>${location.instruments.length}</td>
            <td>
                <button type="button" onclick="editRow(${index})">Edit</button>
                <button type="button" onclick="deleteRow(${index})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function renderAll() {
    renderTable();
    redrawMarkers();
}

function addInstrument() {
    const locationName = document.getElementById("locationName").value.trim();
    const latitude = document.getElementById("latitude").value.trim();
    const longitude = document.getElementById("longitude").value.trim();
    const instrumentList = collectInstruments();

    if (!locationName || !latitude || !longitude) {
        alert("Please fill location name, latitude, and longitude.");
        return;
    }

    if (instrumentList.length === 0) {
        alert("Please add at least one instrument name.");
        return;
    }

    const locationData = {
        location_name: locationName,
        latitude: latitude,
        longitude: longitude,
        instruments: instrumentList
    };

    if (editMode && editingIndex !== null) {
        locations[editingIndex] = locationData;
    } else {
        locations.push(locationData);
    }

    renderAll();
    map.setView([parseFloat(latitude), parseFloat(longitude)], 8);
    clearForm();
    alert("Location saved successfully!");
}

function editRow(index) {
    const location = locations[index];

    document.getElementById("locationName").value = location.location_name;
    document.getElementById("latitude").value = location.latitude;
    document.getElementById("longitude").value = location.longitude;
    resetInstrumentBlocks(location.instruments.length ? location.instruments : [{}]);

    editMode = true;
    editingIndex = index;
    map.setView([parseFloat(location.latitude), parseFloat(location.longitude)], 10);
}

function deleteRow(index) {
    locations.splice(index, 1);
    renderAll();
}

function clearForm() {
    document.getElementById("instrumentForm").reset();
    resetInstrumentBlocks([{}]);
    editMode = false;
    editingIndex = null;

    if (selectedMarker) {
        map.removeLayer(selectedMarker);
        selectedMarker = null;
    }
}

function normalizeImportedData(data) {
    if (!Array.isArray(data)) return [];
    if (data.every(item => Array.isArray(item.instruments))) return data;

    const grouped = new Map();

    data.forEach(item => {
        const key = [item.location_name, item.latitude, item.longitude].join("|");

        if (!grouped.has(key)) {
            grouped.set(key, {
                location_name: item.location_name || "",
                latitude: item.latitude || "",
                longitude: item.longitude || "",
                instruments: []
            });
        }

        grouped.get(key).instruments.push({
            instrument_name: item.instrument_name || "",
            installation_date: item.installation_date || "",
            category: item.category || "",
            objective: item.objective || "",
            description: item.description || "",
            measurement_dimension: item.measurement_dimension || "",
            temporal_resolution: item.temporal_resolution || "",
            number_of_units: item.number_of_units || "",
            sensor_type: item.sensor_type || "",
            measurement: item.measurement || "",
            project: item.project || "",
            network: item.network || ""
        });
    });

    return Array.from(grouped.values());
}

function importJSON(event) {
    const file = event.target.files[0];

    if (!file) {
        alert("Please select JSON file.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            locations = normalizeImportedData(JSON.parse(e.target.result));
            renderAll();
            clearForm();
            alert("JSON imported successfully!");
        } catch(error) {
            alert("Invalid JSON file.");
            console.log(error);
        }
    };

    reader.readAsText(file);
}

function exportJSON() {
    const blob = new Blob([JSON.stringify(locations, null, 4)], {
        type: "application/json"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "instruments.json";
    link.click();
    URL.revokeObjectURL(link.href);
}

function openInstrumentTable(index) {
    const location = locations[index];
    if (!location) return;

    document.getElementById("instrumentTableTitle").innerText = location.location_name;
    document.getElementById("instrumentTableMeta").innerText =
        "Latitude: " + location.latitude +
        " | Longitude: " + location.longitude +
        " | Total Instruments: " + location.instruments.length;

    document.getElementById("instrumentTableBody").innerHTML =
        location.instruments.map((instrument, rowIndex) => `
            <tr>
                <td>${rowIndex + 1}</td>
                <td>${escapeHTML(instrument.instrument_name)}</td>
                <td>${escapeHTML(instrument.installation_date || "Not added")}</td>
                <td>${escapeHTML(instrument.category || "Not added")}</td>
                <td>${escapeHTML(instrument.objective || "Not added")}</td>
                <td>${escapeHTML(instrument.description || "Not added")}</td>
                <td>${escapeHTML(instrument.measurement_dimension || "Not added")}</td>
                <td>${escapeHTML(instrument.temporal_resolution || "Not added")}</td>
                <td>${escapeHTML(instrument.number_of_units || "Not added")}</td>
                <td>${escapeHTML(instrument.sensor_type || "Not added")}</td>
                <td>${escapeHTML(instrument.measurement || "Not added")}</td>
                <td>${escapeHTML(instrument.project || "Not added")}</td>
                <td>${escapeHTML(instrument.network || "Not added")}</td>
            </tr>
        `).join("");

    document.getElementById("instrumentTableModal").classList.add("show");
}

function closeInstrumentTable() {
    document.getElementById("instrumentTableModal").classList.remove("show");
}

function createInstrumentTableModal() {
    const modal = document.createElement("div");
    modal.id = "instrumentTableModal";
    modal.className = "instrument-table-modal";
    modal.innerHTML = `
        <div class="instrument-table-panel">
            <div class="instrument-table-header">
                <div>
                    <h2 id="instrumentTableTitle">Instruments</h2>
                    <p id="instrumentTableMeta"></p>
                </div>
                <button type="button" class="modal-close-btn" onclick="closeInstrumentTable()">Close</button>
            </div>

            <div class="instrument-table-wrapper">
                <table class="full-instrument-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Instrument</th>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Objective</th>
                            <th>Description</th>
                            <th>Surface/2D/3D</th>
                            <th>Temporal Resolution</th>
                            <th>Units</th>
                            <th>Sensor Type</th>
                            <th>Measurement</th>
                            <th>Project</th>
                            <th>Network</th>
                        </tr>
                    </thead>
                    <tbody id="instrumentTableBody"></tbody>
                </table>
            </div>
        </div>
    `;

    modal.addEventListener("click", event => {
        if (event.target === modal) closeInstrumentTable();
    });

    document.body.appendChild(modal);
}

function convertToDecimal() {
    const latDegree = parseFloat(document.getElementById("latDegree").value) || 0;
    const latMinute = parseFloat(document.getElementById("latMinute").value) || 0;
    const latSecond = parseFloat(document.getElementById("latSecond").value) || 0;

    const lonDegree = parseFloat(document.getElementById("lonDegree").value) || 0;
    const lonMinute = parseFloat(document.getElementById("lonMinute").value) || 0;
    const lonSecond = parseFloat(document.getElementById("lonSecond").value) || 0;

    const decimalLatitude = latDegree + (latMinute / 60) + (latSecond / 3600);
    const decimalLongitude = lonDegree + (lonMinute / 60) + (lonSecond / 3600);

    document.getElementById("decimalLat").innerText = decimalLatitude.toFixed(6);
    document.getElementById("decimalLon").innerText = decimalLongitude.toFixed(6);
    document.getElementById("latitude").value = decimalLatitude.toFixed(6);
    document.getElementById("longitude").value = decimalLongitude.toFixed(6);

    map.setView([decimalLatitude, decimalLongitude], 10);
}

resetInstrumentBlocks([{}]);
createInstrumentTableModal();
setTimeout(() => map.invalidateSize(), 100);

console.log("IITM Instrument Admin Portal Loaded Successfully");


function updateMarkerFromCoordinates() {

    const lat = parseFloat(document.getElementById("latitude").value);
    const lon = parseFloat(document.getElementById("longitude").value);

    if (isNaN(lat) || isNaN(lon)) {
        alert("Please enter valid coordinates.");
        return;
    }

    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    selectedMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(
            "<b>Selected Location</b><br>" +
            "Latitude: " + lat.toFixed(6) + "<br>" +
            "Longitude: " + lon.toFixed(6)
        )
        .openPopup();

    map.setView([lat, lon], 10);
}