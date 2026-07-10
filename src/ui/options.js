const serverUrl=document.getElementById("serverUrl");

const password=document.getElementById("password");

const saveButton=document.getElementById("saveButton");

const status=document.getElementById("status");

load();

saveButton.addEventListener("click",save);

async function load(){

    const data=await chrome.storage.local.get([
        "serverUrl",
        "password"
    ]);

    serverUrl.value=data.serverUrl||"";

    password.value=data.password||"";

}

async function save(){

    await chrome.storage.local.set({

        serverUrl:serverUrl.value,

        password:password.value

    });

    status.textContent="✔ Settings saved";

    setTimeout(()=>{

        status.textContent="";

    },2000);

}