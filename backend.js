"use strict";


const express = require("express");
const app = express();
var mysql = require('mysql');

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


console.log('web service started');
/**
* get request
*/
app.get('/', function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
    
    res.send({});
});

app.listen(3000);

