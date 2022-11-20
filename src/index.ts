import { load, FileSystemTree, WebContainer } from '@webContainer/api';
import LogConverter from 'ansi-to-html';

export class Logger {
    private el = document.querySelector(this.selector);
    private converter = new LogConverter();
    private replace = false;

    constructor(private selector: string) { }

    log(data: string, namespace: string) {        
        if (data.trim() === '\u001b[?25l') {
            this.replace = true;
            this.nextParagraph();
            this.write('');
        } else if (data === '\u001b[?25h') {
            this.replace = false;
        } else if (data !== '\u001b[1G') {
            if(!this.replace) this.nextParagraph();
            this.write(`[${namespace}] ${data}`);
        } 
    }

    private nextParagraph() {
        this.el.appendChild(document.createElement('p'));
    }

    private write(text: string) {
        console.log(text);
        this.el.lastElementChild.innerHTML = this.converter.toHtml(text);
        this.el.scrollTop = this.el.scrollHeight;
    }
}

export class Backend {
    private webContainer: WebContainer;

    public initialized: Promise<WebContainer>;

    private emitUrl: (url: string) => void;
    public urlEmitter = new Promise((emitUrl) => this.emitUrl = emitUrl);

    constructor(private logger: Logger) {
        this.initialized = this.init();
    }

    async init() {
        this.webContainer = await this.bootWhenReady();
        return this.webContainer;
    }

    // call this only once
    async bootWhenReady() {
        // `load` should only be called once
        const webContainer = await load();

        // only a single instance of WebContainer can be created
        return webContainer.boot();
    }
    
    // you'll need to "copy" your project files into the file system
    async initProject(projectFiles: FileSystemTree) {
        return this.webContainer.loadFiles(projectFiles);
    }

    private async runCommand({command, args}: {command: string, args: string[]}, namespace: string): Promise<string[]> {
        return new Promise(async (resolve) => {
            const outputs: string[] = [];
            const process = await this.webContainer.run({command, args}, {
                output: (data: string) => {
                    outputs.push(data);
                    this.logger.log(data, namespace);
                },
            });
            const exitCode = await process.onExit;    
            if (exitCode !== 0) throw new Error(`Unable to run ${command}`);
            resolve(outputs);
        });
    }
    
    async startDevServer() {
        await this.runCommand({command: 'npm', args: ['i']}, 'npm install');
        await this.runCommand({command: 'node', args: ['hostRelover.mjs']}, 'Host resolver')
            .then(([url]) => this.emitUrl(url));
        await this.runCommand({command: 'npm', args: ['run', 'dev']}, 'npm runDev');
    }

    public stop() {
        this.webContainer.teardown();
    }

}