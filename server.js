//const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const port = 10000;
const path = require('path');
const sqlite3 = require('sqlite3');

// ------------------------------------

const app = express();

const db = new sqlite3.Database('./db.sqlite3');

// ------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', './views');

app.use(cors());
app.use(express.static(path.join(__dirname, '../public/')));

// ------------------------------------

function isImageUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const tumblrRegex = /^(https?:\/\/)?(www\.)?(.*\.tumblr\.com\/.*\/(.*\.(jpg|jpeg|png|gif)))$/;
    return youtubeRegex.test(url) || tumblrRegex.test(url);
}

var Youtube = (function () {
    'use strict';

    var video, results;

    var getThumb = function (url, size) {
        if (url === null) {
            return '';
        }
        size    = (size === null) ? 'big' : size;
        results = url.match('[\\?&]v=([^&#]*)');
        video   = (results === null) ? url : results[1];

        if (size === 'small') {
            return 'http://img.youtube.com/vi/' + video + '/2.jpg';
        }
        return 'http://img.youtube.com/vi/' + video + '/0.jpg';
    };

    return {
        thumb: getThumb
    };
}());

function getYouTubeVideoId(url) {
    if (typeof url !== 'string') {
        throw new Error("URL must be a string");
    }
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// ------------------------------------

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})

app.post('/upload', (req, res) => {
    try {
        const data = req.body;
        if (isImageUrl(data.url)) {
            db.run(`INSERT INTO thumbnail VALUES ("${data.title}", "${data.url}", ${data.likes}, ${data.dislikes});`);
            res.send(`<p>Data received: ${JSON.stringify(data)}</p>`);
        } else {
            console.log("Error code 2");
        }

    } catch (error) {
        console.log(`Error code 1: ${error}`);
    }
})

app.get('/rank', (req, res) => {

    try {
        db.get("SELECT url FROM thumbnail LIMIT 1;", (err, row) => {
            if (err) {
                console.error(err);
                res.status(500).send("Database error");
                return;
            }

            const url = row.url; // The actual URL value from the database row
            console.log(url); // Check the URL
            const urlid = getYouTubeVideoId(url); // Extract the YouTube ID
            console.log(urlid); // Check the YouTube ID

            res.render('rank.html', { url, urlid }); // Pass to the template
        });
    } catch (err) {
        console.log(`Error code 1: ${err}`);
    }
})

app.get('/upload', (req, res) => {
    res.render('upload.html');
})

app.post('/rank/like', (req, res) => {
    const data = req.body;
    console.log("About to like");
    console.log(data);
    db.run(`UPDATE thumbnail SET likes = likes + 1 WHERE url LIKE "%${getYouTubeVideoId(data.url.toString())}%";`);
    console.log("Liked");
})

app.post('/rank/dislike', (req, res) => {
    const data = req.body;
    console.log("About to like");
    db.run(`UPDATE thumbnail SET dislikes = dislikes+ 1 WHERE url = "${data.url}";`);
    console.log("Liked");
})

// ------------------------------------

app.listen(port, () => { console.log(`App listening on port ${port}.`) })
