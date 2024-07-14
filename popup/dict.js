let SUPPORTED_LANGUAGE = {};
let DEF, THEME, TOTALWORDS;

(async () => {
    let storageItem = await browser.storage.local.get();
    DEF = storageItem.savedDef || {};
    THEME = storageItem.theme;
    TOTALWORDS = storageItem.totalWords;
    SUPPORTED_LANGUAGE = storageItem.supportedLang;
    
    loadtheme();

    if(Object.keys(DEF).length == 0 || !DEF ){
         document.getElementById("main").style.display = "none";
        return document.getElementById("no-word-found").style.display = "block";
    }
    setFilterLang(DEF);
    outputhtml(DEF);
})();

function loadtheme(){
    if(THEME == 'dark' || (THEME == 'system' && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")).matches){
        return document.querySelector('body').id = 'dark';
    }
    return document.querySelector('body').id = 'light';
};

document.getElementById("lang-filter").addEventListener("change", (e)=>{
        return outputhtml(DEF, e.target.value);
})   

document.body.addEventListener("click", (e)=>{
    if(e.target.nodeName == "H4"){
        showMeaning(e.target);
        document.getElementById("mean").style.display = "flex";
    }
    else if(e.target.className == "close-btn" || e.target.id == "mean"){
        document.getElementById("mean").style.display = "none";
    }   
    else if(e.target.className == "audio-btn"){
        e.target.textContent = "fetching..";
        e.target.classList.add("span-playing");

       e.target.parentNode.nextElementSibling.play().then(() =>{
            e.target.textContent = "";
            e.target.className = "audio-btn";
       });
    }
    else if(e.target.className == "remove-btn"){
        deleteWord(e.target.previousElementSibling);
    }
})   


function setFilterLang(obj){
    let options = '<option value="all">All</option>';

    for(let key in obj){
        options += `<option value="${key}">${SUPPORTED_LANGUAGE[key]}</option>`;
    }
    return document.getElementById("lang-filter").innerHTML = options;
}

function addMeaning(obj){
    let li = "";

    for(let key in obj){
        if(key[0] == "m"){
            li += `<li>${obj[key]}</li>`
        }   
    }
    return li;
}

function showMeaning(value){
    let html = `
    <div id="means">
        <div class="means-meta">
            <h4>${value.textContent}<span class="audio-btn"></span></h4>
            <audio src="${DEF[value.className][value.textContent].audioSrc}" preload="none"></audio>
            <span class="type">(${DEF[value.className][value.textContent].type || ''})</span>
        </div>
        <div class="means-li">
            <ul>
                ${addMeaning(DEF[value.className][value.textContent])}
            </ul>
        </div>
        <button class="close-btn" >X</button>
    </div>`;
    return document.getElementById("mean").innerHTML = html;
}

function outputhtml(obj, lang = "all"){
    let html = "";
    
    if (lang == 'all'){
        for (let i in obj){
            for(let j in obj[i]){
                html += `<div class="word">
                <h4 class="${i}">${j}</h4>
                <button class="remove-btn">X</button>
                </div>`;
            }
        }
    }
    else{
        for (let key in obj[lang]){
            html += `<div class="word">
            <h4 class="${lang}">${key}</h4>
            <button class="remove-btn">X</button>
            </div>`;
        }
    }
    return document.getElementById("content").innerHTML = html;
}

function deleteWord(e){
    let lang = e.className;
    let word = e.textContent;
    let totalWords = TOTALWORDS--
    //Delete the word and remove word
    delete DEF[lang][word];
    e.parentNode.remove();

    if(Object.keys(DEF[lang]).length == 0){
        delete DEF[lang];
    }
    return browser.storage.local.set({savedDef:{...DEF}, totalWords: totalWords});
}



async function onStorageChange(e) {
  console.log(e)
    if (e.totalWords.newValue <= e.totalWords.oldValue)
      return;

   return document.getElementById('storage-changed').style.display = 'block';
}
  
browser.storage.onChanged.addListener(onStorageChange);
