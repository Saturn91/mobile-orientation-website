(function () {
    const DIRECTIONS = [
        'North', 'North-East', 'East', 'South-East',
        'South', 'South-West', 'West', 'North-West'
    ];

    const el = {
        direction: document.getElementById('direction'),
        degrees: document.getElementById('degrees'),
        vertical: document.getElementById('vertical'),
        screen: document.getElementById('screen'),
        status: document.getElementById('status'),
        startBtn: document.getElementById('startBtn'),
        calibrateBtn: document.getElementById('calibrateBtn'),
        permission: document.getElementById('permission'),
        permissionBtn: document.getElementById('permissionBtn')
    };

    const toRad = (deg) => deg * Math.PI / 180;
    const normalize = (deg) => ((deg % 360) + 360) % 360;

    let northOffset = null;   // alpha value that represents "North"
    let pendingNorth = false; // set North on the next sensor reading
    let listening = false;
    let receivedData = false;

    function onOrientation(event) {
        const alpha = event.alpha; // rotation around Z axis (0-360)
        const beta = event.beta;   // front/back tilt (-180 to 180)
        const gamma = event.gamma; // left/right tilt (-90 to 90)

        if (alpha === null || beta === null || gamma === null) {
            el.status.textContent = 'No orientation data available on this device.';
            return;
        }

        receivedData = true;

        if (northOffset === null || pendingNorth) {
            northOffset = alpha;
            pendingNorth = false;
            el.status.textContent = 'North set to the current direction.';
        }

        // Heading relative to North. Turning the phone clockwise (seen from above) gives East.
        const heading = normalize(northOffset - alpha);
        const index = Math.round(heading / 45) % 8;
        el.direction.textContent = DIRECTIONS[index];
        el.degrees.textContent = heading.toFixed(0);

        // Top edge of the phone: pointing to the sky (Up), to the ground (Down) or level.
        const sinBeta = Math.sin(toRad(beta));
        if (sinBeta > 0.707) {
            el.vertical.textContent = 'Up';
        } else if (sinBeta < -0.707) {
            el.vertical.textContent = 'Down';
        } else {
            el.vertical.textContent = 'Level';
        }

        // Screen direction: the screen normal points to the sky (Up) or to the ground (Down).
        const screenUp = Math.cos(toRad(beta)) * Math.cos(toRad(gamma)) > 0;
        el.screen.textContent = screenUp ? 'Up' : 'Down';
        // iOS 13+ requires an explicit permission request from a user gesture.
        const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function';

        el.permission.hidden = !needsPermission;

        function startListening() {
            if (!listening) {
                window.addEventListener('deviceorientation', onOrientation);
                listening = true;
            }

            el.status.textContent = 'Waiting for sensor data...';

            setTimeout(() => {
                if (!receivedData) {
                    el.status.textContent = 'No sensor data received. Your browser may block sensors on file://; try HTTPS hosting.';
                }
            }, 2000);
        }

        // Must be called directly from a click handler so the browser accepts the request.
        async function requestSensorPermission() {
            if (!needsPermission) return true;

            try {
                const result = await DeviceOrientationEvent.requestPermission();
                if (result === 'granted') {
                    el.permission.hidden = true;
                    return true;
                }
                el.status.textContent = 'Permission denied. Allow motion access in your browser settings and try again.';
                return false;
            } catch (err) {
                el.status.textContent = 'Permission error: ' + err.message;
                return false;
            }
        }

        el.permissionBtn.addEventListener('click', async () => {
            if (await requestSensorPermission()) {
                startListening();
            }
        });

        el.startBtn.addEventListener('click', async () => {
            if (typeof DeviceOrientationEvent === 'undefined') {
                el.status.textContent = 'DeviceOrientation is not supported in this browser.';
                return;
            }

            if (!(await requestSensorPermission())) return;

            startListening(status.textContent = 'No sensor data received. Your browser may block sensors on file://; try HTTPS hosting.';
        }
    }, 2000);
});

el.calibrateBtn.addEventListener('click', () => {
    pendingNorth = true;
    el.status.textContent = 'Setting North on next reading...';
});
}) ();
