// Username and userId setup with promise for readiness
let username, userId;
let userReadyPromise = setupUsernameAndUserId().then(ids => {
    username = ids.username;
    userId = ids.userId;
    fetchLeaderboard("daily");
    fetchLeaderboard("alltime");
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
            }).then(() => {
                // After updating, re-fetch and update leaderboard & position
                fetchLeaderboard(mode, true); // force immediate re-render
                forceUserPositionUpdate(mode);
            });
        } else {
            // Even if not updated, ensure position is shown
            forceUserPositionUpdate(mode);
        }
    });
}

// Call this function on game over, or whenever you want to check/update high score
async function onGameOver(score) {
    await submitScoreAndUpdatePosition(score, "daily");
    await submitScoreAndUpdatePosition(score, "alltime");
}

let leaderboardListeners = {};
const FETCH_INTERVAL = 30000; 
let lastRenderTime = { daily: 0, alltime: 0 };
let latestEntries = { daily: [], alltime: [] };

// Add `forceRender` to always rerender when needed
function fetchLeaderboard(mode = "daily", forceRender = false) {
    const dateKey = mode === "daily" ? getTodayKey() : "all";
    const refPath = `leaderboard/${mode}/${dateKey}`;
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
        const now = Date.now();
        if (forceRender || now - lastRenderTime[mode] > FETCH_INTERVAL || !lastRenderTime[mode]) {
            renderLeaderboard(entries, mode);
            lastRenderTime[mode] = now;
        }
    });
}

async function renderLeaderboard(entries, mode) {
    await userReadyPromise; // Ensure userId and username are ready

    const contentDiv = document.getElementById(mode === "daily" ? "leaderboard-daily" : "leaderboard-alltime");
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

    // Always update user's position text, even if not in top entries
    forceUserPositionUpdate(mode);
}

// Always updates "Your Position" text, even if user is not in leaderboard
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
            if (myIndex >= 0) {
                positionDiv.style.display = "block";
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
                positionDiv.style.display = "none"; // Hide if not in leaderboard
            }
        });
}

async function switchTab(mode) {
    await userReadyPromise;
    document.querySelectorAll(".leaderboard-tab").forEach(btn => btn.classList.remove("active"));
    document.querySelector(`.leaderboard-tab[onclick="switchTab('${mode}')"]`).classList.add("active");

    document.getElementById("leaderboard-daily").style.display = mode === "daily" ? "block" : "none";
    document.getElementById("leaderboard-alltime").style.display = mode === "alltime" ? "block" : "none";

    renderLeaderboard(latestEntries[mode] || [], mode);
    forceUserPositionUpdate(mode);
}