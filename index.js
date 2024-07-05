// use express to serve the www static files
const express = require('express');
const app = express();
app.use(express.static('www'));
app.listen(8080);
app.use(express.json())
const { v4: uuidv4 } = require('uuid');

const sqlite3 = require('sqlite3').verbose();

// Create a new database file (or open it if it already exists)
const db = new sqlite3.Database('activities.db');
const statements = {};
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, activity_name TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY AUTOINCREMENT, activity_id TEXT, team_id TEXT, edit_url TEXT, show_url TEXT, name TEXT, taken BOOLEAN DEFAULT 0)");

    // Insert some data
    statements.createActivity = db.prepare("INSERT INTO activities (id, activity_name) VALUES (?, ?)");
    statements.addTeam = db.prepare("INSERT INTO teams (activity_id, team_id, edit_url, show_url, name) VALUES (?, ?, ?, ?, ?)");
    statements.takeTeam = db.prepare("UPDATE teams SET taken=? where activity_id = ? and id = ? and taken = 0");
    statements.getActivity = db.prepare("SELECT * FROM activities WHERE id = ?");
    statements.getTeams = db.prepare("SELECT * FROM teams WHERE activity_id = ?");
});
// Handle create activity endpoint
app.post('/activities', (req, res) => {
    const { teams, activityName } = req.body;
    console.log({ teams, activityName });
    const activityId = uuidv4();
    statements.createActivity.run(activityId, activityName);
    for (const team of teams) {
        statements.addTeam.run(activityId, team.id, team.editURL, team.showURL, team.name);
    }
    res.send(activityId);
})

app.post('/take_team', async (req, res) => {
    const { activityId, id } = req.body;
    const changes = await new Promise((resolve, reject) => {
        statements.takeTeam.run(1, activityId, id, function (err) {
            if (err) reject(err);
            resolve(this.changes);
        });
    })
    if (changes == 0) {
        res.status(400).send("not updated");
        return
    }
    res.send("ok");
})

app.get('/activities/:activityId', async (req, res) => {
    const { activityId } = req.params;
    const activityPromise = new Promise((resolve, reject) => {
        statements.getActivity.get(activityId, (err, row) => {
            resolve(row);
        });
    })
    const teamsPromise = new Promise((resolve, reject) => {
        statements.getTeams.all(activityId, (err, rows) => {
            resolve(rows);
        });
    })
    const [activity, teams] = await Promise.all([activityPromise, teamsPromise])
    res.send({
        activity: activity.activity_name, teams: teams.map(team => ({
            id: team.id,
            editURL: team.edit_url,
            showURL: team.show_url,
            name: team.name,
            taken: team.taken,
        }))
    });
})
