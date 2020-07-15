const electron = require("electron");
const url = require("url");
const path = require("path");
const {
    exec
} = require("child_process");
const {
    stderr,
    cpuUsage
} = require("process");

const {
    app,
    BrowserWindow,
    Menu,
    ipcMain
} = electron;

const fs = require("fs-extra");
const {
    globalAgent
} = require("http");
const {
    ipcRenderer
} = require("electron");

const opn = require('opn');

let data_path = "data/"

if (process.argv.length > 2) {
    if (process.argv[2] === "dev") { //développement local : avec les scripts pythons
        process.env.NODE_ENV = "development";
    }
    else if (process.argv[2] == "prod") { //développement pre-build : avec les scripts en format executable
        process.env.NODE_ENV = "production";
    }
}

else {
    process.env.NODE_ENV = "build"; //application builder, sous format .exe
}

const exec_option_search = {
    //default python path for script
    cwd: process.env.NODE_ENV === "production" ?
        path.join(__dirname, "script/python/build/exe.win-amd64-3.8/") : process.env.NODE_ENV === "development" ? path.join(__dirname, "script/python/") : path.join(__dirname, "script/python/build/exe.win-amd64-3.8/"),
    env: process.env,
    encoding: "utf8",
};

let mainWindow;
let addWindow;
app.on("ready", function () {
    //launch new window when app start
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 1000,
        title: "MyMangaList",
        webPreferences: {
            nodeIntegration: true,
        },
        icon: path.join(__dirname, "ressource/app_icon/dragon-ball.ico"),
        minHeight: 1000,
        minWidth: 1000,
    });
    //load our html
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "/main.html"),
            protocol: "file",
            slashes: true,
        })
    );
    // Quit the entire app
    mainWindow.on("closed", function () {
        app.quit();
    });
    //build menu from template

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

    //instert menu
    Menu.setApplicationMenu(mainMenu);

    mainWindow.webContents.openDevTools();
});

//Handle add Window
function createAddWindow() {
    addWindow = new BrowserWindow({
        width: 450,
        height: 350,
        title: "Ajouter un nouveau manga",
        webPreferences: {
            nodeIntegration: true,
        },
        icon: path.join(__dirname, "ressource/app_icon/dragon-ball.ico"),
        resizable: false,
    });
    //load our html
    addWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "input_window/inputWindow.html"),
            protocol: "file",
            slashes: true,
        })
    );
    addWindow.on("closed", function () {
        addWindow = null;
    });
    const addMenu = Menu.buildFromTemplate(addMenuTemplate);

    //instert menu
    Menu.setApplicationMenu(addMenu);
}

ipcMain.on("Read_manga", function (e, external_link) {
    opn(external_link);
})

//Load local manga when main html scripts ready

ipcMain.on("Ready_to_add", function () {
    loadManga()
})

ipcMain.on("scan:add", function (e, manga_name) {
    let manga_json = fs.readFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`));
    manga_json = JSON.parse(manga_json);
    manga_json[manga_name]["scan"] = (parseInt(manga_json[manga_name]["scan"]) + 1);
    fs.writeFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`), JSON.stringify(manga_json, null, 4));
    mainWindow.webContents.send("scan:added");

})

ipcMain.on("scan:remove", function (e, manga_name) {
    let manga_json = fs.readFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`));
    manga_json = JSON.parse(manga_json);
    manga_json[manga_name]["scan"] = (parseInt(manga_json[manga_name]["scan"]) - 1);
    fs.writeFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`), JSON.stringify(manga_json, null, 4));

})


ipcMain.on("manga:remove", function (e, manga_name) {
    fs.remove(path.join(__dirname, data_path, manga_name), function (e) {
        if (e) {
            console.log(e);
        }
    })
    let manga_json = fs.readFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`));
    manga_json = JSON.parse(manga_json);
    delete manga_json[manga_name];
    fs.writeFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`), JSON.stringify(manga_json, null, 4));


})

ipcMain.on("manga:update", function (e, item) {
    let file = fs.readFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`))
    file = JSON.parse(file)
    file[item["manga_name"]]["scan"] = item["scan_div"];
    file[item["manga_name"]]["appreciation"] = item["appreciation_div"];
    file[item["manga_name"]]["comment"] = item["commentaire_div"];
    file[item["manga_name"]]["link"] = item["web_div"];
    fs.writeFile(path.join(__dirname, `${data_path}local_data/manga_data.json`), JSON.stringify(file, null, 4))
})

//catch item to add

ipcMain.on("manga:add", function (e, item) {
    addWindow.close();
    let manga_name = item["manga_name"].replace(/ /gi, "+").toLowerCase();
    item["manga_local_name"] = manga_name;
    if (process.env.NODE_ENV === "production") {
        exec_line = "manga_search.exe"
        folder_path = path.join("../../../../data/")
    }
    else if (process.env.NODE_ENV === "development") {
        exec_line = "python manga_search.py"
        folder_path = "../../data/"
    }
    else {
        exec_line = "manga_search.exe"
        folder_path = path.join("../../../../data/")
    }
    exec(
        `${exec_line} ${manga_name} ${folder_path}`,
        exec_option_search,
        (err, stdout, stderr) => {
            if (err != null) {
                let error_item = {};
                if (err.code == 3) {
                    error_item["error_message"] = `Le manga ${item["manga_name"]} existe déjà localement`;
                    mainWindow.webContents.send("manga:double", error_item);
                    console.log(err.code);
                    return;
                }
                if (err.code == 4) {
                    error_item["manga_search_name"] = manga_name;
                    error_item["manga_name"] = item["manga_name"];
                    mainWindow.webContents.send("manga:unfindable", error_item);
                    return;
                }
                mainWindow.webContents.send("send_information", err.code);
                return;
            }
            item["img_path"] = path.join(__dirname, data_path, manga_name, "/img.jpg");
            let file = fs.readFileSync(
                path.join(__dirname, `${data_path}${manga_name}/data.json`)
            );
            let content = JSON.parse(file);
            item["synopsis"] = content.synopsis;
            mainWindow.webContents.send("manga:add", item);
            console.log(item)
            let file_user_data = fs.readFileSync(
                path.join(__dirname, data_path, manga_name, "/user_data.json")
            );
            fs.unlink(path.join(__dirname, data_path, manga_name, "/user_data.json"));
            let content_user_data = JSON.parse(file_user_data);
            for (const proprety in content_user_data) {
                item[proprety] = content_user_data[proprety];
            }
            let all_local_data_file = fs.readFileSync(path.join(__dirname, `${data_path}local_data/manga_data.json`));
            if (all_local_data_file == "") {
                all_local_data_file = "{}"
            }
            all_local_data_file = JSON.parse(all_local_data_file);
            all_local_data_file[item["manga_local_name"]] = item;
            fs.writeFile(
                path.join(__dirname, `${data_path}local_data/manga_data.json`),
                JSON.stringify(all_local_data_file, null, 4),
                function (err) {
                    if (err) {
                        console.log(err);
                    }
                })
        }
    );
}
);

//create menu

const mainMenuTemplate = [{
    label: "Fichier",
    submenu: [{
        label: "Exporter la liste",
    },
    {
        label: "Importer une liste",
    },
    {
        label: "Info version",
    },
    {
        label: "Quitter l'application",
        accelerator: "CommandOrControl+Q",
        click() {
            app.quit();
        },
    },
    ],
},
{
    label: "Edition",
    submenu: [{
        label: "Ajouter un manga",
        accelerator: "CommandOrControl+N",
        click() {
            createAddWindow();
        },
    },],
},
];

//if you are in mac, add empty menu
//Never tested
if (process.platform == "darwin") {
    mainMenuTemplate.unshift({});
}

const addMenuTemplate = [{
    label: "fichier",
    submenu: [
        {
            label: "Quitter l'application",
            accelerator: "CommandOrControl+Q",
            click() {
                app.quit();
            },
        },
    ]
}];

function loadManga() {
    let manga_json = fs.readFileSync(path.join(__dirname, data_path, "local_data/manga_data.json"))
    if (manga_json == "") {
        manga_json = "{}";
    }
    manga_json = JSON.parse(manga_json);
    for (const proprety in manga_json) {
        mainWindow.webContents.send("manga:add", manga_json[proprety]);
    }
}

