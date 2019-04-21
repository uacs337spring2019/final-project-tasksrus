"use strict";


const express = require("express");
const app = express();
const fs = require("fs");
var mysql = require('mysql');

const ejs = require('ejs');

var con;

app.use(express.static(__dirname));

app.use(express.json());

app.set('views', __dirname);
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');


console.log('web service started');

function handleDisconnect() {
  con = mysql.createConnection(process.env.CLEARDB_DATABASE_URL); // Recreate the connection, since
                                                  // the old one cannot be reused.

  con.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  con.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect(); //create original connection

/**
* get request
*/
app.get('/', function (req, res) {
	res.header("Access-Control-Allow-Origin", "*");
    
    res.render('index', function(err, html) {
      res.send(html);
    });
});

app.get('/notes', function (req, res) {
    con.query("SELECT * from notes;", function(err, result, fields) {
        if(err) console.log(err);
        res.send(result);
    });
});

app.get('/tasks', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    con.query("SELECT name, completed from tasks where note_id = ? order by idx asc", [req.query.noteId], function(err, result, fields) {
        if(err) console.log(err);
        res.send(result);
    });
})

function updateNoteTasks(res, noteId, name, tasks) {
    con.query("DELETE FROM tasks where note_id = ?", [noteId], function(err, result, fields) {
        if(err) {
            con.rollback(function() {
                throw err;
          });
        } 
        else if(tasks.length === 0) {
            con.commit(function(err) {
                if (err) { 
                  con.rollback(function() {
                    throw err;
                  });
                }
                console.log('Transaction Complete. No tasks.');
                res.send({
                    note_id: noteId,
                    name: name
                });
              });
        }
        else {
            let values = [];
            for(let i = 0; i < tasks.length; i++) {
                let row = [];
                row.push(noteId);
                row.push(tasks[i].idx);
                row.push(tasks[i].name);
                row.push(tasks[i].completed);
                values.push(row);
            }
            con.query("INSERT INTO tasks (note_id, idx, name, completed) VALUES ?", [values], function(err, result, fields) {
                if(err) {
                    con.rollback(function() {
                        throw err;
                  });
                } else {
                    con.commit(function(err) {
                        if (err) { 
                          con.rollback(function() {
                            throw err;
                          });
                        }
                        console.log('Transaction Complete.');
                        res.send({
                            note_id: noteId,
                            name: name
                        });
                      });
                }
            });
        }
    });
    
}

function saveNewNote(res, name, tasks) {
    con.query("INSERT INTO notes (name) VALUES (?)", [name], function(err, result, fields) {
        if(err) {
            con.rollback(function() {
                throw err;
          });
        } else {
            let noteId = result.insertId;
            updateNoteTasks(res, noteId, name, tasks);
        }
    });
}
              
function updateNote(res, noteId, name, tasks) {
    con.query("UPDATE notes set name = ? where note_id = ?", [name, noteId], function(err, result, fields) {
        if(err) {
            con.rollback(function() {
                throw err;
          });
        } else {
            updateNoteTasks(res, noteId, name, tasks);
        }
    });   
}

app.post('/save', function(req, res) {
    let noteId = req.query.noteId;
    let name = req.query.name;
    let body = req.body;

    con.beginTransaction(function(err) {
        if (err) { throw err; }
        if(noteId < 0) {
            saveNewNote(res, name, body);
        } else {
            updateNote(res, noteId, name, body);
        }
    });
});


function deleteNote(res, noteId) {
    con.query("DELETE FROM tasks where note_id = ?", [noteId], function(err, result, fields) {
        if(err) {
            con.rollback(function() {
                throw err;
          });
        } else {
            con.query("DELETE FROM notes where note_id = ?", [noteId], function(err, result, fields) {
                if(err) {
                    con.rollback(function() {
                        throw err;
                  });
                } else {
                    con.commit(function(err) {
                        if (err) { 
                          con.rollback(function() {
                            throw err;
                          });
                        }
                        console.log('Delete Transaction Complete.');
                        res.send({
                            note_id: noteId
                        });
                      });
                }
            });
        }
    });
}

app.delete('/', function(req, res) {
    con.beginTransaction(function(err) {
        if (err) { throw err; }
        deleteNote(res, req.query.noteId);
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

//app.listen(process.env.PORT);
app.listen(process.env.PORT);

