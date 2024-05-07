/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer, shell } = require('electron');
const pkg = require('../package.json');
const os = require('os');
import { config, database } from './utils.js';
const nodeFetch = require("node-fetch");


class Splash {
    constructor() {
        this.splash = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");
        this.progress = document.querySelector(".progress");
        document.addEventListener('DOMContentLoaded', async () => {
            let databaseLauncher = new database();
            let configClient = await databaseLauncher.readData('configClient');
            let theme = configClient?.launcher_config?.theme || "auto"
            let isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
            document.body.className = isDarkTheme ? 'dark global' : 'light global';
            if (process.platform == 'win32') ipcRenderer.send('update-window-progress-load')
            this.startAnimation()
        });
    }

    async startAnimation() {
        let splashes = [
            { message: "Allexa - Bogini Wojen i Śmierci", author: "Arrchez" },
            { message: "Allexa to Bogini", author: "Wisnia" },
            { message: "Znowu wymysły zachodniej burżuazji", author: "Rof2000" },
            {
                message: "Linux jest super, tak długo jak działa",
                author: "Felix",
            },
            { message: "Kamienne kilofy podnoszą inflację", author: "Rosomak" },
            { message: "Będzie Pan zlizywał śmietankę", author: "Rosomak" },
            {
                message: "Ja osobiście poprowadzę atak na Tokio",
                author: "Okomana",
            },
            { message: "Spierdalaj", author: "Harvey" },
            {
                message: "Na szanowanie immunitetu trzeba sobie zasłużyć",
                author: "Rof2000",
            },
            {
                message: "Słyszałem, że skończył się wiśniowy reżim",
                author: "Llamonardo",
            },
            { message: "Co Felix robisz na walentynki?", author: "Arrchez" },
            {
                message:
                    "GMC: Kupcie villagerów za 100zł AreaRP: Spalmy gracza",
                author: "Nieznany",
            },
            {
                message: "Współprace z serwerami LGBT dają pierwsze plony",
                author: "Harvey",
            },
            {
                message: "Piękne czasy jak po AreaRP 4 Harvey dostał bana",
                author: "Wiśnia",
            },
            {
                message: "Nie wiem skąd ONZ by miało mieć mending",
                author: "Wiśnia",
            },
            {
                message:
                    "Obowiązkiem ONZ jest strzec pokoju na serwerze",
                author: "Wiśnia",
            },
            { message: "Dziękuję towarzyszu wisienko", author: "Tyberiusz" },
            {
                message: "Zigowski chleb z węglem uratował ludność w ZSRR",
                author: "Bartin",
            },
            { message: "Czy to jest w ogóle legalne?", author: "Akira" },
            {
                message: "Chcesz odzewu masz mój by ci nie było przykro",
                author: "Szczypikrul",
            },
        ];
        let splash = splashes[Math.floor(Math.random() * splashes.length)];
        this.splashMessage.textContent = splash.message;
        this.splashAuthor.children[0].textContent = "@" + splash.author;
        await sleep(100);
        document.querySelector("#splash").style.display = "block";
        await sleep(500);
        this.splash.classList.add("opacity");
        await sleep(500);
        this.splash.classList.add("translate");
        this.splashMessage.classList.add("opacity");
        this.splashAuthor.classList.add("opacity");
        this.message.classList.add("opacity");
        await sleep(1000);
        this.checkUpdate();
    }

    async checkUpdate() {
        this.setStatus(`Wyszukiwanie aktualizacji...`);

        ipcRenderer.invoke("update-app").then().catch((err) => {
            return this.shutdown(`Błąd wyszukiwania aktualizacji: <br>${err.message}`);
        });;

        ipcRenderer.on('updateAvailable', () => {
            this.setStatus(`Mise à jour disponible !`);
            if (os.platform() == 'win32') {
                this.toggleProgress();
                ipcRenderer.send('start-update');
            }
            else return this.dowloadUpdate();
        })

        ipcRenderer.on('error', (event, err) => {
            if (err) return this.shutdown(`${err.message}`);
        })

        ipcRenderer.on('download-progress', (event, progress) => {
            ipcRenderer.send('update-window-progress', { progress: progress.transferred, size: progress.total })
            this.setProgress(progress.transferred, progress.total);
        });

        ipcRenderer.on('update-not-available', () => {
            console.error("Update nie jest dostępny");
            this.maintenanceCheck();
        });
    }

    getLatestReleaseForOS(os, preferredFormat, asset) {
        return asset.filter(asset => {
            const name = asset.name.toLowerCase();
            const isOSMatch = name.includes(os);
            const isFormatMatch = name.endsWith(preferredFormat);
            return isOSMatch && isFormatMatch;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    }

    async dowloadUpdate() {
        const repoURL = pkg.repository.url.replace("git+", "").replace(".git", "").replace("https://github.com/", "").split("/");
        const githubAPI = await nodeFetch('https://api.github.com').then(res => res.json()).catch(err => err);

        const githubAPIRepoURL = githubAPI.repository_url.replace("{owner}", repoURL[0]).replace("{repo}", repoURL[1]);
        const githubAPIRepo = await nodeFetch(githubAPIRepoURL).then(res => res.json()).catch(err => err);

        const releases_url = await nodeFetch(githubAPIRepo.releases_url.replace("{/id}", '')).then(res => res.json()).catch(err => err);
        const latestRelease = releases_url[0].assets;
        let latest;

        if (os.platform() == 'darwin') latest = this.getLatestReleaseForOS('mac', '.dmg', latestRelease);
        else if (os == 'linux') latest = this.getLatestReleaseForOS('linux', '.appimage', latestRelease);


        this.setStatus(`Mise à jour disponible !<br><div class="download-update">Télécharger</div>`);
        document.querySelector(".download-update").addEventListener("click", () => {
            shell.openExternal(latest.browser_download_url);
            return this.shutdown("Téléchargement en cours...");
        });
    }


    async maintenanceCheck() {
        config
            .GetConfig()
            .then((res) => {
                if (res.maintenance)
                    return this.shutdown(res.maintenance_message);
                this.startLauncher();
            })
            .catch((e) => {
                console.error(e);
                return this.shutdown(
                    "Nie wykryto połączenia internetowego,<br>proszę spróbować ponownie później."
                );
            });
    }

    startLauncher() {
        this.setStatus(`Uruchamianie launchera`);
        ipcRenderer.send("main-window-open");
        ipcRenderer.send("update-window-close");
    }

    shutdown(text) {
        this.setStatus(`${text}<br>Zamykanie za 5s`);
        let i = 4;
        setInterval(() => {
            this.setStatus(`${text}<br>Zamknięcie za ${i--}s`);
            if (i < 0) ipcRenderer.send("update-window-close");
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        if (this.progress.classList.toggle("show")) this.setProgress(0, 1);
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.shiftKey && e.keyCode == 73) || e.keyCode == 123) {
        ipcRenderer.send("update-window-dev-tools");
    }
});
new Splash();
