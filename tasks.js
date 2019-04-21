
/*
* author: Erica Cohen
* date: 04/21/19
* class: CSC337 Spring 2019
* tasks.js - for final project, front end code
*/
(function() {
    "use strict";
    /**
    * popup the window with a new note (-1 id, no name, no tasks)
    */
    function addNote() {
        showPopup(-1, "", []);
    }
    
    /**
    * load the tasks for the note and then show the popup
    */
    function showNote() {
        let noteId = this.getAttribute('note-id');
        let name = this.querySelector("span").innerText;
        fetch("/tasks?noteId=" + noteId, {
          method: 'GET'
        }).then(res => res.json())
        .then(resData => {
            showPopup(noteId, name, resData);
        });
    }
    
    /**
    * load all the notes and put on the page
    */
    function loadNotes() {
        fetch("/notes", {
          method: 'GET'
        }).then(res => res.json())
        .then(resData => {
            for(let i = 0; i <resData.length; i++) {
                addNoteToBoard(resData[i]);
            }
        });
    }
    
    /**
    * add a note the the board based on the data provided (note_id, name)
    * @param {object} noteData - the noteData of the note to add to the board
    */
    function addNoteToBoard(noteData) {
        let notes = document.getElementById("notes");
        let snote = document.createElement("span");
        snote.classList = "sticky-note";
        snote.setAttribute('note-id', noteData['note_id']);
        snote.innerHTML = "<span>" + noteData.name + "</span>";

        snote.onclick = showNote;
        notes.appendChild(snote);
    }
    
    /**
    * insert a new task and all its event handlers based on the name/completed
    * @param {string} name - the name of the task
    * @param {number} completed - 0/1 is completed
    */
    function insertTask(name, completed) {
        let compTasks = document.getElementById("completed");
        let todoTasks = document.getElementById("todo");
        
        let task = document.createElement("li");
        task.innerHTML = "<span>" + name + "</span>";
        //trash can icon
        let del = document.createElement("span");
        del.innerHTML = "<i class=\"fa fa-trash\"></i>";
        del.onclick = function() {
            //grandparent (ul) should remove parent (li)
            this.parentNode.parentNode.removeChild(this.parentNode);
        };
        let check = document.createElement("input");
        check.setAttribute("type","checkbox");
        check.onchange = function(){
            //when checked/unchecked, we need to switch from todo/completed
            let btask= this.parentNode;
            btask.parentNode.removeChild(btask);
            if(this.checked === true){
                compTasks.appendChild(btask);
            }
            else{
                todoTasks.appendChild(btask);
            }
        };
        task.prepend(check);
        task.appendChild(del);
        //add to proper list based on original completed value
        if(completed === 1) {
            compTasks.appendChild(task);
            check.checked=true;
        } else {
           todoTasks.appendChild(task);
        }
    }
    
    /**
    * add the proper html to the popup given the note information
    * @param {number} noteId - the noteID
    * @param {string} name - the name of the note
    * @param {array} tasks - the array of tasks
    */
    function showPopup(noteId, name, tasks) {
        let content = document.getElementById("popupcontent");
        content.setAttribute('note-id', noteId);
        document.getElementById("name").value = name;
        
        //add tasks
        let todoTasks = document.getElementById("todo");
        let compTasks = document.getElementById("completed");
        
        //clear out any existing values
        document.getElementById("newtask").value = "";
        todoTasks.innerHTML = "";
        compTasks.innerHTML = "";
        
        for(let i = 0; i < tasks.length; i++) {
            //add all the tasks to the popup
            insertTask(tasks[i].name, tasks[i].completed);
        }
        
        //finally show it
        let popup = document.getElementById("popup");
        popup.style["display"] = "block";
    }
    
    /**
    * add a new task to the popup based on the task name
    */
    function addNewTask() {
        let task = document.getElementById("newtask");
        let taskName = task.value;
        task.value = "";
        insertTask(taskName, 0);
    }
    
    /**
    * hide the popup (closed/saved/deleted)
    */
    function hidePopup() {
        let popup = document.getElementById("popup");
        popup.style["display"] = "none";
    }
    
    /**
    * make a request to the backend to save the note
    */
    function saveNote() {
        let noteId = parseInt(document.getElementById("popupcontent").getAttribute("note-id"));
        
        let body = [];
        let idx = 0;
        let todoTasks = document.getElementById("todo");
        let compTasks = document.getElementById("completed");
        
        //want to add our tasks in the order todo -> completed
        for(let i = 0; i < todoTasks.childNodes.length; i++) {
            body.push({
                idx: idx++,
                name: todoTasks.childNodes[i].childNodes[1].innerText,
                completed: 0
            });
        }
        
        for(let i = 0; i < compTasks.childNodes.length; i++) {
            body.push({
                idx: idx++,
                name: compTasks.childNodes[i].childNodes[1].innerText,
                completed: 1
            });
        }
        
        let name = document.getElementById("name").value;
        fetch("/save?noteId=" + noteId + "&name=" + name, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json"
          }
        }).then(res => res.json())
        .then(resData => {
            if(noteId < 0) {
                //new note
                addNoteToBoard(resData);
            }
            hidePopup();
        });
    }
    
    /**
    * call to the backend to delete the note
    */
    function deleteNote() {
        let noteId = parseInt(document.getElementById("popupcontent").getAttribute("note-id"));
        fetch("/?noteId=" + noteId, {
          method: 'DELETE'
        }).then(res => res.json())
        .then(resData => {
            if(noteId === parseInt(resData['note_id'])) {
                //remove the note from the board
                let toDel = document.querySelector(".sticky-note[note-id='" + noteId + "']");
                toDel.parentNode.removeChild(toDel);
            }
            hidePopup();
        });
    }
    
    /**
    * setup event listeners
    */
    window.onload = function() {
        hidePopup();
        document.getElementById("add").onclick=addNote;
        
        document.getElementById("close").onclick=hidePopup;
        
        document.getElementById("save").onclick=saveNote;
        document.getElementById("delete").onclick=deleteNote;
        document.getElementById("addtask").onclick=addNewTask;
        loadNotes();
    };
})();