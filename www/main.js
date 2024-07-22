// Get query params
const urlParams = new URLSearchParams(window.location.search);
const activityId = urlParams.get('activityId');
// Pages
const createActivity = document.getElementById('create_activity');
const activityTeams = document.getElementById('activity_teams');
if (activityId) {
    createActivity.style.display = 'none';
    activityTeams.style.display = 'block';
    const activityTeamsList = document.getElementById('teams');
    function updateUI() {
        const taken = parseInt(localStorage.getItem('taken-' + activityId));
        fetch(`/activities/${activityId}`)
            .then(res => res.json())
            .then(data => {
                activityTeamsList.innerHTML = '';
                const teams = data.teams;
                teams.map(team => {
                    const li = document.createElement('li');
                    const button = document.createElement('button');
                    li.appendChild(button);
                    activityTeamsList.appendChild(li);
                    if (taken !== team.id && (team.taken || !Number.isNaN(taken))) {
                        button.textContent = `View ${team.name}`;
                        button.addEventListener('click', () => {
                            location.href = team.showURL;
                        })
                        return
                    }
                    if (taken === team.id) {
                        button.textContent = `Edit ${team.name}`;
                        button.addEventListener('click', () => {
                            location.href = team.editURL;
                        })
                    } else {
                        button.textContent = `Take ${team.name}`;
                        button.addEventListener('click', async () => {
                            localStorage.setItem('taken-' + activityId, team.id);
                            const result = await fetch("/take_team", {
                                method: "POST",
                                body: JSON.stringify({ activityId, id: team.id }),
                                headers: {
                                    "Content-Type": "application/json",
                                },
                            });
                            if (result.status !== 200) {
                                return;
                            }
                            location.href = team.editURL;
                        })
                    }
                })
            })
    }
    updateUI();
    setInterval(updateUI, 1000);
} else {
    createActivity.style.display = 'block';
    activityTeams.style.display = 'none';
}
// create page
const createActivityInput = document.getElementById('urls');
const createActivityButton = document.getElementById('create_activity_button');
createActivityButton.addEventListener('click', async () => {
    const urls = createActivityInput.value;
    const lines = urls.split('\n');
    let activityName;
    const teams = lines.map(line => {
        const parts = line.split("\t");
        const otherParts = parts[1].split(": ")[1].split(" for ");
        activityName = otherParts[0];
        return {
            id: parts[0].split('/').pop(),
            editURL: parts[0].replace("show", "edit"),
            showURL: parts[0].replace("edit", "show"),
            name: otherParts[1],
        }
    })
    const id = await (await fetch("http://localhost:8080/activities", {
        method: "POST",
        body: JSON.stringify({ teams, activityName }),
        headers: {
            "Content-Type": "application/json",
        },
    })).text();
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('activityId', id);
    document.getElementById("activityURL").textContent = url.toString();
})