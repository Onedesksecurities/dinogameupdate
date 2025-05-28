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

function submitScoreIfBetter(score, mode = "daily") {
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

function onGameOver(score) {
    submitScoreIfBetter(score, "daily");
    submitScoreIfBetter(score, "alltime");
}

let leaderboardListeners = {};
const FETCH_INTERVAL = 30000; 
let lastRenderTime = { daily: 0, alltime: 0 };
let latestEntries = { daily: [], alltime: [] };

function fetchLeaderboard(mode = "daily") {
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
        if (now - lastRenderTime[mode] > FETCH_INTERVAL || !lastRenderTime[mode]) {
            renderLeaderboard(entries, mode);
            lastRenderTime[mode] = now;
        }
    });
}

function renderLeaderboard(entries, mode) {
    const contentDiv = document.getElementById(mode === "daily" ? "leaderboard-daily" : "leaderboard-alltime");
    contentDiv.innerHTML = "";

    let foundUser = false;
    entries.forEach((entry, i) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "leaderboard-table-row";

        if (entry.userId === userId) {
            rowDiv.classList.add("leaderboard-table-row-own");
            foundUser = true;
            updateUserPosition(i + 1);  // Show user rank
        }

        rowDiv.innerHTML = `
            <div>${i + 1}</div>
            <div>${entry.username}</div>
            <div>${entry.score}</div>
        `;
        contentDiv.appendChild(rowDiv);
    });

    if (!foundUser) {
        lookupAndShowUserRank(mode);
    } else {
        document.getElementById("user-position").style.display = "block";
    }
}

function updateUserPosition(rank) {
    const positionDiv = document.getElementById("user-position");
    positionDiv.textContent = `Your Position is #${rank}`;
    positionDiv.style.display = "block";
}

function lookupAndShowUserRank(mode) {
    const dateKey = mode === "daily" ? getTodayKey() : "all";
    firebase.database().ref(`leaderboard/${mode}/${dateKey}`).once("value", snap => {
        let all = [];
        snap.forEach(child => {
            const v = child.val();
            all.push({ ...v, userId: child.key });
        });
        all.sort((a, b) => b.score - a.score);
        const myIndex = all.findIndex(e => e.userId === userId);
        if (myIndex >= 0) {
            updateUserPosition(myIndex + 1);
        } else {
            document.getElementById("user-position").style.display = "none";
        }
    });
}

function switchTab(mode) {
    document.querySelectorAll(".leaderboard-tab").forEach(btn => btn.classList.remove("active"));
    document.querySelector(`.leaderboard-tab[onclick="switchTab('${mode}')"]`).classList.add("active");

    document.getElementById("leaderboard-daily").style.display = mode === "daily" ? "block" : "none";
    document.getElementById("leaderboard-alltime").style.display = mode === "alltime" ? "block" : "none";

    renderLeaderboard(latestEntries[mode] || [], mode);
}

// Initial setup
let username, userId;
setupUsernameAndUserId().then(ids => {
    username = ids.username;
    userId = ids.userId;
    fetchLeaderboard("daily");
    fetchLeaderboard("alltime");
});
