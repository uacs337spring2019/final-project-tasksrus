(function() {
    
    function addNote() {
        alert("add that note");
    }
    
    window.onload = function() {
        document.getElementById("add").onclick=addNote;
    }
})();