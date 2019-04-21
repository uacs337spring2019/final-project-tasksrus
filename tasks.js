(function() {
    
    function addNote() {
        showPopup(-1, "", []);
    }
    
    function showNote() {
        let noteId = this.getAttribute('note-id');
        let name = this.querySelector("h4").innerText;
        fetch("http://localhost:3000/tasks?noteId=" + noteId, {
          method: 'GET'
        }).then(res => res.json())
        .then(resData => {
            showPopup(noteId, name, resData);
        });
    }
    
    function loadNotes() {
        fetch("http://localhost:3000/notes", {
          method: 'GET'
        }).then(res => res.json())
        .then(resData => {
            for(let i = 0; i <resData.length; i++) {
                addNoteToBoard(resData[i]);
            }
        });
    }
    
    function addNoteToBoard(noteData) {
        let notes = document.getElementById("notes");
        let snote = document.createElement("span");
        snote.classList = "sticky-note";
        snote.setAttribute('note-id', noteData['note_id']);
        snote.innerHTML = "<h4>" + noteData.name + "</h4>";

        snote.onclick = showNote;
        notes.appendChild(snote);
    }
    
    function insertTask(name, completed) {
        let task = document.createElement("li");
        task.innerHTML = "<span>" + name + "</span>";
        let del = document.createElement("span");
        del.innerHTML = "del";
        del.onclick = function() {
            //grandparent (ul) should remove parent (li)
            this.parentNode.parentNode.removeChild(this.parentNode);
        }
        let check = document.createElement("input");
        check.setAttribute("type","checkbox");
        check.onchange = function(){
            let btask= this.parentNode;
            btask.parentNode.removeChild(btask);
            if(this.checked === true){
                compTasks.appendChild(btask);
            }
            else{
                todoTasks.appendChild(btask);
            }
        }
        task.prepend(check);
        task.appendChild(del);
        if(completed === 1) {
            document.getElementById("completed").appendChild(task);
            check.checked=true;
        } else {
            document.getElementById("todo").appendChild(task);
        }
    }
    
    function showPopup(noteId, name, tasks) {
        console.log("SHOW", noteId);
        let content = document.getElementById("popupcontent");
        content.setAttribute('note-id', noteId);
        document.getElementById("name").value = name;
        
        //add tasks
        let todoTasks = document.getElementById("todo");
        let compTasks = document.getElementById("completed");
        
        todoTasks.innerHTML = "";
        compTasks.innerHTML = "";
        
        for(let i = 0; i < tasks.length; i++) {
            insertTask(tasks[i].name, tasks[i].completed);
        }
        
        //finally show it
        let popup = document.getElementById("popup");
        popup.style["display"] = "block";
    }
    
    function addNewTask() {
        let task = document.getElementById("newtask");
        let taskName = task.value;
        task.value = "";
        insertTask(taskName, 0);
    }
    
    function hidePopup() {
        let popup = document.getElementById("popup");
        popup.style["display"] = "none";
    }
    
    function saveNote() {
        let noteId = parseInt(document.getElementById("popupcontent").getAttribute("note-id"));
        
        let body = [];
        let idx = 0;
        let todoTasks = document.getElementById("todo");
        let compTasks = document.getElementById("completed");
        
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
        fetch("http://localhost:3000/save?noteId=" + noteId + "&name=" + name, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            // "Content-Type": "application/x-www-form-urlencoded",
          }
        }).then(res => res.json())
        .then(resData => {
            console.log(resData);
            if(noteId < 0) {
                //new note
                addNoteToBoard(resData);
            }
            hidePopup()
        });
        console.log("SAVE", noteId, body);
    }
    
    function deleteNote() {
        let noteId = parseInt(document.getElementById("popupcontent").getAttribute("note-id"));
        fetch("http://localhost:3000/?noteId=" + noteId, {
          method: 'DELETE'
        }).then(res => res.json())
        .then(resData => {
            console.log(resData);
            if(noteId === parseInt(resData['note_id'])) {
                let toDel = document.querySelector(".sticky-note[note-id='" + noteId + "']");
                toDel.parentNode.removeChild(toDel);
            }
            hidePopup()
        });
    }
    
    window.onload = function() {
        document.getElementById("add").onclick=addNote;
        
        document.getElementById("close").onclick=hidePopup;
        
        document.getElementById("save").onclick=saveNote;
        document.getElementById("delete").onclick=deleteNote;
        document.getElementById("addtask").onclick=addNewTask;
        loadNotes();
        hidePopup();
    }
})();