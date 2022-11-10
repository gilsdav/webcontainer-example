import { load, FileSystemTree, WebContainer } from '@webcontainer/api';
import LogConverter from 'ansi-to-html';

const logConverter = new LogConverter();

export class Backend {

    private webcontainer: WebContainer;

    public initialized: Promise<WebContainer>;

    private resolver: (value: unknown) => void;
    public urlEmiter = new Promise((resolver) => {
        this.resolver = resolver;
    });

    constructor(private loggerElementSelector: string) {
        this.initialized = this.init();
    }

    async init() {
        this.webcontainer = await this.bootWhenReady();
        return this.webcontainer;
    }

    // call this only once
    async bootWhenReady() {
        // `load` should only be called once
        const WebContainer = await load();
    
        // only a single instance of WebContainer can be created
        const webcontainer = await WebContainer.boot();
    
        return webcontainer;
    }
    
    // you'll need to "copy" your project files into the file system
    async initProject(projectFiles: FileSystemTree) {
        return await this.webcontainer.loadFiles(projectFiles);
    }
    
    async startDevServer() {
        let  installReplace = false;
        const install = await this.webcontainer.run(
        {
            command: 'npm',
            args: ['i'],
        },
        {
            output: (data: string) => {
                console.log(`[npm install] ${data}`);
                if (data.trim() === '\u001b[?25l') {
                    installReplace = true;
                    this.writeLog('', false);
                } else if (data === '\u001b[?25h') {
                    installReplace = false;
                }
                if (data !== '\u001b[?25h' && data !== '\u001b[?25l' && data !== '\u001b[1G') {
                    this.writeLog(logConverter.toHtml(`[npm install] ${data}`), installReplace);
                }
                
            },
        }
        );
    
        const installExitCode = await install.onExit;
    
        if (installExitCode !== 0) {
            throw new Error('Unable to run npm install');
        }

        const urlResolver = await this.webcontainer.run({
            command: 'node',
            args: ['hostRelover.mjs']
        },
        {
            output: (data: string) => {
                console.log(`[Host resolver] ${data}`);
                this.resolver(data);
            },
        }
        );
        
        await urlResolver.onExit;
    
        return await this.webcontainer.run(
        {
            command: 'npm',
            args: ['run', 'dev'],
        },
        {
            output: (data: string) => {
                console.log(`[dev server] ${data}`);
                this.writeLog(logConverter.toHtml(`[dev server] ${data}`));
            },
        }
        );
    }

    public stop() {
        this.webcontainer.teardown();
    }

    private writeLog(log: string, replaceLatest = false) {
        const logsContainer = document.querySelector(this.loggerElementSelector);
        let p;
        if (replaceLatest) {
            p = logsContainer.lastElementChild;
        } else {
            p = document.createElement('p');
            logsContainer.appendChild(p);
        }
        p.innerHTML = log;
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }


}