"use strict";


const express = require("express");
const app = express();
const fs = require("fs");
var mysql = require('mysql');

const ejs = require('ejs');

//var con = mysql.createConnection({
//    host: "",
//    database: "",
//    user: "",
//    password: "",
//    debug: "false"
//});

//con.connect(function(err) {
//    if (err) throw err;
//    console.log("connected to db");
//});

app.use(express.static('public'));

app.use(express.json());

app.set('views', __dirname);
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');


console.log('web service started');
/**
* get request
*/
app.get('/', function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
    
    res.render('index', function(err, html) {
      res.send(html);
    });
});

app.get('/tasks.css', function(req, res) {
    res.sendFile(__dirname + "/" + "tasks.css");
});

app.get('/tasks.js', function(req, res) {
    res.sendFile(__dirname + "/" + "tasks.js");
});

app.get('/cork-board2.jpg', function(req, res) {
    res.sendFile(__dirname + "/" + "cork-board2.jpg");
});

app.get('/sticky-note.png', function(req, res) {
    res.sendFile(__dirname + "/" + "sticky-note.png");
});

app.listen(3000);

