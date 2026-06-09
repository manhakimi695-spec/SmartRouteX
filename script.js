// ==========================================
// 1. PENYEDIAAN PETA UTAMA
// ==========================================
const map = L.map('map', { zoomControl: false }).setView([3.066557, 101.490142], 15);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// ==========================================
// 2. GABUNGAN SEMUA NODES (LAMA + BARU DARI CSV)
// ==========================================
const nodes = {
    // Titik Permulaan & Fail CSV Baru
    "Ayam Gepuk": [3.066557, 101.490142],
    "Kolej Teratai 4": [3.069514, 101.494814],
    "Pusat Kesihatan UiTM": [3.067649, 101.492978],
    "Kolej Perindu 4": [3.065815, 101.500727],

    // Titik Kolej dari Peta Asal Sebelum ini
    "Kolej Melati": [3.071377, 101.497962],
    "Kolej Mawar": [3.068979, 101.495398],
    "Kolej Seroja": [3.069460, 101.506348],
    "Kolej Anggerik": [3.066601, 101.493286],
    "Kolej Perindu 3": [3.067557, 101.499218],
    "Kolej Delima 1": [3.067906, 101.500441],
    "Kolej Teratai 1": [3.068838, 101.497737],
    "Kolej Meranti": [3.070503, 101.507691]
};

// ==========================================
// 3. MATRIKS GRAF BERPADU (Banyak Pilihan Laluan Jaringan)
// ==========================================
const graph = {
    "Ayam Gepuk": { "Kolej Anggerik": 400, "Pusat Kesihatan UiTM": 300, "Kolej Melati": 900 },
    "Pusat Kesihatan UiTM": { "Ayam Gepuk": 300, "Kolej Anggerik": 150 },
    "Kolej Anggerik": { "Ayam Gepuk": 400, "Pusat Kesihatan UiTM": 150, "Kolej Mawar": 450, "Kolej Teratai 4": 300 },
    "Kolej Teratai 4": { "Kolej Anggerik": 300, "Kolej Mawar": 150, "Kolej Teratai 1": 350 },
    "Kolej Melati": { "Ayam Gepuk": 900, "Kolej Mawar": 350, "Kolej Teratai 1": 400 },
    "Kolej Mawar": { "Kolej Melati": 350, "Kolej Anggerik": 450, "Kolej Teratai 4": 150, "Kolej Teratai 1": 250, "Kolej Seroja": 950 },
    "Kolej Teratai 1": { "Kolej Melati": 400, "Kolej Mawar": 250, "Kolej Teratai 4": 350, "Kolej Delima 1": 250 },
    "Kolej Delima 1": { "Kolej Teratai 1": 250, "Kolej Perindu 3": 120, "Kolej Perindu 4": 150 },
    "Kolej Perindu 3": { "Kolej Delima 1": 120, "Kolej Perindu 4": 90, "Kolej Seroja": 700 },
    "Kolej Perindu 4": { "Kolej Delima 1": 150, "Kolej Perindu 3": 90, "Kolej Seroja": 650 },
    "Kolej Seroja": { "Kolej Mawar": 950, "Kolej Perindu 3": 700, "Kolej Perindu 4": 650, "Kolej Meranti": 450 },
    "Kolej Meranti": { "Kolej Seroja": 450 }
};

// ==========================================
// 4. ENGINE ALGORITMA DIJKSTRA TULEN
// ==========================================
function dijkstra(graph, start, end) {
    let distances = {};
    let prev = {};
    let pq = [];

    for (let node in graph) {
        distances[node] = Infinity;
        prev[node] = null;
    }
    distances[start] = 0;
    pq.push({ node: start, dist: 0 });

    while (pq.length > 0) {
        pq.sort((a, b) => a.dist - b.dist);
        let { node: currNode, dist: currDist } = pq.shift();

        if (currNode === end) break;

        for (let neighbor in graph[currNode]) {
            let alt = currDist + graph[currNode][neighbor];
            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                prev[neighbor] = currNode;
                pq.push({ node: neighbor, dist: alt });
            }
        }
    }

    let path = [];
    let u = end;
    while (u !== null) {
        path.unshift(u);
        u = prev[u];
    }
    return { path, distance: distances[end] };
}

// ==========================================
// 5. PENGURUSAN VISUAL PETA & OUTPUT INTERFAK
// ==========================================
let currentDestinationMarker = null;
let activePolyline = null;
let networkMarkers = [];

// Plot SEMUA titk nod sebagai bulatan kelabu halus untuk tunjuk rantaian pilihan jalan alternatif
function plotGraphNetwork() {
    for (let name in nodes) {
        if (name !== "Ayam Gepuk") {
            let circle = L.circleMarker(nodes[name], {
                radius: 6,
                fillColor: '#94a3b8',
                color: '#cbd5e1',
                weight: 2,
                fillOpacity: 0.8
            }).addTo(map).bindPopup(`Nod Graf: ${name}`);
            networkMarkers.push(circle);
        }
    }
}

// Penanda Kekal Kedai Ayam Gepuk
let startMarker = L.marker(nodes["Ayam Gepuk"]).addTo(map).bindPopup('<b>PUNCAK MULA (KEDAI):</b><br>Ayam Gepuk S7').openPopup();

function changeRouteData() {
    const targetCollege = document.getElementById('route-selector').value;
    
    // Jalankan Dijkstra
    const result = dijkstra(graph, "Ayam Gepuk", targetCollege);
    
    const totalDistanceKm = (result.distance / 1000).toFixed(1);
    const etaMinutes = Math.ceil(totalDistanceKm * 4); 

    // Kemaskini teks UI bawah
    document.getElementById('route-eta').innerText = `14 Aug 2026 • ${etaMinutes} min`;
    document.getElementById('info-distance').innerText = `${totalDistanceKm} km (Jarak Graf)`;
    
    const pathString = result.path.map(n => n.replace("Kolej ", "").replace("Pusat ", "PMR ")).join(" ➡️ ");
    document.getElementById('info-type').innerText = pathString;
    
    document.getElementById('info-risk').innerText = `Dijkstra mengira rute terpantas melalui ${result.path.length} nod optimum.`;

    // Bersihkan penanda lama
    if (currentDestinationMarker) map.removeLayer(currentDestinationMarker);
    if (activePolyline) map.removeLayer(activePolyline);

    // Plot penanda destinasi baru
    currentDestinationMarker = L.marker(nodes[targetCollege])
        .addTo(map)
        .bindPopup(`<b>MATLAMAT DESTINASI:</b><br>${targetCollege}`)
        .openPopup();

    // Sediakan array koordinat untuk Snap to Road API
    let pathCoordinates = result.path.map(nodeName => {
        let coord = nodes[nodeName];
        return [coord[1], coord[0]]; 
    });

    const coordinatesString = pathCoordinates.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

    let lineColor = "#6366f1"; 
    if (targetCollege === "Kolej Meranti" || targetCollege === "Kolej Seroja") lineColor = "#ef4444";

    fetch(url)
        .then(response => response.json())
        .then(res => {
            if (res.routes && res.routes.length > 0) {
                const leafletCoords = res.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                activePolyline = L.polyline(leafletCoords, {
                    color: lineColor,
                    weight: 6,
                    opacity: 0.9
                }).addTo(map);
                
                // Fokus skrin merangkumi keseluruhan skop laluan
                const group = new L.featureGroup([startMarker, currentDestinationMarker]);
                map.fitBounds(group.getBounds(), { padding: [60, 60] });
            }
        })
        .catch(() => {
            const fallbackCoords = result.path.map(name => nodes[name]);
            activePolyline = L.polyline(fallbackCoords, { color: lineColor, weight: 6 }).addTo(map);
            const group = new L.featureGroup([startMarker, currentDestinationMarker]);
            map.fitBounds(group.getBounds(), { padding: [60, 60] });
        });
}

function zoomInMap() { map.zoomIn(); }
function zoomOutMap() { map.zoomOut(); }
function reCenterMap() {
    map.setView([3.066557, 101.490142], 15);
    startMarker.openPopup();
}

// Plot semua rangkaian graf titik kelabu
plotGraphNetwork();

// ==========================================
// 6. FUNGSI AUTOMATIK SPLASH SCREEN
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    document.body.classList.add("loading");
    setTimeout(function() {
        const splash = document.getElementById("splash-screen");
        if (splash) {
            splash.style.opacity = "0";
            setTimeout(() => {
                splash.remove();
                document.body.classList.remove("loading");
                changeRouteData(); // Picu lakaran laluan pertama kali selepas loading tamat
            }, 700);
        }
    }, 2500); 
});