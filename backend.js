// Username and userId setup with promise for readiness
let username, userId;
let userReadyPromise = setupUsernameAndUserId().then(ids => {
    username = ids.username;
    userId = ids.userId;
    // Set up listeners for both leaderboards for real-time updates
    subscribeLeaderboard("daily");
    subscribeLeaderboard("alltime");
});

async function setupUsernameAndUserId() {
    let username = localStorage.getItem("dino_username");
    let userId = localStorage.getItem("dino_userid");

    if (!username) {
        username = await generateUniqueUsername();
        localStorage.setItem("dino_username", username);
    }
    if (!userId) {
        userId = "id" + Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem("dino_userid", userId);
    }

    window.dino_username = username;
    window.dino_userid = userId;
    return { username, userId };
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

// Always update user position after submitting score, regardless of visibility in leaderboard
async function submitScoreAndUpdatePosition(score, mode = "daily") {
    await userReadyPromise;
    const dateKey = mode === "daily" ? getTodayKey() : "all";
    const userRef = firebase.database().ref(`leaderboard/${mode}/${dateKey}/${userId}`);
    userRef.once("value").then(snapshot => {
        const prev = snapshot.val();
        if (!prev || score > prev.score) {
            userRef.set({
                username,
                score,
                ts: Date.now()
            });
        }
    });
}

// Call this function on game over, or whenever you want to check/update high score
async function onGameOver(score) {
    await submitScoreAndUpdatePosition(score, "daily");
    await submitScoreAndUpdatePosition(score, "alltime");
}

// Real-time listeners for both leaderboards
let leaderboardListeners = {};
let latestEntries = { daily: [], alltime: [] };
let currentTab = "daily"; // Track which leaderboard is visible

function subscribeLeaderboard(mode = "daily") {
    const dateKey = mode === "daily" ? getTodayKey() : "all";
    const refPath = `leaderboard/${mode}/${dateKey}`;
    // Remove previous listener if exists
    if (leaderboardListeners[mode]) {
        leaderboardListeners[mode].off();
    }
    const ref = firebase.database().ref(refPath).orderByChild("score").limitToLast(200);
    leaderboardListeners[mode] = ref;
    ref.on("value", snapshot => {
        let entries = [];
        snapshot.forEach(child => {
            const v = child.val();
            entries.push({ ...v, userId: child.key });
        });
        entries.sort((a, b) => b.score - a.score);
        latestEntries[mode] = entries;
        // Only render if this tab is currently visible
        if (mode === currentTab) {
            renderLeaderboard(entries, mode);
            forceUserPositionUpdate(mode);
        }
    });
}

async function renderLeaderboard(entries, mode) {
    await userReadyPromise; // Ensure userId and username are ready

    const contentDiv = document.getElementById(mode === "daily" ? "leaderboard-daily" : "leaderboard-alltime");
    if (!contentDiv) return;
    contentDiv.innerHTML = "";

    entries.forEach((entry, i) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "leaderboard-table-row";
        rowDiv.innerHTML = `
            <div>#${i + 1}</div>
            <div>${entry.username}</div>
            <div>${entry.score}</div>
        `;
        contentDiv.appendChild(rowDiv);
    });
}

function forceUserPositionUpdate(mode) {
    const dateKey = mode === "daily" ? getTodayKey() : "all";
    firebase.database().ref(`leaderboard/${mode}/${dateKey}`)
        .orderByChild("score")
        .once("value", snap => {
            let all = [];
            snap.forEach(child => {
                const v = child.val();
                all.push({ ...v, userId: child.key });
            });
            all.sort((a, b) => b.score - a.score);
            const myIndex = all.findIndex(e => e.userId === userId);
            const positionDiv = document.getElementById("user-position");
            if (!positionDiv) return;
            if (myIndex >= 0) {
                positionDiv.innerHTML = `
                    <span class="left">Your Position</span>
                    <span class="right">#${myIndex + 1}</span>
                `;
                positionDiv.style.display = "flex";
            } else {
                positionDiv.innerHTML = `
                    <span class="left">Your Position</span>
                    <span class="right">N/A</span>
                `;
                positionDiv.style.display = "flex";
            }
        });
}

async function switchTab(mode) {
    await userReadyPromise;
    currentTab = mode;

    document.querySelectorAll(".leaderboard-tab").forEach(btn => btn.classList.remove("active"));
    const tabBtn = document.querySelector(`.leaderboard-tab[onclick="switchTab('${mode}')"]`);
    if (tabBtn) tabBtn.classList.add("active");

    document.getElementById("leaderboard-daily").style.display = mode === "daily" ? "block" : "none";
    document.getElementById("leaderboard-alltime").style.display = mode === "alltime" ? "block" : "none";

    // (Re)subscribe to the active tab for real-time updates and force render
    subscribeLeaderboard(mode);
    // Render immediately with the latest entries (in case the listener hasn't fired yet)
    renderLeaderboard(latestEntries[mode] || [], mode);
    forceUserPositionUpdate(mode);
}