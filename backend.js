"use strict";
/*
* author: Erica Cohen
* date: 04/21/19
* class: CSC337 Spring 2019
* backend.js - for final project, handles notes/tasks being added/removed from db (heroku),
* as well as serving of static files
*/

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

/*
* found this function on the internet, to help with heroku cleardb disconnecting us
*/
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
* get request, serves static index.html
*/
app.get('/', function (req, res) {
    res.render('index', function(err, html) {
      res.send(html);
    });
});

/*
* get all the notes from the db
*/
app.get('/notes', function (req, res) {
    con.query("SELECT * from notes;", function(err, result, fields) {
        if(err) console.log(err);
        res.send(result);
    });
});

/*
* get endpoint to get tasks for a note
*/
app.get('/tasks', function (req, res) {
    //return the tasks for a given noteId
    con.query("SELECT name, completed from tasks where note_id = ? order by idx asc", 
              [req.query.noteId], function(err, result, fields) {
        if(err) console.log(err);
        res.send(result);
    });
})

/*
* save the tasks and return the note object
*/
function updateNoteTasks(res, noteId, name, tasks) {
    //we will blanket delete any tasks for the note to handle deleted items/reordering
    con.query("DELETE FROM tasks where note_id = ?", [noteId], function(err, result, fields) {
        if(err) {
            //error so rollback
            con.rollback(function() {
                throw err;
          });
        } 
        else if(tasks.length === 0) {
            //if we have no tasks, no need to insert we can just return
            con.commit(function(err) {
                if (err) { 
                  con.rollback(function() {
                    throw err;
                  });
                }
                console.log('Transaction Complete. No tasks.');
                //return note object
                res.send({
                    note_id: noteId,
                    name: name
                });
              });
        }
        else {
            //need to build our value object
            let values = [];
            for(let i = 0; i < tasks.length; i++) {
                let row = [];
                //make an array in the order of the columns we are inserting in
                row.push(noteId);
                row.push(tasks[i].idx);
                row.push(tasks[i].name);
                row.push(tasks[i].completed);
                values.push(row);
            }
            //insert all the tasks
            con.query("INSERT INTO tasks (note_id, idx, name, completed) VALUES ?", [values], 
                      function(err, result, fields) {
                if(err) {
                    //error so rollback
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
                        //return note object
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

/*
* save a new note, save the tasks, return the note object after save
*/
function saveNewNote(res, name, tasks) {
    con.query("INSERT INTO notes (name) VALUES (?)", [name], 
              function(err, result, fields) {
        if(err) {
            //error so rollback
            con.rollback(function() {
                throw err;
          });
        } else {
            //get the noteId of the newly saved object
            let noteId = result.insertId;
            //save the tasks
            updateNoteTasks(res, noteId, name, tasks);
        }
    });
}

/*
* updates an existing note to the provided name, saves the tasks, 
* and returns the note object after save
*/
function updateNote(res, noteId, name, tasks) {
    con.query("UPDATE notes set name = ? where note_id = ?", [name, noteId], 
              function(err, result, fields) {
        if(err) {
            //error so rollback
            con.rollback(function() {
                throw err;
          });
        } else {
            //now save the tasks
            updateNoteTasks(res, noteId, name, tasks);
        }
    });   
}

/*
* post endpoint for saving a note
*/
app.post('/save', function(req, res) {
    //we care about the noteId, its name, and the post body
    let noteId = req.query.noteId;
    let name = req.query.name;
    let body = req.body;

    //open a transaction
    con.beginTransaction(function(err) {
        if (err) { throw err; }
        //negative note Id means we are a new note
        if(noteId < 0) {
            saveNewNote(res, name, body);
        } else {
            updateNote(res, noteId, name, body);
        }
    });
});

/*
* delete the note with the given id and respond that it was deleted
*/
function deleteNote(res, noteId) {
    //first we delete from tasks since it has a foreign dep on notes
    con.query("DELETE FROM tasks where note_id = ?", [noteId], function(err, result, fields) {
        if(err) {
            //error so rollback
            con.rollback(function() {
                throw err;
          });
        } else {
            //finally we can delete from notes table
            con.query("DELETE FROM notes where note_id = ?", [noteId], 
                      function(err, result, fields) {
                if(err) {
                    //error so rollback
                    con.rollback(function() {
                        throw err;
                  });
                } else {
                    //both deletes succeeded so commit
                    con.commit(function(err) {
                        if (err) { 
                            //error so rollback
                          con.rollback(function() {
                            throw err;
                          });
                        }
                        console.log('Delete Transaction Complete.');
                        //respond with the noteId we deleted
                        res.send({
                            note_id: noteId
                        });
                      });
                }
            });
        }
    });
}

/*
* delete endpoint for deleting a note
*/
app.delete('/', function(req, res) {
    //open a transaction
    con.beginTransaction(function(err) {
        if (err) { throw err; }
        deleteNote(res, req.query.noteId);
    });
});

/*
* serve static tasks css
*/
app.get('/tasks.css', function(req, res) {
    res.sendFile(__dirname + "/" + "tasks.css");
});

/*
* serve static tasks js
*/
app.get('/tasks.js', function(req, res) {
    res.sendFile(__dirname + "/" + "tasks.js");
});

/*
* serve static cork board jpg
*/
app.get('/cork-board2.jpg', function(req, res) {
    res.sendFile(__dirname + "/" + "cork-board2.jpg");
});

/*
* serve static sticky note png
*/
app.get('/sticky-note.png', function(req, res) {
    res.sendFile(__dirname + "/" + "sticky-note.png");
});

app.listen(process.env.PORT);

