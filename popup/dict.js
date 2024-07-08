const langKey = {"en":"English", "fr":"French", "de":"German", "es":"Spanish", "hi":"Hindi"};
let DEF = [],
THEME;

(async () => {
    let storageItem = await browser.storage.local.get();
    DEF = storageItem.definitions || [];

    if(DEF.length == 0){
         document.getElementById("main").style.display = "none";
        return document.getElementById("no-word-found").style.display = "block";
    }

    setFilterLang(DEF);
    outputhtml(DEF);
})();
(async ()=>{
    let storageItem = await browser.storage.local.get();
    THEME = storageItem.theme;
    if(THEME == 'dark' || (THEME == 'system' && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")).matches){
        return document.querySelector('body').id = 'dark';
    }
    return document.querySelector('body').id = 'light';
})();

document.getElementById("lang-filter").addEventListener("change", (e)=>{
    if(e.target.value == "all"){
        return outputhtml(DEF);
    }
    searchword(e.target.value);
})   

document.body.addEventListener("click", (e)=>{
    if(e.target.className == "word"){
        showMeaning(e.target.getAttribute("index"));
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
})   

const searchword =  lang => {
        let matches = DEF.filter(word => {
            const regex = new RegExp(`${lang}`, 'gi');
            return word.lang.match(regex);
        });
        outputhtml(matches); 
}

function setFilterLang(obj){
    let lang = {all:"All"},
        options;
    for(let key in obj){
        lang[obj[key].lang] = langKey[obj[key].lang];
    }
    for(let key in lang){
        options += `<option value="${key}">${lang[key]}</option>`;
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
        <h4>${DEF[value].word}<span class="audio-btn"></span></h4>
        <audio src="${DEF[value].audioSrc}" preload="none"></audio>
        <ul>
            ${addMeaning(DEF[value])}
        </ul>
        <button class="close-btn" >X</button>
    </div>`;
    return document.getElementById("mean").innerHTML = html;
}

function outputhtml(matches){
    let html;
    if(matches.length > 0){
        html = matches.map((match, index) => `
                <h4 class="word" index="${index}">${match.word}</h4>
        `).join('');
    }
    return document.getElementById("content").innerHTML = html;
}
